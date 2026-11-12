import type * as Zarr from "zarrita";
import type { TypedArray } from "geotiff";
import { Extent } from "../../Extent";
import { LonLat } from "../../LonLat";
import { getRasterMinMax } from "./ColorScale";
import { parseCrsCode, RasterReader } from "./RasterReader";
import type { IRasterWindow } from "./RasterReader";
import {
    bboxFromCoordinates,
    bboxFromTransform,
    decodeCfTime,
    fallbackCrs,
    getScaleOffset,
    getSpatialAxes,
    parseCrsAttrs,
    parseFillValue,
    parseMultiscales,
    resolveDimensionIndex
} from "./geozarrMetadata";
import type { IGeoZarrAxes, IGeoZarrLevel } from "./geozarrMetadata";
import type {
    GeoZarrDimensionValue,
    IBandStats,
    IGeoTIFFMetadata,
    IGeoZarrDimension,
    IGeoZarrReaderParams
} from "./types";

type ZarrStore = Zarr.Readable;
type ZarrArray = Zarr.Array<Zarr.DataType, ZarrStore>;
type ZarrLocation = Zarr.Location<ZarrStore>;

let zarr: typeof Zarr;
let zarrLoading: Promise<typeof Zarr> | null = null;

/**
 * Loads zarrita with the first GeoZarr reader, other users of the library do not load its codecs.
 */
function loadZarrita(): Promise<typeof Zarr> {
    return (zarrLoading ??= import("zarrita").then((m) => (zarr = m)));
}

/**
 * Pyramid level, the arrays are the bands, or the one variable.
 */
interface IZarrLevel {
    path: string;
    width: number;
    height: number;
    arrays: ZarrArray[];
}

/**
 * Sample of the reader: an array of the level and the indexes of its extra axes, null on the spatial axes.
 */
interface IZarrSample {
    array: number;
    selection: (number | null)[];
}

/**
 * Memory taken by cached chunk bytes.
 */
const CHUNK_CACHE_BYTES = 64 * Math.pow(1024, 2);

/**
 * Memory taken by decoded chunks. A chunk often holds many entries of an extra dimension, such as the months of
 * a time series, so other entries and the next tiles are read without decoding it again.
 */
const DECODED_CACHE_BYTES = 256 * Math.pow(1024, 2);

/**
 * Largest coordinate array read for the dimension labels.
 */
const MAX_COORDINATE_SIZE = 100000;

/**
 * Longitude error of the tile edges given by the projection, in degrees.
 */
const LON_EPSILON = 1e-6;

/**
 * Side of the window of the coarsest level sampled for the band statistics.
 */
const STATS_WINDOW_SIZE = 256;

/**
 * Byte cache of the store responses, the least recently used ones are dropped over the size limit.
 */
class ByteLruCache {
    protected _map: Map<string, Uint8Array | undefined> = new Map();
    protected _bytes: number = 0;

    constructor(public maxBytes: number) {}

    public has(key: string): boolean {
        return this._map.has(key);
    }

    public get(key: string): Uint8Array | undefined {
        const val = this._map.get(key);
        if (val !== undefined) {
            this._map.delete(key);
            this._map.set(key, val);
        }
        return val;
    }

    public set(key: string, val: Uint8Array | undefined): void {
        this._remove(key);
        this._map.set(key, val);
        this._bytes += val ? val.byteLength : 0;

        for (const k of this._map.keys()) {
            if (this._bytes <= this.maxBytes || k === key) break;
            this._remove(k);
        }
    }

    protected _remove(key: string): void {
        if (this._map.has(key)) {
            this._bytes -= this._map.get(key)?.byteLength ?? 0;
            this._map.delete(key);
        }
    }
}

/**
 * Cache of the decoded chunks of the arrays, the least recently used ones are dropped over the size limit.
 * Concurrent reads of a chunk share one decoding.
 */
class ChunkCache {
    protected _map: Map<string, Zarr.Chunk<Zarr.DataType>> = new Map();
    protected _pending: Map<string, Promise<Zarr.Chunk<Zarr.DataType>>> = new Map();
    protected _bytes: number = 0;
    /** Loads started before the last clear are not stored */
    protected _generation: number = 0;

    constructor(public maxBytes: number) {}

    /**
     * Makes zarr.get() of the array read its chunks through the cache.
     */
    public wrap(array: ZarrArray, id: string): void {
        const getChunk = array.getChunk.bind(array);
        array.getChunk = ((coords: number[], options?: Zarr.GetOptions, opts?: { useSharedArrayBuffer?: boolean }) =>
            this.get(`${id}:${coords.join(",")}`, () => getChunk(coords, options, opts))) as typeof array.getChunk;
    }

    public get(
        key: string,
        load: () => Promise<Zarr.Chunk<Zarr.DataType>>
    ): Promise<Zarr.Chunk<Zarr.DataType>> {
        const chunk = this._map.get(key);
        if (chunk) {
            this._map.delete(key);
            this._map.set(key, chunk);
            return Promise.resolve(chunk);
        }

        let pending = this._pending.get(key);
        if (!pending) {
            const generation = this._generation;
            pending = load().then(
                (chunk) => {
                    if (generation === this._generation) {
                        this._pending.delete(key);
                        this._set(key, chunk);
                    }
                    return chunk;
                },
                (err) => {
                    if (generation === this._generation) {
                        this._pending.delete(key);
                    }
                    throw err;
                }
            );
            this._pending.set(key, pending);
        }
        return pending;
    }

    public clear(): void {
        this._map.clear();
        this._pending.clear();
        this._bytes = 0;
        this._generation++;
    }

    protected _set(key: string, chunk: Zarr.Chunk<Zarr.DataType>): void {
        const size = (chunk.data as ArrayBufferView).byteLength ?? 0;

        // A chunk bigger than a part of the cache would drop all the others
        if (!size || size > this.maxBytes / 4) return;

        this._map.set(key, chunk);
        this._bytes += size;

        for (const [k, c] of this._map) {
            if (this._bytes <= this.maxBytes) break;
            this._bytes -= (c.data as ArrayBufferView).byteLength;
            this._map.delete(k);
        }
    }
}

/**
 * S3 answers 403 for a missing key, zarrita takes 404 as missing, it probes the metadata keys of Zarr v2 and v3.
 */
function fetchMissingAsNotFound(request: Request): Promise<Response> {
    return fetch(request).then((res) => (res.status === 403 ? new Response(null, { status: 404 }) : res));
}

function joinPath(base: string, path?: string): string {
    if (!path) return base;
    return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function toNumbers(data: any): number[] | null {
    if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
        return Array.from(data as ArrayLike<bigint>, Number);
    }
    if (ArrayBuffer.isView(data)) {
        return Array.from(data as unknown as ArrayLike<number>);
    }
    return null;
}

/**
 * Reads a GeoZarr multiscales group (Zarr v2 or v3) into map tiles.
 *
 * A tile reads only the chunks of the pyramid level window it covers. Every band array, or every entry of an
 * extra dimension list of a variable, is a sample of the reader; other extra dimensions, such as time or depth,
 * are set by an index or a coordinate label.
 *
 * @example
 * const reader = new GeoZarrReader({ bands: ["b04", "b03", "b02"] });
 * await reader.init("https://example.com/S2.zarr/measurements/reflectance");
 */
export class GeoZarrReader extends RasterReader {
    declare public options: IGeoZarrReaderParams;

    protected _store: ZarrStore | null = null;
    protected _levels: IZarrLevel[] = [];
    protected _axes: IGeoZarrAxes = { x: 1, y: 0 };
    protected _dimensions: IGeoZarrDimension[] = [];
    protected _dimensionValues: Record<string, GeoZarrDimensionValue> = {};
    protected _samples: IZarrSample[] = [];
    protected _packing: ({ scale: number; offset: number } | null)[] = [];
    protected _fills: (number | null)[] = [];
    protected _wrapLon: boolean = false;
    protected _chunkCache: ChunkCache = new ChunkCache(DECODED_CACHE_BYTES);

    constructor(options: IGeoZarrReaderParams = {}) {
        super(options);
        this._logName = "GeoZarrReader";
        this._dimensionValues = { ...options.dimensions };
    }

    /**
     * Opens the Zarr store and reads the multiscales, the georeference and the dimensions.
     *
     * @param src - Store URL, options.url by default, or a zarrita store.
     */
    public async init(src?: string | ZarrStore): Promise<IGeoTIFFMetadata> {
        const { bands, variable } = this.options;

        if (bands && variable !== undefined) {
            throw new Error("GeoZarr bands and variable options can't be set together.");
        }

        src = src ?? this.options.url;

        if (!src) {
            throw new Error("No GeoZarr store provided.");
        }

        this._destroyed = false;
        this.isReady = false;

        await loadZarrita();

        let location: ZarrLocation;

        if (typeof src === "string") {
            location = await this._openFetchLocation(src);
        } else {
            location = zarr.root(src);
            if (this.options.group) {
                location = location.resolve(this.options.group);
            }
        }

        this._store = location.store;

        let node: ZarrArray | Zarr.Group<ZarrStore>;
        try {
            node = await zarr.open(location);
        } catch (err) {
            if (err instanceof zarr.NotFoundError) {
                const where = typeof src === "string" ? joinPath(src, this.options.group) : location.path;
                throw new Error(`GeoZarr "${where}" is not found or access is denied.`);
            }
            throw err;
        }

        const rootAttrs = node.attrs;
        const levelDefs: IGeoZarrLevel[] = node.kind === "array" ? [{ path: "" }] : parseMultiscales(rootAttrs);

        this._chunkCache.clear();
        this._levels = await this._openLevels(location, levelDefs);
        this._levels.forEach((level, l) => level.arrays.forEach((a, i) => this._chunkCache.wrap(a, `${l}/${i}`)));

        if (this._levels.length === 0) {
            throw new Error("GeoZarr has no pyramid level with the requested arrays.");
        }

        const firstArray = this._levels[0].arrays[0];
        const firstLevelDef = levelDefs.find((l) => l.path === this._levels[0].path)!;

        this._readArrayAttrs();
        await this._readDimensions(location, firstArray);
        this._samples = this._resolveSamples(this._dimensionValues);

        const levelAttrs = await this._openAttrs(location, firstLevelDef.path);
        const { bbox, reverseY } = await this._readBBox(
            location,
            rootAttrs,
            levelAttrs,
            firstLevelDef,
            levelDefs,
            firstArray
        );
        this.reverseY = reverseY;

        const crsCode =
            parseCrsCode(this.options.crs) ??
            parseCrsAttrs(rootAttrs) ??
            parseCrsCode(firstLevelDef.crs) ??
            parseCrsAttrs(levelAttrs) ??
            parseCrsAttrs(firstArray.attrs) ??
            (await this._readGridMappingCrs(location, firstLevelDef.path, firstArray)) ??
            fallbackCrs(bbox);

        await this._setGeoreference(bbox, crsCode);
        this._wrapLongitudes();

        // The fill values are NaN after the decoding, a user value is compared with the unpacked values
        const userNoData = this._getUserNoData();
        const noData = userNoData !== undefined ? userNoData : this._fills.some((f) => f !== null) ? NaN : null;

        this.metadata = {
            bbox: this.nativeBBox,
            crsCode: this.crsCode,
            crsResolved: this.crsResolved,
            width: this._levels[0].width,
            height: this._levels[0].height,
            samplesPerPixel: this._samples.length,
            noData,
            isTiled: true,
            overviewCount: this._levels.length,
            bands: {}
        };

        this.metadata.bands = await this._readBandStats();

        this.isReady = true;
        return this.metadata;
    }

    /**
     * Opens the store of the URL at the group. The consolidated metadata of the group is taken first, then the one
     * of the store root, as xarray writes it; without both every metadata key is read.
     */
    protected async _openFetchLocation(src: string): Promise<ZarrLocation> {
        const { group, storeOptions, useSuffixRequest = true } = this.options;
        const fetchStore = (url: string) =>
            new zarr.FetchStore(url, { overrides: storeOptions, useSuffixRequest, fetch: fetchMissingAsNotFound });
        const withCache = (store: Zarr.AsyncReadable) =>
            zarr.withByteCaching(store, { cache: new ByteLruCache(CHUNK_CACHE_BYTES) }) as ZarrStore;

        const groupStore = fetchStore(joinPath(src, group));
        const store = await zarr.withMaybeConsolidatedMetadata(groupStore);

        // An unconsolidated store comes back as it is
        if (group && store === groupStore) {
            const rootStore = fetchStore(src);
            const root = await zarr.withMaybeConsolidatedMetadata(rootStore);
            if (root !== rootStore) {
                return zarr.root(withCache(root)).resolve(group);
            }
        }

        return zarr.root(withCache(store));
    }

    /**
     * Returns the extra dimensions of the variable, such as time, band or depth.
     */
    public getDimensions(): IGeoZarrDimension[] {
        return this._dimensions.map((d) => ({ ...d }));
    }

    /**
     * Returns the selected index or label of every set extra dimension.
     */
    public getDimensionValues(): Record<string, GeoZarrDimensionValue> {
        return { ...this._dimensionValues };
    }

    /**
     * Selects other entries of the extra dimensions, the not given ones keep their selection. The cached tiles of
     * the reader are not valid after it.
     *
     * @throws For an unknown dimension or value, or when the number of the samples changes.
     */
    public setDimensions(dimensions: Record<string, GeoZarrDimensionValue>): void {
        const values = { ...this._dimensionValues, ...dimensions };
        const samples = this._resolveSamples(values);

        if (this.metadata && samples.length !== this.metadata.samplesPerPixel) {
            throw new Error(
                `GeoZarr dimensions select ${samples.length} samples instead of ${this.metadata.samplesPerPixel}.`
            );
        }

        this._dimensionValues = values;
        this._samples = samples;
    }

    protected _levelCount(): number {
        return this._levels.length;
    }

    protected _levelSize(level: number): [number, number] {
        const l = this._levels[level];
        return [l.width, l.height];
    }

    protected async _readWindow(
        level: number,
        window: [number, number, number, number],
        samples?: number[]
    ): Promise<IRasterWindow> {
        const lvl = this._levels[level];
        const [x0, y0, x1, y1] = window;

        if (x0 < 0 || x1 > lvl.width) {
            return this._readWrappedWindow(level, window, samples);
        }

        const width = x1 - x0;
        const height = y1 - y0;
        const { x, y } = this._axes;
        const indexes = samples ?? this._samples.map((_, i) => i);

        const rasters = await Promise.all(
            indexes.map(async (s) => {
                const sample = this._samples[s];

                if (!sample) {
                    return new Float32Array(width * height).fill(NaN);
                }

                const selection = sample.selection.map((v, axis) =>
                    axis === y ? zarr.slice(y0, y1) : axis === x ? zarr.slice(x0, x1) : v
                );
                const chunk = await zarr.get(lvl.arrays[sample.array], selection);

                return this._decode(chunk.data, width, height, sample.array);
            })
        );

        return { rasters };
    }

    /**
     * Reads a window that goes past the sides of a raster wrapping around in x: its columns there are read from
     * the other side, and the parts are joined row by row.
     */
    protected async _readWrappedWindow(
        level: number,
        window: [number, number, number, number],
        samples?: number[]
    ): Promise<IRasterWindow> {
        const width = this._levels[level].width;
        const [x0, y0, x1, y1] = window;
        const height = y1 - y0;
        const parts: { x: number; read: Promise<IRasterWindow> }[] = [];

        // Columns of the window in runs that do not cross the image sides
        for (let x = x0; x < x1; ) {
            const col = ((x % width) + width) % width;
            const run = Math.min(x1 - x, width - col);
            parts.push({ x: x - x0, read: this._readWindow(level, [col, y0, col + run, y1], samples) });
            x += run;
        }

        const reads = await Promise.all(parts.map((p) => p.read));
        const winWidth = x1 - x0;

        const rasters = reads[0].rasters.map((first, s) => {
            const out = new (first.constructor as any)(winWidth * height) as TypedArray;
            reads.forEach((read, k) => {
                const src = read.rasters[s];
                const runWidth = src.length / height;
                for (let r = 0; r < height; r++) {
                    out.set(src.subarray(r * runWidth, (r + 1) * runWidth), r * winWidth + parts[k].x);
                }
            });
            return out;
        });

        return { rasters };
    }

    /**
     * Returns the window values as rows of the y axis, unpacked and with NaN in place of the fill value.
     */
    protected _decode(data: any, width: number, height: number, arrayIndex: number): TypedArray {
        let values: TypedArray =
            data instanceof BigInt64Array || data instanceof BigUint64Array
                ? Float64Array.from(data as ArrayLike<bigint>, Number)
                : data;

        // The array stores x before y
        if (this._axes.x < this._axes.y) {
            const t = new (values.constructor as any)(width * height);
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    t[r * width + c] = values[c * height + r];
                }
            }
            values = t;
        }

        const packing = this._packing[arrayIndex];
        const fill = this._fills[arrayIndex];
        const maskFill = fill !== null && !Number.isNaN(fill);

        if (!packing && !maskFill) {
            return values;
        }

        const scale = packing ? packing.scale : 1;
        const offset = packing ? packing.offset : 0;
        const out = new Float32Array(values.length);

        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            out[i] = maskFill && v === fill ? NaN : v * scale + offset;
        }

        return out;
    }

    /**
     * Opens the arrays of every pyramid level, a level without one of them is skipped. Levels go from the finest.
     */
    protected async _openLevels(location: ZarrLocation, levelDefs: IGeoZarrLevel[]): Promise<IZarrLevel[]> {
        const { bands, variable } = this.options;

        const opened = await Promise.all(
            levelDefs.map(async (def): Promise<IZarrLevel | null> => {
                const levelLoc = def.path ? location.resolve(def.path) : location;
                const names = bands ?? [variable ?? ""];

                try {
                    const arrays = await Promise.all(
                        names.map((name) => zarr.open(name ? levelLoc.resolve(name) : levelLoc, { kind: "array" }))
                    );
                    return { path: def.path, width: 0, height: 0, arrays };
                } catch (err) {
                    if (!bands && variable === undefined) {
                        throw new Error(
                            `GeoZarr level "${def.path || "/"}" is not an array, set the bands or variable option.`
                        );
                    }
                    console.warn(`[GeoZarrReader] Level "${def.path}" is skipped: ${(err as Error).message}`);
                    return null;
                }
            })
        );

        const levels = opened.filter((l): l is IZarrLevel => l !== null);

        if (levels.length === 0) {
            return levels;
        }

        const first = levels[0].arrays[0];
        this._axes = getSpatialAxes(
            first.dimensionNames,
            first.shape.length,
            first.attrs["spatial:dimensions"] as string[] | undefined
        );

        const { x, y } = this._axes;

        for (const level of levels) {
            level.width = level.arrays[0].shape[x];
            level.height = level.arrays[0].shape[y];
        }

        return levels
            .filter((level) => {
                const ok = level.arrays.every(
                    (a) =>
                        a.shape.length === first.shape.length &&
                        a.shape[x] === level.width &&
                        a.shape[y] === level.height
                );
                if (!ok) {
                    console.warn(`[GeoZarrReader] Level "${level.path}" is skipped: its arrays differ in shape.`);
                }
                return ok;
            })
            .sort((a, b) => b.width - a.width);
    }

    protected async _openAttrs(location: ZarrLocation, path: string): Promise<Record<string, any> | undefined> {
        if (!path) return undefined;
        try {
            return (await zarr.open(location.resolve(path))).attrs;
        } catch {
            return undefined;
        }
    }

    protected async _openArray(locations: ZarrLocation[], name: string): Promise<ZarrArray | null> {
        for (const loc of locations) {
            try {
                return await zarr.open(loc.resolve(name), { kind: "array" });
            } catch {
                //empty
            }
        }
        return null;
    }

    /**
     * Reads the fill value and the CF packing of the arrays of the finest level.
     */
    protected _readArrayAttrs(): void {
        const arrays = this._levels[0].arrays;
        this._packing = arrays.map((a) => getScaleOffset(a.attrs));
        this._fills = arrays.map((a) => {
            const fill = parseFillValue(a.fillValue);
            return fill !== null ? fill : parseFillValue(a.attrs._FillValue ?? a.attrs.missing_value);
        });
    }

    /**
     * Reads the extra dimensions of the first array, with the labels of their coordinate arrays.
     */
    protected async _readDimensions(location: ZarrLocation, array: ZarrArray): Promise<void> {
        const levelPath = this._levels[0].path;
        const locations = levelPath ? [location.resolve(levelPath), location] : [location];
        const names = array.dimensionNames;

        this._dimensions = [];

        for (let axis = 0; axis < array.shape.length; axis++) {
            if (axis === this._axes.x || axis === this._axes.y) continue;

            const dim: IGeoZarrDimension = {
                name: names?.[axis] ?? `dim_${axis}`,
                axisIndex: axis,
                size: array.shape[axis]
            };

            const coord = names?.[axis] ? await this._openArray(locations, names[axis]) : null;

            if (coord && coord.shape.length === 1 && coord.shape[0] === dim.size && dim.size <= MAX_COORDINATE_SIZE) {
                try {
                    const { data } = await zarr.get(coord);
                    const units = coord.attrs.units;
                    const numbers = toNumbers(data);
                    if (numbers) {
                        dim.values = decodeCfTime(numbers, units, coord.attrs.calendar) ?? numbers;
                    } else {
                        dim.values = Array.from(data as Iterable<unknown>, String);
                    }
                    if (typeof units === "string") {
                        dim.units = units;
                    }
                } catch (err) {
                    console.warn(`[GeoZarrReader] Labels of "${dim.name}" are not read: ${(err as Error).message}`);
                }
            }

            this._dimensions.push(dim);
        }
    }

    /**
     * Returns the samples of the selected dimension entries.
     */
    protected _resolveSamples(values: Record<string, GeoZarrDimensionValue>): IZarrSample[] {
        const { x, y } = this._axes;
        const ndim = this._levels[0]?.arrays[0].shape.length ?? 2;
        const selection: (number | null)[] = new Array(ndim).fill(0);
        selection[x] = null;
        selection[y] = null;

        let list: { axis: number; indexes: number[] } | null = null;

        for (const name in values) {
            const dim = this._dimensions.find((d) => d.name === name);
            if (!dim) {
                throw new Error(`GeoZarr has no dimension "${name}".`);
            }

            const value = values[name];

            if (Array.isArray(value)) {
                if (this.options.bands || list) {
                    throw new Error("Only one GeoZarr dimension of a variable may take a list.");
                }
                list = {
                    axis: dim.axisIndex,
                    indexes: value.map((v) => resolveDimensionIndex(name, dim.size, v, dim.values))
                };
            } else {
                selection[dim.axisIndex] = resolveDimensionIndex(name, dim.size, value, dim.values);
            }
        }

        if (this.options.bands) {
            return this.options.bands.map((_, i) => ({ array: i, selection }));
        }

        if (list) {
            const { axis, indexes } = list;
            return indexes.map((index) => {
                const s = selection.slice();
                s[axis] = index;
                return { array: 0, selection: s };
            });
        }

        return [{ array: 0, selection }];
    }

    /**
     * Returns the native bounding box: the multiscales group `spatial:bbox`, then the finest level transform, then
     * its x and y coordinates, then the bbox option.
     */
    protected async _readBBox(
        location: ZarrLocation,
        rootAttrs: Record<string, any>,
        levelAttrs: Record<string, any> | undefined,
        levelDef: IGeoZarrLevel,
        levelDefs: IGeoZarrLevel[],
        array: ZarrArray
    ): Promise<{ bbox: [number, number, number, number]; reverseY: boolean }> {
        const { width, height } = this._levels[0];
        const transform =
            levelDef.transform ??
            levelAttrs?.["spatial:transform"] ??
            rootAttrs["spatial:transform"] ??
            array.attrs["spatial:transform"];
        // A skipped finer level gives the box by its transform and shape
        const sized = levelDefs.find((l) => l.transform && l.shape);
        const fromTransform = Array.isArray(transform)
            ? bboxFromTransform(transform, width, height)
            : sized
              ? bboxFromTransform(sized.transform!, sized.shape![1], sized.shape![0])
              : null;
        const bbox = rootAttrs["spatial:bbox"];

        if (Array.isArray(bbox) && bbox.length === 4) {
            // The row order comes from the transform, or from the y coordinates of a south-up grid
            const reverseY =
                fromTransform?.reverseY ?? (await this._readCoordinateBBox(location, array))?.reverseY ?? false;
            return { bbox: bbox as [number, number, number, number], reverseY };
        }

        if (fromTransform) {
            return fromTransform;
        }

        const fromCoordinates = await this._readCoordinateBBox(location, array);
        if (fromCoordinates) {
            return fromCoordinates;
        }

        if (this.options.bbox) {
            return { bbox: this.options.bbox, reverseY: false };
        }

        throw new Error("GeoZarr has no georeference, set the bbox option.");
    }

    /**
     * Returns the bounding box of the x and y coordinate arrays of the finest level, null without them.
     */
    protected async _readCoordinateBBox(
        location: ZarrLocation,
        array: ZarrArray
    ): Promise<{ bbox: [number, number, number, number]; reverseY: boolean } | null> {
        const names = array.dimensionNames;
        if (!names) return null;

        const { width, height, path } = this._levels[0];
        const locations = path ? [location.resolve(path), location] : [location];
        const xArr = await this._openArray(locations, names[this._axes.x]);
        const yArr = await this._openArray(locations, names[this._axes.y]);

        if (!xArr || !yArr || xArr.shape[0] !== width || yArr.shape[0] !== height) {
            return null;
        }

        const ends = await Promise.all([
            zarr.get(xArr, [0]),
            zarr.get(xArr, [width - 1]),
            zarr.get(yArr, [0]),
            zarr.get(yArr, [height - 1])
        ]);
        const [xa, xb, ya, yb] = ends.map(Number);
        return bboxFromCoordinates(xa, xb, width, ya, yb, height);
    }

    /**
     * Returns the EPSG code of the CF grid mapping variable of the array.
     */
    protected async _readGridMappingCrs(
        location: ZarrLocation,
        levelPath: string,
        array: ZarrArray
    ): Promise<number | undefined> {
        const name = array.attrs.grid_mapping;
        if (typeof name !== "string") return;

        const locations = levelPath ? [location.resolve(levelPath), location] : [location];
        const gridMapping = await this._openArray(locations, name);
        return gridMapping ? parseCrsAttrs(gridMapping.attrs) : undefined;
    }

    /**
     * Longitudes of 0..360 lon/lat rasters: the extent covers the western ones, and tile longitudes are wrapped.
     */
    protected _wrapLongitudes(): void {
        const [minX, minY, maxX, maxY] = this.nativeBBox;

        this._wrapLon = this.crsCode === 4326 && maxX > 180.5;
        this._wrapX = false;

        // A raster around the globe goes on at its sides, the cell centers of 0..360 leave half a cell at each side
        const aroundGlobe = this.crsCode === 4326 && maxX - minX > 360 - 360 / this._levels[0].width / 2;

        if (!this._wrapLon) {
            // Cell centers from -180 leave the last half cell before the antimeridian, it is read from the west side
            if (aroundGlobe && (minX < -180 || maxX < 180)) {
                this._wrapX = true;
                this.extentWgs84 = new Extent(new LonLat(-180, minY), new LonLat(180, maxY));
            }
            return;
        }

        this._wrapX = aroundGlobe;

        this.extentWgs84 =
            minX >= 180
                ? new Extent(new LonLat(minX - 360, minY), new LonLat(maxX - 360, maxY))
                : new Extent(new LonLat(-180, minY), new LonLat(180, maxY));
    }

    protected override _tileLonShift(west: number, east: number): number {
        // A western tile goes to the 180..360 part as a whole, its east edge on the zero meridian, which the
        // projection gives as 0 or a bit more, too. A tile across the zero meridian is cut by its points.
        return this._wrapLon && east <= LON_EPSILON && west < 0 ? 360 : 0;
    }

    protected override _projectToRaster(lon: number, lat: number): [number, number] {
        // Tiles do not cross the zero meridian, so the western ones go to the 180..360 part without a cut inside.
        // A raster around the globe reads the columns past its east edge from its west edge.
        if (this._wrapLon && lon < 0) {
            lon += 360;
        }
        return super._projectToRaster(lon, lat);
    }

    /**
     * Returns the band statistics: CF valid range attributes, or the values of the coarsest level window.
     */
    protected async _readBandStats(): Promise<Record<number, IBandStats>> {
        const bands: Record<number, IBandStats> = {};
        const missing: number[] = [];
        const arrays = this._levels[0].arrays;

        this._samples.forEach((sample, i) => {
            const attrs = arrays[sample.array].attrs;
            const range = Array.isArray(attrs.valid_range) ? attrs.valid_range : [attrs.valid_min, attrs.valid_max];
            const packing = this._packing[sample.array];

            if (typeof range[0] === "number" && typeof range[1] === "number") {
                const scale = packing?.scale ?? 1;
                const offset = packing?.offset ?? 0;
                const a = range[0] * scale + offset;
                const b = range[1] * scale + offset;
                bands[i + 1] = { min: Math.min(a, b), max: Math.max(a, b) };
            } else {
                missing.push(i);
            }
        });

        if (missing.length > 0) {
            const level = this._levels.length - 1;
            const [w, h] = this._levelSize(level);
            const sw = Math.min(w, STATS_WINDOW_SIZE);
            const sh = Math.min(h, STATS_WINDOW_SIZE);
            const x0 = Math.floor((w - sw) / 2);
            const y0 = Math.floor((h - sh) / 2);

            try {
                const { rasters } = await this._readWindow(level, [x0, y0, x0 + sw, y0 + sh], missing);
                missing.forEach((s, k) => {
                    const stats = getRasterMinMax(rasters[k] as any, this.metadata?.noData);
                    bands[s + 1] = Number.isFinite(stats.min) ? stats : { min: 0, max: 255 };
                });
            } catch (err) {
                console.warn(`[GeoZarrReader] Band statistics are not read: ${(err as Error).message}`);
                missing.forEach((s) => (bands[s + 1] = { min: 0, max: 255 }));
            }
        }

        return bands;
    }

    /**
     * Drops the arrays and the decoded chunks once the reader is destroyed and the last read is over.
     */
    protected override _release(): void {
        super._release();
        this._chunkCache.clear();
        this._levels = [];
        this._store = null;
    }
}
