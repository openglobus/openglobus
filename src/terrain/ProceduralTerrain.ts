import { createEvents } from "../Events";
import { EmptyTerrain } from "./EmptyTerrain";
import type { IEmptyTerrainParams } from "./EmptyTerrain";
import { TERRAIN_EVENTS } from "./GlobusTerrain";
import type { TerrainEvents } from "./GlobusTerrain";
import { createHeightsLevels, getGridCells, getGroundHeight, TERRAIN_GRID_SIZE_BY_ZOOM } from "./terrainUtils";
import { Extent } from "../Extent";
import { Layer } from "../layer/Layer";
import { LonLat } from "../LonLat";
import { isPowerOfTwo } from "../math";
import { Vec3 } from "../math/Vec3";
import type { Segment } from "../segment/Segment";
import type { TypedArray } from "../utils/shared";

const _point = new Vec3();

export type ProceduralHeights = number[] | TypedArray | null;

export type GetHeightsFunc = (segment: Segment) => ProceduralHeights | Promise<ProceduralHeights>;

export interface IProceduralTerrainParams extends IEmptyTerrainParams {
    getHeights: GetHeightsFunc;
    plainGridSize?: number;
    noDataValues?: number[];
}

type TileHeights = {
    heights: ProceduralHeights;
    extent: Extent;
};

/**
 * Terrain with the heights made by a function, without a server.
 * @class
 * @extends {EmptyTerrain}
 * @param {string} [name="ProceduralTerrain"] - Terrain provider name.
 * @param {IProceduralTerrainParams} options - Provider options:
 * @param {GetHeightsFunc} options.getHeights - Returns the segment heights, or a promise of them, rows from north
 * to south, vertices evenly spaced in segment.getExtent(), or null when the segment has no terrain.
 * (plainGridSize + 1)² heights are taken as they are. Larger (2^n + 1)² vertices, or 2^n x 2^n pixels, are reduced
 * to them keeping peaks and pits. Segments of the height requests are not in the quad tree, their node is null.
 * @param {number} [options.plainGridSize=32] - Elevation grid size.
 * @param {Array.<number>} [options.gridSizeByZoom] - Segment grid sizes by zoom, the same as RgbTerrain ones by default.
 * @param {Array.<number>} [options.noDataValues] - Heights of no data.
 *
 * @fires load
 * @fires loadend
 */
class ProceduralTerrain extends EmptyTerrain {
    public events: TerrainEvents;

    /**
     * Height requests counters as GlobusTerrain loader ones: promises in progress, the queue is empty,
     * every request starts right away.
     */
    public loader: { loading: number; queue: Segment[] };

    protected _getHeights: GetHeightsFunc;

    protected _heightsCache: Record<string, TileHeights>;

    protected _pendingHeights: Record<string, Promise<TileHeights>>;

    protected _loadendFrame: number;

    constructor(name: string | null, options: IProceduralTerrainParams) {
        super({
            equalizeVertices: true,
            ...options,
            gridSizeByZoom: options.gridSizeByZoom || TERRAIN_GRID_SIZE_BY_ZOOM.slice(),
            name: name || "ProceduralTerrain"
        });

        this.events = createEvents(TERRAIN_EVENTS, this);
        this.isEmpty = false;
        this.equalizeNormals = true;
        this.plainGridSize = options.plainGridSize || 32;
        this.noDataValues = options.noDataValues || [];
        this.loader = { loading: 0, queue: [] };
        this._getHeights = options.getHeights;
        this._heightsCache = {};
        this._pendingHeights = {};
        this._loadendFrame = 0;
    }

    public override clearCache() {
        this._heightsCache = {};
    }

    public override abortLoading() {
        cancelAnimationFrame(this._loadendFrame);
        this._loadendFrame = 0;
    }

    public override loadTerrain(segment: Segment) {
        if (!this._planet!.terrainLock.isFree()) {
            segment.terrainIsLoading = false;
            return;
        }

        segment.terrainReady = false;
        segment.terrainIsLoading = true;

        let tile = this._getSegmentHeights(segment);

        if (tile instanceof Promise) {
            tile.then((t) => this._applyHeights(segment, t));
        } else {
            this._applyHeights(segment, tile);
        }

        if (!this._loadendFrame && this.events.loadend!.handlers.length) {
            this._loadendFrame = requestAnimationFrame(this._checkLoadend);
        }
    }

    protected _applyHeights(segment: Segment, tile: TileHeights) {
        // The segment is not waiting for the heights any more, or the terrain is not on the planet
        if (!this._planet || !segment.plainReady || !segment.terrainIsLoading) {
            return;
        }

        if (this.events.load!.handlers.length) {
            this.events.dispatch(this.events.load!, { elevations: tile.heights, segment: segment });
        }

        segment.applyTerrain(tile.heights);
    }

    // As GlobusTerrain loader, loadend is when there are no requests and the planet terrain is completed
    protected _checkLoadend = () => {
        if (!this._planet || (this.loader.loading === 0 && this._planet.quadTreeStrategy._terrainCompletedActivated)) {
            this._loadendFrame = 0;
            this.events.dispatch(this.events.loadend!, this);
        } else {
            this._loadendFrame = requestAnimationFrame(this._checkLoadend);
        }
    };

    /**
     * Returns the height under the point from the zoom tile heights, they are made for the request if there are none.
     * Calls back right away and returns true when the heights are ready.
     */
    public override getHeightAsync(lonLat: LonLat, callback: (h: number) => void, zoom?: number): boolean {
        let tile = this._getPointTileHeights(lonLat, zoom != undefined ? zoom : this.maxZoom, _point),
            x = _point.x,
            y = _point.y;

        const getHeight = (t: TileHeights | null) => (t && t.heights ? getGroundHeight(x, y, t.extent, t.heights) : 0);

        if (tile instanceof Promise) {
            tile.then((t) => callback(getHeight(t)));
            return false;
        }

        callback(getHeight(tile));
        return true;
    }

    protected _getPointTileHeights(
        lonLat: LonLat,
        zoom: number,
        outPoint: Vec3
    ): TileHeights | Promise<TileHeights> | null {
        let node = this._planet!.quadTreeStrategy.getNodeByLonLat(lonLat, zoom);

        if (!node) {
            return null;
        }

        let s = node.segment,
            p = s.projectNative(lonLat);

        outPoint.set(p.lon, p.lat, 0);

        if (s.tileZoom === zoom) {
            return this._getSegmentHeights(s);
        }

        let d = 1 << (zoom - s.tileZoom),
            e = s.getExtent(),
            width = e.getWidth() / d,
            height = e.getHeight() / d,
            j = Math.min(Math.max(Math.floor((p.lon - e.southWest.lon) / width), 0), d - 1),
            i = Math.min(Math.max(Math.floor((e.northEast.lat - p.lat) / height), 0), d - 1);

        let tileIndex = Layer.getTileIndex(s.tileX * d + j, s.tileY * d + i, zoom, s._tileGroup),
            cache = this._heightsCache[tileIndex] || this._pendingHeights[tileIndex];

        if (cache) {
            return cache;
        }

        // The segment is out of the quad tree, it has no node
        let segment = new node.SegmentPrototype(
            null!,
            node.quadTreeStrategy,
            zoom,
            new Extent(
                new LonLat(e.southWest.lon + j * width, e.northEast.lat - (i + 1) * height),
                new LonLat(e.southWest.lon + (j + 1) * width, e.northEast.lat - i * height)
            )
        );

        segment._setExtentLonLat();

        return this._getSegmentHeights(segment);
    }

    /**
     * Returns the segment heights, or the promise of them while they are made. Every tile heights are requested once,
     * failed requests are made again next time.
     */
    protected _getSegmentHeights(segment: Segment): TileHeights | Promise<TileHeights> {
        let tileIndex = segment.tileIndex,
            cache = this._heightsCache[tileIndex] || this._pendingHeights[tileIndex];

        if (cache) {
            return cache;
        }

        let extent = segment.getExtent(),
            heights = this._getHeights(segment);

        if (!(heights instanceof Promise)) {
            return this._setHeights(segment, extent, heights);
        }

        this.loader.loading++;

        return (this._pendingHeights[tileIndex] = heights
            .then(
                (h) => this._setHeights(segment, extent, h),
                (err) => {
                    console.error(err);
                    return { heights: null, extent: extent };
                }
            )
            .then((tile) => {
                delete this._pendingHeights[tileIndex];
                this.loader.loading--;
                return tile;
            }));
    }

    protected _setHeights(segment: Segment, extent: Extent, heights: ProceduralHeights): TileHeights {
        return (this._heightsCache[segment.tileIndex] = {
            heights: this._toGridHeights(segment, heights),
            extent: extent
        });
    }

    protected _toGridHeights(segment: Segment, heights: ProceduralHeights): ProceduralHeights {
        if (!heights) {
            return null;
        }

        let size = Math.round(Math.sqrt(heights.length)),
            cells = getGridCells(size);

        if (size * size === heights.length && size === this.plainGridSize + 1) {
            return heights;
        }

        if (size * size !== heights.length || !isPowerOfTwo(cells) || cells < this.plainGridSize) {
            console.warn(
                `ProceduralTerrain: ${heights.length} heights of the segment ${segment.tileIndex}, ` +
                    `(plainGridSize + 1)², larger (2^n + 1)² or 2^n x 2^n are expected`
            );
            return null;
        }

        let decodeRow = (row: number, out: Float32Array) => {
            for (let j = 0, k = row * size; j < size; j++, k++) {
                out[j] = heights[k];
            }
        };

        // Without no data values, NaN keeps real zero heights from being taken for no data
        return createHeightsLevels(
            size,
            this.plainGridSize,
            0,
            decodeRow,
            this.noDataValues.length ? this.noDataValues[0] : NaN
        );
    }
}

export { ProceduralTerrain };
