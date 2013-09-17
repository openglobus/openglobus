og.planetSegment.PlanetSegmentHelper = function () { };

og.planetSegment.PlanetSegmentHelper.initIndexesTables = function (powerOfTwo) {
    if (powerOfTwo != og.planetSegment.PlanetSegmentHelper.powerOfTwo) {
        og.planetSegment.PlanetSegmentHelper.powerOfTwo = powerOfTwo;
        og.planetSegment.PlanetSegmentHelper.centerIndexesTable = og.planetSegment.PlanetSegmentHelper.initIndexBodiesTable(powerOfTwo);
        og.planetSegment.PlanetSegmentHelper.textureCoordsTable = og.planetSegment.PlanetSegmentHelper.initTextureCoordsTable(powerOfTwo);
        og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable = og.planetSegment.PlanetSegmentHelper.initIndexesBodySkirts(powerOfTwo);
    }
};

og.planetSegment.PlanetSegmentHelper.createSegmentIndexes = function (indexes, size, northSize, westSize, southSize, eastSize) {
    indexes.length = 0;
    if (size != 1) {
        indexes.push.apply(indexes, og.planetSegment.PlanetSegmentHelper.centerIndexesTable[size]);
        indexes.push.apply(indexes, og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.W][size][westSize]);
        indexes.push.apply(indexes, og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.N][size][northSize]);
        indexes.push.apply(indexes, og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.E][size][eastSize]);
        indexes.push.apply(indexes, og.planetSegment.PlanetSegmentHelper.skirtsIndexesTable[og.quadTree.S][size][southSize]);
    } else {
        indexes.push(0,2,1,3);
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

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[og.quadTree.N][d] = [];
        table[og.quadTree.W][d] = [];
        table[og.quadTree.S][d] = [];
        table[og.quadTree.E][d] = [];
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