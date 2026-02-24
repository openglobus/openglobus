import {Entity} from "./Entity";
import {Extent} from "../Extent";
import {LonLat} from "../LonLat";
import {Vec3} from "../math/Vec3";
import type {NumberArray3} from "../math/Vec3";
import type {NumberArray2} from "../math/Vec2";
import type {NumberArray4} from "../math/Vec4";
import {Planet} from "../scene/Planet";
import {PolylineHandler} from "./PolylineHandler";
import {RenderNode} from "../scene/RenderNode";
import type {WebGLBufferExt} from "../webgl/Handler";
import {
    cloneArray,
    createVector3,
    htmlColorToFloat32Array,
    htmlColorToRgba,
    makeArray,
    makeArrayTyped,
    insertTypedArray,
    spliceTypedArray
} from "../utils/shared";
import type {TypedArray} from "../utils/shared";
import {Ellipsoid} from "../ellipsoid/Ellipsoid";
import type {HTMLImageElementExt} from "../utils/ImagesCacheManager";

const VERTICES_BUFFER = 0;
const INDEX_BUFFER = 1;
const COLORS_BUFFER = 2;
const TEXCOORD_BUFFER = 3;
const THICKNESS_BUFFER = 4;
const TEXPARAM_BUFFER = 5;
const PICKINGCOLORS_BUFFER = 6;

const DEFAULT_COLOR = "#0000FF";

const F3V = 0;
const FLONLAT = 1;
const FDETECT = 2;

const R = 0;
const G = 1;
const B = 2;
const A = 3;

export type Geodetic = LonLat | NumberArray2 | NumberArray3
export type Cartesian = Vec3 | NumberArray3;

export type SegmentPath3vExt = Cartesian[];
export type SegmentPathLonLatExt = Geodetic[];

export type SegmentPathColor = NumberArray4[];

export type SegmentPath3v = Vec3[];
export type SegmentPathLonLat = LonLat[];
export interface TexParam {
    texOffset: number;
    strokeSize: number;
}
type IndexFormatMode = typeof F3V | typeof FLONLAT | typeof FDETECT;
type LineSourceMode = typeof F3V | typeof FLONLAT;
type StrokeSource = string | HTMLImageElement;
type StrokeSourceArray = (StrokeSource | null | undefined)[];
type StrokeSourceInput = StrokeSource | StrokeSourceArray | null;

const isStrokeSource = (value: unknown): value is StrokeSource => {
    if (typeof value === "string") {
        return value.length > 0;
    }
    return typeof HTMLImageElement !== "undefined" && value instanceof HTMLImageElement;
};

const resolveSegmentSrc = (src: StrokeSourceInput, segIndex: number): StrokeSource | null => {
    if (!src) return null;
    if (!Array.isArray(src)) {
        return isStrokeSource(src) ? src : null;
    }
    const value = src[segIndex];
    if (value !== undefined) {
        return isStrokeSource(value) ? value : null;
    }
    const fallback = src[src.length - 1];
    return isStrokeSource(fallback) ? fallback : null;
};

const toVec3 = (point: Cartesian): Vec3 => {
    if (point instanceof Array) {
        return new Vec3(point[0], point[1], point[2]);
    }
    return point as Vec3;
};

const toLonLat = (point: Geodetic): LonLat => {
    if (point instanceof Array) {
        return new LonLat(point[0], point[1], point[2]);
    }
    return point as LonLat;
};

const createMirroredPoint = (p0: Vec3, p1: Vec3): Vec3 => {
    return new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
};

const pushQuadColor = (outColors: number[], color: NumberArray4) => {
    const a = color[A] != undefined ? color[A] : 1.0;
    outColors.push(
        color[R], color[G], color[B], a,
        color[R], color[G], color[B], a,
        color[R], color[G], color[B], a,
        color[R], color[G], color[B], a
    );
};

const pushQuadPicking = (outPickingColors: number[], pickingColor: NumberArray3 | NumberArray4) => {
    const pr = pickingColor[R], pg = pickingColor[G], pb = pickingColor[B];
    outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
};

const pushQuadThickness = (outThickness: number[], thickness: number) => {
    outThickness.push(thickness, thickness, thickness, thickness);
};

const pushQuadTexParams = (outTexParams: number[], texParam: TexParam) => {
    outTexParams.push(
        texParam.texOffset, texParam.strokeSize,
        texParam.texOffset, texParam.strokeSize,
        texParam.texOffset, texParam.strokeSize,
        texParam.texOffset, texParam.strokeSize
    );
};

const pushQuadOrders = (outOrders: number[]) => {
    outOrders.push(1, -1, 2, -2);
};

const pushQuadTexCoords = (outTexCoords: number[], atlas: number[] | null, lonLatDefaults: boolean = false) => {
    if (atlas && atlas.length >= 10) {
        const minY = atlas[1];
        const imgHeight = atlas[3] - minY;
        const t0x = atlas[4], t0y = atlas[5];
        const t1x = atlas[2], t1y = atlas[3];
        const t2x = atlas[8], t2y = atlas[9];
        const t3x = atlas[0], t3y = atlas[1];
        outTexCoords.push(
            t0x, t0y, minY, imgHeight,
            t1x, t1y, minY, imgHeight,
            t2x, t2y, minY, imgHeight,
            t3x, t3y, minY, imgHeight
        );
        return;
    }

    if (lonLatDefaults) {
        outTexCoords.push(0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0);
        return;
    }

    outTexCoords.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
};

const initLineIndexes = (outIndexes: number[], indexFormat: IndexFormatMode): number => {
    const is3vMode = indexFormat === FDETECT
        ? outIndexes.length > 1 && outIndexes[0] === 0 && outIndexes[1] === 0
        : indexFormat === F3V;
    let index = 0;
    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index);
        if (is3vMode) {
            outIndexes.push(index);
        }
    } else {
        outIndexes.push(0);
        if (is3vMode) {
            outIndexes.push(0);
        }
    }
    return index;
};

const resetExtentBounds = (extent: Extent) => {
    extent.southWest.set(180.0, 90.0);
    extent.northEast.set(-180.0, -90.0);
};

const extendExtent = (extent: Extent, lonLat: LonLat) => {
    if (lonLat.lon < extent.southWest.lon) {
        extent.southWest.lon = lonLat.lon;
    }
    if (lonLat.lat < extent.southWest.lat) {
        extent.southWest.lat = lonLat.lat;
    }
    if (lonLat.lon > extent.northEast.lon) {
        extent.northEast.lon = lonLat.lon;
    }
    if (lonLat.lat > extent.northEast.lat) {
        extent.northEast.lat = lonLat.lat;
    }
};


export interface IPolylineParams {
    altitude?: number;
    thickness?: number;
    opacity?: number;
    color?: string;
    visibility?: boolean;
    isClosed?: boolean;
    pathColors?: SegmentPathColor[];
    path3v?: SegmentPath3vExt[];
    pathLonLat?: SegmentPathLonLatExt[];
    visibleSpherePosition?: Cartesian;
    visibleSphereRadius?: number;
    /** Single texture for all segments, or per-segment: ["src1","src2"], null/undefined = color-only */
    src?: StrokeSource | StrokeSourceArray;
    texParams?: TexParam[];
}

/**
 * Polyline object.
 * @class
 * @param {Object} [options] - Polyline options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {Number} [options.altitude] - Relative to ground layers altitude value.
 * @param {Vec4} [options.color] - RGBA color.
 * @param {Boolean} [options.opacity] - Line opacity.
 * @param {Boolean} [options.visibility] - Polyline visibility. True default.
 * @param {Boolean} [options.isClosed] - Closed geometry type identification.
 * @param {SegmentPathLonLatExt[]} [options.pathLonLat] - Polyline geodetic coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPath3vExt[]} [options.path3v] - LinesString cartesian coordinates array. [[[0,0,0], [1,1,1],...]]
 * @param {SegmentPathColor[]} [options.pathColors] - Coordinates color. [[[1,0,0,1], [0,1,0,1],...]] for right and green colors.
 * @param {TexParam[]} [options.texParams] - Per-segment texture params: texOffset and strokeSize.
 */
class Polyline {
    static __counter__: number = 0;

    /**
     * Object uniq identifier.
     * @protected
     * @type {number}
     */
    protected __id: number;

    public altitude: number;

    /**
     * Polyline thickness in screen pixels.
     * @type {number}
     */
    protected _thickness: number;

    protected _opacity: number;

    /**
     * Polyline RGBA color.
     * @protected
     * @type {Float32Array}
     */
    protected _defaultColor: Float32Array | NumberArray4;

    protected _pickingColor: Float32Array | NumberArray4;

    /**
     * Polyline visibility.
     * @public
     * @type {boolean}
     */
    public visibility: boolean;

    /**
     * Polyline geometry ring type identification.
     * @protected
     * @type {Boolean}
     */
    protected _closedLine: boolean;

    /**
     * Polyline cartesian coordinates.
     * @public
     * @type {Array.<Vec3>}
     */
    public _path3v: SegmentPath3vExt[];

    protected _pathLengths: number[];

    /**
     * Polyline geodetic degrees coordinates.
     * @private
     * @type {Array.<LonLat>}
     */
    protected _pathLonLat: SegmentPathLonLatExt[];

    /**
     * Polyline geodetic mercator coordinates.
     * @public
     * @type {Array.<LonLat>}
     */
    public _pathLonLatMerc: LonLat[][];

    protected _pathColors: SegmentPathColor[];
    protected _segmentThickness: number[];
    protected _segmentTexParams: (TexParam | undefined)[];

    protected _pathPickingColors: NumberArray3[][];

    /**
     * Polyline geodetic extent.
     * @protected
     * @type {Extent}
     */
    public _extent: Extent;
    protected _verticesHigh: TypedArray | number[];
    protected _verticesLow: TypedArray | number[];
    protected _orders: TypedArray | number[];
    protected _indexes: TypedArray | number[];
    protected _colors: TypedArray | number[];
    protected _thicknessArr: TypedArray | number[];
    protected _pathTexParamArr: TypedArray | number[];
    protected _texCoordArr: TypedArray | number[];
    protected _pickingColors: TypedArray | number[];

    protected _atlasTexCoords: number[];

    protected _verticesHighBuffer: WebGLBufferExt | null;
    protected _verticesLowBuffer: WebGLBufferExt | null;
    protected _ordersBuffer: WebGLBufferExt | null;
    protected _indexesBuffer: WebGLBufferExt | null;
    protected _colorsBuffer: WebGLBufferExt | null;
    protected _texCoordBuffer: WebGLBufferExt | null;
    protected _thicknessBuffer: WebGLBufferExt | null;
    protected _pathTexParamBuffer: WebGLBufferExt | null;
    protected _pickingColorsBuffer: WebGLBufferExt | null;

    protected _renderNode: RenderNode | null;

    /**
     * Entity instance that holds this Polyline.
     * @public
     * @type {Entity}
     */
    public _entity: Entity | null;

    /**
     * Handler that stores and renders this Polyline object.
     * @public
     * @type {PolylineHandler | null}
     */
    public _handler: PolylineHandler | null;
    public _handlerIndex: number;
    protected _buffersUpdateCallbacks: Function[];
    protected _changedBuffers: boolean[];

    protected _visibleSphere: Float32Array;

    public __doubleToTwoFloats: (pos: Vec3, highPos: Vec3, lowPos: Vec3) => void;

    /**
     * Stroke image src: string (all segments) or per-segment array.
     * @protected
     */
    protected _src: StrokeSourceInput;

    /**
     * Stroke image(s): single or per-segment. null = color-only.
     * @protected
     */
    protected _image: (HTMLImageElement & { __nodeIndex?: number }) | (HTMLImageElement & { __nodeIndex?: number } | null)[] | null;

    protected _defaultTexParam: TexParam;

    constructor(options: IPolylineParams = {}) {

        this.__id = Polyline.__counter__++;

        this.__doubleToTwoFloats = Vec3.doubleToTwoFloats;

        this.altitude = options.altitude || 0.0;

        this._thickness = options.thickness || 1.5;

        this._opacity = options.opacity != undefined ? options.opacity : 1.0;

        this._defaultColor = htmlColorToFloat32Array(
            options.color || DEFAULT_COLOR,
            options.opacity
        );

        this._pickingColor = new Float32Array([0, 0, 0]);

        this.visibility = options.visibility != undefined ? options.visibility : true;

        this._closedLine = options.isClosed || false;

        this._path3v = [];

        this._pathLengths = [];

        this._pathLonLat = [];

        this._pathLonLatMerc = [];

        this._pathColors = options.pathColors ? cloneArray(options.pathColors) : [];
        this._segmentThickness = [];
        this._segmentTexParams = options.texParams
            ? options.texParams.map((p) => ({
                texOffset: p?.texOffset ?? 0,
                strokeSize: p?.strokeSize ?? 32
            }))
            : [];

        this._pathPickingColors = [];

        this._extent = new Extent();

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._pathTexParamArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._atlasTexCoords = [];

        this._verticesHighBuffer = null;
        this._verticesLowBuffer = null;
        this._ordersBuffer = null;
        this._indexesBuffer = null;
        this._colorsBuffer = null;
        this._texCoordBuffer = null;
        this._thicknessBuffer = null;
        this._pathTexParamBuffer = null;
        this._pickingColorsBuffer = null;

        this._renderNode = null;

        this._entity = null;


        this._handler = null;
        this._handlerIndex = -1;

        this._image = null;

        this._src = options.src ?? null;

        this._defaultTexParam = {
            texOffset: 0,
            strokeSize: 32
        };

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[VERTICES_BUFFER] = this._createVerticesBuffer;
        this._buffersUpdateCallbacks[INDEX_BUFFER] = this._createIndexBuffer;
        this._buffersUpdateCallbacks[COLORS_BUFFER] = this._createColorsBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this._createTexCoordBuffer;
        this._buffersUpdateCallbacks[THICKNESS_BUFFER] = this._createThicknessBuffer;
        this._buffersUpdateCallbacks[TEXPARAM_BUFFER] = this._createTexParamsBuffer;
        this._buffersUpdateCallbacks[PICKINGCOLORS_BUFFER] = this._createPickingColorsBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        let c = createVector3(options.visibleSpherePosition).toArray();
        let r = options.visibleSphereRadius || 0;
        this._visibleSphere = new Float32Array([...c, r]);

        // create path
        if (options.pathLonLat) {
            this.setPathLonLat(options.pathLonLat);
        } else if (options.path3v) {
            this.setPath3v(options.path3v);
        }

        this._refresh();
    }

    public setImage(image: HTMLImageElement) {
        this.setSrc(image);
    }

    public getImage(): HTMLImageElementExt | (HTMLImageElementExt | null)[] | null {
        return this._image;
    }

    protected _setSrcSingle(
        src: StrokeSource,
        renderNode: RenderNode,
        textureAtlas: any
    ) {
        const onImageReady = (img: HTMLImageElementExt) => {
            if (img.__nodeIndex != undefined && textureAtlas.get(img.__nodeIndex)) {
                this._image = img;
                this._setTexCoordArr(textureAtlas.get(img.__nodeIndex!)!.texCoords);
                return;
            }

            textureAtlas.addImage(img);
            textureAtlas.createTexture();
            this._image = img;
            renderNode.updateStrokeTexCoords();
        };

        if (typeof src === "string") {
            textureAtlas.loadImage(src, onImageReady);
            return;
        }

        const img = src as HTMLImageElementExt;
        if (img.width && img.height) {
            onImageReady(img);
            return;
        }

        img.addEventListener("load", () => onImageReady(img), {once: true});
    }

    protected _setSrcPerSegment(
        src: StrokeSourceArray,
        segCount: number,
        renderNode: RenderNode,
        textureAtlas: any
    ) {
        const pending = new Map<StrokeSource, number[]>();
        for (let j = 0; j < segCount; j++) {
            const segmentSrc = resolveSegmentSrc(src, j);
            if (!segmentSrc) continue;
            if (!pending.has(segmentSrc)) {
                pending.set(segmentSrc, []);
            }
            pending.get(segmentSrc)!.push(j);
        }

        const segTexCoords: (number[] | null)[] = new Array(segCount).fill(null);
        const segImages: (HTMLImageElementExt | null)[] = new Array(segCount).fill(null);
        let loaded = 0;
        const needed = pending.size;

        const onLoaded = () => {
            loaded++;
            if (loaded === needed) {
                this._image = segImages;
                this._setTexCoordArr(segTexCoords);
                renderNode.updateStrokeTexCoords();
            }
        };

        pending.forEach((segIndices, source) => {
            const onImageReady = (img: HTMLImageElementExt) => {
                let atlasData = img.__nodeIndex != undefined ? textureAtlas.get(img.__nodeIndex) : undefined;
                if (!atlasData) {
                    textureAtlas.addImage(img);
                    textureAtlas.createTexture();
                    atlasData = img.__nodeIndex != undefined ? textureAtlas.get(img.__nodeIndex) : undefined;
                }
                for (const j of segIndices) {
                    segTexCoords[j] = atlasData?.texCoords ?? null;
                    segImages[j] = img;
                }
                onLoaded();
            };

            if (typeof source === "string") {
                textureAtlas.loadImage(source, onImageReady);
                return;
            }

            const img = source as HTMLImageElementExt;
            if (img.width && img.height) {
                onImageReady(img);
            } else {
                img.addEventListener("load", () => onImageReady(img), {once: true});
            }
        });
    }

    protected _setSrcDisabled(segCount: number, renderNode: RenderNode) {
        this._image = null;
        const empty: (number[] | null)[] = new Array(segCount).fill(null);
        this._setTexCoordArr(empty);
        renderNode.updateStrokeTexCoords();
    }

    protected _setTextureEnabled(segCount: number) {
        if (this._defaultTexParam.strokeSize <= 0) {
            this._defaultTexParam.strokeSize = 32;
        }
        for (let i = 0; i < segCount; i++) {
            const texParams = this._resolveSegmentTexParams(i);
            if (texParams.strokeSize <= 0) {
                this.setPathTexParams(undefined, this._defaultTexParam.strokeSize, i);
            }
        }
    }

    /**
     * Sets stroke source. string/Image = all segments, array = per-segment (null/undefined = color-only).
     * @public
     */
    public setSrc(src: StrokeSourceInput) {
        this._src = src ?? null;
        const bh = this._handler;
        if (!bh) return;
        const rn = bh._entityCollection.renderNode;
        if (!rn?.renderer) return;
        const ta = rn.renderer.strokeTextureAtlas;
        const segCount = Math.max(this._path3v?.length || 0, 1);

        if (src && !Array.isArray(src) && isStrokeSource(src)) {
            this._setTextureEnabled(segCount);
            this._setSrcSingle(src, rn, ta);
            return;
        }

        if (Array.isArray(src) && src.some((s) => isStrokeSource(s))) {
            this._setTextureEnabled(segCount);
            this._setSrcPerSegment(src, segCount, rn, ta);
            return;
        }

        this._setSrcDisabled(segCount, rn);
    }

    /**
     * Set stroke source (string or Image) for a segment index.
     * @public
     */
    public setPathSrc(src: StrokeSource | null | undefined, segmentIndex: number = 0) {

        if (segmentIndex === 0 && !Array.isArray(this._src)) {
            this.setSrc(src ?? null);
            return;
        }

        const baseSrc = this._src;
        const segCount = Math.max(this._path3v?.length || 0, 1, segmentIndex + 1);
        const perSegmentSrc: StrokeSourceArray = new Array(segCount);

        if (Array.isArray(baseSrc)) {
            for (let i = 0; i < segCount; i++) {
                perSegmentSrc[i] = baseSrc[i];
            }
        } else {
            for (let i = 0; i < segCount; i++) {
                perSegmentSrc[i] = baseSrc ?? null;
            }
        }

        perSegmentSrc[segmentIndex] = src ?? null;
        this.setSrc(perSegmentSrc);
    }

    public getSrc(): StrokeSourceInput {
        return this._src;
    }

    public _setTexCoordArr(tcoordArrOrArrs: number[] | (number[] | null)[]) {
        this._texCoordArr = [];
        const perSegment = tcoordArrOrArrs.length > 0 && typeof tcoordArrOrArrs[0] !== "number";
        if (!perSegment) this._atlasTexCoords = tcoordArrOrArrs as number[];
        Polyline.setPathTexCoords(this._path3v, tcoordArrOrArrs, this._texCoordArr);
        this._changedBuffers[TEXCOORD_BUFFER] = true;
    }

    public setTextureDisabled() {
        this._defaultTexParam.strokeSize = 0;
        const segCount = Math.max(this._path3v.length, this._pathLonLat.length, this._segmentTexParams.length);
        for (let i = 0; i < segCount; i++) {
            this.setPathStrokeSize(0, i);
        }
    }

    /** Get atlas tex coords for segment (null = color-only) */
    protected _getAtlasTexCoordsForSegment(segIndex: number): number[] | null {
        const img = this._image;
        if (Array.isArray(img) && segIndex < img.length) {
            const m = img[segIndex];
            if (m == null) return null;
            const rn = this._handler?._entityCollection?.renderNode;
            const d = rn?.renderer && m.__nodeIndex != null ? rn.renderer.strokeTextureAtlas.get(m.__nodeIndex) : null;
            return d?.texCoords ?? null;
        }
        return (this._atlasTexCoords?.length) ? this._atlasTexCoords : null;
    }

    protected _pushQuadVertices(position: Vec3, vHigh: Vec3, vLow: Vec3, outVerticesHigh: number[], outVerticesLow: number[]) {
        this.__doubleToTwoFloats(position, vHigh, vLow);

        outVerticesHigh.push(
            vHigh.x, vHigh.y, vHigh.z,
            vHigh.x, vHigh.y, vHigh.z,
            vHigh.x, vHigh.y, vHigh.z,
            vHigh.x, vHigh.y, vHigh.z
        );

        outVerticesLow.push(
            vLow.x, vLow.y, vLow.z,
            vLow.x, vLow.y, vLow.z,
            vLow.x, vLow.y, vLow.z,
            vLow.x, vLow.y, vLow.z
        );
    }

    protected _resolveSegmentThickness(segIndex: number): number {
        let thickness = this._segmentThickness[segIndex];
        if (thickness == undefined) {
            thickness = this._thickness;
            this._segmentThickness[segIndex] = thickness;
        }
        return thickness;
    }

    protected _resolveSegmentTexParams(segIndex: number): TexParam {
        let texParam = this._segmentTexParams[segIndex];
        if (!texParam) {
            texParam = {
                texOffset: this._defaultTexParam.texOffset,
                strokeSize: this._defaultTexParam.strokeSize
            };
            this._segmentTexParams[segIndex] = texParam;
        }
        return texParam;
    }


    protected _recalculateExtentFromLonLatPaths() {
        resetExtentBounds(this._extent);
        const paths = this._pathLonLat;
        for (let i = 0; i < paths.length; i++) {
            const segment = paths[i];
            if (!segment) continue;
            for (let j = 0; j < segment.length; j++) {
                const p = segment[j];
                const lonLat = p instanceof Array ? new LonLat(p[0], p[1], p[2]) : (p as LonLat);
                extendExtent(this._extent, lonLat);
            }
        }
    }

    protected _normalizeSegmentPathColors(segmentLength: number, segColorsInput: SegmentPathColor | NumberArray4): SegmentPathColor {
        const hasUniformSegmentColor = Array.isArray(segColorsInput) && segColorsInput.length > 0 && typeof segColorsInput[0] === "number";
        const segmentColorCount = hasUniformSegmentColor ? 0 : (segColorsInput as SegmentPathColor).length;
        const lastSegmentColor = segmentColorCount > 0 ? (segColorsInput as SegmentPathColor)[segmentColorCount - 1] : undefined;
        const outSegmentColors = new Array(segmentLength);
        let color = this._defaultColor as NumberArray4;

        for (let i = 0; i < segmentLength; i++) {
            if (hasUniformSegmentColor) {
                color = segColorsInput as NumberArray4;
            } else if ((segColorsInput as SegmentPathColor)[i]) {
                color = (segColorsInput as SegmentPathColor)[i];
            } else if (lastSegmentColor && i >= segmentColorCount) {
                color = lastSegmentColor;
            }
            outSegmentColors[i] = color;
        }

        return outSegmentColors;
    }

    protected _markGeometryBuffersChanged(includeTexCoords: boolean) {
        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
        this._changedBuffers[COLORS_BUFFER] = true;
        this._changedBuffers[THICKNESS_BUFFER] = true;
        this._changedBuffers[TEXPARAM_BUFFER] = true;
        if (includeTexCoords) {
            this._changedBuffers[TEXCOORD_BUFFER] = true;
        }
        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    protected _applyForceEqualSegmentUpdate<TSegment extends any[]>(
        segmentPath: TSegment,
        segmentIndex: number,
        pathColors: SegmentPathColor | NumberArray4 | undefined,
        currentPaths: TSegment[],
        equalUpdate: (segmentPath: TSegment, segmentIndex: number, pathColors?: SegmentPathColor | NumberArray4) => void,
        recreateData: (nextPaths: TSegment[]) => void,
        includeTexCoords: boolean
    ): boolean {
        const targetSegmentPath = currentPaths[segmentIndex] as unknown as any[];
        const canUseEqualUpdate = !!targetSegmentPath && targetSegmentPath.length === (segmentPath as unknown as any[]).length;

        if (canUseEqualUpdate) {
            equalUpdate(segmentPath, segmentIndex, pathColors);
            this._changedBuffers[VERTICES_BUFFER] = true;
            if (pathColors) {
                this._changedBuffers[COLORS_BUFFER] = true;
            }
            return true;
        }

        const nextPaths = ([] as TSegment[]).concat(currentPaths);
        nextPaths[segmentIndex] = segmentPath;

        if (pathColors) {
            this._pathColors[segmentIndex] = this._normalizeSegmentPathColors(
                (segmentPath as unknown as any[]).length,
                pathColors
            );
        }

        recreateData(nextPaths);
        this._markGeometryBuffersChanged(includeTexCoords);
        return true;
    }

    protected __appendLineDataCore(
        pathInput: SegmentPath3vExt[] | SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        pathPickingColors: NumberArray3[][],
        defaultColor: NumberArray4,
        isClosed: boolean,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        outTexCoords: number[],
        ellipsoid: Ellipsoid | null,
        outPath3v: SegmentPath3vExt[],
        outPathLonLat: SegmentPathLonLatExt[],
        outPathMerc: LonLat[][],
        outExtent: Extent,
        outColors: number[],
        outThickness: number[],
        outTexParams: number[],
        outPickingColors: number[],
        sourceType: LineSourceMode,
        segmentOffset: number = 0,
        indexFormat: IndexFormatMode = sourceType,
        useLonLatDefaultTexCoords: boolean = sourceType === FLONLAT,
        resetExtent: boolean = true
    ) {
        let index = initLineIndexes(outIndexes, indexFormat);
        const vHigh = new Vec3();
        const vLow = new Vec3();

        if (outExtent && resetExtent) {
            resetExtentBounds(outExtent);
        }

        for (let j = 0, len = pathInput.length; j < len; j++) {
            const segIndex = segmentOffset + j;
            const path = pathInput[j] as (Cartesian[] | Geodetic[]);
            const pathColors_j = pathColors[j];
            const pathPickingColors_j = pathPickingColors[j];

            outPath3v[segIndex] = [];
            outPathLonLat[segIndex] = [];
            outPathMerc[segIndex] = [];

            if (path.length === 0) {
                continue;
            }

            const path3v: Vec3[] = new Array(path.length);
            const pathLonLat: LonLat[] = new Array(path.length);

            for (let i = 0; i < path.length; i++) {
                if (sourceType === F3V) {
                    const cart = toVec3(path[i] as Cartesian);
                    path3v[i] = cart;
                    if (ellipsoid) {
                        pathLonLat[i] = ellipsoid.cartesianToLonLat(cart);
                    }
                } else {
                    const lonLat = toLonLat(path[i] as Geodetic);
                    pathLonLat[i] = lonLat;
                    path3v[i] = (ellipsoid as Ellipsoid).lonLatToCartesian(lonLat);
                }
            }

            const segAtlas = useLonLatDefaultTexCoords ? null : this._getAtlasTexCoordsForSegment(segIndex);
            const thickness = this._resolveSegmentThickness(segIndex);
            const texParams = this._resolveSegmentTexParams(segIndex);

            const p0 = path3v[0];
            const p1 = path3v[1] || p0;
            const last = isClosed ? path3v[path3v.length - 1] : createMirroredPoint(p0, p1);
            const startIndex = index;

            let color = defaultColor;
            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            let pickingColor: NumberArray3 = (pathPickingColors_j && pathPickingColors_j[0])
                ? pathPickingColors_j[0]
                : (this._pickingColor as unknown as NumberArray3);

            this._pushQuadVertices(last, vHigh, vLow, outVerticesHigh, outVerticesLow);

            if (segIndex > 0) {
                pushQuadColor(outColors, color);
                pushQuadThickness(outThickness, thickness);
                pushQuadTexParams(outTexParams, texParams);
                pushQuadPicking(outPickingColors, pickingColor);
                pushQuadTexCoords(outTexCoords, segAtlas, useLonLatDefaultTexCoords);
            }

            pushQuadOrders(outOrders);

            for (let i = 0, plen = path3v.length; i < plen; i++) {
                const cur = path3v[i];
                const lonLat = pathLonLat[i];

                outPath3v[segIndex].push(cur);

                if (lonLat) {
                    outPathLonLat[segIndex].push(lonLat);
                    outPathMerc[segIndex].push(lonLat.forwardMercator());
                    extendExtent(outExtent, lonLat);
                }

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }
                if (pathPickingColors_j && pathPickingColors_j[i]) {
                    pickingColor = pathPickingColors_j[i];
                }

                this._pushQuadVertices(cur, vHigh, vLow, outVerticesHigh, outVerticesLow);
                pushQuadColor(outColors, color);
                pushQuadThickness(outThickness, thickness);
                pushQuadTexParams(outTexParams, texParams);
                pushQuadPicking(outPickingColors, pickingColor);
                pushQuadTexCoords(outTexCoords, segAtlas, useLonLatDefaultTexCoords);
                pushQuadOrders(outOrders);

                outIndexes.push(index++, index++, index++, index++);
            }

            const lp0 = path3v[path3v.length - 1];
            const lp1 = path3v[path3v.length - 2] || lp0;
            const first = isClosed ? path3v[0] : createMirroredPoint(lp0, lp1);

            if (isClosed) {
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (pathColors_j && pathColors_j[path3v.length - 1]) {
                color = pathColors_j[path3v.length - 1];
            }
            if (pathPickingColors_j && pathPickingColors_j[path3v.length - 1]) {
                pickingColor = pathPickingColors_j[path3v.length - 1];
            }

            this._pushQuadVertices(first, vHigh, vLow, outVerticesHigh, outVerticesLow);
            pushQuadColor(outColors, color);
            pushQuadThickness(outThickness, thickness);
            pushQuadTexParams(outTexParams, texParams);
            pushQuadPicking(outPickingColors, pickingColor);
            pushQuadTexCoords(outTexCoords, segAtlas, useLonLatDefaultTexCoords);
            pushQuadOrders(outOrders);

            if (j < pathInput.length - 1 && pathInput[j + 1].length !== 0) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    /**
     * Appends to the line array new cartesian coordinates line data.
     */
    protected __appendLineData3v(
        path3v: SegmentPath3vExt[],
        pathColors: SegmentPathColor[],
        pathPickingColors: NumberArray3[][],
        defaultColor: NumberArray4,
        isClosed: boolean,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        ellipsoid: Ellipsoid,
        outTransformedPathLonLat: SegmentPathLonLatExt[],
        outPath3v: SegmentPath3vExt[],
        outTransformedPathMerc: LonLat[][],
        outExtent: Extent,
        outColors: number[],
        outThickness: number[],
        outTexParams: number[],
        outTexCoords: number[],
        outPickingColors: number[]
    ) {
        this.__appendLineDataCore(
            path3v,
            pathColors,
            pathPickingColors,
            defaultColor,
            isClosed,
            outVerticesHigh,
            outVerticesLow,
            outOrders,
            outIndexes,
            outTexCoords,
            ellipsoid,
            outPath3v,
            outTransformedPathLonLat,
            outTransformedPathMerc,
            outExtent,
            outColors,
            outThickness,
            outTexParams,
            outPickingColors,
            F3V,
            0,
            F3V,
            false
        );
    }

    /**

     [1, -1, 2, -2] - orders for triangle strip line segment
     t2        t3
     (2)-------(-2)
     |          |
     |          |
     |          |
     |          |
     (1)-------(-1)
     t0        t1
     */
    static setPathTexCoords(
        path3v: SegmentPath3vExt[],
        tCoordArrOrArrs: number[] | (number[] | null)[],
        outTexCoords: number[]
    ) {
        const isPerSegment = tCoordArrOrArrs.length > 0 && typeof tCoordArrOrArrs[0] !== "number";
        const tArr = tCoordArrOrArrs as (number[] | null)[];

        const ZEROS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const pushTc = (tc: number[] | null) => {
            if (tc && tc.length >= 10) {
                const minY = tc[1], imgHeight = tc[3] - minY;
                const t0x = tc[4], t0y = tc[5], t1x = tc[2], t1y = tc[3];
                const t2x = tc[8], t2y = tc[9], t3x = tc[0], t3y = tc[1];
                outTexCoords.push(t0x, t0y, minY, imgHeight, t1x, t1y, minY, imgHeight, t2x, t2y, minY, imgHeight, t3x, t3y, minY, imgHeight);
            } else {
                outTexCoords.push(...ZEROS);
            }
        };

        for (let j = 0, len = path3v.length; j < len; j++) {
            const path = path3v[j];
            if (path.length === 0) continue;

            const tc = isPerSegment ? (tArr[j] !== undefined ? tArr[j] : (tArr[0] ?? null)) : (tCoordArrOrArrs as number[]);
            if (j > 0) pushTc(tc);

            for (let i = 0; i < path.length; i++) pushTc(tc);
            pushTc(tc);
        }
    }

    static setPathColors(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        defaultColor: NumberArray4,
        outColors: number[]
    ) {
        for (let j = 0, len = pathLonLat.length; j < len; j++) {
            var path = pathLonLat[j],
                pathColors_j = pathColors[j];

            if (path.length === 0) {
                continue;
            }

            let color = defaultColor;
            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            for (let i = 0, len = path.length; i < len; i++) {

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
        }
    }

    /**
     * Appends to the line array new geodetic coordinates line data.
     * @static
     */
    protected __appendLineDataLonLat(
        pathLonLat: SegmentPathLonLatExt[],
        pathColors: SegmentPathColor[],
        pathPickingColors: NumberArray3[][],
        defaultColor: NumberArray4,
        isClosed: boolean,
        outVerticesHigh: number[],
        outVerticesLow: number[],
        outOrders: number[],
        outIndexes: number[],
        outTexCoords: number[],
        ellipsoid: Ellipsoid,
        outTransformedPathCartesian: SegmentPath3vExt[],
        outPathLonLat: SegmentPathLonLatExt[],
        outTransformedPathMerc: LonLat[][],
        outExtent: Extent,
        outColors: number[],
        outThickness: number[],
        outTexParams: number[],
        outPickingColors: number[]
    ) {
        this.__appendLineDataCore(
            pathLonLat,
            pathColors,
            pathPickingColors,
            defaultColor,
            isClosed,
            outVerticesHigh,
            outVerticesLow,
            outOrders,
            outIndexes,
            outTexCoords,
            ellipsoid,
            outTransformedPathCartesian,
            outPathLonLat,
            outTransformedPathMerc,
            outExtent,
            outColors,
            outThickness,
            outTexParams,
            outPickingColors,
            FLONLAT,
            0,
            FLONLAT,
            true
        );
    }

    protected _setEqualPath3v(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {

        var extent = this._extent;

        var v_high = new Vec3(),
            v_low = new Vec3();

        var vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            k = 0;

        var ellipsoid = (this._renderNode as Planet).ellipsoid;
        if (ellipsoid) {
            extent.southWest.set(180, 90);
            extent.northEast.set(-180, -90);
        }
        const colors = this._colors;
        let ck = 0;

        const pathColorsAny = pathColors as any;
        const hasUniformPathColor = !!pathColorsAny && Array.isArray(pathColorsAny) && pathColorsAny.length > 0 && typeof pathColorsAny[0] === "number";

        for (let j = 0; j < path3v.length; j++) {
            var path = path3v[j] as Vec3[];
            const pathColors_j_any = hasUniformPathColor ? pathColorsAny : (pathColorsAny ? pathColorsAny[j] : undefined);
            const hasUniformSegmentColor = !!pathColors_j_any && Array.isArray(pathColors_j_any) && pathColors_j_any.length > 0 && typeof pathColors_j_any[0] === "number";
            const segmentColorCount = !hasUniformSegmentColor && pathColors_j_any && Array.isArray(pathColors_j_any) ? pathColors_j_any.length : 0;
            const lastSegmentColor = segmentColorCount > 0 ? pathColors_j_any[segmentColorCount - 1] as NumberArray4 : undefined;
            let targetSegmentColors: SegmentPathColor | undefined;

            if (pathColors) {
                targetSegmentColors = this._pathColors[j] || (this._pathColors[j] = new Array(path.length));
            }

            var last;
            if (this._closedLine) {
                last = path[path.length - 1];
            } else {
                last = new Vec3(
                    path[0].x + path[0].x - path[1].x,
                    path[0].y + path[0].y - path[1].y,
                    path[0].z + path[0].z - path[1].z
                );
            }

            this.__doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            let color = this._defaultColor as NumberArray4;
            if (hasUniformSegmentColor) {
                color = pathColors_j_any as NumberArray4;
            } else if (pathColors_j_any && pathColors_j_any[0]) {
                color = pathColors_j_any[0];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }

            if (j > 0 && pathColors) {
                const a = color[A] != undefined ? color[A] : 1.0;
                colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                ck += 16;
            }

            for (let i = 0; i < path.length; i++) {
                var cur = path[i] as Vec3,
                    pji = this._path3v[j][i] as Vec3;

                pji.x = cur.x;
                pji.y = cur.y;
                pji.z = cur.z;

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur);

                    this._pathLonLat[j][i] = lonLat;

                    l[j][i] = lonLat;
                    m[j][i] = lonLat.forwardMercator();

                    if (lonLat.lon < extent.southWest.lon) {
                        extent.southWest.lon = lonLat.lon;
                    }
                    if (lonLat.lat < extent.southWest.lat) {
                        extent.southWest.lat = lonLat.lat;
                    }
                    if (lonLat.lon > extent.northEast.lon) {
                        extent.northEast.lon = lonLat.lon;
                    }
                    if (lonLat.lat > extent.northEast.lat) {
                        extent.northEast.lat = lonLat.lat;
                    }
                }

                if (pathColors) {
                    if (hasUniformSegmentColor) {
                        color = pathColors_j_any as NumberArray4;
                    } else if (pathColors_j_any && pathColors_j_any[i]) {
                        color = pathColors_j_any[i];
                    } else if (lastSegmentColor && i >= segmentColorCount) {
                        color = lastSegmentColor;
                    }
                    targetSegmentColors![i] = color;
                    const a = color[A] != undefined ? color[A] : 1.0;
                    colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                    colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                    colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                    colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                    ck += 16;
                }

                this.__doubleToTwoFloats(cur, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
            }

            var first;
            if (this._closedLine) {
                first = path[0];
            } else {
                const l1 = path.length - 1;
                first = new Vec3(
                    path[l1].x + path[l1].x - path[l1 - 1].x,
                    path[l1].y + path[l1].y - path[l1 - 1].y,
                    path[l1].z + path[l1].z - path[l1 - 1].z
                );
            }

            if (pathColors) {
                if (hasUniformSegmentColor) {
                    color = pathColors_j_any as NumberArray4;
                } else if (pathColors_j_any && pathColors_j_any[path.length - 1]) {
                    color = pathColors_j_any[path.length - 1];
                } else if (lastSegmentColor) {
                    color = lastSegmentColor;
                }
            }

            this.__doubleToTwoFloats(first as Vec3, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            if (pathColors) {
                const a = color[A] != undefined ? color[A] : 1.0;
                colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                ck += 16;
            }
        }
    }

    /**
     * Sets one polyline segment with cartesian coordinates.
     * @protected
     * @param {SegmentPath3vExt} path3v - Cartesian coordinates for one segment.
     * @param {number} segmentIndex - Segment index to update.
     */
    protected _setSegmentEqualPath3v(path3v: SegmentPath3vExt, segmentIndex: number, pathColors?: SegmentPathColor | NumberArray4) {
        const path = path3v as Vec3[];
        const targetPath = this._path3v[segmentIndex] as Vec3[];
        if (!path || !targetPath || !path.length || path.length !== targetPath.length) return;

        const v_high = new Vec3();
        const v_low = new Vec3();
        const vh = this._verticesHigh;
        const vl = this._verticesLow;
        const l = this._pathLonLat;
        const m = this._pathLonLatMerc;
        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        const k0 = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;
        const c = this._colors;
        const c0 = this._pathLengths[segmentIndex] * 16 + 32 * segmentIndex;
        let k = k0;
        let ck = c0;
        const hasUniformSegmentColor = !!pathColors && Array.isArray(pathColors) && pathColors.length > 0 && typeof (pathColors as any)[0] === "number";
        const pathColorsAny = pathColors as any;
        const segmentColorCount = !hasUniformSegmentColor && pathColorsAny && Array.isArray(pathColorsAny) ? pathColorsAny.length : 0;
        const lastSegmentColor = segmentColorCount > 0 ? pathColorsAny[segmentColorCount - 1] as NumberArray4 : undefined;
        const targetSegmentColors = pathColors ? (this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = new Array(path.length))) : undefined;

        const last = this._closedLine
            ? path[path.length - 1]
            : new Vec3(
                path[0].x + path[0].x - path[1].x,
                path[0].y + path[0].y - path[1].y,
                path[0].z + path[0].z - path[1].z
            );

        this.__doubleToTwoFloats(last, v_high, v_low);

        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        let color = this._defaultColor as NumberArray4;
        if (pathColors) {
            if (hasUniformSegmentColor) {
                color = pathColors as NumberArray4;
            } else if (pathColorsAny[0]) {
                color = pathColorsAny[0];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }
        }
        if (pathColors && segmentIndex > 0) {
            const a = color[A] != undefined ? color[A] : 1.0;
            c[ck - 16] = c[ck - 12] = c[ck - 8] = c[ck - 4] = color[R];
            c[ck - 15] = c[ck - 11] = c[ck - 7] = c[ck - 3] = color[G];
            c[ck - 14] = c[ck - 10] = c[ck - 6] = c[ck - 2] = color[B];
            c[ck - 13] = c[ck - 9] = c[ck - 5] = c[ck - 1] = a;
        }

        for (let i = 0; i < targetPath.length; i++) {
            const cur = path[i];
            const p = targetPath[i];
            p.x = cur.x;
            p.y = cur.y;
            p.z = cur.z;

            if (ellipsoid) {
                const lonLat = ellipsoid.cartesianToLonLat(cur);
                l[segmentIndex][i] = lonLat;
                m[segmentIndex][i] = lonLat.forwardMercator();
            }

            if (pathColors) {
                if (hasUniformSegmentColor) {
                    color = pathColors as NumberArray4;
                } else if (pathColorsAny[i]) {
                    color = pathColorsAny[i];
                } else if (lastSegmentColor && i >= segmentColorCount) {
                    color = lastSegmentColor;
                }
                targetSegmentColors![i] = color;
                const a = color[A] != undefined ? color[A] : 1.0;
                c[ck] = c[ck + 4] = c[ck + 8] = c[ck + 12] = color[R];
                c[ck + 1] = c[ck + 5] = c[ck + 9] = c[ck + 13] = color[G];
                c[ck + 2] = c[ck + 6] = c[ck + 10] = c[ck + 14] = color[B];
                c[ck + 3] = c[ck + 7] = c[ck + 11] = c[ck + 15] = a;
                ck += 16;
            }

            this.__doubleToTwoFloats(cur, v_high, v_low);
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }

        const first = this._closedLine
            ? path[0]
            : new Vec3(
                path[path.length - 1].x + path[path.length - 1].x - path[path.length - 2].x,
                path[path.length - 1].y + path[path.length - 1].y - path[path.length - 2].y,
                path[path.length - 1].z + path[path.length - 1].z - path[path.length - 2].z
            );
        this.__doubleToTwoFloats(first, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        if (pathColors) {
            if (hasUniformSegmentColor) {
                color = pathColors as NumberArray4;
            } else if (pathColorsAny[path.length - 1]) {
                color = pathColorsAny[path.length - 1];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }
            const a = color[A] != undefined ? color[A] : 1.0;
            c[ck] = c[ck + 4] = c[ck + 8] = c[ck + 12] = color[R];
            c[ck + 1] = c[ck + 5] = c[ck + 9] = c[ck + 13] = color[G];
            c[ck + 2] = c[ck + 6] = c[ck + 10] = c[ck + 14] = color[B];
            c[ck + 3] = c[ck + 7] = c[ck + 11] = c[ck + 15] = a;
        }
    }

    protected _setEqualPathLonLat(pathLonLat: SegmentPathLonLat[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {
        const extent = this._extent;
        extent.southWest.set(180.0, 90.0);
        extent.northEast.set(-180.0, -90.0);

        let v_high = new Vec3(),
            v_low = new Vec3();

        let vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            c = this._path3v,
            k = 0;

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        const colors = this._colors;
        let ck = 0;
        const pathColorsAny = pathColors as any;
        const hasUniformPathColor = !!pathColorsAny && Array.isArray(pathColorsAny) && pathColorsAny.length > 0 && typeof pathColorsAny[0] === "number";

        for (let j = 0; j < pathLonLat.length; j++) {
            var path = pathLonLat[j] as LonLat[];
            const pathColors_j_any = hasUniformPathColor ? pathColorsAny : (pathColorsAny ? pathColorsAny[j] : undefined);
            const hasUniformSegmentColor = !!pathColors_j_any && Array.isArray(pathColors_j_any) && pathColors_j_any.length > 0 && typeof pathColors_j_any[0] === "number";
            const segmentColorCount = !hasUniformSegmentColor && pathColors_j_any && Array.isArray(pathColors_j_any) ? pathColors_j_any.length : 0;
            const lastSegmentColor = segmentColorCount > 0 ? pathColors_j_any[segmentColorCount - 1] as NumberArray4 : undefined;
            let targetSegmentColors: SegmentPathColor | undefined;

            if (pathColors) {
                targetSegmentColors = this._pathColors[j] || (this._pathColors[j] = new Array(path.length));
            }

            var last;
            if (this._closedLine) {
                last = ellipsoid.lonLatToCartesian(path[path.length - 1]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[0]),
                    p1 = ellipsoid.lonLatToCartesian(path[1]);
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            this.__doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            let color = this._defaultColor as NumberArray4;
            if (hasUniformSegmentColor) {
                color = pathColors_j_any as NumberArray4;
            } else if (pathColors_j_any && pathColors_j_any[0]) {
                color = pathColors_j_any[0];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }

            if (j > 0 && pathColors) {
                const a = color[A] != undefined ? color[A] : 1.0;
                colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                ck += 16;
            }

            for (let i = 0; i < path.length; i++) {
                var cur = path[i] as LonLat;
                var cartesian = ellipsoid.lonLatToCartesian(cur);
                c[j][i] = cartesian;
                m[j][i] = cur.forwardMercator();
                l[j][i] = cur;

                if (pathColors) {
                    if (hasUniformSegmentColor) {
                        color = pathColors_j_any as NumberArray4;
                    } else if (pathColors_j_any && pathColors_j_any[i]) {
                        color = pathColors_j_any[i];
                    } else if (lastSegmentColor && i >= segmentColorCount) {
                        color = lastSegmentColor;
                    }
                    targetSegmentColors![i] = color;
                    const a = color[A] != undefined ? color[A] : 1.0;
                    colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                    colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                    colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                    colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                    ck += 16;
                }

                this.__doubleToTwoFloats(cartesian, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;

                if (cur.lon < extent.southWest.lon) {
                    extent.southWest.lon = cur.lon;
                }
                if (cur.lat < extent.southWest.lat) {
                    extent.southWest.lat = cur.lat;
                }
                if (cur.lon > extent.northEast.lon) {
                    extent.northEast.lon = cur.lon;
                }
                if (cur.lat > extent.northEast.lat) {
                    extent.northEast.lat = cur.lat;
                }
            }

            var first;
            if (this._closedLine) {
                first = ellipsoid.lonLatToCartesian(path[0]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[path.length - 1]),
                    p1 = ellipsoid.lonLatToCartesian(path[path.length - 2]);
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            if (pathColors) {
                if (hasUniformSegmentColor) {
                    color = pathColors_j_any as NumberArray4;
                } else if (pathColors_j_any && pathColors_j_any[path.length - 1]) {
                    color = pathColors_j_any[path.length - 1];
                } else if (lastSegmentColor) {
                    color = lastSegmentColor;
                }
            }

            this.__doubleToTwoFloats(first, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            if (pathColors) {
                const a = color[A] != undefined ? color[A] : 1.0;
                colors[ck] = colors[ck + 4] = colors[ck + 8] = colors[ck + 12] = color[R];
                colors[ck + 1] = colors[ck + 5] = colors[ck + 9] = colors[ck + 13] = color[G];
                colors[ck + 2] = colors[ck + 6] = colors[ck + 10] = colors[ck + 14] = color[B];
                colors[ck + 3] = colors[ck + 7] = colors[ck + 11] = colors[ck + 15] = a;
                ck += 16;
            }
        }
    }

    protected _setSegmentEqualLonLat(pathLonLat: SegmentPathLonLatExt, segmentIndex: number, pathColors?: SegmentPathColor | NumberArray4) {
        const path = pathLonLat as SegmentPathLonLat;
        const targetPathLonLat = this._pathLonLat[segmentIndex] as SegmentPathLonLat;
        const targetPath3v = this._path3v[segmentIndex] as SegmentPath3v;

        if (!path || !targetPathLonLat ||
            !targetPath3v || !path.length ||
            path.length !== targetPathLonLat.length ||
            path.length !== targetPath3v.length) {
            return;
        }

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        const v_high = new Vec3();
        const v_low = new Vec3();
        const vh = this._verticesHigh;
        const vl = this._verticesLow;
        const l = this._pathLonLat;
        const m = this._pathLonLatMerc;
        const c = this._path3v;
        const k0 = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;
        const cb = this._colors;
        const c0 = this._pathLengths[segmentIndex] * 16 + 32 * segmentIndex;
        let k = k0;
        let ck = c0;
        const hasUniformSegmentColor = !!pathColors && Array.isArray(pathColors) && pathColors.length > 0 && typeof (pathColors as any)[0] === "number";
        const pathColorsAny = pathColors as any;
        const segmentColorCount = !hasUniformSegmentColor && pathColorsAny && Array.isArray(pathColorsAny) ? pathColorsAny.length : 0;
        const lastSegmentColor = segmentColorCount > 0 ? pathColorsAny[segmentColorCount - 1] as NumberArray4 : undefined;
        const targetSegmentColors = pathColors ? (this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = new Array(path.length))) : undefined;

        const p0 = ellipsoid.lonLatToCartesian(path[0]);
        const p1 = ellipsoid.lonLatToCartesian(path[1] || path[0]);
        const last = this._closedLine
            ? ellipsoid.lonLatToCartesian(path[path.length - 1])
            : new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);

        this.__doubleToTwoFloats(last, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        let color = this._defaultColor as NumberArray4;
        if (pathColors) {
            if (hasUniformSegmentColor) {
                color = pathColors as NumberArray4;
            } else if (pathColorsAny[0]) {
                color = pathColorsAny[0];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }
        }
        if (pathColors && segmentIndex > 0) {
            const a = color[A] != undefined ? color[A] : 1.0;
            cb[ck - 16] = cb[ck - 12] = cb[ck - 8] = cb[ck - 4] = color[R];
            cb[ck - 15] = cb[ck - 11] = cb[ck - 7] = cb[ck - 3] = color[G];
            cb[ck - 14] = cb[ck - 10] = cb[ck - 6] = cb[ck - 2] = color[B];
            cb[ck - 13] = cb[ck - 9] = cb[ck - 5] = cb[ck - 1] = a;
        }

        for (let i = 0, len = path.length; i < len; i++) {
            const cur = path[i] as LonLat;
            const cartesian = ellipsoid.lonLatToCartesian(cur);

            l[segmentIndex][i] = cur;
            m[segmentIndex][i] = cur.forwardMercator();
            c[segmentIndex][i] = cartesian;

            if (pathColors) {
                if (hasUniformSegmentColor) {
                    color = pathColors as NumberArray4;
                } else if (pathColorsAny[i]) {
                    color = pathColorsAny[i];
                } else if (lastSegmentColor && i >= segmentColorCount) {
                    color = lastSegmentColor;
                }

                targetSegmentColors![i] = color;

                const a = color[A] != undefined ? color[A] : 1.0;

                cb[ck] = cb[ck + 4] = cb[ck + 8] = cb[ck + 12] = color[R];
                cb[ck + 1] = cb[ck + 5] = cb[ck + 9] = cb[ck + 13] = color[G];
                cb[ck + 2] = cb[ck + 6] = cb[ck + 10] = cb[ck + 14] = color[B];
                cb[ck + 3] = cb[ck + 7] = cb[ck + 11] = cb[ck + 15] = a;

                ck += 16;
            }

            this.__doubleToTwoFloats(cartesian, v_high, v_low);
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }

        const lp0 = ellipsoid.lonLatToCartesian(path[path.length - 1]);
        const lp1 = ellipsoid.lonLatToCartesian(path[path.length - 2] || path[path.length - 1]);
        const first = this._closedLine
            ? ellipsoid.lonLatToCartesian(path[0])
            : new Vec3(lp0.x + lp0.x - lp1.x, lp0.y + lp0.y - lp1.y, lp0.z + lp0.z - lp1.z);

        this.__doubleToTwoFloats(first, v_high, v_low);
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;
        vh[k] = v_high.x;
        vl[k++] = v_low.x;
        vh[k] = v_high.y;
        vl[k++] = v_low.y;
        vh[k] = v_high.z;
        vl[k++] = v_low.z;

        if (pathColors) {
            if (hasUniformSegmentColor) {
                color = pathColors as NumberArray4;
            } else if (pathColorsAny[path.length - 1]) {
                color = pathColorsAny[path.length - 1];
            } else if (lastSegmentColor) {
                color = lastSegmentColor;
            }

            const a = color[A] != undefined ? color[A] : 1.0;

            cb[ck] = cb[ck + 4] = cb[ck + 8] = cb[ck + 12] = color[R];
            cb[ck + 1] = cb[ck + 5] = cb[ck + 9] = cb[ck + 13] = color[G];
            cb[ck + 2] = cb[ck + 6] = cb[ck + 10] = cb[ck + 14] = color[B];
            cb[ck + 3] = cb[ck + 7] = cb[ck + 11] = cb[ck + 15] = a;
        }
    }

    public setPointLonLat(lonlat: LonLat, index: number, segmentIndex: number) {
        if (this._renderNode && (this._renderNode as Planet).ellipsoid) {
            let l = this._pathLonLat,
                m = this._pathLonLatMerc;

            l[segmentIndex][index] = lonlat;
            m[segmentIndex][index] = lonlat.forwardMercator();

            this._recalculateExtentFromLonLatPaths();

            this.setPoint3v(
                (this._renderNode as Planet).ellipsoid.lonLatToCartesian(lonlat),
                index,
                segmentIndex,
                true
            );
        } else {
            let path = this._pathLonLat[segmentIndex] as LonLat[];
            path[index].lon = lonlat.lon;
            path[index].lat = lonlat.lat;
            path[index].height = lonlat.height;
        }
    }

    /**
     * Changes cartesian point coordinates of the path
     * @param {Vec3} coordinates - New coordinates
     * @param {number} [index=0] - Path segment index
     * @param {number} [segmentIndex=0] - Index of the point in the path segment
     * @param {boolean} [skipLonLat=false] - Do not update geodetic coordinates
     */
    public setPoint3v(coordinates: Vec3, index: number = 0, segmentIndex: number = 0, skipLonLat: boolean = false) {

        if (this._renderNode) {
            let v_high = new Vec3(),
                v_low = new Vec3();

            let vh = this._verticesHigh,
                vl = this._verticesLow,
                l = this._pathLonLat,
                m = this._pathLonLatMerc,
                k = 0,
                kk = 0;

            kk = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;

            let path = this._path3v[segmentIndex] as Vec3[];

            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;

            let _closedLine = this._closedLine || path.length === 1;

            if (index === 0 || index === 1) {
                let last;
                if (_closedLine) {
                    last = path[path.length - 1];
                } else {
                    last = new Vec3(
                        path[0].x + path[0].x - path[1].x,
                        path[0].y + path[0].y - path[1].y,
                        path[0].z + path[0].z - path[1].z
                    );
                }

                k = kk;

                this.__doubleToTwoFloats(last, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            if (!skipLonLat && (this._renderNode as Planet).ellipsoid) {
                let lonLat = (this._renderNode as Planet).ellipsoid.cartesianToLonLat(coordinates);
                l[segmentIndex][index] = lonLat;
                m[segmentIndex][index] = lonLat.forwardMercator();

                this._recalculateExtentFromLonLatPaths();
            }

            k = kk + index * 12 + 12;

            this.__doubleToTwoFloats(coordinates, v_high, v_low);

            vh[k] = v_high.x;
            vh[k + 1] = v_high.y;
            vh[k + 2] = v_high.z;
            vh[k + 3] = v_high.x;
            vh[k + 4] = v_high.y;
            vh[k + 5] = v_high.z;
            vh[k + 6] = v_high.x;
            vh[k + 7] = v_high.y;
            vh[k + 8] = v_high.z;
            vh[k + 9] = v_high.x;
            vh[k + 10] = v_high.y;
            vh[k + 11] = v_high.z;

            vl[k] = v_low.x;
            vl[k + 1] = v_low.y;
            vl[k + 2] = v_low.z;
            vl[k + 3] = v_low.x;
            vl[k + 4] = v_low.y;
            vl[k + 5] = v_low.z;
            vl[k + 6] = v_low.x;
            vl[k + 7] = v_low.y;
            vl[k + 8] = v_low.z;
            vl[k + 9] = v_low.x;
            vl[k + 10] = v_low.y;
            vl[k + 11] = v_low.z;

            if (index === path.length - 1 || index === path.length - 2) {
                let first;
                if (_closedLine) {
                    first = path[0];
                } else {
                    let l1 = path.length - 1;
                    first = new Vec3(
                        path[l1].x + path[l1].x - path[l1 - 1].x,
                        path[l1].y + path[l1].y - path[l1 - 1].y,
                        path[l1].z + path[l1].z - path[l1 - 1].z
                    );
                }

                k = kk + path.length * 12 + 12;

                this.__doubleToTwoFloats(first, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            this._changedBuffers[VERTICES_BUFFER] = true;
        } else {
            let path = this._path3v[segmentIndex] as Vec3[];
            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;
        }
    }

    protected _resizePathLengths(index: number = 0) {
        this._pathLengths[0] = 0;
        for (let i = index + 1, len = this._path3v.length; i <= len; i++) {
            this._pathLengths[i] = this._pathLengths[i - 1] + this._path3v[i - 1].length;
        }
    }

    protected _rebuildIndexes() {
        const oldIdx = this._indexes as number[];
        const is3vIndexFormat = oldIdx.length > 1 && oldIdx[0] === 0 && oldIdx[1] === 0;

        const newIndexes: number[] = [];
        let index = 0;

        if (is3vIndexFormat) {
            newIndexes.push(0, 0);
        } else {
            newIndexes.push(0);
        }

        for (let j = 0, len = this._path3v.length; j < len; j++) {

            const seg = this._path3v[j];

            if (!seg || seg.length === 0) continue;

            if (j > 0) {
                if (is3vIndexFormat) {
                    newIndexes.push(index, index);
                } else {
                    newIndexes.push(index);
                }
            }

            const startIndex = index;
            for (let i = 0; i < seg.length; i++) {
                newIndexes.push(index++, index++, index++, index++);
            }

            if (this._closedLine) {
                newIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                newIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (j < this._path3v.length - 1 && this._path3v[j + 1].length !== 0) {
                index += 8;
                newIndexes.push(index, index);
            }
        }

        this._indexes = newIndexes;
    }

    /**
     * Remove multiline path segment
     * @param {number} index - Segment index in multiline
     */
    public removePath(index: number) {
        if (index < 0 || index >= this._path3v.length) {
            return;
        }

        const removedLen = this._path3v[index].length;

        this._path3v.splice(index, 1);

        if (this._pathColors && index < this._pathColors.length) {
            this._pathColors.splice(index, 1);
        }

        if (this._pathPickingColors && index < this._pathPickingColors.length) {
            this._pathPickingColors.splice(index, 1);
        }

        if (this._segmentThickness && index < this._segmentThickness.length) {
            this._segmentThickness.splice(index, 1);
        }

        if (this._segmentTexParams && index < this._segmentTexParams.length) {
            this._segmentTexParams.splice(index, 1);
        }

        if (Array.isArray(this._image) && index < this._image.length) {
            this._image.splice(index, 1);
        }

        if (this._pathLonLat && index < this._pathLonLat.length) {
            this._pathLonLat.splice(index, 1);
        }

        if (this._pathLonLatMerc && index < this._pathLonLatMerc.length) {
            this._pathLonLatMerc.splice(index, 1);
        }

        this._pathLengths.length = this._path3v.length + 1;
        this._resizePathLengths(index > 0 ? index - 1 : 0);

        if (!this._renderNode || removedLen === 0) {
            return;
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);
        this._colors = makeArrayTyped(this._colors);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._pathTexParamArr = makeArrayTyped(this._pathTexParamArr);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._orders = makeArrayTyped(this._orders);
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const pointsBefore = this._pathLengths[index];

        const vertexGroupStart = pointsBefore + 2 * index;
        const vertexGroupCount = removedLen + 2;
        const v0 = vertexGroupStart * 12;
        const vN = vertexGroupCount * 12;

        this._verticesHigh = spliceTypedArray(this._verticesHigh as TypedArray, v0, vN);
        this._verticesLow = spliceTypedArray(this._verticesLow as TypedArray, v0, vN);

        const o0 = vertexGroupStart * 4;
        const oN = vertexGroupCount * 4;
        this._orders = spliceTypedArray(this._orders as TypedArray, o0, oN);

        const attrGroupStart = pointsBefore + (index === 0 ? 0 : 2 * index - 1);
        const attrGroupCount = removedLen + (index === 0 ? 1 : 2);

        this._colors = spliceTypedArray(this._colors as TypedArray, attrGroupStart * 16, attrGroupCount * 16);
        this._thicknessArr = spliceTypedArray(this._thicknessArr as TypedArray, attrGroupStart * 4, attrGroupCount * 4);
        this._pathTexParamArr = spliceTypedArray(this._pathTexParamArr as TypedArray, attrGroupStart * 8, attrGroupCount * 8);
        this._texCoordArr = spliceTypedArray(this._texCoordArr as TypedArray, attrGroupStart * 16, attrGroupCount * 16);
        this._pickingColors = spliceTypedArray(this._pickingColors as TypedArray, attrGroupStart * 12, attrGroupCount * 12);

        if (index === 0 && this._path3v.length > 0) {
            this._colors = spliceTypedArray(this._colors as TypedArray, 0, 16);
            this._thicknessArr = spliceTypedArray(this._thicknessArr as TypedArray, 0, 4);
            this._pathTexParamArr = spliceTypedArray(this._pathTexParamArr as TypedArray, 0, 8);
            this._texCoordArr = spliceTypedArray(this._texCoordArr as TypedArray, 0, 16);
            this._pickingColors = spliceTypedArray(this._pickingColors as TypedArray, 0, 12);
        }

        this._rebuildIndexes();

        this._markGeometryBuffersChanged(true);
    }

    public appendPath3v(path3v: SegmentPath3vExt, pathColors?: NumberArray4[]) {
        if (!path3v || path3v.length === 0) return;

        const segIndex = this._path3v.length;
        this._path3v.push(path3v);
        this._pathColors[segIndex] = pathColors && pathColors.length ? pathColors : (this._pathColors[segIndex] || []);
        const segPickingColors = this._pathPickingColors[segIndex] || (this._pathPickingColors[segIndex] = []);

        if (!segPickingColors.length) {
            segPickingColors.push([this._pickingColor[R], this._pickingColor[G], this._pickingColor[B]]);
        }

        this._segmentThickness[segIndex] = this._segmentThickness[segIndex] ?? this._thickness;
        this._resolveSegmentTexParams(segIndex);

        this._pathLengths.length = this._path3v.length + 1;
        this._pathLengths[segIndex + 1] = (this._pathLengths[segIndex] || 0) + path3v.length;

        if (!this._renderNode) {
            return;
        }
        const ellipsoid = (this._renderNode as Planet).ellipsoid;

        this._verticesHigh = makeArray(this._verticesHigh);
        this._verticesLow = makeArray(this._verticesLow);
        this._colors = makeArray(this._colors);
        this._thicknessArr = makeArray(this._thicknessArr);
        this._pathTexParamArr = makeArray(this._pathTexParamArr);
        this._orders = makeArray(this._orders);
        this._indexes = makeArray(this._indexes);
        this._texCoordArr = makeArray(this._texCoordArr);
        this._pickingColors = makeArray(this._pickingColors);

        this._pathLonLat[segIndex] = [];
        this._pathLonLatMerc[segIndex] = [];
        this._path3v[segIndex] = [];

        this.__appendLineDataCore(
            [path3v],
            [this._pathColors[segIndex] || []],
            [segPickingColors],
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            this._texCoordArr as number[],
            ellipsoid || null,
            this._path3v,
            this._pathLonLat,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._pathTexParamArr as number[],
            this._pickingColors as number[],
            F3V,
            segIndex,
            FDETECT,
            false,
            false
        );

        this._markGeometryBuffersChanged(true);
    }

    public appendPathLonLat(pathLonLat: SegmentPathLonLatExt) {

        if (!pathLonLat || pathLonLat.length === 0) return;

        const segIndex = this._pathLonLat.length;

        this._pathLonLat.push(pathLonLat);
        this._pathColors[segIndex] = this._pathColors[segIndex] || [];
        this._segmentThickness[segIndex] = this._segmentThickness[segIndex] ?? this._thickness;
        this._resolveSegmentTexParams(segIndex);
        this._pathPickingColors[segIndex] = this._pathPickingColors[segIndex] || [];

        this._pathLengths.length = segIndex + 2;
        this._pathLengths[segIndex + 1] = (this._pathLengths[segIndex] || 0) + pathLonLat.length;

        if (!this._renderNode) {
            return;
        }

        const ellipsoid = (this._renderNode as Planet).ellipsoid;
        if (!ellipsoid) return;

        this._verticesHigh = makeArray(this._verticesHigh);
        this._verticesLow = makeArray(this._verticesLow);
        this._colors = makeArray(this._colors);
        this._thicknessArr = makeArray(this._thicknessArr);
        this._pathTexParamArr = makeArray(this._pathTexParamArr);
        this._orders = makeArray(this._orders);
        this._indexes = makeArray(this._indexes);
        this._texCoordArr = makeArray(this._texCoordArr);
        this._pickingColors = makeArray(this._pickingColors);

        this._path3v[segIndex] = [];
        this._pathLonLatMerc[segIndex] = [];

        this.__appendLineDataCore(
            [pathLonLat],
            [this._pathColors[segIndex] || []],
            [this._pathPickingColors[segIndex] || []],
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            this._texCoordArr as number[],
            ellipsoid,
            this._path3v,
            this._pathLonLat,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._pathTexParamArr as number[],
            this._pickingColors as number[],
            FLONLAT,
            segIndex,
            FDETECT,
            false,
            false
        );

        this._markGeometryBuffersChanged(true);
    }

    /**
     * Remove point from the path
     * @param {number} index - Point index in a path segment
     * @param {number} [segmentIndex=0] - Segment path index
     */
    public removePoint(index: number, segmentIndex: number = 0) {

        if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
            return;
        }

        const segment = this._path3v[segmentIndex];
        if (!segment || !Number.isInteger(index) || index < 0 || index >= segment.length) {
            return;
        }

        segment.splice(index, 1);

        if (segment.length === 0) {
            this._path3v.splice(segmentIndex, 1);
            if (segmentIndex < this._pathPickingColors.length) {
                this._pathPickingColors.splice(segmentIndex, 1);
            }
            if (segmentIndex < this._segmentThickness.length) {
                this._segmentThickness.splice(segmentIndex, 1);
            }
            if (segmentIndex < this._segmentTexParams.length) {
                this._segmentTexParams.splice(segmentIndex, 1);
            }
        }

        this.setPath3v(([] as SegmentPath3vExt[]).concat(this._path3v));
    }

    /**
     * Insert point coordinates in a path segment
     * @param {Vec3} point3v - Point coordinates
     * @param {number} [index=0] - Index in the path
     * @param {NumberArray4} [color] - Point color
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public insertPoint3v(point3v: Vec3, index: number = 0, color?: NumberArray4, segmentIndex: number = 0) {

        let p = ([] as SegmentPath3vExt[]).concat(this._path3v),
            pp = p[segmentIndex];

        if (pp) {
            let c = ([] as SegmentPathColor[]).concat(this._pathColors);
            pp.splice(index, 0, point3v);
            if (color) {
                let cc = c[segmentIndex];
                if (!cc) {
                    cc = new Array(pp.length);
                }
                cc.splice(index, 0, color);
            }
            this.setPath3v(p, c);
        } else {
            this.addPoint3v(point3v, segmentIndex);
        }
    }

    /**
     * Append new point in the end of the path.
     * @public
     * @param {Vec3} point3v - New point coordinates.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     * @param {NumberArray4} [color] - Point color
     */
    public addPoint3v(point3v: Vec3, segmentIndex: number = 0, color?: NumberArray4) {

        if (segmentIndex < 0) return;

        if (!this._renderNode) {
            while (segmentIndex >= this._path3v.length) {
                this._path3v.push([]);
            }
            this._path3v[segmentIndex].push(point3v);
            if (!this._pathColors[segmentIndex]) {
                this._pathColors[segmentIndex] = [];
            }
            this._pathColors[segmentIndex].push(color || this._defaultColor as NumberArray4);
            this._segmentThickness[segmentIndex] = this._segmentThickness[segmentIndex] || this._thickness;
            this._resolveSegmentTexParams(segmentIndex);
            this._pathLengths.length = this._path3v.length + 1;
            this._resizePathLengths(0);
            return;
        }

        if (segmentIndex >= this._path3v.length) {
            this.appendPath3v([point3v], color ? [color] : undefined);
            return;
        }

        const segIndex = segmentIndex;
        const seg = this._path3v[segIndex] as Vec3[];
        const oldLen = seg.length;
        const pointsBefore = this._pathLengths[segIndex];

        seg.push(point3v);

        const segColors = this._pathColors[segIndex] || (this._pathColors[segIndex] = []);
        segColors.push(color || this._defaultColor as NumberArray4);

        const segPickingColors = this._pathPickingColors[segIndex] || (this._pathPickingColors[segIndex] = []);
        segPickingColors.push([this._pickingColor[R], this._pickingColor[G], this._pickingColor[B]]);

        const ellipsoid = (this._renderNode as Planet).ellipsoid;

        if (ellipsoid) {
            const lonLat = ellipsoid.cartesianToLonLat(point3v);
            this._pathLonLat[segIndex] && this._pathLonLat[segIndex].push(lonLat);
            this._pathLonLatMerc[segIndex] && this._pathLonLatMerc[segIndex].push(lonLat.forwardMercator());

            if (lonLat.lon < this._extent.southWest.lon) this._extent.southWest.lon = lonLat.lon;
            if (lonLat.lat < this._extent.southWest.lat) this._extent.southWest.lat = lonLat.lat;
            if (lonLat.lon > this._extent.northEast.lon) this._extent.northEast.lon = lonLat.lon;
            if (lonLat.lat > this._extent.northEast.lat) this._extent.northEast.lat = lonLat.lat;
        }

        // update pathLengths tail (+1 from segIndex+1)
        for (let i = segIndex + 1, len = this._pathLengths.length; i < len; i++) {
            this._pathLengths[i] += 1;
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);
        this._orders = makeArrayTyped(this._orders);
        this._colors = makeArrayTyped(this._colors);
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        this._pathTexParamArr = makeArrayTyped(this._pathTexParamArr);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const vertexGroupStart = pointsBefore + 2 * segIndex;
        const oldCapGroup = vertexGroupStart + oldLen + 1;
        const insertGroup = oldCapGroup + 1;

        const v_high = new Vec3(), v_low = new Vec3();

        // overwrite old cap with new point
        this.__doubleToTwoFloats(point3v, v_high, v_low);
        const vh = this._verticesHigh;
        const vl = this._verticesLow;
        const vBase = oldCapGroup * 12;

        for (let k = 0; k < 12; k += 3) {
            vh[vBase + k] = v_high.x;
            vh[vBase + k + 1] = v_high.y;
            vh[vBase + k + 2] = v_high.z;
            vl[vBase + k] = v_low.x;
            vl[vBase + k + 1] = v_low.y;
            vl[vBase + k + 2] = v_low.z;
        }

        // compute new cap
        let cap: Vec3;
        if (this._closedLine) {
            cap = seg[0];
        } else {
            const p0 = seg[seg.length - 1];
            const p1 = seg[seg.length - 2] || p0;
            cap = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
        }

        this.__doubleToTwoFloats(cap, v_high, v_low);

        const capBlock = new Float32Array([
            v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z, v_high.x, v_high.y, v_high.z
        ]);

        const capBlockL = new Float32Array([
            v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z, v_low.x, v_low.y, v_low.z
        ]);

        this._verticesHigh = insertTypedArray(this._verticesHigh as Float32Array, insertGroup * 12, capBlock);
        this._verticesLow = insertTypedArray(this._verticesLow as Float32Array, insertGroup * 12, capBlockL);

        const orderBlock = new Float32Array([1, -1, 2, -2]);
        this._orders = insertTypedArray(this._orders as Float32Array, insertGroup * 4, orderBlock);

        // overwrite cap group then insert new cap group
        const attrGroupStart = pointsBefore + (segIndex === 0 ? 0 : 2 * segIndex - 1);
        const oldAttrGroups = oldLen + (segIndex === 0 ? 1 : 2);
        const oldAttrCapGroup = attrGroupStart + oldAttrGroups - 1;
        const insertAttrGroup = oldAttrCapGroup + 1;

        //
        // thickness block
        const thickness = this._segmentThickness[segIndex] ?? this._thickness;
        const tArr = this._thicknessArr as Float32Array;
        const tBase = oldAttrCapGroup * 4;
        tArr[tBase] = tArr[tBase + 1] = tArr[tBase + 2] = tArr[tBase + 3] = thickness;
        this._thicknessArr = insertTypedArray(tArr, insertAttrGroup * 4, new Float32Array([thickness, thickness, thickness, thickness]));

        //
        // texture params block
        const texParams = this._resolveSegmentTexParams(segIndex);
        const tpArr = this._pathTexParamArr as Float32Array;
        const tpBase = oldAttrCapGroup * 8;
        const tpBlock = new Float32Array([
            texParams.texOffset, texParams.strokeSize,
            texParams.texOffset, texParams.strokeSize,
            texParams.texOffset, texParams.strokeSize,
            texParams.texOffset, texParams.strokeSize
        ]);
        tpArr.set(tpBlock, tpBase);
        this._pathTexParamArr = insertTypedArray(tpArr, insertAttrGroup * 8, tpBlock);

        //
        // colors block
        const cArr = this._colors as Float32Array;
        const cBase = oldAttrCapGroup * 16;
        const cc: NumberArray4 = segColors[segColors.length - 1] || this._defaultColor;
        const cr = cc[R], cg = cc[G], cb = cc[B], ca = cc[A] != undefined ? cc[A] : 1.0;

        for (let k = 0; k < 16; k += 4) {
            cArr[cBase + k] = cr;
            cArr[cBase + k + 1] = cg;
            cArr[cBase + k + 2] = cb;
            cArr[cBase + k + 3] = ca;
        }

        const cBlock = new Float32Array([cr, cg, cb, ca, cr, cg, cb, ca, cr, cg, cb, ca, cr, cg, cb, ca]);
        this._colors = insertTypedArray(cArr, insertAttrGroup * 16, cBlock);

        //
        // picking colors block
        const pcArr = this._pickingColors as Float32Array;
        const pcBase = oldAttrCapGroup * 12;
        const pcc: NumberArray3 = segPickingColors[segPickingColors.length - 1] || this._pickingColor;
        const pcr = pcc[R], pcg = pcc[G], pcb = pcc[B];

        for (let k = 0; k < 12; k += 3) {
            pcArr[pcBase + k] = pcr;
            pcArr[pcBase + k + 1] = pcg;
            pcArr[pcBase + k + 2] = pcb;
        }

        const pcBlock = new Float32Array([pcr, pcg, pcb, pcr, pcg, pcb, pcr, pcg, pcb, pcr, pcg, pcb]);
        this._pickingColors = insertTypedArray(pcArr, insertAttrGroup * 12, pcBlock);

        //
        // textures block
        const atlas = this._getAtlasTexCoordsForSegment(segmentIndex);
        const tcArr = this._texCoordArr as Float32Array;
        const tcBase = oldAttrCapGroup * 16;
        let tcBlock: Float32Array;
        if (atlas) {
            const minY = atlas[1], imgHeight = atlas[3] - minY;
            tcBlock = new Float32Array([atlas[4], atlas[5], minY, imgHeight, atlas[2], atlas[3], minY, imgHeight, atlas[8], atlas[9], minY, imgHeight, atlas[0], atlas[1], minY, imgHeight]);
        } else {
            tcBlock = new Float32Array(16);
        }
        tcArr.set(tcBlock, tcBase);
        this._texCoordArr = insertTypedArray(tcArr, insertAttrGroup * 16, tcBlock);

        this._rebuildIndexes();

        this._markGeometryBuffersChanged(true);
    }

    /**
     * Append new geodetic point in the end of the path.
     * @public
     * @param {LonLat} lonLat - New coordinate.
     * @param {number} [segmentIndex=0] - Path segment index, first by default.
     */
    public addPointLonLat(lonLat: LonLat, segmentIndex: number = 0) {
        //
        // TODO: could be optimized
        //
        if (segmentIndex >= this._pathLonLat.length) {
            this._pathLonLat.push([]);
        }
        this._pathLonLat[segmentIndex].push(lonLat);
        this.setPathLonLat(([] as SegmentPathLonLatExt[]).concat(this._pathLonLat));
    }

    /**
     * Clear polyline data.
     * @public
     */
    public clear() {
        this._clearData();
    }

    /**
     * Change path point color
     * @param {NumberArray4} color - New color
     * @param {number} [index=0] - Point index
     * @param {number} [segmentIndex=0] - Path segment index
     */
    public setPointColor(color: NumberArray4, index: number = 0, segmentIndex: number = 0) {
        if (this._renderNode && index < this._path3v[segmentIndex].length) {
            let colors = this._pathColors[segmentIndex];

            if (!colors) {
                if (this._path3v[segmentIndex] && index < this._path3v[segmentIndex].length) {
                    this._pathColors[segmentIndex] = new Array(this._path3v[segmentIndex].length);
                } else {
                    return;
                }
            }

            if (!colors[index]) {
                colors[index] = [color[R], color[G], color[B], color[A] || 1.0];
            } else {
                colors[index][R] = color[R];
                colors[index][G] = color[G];
                colors[index][B] = color[B];
                colors[index][A] = color[A] || 1.0;
            }

            let c = this._colors;

            let k = index * 16 + this._pathLengths[segmentIndex] * 16 + 32 * segmentIndex;

            c[k] = c[k + 4] = c[k + 8] = c[k + 12] = color[R];
            c[k + 1] = c[k + 5] = c[k + 9] = c[k + 13] = color[G];
            c[k + 2] = c[k + 6] = c[k + 10] = c[k + 14] = color[B];
            c[k + 3] = c[k + 7] = c[k + 11] = c[k + 15] = color[A] || 1.0;

            this._changedBuffers[COLORS_BUFFER] = true;
        } else {
            let pathColors = this._pathColors[segmentIndex];
            pathColors[index] = color;
        }
    }

    /**
     * Sets polyline opacity.
     * @public
     * @param {number} opacity - Opacity.
     */
    public setOpacity(opacity: number) {
        this._opacity = opacity;
    }

    /**
     * Gets polyline opacity.
     * @public
     */
    public getOpacity(): number {
        return this._opacity;
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} altitude - ALtitude value.
     */
    public setAltitude(altitude: number) {
        this.altitude = altitude;
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} thickness - Thickness.
     * @param {number} [segmentIndex]
     */
    public setThickness(thickness: number): void;
    public setThickness(thickness: number, segmentIndex: number): void;
    public setThickness(thickness: number, segmentIndex?: number): void {

        const segIndex = segmentIndex !== undefined ? segmentIndex : Math.max(0, this._path3v.length - 1);

        if (this._path3v.length === 0) {
            this._thickness = thickness;
            return;
        }

        if (segIndex < 0 || segIndex >= this._path3v.length) return;

        this._segmentThickness[segIndex] = thickness;

        if (this._renderNode) {

            const groupsBefore = segIndex === 0 ? 0 : (this._pathLengths[segIndex] + 2 * segIndex - 1);
            const groupsCount = this._path3v[segIndex].length + 1 + (segIndex > 0 ? 1 : 0);
            const start = groupsBefore * 4;
            const end = (groupsBefore + groupsCount) * 4;
            const ta = this._thicknessArr;

            for (let i = start; i < end; i++) {
                ta[i] = thickness;
            }

            this._changedBuffers[THICKNESS_BUFFER] = true;
        }
    }

    public setPathTexParams(texOffset: number | undefined, strokeSize: number | undefined, segmentIndex: number): void {
        const texParams = this._resolveSegmentTexParams(segmentIndex);

        if (texOffset !== undefined) {
            texParams.texOffset = texOffset;
        }
        if (strokeSize !== undefined) {
            texParams.strokeSize = strokeSize;
        }

        const resolvedTexOffset = texParams.texOffset;
        const resolvedStrokeSize = texParams.strokeSize;

        if (!this._renderNode || segmentIndex < 0 || segmentIndex >= this._path3v.length) {
            return;
        }

        const groupsBefore = segmentIndex === 0 ? 0 : (this._pathLengths[segmentIndex] + 2 * segmentIndex - 1);
        const groupsCount = this._path3v[segmentIndex].length + 1 + (segmentIndex > 0 ? 1 : 0);
        const start = groupsBefore * 8;
        const end = (groupsBefore + groupsCount) * 8;
        const ta = this._pathTexParamArr;

        for (let i = start; i < end; i += 2) {
            ta[i] = resolvedTexOffset;
            ta[i + 1] = resolvedStrokeSize;
        }

        this._changedBuffers[TEXPARAM_BUFFER] = true;
    }

    public setTexOffset(texOffset: number, segmentIndex: number): void {
        const strokeSize = this._resolveSegmentTexParams(segmentIndex).strokeSize;
        this.setPathTexParams(texOffset, strokeSize, segmentIndex);
    }

    public setPathStrokeSize(strokeSize: number, segmentIndex: number): void {
        const texOffset = this._resolveSegmentTexParams(segmentIndex).texOffset;
        this.setPathTexParams(texOffset, strokeSize, segmentIndex);
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Polyline visibility.
     */
    public setVisibility(visibility: boolean) {
        this.visibility = visibility;
    }

    /**
     * Gets Polyline visibility.
     * @public
     * @return {boolean} Polyline visibility.
     */
    public getVisibility(): boolean {
        return this.visibility;
    }

    /**
     * Assign with render node.
     * @public
     * @param {RenderNode} renderNode -
     */
    public setRenderNode(renderNode: RenderNode) {
        if (renderNode) {
            this._renderNode = renderNode;
            if (this._pathLonLat.length) {
                this._createDataLonLat(([] as SegmentPathLonLatExt[]).concat(this._pathLonLat));
            } else {
                this._createData3v(([] as SegmentPath3vExt[]).concat(this._path3v));
            }
            this._refresh();
            if (renderNode.renderer && renderNode.renderer.isInitialized()) {
                this._update();
            }
        }
    }

    protected _clearData() {
        //@ts-ignore
        this._verticesHigh = null;
        //@ts-ignore
        this._verticesLow = null;
        //@ts-ignore
        this._orders = null;
        //@ts-ignore
        this._indexes = null;
        //@ts-ignore
        this._colors = null;
        //@ts-ignore
        this._thicknessArr = null;
        //@ts-ignore
        this._pathTexParamArr = null;
        //@ts-ignore
        this._texCoordArr = null;
        //@ts-ignore
        this._pickingColors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._pathTexParamArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._path3v.length = 0;
        this._pathLonLat.length = 0;
        this._pathLonLatMerc.length = 0;

        this._path3v = [];
        this._pathLonLat = [];
        this._pathLonLatMerc = [];
    }

    protected _createData3v(path3v: SegmentPath3vExt[]) {
        this._clearData();
        this.__appendLineData3v(
            path3v,
            this._pathColors,
            this._pathPickingColors,
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            (this._renderNode as Planet).ellipsoid,
            this._pathLonLat,
            this._path3v,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._pathTexParamArr as number[],
            this._texCoordArr as number[],
            this._pickingColors as number[]
        );
        this._resizePathLengths(0);
    }

    protected _createDataLonLat(pathLonlat: SegmentPathLonLatExt[]) {
        this._clearData();
        this.__appendLineDataLonLat(
            pathLonlat,
            this._pathColors,
            this._pathPickingColors,
            this._defaultColor as NumberArray4,
            this._closedLine,
            this._verticesHigh as number[],
            this._verticesLow as number[],
            this._orders as number[],
            this._indexes as number[],
            this._texCoordArr as number[],
            (this._renderNode as Planet).ellipsoid,
            this._path3v,
            this._pathLonLat,
            this._pathLonLatMerc,
            this._extent,
            this._colors as number[],
            this._thicknessArr as number[],
            this._pathTexParamArr as number[],
            this._pickingColors as number[]
        );
        this._resizePathLengths(0);
    }

    /**
     * Removes from an entity.
     * @public
     */
    public remove() {
        this._entity = null;

        this._pathColors.length = 0;
        this._pathColors = [];

        this._segmentThickness.length = 0;
        this._segmentThickness = [];

        this._segmentTexParams.length = 0;
        this._segmentTexParams = [];

        //@ts-ignore
        this._verticesHigh = null;
        //@ts-ignore
        this._verticesLow = null;
        //@ts-ignore
        this._orders = null;
        //@ts-ignore
        this._indexes = null;
        //@ts-ignore
        this._colors = null;
        //@ts-ignore
        this._thicknessArr = null;
        //@ts-ignore
        this._pathTexParamArr = null;
        //@ts-ignore
        this._texCoordArr = null;
        //@ts-ignore
        this._pickingColors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];
        this._thicknessArr = [];
        this._pathTexParamArr = [];
        this._texCoordArr = [];
        this._pickingColors = [];

        this._deleteBuffers();

        this._handler && this._handler.remove(this);
    }

    protected _rebuildPickingColorsFromPath() {

        this._pickingColors = [];

        const outPickingColors = this._pickingColors as number[];

        for (let i = 0, len = this._path3v.length; i < len; i++) {
            const segment = this._path3v[i];

            if (!segment || segment.length === 0) continue;

            const segmentPickingColors = this._pathPickingColors[i];

            const p = (segmentPickingColors && segmentPickingColors[0]) ? segmentPickingColors[0] : [
                this._pickingColor[R],
                this._pickingColor[G],
                this._pickingColor[B]
            ];

            const pr = p[R], pg = p[G], pb = p[B];

            if (i > 0) {
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
            }

            for (let j = 0, segmentLen = segment.length; j < segmentLen; j++) {
                outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
            }

            outPickingColors.push(pr, pg, pb, pr, pg, pb, pr, pg, pb, pr, pg, pb);
        }
    }

    public setPickingColor3v(color: Vec3) {
        const r = color.x / 255.0;
        const g = color.y / 255.0;
        const b = color.z / 255.0;

        this._pickingColor[0] = r;
        this._pickingColor[1] = g;
        this._pickingColor[2] = b;

        const segmentsCount = Math.max(this._path3v.length, this._pathLonLat.length);

        for (let i = 0; i < segmentsCount; i++) {
            const segmentPickingColors = this._pathPickingColors[i] || (this._pathPickingColors[i] = []);
            const hasPoints = (this._path3v[i]?.length || this._pathLonLat[i]?.length || 0) > 0;

            if (!hasPoints) continue;

            if (segmentPickingColors.length === 0) {
                segmentPickingColors.push([r, g, b]);
                continue;
            }

            for (let j = 0, len = segmentPickingColors.length; j < len; j++) {
                const p = segmentPickingColors[j];
                if (!p) continue;
                p[R] = r;
                p[G] = g;
                p[B] = b;
            }
        }

        this._rebuildPickingColorsFromPath();

        this._changedBuffers[PICKINGCOLORS_BUFFER] = true;
    }

    /**
     * Returns polyline geodetic extent.
     * @public
     * @returns {Extent} - Geodetic extent
     */
    public getExtent(): Extent {
        return this._extent.clone();
    }

    /**
     * Returns path cartesian coordinates.
     * @return {SegmentPath3vExt[]} Polyline path.
     */
    public getPath3v(): SegmentPath3vExt[] {
        return this._path3v;
    }

    /**
     * Returns geodetic path coordinates.
     * @return {SegmentPathLonLatExt[]} Polyline path.
     */
    public getPathLonLat(): SegmentPathLonLatExt[] {
        return this._pathLonLat;
    }

    public getPathColors(): NumberArray4[][] {
        return this._pathColors;
    }

    public setPathColors(pathColors: SegmentPathColor[]): void;
    public setPathColors(pathColors: SegmentPathColor, segmentIndex: number): void;
    public setPathColors(pathColors: SegmentPathColor[] | SegmentPathColor, segmentIndex?: number) {

        if (!pathColors) return;

        if (segmentIndex === undefined) {

            this._colors = [];
            this._pathColors = ([] as SegmentPathColor[]).concat(pathColors as SegmentPathColor[]);
            const hasLonLatTemplate = this._pathLonLat.length > 0 && this._pathLonLat.some((seg) => seg && seg.length > 0);
            const colorTemplate = (hasLonLatTemplate ? this._pathLonLat : this._path3v) as unknown as SegmentPathLonLatExt[];

            Polyline.setPathColors(
                colorTemplate,
                pathColors as SegmentPathColor[],
                this._defaultColor as NumberArray4,
                this._colors
            );
            this._changedBuffers[COLORS_BUFFER] = true;
            return;
        }

        if (segmentIndex < 0 || segmentIndex >= this._path3v.length) {
            return;
        }

        const segPath = this._path3v[segmentIndex];

        if (!segPath || segPath.length === 0) {
            return;
        }

        const segColorsInput = pathColors as SegmentPathColor;
        const segColors = this._pathColors[segmentIndex] || (this._pathColors[segmentIndex] = new Array(segPath.length));
        const segInputCount = segColorsInput.length;
        const lastInputColor = segInputCount > 0 ? segColorsInput[segInputCount - 1] : undefined;
        let currentColor = this._defaultColor as NumberArray4;

        if (!this._renderNode) {
            for (let i = 0; i < segPath.length; i++) {
                if (segColorsInput[i]) {
                    currentColor = segColorsInput[i];
                } else if (lastInputColor && i >= segInputCount) {
                    currentColor = lastInputColor;
                }
                segColors[i] = currentColor;
            }
            return;
        }

        const groupsBefore = segmentIndex === 0 ? 0 : (this._pathLengths[segmentIndex] + 2 * segmentIndex - 1);
        const start = groupsBefore * 16;
        const c = this._colors as number[];
        let ck = start;

        currentColor = segColorsInput[0] || (this._defaultColor as NumberArray4);
        if (!segColorsInput[0] && lastInputColor) {
            currentColor = lastInputColor;
        }
        if (segmentIndex > 0) {
            const a = currentColor[A] != undefined ? currentColor[A] : 1.0;
            c[ck] = c[ck + 4] = c[ck + 8] = c[ck + 12] = currentColor[R];
            c[ck + 1] = c[ck + 5] = c[ck + 9] = c[ck + 13] = currentColor[G];
            c[ck + 2] = c[ck + 6] = c[ck + 10] = c[ck + 14] = currentColor[B];
            c[ck + 3] = c[ck + 7] = c[ck + 11] = c[ck + 15] = a;
            ck += 16;
        }

        for (let i = 0, len = segPath.length; i < len; i++) {

            if (segColorsInput[i]) {
                currentColor = segColorsInput[i];
            } else if (lastInputColor && i >= segInputCount) {
                currentColor = lastInputColor;
            }

            segColors[i] = currentColor;

            const a = currentColor[A] != undefined ? currentColor[A] : 1.0;

            c[ck] = c[ck + 4] = c[ck + 8] = c[ck + 12] = currentColor[R];
            c[ck + 1] = c[ck + 5] = c[ck + 9] = c[ck + 13] = currentColor[G];
            c[ck + 2] = c[ck + 6] = c[ck + 10] = c[ck + 14] = currentColor[B];
            c[ck + 3] = c[ck + 7] = c[ck + 11] = c[ck + 15] = a;

            ck += 16;
        }

        currentColor = segColorsInput[segPath.length - 1] || lastInputColor || currentColor;

        const a = currentColor[A] != undefined ? currentColor[A] : 1.0;

        c[ck] = c[ck + 4] = c[ck + 8] = c[ck + 12] = currentColor[R];
        c[ck + 1] = c[ck + 5] = c[ck + 9] = c[ck + 13] = currentColor[G];
        c[ck + 2] = c[ck + 6] = c[ck + 10] = c[ck + 14] = currentColor[B];
        c[ck + 3] = c[ck + 7] = c[ck + 11] = c[ck + 15] = a;

        this._changedBuffers[COLORS_BUFFER] = true;
    }

    /**
     * Sets polyline color
     * @param {string} htmlColor - HTML color.
     */
    public setColorHTML(htmlColor: string) {

        this._defaultColor = htmlColorToFloat32Array(htmlColor);

        let color = htmlColorToRgba(htmlColor),
            p = this._pathColors;

        for (let i = 0, len = p.length; i < len; i++) {
            let s = p[i];
            for (let j = 0, slen = s.length; j < slen; j++) {
                s[j][0] = color.x;
                s[j][1] = color.y;
                s[j][2] = color.z;
                s[j][3] = color.w;
            }
        }

        let c = this._colors;
        for (let i = 0, len = c.length; i < len; i += 4) {
            c[i] = color.x;
            c[i + 1] = color.y;
            c[i + 2] = color.z;
            c[i + 3] = color.w;
        }

        this._changedBuffers[COLORS_BUFFER] = true;
    }

    public setPathLonLatFast(pathLonLat: SegmentPathLonLatExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {

        if (!pathColors) {
            this.setPathLonLat(pathLonLat, undefined, true);
            return;
        }

        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalizedPathColors = isSingleColor
            ? [pathColors as NumberArray4]
            : pathColors as (SegmentPathColor | NumberArray4)[];

        this.setPathLonLat(pathLonLat, normalizedPathColors, true);
    }

    public setPath3vFast(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {

        if (!pathColors) {
            this.setPath3v(path3v, undefined, true);
            return;
        }

        const isSingleColor = Array.isArray(pathColors) && pathColors.length > 0 && typeof pathColors[0] === "number";
        const normalizedPathColors = isSingleColor
            ? [pathColors as NumberArray4]
            : pathColors as (SegmentPathColor | NumberArray4)[];

        this.setPath3v(path3v, normalizedPathColors, true);
    }

    protected _applyPathColorsFromInput(pathInput: SegmentPath3vExt[] | SegmentPathLonLatExt[], colorsInput: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4) {
        const hasUniformPathColor = Array.isArray(colorsInput) && colorsInput.length > 0 && typeof colorsInput[0] === "number";
        this._pathColors = new Array(pathInput.length);

        for (let j = 0, len = pathInput.length; j < len; j++) {

            const segmentColorInput: SegmentPathColor | NumberArray4 | undefined = hasUniformPathColor
                ? colorsInput as NumberArray4
                : (colorsInput as (SegmentPathColor | NumberArray4)[])[j];

            const hasUniformSegmentColor = !!segmentColorInput && Array.isArray(segmentColorInput) && segmentColorInput.length > 0 && typeof segmentColorInput[0] === "number";

            const segmentColorCount = !hasUniformSegmentColor && segmentColorInput && Array.isArray(segmentColorInput)
                ? (segmentColorInput as SegmentPathColor).length
                : 0;

            const lastSegmentColor = segmentColorCount > 0 ? (segmentColorInput as SegmentPathColor)[segmentColorCount - 1] : undefined;
            const outSegmentColors = new Array(pathInput[j].length);

            let color = this._defaultColor as NumberArray4;

            for (let i = 0, plen = pathInput[j].length; i < plen; i++) {

                if (hasUniformSegmentColor) {
                    color = segmentColorInput as NumberArray4;
                } else if (segmentColorInput && (segmentColorInput as SegmentPathColor)[i]) {
                    color = (segmentColorInput as SegmentPathColor)[i];
                } else if (lastSegmentColor && i >= segmentColorCount) {
                    color = lastSegmentColor;
                }

                outSegmentColors[i] = color;
            }

            this._pathColors[j] = outSegmentColors;
        }
    }

    public getSize(index: number = 0): number {
        return this._path3v[index].length;
    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {SegmentPath3vExt[]} path3v - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {SegmentPathColor[]} [pathColors] - Polyline path cartesian coordinates. (exactly 3 entries)
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    public setPath3v(path3v: SegmentPath3vExt[], pathColors?: (SegmentPathColor | NumberArray4)[], forceEqual?: boolean): void;
    public setPath3v(path3v: SegmentPath3vExt, pathColors?: SegmentPathColor | NumberArray4, forceEqual?: boolean, segmentIndex?: number): void;
    public setPath3v(path3v: SegmentPath3vExt[] | SegmentPath3vExt, pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4, forceEqual: boolean = false, segmentIndex?: number) {

        if (this._renderNode) {

            if (forceEqual) {

                if (segmentIndex !== undefined) {
                    const segmentPath = path3v as SegmentPath3vExt;
                    this._applyForceEqualSegmentUpdate(
                        segmentPath,
                        segmentIndex,
                        pathColors as SegmentPathColor | NumberArray4,
                        this._path3v as SegmentPath3vExt[],
                        (p, idx, c) => this._setSegmentEqualPath3v(p, idx, c),
                        (next) => this._createData3v(next),
                        true
                    );
                    return;
                } else {
                    this._setEqualPath3v(path3v as SegmentPath3vExt[], pathColors as (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4);
                }

                this._changedBuffers[VERTICES_BUFFER] = true;
                if (pathColors) {
                    this._changedBuffers[COLORS_BUFFER] = true;
                }

            } else {

                if (pathColors) {
                    this._applyPathColorsFromInput(path3v as SegmentPath3vExt[], pathColors);
                }

                this._createData3v(path3v as SegmentPath3vExt[]);
                this._markGeometryBuffersChanged(true);
            }
        } else {

            if (pathColors) {
                this._applyPathColorsFromInput(path3v as SegmentPath3vExt[], pathColors);
            }

            this._path3v = ([] as SegmentPath3vExt[]).concat(path3v as SegmentPath3vExt[]);
        }
    }

    /**
     * Sets polyline geodetic coordinates.
     * @public
     * @param {SegmentPathLonLat[]} pathLonLat - Polyline path cartesian coordinates.
     * @param {SegmentPathColor[]} pathColors - Polyline path points colors.
     * @param {Boolean} [forceEqual=false] - OPTIMIZATION FLAG: Makes assigning faster for size equal coordinates array.
     */
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[], pathColors?: (SegmentPathColor | NumberArray4)[], forceEqual?: boolean): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt, pathColors?: SegmentPathColor | NumberArray4, forceEqual?: boolean, segmentIndex?: number): void;
    public setPathLonLat(pathLonLat: SegmentPathLonLatExt[] | SegmentPathLonLatExt, pathColors?: (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4, forceEqual: boolean = false, segmentIndex?: number) {

        if (this._renderNode && (this._renderNode as Planet).ellipsoid) {

            if (forceEqual) {
                if (segmentIndex !== undefined) {
                    const segmentPath = pathLonLat as SegmentPathLonLatExt;
                    this._applyForceEqualSegmentUpdate(
                        segmentPath,
                        segmentIndex,
                        pathColors as SegmentPathColor | NumberArray4,
                        this._pathLonLat as SegmentPathLonLatExt[],
                        (p, idx, c) => this._setSegmentEqualLonLat(p, idx, c),
                        (next) => this._createDataLonLat(next),
                        false
                    );
                    return;

                } else {
                    this._setEqualPathLonLat(pathLonLat as SegmentPathLonLat[], pathColors as (SegmentPathColor | NumberArray4)[] | SegmentPathColor | NumberArray4);
                }

                this._changedBuffers[VERTICES_BUFFER] = true;
                if (pathColors) {
                    this._changedBuffers[COLORS_BUFFER] = true;
                }

            } else {

                if (pathColors) {
                    this._applyPathColorsFromInput(pathLonLat as SegmentPathLonLatExt[], pathColors);
                }

                this._createDataLonLat(pathLonLat as SegmentPathLonLatExt[]);
                this._markGeometryBuffersChanged(false);
            }

        } else {
            if (pathColors) {
                this._applyPathColorsFromInput(pathLonLat as SegmentPathLonLatExt[], pathColors);
            }
            this._pathLonLat = ([] as SegmentPathLonLatExt[]).concat(pathLonLat);
        }
    }


    public draw() {
        if (this.visibility && this._path3v.length) {
            this._update();

            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.polylineForward;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            let ec = this._handler!._entityCollection;

            sh.activate();

            gl.disable(gl.CULL_FACE);
            gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera!.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera!.getViewMatrix());

            // gl.uniform4fv(shu.color, [this.color.x, this.color.y, this.color.z, this.color.w * this._handler._entityCollection._fadingOpacity]);

            gl.uniform3fv(shu.rtcEyePositionHigh, this._handler!._rtcEyePositionHigh);
            gl.uniform3fv(shu.rtcEyePositionLow, this._handler!._rtcEyePositionLow);

            gl.uniform4fv(shu.visibleSphere, this._visibleSphere);

            //gl.uniform2fv(shu.uFloatParams, [(rn as Planet)._planetRadius2 || 0.0, r.activeCamera!._tanViewAngle_hradOneByHeight]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas!.width, r.handler.canvas!.height]);
            gl.uniform1f(shu.thicknessScale, 0.5);
            gl.uniform1f(shu.opacity, this._opacity * ec._fadingOpacity);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._colorsBuffer!);
            gl.vertexAttribPointer(sha.color, this._colorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
            gl.vertexAttribPointer(sha.texCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._pathTexParamBuffer!);
            gl.vertexAttribPointer(sha.textureParams, this._pathTexParamBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer!);
            gl.vertexAttribPointer(sha.thickness, this._thicknessBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            let v = this._verticesHighBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer!);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer!.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer!);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

            gl.enable(gl.CULL_FACE);
        }
    }

    public drawPicking() {
        if (this.visibility && this._path3v.length) {
            this._update();
            let rn = this._renderNode!;
            let r = rn.renderer!;
            let sh = r.handler.programs.polyline_picking;
            let p = sh._program;
            let gl = r.handler.gl!,
                sha = p.attributes,
                shu = p.uniforms;

            let ec = this._handler!._entityCollection;

            sh.activate();

            gl.disable(gl.CULL_FACE);

            gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera!.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera!.getViewMatrix());

            gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorsBuffer!);
            gl.vertexAttribPointer(sha.pickingColor, this._pickingColorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.uniform3fv(shu.rtcEyePositionHigh, this._handler!._rtcEyePositionHigh);
            gl.uniform3fv(shu.rtcEyePositionLow, this._handler!._rtcEyePositionLow);

            gl.uniform4fv(shu.visibleSphere, this._visibleSphere);

            gl.uniform2fv(shu.viewport, [r.handler.canvas!.width, r.handler.canvas!.height]);
            gl.uniform1f(shu.thicknessScale, 0.5 * ec.pickingScale[0]);

            let v = this._verticesHighBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer!;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer as WebGLBuffer);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer!.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._thicknessBuffer!);
            gl.vertexAttribPointer(sha.thickness, this._thicknessBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer as WebGLBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

            gl.enable(gl.CULL_FACE);
        }
    }

    /**
     * Refresh buffers.
     * @protected
     */
    protected _refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    /**
     * Updates render buffers.
     * @protected
     */
    protected _update() {
        if (this._renderNode) {
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    /**
     * Clear GL buffers.
     * @public
     */
    public _deleteBuffers() {
        if (this._renderNode) {
            let r = this._renderNode.renderer!,
                gl = r.handler.gl!;

            gl.deleteBuffer(this._verticesHighBuffer!);
            gl.deleteBuffer(this._verticesLowBuffer!);
            gl.deleteBuffer(this._ordersBuffer!);
            gl.deleteBuffer(this._indexesBuffer!);
            gl.deleteBuffer(this._colorsBuffer!);
            gl.deleteBuffer(this._texCoordBuffer!);
            gl.deleteBuffer(this._thicknessBuffer!);
            gl.deleteBuffer(this._pathTexParamBuffer!);
            gl.deleteBuffer(this._pickingColorsBuffer!);

            this._verticesHighBuffer = null;
            this._verticesLowBuffer = null;
            this._ordersBuffer = null;
            this._indexesBuffer = null;
            this._colorsBuffer = null;
            this._texCoordBuffer = null;
            this._thicknessBuffer = null;
            this._pathTexParamBuffer = null;
            this._pickingColorsBuffer = null;
        }
    }

    /**
     * Creates vertices buffers.
     * @protected
     */
    protected _createVerticesBuffer() {
        let h = this._renderNode!.renderer!.handler;

        let numItems = this._verticesHigh.length / 3;

        if (!this._verticesHighBuffer || this._verticesHighBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._verticesHighBuffer!);
            h.gl!.deleteBuffer(this._verticesLowBuffer!);
            this._verticesHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._verticesLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);

        h.setStreamArrayBuffer(this._verticesHighBuffer!, this._verticesHigh as TypedArray);
        h.setStreamArrayBuffer(this._verticesLowBuffer!, this._verticesLow as TypedArray);
    }

    /**
     * Creates gl index and order buffer.
     * @protected
     */
    protected _createIndexBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._ordersBuffer!);
        h.gl!.deleteBuffer(this._indexesBuffer!);

        this._orders = makeArrayTyped(this._orders);
        this._ordersBuffer = h.createArrayBuffer(this._orders as TypedArray, 1, this._orders.length / 2);

        this._indexes = makeArrayTyped(this._indexes, Uint32Array);
        this._indexesBuffer = h.createElementArrayBuffer(this._indexes as TypedArray, 1, this._indexes.length);
    }

    protected _createColorsBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._colors = makeArrayTyped(this._colors);

        const ta = this._colors as TypedArray;
        const numItems = ta.length / 4;
        if (!this._colorsBuffer || this._colorsBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._colorsBuffer!);
            this._colorsBuffer = h.createStreamArrayBuffer(4, numItems);
        }
        h.setStreamArrayBuffer(this._colorsBuffer!, ta);
    }

    protected _createPickingColorsBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._pickingColors = makeArrayTyped(this._pickingColors);

        const ta = this._pickingColors as TypedArray;
        const numItems = ta.length / 3;
        if (!this._pickingColorsBuffer || this._pickingColorsBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._pickingColorsBuffer!);
            this._pickingColorsBuffer = h.createStreamArrayBuffer(3, numItems);
        }
        h.setStreamArrayBuffer(this._pickingColorsBuffer!, ta);
    }

    protected _createThicknessBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._thicknessArr = makeArrayTyped(this._thicknessArr);
        const ta = this._thicknessArr as TypedArray;

        if (!this._thicknessBuffer || this._thicknessBuffer.numItems !== ta.length) {
            h.gl!.deleteBuffer(this._thicknessBuffer!);
            this._thicknessBuffer = h.createStreamArrayBuffer(1, ta.length);
        }

        h.setStreamArrayBuffer(this._thicknessBuffer!, ta);
    }

    protected _createTexParamsBuffer() {
        let h = this._renderNode!.renderer!.handler;
        this._pathTexParamArr = makeArrayTyped(this._pathTexParamArr);
        const ta = this._pathTexParamArr as TypedArray;
        const numItems = ta.length / 2;

        if (!this._pathTexParamBuffer || this._pathTexParamBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._pathTexParamBuffer!);
            this._pathTexParamBuffer = h.createStreamArrayBuffer(2, numItems);
        }

        h.setStreamArrayBuffer(this._pathTexParamBuffer!, ta);
    }

    public _createTexCoordBuffer() {
        let h = this._renderNode!.renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer!);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr as TypedArray, 4, this._texCoordArr.length / 4);
    }

    public setVisibleSphere(p: Vec3, r: number) {
        if (this._handler) {
            this._visibleSphere[0] = p.x - this._handler._relativeCenter.x;
            this._visibleSphere[1] = p.y - this._handler._relativeCenter.y;
            this._visibleSphere[2] = p.z - this._handler._relativeCenter.z;
        }
        this._visibleSphere[3] = r;
    }

    public updateRTCPosition() {
        if (this._handler && this._renderNode) {
            this._visibleSphere[0] = this._visibleSphere[0] - this._handler._relativeCenter.x;
            this._visibleSphere[1] = this._visibleSphere[1] - this._handler._relativeCenter.y;
            this._visibleSphere[2] = this._visibleSphere[2] - this._handler._relativeCenter.z;
            this._setEqualPath3v(this._path3v);
        }
        this._changedBuffers[VERTICES_BUFFER] = true;
    }
}

export {Polyline};
