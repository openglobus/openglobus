og.node.planet.PlanetSegmentHelper = function () { };

og.node.planet.PlanetSegmentHelper.initIndexesTables = function (powerOfTwo) {
    if (powerOfTwo != og.node.planet.PlanetSegmentHelper.powerOfTwo) {
        og.node.planet.PlanetSegmentHelper.powerOfTwo = powerOfTwo;
        og.node.planet.PlanetSegmentHelper.centerIndexesTable = og.node.planet.PlanetSegmentHelper.initIndexBodiesTable(powerOfTwo);
        og.node.planet.PlanetSegmentHelper.textureCoordsTable = og.node.planet.PlanetSegmentHelper.initTextureCoordsTable(powerOfTwo);
        og.node.planet.PlanetSegmentHelper.skirtsIndexesTable = og.node.planet.PlanetSegmentHelper.initIndexesBodySkirts(powerOfTwo);
    }
};

og.node.planet.PlanetSegmentHelper.createSegmentIndexes = function (indexes, size, northSize, westSize, southSize, eastSize) {
    indexes.length = 0;
    if (size != 1) {
        indexes.push.apply(indexes, og.node.planet.PlanetSegmentHelper.centerIndexesTable[size]);
        indexes.push.apply(indexes, og.node.planet.PlanetSegmentHelper.skirtsIndexesTable[og.node.planet.quadTree.QuadNode.W][size][westSize]);
        indexes.push.apply(indexes, og.node.planet.PlanetSegmentHelper.skirtsIndexesTable[og.node.planet.quadTree.QuadNode.N][size][northSize]);
        indexes.push.apply(indexes, og.node.planet.PlanetSegmentHelper.skirtsIndexesTable[og.node.planet.quadTree.QuadNode.E][size][eastSize]);
        indexes.push.apply(indexes, og.node.planet.PlanetSegmentHelper.skirtsIndexesTable[og.node.planet.quadTree.QuadNode.S][size][southSize]);
    } else {
        indexes.push(0,2,1,3);
    }
};

og.node.planet.PlanetSegmentHelper.createCenterBodyIndexes = function (size, indexes) {

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

og.node.planet.PlanetSegmentHelper.createWestNeighborSkirt = function (size, deltaGr, indexes) {
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

og.node.planet.PlanetSegmentHelper.createNorthNeighborSkirt = function (size, deltaGr, indexes) {
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

og.node.planet.PlanetSegmentHelper.createEastNeighborSkirt = function (size, deltaGr, indexes) {
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

og.node.planet.PlanetSegmentHelper.createSouthNeighborSkirt = function (size, deltaGr, indexes) {
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

og.node.planet.PlanetSegmentHelper.initIndexesBodySkirts = function (pow) {
    var table = [];
    table[og.node.planet.quadTree.QuadNode.N] = [];
    table[og.node.planet.quadTree.QuadNode.W] = [];
    table[og.node.planet.quadTree.QuadNode.S] = [];
    table[og.node.planet.quadTree.QuadNode.E] = [];

    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[og.node.planet.quadTree.QuadNode.N][d] = [];
        table[og.node.planet.quadTree.QuadNode.W][d] = [];
        table[og.node.planet.quadTree.QuadNode.S][d] = [];
        table[og.node.planet.quadTree.QuadNode.E][d] = [];
        for (var j = 0; j <= pow; j++) {
            var dd = Math.pow(2, j);
            var nt = table[og.node.planet.quadTree.QuadNode.N][d][dd] = [];
            var wt = table[og.node.planet.quadTree.QuadNode.W][d][dd] = [];
            var st = table[og.node.planet.quadTree.QuadNode.S][d][dd] = [];
            var et = table[og.node.planet.quadTree.QuadNode.E][d][dd] = [];
            og.node.planet.PlanetSegmentHelper.createWestNeighborSkirt(d + 1, dd, wt);
            og.node.planet.PlanetSegmentHelper.createNorthNeighborSkirt(d + 1, dd, nt);
            og.node.planet.PlanetSegmentHelper.createEastNeighborSkirt(d + 1, dd, et);
            og.node.planet.PlanetSegmentHelper.createSouthNeighborSkirt(d + 1, dd, st);
        }
    }
    return table;
};

og.node.planet.PlanetSegmentHelper.initTextureCoordsTable = function (pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        table[d] = og.node.planet.PlanetSegmentHelper.createTextureCoords(d);
    }
    return table;
};

og.node.planet.PlanetSegmentHelper.initIndexBodiesTable = function (pow) {
    var table = [];
    for (var i = 0; i <= pow; i++) {
        var d = Math.pow(2, i);
        var t = table[d] = [];
        og.node.planet.PlanetSegmentHelper.createCenterBodyIndexes(d + 1, t);
    }
    return table;
};

og.node.planet.PlanetSegmentHelper.createTextureCoords = function (size) {
    var texCoords = [];
    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            texCoords.push(j / size, i / size);
        }
    }
    return texCoords;
};


