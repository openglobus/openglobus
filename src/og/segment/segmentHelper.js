'use sctrict';

import * as quadTree from '../quadTree/quadTree.js';

export const TABLESIZE = 7;

const centerIndexesTable = initIndexBodiesTable(TABLESIZE);
const skirtsIndexesTable = initIndexesBodySkirts(TABLESIZE);

export const textureCoordsTable = initTextureCoordsTable(TABLESIZE);

export function createSegmentIndexes(size, sidesSizes) {
    if (size !== 1) {
        var c = centerIndexesTable[size],
            w = skirtsIndexesTable[quadTree.W][size][sidesSizes[quadTree.W]],
            n = skirtsIndexesTable[quadTree.N][size][sidesSizes[quadTree.N]],
            e = skirtsIndexesTable[quadTree.E][size][sidesSizes[quadTree.E]],
            s = skirtsIndexesTable[quadTree.S][size][sidesSizes[quadTree.S]];
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

function createCenterBodyIndexes(size, indexes) {

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
};

function createWestNeighborSkirt(size, deltaGr, indexes) {
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
};

function createNorthNeighborSkirt(size, deltaGr, indexes) {
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
};

function createEastNeighborSkirt(size, deltaGr, indexes) {
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
};

function createSouthNeighborSkirt(size, deltaGr, indexes) {
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
};

function initIndexesBodySkirts(pow) {
    var table = [];
    table[quadTree.N] = [];
    table[quadTree.W] = [];
    table[quadTree.S] = [];
    table[quadTree.E] = [];

    table[quadTree.N][0] = [];
    table[quadTree.W][0] = [];
    table[quadTree.S][0] = [];
    table[quadTree.E][0] = [];

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[quadTree.N][d] = [];
        table[quadTree.W][d] = [];
        table[quadTree.S][d] = [];
        table[quadTree.E][d] = [];

        table[quadTree.N][d][0] = [];
        table[quadTree.W][d][0] = [];
        table[quadTree.S][d][0] = [];
        table[quadTree.E][d][0] = [];

        for (var j = 0; j <= pow; j++) {
            var dd = Math.pow(2, j);
            var nt = table[quadTree.N][d][dd] = [];
            var wt = table[quadTree.W][d][dd] = [];
            var st = table[quadTree.S][d][dd] = [];
            var et = table[quadTree.E][d][dd] = [];
            createWestNeighborSkirt(d + 1, dd, wt);
            createNorthNeighborSkirt(d + 1, dd, nt);
            createEastNeighborSkirt(d + 1, dd, et);
            createSouthNeighborSkirt(d + 1, dd, st);
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
        var t = table[d] = [];
        createCenterBodyIndexes(d + 1, t);
    }
    table[0] = [];
    return table;
};

function createTextureCoords(size) {
    var texCoords = [];
    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            texCoords.push(j / size * 0xFFFF, i / size * 0xFFFF);
        }
    }
    return new Uint16Array(texCoords);
};