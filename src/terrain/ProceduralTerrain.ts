import { createEvents } from "../Events";
import { EmptyTerrain } from "./EmptyTerrain";
import type { IEmptyTerrainParams, ITerrainCacheInfo } from "./EmptyTerrain";
import { TERRAIN_EVENTS } from "./GlobusTerrain";
import type { TerrainEvents } from "./GlobusTerrain";
import {
    createHeightsLevels,
    createHeightsLevelsSource,
    createLevelHeights,
    getGridCells,
    getGroundHeight,
    getSubdivisionLevels,
    TERRAIN_GRID_SIZE_BY_ZOOM
} from "./terrainUtils";
import type { IHeightsLevelsSource } from "./terrainUtils";
import { Extent } from "../Extent";
import { Layer } from "../layer/Layer";
import { LonLat } from "../LonLat";
import { isPowerOfTwo } from "../math";
import { Vec3 } from "../math/Vec3";
import type { Segment } from "../segment/Segment";
import { LRUCache } from "../utils/LRUCache";
import { getRasterWorker, RasterWorker } from "../utils/RasterWorker";
import type { TypedArray } from "../utils/shared";

const _point = new Vec3();

export type ProceduralHeights = number[] | TypedArray | null;

export type GetHeightsFunc = (segment: Segment) => ProceduralHeights | Promise<ProceduralHeights>;

export interface IProceduralTerrainParams extends IEmptyTerrainParams {
    getHeights: GetHeightsFunc;
    plainGridSize?: number;
    noDataValues?: number[];
    nativeCacheSize?: number;
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
 * The function runs in the main thread. Returned heights are reduced in the main thread too and applied right away,
 * promised heights are reduced in a worker when the promise is resolved.
 * @param {number} [options.plainGridSize=32] - Elevation grid size.
 * @param {number} [options.maxNativeZoom=maxZoom] - Last zoom of the height requests. Deeper segments are the
 * subdivision levels of the maxNativeZoom segment heights, as RgbTerrain ones, its pixels keep their heights there.
 * @param {number} [options.nativeCacheSize=50] - Number of maxNativeZoom segments which pixels are kept to make
 * their levels when they are needed. The least recently used are dropped and requested again.
 * @param {Array.<number>} [options.gridSizeByZoom] - Segment grid sizes by zoom, the same as RgbTerrain ones by default.
 * @param {Array.<number>} [options.noDataValues] - Heights of no data.
 *
 * @fires load
 * @fires loadend
 *
 * @example
 * // Heights made right away are reduced in the main thread
 * new ProceduralTerrain("Flat", {
 *     getHeights: (segment) => new Float32Array(129 * 129).fill(100)
 * });
 *
 * // Promised heights are reduced in a worker
 * new ProceduralTerrain("Loaded", {
 *     getHeights: (segment) => loadTilePixels(segment) // Promise<Float32Array>
 * });
 */
class ProceduralTerrain extends EmptyTerrain {
    public events: TerrainEvents;

    protected _loading: number;

    protected _getHeights: GetHeightsFunc;

    protected _heightsCache: Record<string, TileHeights>;

    protected _pendingHeights: Record<string, Promise<TileHeights>>;

    /**
     * Pixels of the maxNativeZoom segments with subdivision levels. A dropped segment drops its heights too,
     * so a deeper segment requests the pixels again.
     */
    protected _levelsSources: LRUCache<string, IHeightsLevelsSource>;

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
        this._loading = 0;
        this._getHeights = options.getHeights;
        this._heightsCache = {};
        this._pendingHeights = {};
        this._levelsSources = new LRUCache(options.nativeCacheSize || 50, (tileIndex) => {
            delete this._heightsCache[tileIndex];
        });
        this._loadendFrame = 0;
    }

    public override clearCache() {
        this._heightsCache = {};
        this._levelsSources.clear();
    }

    public override getCacheInfo(): ITerrainCacheInfo {
        return { tiles: Object.keys(this._heightsCache).length, native: this._levelsSources.size };
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
        if (!this._planet || !segment.plainReady || !segment.terrainIsLoading) {
            return;
        }

        if (this.events.load!.handlers.length) {
            this.events.dispatch(this.events.load!, { elevations: tile.heights, segment: segment });
        }

        segment.applyTerrain(tile.heights);
    }

    protected _checkLoadend = () => {
        if (!this._planet || (this._loading === 0 && this._planet.quadTreeStrategy._terrainCompletedActivated)) {
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
        let z = zoom != undefined ? zoom : this.maxZoom,
            tile = this._getPointTileHeights(lonLat, z, _point),
            x = _point.x,
            y = _point.y;

        const getHeight = (t: TileHeights | null) => (t && t.heights ? getGroundHeight(x, y, t.extent, t.heights) : 0);

        if (tile instanceof Promise) {
            tile.then((t) => {
                if (!t.heights && z > this.maxNativeZoom) {
                    this.getHeightAsync(lonLat, callback, z - 1);
                } else {
                    callback(getHeight(t));
                }
            });
            return false;
        }

        if (!(tile && tile.heights) && z > this.maxNativeZoom) {
            return this.getHeightAsync(lonLat, callback, z - 1);
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

        if (segment.tileZoom > this.maxNativeZoom) {
            return this._getLevelHeights(segment);
        }

        let extent = segment.getExtent(),
            heights = this._getHeights(segment);

        if (!(heights instanceof Promise)) {
            return this._setHeights(segment, extent, this._toGridHeights(segment, heights, null));
        }

        this._loading++;

        // Loaded heights make their grid in the worker, it takes the frame time of the main thread
        return (this._pendingHeights[tileIndex] = heights
            .then((h) => this._toGridHeights(segment, h, getRasterWorker()))
            .then(
                (h) => this._setHeights(segment, extent, h),
                (err) => {
                    console.error(err);
                    return { heights: null, extent: extent };
                }
            )
            .then((tile) => {
                delete this._pendingHeights[tileIndex];
                this._loading--;
                return tile;
            }));
    }

    /**
     * Returns the subdivision level heights of the maxNativeZoom segment, made of its pixels when they are needed.
     * Levels end at the vertex grid, deeper segments have no heights and take the terrain of the level above.
     */
    protected _getLevelHeights(segment: Segment): TileHeights | Promise<TileHeights> {
        let native = this._getNativeSegment(segment),
            nativeHeights = this._getSegmentHeights(native),
            getLevel = () => this._heightsCache[segment.tileIndex] || this._createLevelHeights(segment, native);

        return nativeHeights instanceof Promise ? nativeHeights.then(getLevel) : getLevel();
    }

    protected _createLevelHeights(segment: Segment, native: Segment): TileHeights {
        let source = this._levelsSources.get(native.tileIndex),
            level = segment.tileZoom - native.tileZoom,
            extent = segment.getExtent();

        if (!source || level > source.levels) {
            return {
                heights: null,
                extent: extent
            };
        }

        let d = 1 << level;

        return (this._heightsCache[segment.tileIndex] = {
            heights: createLevelHeights(
                source,
                level,
                segment.tileY - native.tileY * d,
                segment.tileX - native.tileX * d
            ),
            extent: extent
        });
    }

    /**
     * Returns the maxNativeZoom segment of the deeper segment, out of the quad tree for the height requests.
     */
    protected _getNativeSegment(segment: Segment): Segment {
        let n = segment.node;

        if (n) {
            while (n.segment.tileZoom > this.maxNativeZoom) {
                n = n.parentNode!;
            }
            return n.segment;
        }

        let d = 1 << (segment.tileZoom - this.maxNativeZoom),
            e = segment.getExtent(),
            width = e.getWidth(),
            height = e.getHeight(),
            west = e.southWest.lon - (segment.tileX % d) * width,
            north = e.northEast.lat + (segment.tileY % d) * height;

        let native = new (segment.constructor as typeof Segment)(
            null!,
            segment.quadTreeStrategy,
            this.maxNativeZoom,
            new Extent(new LonLat(west, north - d * height), new LonLat(west + d * width, north))
        );

        native._setExtentLonLat();

        return native;
    }

    protected _setHeights(segment: Segment, extent: Extent, heights: ProceduralHeights): TileHeights {
        return (this._heightsCache[segment.tileIndex] = {
            heights: heights,
            extent: extent
        });
    }

    /**
     * Returns the grid heights of the segment, or the promise of them the worker makes. The maxNativeZoom segment
     * with subdivision levels keeps its pixels to make them.
     */
    protected _toGridHeights(segment: Segment, heights: ProceduralHeights, worker: null): ProceduralHeights;
    protected _toGridHeights(
        segment: Segment,
        heights: ProceduralHeights,
        worker: RasterWorker | null
    ): ProceduralHeights | Promise<ProceduralHeights>;
    protected _toGridHeights(
        segment: Segment,
        heights: ProceduralHeights,
        worker: RasterWorker | null
    ): ProceduralHeights | Promise<ProceduralHeights> {
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

        let levels =
            segment.tileZoom === this.maxNativeZoom
                ? getSubdivisionLevels(size, this.plainGridSize, segment.tileZoom, this.maxZoom, this.maxNativeZoom)
                : 0;

        let noDataHeight = this.noDataValues.length ? this.noDataValues[0] : NaN;

        if (worker) {
            if (levels) {
                this._levelsSources.set(
                    segment.tileIndex,
                    createHeightsLevelsSource(size, this.plainGridSize, levels, decodeRow, noDataHeight)
                );
            }

            return worker.heights(new Float32Array(heights), size, this.plainGridSize, levels, noDataHeight);
        }

        if (!levels) {
            return createHeightsLevels(size, this.plainGridSize, 0, decodeRow, noDataHeight);
        }

        let source = createHeightsLevelsSource(size, this.plainGridSize, levels, decodeRow, noDataHeight);

        this._levelsSources.set(segment.tileIndex, source);

        return createLevelHeights(source, 0, 0, 0);
    }
}

export { ProceduralTerrain };
