goog.provide('og.planetSegment.PlanetSegmentHelper');

goog.require('og.quadTree');

og.planetSegment.PlanetSegmentHelper.initIndexesTables = function (powerOfTwo) {
    if (powerOfTwo != og.planetSegment.PlanetSegmentHelper.powerOfTwo) {
        og.planetSegment.PlanetSegmentHelper.powerOfTwo = powerOfTwo;
        og.planetSegment.PlanetSegmentHelper.centerIndexesTable = og.planetSegment.PlanetSegmentHelper.initIndexBodiesTable(powerOfTwo);
        og.planetSegment.PlanetSegmentHelper.textureCoordsTable = og.planetSegment.PlanetSegmentHelper.initTextureCoordsTable(powerOfTwo);
        og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable = og.planetSegment.PlanetSegmentHelper.initIndexesBodySkirts(powerOfTwo);
    }
    og.planetSegment.PlanetSegmentHelper.centerIndexesTable[0] = [];
    og.planetSegment.PlanetSegmentHelper.textureCoordsTable[0] = [];
};

og.planetSegment.PlanetSegmentHelper.createSegmentIndexes = function (size, sidesSizes) {
    if (size != 1) {
        var c = og.planetSegment.PlanetSegmentHelper.centerIndexesTable[size],
            w = og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.W][size][sidesSizes[og.quadTree.W]],
            n = og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.N][size][sidesSizes[og.quadTree.N]],
            e = og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.E][size][sidesSizes[og.quadTree.E]],
            s = og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.S][size][sidesSizes[og.quadTree.S]];
        indexes = new Uint16Array(c.length + w.length + n.length + e.length + s.length);
        var k = 0, i = 0;
        for (k = 0; k < c.length; k++) {
            indexes[i++] = c[k];
        }
        for (k = 0; k < w.length; k++) {
            indexes[i++] = w[k];
        }
        for (k = 0; k < n.length; k++) {
            indexes[i++] = n[k];
        }
        for (k = 0; k < e.length; k++) {
            indexes[i++] = e[k];
        }
        for (k = 0; k < s.length; k++) {
            indexes[i++] = s[k];
        }
        return indexes;
    } else {
        return new Uint16Array([0, 2, 1, 3]);
    }
};

og.planetSegment.PlanetSegmentHelper.createCenterBodyIndexes = function (size, indexes) {

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

og.planetSegment.PlanetSegmentHelper.createWestNeighborSkirt = function (size, deltaGr, indexes) {
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

og.planetSegment.PlanetSegmentHelper.createNorthNeighborSkirt = function (size, deltaGr, indexes) {
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

og.planetSegment.PlanetSegmentHelper.createEastNeighborSkirt = function (size, deltaGr, indexes) {
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

og.planetSegment.PlanetSegmentHelper.createSouthNeighborSkirt = function (size, deltaGr, indexes) {
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

og.planetSegment.PlanetSegmentHelper.initIndexesBodySkirts = function (pow) {
    var table = [];
    table[og.quadTree.N] = [];
    table[og.quadTree.W] = [];
    table[og.quadTree.S] = [];
    table[og.quadTree.E] = [];

    table[og.quadTree.N][0] = [];
    table[og.quadTree.W][0] = [];
    table[og.quadTree.S][0] = [];
    table[og.quadTree.E][0] = [];

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[og.quadTree.N][d] = [];
        table[og.quadTree.W][d] = [];
        table[og.quadTree.S][d] = [];
        table[og.quadTree.E][d] = [];

        table[og.quadTree.N][d][0] = [];
        table[og.quadTree.W][d][0] = [];
        table[og.quadTree.S][d][0] = [];
        table[og.quadTree.E][d][0] = [];

        for (var j = 0; j <= pow; j++) {
            var dd = Math.pow(2, j);
            var nt = table[og.quadTree.N][d][dd] = [];
            var wt = table[og.quadTree.W][d][dd] = [];
            var st = table[og.quadTree.S][d][dd] = [];
            var et = table[og.quadTree.E][d][dd] = [];
            og.planetSegment.PlanetSegmentHelper.createWestNeighborSkirt(d + 1, dd, wt);
            og.planetSegment.PlanetSegmentHelper.createNorthNeighborSkirt(d + 1, dd, nt);
            og.planetSegment.PlanetSegmentHelper.createEastNeighborSkirt(d + 1, dd, et);
            og.planetSegment.PlanetSegmentHelper.createSouthNeighborSkirt(d + 1, dd, st);
        }
    }
    return table;
};

og.planetSegment.PlanetSegmentHelper.initTextureCoordsTable = function (pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[d] = og.planetSegment.PlanetSegmentHelper.createTextureCoords(d);
    }
    return table;
};

og.planetSegment.PlanetSegmentHelper.initIndexBodiesTable = function (pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        var t = table[d] = [];
        og.planetSegment.PlanetSegmentHelper.createCenterBodyIndexes(d + 1, t);
    }
    return table;
};

og.planetSegment.PlanetSegmentHelper.createTextureCoords = function (size) {
    var texCoords = [];
    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            texCoords.push(j / size, i / size);
        }
    }
    return texCoords;
};