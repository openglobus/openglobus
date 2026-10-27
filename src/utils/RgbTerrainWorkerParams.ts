import type { IRgbHeightsParams } from "../terrain/terrainUtils";

const PARAMS_ID = 0,
    PARAMS_SIZE = 1,
    PARAMS_GRID_SIZE = 2,
    PARAMS_LEVELS = 3,
    PARAMS_ENCODING = 4,
    PARAMS_MIN_HEIGHT = 5,
    PARAMS_RESOLUTION = 6,
    PARAMS_HEIGHT_FACTOR = 7,
    PARAMS_PARENT_OFFSET_X = 8,
    PARAMS_PARENT_OFFSET_Y = 9,
    PARAMS_PARENT_ZOOM_DIFF = 10,
    PARAMS_SKIP_POSITIVE_HEIGHTS = 11,
    PARAMS_NO_DATA_HEIGHT = 12,
    PARAMS_NO_DATA_VALUES = 13;

/**
 * Packs height parameters to the buffer for the worker message.
 * @param {number} id - Worker task id.
 * @param {IRgbHeightsParams} p - Heights parameters, parent data is sent separately.
 * @returns {Float64Array} -
 */
export function packRgbHeightsParams(id: number, p: IRgbHeightsParams): Float64Array {
    let d = p.decode,
        ndv = d.noDataValues;
    let params = new Float64Array(PARAMS_NO_DATA_VALUES + ndv.length);

    params[PARAMS_ID] = id;
    params[PARAMS_SIZE] = p.size;
    params[PARAMS_GRID_SIZE] = p.gridSize;
    params[PARAMS_LEVELS] = p.levels;
    params[PARAMS_ENCODING] = d.encoding;
    params[PARAMS_MIN_HEIGHT] = d.minHeight;
    params[PARAMS_RESOLUTION] = d.resolution;
    params[PARAMS_HEIGHT_FACTOR] = d.heightFactor;
    params[PARAMS_PARENT_OFFSET_X] = d.parentOffsetX;
    params[PARAMS_PARENT_OFFSET_Y] = d.parentOffsetY;
    params[PARAMS_PARENT_ZOOM_DIFF] = d.parentZoomDiff;
    params[PARAMS_SKIP_POSITIVE_HEIGHTS] = d.skipPositiveHeights ? 1 : 0;
    params[PARAMS_NO_DATA_HEIGHT] = p.noDataHeight;

    for (let i = 0; i < ndv.length; i++) {
        params[PARAMS_NO_DATA_VALUES + i] = ndv[i];
    }
    return params;
}

/**
 * Unpacks height parameters from the worker message buffer.
 * @param {Float64Array} params - Packed parameters.
 * @param {Float32Array | null} parentData - Parent segment elevations.
 * @returns {Array} - Task id and parameters (exactly 2 entries).
 */
export function unpackRgbHeightsParams(
    params: Float64Array,
    parentData: Float32Array | null
): [number, IRgbHeightsParams] {
    return [
        params[PARAMS_ID],
        {
            decode: {
                encoding: params[PARAMS_ENCODING],
                minHeight: params[PARAMS_MIN_HEIGHT],
                resolution: params[PARAMS_RESOLUTION],
                heightFactor: params[PARAMS_HEIGHT_FACTOR],
                noDataValues: params.subarray(PARAMS_NO_DATA_VALUES),
                parentData: parentData,
                parentOffsetX: params[PARAMS_PARENT_OFFSET_X],
                parentOffsetY: params[PARAMS_PARENT_OFFSET_Y],
                parentZoomDiff: params[PARAMS_PARENT_ZOOM_DIFF],
                skipPositiveHeights: params[PARAMS_SKIP_POSITIVE_HEIGHTS] === 1
            },
            size: params[PARAMS_SIZE],
            gridSize: params[PARAMS_GRID_SIZE],
            levels: params[PARAMS_LEVELS],
            noDataHeight: params[PARAMS_NO_DATA_HEIGHT]
        }
    ];
}
