import { LonLat } from "../../LonLat";
import * as mercator from "../../mercator";
import { PbfReader } from "./PbfReader";

/**
 * Feature geometry types.
 * https://github.com/mapbox/vector-tile-spec/tree/master/2.1
 */
export const MVT_UNKNOWN = 0;
export const MVT_POINT = 1;
export const MVT_LINESTRING = 2;
export const MVT_POLYGON = 3;

const CMD_MOVE_TO = 1;
const CMD_LINE_TO = 2;
const CMD_CLOSE_PATH = 7;

export type MVTValue = string | number | boolean | null;

export type MVTProperties = Record<string, MVTValue>;

/**
 * Decoded Mapbox Vector Tile. Layers are read when the tile is created,
 * their features only when requested.
 * @class
 * @param {ArrayBuffer | Uint8Array} data - Tile data (pbf).
 */
export class VectorTile {
    /**
     * Tile layers by name.
     * @public
     * @type {Record<string, VectorTileLayer>}
     */
    public layers: Record<string, VectorTileLayer>;

    constructor(data: ArrayBuffer | Uint8Array) {
        this.layers = new PbfReader(data).readFields(readTile, {});
    }
}

function readTile(tag: number, layers: Record<string, VectorTileLayer>, pbf: PbfReader) {
    if (tag === 3) {
        const layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
        if (layer.length) {
            layers[layer.name] = layer;
        }
    }
}

/**
 * Vector tile layer, a named set of features sharing one coordinate extent.
 * @class
 */
export class VectorTileLayer {
    public version: number;

    public name: string;

    /**
     * Tile-local coordinates range, a feature point is inside the tile when 0 <= x,y < extent.
     * @public
     * @type {number}
     */
    public extent: number;

    /**
     * Features count.
     * @public
     * @type {number}
     */
    public length: number;

    public _keys: string[];

    public _values: MVTValue[];

    public _features: number[];

    protected _pbf: PbfReader;

    constructor(pbf: PbfReader, end: number) {
        this.version = 1;
        this.name = "";
        this.extent = 4096;
        this._keys = [];
        this._values = [];
        this._features = [];
        this._pbf = pbf;

        pbf.readFields(readLayer, this, end);

        this.length = this._features.length;
    }

    /**
     * Decodes a feature.
     * @public
     * @param {number} index - Feature index.
     * @returns {VectorTileFeature} -
     */
    public feature(index: number): VectorTileFeature {
        if (index < 0 || index >= this._features.length) {
            throw new Error("Feature index out of bounds");
        }
        const pbf = this._pbf;
        pbf.pos = this._features[index];
        const end = pbf.readVarint() + pbf.pos;
        return new VectorTileFeature(pbf, end, this.extent, this._keys, this._values);
    }
}

function readLayer(tag: number, layer: VectorTileLayer, pbf: PbfReader) {
    if (tag === 15) {
        layer.version = pbf.readVarint();
    } else if (tag === 1) {
        layer.name = pbf.readString();
    } else if (tag === 5) {
        layer.extent = pbf.readVarint();
    } else if (tag === 2) {
        // Keep the position only, readFields skips the message
        layer._features.push(pbf.pos);
    } else if (tag === 3) {
        layer._keys.push(pbf.readString());
    } else if (tag === 4) {
        layer._values.push(pbf.readMessage(readValue, { value: null as MVTValue }).value);
    }
}

function readValue(tag: number, res: { value: MVTValue }, pbf: PbfReader) {
    if (tag === 1) {
        res.value = pbf.readString();
    } else if (tag === 2) {
        res.value = pbf.readFloat();
    } else if (tag === 3) {
        res.value = pbf.readDouble();
    } else if (tag === 4) {
        res.value = pbf.readVarint(true);
    } else if (tag === 5) {
        res.value = pbf.readVarint();
    } else if (tag === 6) {
        res.value = pbf.readSVarint();
    } else if (tag === 7) {
        res.value = pbf.readBoolean();
    }
}

/**
 * Vector tile feature.
 * @class
 */
export class VectorTileFeature {
    public id: number | undefined;

    /**
     * Geometry type: MVT_POINT, MVT_LINESTRING, MVT_POLYGON or MVT_UNKNOWN.
     * @public
     * @type {number}
     */
    public type: number;

    public extent: number;

    /**
     * Key and value indexes of the feature properties, [key0, value0, key1, value1, ...].
     * @public
     * @type {number[]}
     */
    public _tags: number[];

    public _keys: string[];

    public _values: MVTValue[];

    public _geometry: number;

    protected _pbf: PbfReader;

    protected _properties: MVTProperties | null;

    constructor(pbf: PbfReader, end: number, extent: number, keys: string[], values: MVTValue[]) {
        this.id = undefined;
        this.type = MVT_UNKNOWN;
        this.extent = extent;
        this._tags = [];
        this._properties = null;
        this._keys = keys;
        this._values = values;
        this._geometry = -1;
        this._pbf = pbf;

        pbf.readFields(readFeature, this, end);
    }

    /**
     * Feature properties, made on the first access.
     * @public
     * @type {MVTProperties}
     */
    public get properties(): MVTProperties {
        if (!this._properties) {
            const props: MVTProperties = {};
            const tags = this._tags;
            for (let i = 0; i < tags.length; i += 2) {
                props[this._keys[tags[i]]] = this._values[tags[i + 1]];
            }
            this._properties = props;
        }
        return this._properties;
    }

    /**
     * Decodes the feature geometry in tile-local coordinates.
     * Every MoveTo starts a new part, so a multipoint gives one part per point,
     * and a closed polygon ring repeats its first point at the end.
     * @public
     * @returns {number[][]} Parts as flat [x0, y0, x1, y1, ...] arrays.
     */
    public loadGeometry(): number[][] {
        const parts: number[][] = [];

        if (this._geometry < 0) {
            return parts;
        }

        const pbf = this._pbf;
        pbf.pos = this._geometry;

        const end = pbf.readVarint() + pbf.pos;

        let cmd = 0,
            count = 0,
            x = 0,
            y = 0,
            part: number[] | null = null;

        while (pbf.pos < end) {
            if (count === 0) {
                const cmdInt = pbf.readVarint();
                cmd = cmdInt & 0x7;
                count = cmdInt >> 3;

                if (cmd === CMD_CLOSE_PATH) {
                    // Has no parameters, so it may be the last integer of the geometry
                    if (part && part.length) {
                        part.push(part[0], part[1]);
                    }
                    count = 0;
                } else if (cmd !== CMD_MOVE_TO && cmd !== CMD_LINE_TO) {
                    throw new Error(`Unknown vector tile geometry command: ${cmd}`);
                }

                continue;
            }

            count--;

            const dx = pbf.readVarint(),
                dy = pbf.readVarint();
            x += (dx >>> 1) ^ -(dx & 1);
            y += (dy >>> 1) ^ -(dy & 1);

            if (cmd === CMD_MOVE_TO || !part) {
                part = [];
                parts.push(part);
            }

            part.push(x, y);
        }

        return parts;
    }
}

function readFeature(tag: number, feature: VectorTileFeature, pbf: PbfReader) {
    if (tag === 1) {
        feature.id = pbf.readVarint();
    } else if (tag === 2) {
        const end = pbf.readVarint() + pbf.pos;
        while (pbf.pos < end) {
            feature._tags.push(pbf.readVarint());
        }
    } else if (tag === 3) {
        feature.type = pbf.readVarint();
    } else if (tag === 4) {
        // Decoded on demand by loadGeometry
        feature._geometry = pbf.pos;
    }
}

/**
 * Converts tile-local coordinates of a Web Mercator tile to geodetic coordinates.
 * @param {number} px - Tile-local x, from the tile's west edge.
 * @param {number} py - Tile-local y, from the tile's north edge.
 * @param {number} extent - Layer extent.
 * @param {number} tileX - Tile x index.
 * @param {number} tileY - Tile y index.
 * @param {number} tileZoom - Tile zoom.
 * @param {LonLat} [res] - Result object.
 * @returns {LonLat} -
 */
export function tileCoordinatesToLonLat(
    px: number,
    py: number,
    extent: number,
    tileX: number,
    tileY: number,
    tileZoom: number,
    res: LonLat = new LonLat()
): LonLat {
    const size = mercator.POLE2 / Math.pow(2, tileZoom);
    res.lon = mercator.inverse_lon(-mercator.POLE + (tileX + px / extent) * size);
    res.lat = mercator.inverse_lat(mercator.POLE - (tileY + py / extent) * size);
    return res;
}
