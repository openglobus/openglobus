import { LonLat } from "../../LonLat";
import { MVT_POINT, tileCoordinatesToLonLat, VectorTile } from "./VectorTile";
import type { MVTProperties, MVTValue } from "./VectorTile";

export interface IMVTDecodeRequest {
    z: number;
    x: number;
    y: number;
    /** Source layers to read point features from. */
    pointLayers: string[];
}

/**
 * Point features of a source layer in typed arrays, so they move between threads without copying.
 * Feature i has tags[tagOffsets[i] .. tagOffsets[i + 1]] as [key, value, ...] indexes into keys and values,
 * and points [pointOffsets[i] .. pointOffsets[i + 1]], each point as [lon, lat, u, v] in points,
 * where u, v are the tile-relative position in [0, 1).
 */
export interface IMVTDecodedPointLayer {
    name: string;
    keys: string[];
    /** Only the values the features refer to. */
    values: MVTValue[];
    /** Feature index in the source layer. */
    order: Uint32Array;
    tagOffsets: Uint32Array;
    tags: Uint32Array;
    pointOffsets: Uint32Array;
    points: Float64Array;
}

export interface IMVTDecodedTile {
    pointLayers: IMVTDecodedPointLayer[];
}

/**
 * Decodes the point features of the requested layers. Only points inside the tile are kept,
 * the ones in the tile buffer belong to the neighbour tiles.
 * @param {ArrayBuffer} data - Tile data (pbf).
 * @param {IMVTDecodeRequest} request - Tile index and layers to read.
 * @returns {IMVTDecodedTile} -
 */
export function decodeMVTFeatures(data: ArrayBuffer, request: IMVTDecodeRequest): IMVTDecodedTile {
    const res: IMVTDecodedTile = { pointLayers: [] };

    if (!data.byteLength || !request.pointLayers.length) {
        return res;
    }

    const vt = new VectorTile(data);
    const ll = new LonLat();

    for (let l = 0; l < request.pointLayers.length; l++) {
        const layer = vt.layers[request.pointLayers[l]];

        if (!layer) {
            continue;
        }

        const extent = layer.extent;
        const valueIndexes = new Map<number, number>();
        const values: MVTValue[] = [];
        const order: number[] = [];
        const tagOffsets: number[] = [0];
        const tags: number[] = [];
        const pointOffsets: number[] = [0];
        const points: number[] = [];

        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);

            if (feature.type !== MVT_POINT) {
                continue;
            }

            const start = points.length;
            const parts = feature.loadGeometry();

            for (let j = 0; j < parts.length; j++) {
                const px = parts[j][0],
                    py = parts[j][1];
                if (px >= 0 && py >= 0 && px < extent && py < extent) {
                    tileCoordinatesToLonLat(px, py, extent, request.x, request.y, request.z, ll);
                    points.push(ll.lon, ll.lat, px / extent, py / extent);
                }
            }

            if (points.length === start) {
                continue;
            }

            const t = feature._tags;
            for (let j = 0; j < t.length; j += 2) {
                let v = valueIndexes.get(t[j + 1]);
                if (v === undefined) {
                    v = values.push(layer._values[t[j + 1]]) - 1;
                    valueIndexes.set(t[j + 1], v);
                }
                tags.push(t[j], v);
            }

            order.push(i);
            tagOffsets.push(tags.length);
            pointOffsets.push(points.length / 4);
        }

        if (order.length) {
            res.pointLayers.push({
                name: layer.name,
                keys: layer._keys,
                values,
                order: new Uint32Array(order),
                tagOffsets: new Uint32Array(tagOffsets),
                tags: new Uint32Array(tags),
                pointOffsets: new Uint32Array(pointOffsets),
                points: new Float64Array(points)
            });
        }
    }

    return res;
}

/**
 * Returns the buffers of the decoded tile to transfer between threads.
 * @param {IMVTDecodedTile} tile - Decoded tile.
 * @returns {ArrayBuffer[]} -
 */
export function getMVTDecodedTransferables(tile: IMVTDecodedTile): ArrayBuffer[] {
    const res: ArrayBuffer[] = [];
    for (let i = 0; i < tile.pointLayers.length; i++) {
        const l = tile.pointLayers[i];
        res.push(
            l.order.buffer as ArrayBuffer,
            l.tagOffsets.buffer as ArrayBuffer,
            l.tags.buffer as ArrayBuffer,
            l.pointOffsets.buffer as ArrayBuffer,
            l.points.buffer as ArrayBuffer
        );
    }
    return res;
}

/**
 * Makes the properties object of a decoded feature.
 * @param {IMVTDecodedPointLayer} layer - Decoded layer.
 * @param {number} index - Feature index in the decoded layer.
 * @returns {MVTProperties} -
 */
export function getMVTDecodedProperties(layer: IMVTDecodedPointLayer, index: number): MVTProperties {
    const props: MVTProperties = {};
    const { keys, values, tags } = layer;
    for (let i = layer.tagOffsets[index], end = layer.tagOffsets[index + 1]; i < end; i += 2) {
        props[keys[tags[i]]] = values[tags[i + 1]];
    }
    return props;
}
