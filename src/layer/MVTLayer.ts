import { Entity } from "../entity/Entity";
import { EntityCollection } from "../entity/EntityCollection";
import type { ILabelParams } from "../entity/label/Label";
import { LonLat } from "../LonLat";
import { Vec2 } from "../math/Vec2";
import { Vec3 } from "../math/Vec3";
import type { NumberArray4 } from "../math/Vec4";
import type { PlanetCamera } from "../camera/PlanetCamera";
import { EPSG3857 } from "../proj/EPSG3857";
import type { Node } from "../quadTree/Node";
import type { Planet } from "../scene/Planet";
import type { Segment } from "../segment/Segment";
import type { FontAtlas } from "../utils/FontAtlas";
import type { FetchCache, IResponse } from "../utils/Loader";
import { stringTemplate } from "../utils/shared";
import { getLabelCollisionBox, LabelDeclutter } from "./mvt/LabelDeclutter";
import { decodeMVTFeatures, getMVTDecodedProperties } from "./mvt/decodeMVTFeatures";
import type { IMVTDecodedTile, IMVTDecodeRequest } from "./mvt/decodeMVTFeatures";
import { getMVTWorker } from "./mvt/MVTWorker";
import type { MVTProperties } from "./mvt/VectorTile";
import { Vector } from "./Vector";
import type { IVectorParams } from "./Vector";

type FontTextureAtlas = FontAtlas["atlasesArr"][number];

type MVTValueCallback<T> = (properties: MVTProperties, zoom: number) => T;

/**
 * Rule that makes labels from the point features of one source layer.
 * Every rule is applied independently, a feature matching two rules gets two labels.
 */
export interface IMVTLabelRule {
    /** Source layer name in the tile, e.g. "place". */
    layer: string;
    /** Minimal tile zoom the rule is applied at. */
    minZoom?: number;
    /** Maximal tile zoom the rule is applied at. */
    maxZoom?: number;
    /** Feature filter. */
    filter?: MVTValueCallback<boolean>;
    /** Feature property with the label text, or a function returning the text. Default is "name". */
    text?: string | MVTValueCallback<string | null | undefined>;
    /** Labels with higher priority win in declutter. Default is 0. */
    priority?: number | MVTValueCallback<number>;
    /** Label appearance. */
    label?: ILabelParams | MVTValueCallback<ILabelParams>;
}

export interface IMVTLayerParams extends IVectorParams {
    /** Tile url template with {z}, {x}, {y} and optional {s}. */
    url?: string;
    /** TileJSON url, used when url isn't set. Its tiles, minzoom, maxzoom and attribution are read. */
    tileJson?: string;
    subdomains?: string[];
    labels?: IMVTLabelRule[];
    /** Hides labels overlapping higher priority ones. Default is true. */
    declutter?: boolean;
    /** Extra space around each label in declutter, pixels. Default is 2. */
    declutterPadding?: number;
    /** Label box scale in declutter, below 1 labels may overlap partly, above 1 they keep more space. Default is 1. */
    declutterStrength?: number;
    /** Size multiplier of the tile labels. Default is 1. */
    labelScale?: number;
    /** Minimal time between declutter passes while the camera moves, milliseconds. Default is 100. */
    declutterInterval?: number;
    /**
     * Screen size a vector tile is drawn at before deeper tiles are used, pixels, the metric of the planet lodSize.
     * Default is 512, a zoom coarser than the planet's default 256, larger values take coarser tiles.
     */
    lodSize?: number;
    /** Decoded tiles kept in memory. Default is 256. */
    maxCachedTiles?: number;
    /** Main thread time per frame for building loaded tiles, milliseconds. At least one tile is built per frame. Default is 4. */
    tileBuildBudget?: number;
    /**
     * Fetch RequestCache value
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
     * @default "default"
     */
    cache?: FetchCache;
}

const TILE_LOADING = 0;
const TILE_READY = 1;

const DEFAULT_MAX_NATIVE_ZOOM = 14;

// Vector tiles are styled for 512 px, the planet's default lodSize is 256
const DEFAULT_LOD_SIZE = 512;

// Labels lie on the terrain, pulling them toward the camera keeps slopes from cutting them
const DEFAULT_DEPTH_OFFSET = -300;

// Label glyph box around the anchor, in font size units (screen y is down)
const LABEL_TOP = -0.9;
const LABEL_BOTTOM = 0.3;

interface IMVTLabel {
    entity: Entity;
    priority: number;
    /** Tile zoom, labels from lower zooms win on equal priority. */
    zoom: number;
    /** Feature order in its source layer. */
    order: number;
    /** Tile-relative position, [0, 1) */
    u: number;
    v: number;
    /** Feature text, and the drawn text with glyphs missing in the font atlas replaced. */
    sourceText: string;
    text: string;
    face: string;
    size: number;
    align: string;
    offsetX: number;
    offsetY: number;
    letterSpacing: number;
    /** Text width in font size units, measured when the font atlas is loaded. */
    width: number;
    /** Node and its terrain state the label was last clamped to. */
    clampNodeId: number;
    clampTerrainReady: boolean;
}

interface IMVTTile {
    key: string;
    z: number;
    x: number;
    y: number;
    state: number;
    collection: EntityCollection | null;
    labels: IMVTLabel[];
    /** Last frame the tile was needed for a rendered node. */
    wantedFrame: number;
    /** Last frame the tile was drawn. */
    shownFrame: number;
    /** Rendered nodes the tile is drawn for in the current frame. */
    nodes: Node[];
    hasShownDescendants: boolean;
    clampSignature: number;
}

function tileKey(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Replaces letters missing in the font atlas with their base letters, e.g. "ā" with "a".
 * Letters without a base letter in the atlas are kept, they are drawn as spaces.
 * @param {string} text - Text.
 * @param {FontTextureAtlas} atlas - Font atlas.
 * @returns {string} -
 */
export function fitTextToAtlas(text: string, atlas: { get: (code: number) => unknown }): string {
    let res = "";
    for (const ch of text.normalize("NFKC")) {
        if (atlas.get(ch.codePointAt(0)!)) {
            res += ch;
            continue;
        }
        const base = ch.normalize("NFD").replace(COMBINING_MARKS, "");
        let fits = base.length > 0;
        for (const b of base) {
            if (!atlas.get(b.codePointAt(0)!)) {
                fits = false;
                break;
            }
        }
        res += fits ? base : ch;
    }
    return res;
}

function labelPriority(a: IMVTLabel, b: IMVTLabel): number {
    return b.priority - a.priority || a.zoom - b.zoom || a.order - b.order;
}

/**
 * Mapbox Vector Tiles (MVT) layer. Loads Web Mercator vector tiles for the rendered
 * planet tiles and draws labels made from their point features.
 * @class
 * @extends {Vector}
 * @param {string} [name] - Layer name.
 * @param {IMVTLayerParams} [options] - Vector layer options, and:
 * @param {string} [options.url] - Tile url template, e.g. "https://example.com/{z}/{x}/{y}.pbf".
 * @param {string} [options.tileJson] - TileJSON url, used when options.url isn't set.
 * @param {Array.<string>} [options.subdomains=['a','b','c']] - Subdomains for the {s} url template key.
 * @param {number} [options.minNativeZoom=0] - Minimal available tile zoom.
 * @param {number} [options.maxNativeZoom=14] - Maximal available tile zoom, deeper planet tiles use it.
 * @param {Array.<IMVTLabelRule>} [options.labels] - Label rules.
 * @param {boolean} [options.declutter=true] - Hides labels overlapping higher priority ones.
 * @param {number} [options.declutterPadding=2] - Extra space around each label in declutter, pixels.
 * @param {number} [options.declutterStrength=1] - Label box scale in declutter, below 1 labels may overlap partly,
 * above 1 they keep more space, 0 keeps all labels.
 * @param {number} [options.labelScale=1] - Size multiplier of the tile labels.
 * @param {number} [options.declutterInterval=100] - Minimal time between declutter passes, milliseconds.
 * @param {number} [options.maxCachedTiles=256] - Decoded tiles kept in memory.
 * @param {number} [options.lodSize=512] - Screen size a vector tile is drawn at before deeper tiles are used, pixels.
 * The metric is the planet's lodSize (default 256), so 512 takes tiles a zoom coarser than the imagery.
 * @param {boolean} [options.clampToGround=true] - Clamp labels to the terrain.
 * @param {number} [options.depthOffset=-300] - Depth offset along the camera ray in meters, the default
 * keeps terrain slopes from cutting labels.
 * @param {number} [options.tileBuildBudget=4] - Main thread time per frame for building loaded tiles, milliseconds.
 *
 * @fires load
 * @fires loadend
 *
 * @example
 * new og.layer.MVTLayer("places", {
 *     tileJson: "https://tiles.openfreemap.org/planet",
 *     labels: [{
 *         layer: "place",
 *         filter: (p) => p.class === "city",
 *         priority: (p) => -p.rank,
 *         label: { size: 16, color: "white", outline: 0.4, outlineColor: "black", align: "center" }
 *     }]
 * });
 */
export class MVTLayer extends Vector {
    /**
     * Tile url template.
     * @public
     * @type {string}
     */
    public url: string;

    protected _declutter: boolean;

    protected _declutterPadding: number;

    protected _declutterStrength: number;

    protected _labelScale: number;

    /**
     * Layer scaleByDistance with labelScale applied, given to the tile collections.
     * @protected
     */
    protected _labelScaleByDistance: NumberArray4;

    public declutterInterval: number;

    /**
     * Screen size a vector tile is drawn at before deeper tiles are used, pixels.
     * Changes apply in the next frame.
     * @public
     * @type {number}
     */
    public lodSize: number;

    public maxCachedTiles: number;

    public tileBuildBudget: number;

    /**
     * Loaded tiles waiting to be built.
     * @protected
     */
    protected _pendingTiles: { tile: IMVTTile; decoded: IMVTDecodedTile | null }[];

    /**
     * Tiles being decoded in the worker.
     * @protected
     */
    protected _decodingCount: number;

    protected _tileJson: string;

    protected _tileJsonUrls: string[];

    protected _subdomains: string[];

    protected _requestCount: number;

    protected _cache: FetchCache;

    protected _labelRules: IMVTLabelRule[];

    protected _tiles: Map<string, IMVTTile>;

    protected _shownTiles: IMVTTile[];

    protected _frame: number;

    protected _visibilityDirty: boolean;

    /**
     * Labels of the shown tiles not covered by shown descendants, in priority order.
     * @protected
     */
    protected _candidates: IMVTLabel[];

    protected _candidatesDirty: boolean;

    protected _viewChanged: boolean;

    protected _lastVisibilityTime: number;

    protected _declutterer: LabelDeclutter;

    protected _box: number[];

    protected _fontAtlases: Record<string, FontTextureAtlas | null>;

    protected _clampNodeIndex: Map<string, Node>;

    protected _clampZooms: number[];

    protected _hasMaxNativeZoom: boolean;

    protected _hasMinNativeZoom: boolean;

    constructor(name?: string | null, options: IMVTLayerParams = {}) {
        super(name, {
            ...options,
            clampToGround: options.clampToGround ?? true,
            depthOffset: options.depthOffset ?? DEFAULT_DEPTH_OFFSET
        });

        this.url = options.url || "";
        this._tileJson = options.tileJson || "";
        this._tileJsonUrls = [];
        this._subdomains = options.subdomains || ["a", "b", "c"];
        this._requestCount = 0;
        this._cache = options.cache || "default";

        this._hasMinNativeZoom = options.minNativeZoom !== undefined;
        this._hasMaxNativeZoom = options.maxNativeZoom !== undefined;
        this.maxNativeZoom = options.maxNativeZoom ?? DEFAULT_MAX_NATIVE_ZOOM;

        this._labelRules = options.labels || [];

        this._declutter = options.declutter ?? true;
        this._declutterPadding = options.declutterPadding ?? 2;
        this._declutterStrength = options.declutterStrength ?? 1;
        this._labelScale = options.labelScale ?? 1;
        this._labelScaleByDistance = [0, 0, 0, 1];
        this.declutterInterval = options.declutterInterval ?? 100;
        this.lodSize = options.lodSize ?? DEFAULT_LOD_SIZE;
        this.maxCachedTiles = options.maxCachedTiles ?? 256;
        this.tileBuildBudget = options.tileBuildBudget ?? 4;
        this._pendingTiles = [];
        this._decodingCount = 0;

        this._tiles = new Map();
        this._shownTiles = [];
        this._frame = 0;
        this._visibilityDirty = false;
        this._candidates = [];
        this._candidatesDirty = false;
        this._viewChanged = false;
        this._lastVisibilityTime = 0;
        this._declutterer = new LabelDeclutter();
        this._box = [0, 0, 0, 0];
        this._fontAtlases = {};
        this._clampNodeIndex = new Map();
        this._clampZooms = [];
    }

    public override get instanceName(): string {
        return "MVTLayer";
    }

    /**
     * Hides labels overlapping higher priority ones.
     * @public
     * @type {boolean}
     */
    public get declutter(): boolean {
        return this._declutter;
    }

    public set declutter(declutter: boolean) {
        this._declutter = declutter;
        this.updateLabelVisibility();
    }

    /**
     * Extra space around each label in declutter, pixels.
     * @public
     * @type {number}
     */
    public get declutterPadding(): number {
        return this._declutterPadding;
    }

    public set declutterPadding(padding: number) {
        this._declutterPadding = padding;
        this.updateLabelVisibility();
    }

    /**
     * Label box scale in declutter, below 1 labels may overlap partly, above 1 they keep more space,
     * 0 keeps all labels.
     * @public
     * @type {number}
     */
    public get declutterStrength(): number {
        return this._declutterStrength;
    }

    public set declutterStrength(strength: number) {
        this._declutterStrength = strength;
        this.updateLabelVisibility();
    }

    /**
     * Size multiplier of the tile labels, applied with the scaleByDistance scale.
     * @public
     * @type {number}
     */
    public get labelScale(): number {
        return this._labelScale;
    }

    public set labelScale(scale: number) {
        this._labelScale = scale;
        this.updateLabelVisibility();
    }

    public override get isIdle(): boolean {
        return (
            super.isIdle &&
            !this._pendingTiles.length &&
            this._decodingCount === 0 &&
            (!this._planet || this._planet._tileLoader.getRequestCounter(this) === 0)
        );
    }

    public override addTo(planet: Planet) {
        if (!this._planet) {
            super.addTo(planet);
            planet.camera.events.on("viewchange", this._onViewChange, this);
            this._requestRuleFonts();
            if (!this.url && this._tileJson) {
                this._loadTileJson(this._tileJson);
            }
        }
    }

    public override remove(): this {
        const p = this._planet;
        if (p) {
            p.camera.events.off("viewchange", this._onViewChange);
            this.abortLoading();
        }
        return super.remove();
    }

    /**
     * Removes loaded tiles and entities added to the layer.
     * @public
     */
    public override clear() {
        super.clear();
        // Vector constructor calls clear before the tile cache exists
        if (this._tiles) {
            this._clearTiles();
        }
    }

    public override abortLoading() {
        if (this._planet) {
            this._planet._tileLoader.abort(this);
        }
    }

    public override setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            super.setVisibility(visibility);
            if (!visibility) {
                this.abortLoading();
            }
        }
    }

    /**
     * Sets tile url template and reloads tiles.
     * @public
     * @param {string} url - Url template with {z}, {x}, {y} and optional {s}.
     */
    public setUrl(url: string) {
        this.url = url;
        this.abortLoading();
        this._clearTiles();
    }

    /**
     * Returns label rules.
     * @public
     * @returns {Array.<IMVTLabelRule>} -
     */
    public getLabelRules(): IMVTLabelRule[] {
        return this._labelRules;
    }

    /**
     * Sets label rules and reloads tiles.
     * @public
     * @param {Array.<IMVTLabelRule>} rules - Label rules.
     */
    public setLabelRules(rules: IMVTLabelRule[]) {
        this._labelRules = rules;
        this.abortLoading();
        this._clearTiles();
        this._requestRuleFonts();
    }

    /**
     * Requests label visibility update (declutter) in the next frame.
     * @public
     */
    public updateLabelVisibility() {
        this._visibilityDirty = true;
        this._candidatesDirty = true;
        this._planet?.renderer?.requestRedraw();
    }

    public override collectVisibleCollections(outArr: EntityCollection[]) {
        super.collectVisibleCollections(outArr);

        const p = this._planet!;
        const qts = p.quadTreeStrategy;

        if (
            !(
                (this._fading && this._fadingOpacity > 0.0) ||
                (this.minZoom <= qts.maxCurrZoom && this.maxZoom >= qts.maxCurrZoom)
            ) ||
            !this._hasTileUrl()
        ) {
            return;
        }

        const frame = ++this._frame;

        this._buildPendingTiles();
        const shown = this._shownTiles;
        const prevShownCount = shown.length;
        let shownChanged = false;

        shown.length = 0;

        const nodes = qts._renderedNodes;
        const lodCam = qts.lodCamera || p.camera;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (node.segment._projection.id !== EPSG3857.id) {
                continue;
            }

            // Deeper nodes use their ancestor at maxNativeZoom
            let n = node;
            while (n.segment.tileZoom > this.maxNativeZoom && n.parentNode) {
                n = n.parentNode;
            }

            // The coarsest ancestor still smaller on the screen than lodSize, as the planet picks its nodes
            while (
                n.parentNode &&
                n.segment.tileZoom > this.minNativeZoom &&
                this._getProjectedSize(lodCam, n.parentNode.segment) < this.lodSize
            ) {
                n = n.parentNode;
            }

            const seg = n.segment;

            let z = Math.min(seg.tileZoom, this.maxNativeZoom);

            if (z < this.minNativeZoom) {
                continue;
            }

            const dz = seg.tileZoom - z;
            let x = seg.tileX >> dz,
                y = seg.tileY >> dz;

            const wanted = this._requestTile(z, x, y);

            // Nearest loaded tile, the wanted one or its ancestor
            let tile: IMVTTile | null = wanted.state === TILE_READY ? wanted : null;
            while (!tile && z > this.minNativeZoom) {
                z--;
                x >>= 1;
                y >>= 1;
                const t = this._tiles.get(tileKey(z, x, y));
                if (t && t.state === TILE_READY) {
                    tile = t;
                }
            }

            if (tile) {
                if (tile.shownFrame !== frame) {
                    if (tile.shownFrame !== frame - 1) {
                        shownChanged = true;
                    }
                    tile.shownFrame = frame;
                    tile.nodes.length = 0;
                    tile.hasShownDescendants = false;
                    shown.push(tile);
                }
                tile.nodes.push(node);
            }
        }

        if (shown.length !== prevShownCount) {
            shownChanged = true;
        }

        // An ancestor is drawn as a fallback while its descendant tiles load,
        // its labels inside the drawn descendants are hidden.
        for (let i = 0; i < shown.length; i++) {
            let { z, x, y } = shown[i];
            while (z > this.minNativeZoom) {
                z--;
                x >>= 1;
                y >>= 1;
                const t = this._tiles.get(tileKey(z, x, y));
                if (t && t.shownFrame === frame) {
                    t.hasShownDescendants = true;
                }
            }
        }

        const clamp = this.clampToGround || this.relativeToGround;

        const sbd = this._labelScaleByDistance;
        sbd[0] = this.scaleByDistance[0];
        sbd[1] = this.scaleByDistance[1];
        sbd[2] = this.scaleByDistance[2];
        sbd[3] = this.scaleByDistance[3] * this._labelScale;

        for (let i = 0; i < shown.length; i++) {
            const tile = shown[i];
            const ec = tile.collection;
            if (ec) {
                ec._fadingOpacity = this._fadingOpacity;
                ec.scaleByDistance = sbd;
                ec.pickingScale = this.pickingScale;
                ec.depthOffset = this.depthOffset;
                outArr.push(ec);
                if (clamp) {
                    this._clampTile(tile);
                }
            }
        }

        if (shownChanged) {
            this._visibilityDirty = true;
            this._candidatesDirty = true;
        }

        // Declutter passes are throttled, new labels stay hidden until the next one
        const now = performance.now();
        if (this.declutter ? this._visibilityDirty || this._viewChanged : this._visibilityDirty) {
            if (!this.declutter || now - this._lastVisibilityTime >= this.declutterInterval) {
                this._visibilityDirty = false;
                this._viewChanged = false;
                this._lastVisibilityTime = now;
                this._updateLabelsVisibility();
            } else {
                p.renderer?.requestRedraw();
            }
        }

        if (this._tiles.size > this.maxCachedTiles + 32) {
            this._evictTiles();
        }
    }

    /**
     * Returns the segment screen size, the metric the planet compares with its lodSize.
     * @protected
     */
    protected _getProjectedSize(cam: PlanetCamera, seg: Segment): number {
        return cam.projectedSize(seg.bsphere.center, seg._plainRadius || seg.bsphere.radius);
    }

    protected _onViewChange() {
        this._viewChanged = true;
    }

    protected _hasTileUrl(): boolean {
        return this.url.length > 0 || this._tileJsonUrls.length > 0;
    }

    protected async _loadTileJson(url: string) {
        try {
            const response = await fetch(url, { cache: this._cache });
            if (!response.ok) {
                throw new Error(`Unable to load '${url}'`);
            }

            const json = await response.json();

            if (!Array.isArray(json.tiles) || !json.tiles.length) {
                throw new Error(`No tiles in TileJSON '${url}'`);
            }

            if (!this._hasMinNativeZoom && typeof json.minzoom === "number") {
                this.minNativeZoom = json.minzoom;
            }

            if (!this._hasMaxNativeZoom && typeof json.maxzoom === "number") {
                this.maxNativeZoom = json.maxzoom;
            }

            if (!this.getAttribution() && json.attribution) {
                this.setAttribution(json.attribution);
            }

            this._tileJsonUrls = json.tiles;

            this._planet?.renderer?.requestRedraw();
        } catch (err) {
            console.warn(`MVTLayer "${this.name}": ${err}`);
        }
    }

    protected _getTileUrl(tile: IMVTTile): string {
        const params = { x: tile.x.toString(), y: tile.y.toString(), z: tile.z.toString(), s: "" };

        if (this.url) {
            this._requestCount++;
            params.s = this._subdomains[this._requestCount % this._subdomains.length] || "";
            return stringTemplate(this.url, params);
        }

        const urls = this._tileJsonUrls;
        return stringTemplate(urls[(tile.x + tile.y) % urls.length], params);
    }

    protected _requestTile(z: number, x: number, y: number): IMVTTile {
        const key = tileKey(z, x, y);

        let tile = this._tiles.get(key);

        if (!tile) {
            tile = {
                key,
                z,
                x,
                y,
                state: TILE_LOADING,
                collection: null,
                labels: [],
                // Set before loading, the loader may check the request filter right away
                wantedFrame: this._frame,
                shownFrame: 0,
                nodes: [],
                hasShownDescendants: false,
                clampSignature: -1
            };
            this._tiles.set(key, tile);
            this._loadTile(tile);
        }

        tile.wantedFrame = this._frame;

        return tile;
    }

    protected _loadTile(tile: IMVTTile) {
        const p = this._planet!;

        p._tileLoader.load(
            {
                sender: this,
                src: this._getTileUrl(tile),
                type: "arrayBuffer",
                // The request may wait in the queue, skip it if the tile isn't needed anymore
                filter: () => this._tiles.get(tile.key) === tile && this._frame - tile.wantedFrame < 3,
                options: {
                    cache: this._cache
                }
            },
            (response: IResponse) => {
                if (this._tiles.get(tile.key) !== tile) {
                    return;
                }

                if (response.status === "ready") {
                    this._decodeTile(tile, response.data);
                } else if (response.status === "abort") {
                    this._tiles.delete(tile.key);
                } else {
                    // Missing tiles are drawn empty
                    tile.state = TILE_READY;
                }

                p.renderer?.requestRedraw();
            }
        );
    }

    protected _isWanted(tile: IMVTTile): boolean {
        return this._frame - tile.wantedFrame <= 2;
    }

    /**
     * Decodes the tile in the worker, or right away out of a browser.
     * Decoded tiles are built in the next frames, within the time budget.
     * @protected
     */
    protected _decodeTile(tile: IMVTTile, data: ArrayBuffer) {
        if (!this._isWanted(tile)) {
            this._tiles.delete(tile.key);
            return;
        }

        const request = this._createDecodeRequest(tile);

        const onDecoded = (decoded: IMVTDecodedTile | null) => {
            if (this._tiles.get(tile.key) === tile) {
                this._pendingTiles.push({ tile, decoded });
                this._planet?.renderer?.requestRedraw();
            }
        };

        const worker = request.pointLayers.length && data && data.byteLength ? getMVTWorker() : null;

        if (worker) {
            this._decodingCount++;
            worker.decode(data, request).then((decoded) => {
                this._decodingCount--;
                if (!decoded) {
                    console.warn(`MVTLayer "${this.name}": unable to decode tile ${tile.key}`);
                }
                onDecoded(decoded);
            });
        } else {
            let decoded: IMVTDecodedTile | null = null;
            try {
                decoded = decodeMVTFeatures(data || new ArrayBuffer(0), request);
            } catch (err) {
                console.warn(`MVTLayer "${this.name}": tile ${tile.key}: ${err}`);
            }
            onDecoded(decoded);
        }
    }

    /**
     * Returns the source layers the label rules read at the tile zoom.
     * @protected
     */
    protected _createDecodeRequest(tile: IMVTTile): IMVTDecodeRequest {
        const pointLayers: string[] = [];
        for (let i = 0; i < this._labelRules.length; i++) {
            const rule = this._labelRules[i];
            if (
                tile.z >= (rule.minZoom ?? 0) &&
                tile.z <= (rule.maxZoom ?? Infinity) &&
                pointLayers.indexOf(rule.layer) === -1
            ) {
                pointLayers.push(rule.layer);
            }
        }
        return { z: tile.z, x: tile.x, y: tile.y, pointLayers };
    }

    /**
     * Builds loaded tiles until the frame time budget runs out. Recently needed tiles go first,
     * lower zooms first as they are fallbacks for the deeper ones.
     * Tiles not needed anymore are dropped, they are loaded again when needed.
     * @protected
     */
    protected _buildPendingTiles() {
        const pending = this._pendingTiles;

        if (!pending.length) {
            return;
        }

        pending.sort((a, b) => b.tile.wantedFrame - a.tile.wantedFrame || a.tile.z - b.tile.z);

        const t0 = performance.now();
        let i = 0;

        for (; i < pending.length; i++) {
            if (i > 0 && performance.now() - t0 >= this.tileBuildBudget) {
                break;
            }

            const { tile, decoded } = pending[i];

            if (this._tiles.get(tile.key) !== tile) {
                continue;
            }

            if (!this._isWanted(tile)) {
                this._tiles.delete(tile.key);
                continue;
            }

            tile.state = TILE_READY;

            try {
                decoded && this._createTileLabels(tile, decoded);
            } catch (err) {
                console.warn(`MVTLayer "${this.name}": tile ${tile.key}: ${err}`);
            }

            let e = this.events.load!;
            if (e.handlers.length) {
                this.events.dispatch(e, tile);
            }
        }

        pending.splice(0, i);

        if (pending.length) {
            this._planet?.renderer?.requestRedraw();
        }
    }

    protected _createTileLabels(tile: IMVTTile, decoded: IMVTDecodedTile) {
        const rules = this._labelRules;
        const z = tile.z;
        const entities: Entity[] = [];

        // Properties of a feature are shared by the rules reading its layer
        const properties: Record<string, MVTProperties[]> = {};

        for (let r = 0; r < rules.length; r++) {
            const rule = rules[r];

            if (z < (rule.minZoom ?? 0) || z > (rule.maxZoom ?? Infinity)) {
                continue;
            }

            let layer = null;
            for (let i = 0; i < decoded.pointLayers.length; i++) {
                if (decoded.pointLayers[i].name === rule.layer) {
                    layer = decoded.pointLayers[i];
                    break;
                }
            }

            if (!layer) {
                continue;
            }

            const layerProperties = properties[layer.name] || (properties[layer.name] = []);
            const points = layer.points;

            for (let i = 0; i < layer.order.length; i++) {
                const props = layerProperties[i] || (layerProperties[i] = getMVTDecodedProperties(layer, i));

                if (rule.filter && !rule.filter(props, z)) {
                    continue;
                }

                const textValue = typeof rule.text === "function" ? rule.text(props, z) : props[rule.text || "name"];

                if (textValue == null || textValue === "") {
                    continue;
                }

                const sourceText = String(textValue);

                const priority = typeof rule.priority === "function" ? rule.priority(props, z) : rule.priority || 0;

                const style = (typeof rule.label === "function" ? rule.label(props, z) : rule.label) || {};

                const face = style.face || "arial";
                const atlas = this._getFontAtlas(face);
                const text = atlas ? fitTextToAtlas(sourceText, atlas) : sourceText;

                const offset = style.offset;
                const offsetX = offset ? (offset instanceof Vec2 ? offset.x : offset[0]) : 0;
                const offsetY = offset ? (offset instanceof Vec2 ? offset.y : offset[1]) : 0;

                for (let j = layer.pointOffsets[i] * 4, end = layer.pointOffsets[i + 1] * 4; j < end; j += 4) {
                    const entity = new Entity({
                        lonlat: new LonLat(points[j], points[j + 1], 0),
                        // With declutter the next pass shows it, so it never overlaps others
                        label: { ...style, text, visibility: !this.declutter },
                        properties: props
                    });

                    tile.labels.push({
                        entity,
                        priority,
                        zoom: z,
                        order: layer.order[i],
                        u: points[j + 2],
                        v: points[j + 3],
                        sourceText,
                        text,
                        face,
                        size: style.size || 24,
                        align: style.align || "left",
                        offsetX: offsetX || 0,
                        offsetY: offsetY || 0,
                        letterSpacing: style.letterSpacing || 0,
                        width: -1,
                        clampNodeId: -1,
                        clampTerrainReady: false
                    });

                    entities.push(entity);
                }
            }
        }

        if (!entities.length) {
            return;
        }

        const ec = new EntityCollection({
            pickingEnabled: this._pickingEnabled,
            labelMaxLetters: this._labelMaxLetters,
            receiveProjectors: this._receiveProjectors,
            receiveShadows: this._receiveShadows,
            receiveFrameTransparency: this._receiveFrameTransparency
        });

        ec._layer = this;
        ec.addTo(this._planet!, true);
        this._bindEventsDefault(ec);
        ec.addEntities(entities);

        tile.collection = ec;
    }

    protected _clampTile(tile: IMVTTile) {
        const nodes = tile.nodes;

        let signature = nodes.length;
        for (let i = 0; i < nodes.length; i++) {
            signature += nodes[i].__id * 2 + (nodes[i].segment.terrainReady ? 1 : 0);
        }

        if (signature === tile.clampSignature) {
            return;
        }

        tile.clampSignature = signature;

        // Nodes are the tile itself or its descendants, find each label's node by tile index
        const index = this._clampNodeIndex;
        const zooms = this._clampZooms;
        index.clear();
        zooms.length = 0;
        for (let i = 0; i < nodes.length; i++) {
            const seg = nodes[i].segment;
            index.set(tileKey(seg.tileZoom, seg.tileX, seg.tileY), nodes[i]);
            if (zooms.indexOf(seg.tileZoom) === -1) {
                zooms.push(seg.tileZoom);
            }
        }

        const res = new Vec3();
        const labels = tile.labels;

        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            for (let j = 0; j < zooms.length; j++) {
                const s = Math.pow(2, zooms[j] - tile.z);
                const node = index.get(
                    tileKey(zooms[j], Math.floor((tile.x + label.u) * s), Math.floor((tile.y + label.v) * s))
                );
                if (node) {
                    const seg = node.segment;
                    if (label.clampNodeId !== node.__id || label.clampTerrainReady !== seg.terrainReady) {
                        label.clampNodeId = node.__id;
                        label.clampTerrainReady = seg.terrainReady;
                        const entity = label.entity;
                        res.copy(entity._cartesian);
                        seg.getEntityTerrainPoint(entity, res);
                        entity._setCartesian3vSilent(res, true);
                    }
                    break;
                }
            }
        }
    }

    /**
     * Hides labels covered by drawn descendant tiles and, when declutter is on,
     * labels overlapping higher priority ones.
     * @protected
     */
    protected _updateLabelsVisibility() {
        if (this._candidatesDirty) {
            this._candidatesDirty = false;
            this._collectCandidates();
        }

        const candidates = this._candidates;

        if (!candidates.length) {
            return;
        }

        if (!this.declutter) {
            for (let i = 0; i < candidates.length; i++) {
                candidates[i].entity.label!.setVisibility(true);
            }
            return;
        }

        const cam = this._planet!.camera;
        const width = cam.width,
            height = cam.height;

        this._declutterer.reset(width, height);

        const m = cam.frustums[0].projectionViewMatrix._m;
        const eye = cam.eye;
        const pad = this._declutterPadding;
        const strength = this._declutterStrength;
        const scale = this._labelScaleByDistance[3];
        const box = this._box;

        for (let k = 0; k < candidates.length; k++) {
            const label = candidates[k];
            const c = label.entity._cartesian;

            let visible = false;

            // In front of the horizon
            if (c.x * (eye.x - c.x) + c.y * (eye.y - c.y) + c.z * (eye.z - c.z) > 0) {
                const w = m[3] * c.x + m[7] * c.y + m[11] * c.z + m[15];
                if (w > 0) {
                    const sx = (1 + (m[0] * c.x + m[4] * c.y + m[8] * c.z + m[12]) / w) * width * 0.5 + label.offsetX;
                    const sy = (1 - (m[1] * c.x + m[5] * c.y + m[9] * c.z + m[13]) / w) * height * 0.5 - label.offsetY;

                    const size = label.size * scale;
                    const textWidth = this._getLabelWidth(label) * size;

                    let minX = sx;
                    if (label.align === "center") {
                        minX -= textWidth * 0.5;
                    } else if (label.align === "right") {
                        minX -= textWidth;
                    }

                    getLabelCollisionBox(
                        minX,
                        sy + LABEL_TOP * size,
                        minX + textWidth,
                        sy + LABEL_BOTTOM * size,
                        strength,
                        pad,
                        box
                    );

                    visible = this._declutterer.tryPlace(box[0], box[1], box[2], box[3]);
                }
            }

            label.entity.label!.setVisibility(visible);
        }
    }

    /**
     * Collects labels of the shown tiles and hides the ones inside shown descendant tiles.
     * The order only changes with the shown tiles, so it's sorted here, not in every pass.
     * @protected
     */
    protected _collectCandidates() {
        const shown = this._shownTiles;
        const candidates = this._candidates;

        candidates.length = 0;

        let maxZoom = 0;
        for (let i = 0; i < shown.length; i++) {
            maxZoom = Math.max(maxZoom, shown[i].z);
        }

        for (let i = 0; i < shown.length; i++) {
            const tile = shown[i];
            const labels = tile.labels;
            for (let j = 0; j < labels.length; j++) {
                const label = labels[j];
                if (tile.hasShownDescendants && this._isCovered(tile, label, maxZoom)) {
                    label.entity.label!.setVisibility(false);
                } else {
                    candidates.push(label);
                }
            }
        }

        if (this.declutter) {
            candidates.sort(labelPriority);
        }
    }

    /**
     * Checks whether the label position is inside a drawn descendant tile.
     * @protected
     */
    protected _isCovered(tile: IMVTTile, label: IMVTLabel, maxZoom: number): boolean {
        const frame = this._frame;
        for (let z = tile.z + 1; z <= maxZoom; z++) {
            const s = Math.pow(2, z - tile.z);
            const t = this._tiles.get(
                tileKey(z, Math.floor((tile.x + label.u) * s), Math.floor((tile.y + label.v) * s))
            );
            if (t && t.shownFrame === frame) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns label text width in font size units.
     * @protected
     */
    protected _getLabelWidth(label: IMVTLabel): number {
        if (label.width >= 0) {
            return label.width;
        }

        const text = label.text.normalize("NFKC");
        const len = Math.min(this._labelMaxLetters, text.length);
        const atlas = this._getFontAtlas(label.face);

        if (!atlas) {
            // Approximation until the font is loaded
            return len * (0.55 + label.letterSpacing);
        }

        const space = atlas.get(32);
        let width = 0;
        for (let i = 0; i < len; i++) {
            const n = atlas.get(text[i].codePointAt(0) ?? 32) || space;
            if (n) {
                width += n.metrics.nAdvance + label.letterSpacing;
            }
        }

        label.width = width;

        return width;
    }

    protected _getFontAtlas(face: string): FontTextureAtlas | null {
        const atlas = this._fontAtlases[face];
        const renderer = this._planet && this._planet.renderer;

        if (atlas === undefined && renderer) {
            this._fontAtlases[face] = null;
            const fontAtlas = renderer.fontAtlas;
            fontAtlas.getFontIndex(face).then((index: number) => {
                const atlas = fontAtlas.atlasesArr[index] || null;
                this._fontAtlases[face] = atlas;
                if (atlas) {
                    this._onFontAtlasReady(face, atlas);
                }
            });
            return null;
        }

        return atlas || null;
    }

    /**
     * Starts loading fonts of the label rules with static styles.
     * @protected
     */
    protected _requestRuleFonts() {
        for (let i = 0; i < this._labelRules.length; i++) {
            const style = this._labelRules[i].label;
            if (typeof style !== "function") {
                this._getFontAtlas((style && style.face) || "arial");
            }
        }
    }

    /**
     * Fits texts of the labels created before the font was loaded.
     * @protected
     */
    protected _onFontAtlasReady(face: string, atlas: FontTextureAtlas) {
        this._tiles.forEach((tile) => {
            const labels = tile.labels;
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                if (label.face === face) {
                    const text = fitTextToAtlas(label.sourceText, atlas);
                    if (text !== label.text) {
                        label.text = text;
                        label.entity.label!.setText(text);
                    }
                    label.width = -1;
                }
            }
        });
        this.updateLabelVisibility();
    }

    protected _evictTiles() {
        const frame = this._frame;
        const candidates: IMVTTile[] = [];

        this._tiles.forEach((tile) => {
            if (tile.shownFrame !== frame && tile.wantedFrame !== frame) {
                candidates.push(tile);
            }
        });

        candidates.sort((a, b) => Math.max(a.wantedFrame, a.shownFrame) - Math.max(b.wantedFrame, b.shownFrame));

        const count = Math.min(candidates.length, this._tiles.size - this.maxCachedTiles);
        for (let i = 0; i < count; i++) {
            this._disposeTile(candidates[i]);
        }
    }

    protected _disposeTile(tile: IMVTTile) {
        this._tiles.delete(tile.key);
        const ec = tile.collection;
        if (ec) {
            ec.clear();
            ec.remove();
            tile.collection = null;
        }
        tile.labels.length = 0;
        tile.nodes.length = 0;
    }

    protected _clearTiles() {
        this._pendingTiles.length = 0;
        this._tiles.forEach((tile) => this._disposeTile(tile));
        this._tiles.clear();
        this._shownTiles.length = 0;
        this._candidates.length = 0;
        this._planet?.renderer?.requestRedraw();
    }
}
