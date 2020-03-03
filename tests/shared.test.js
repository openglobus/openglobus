'use strict';

import * as shared from '../src/og/utils/shared.js';

test('Test for extractElevationTiles 4 function', () => {

    const SIZE = 4;
    const OUTPUT_SIZE = SIZE / 2;

    function createMockData() {
        let res = new Uint8Array(SIZE * SIZE * 4);
        for (let i = 0, len = res.length; i < len; i += 4) {
            let c = Math.round(i / 4);
            res[i] = c;
            res[i + 1] = c;
            res[i + 2] = c;
            res[i + 3] = 255;
        }
        return res;
    }

    let rgbaData = createMockData();
    let elevationsSize = (OUTPUT_SIZE + 1) * (OUTPUT_SIZE + 1);
    let d = Math.sqrt(rgbaData.length / 4) / OUTPUT_SIZE;

    let outCurrenElevations = new Float32Array(elevationsSize);
    let outChildrenElevations = new Array(d);

    for (let i = 0; i < d; i++) {
        outChildrenElevations[i] = [];
        for (let j = 0; j < d; j++) {
            outChildrenElevations[i][j] = new Float32Array(elevationsSize);
        }
    }

    shared.extractElevationTiles(rgbaData, outCurrenElevations, outChildrenElevations);

    // Current tile
    let currentElevations = new Float32Array([
        0, 1.5, 3,
        6, 7.5, 9,
        12, 13.5, 15]);

    expect(outCurrenElevations).toEqual(currentElevations);

    // Tile y0 x0
    let tileElevations00 = new Float32Array([
        0, 1, 1.5,
        4, 5, 5.5,
        6, 7, 7.5]);

    expect(outChildrenElevations[0][0]).toEqual(tileElevations00);

    // Tile y0 x1
    let tileElevations01 = new Float32Array([
        1.5, 2, 3,
        5.5, 6, 7,
        7.5, 8, 9]);

    expect(outChildrenElevations[0][1]).toEqual(tileElevations01);

    // Tile y1 x0
    let tileElevations10 = new Float32Array([
        6, 7, 7.5,
        8, 9, 9.5,
        12, 13, 13.5]);

    expect(outChildrenElevations[1][0]).toEqual(tileElevations10);

    // Tile y1 x1
    let tileElevations11 = new Float32Array([
        7.5, 8, 9,
        9.5, 10, 11,
        13.5, 14, 15]);

    expect(outChildrenElevations[1][1]).toEqual(tileElevations11);
});