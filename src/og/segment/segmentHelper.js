'use sctrict';

import { N, W, S, E } from '../quadTree/quadTree.js';

export const TABLESIZE = 7;

const centerIndexesTable = initIndexBodiesTable(TABLESIZE);
const skirtsIndexesTable = initIndexesBodySkirts(TABLESIZE);

export const textureCoordsTable = initTextureCoordsTable(TABLESIZE);

export function createSegmentIndexes(size, sidesSizes) {
    if (size !== 1) {
        var c = centerIndexesTable[size],
            w = skirtsIndexesTable[W][size][sidesSizes[W]],
            n = skirtsIndexesTable[N][size][sidesSizes[N]],
            e = skirtsIndexesTable[E][size][sidesSizes[E]],
            s = skirtsIndexesTable[S][size][sidesSizes[S]];
        var indexes = new Uint16Array(c.length + w.length + n.length + e.length + s.length);
        var k = 0, i = 0, len = c.length;
        for (k = 0; k < len; k++) {
            indexes[i++] = c[k];
        }
        for (k = 0, len = w.length; k < len; k++) {
            indexes[i++] = w[k];
        }
        for (k = 0, len = n.length; k < len; k++) {
            indexes[i++] = n[k];
        }
        for (k = 0, len = e.length; k < len; k++) {
            indexes[i++] = e[k];
        }
        for (k = 0, len = s.length; k < len; k++) {
            indexes[i++] = s[k];
        }
        return indexes;
    } else {
        return new Uint16Array([0, 2, 1, 3]);
    }
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

    return new Uint16Array(indexes);
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

    return new Uint16Array(indexes);
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

    return new Uint16Array(indexes);
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

    return new Uint16Array(indexes);
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

    return new Uint16Array(indexes);
};

function initIndexesBodySkirts(pow) {
    var table = [];

    table[N] = [];
    table[W] = [];
    table[S] = [];
    table[E] = [];

    table[N][0] = [];
    table[W][0] = [];
    table[S][0] = [];
    table[E][0] = [];

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i),
            d1 = d + 1;

        table[N][d] = [];
        table[W][d] = [];
        table[S][d] = [];
        table[E][d] = [];

        table[N][d][0] = [];
        table[W][d][0] = [];
        table[S][d][0] = [];
        table[E][d][0] = [];

        for (var j = 0; j <= pow; j++) {
            var dd = Math.pow(2, j);
            table[W][d][dd] = createWestNeighborSkirt(d1, dd);
            table[N][d][dd] = createNorthNeighborSkirt(d1, dd);
            table[E][d][dd] = createEastNeighborSkirt(d1, dd);
            table[S][d][dd] = createSouthNeighborSkirt(d1, dd);
        }
    }
    return table;
};

function initTextureCoordsTable(pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[d] = createTextureCoords(d);
    }
    table[0] = [];
    return table;
};

function initIndexBodiesTable(pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[d] = createCenterBodyIndexes(d + 1);
    }
    table[0] = new Uint16Array();
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