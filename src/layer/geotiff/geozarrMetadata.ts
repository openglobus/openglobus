import { isLonLatBBox, parseCrsCode } from "./RasterReader";

type Attrs = Record<string, any>;

/**
 * Pyramid level of a GeoZarr multiscales group.
 */
export interface IGeoZarrLevel {
    /** Level path relative to the multiscales group, "" for the group itself. */
    path: string;
    /** Affine transform [a, b, c, d, e, f]: x = a * col + b * row + c, y = d * col + e * row + f. */
    transform?: number[];
    /** Level size [height, width] of the transform. */
    shape?: number[];
    /** CRS of the level, legacy GeoZarr datasets only. */
    crs?: number | string;
}

/**
 * Spatial axes of an array, the other axes are extra dimensions.
 */
export interface IGeoZarrAxes {
    x: number;
    y: number;
}

/**
 * Returns the pyramid levels of a multiscales group in the order they are listed, or one level of the group
 * itself when it has no multiscales.
 *
 * Supported forms:
 * - zarr-conventions `multiscales: { layout: [{ asset, "spatial:transform"?, "spatial:shape"? }] }`;
 * - legacy GeoZarr `multiscales: [{ datasets: [{ path, "spatial:transform"?, "spatial:shape"?, crs? }] }]`.
 */
export function parseMultiscales(attrs: Attrs | undefined): IGeoZarrLevel[] {
    const ms = attrs?.multiscales;

    if (ms && Array.isArray(ms.layout) && ms.layout.length > 0) {
        return ms.layout
            .filter((item: Attrs) => typeof item?.asset === "string")
            .map((item: Attrs) => ({
                path: item.asset,
                transform: toTransform(item["spatial:transform"]),
                shape: toShape(item["spatial:shape"])
            }));
    }

    const datasets = Array.isArray(ms) ? ms[0]?.datasets : undefined;

    if (Array.isArray(datasets) && datasets.length > 0) {
        return datasets
            .filter((item: Attrs) => typeof item?.path === "string")
            .map((item: Attrs) => ({
                path: item.path,
                transform: toTransform(item["spatial:transform"]),
                shape: toShape(item["spatial:shape"]),
                crs: item.crs
            }));
    }

    return [
        { path: "", transform: toTransform(attrs?.["spatial:transform"]), shape: toShape(attrs?.["spatial:shape"]) }
    ];
}

function toShape(s: any): number[] | undefined {
    return Array.isArray(s) && s.length === 2 && s.every((v) => typeof v === "number") ? s : undefined;
}

function toTransform(t: any): number[] | undefined {
    return Array.isArray(t) && t.length >= 6 && t.every((v) => typeof v === "number") ? t : undefined;
}

const Y_NAMES = ["y", "lat", "latitude", "rlat", "northing"];
const X_NAMES = ["x", "lon", "longitude", "rlon", "easting"];

/**
 * Returns the spatial axes of an array: by `spatial:dimensions`, then by the usual axis names, then the last two
 * axes as [..., y, x].
 *
 * @param dimensionNames - Array dimension names, v3 `dimension_names` or v2 `_ARRAY_DIMENSIONS`.
 * @param ndim - Number of the array axes.
 * @param spatialDimensions - `spatial:dimensions` attribute, [y, x].
 */
export function getSpatialAxes(
    dimensionNames: string[] | undefined,
    ndim: number,
    spatialDimensions?: string[]
): IGeoZarrAxes {
    if (ndim < 2) {
        throw new Error(`GeoZarr array has ${ndim} dimensions, at least 2 are expected.`);
    }

    if (dimensionNames && dimensionNames.length === ndim) {
        const names = dimensionNames.map((n) => String(n).toLowerCase());

        if (spatialDimensions && spatialDimensions.length === 2) {
            const y = names.indexOf(String(spatialDimensions[0]).toLowerCase());
            const x = names.indexOf(String(spatialDimensions[1]).toLowerCase());
            if (x !== -1 && y !== -1 && x !== y) {
                return { x, y };
            }
        }

        const y = names.findIndex((n) => Y_NAMES.indexOf(n) !== -1);
        const x = names.findIndex((n) => X_NAMES.indexOf(n) !== -1);
        if (x !== -1 && y !== -1) {
            return { x, y };
        }
    }

    return { y: ndim - 2, x: ndim - 1 };
}

/**
 * Returns the EPSG code of a WKT (1 or 2) string, the authority of the root CRS, which is the last one.
 */
export function parseWktEpsg(wkt: string): number | undefined {
    const re = /(?:AUTHORITY|ID)\[\s*"EPSG"\s*,\s*"?(\d+)"?\s*\]/gi;
    let code: number | undefined;
    let m: RegExpExecArray | null;
    while ((m = re.exec(wkt))) {
        code = parseInt(m[1], 10);
    }
    return code;
}

/**
 * Returns the EPSG code of the GeoZarr `proj:` attributes, or of a CF grid mapping variable.
 */
export function parseCrsAttrs(attrs: Attrs | undefined): number | undefined {
    if (!attrs) return;

    const code = attrs["proj:code"] ?? attrs["proj:epsg"];
    if (code !== undefined && code !== null) {
        const parsed = parseCrsCode(code);
        if (parsed) return parsed;
    }

    const projjson = attrs["proj:projjson"];
    if (projjson?.id?.authority === "EPSG" && projjson.id.code) {
        return Number(projjson.id.code);
    }

    for (const key of ["proj:wkt2", "crs_wkt", "spatial_ref"]) {
        if (typeof attrs[key] === "string") {
            const parsed = parseWktEpsg(attrs[key]);
            if (parsed) return parsed;
        }
    }

    if (attrs.epsg_code !== undefined) {
        return parseCrsCode(attrs.epsg_code);
    }

    return;
}

/**
 * Returns the bounding box [minX, minY, maxX, maxY] of a raster by its affine transform, and whether the rows
 * go to the north.
 */
export function bboxFromTransform(
    transform: number[],
    width: number,
    height: number
): { bbox: [number, number, number, number]; reverseY: boolean } {
    const [a, b, c, d, e, f] = transform;
    const xs = [c, a * width + c, b * height + c, a * width + b * height + c];
    const ys = [f, d * width + f, e * height + f, d * width + e * height + f];
    return {
        bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        reverseY: e > 0
    };
}

/**
 * Returns the bounding box of a raster by its pixel center coordinates: the first and the last of the 1-D x and
 * y coordinates. The pixel edges are half a step further.
 */
export function bboxFromCoordinates(
    x0: number,
    x1: number,
    nx: number,
    y0: number,
    y1: number,
    ny: number
): { bbox: [number, number, number, number]; reverseY: boolean } {
    const hx = nx > 1 ? Math.abs(x1 - x0) / (nx - 1) / 2 : 0;
    const hy = ny > 1 ? Math.abs(y1 - y0) / (ny - 1) / 2 : 0;
    return {
        bbox: [Math.min(x0, x1) - hx, Math.min(y0, y1) - hy, Math.max(x0, x1) + hx, Math.max(y0, y1) + hy],
        reverseY: y1 > y0
    };
}

/**
 * Returns the CRS of a raster when the source has none: lon/lat for a bounding box in degrees, -180..180 or
 * 0..360, Web Mercator otherwise, as the GeoTIFF reader does.
 */
export function fallbackCrs(bbox: [number, number, number, number]): number {
    const [minX, minY, maxX, maxY] = bbox;
    return isLonLatBBox(bbox) ||
        (minX >= -180.5 && maxX <= 360.5 && maxX - minX <= 361 && minY >= -90.5 && maxY <= 90.5)
        ? 4326
        : 3857;
}

/**
 * Returns a number of a fill value attribute: a number, or "NaN"/"Infinity" strings, null when there is none.
 * Base64 encoded values of xarray are not numbers and are skipped.
 */
export function parseFillValue(val: any): number | null {
    if (typeof val === "number") return val;
    if (typeof val === "bigint") return Number(val);
    if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        if (lower === "nan") return NaN;
        if (lower === "infinity") return Infinity;
        if (lower === "-infinity") return -Infinity;
    }
    return null;
}

/**
 * Returns the CF packing of an array, null when the values are stored as they are. EOPF `_eopf_attrs` describe
 * the source product and are not taken.
 */
export function getScaleOffset(attrs: Attrs | undefined): { scale: number; offset: number } | null {
    const scale = typeof attrs?.scale_factor === "number" ? attrs.scale_factor : 1;
    const offset = typeof attrs?.add_offset === "number" ? attrs.add_offset : 0;
    return scale !== 1 || offset !== 0 ? { scale, offset } : null;
}

const TIME_UNITS: Record<string, number> = {
    millisecond: 1,
    milliseconds: 1,
    second: 1000,
    seconds: 1000,
    s: 1000,
    minute: 60000,
    minutes: 60000,
    min: 60000,
    hour: 3600000,
    hours: 3600000,
    h: 3600000,
    day: 86400000,
    days: 86400000,
    d: 86400000
};

const DAY_MS = 86400000;

/**
 * Month lengths of the CF calendars without leap years.
 */
const FIXED_CALENDARS: Record<string, number[]> = {
    noleap: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    "365_day": [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    "360_day": [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
};

const pad = (n: number, size: number = 2) => String(n).padStart(size, "0");

/**
 * Returns the ISO dates of CF time coordinates with units like "days since 1970-01-01", null for other units.
 * The noleap, 365_day and 360_day calendars count their own years, other calendars are Gregorian.
 */
export function decodeCfTime(values: ArrayLike<number>, units: any, calendar?: any): string[] | null {
    if (typeof units !== "string") return null;

    const m = units.trim().match(/^(\w+)\s+since\s+(-?\d+)-(\d+)-(\d+)(?:[ T](\d+):(\d+)(?::(\d+(?:\.\d+)?))?)?/i);
    if (!m) return null;

    const step = TIME_UNITS[m[1].toLowerCase()];
    if (!step) return null;

    const [year, month, day, hour, minute] = [m[2], m[3], m[4], m[5] ?? "0", m[6] ?? "0"].map(Number);
    // A date without a time zone is UTC in CF
    const timeMs = ((hour * 60 + minute) * 60 + Number(m[7] ?? 0)) * 1000;
    const months = FIXED_CALENDARS[String(calendar).toLowerCase()];
    const out: string[] = [];

    if (months) {
        const yearDays = months.reduce((a, b) => a + b, 0);
        const originDay = year * yearDays + months.slice(0, month - 1).reduce((a, b) => a + b, 0) + day - 1;

        for (let i = 0; i < values.length; i++) {
            const ms = originDay * DAY_MS + timeMs + Number(values[i]) * step;
            let days = Math.floor(ms / DAY_MS);
            const dayMs = ms - days * DAY_MS;
            const y = Math.floor(days / yearDays);
            days -= y * yearDays;
            let mo = 0;
            while (days >= months[mo]) days -= months[mo++];
            const t = new Date(dayMs).toISOString().slice(11);
            out.push(`${pad(y, 4)}-${pad(mo + 1)}-${pad(days + 1)}T${t}`);
        }
        return out;
    }

    const origin = new Date(0);
    origin.setUTCFullYear(year, month - 1, day);
    const originMs = origin.getTime() + timeMs;

    for (let i = 0; i < values.length; i++) {
        out.push(new Date(originMs + Number(values[i]) * step).toISOString());
    }
    return out;
}

/**
 * Returns the index of a dimension value: a number is an index, a string is matched to the coordinate labels,
 * as is or as a prefix of an ISO date, then as the nearest number.
 *
 * @throws When the dimension has no such value.
 */
export function resolveDimensionIndex(
    name: string,
    size: number,
    value: number | string,
    values?: (number | string)[]
): number {
    if (typeof value === "number") {
        if (!Number.isInteger(value) || value < 0 || value >= size) {
            throw new Error(`GeoZarr dimension "${name}" index ${value} is out of range 0..${size - 1}.`);
        }
        return value;
    }

    if (values) {
        let i = values.findIndex((v) => String(v) === value);
        if (i === -1) {
            i = values.findIndex((v) => typeof v === "string" && v.startsWith(value));
        }
        if (i !== -1) return i;

        const num = Number(value);
        if (value.trim() !== "" && !Number.isNaN(num) && values.every((v) => typeof v === "number")) {
            let best = -1,
                bestDiff = Infinity;
            for (let k = 0; k < values.length; k++) {
                const diff = Math.abs((values[k] as number) - num);
                if (diff < bestDiff) {
                    best = k;
                    bestDiff = diff;
                }
            }
            if (best !== -1) return best;
        }
    }

    throw new Error(`GeoZarr dimension "${name}" has no value "${value}".`);
}
