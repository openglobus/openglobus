'use strict';

import { N, W, S, E } from '../quadTree/quadTree.js';

function NewIndexesTypedArray(arr) {
    return new Uint32Array(arr);
};

function createCenterBodyIndexes(size) {

    let indexes = [];

    var i0 = 1,
        j0 = 1;

    var i1 = 1,
        j1 = 1;

    var ind1, ind2, nr;
    for (var i = i0; i < size - 1 - i1; i++) {
        for (var j = j0; j < size - j1; j++) {
            ind1 = i * size + j;
            nr = (i + 1) * size;
            ind2 = nr + j;
            indexes.push(ind1, ind2);
        }
        indexes.push(ind2, nr + j0);
    }
    indexes.push(indexes[indexes.length - 1], size * size - size);

    return NewIndexesTypedArray(indexes);
};

function createWestNeighborSkirt(size, deltaGr) {
    let indexes = [];
    var grCount = (size - 1) / deltaGr;
    var b = size * size - size;
    var k = 0;
    for (var i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        var rind = b - size * i - size + 1,
            lind = b - size * k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size);
        indexes.push(0);
    }

    return NewIndexesTypedArray(indexes);
};

function createNorthNeighborSkirt(size, deltaGr) {
    let indexes = [];
    var grCount = (size - 1) / deltaGr;
    var k = 0;
    for (var i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        var rind = size + i + 1,
            lind = k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size - 2);
        indexes.push(size - 1);
    }

    return NewIndexesTypedArray(indexes);
};

function createEastNeighborSkirt(size, deltaGr) {
    let indexes = [];
    var grCount = (size - 1) / deltaGr;
    var k = 0;
    for (var i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        var rind = size * (i + 1) + size - 2,
            lind = size + size * k - 1;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size * (size - 1) - 1);
        indexes.push(size * size - 1);
    }

    return NewIndexesTypedArray(indexes);
};

function createSouthNeighborSkirt(size, deltaGr) {
    let indexes = [];
    var grCount = (size - 1) / deltaGr;
    var k = 0;
    var rb = size * (size - 1) - 2;
    var lb = size * size - 1;
    for (var i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        var rind = rb - i,
            lind = lb - k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size * size - size + 1);
    }
    indexes.push(size * size - size);

    return NewIndexesTypedArray(indexes);
};

function initIndexesBodySkirts(pow) {
    var table = [];

    table[N] = [];
    table[W] = [];
    table[S] = [];
    table[E] = [];

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i),
            d1 = d + 1;

        table[N][i] = [];
        table[W][i] = [];
        table[S][i] = [];
        table[E][i] = [];

        for (var j = 0; j <= pow; j++) {
            var dd = Math.pow(2, j);
            table[W][i][j] = createWestNeighborSkirt(d1, dd);
            table[N][i][j] = createNorthNeighborSkirt(d1, dd);
            table[E][i][j] = createEastNeighborSkirt(d1, dd);
            table[S][i][j] = createSouthNeighborSkirt(d1, dd);

        }
    }
    return table;
};

function initIndexBodiesTable(pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[i] = createCenterBodyIndexes(d + 1);
    }
    return table;
};

function createTextureCoords(size) {
    var texCoords = new Uint16Array((size + 1) * (size + 1) * 2);
    let k = 0;
    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            texCoords[k++] = j / size * 0xFFFF;
            texCoords[k++] = i / size * 0xFFFF;
        }
    }
    return texCoords;
};

class SegmentHelper {
    constructor(maxGridSize = 0) {
        this._maxGridSize = maxGridSize;
    }

    get maxGridSize() {
        return this._maxGridSize;
    }

    init() {
        this.centerIndexesTable = initIndexBodiesTable(this._maxGridSize);
        this.skirtsIndexesTable = initIndexesBodySkirts(this._maxGridSize);
    }

    setMaxGridSize(gridSize) {
        this._maxGridSize = gridSize;
        this.init();
    }

    createSegmentIndexes(size, sidesSizes) {
        if (size) {
            let c = this.centerIndexesTable[size],
                w = this.skirtsIndexesTable[W][size][sidesSizes[W]],
                n = this.skirtsIndexesTable[N][size][sidesSizes[N]],
                e = this.skirtsIndexesTable[E][size][sidesSizes[E]],
                s = this.skirtsIndexesTable[S][size][sidesSizes[S]];

            let indexes = NewIndexesTypedArray(c.length + w.length + n.length + e.length + s.length);

            indexes.set(c, 0);
            indexes.set(w, c.length);
            indexes.set(n, c.length + w.length);
            indexes.set(e, c.length + w.length + n.length);
            indexes.set(s, c.length + w.length + n.length + e.length);

            return indexes;
        } else {
            return NewIndexesTypedArray([0, 2, 1, 3]);
        }
    }

    initTextureCoordsTable(pow) {
        var table = [];
        for (var i = 0; i <= pow; i++) {
            var d = Math.pow(2, i);
            table[i] = createTextureCoords(d);
        }
        return table;
    }
};

let instance = new SegmentHelper();

export function getInstance() {
    return instance;
};