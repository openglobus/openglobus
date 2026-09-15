type TimeZoneRing = number[][];
type TimeZonePolygon = TimeZoneRing[];

/**
 * Zone data — a plain GeoJSON FeatureCollection:
 * - properties.tzid: IANA name ("Europe/Paris", "Etc/GMT+3") — what lookup returns;
 *   the bundled file also carries zone (standard offset, hours), zone_dst and utc_format.
 * - geometry: Polygon or MultiPolygon in lon/lat degrees, first ring outer, rest holes.
 * - non-overlapping, lon within [-180, 180] split at the antimeridian, lat within ±89.9
 *   (the mercator rendering limit; ±90 breaks the triangulation).
 * Bundled res/tz/timezones.geojson: timezone-boundary-builder with oceans, dissolved
 * by the (standard, DST) offset pair.
 */
export interface ITimeZoneFeature {
    properties: { tzid: string };
    geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: TimeZonePolygon | TimeZonePolygon[];
    };
}

export interface ITimeZoneData {
    features: ITimeZoneFeature[];
}

export interface ITimeZoneProviderParams {
    src?: string;
    data?: ITimeZoneData;
}

const DEFAULT_SRC = "/res/tz/timezones.geojson";

interface ITimeZoneItem {
    poly: TimeZonePolygon;
    mnx: number;
    mxx: number;
    mny: number;
    mxy: number;
    tzid: string;
}

function inRing(x: number, y: number, ring: TimeZoneRing): boolean {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
            yi = ring[i][1],
            xj = ring[j][0],
            yj = ring[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            ins = !ins;
        }
    }
    return ins;
}

function inPoly(x: number, y: number, poly: TimeZonePolygon): boolean {
    if (!inRing(x, y, poly[0])) return false;
    for (let k = 1; k < poly.length; k++) {
        if (inRing(x, y, poly[k])) return false;
    }
    return true;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();

/**
 * UTC offset of the zone at the given instant, minutes. DST is applied by the
 * tzdb rules the browser ships, which the zone data deliberately does not carry:
 * the file only stores the standard and summer offsets, not the switch dates.
 * @param {string} tzid - IANA time zone name.
 * @param {Date} date - Instant to read the offset at.
 * @returns {number} -
 */
export function tzOffsetMinutes(tzid: string, date: Date): number {
    let f = fmtCache.get(tzid);

    if (!f) {
        f = new Intl.DateTimeFormat("en-US", {
            timeZone: tzid,
            timeZoneName: "longOffset"
        });
        fmtCache.set(tzid, f);
    }

    const name = f.formatToParts(date).find((p) => p.type === "timeZoneName")!.value;
    const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);

    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/**
 * Time zone lookup over polygon data, made for {@link Sun.timeZoneProvider}.
 * Loads lazily and hides the loading: the first request — a lookup, a load or
 * the sun the provider is assigned to — kicks the single fetch.
 *
 * @example
 * const tz = new TimeZoneProvider({ src: "/res/tz/timezones.geojson" });
 * globe.sun.timeZoneProvider = tz;           // lighting picks the polygons up once loaded
 * tz.load().then(() => drawZones(tz.data));  // the very same single request
 *
 * @param {ITimeZoneProviderParams} [options] - Options:
 * @param {string} [options.src="/res/tz/timezones.geojson"] - GeoJSON url: features with an IANA
 * name in properties.tzid and Polygon or MultiPolygon geometry in degrees.
 * @param {ITimeZoneData} [options.data] - Inline data instead of fetching src.
 */
export class TimeZoneProvider {
    public src: string;

    protected _data: ITimeZoneData | null;
    protected _items: ITimeZoneItem[];
    protected _loading: Promise<this> | null;

    constructor(options: ITimeZoneProviderParams = {}) {
        this.src = options.src || DEFAULT_SRC;
        this._data = null;
        this._items = [];
        this._loading = null;

        if (options.data) {
            this._setData(options.data);
        }
    }

    /**
     * Loaded feature collection, or null before load.
     * @public
     */
    public get data(): ITimeZoneData | null {
        return this._data;
    }

    /**
     * Fetches and indexes the polygons once; repeated calls share the same promise.
     * @public
     * @returns {Promise<TimeZoneProvider>} -
     */
    public load(): Promise<this> {
        if (!this._loading) {
            this._loading = this._data
                ? Promise.resolve(this)
                : fetch(this.src)
                      .then((r) => r.json())
                      .then((data: ITimeZoneData) => {
                          this._setData(data);
                          return this;
                      });
            this._loading.catch((err) => console.warn("TimeZoneProvider: failed to load", this.src, err));
        }
        return this._loading;
    }

    /**
     * IANA zone name of the point, or null outside the data. Called before the
     * data is in place, kicks the load and answers null for now.
     * @public
     * @param {number} lon - Degrees longitude.
     * @param {number} lat - Degrees latitude.
     * @returns {string | null} -
     */
    public lookup(lon: number, lat: number): string | null {
        if (!this._data) {
            this.load();
        }

        for (const it of this._items) {
            if (lon < it.mnx || lon > it.mxx || lat < it.mny || lat > it.mxy) {
                continue;
            }
            if (inPoly(lon, lat, it.poly)) {
                return it.tzid;
            }
        }

        return null;
    }

    protected _setData(data: ITimeZoneData) {
        this._data = data;
        this._items = [];
        for (const f of data.features) {
            const g = f.geometry;
            const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as TimeZonePolygon[];
            for (const poly of polys) {
                let mnx = 1e9,
                    mxx = -1e9,
                    mny = 1e9,
                    mxy = -1e9;
                for (const ring of poly) {
                    for (const p of ring) {
                        if (p[0] < mnx) mnx = p[0];
                        if (p[0] > mxx) mxx = p[0];
                        if (p[1] < mny) mny = p[1];
                        if (p[1] > mxy) mxy = p[1];
                    }
                }
                this._items.push({ poly, mnx, mxx, mny, mxy, tzid: f.properties.tzid });
            }
        }
    }
}
