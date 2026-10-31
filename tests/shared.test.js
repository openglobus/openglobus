import * as shared from '../src/utils/shared';

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

//test('Test for extractElevationTiles same size function', () => {

//    const SIZE = 4;
//    const OUTPUT_SIZE = 4;

//    function createMockData() {
//        let res = new Uint8Array(SIZE * SIZE * 4);
//        for (let i = 0, len = res.length; i < len; i += 4) {
//            let c = Math.round(i / 4);
//            res[i] = c;
//            res[i + 1] = c;
//            res[i + 2] = c;
//            res[i + 3] = 255;
//        }
//        return res;
//    }

//    let rgbaData = createMockData();
//    let elevationsSize = (OUTPUT_SIZE + 1) * (OUTPUT_SIZE + 1);
//    let d = Math.sqrt(rgbaData.length / 4) / OUTPUT_SIZE;

//    let outCurrenElevations = new Float32Array(elevationsSize);
//    let outChildrenElevations = new Array(d);

//    for (let i = 0; i < d; i++) {
//        outChildrenElevations[i] = [];
//        for (let j = 0; j < d; j++) {
//            outChildrenElevations[i][j] = new Float32Array(elevationsSize);
//        }
//    }

//    shared.extractElevationTiles(rgbaData, outCurrenElevations, outChildrenElevations);

//    // Current tile
//    let currentElevations = new Float32Array([
//        0, 1.5, 3,
//        6, 7.5, 9,
//        12, 13.5, 15]);

//    expect(outCurrenElevations).toEqual(currentElevations);
//});

test('Test concatTypedArrays', () => {

    //
    // Second array is typed
    let a = [1, 2, 3, 4, 5, 6],
        b = [7, 8, 9],
        c = a.concat(b);

    let ta = new Uint8Array(a),
        tb = new Uint8Array(b),
        tc = new Uint8Array(c);

    let res = shared.concatTypedArrays(ta, tb);

    expect(res).toEqual(tc);

    //
    // Second array is not typed
    a = [1, 2, 3, 4, 5, 6];
    c = a.concat(b);

    ta = new Uint8Array(a);
    tc = new Uint8Array(c);

    res = shared.concatTypedArrays(ta, b);

    expect(res).toEqual(tc);

});

test('Test appendFloat32Array', () => {
    let arr = new Float32Array(0);
    const expected = [];
    for (let i = 0; i < 100; i++) {
        arr = shared.appendFloat32Array(arr, [i, i + 0.5]);
        expected.push(i, i + 0.5);
        expect(arr.length).toBe(expected.length);
    }
    expect(Array.from(arr)).toEqual(expected);
    expect(arr).toBeInstanceOf(Float32Array);

    // Grows by doubling: a full buffer is copied once, then appends reuse it.
    const full = new Float32Array([1, 2, 3, 4]);
    const grown = shared.appendFloat32Array(full, new Float32Array([5]));
    expect(Array.from(grown)).toEqual([1, 2, 3, 4, 5]);
    expect(grown.buffer).not.toBe(full.buffer);
    expect(grown.buffer.byteLength).toBe(8 * Float32Array.BYTES_PER_ELEMENT);

    const appended = shared.appendFloat32Array(grown, [6, 7]);
    expect(Array.from(appended)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(appended.buffer).toBe(grown.buffer);
    expect(Array.from(grown)).toEqual([1, 2, 3, 4, 5]);

    // A view that ends before its buffer, e.g. after a removal shortened it, keeps working.
    const view = new Float32Array(new ArrayBuffer(32), 8, 2);
    view.set([1, 2]);
    expect(Array.from(shared.appendFloat32Array(view, [3, 4]))).toEqual([1, 2, 3, 4]);
});

test('Test stringTemplate2 replaces escaped placeholders', () => {
    const res = shared.stringTemplate2('a/${x}/\\${operator}/${zero}', {
        x: 12,
        operator: 'TONE_MAPPING_REINHARD_WHITE',
        zero: 0
    });

    expect(res).toBe('a/12/TONE_MAPPING_REINHARD_WHITE/0');
});

test('Test spliceTypedArray', () => {

    const startPos = 0;
    const delCount = 2;

    let a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let ta = new Uint8Array(a);

    let temp = a.splice(startPos, delCount),
        tc = new Uint8Array(a);

    let res = shared.spliceTypedArray(ta, startPos, delCount);

    expect(res).toEqual(tc);
});

test('Test htmlColorToRgba known color name', () => {

    let res = shared.htmlColorToRgba('red');

    expect(res.x).toBe(1);
    expect(res.y).toBe(0);
    expect(res.z).toBe(0);
    expect(res.w).toBe(1);
});

test('Test htmlColorToRgba unknown color name fallback', () => {

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let res = shared.htmlColorToRgba('dark_olive');

    expect(res.x).toBeCloseTo(211 / 255);
    expect(res.y).toBeCloseTo(211 / 255);
    expect(res.z).toBeCloseTo(211 / 255);
    expect(res.w).toBe(1);
    expect(warn).toHaveBeenCalledWith('Invalid or unknown color "dark_olive", using lightgrey as fallback.');

    warn.mockRestore();
});

test('Test htmlColorToRgb unknown color name fallback', () => {

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let res = shared.htmlColorToRgb('dark_olive');

    expect(res.x).toBeCloseTo(211 / 255);
    expect(res.y).toBeCloseTo(211 / 255);
    expect(res.z).toBeCloseTo(211 / 255);
    expect(warn).toHaveBeenCalledWith('Invalid or unknown color "dark_olive", using lightgrey as fallback.');

    warn.mockRestore();
});

test('Test htmlColorToRgba invalid hex fallback', () => {

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let res = shared.htmlColorToRgba('#zzz');

    expect(res.x).toBeCloseTo(211 / 255);
    expect(res.y).toBeCloseTo(211 / 255);
    expect(res.z).toBeCloseTo(211 / 255);
    expect(res.w).toBe(1);
    expect(warn).toHaveBeenCalledWith('Invalid color "#zzz", using lightgrey as fallback.');

    warn.mockRestore();
});

test('Test htmlColorToRgba malformed rgb fallback', () => {

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let res = shared.htmlColorToRgba('rgb(8)');

    expect(res.x).toBeCloseTo(211 / 255);
    expect(res.y).toBeCloseTo(211 / 255);
    expect(res.z).toBeCloseTo(211 / 255);
    expect(res.w).toBe(1);
    expect(warn).toHaveBeenCalledWith('Invalid color "rgb(8)", using lightgrey as fallback.');

    warn.mockRestore();
});
