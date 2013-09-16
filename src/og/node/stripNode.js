var StripNode = function (size) {
    StripNode.superclass.constructor.call(this, "CUBE");
    this.size = size * 0.5;
    //this.cubeVertexColorBuffer = null;
    this.cubeVertexPositionBuffer = null;
    this.cubeVertexIndexBuffer = null;

    this.texture;
    this.textureImageFileName;
    this.cubeVertexTextureCoordBuffer = null;
}

extend(StripNode, Node3D);

StripNode.prototype.initialization = function () {

    this.initTexture("nehe.jpg");
    this.createBuffers();
    this.drawMode = WebGLContext.GL_TRIANGLE_STRIP;
}

StripNode.prototype.initTexture = function (fileName) {
    var image = new Image();
    var handle = this;
    image.onload = function () {
        handle.texture = handle.renderer.ctx.createTextureFromImage(image);
    }
    image.src = this.textureImageFileName = fileName;
}

StripNode.prototype.frame = function () {
    this.renderer.ctx.bindTexture(this.texture);
    this.renderer.ctx.setTextureBias([0, 0, 1]);
    this.renderer.ctx.drawBuffer(this.cubeVertexPositionBuffer, this.cubeVertexTextureCoordBuffer, this.cubeVertexIndexBuffer);
}


//StripNode.createCenterBody = function (width, height, indexes) {

//    var i0 = 1,
//        j0 = 1;

//    var i1 = 1,
//        j1 = 1;

//    var ind1, ind2, nr;
//    for (var i = i0; i < height - 1 - i1; i++) {
//        for (var j = j0; j < width - j1; j++) {
//            ind1 = i * width + j;
//            nr = (i + 1) * width;
//            ind2 = nr + j;
//            indexes.push(ind1, ind2);
//        }
//        indexes.push(ind2, nr + j0);
//    }
//    indexes.push(indexes[indexes.length - 1], width * height - width);
//}

//StripNode.createWestNeighborSkirt = function (width, height, deltaGr, indexes) {
//    var grCount = (width - 1) / deltaGr;
//    var b = width * height - width;
//    var k = 0;
//    for (var i = 0; i < height - 2; i++) {
//        if (i % grCount === 0) {
//            k = i;
//        }
//        var rind = b - width * i - width + 1,
//            lind = b - width * k;
//        indexes.push(lind, rind);
//    }

//    if (deltaGr === (height - 1)) {
//        indexes.push(width);
//        indexes.push(0);
//    }
//}

//StripNode.createNorthNeighborSkirt = function (width, height, deltaGr, indexes) {
//    var grCount = (width - 1) / deltaGr;
//    var k = 0;
//    for (var i = 0; i < height - 2; i++) {
//        if (i % grCount === 0) {
//            k = i;
//        }
//        var rind = width + i + 1,
//            lind = k;
//        indexes.push(lind, rind);
//    }

//    if (deltaGr === (width - 1)) {
//        indexes.push(width - 2);
//        indexes.push(width - 1);
//    }
//}

//StripNode.createEastNeighborSkirt = function (width, height, deltaGr, indexes) {
//    var grCount = (width - 1) / deltaGr;
//    var k = 0;
//    for (var i = 0; i < height - 2; i++) {
//        if (i % grCount === 0) {
//            k = i;
//        }
//        var rind = width * (i + 1) + width - 2,
//            lind = width + width * k - 1;
//        indexes.push(lind, rind);
//    }

//    if (deltaGr === (height - 1)) {
//        indexes.push(width * (height - 1) - 1);
//        indexes.push(width * height - 1);
//    }
//}

//StripNode.createSouthNeighborSkirt = function (width, height, deltaGr, indexes) {
//    var grCount = (width - 1) / deltaGr;
//    var k = 0;
//    var rb = width * (height - 1) - 2;
//    var lb = width * height - 1;
//    for (var i = 0; i < height - 2; i++) {
//        if (i % grCount === 0) {
//            k = i;
//        }
//        var rind = rb - i,
//            lind = lb - k;
//        indexes.push(lind, rind);
//    }

//    if (deltaGr === (width - 1)) {
//        indexes.push(width * height - width + 1);
//    }
//    indexes.push(width * height - width);
//}

//StripNode.initIndexesBodySkirts = function (pow) {
//    var table = [];
//    table[N] = [];
//    table[W] = [];
//    table[S] = [];
//    table[E] = [];

//    for (var i = 0; i <= pow; i++) {
//        var d = Math.pow(2, i);
//        table[N][d+1] = [];
//        table[W][d+1] = [];
//        table[S][d+1] = [];
//        table[E][d+1] = [];
//        for (var j = 0; j <= pow; j++) {
//            var dd = Math.pow(2, j);
//            var nt = table[N][d+1][dd] = [];
//            var wt = table[W][d+1][dd] = [];
//            var st = table[S][d+1][dd] = [];
//            var et = table[E][d+1][dd] = [];
//            StripNode.createWestNeighborSkirt(d + 1, d + 1, dd, wt);
//            StripNode.createNorthNeighborSkirt(d + 1, d + 1, dd, nt);
//            StripNode.createEastNeighborSkirt(d + 1, d + 1, dd, et);
//            StripNode.createSouthNeighborSkirt(d + 1, d + 1, dd, st);
//        }
//    }
//    return table;
//}

//StripNode.initTextureCoordsTable = function (pow) {
//    var table = [];
//    for (var i = 0; i <= pow; i++) {
//        var d = Math.pow(2, i);
//        table[d] = StripNode.createTextureCoords(d);
//    }
//    return table;
//}

//StripNode.initIndexBodiesTable = function (pow) {
//    var table = [];
//    for (var i = 0; i <= pow; i++) {
//        var d = Math.pow(2, i) + 1;
//        var t = table[d] = [];
//        StripNode.createCenterBody(d, d, t);
//    }
//    return table;
//}

//StripNode.createTextureCoords = function (size) {
//    var texCoords = [];
//    for (var i = 0; i <= size; i++) {
//        for (var j = 0; j <= size; j++) {
//            texCoords.push(j / size, i / size);
//        }
//    }
//    return texCoords;
//}

StripNode.prototype.createBuffers = function () {
    PlanetSegmentHelper.initIndexesTables(5);

    vertices = [];

    var step = 1;
    var size = 1;

    for (var i = 0; i <= size; i++) {
        for (var j = 0; j <= size; j++) {
            var x = j * step,
                y = (size-1) * step - i * step,
                z = 0;

            vertices.push(x, y, z);
        }
    }

    textureCoords = PlanetSegmentHelper.textureCoordsTable[size];

    var cubeVertexIndices = [];
    PlanetSegmentHelper.createSegmentIndexes(cubeVertexIndices, size, 1,1,1,1);


    //this.cubeVertexColorBuffer = this.ctx.createArrayBuffer( new Float32Array(unpackedColors), 4, 24 );
    this.cubeVertexPositionBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);
    this.cubeVertexTextureCoordBuffer = this.renderer.ctx.createArrayBuffer(new Float32Array(textureCoords), 2, textureCoords.length / 2);
    this.cubeVertexIndexBuffer = this.renderer.ctx.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, cubeVertexIndices.length);
}