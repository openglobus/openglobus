goog.provide('og.GeometryHandler');

goog.require('og.utils.earcut');
goog.require('og.Geometry');

og.GeometryHandler = function (layer) {
    this.__staticId = og.GeometryHandler.staticCounter++;

    this._layer = layer;

    this._handler = null;

    this._geometries = [];

    this._updatedGeometryArr = [];
    this._updatedGeometry = {};

    //Polygon arrays
    this._polyVertices = [];
    this._polyColors = [];
    this._polyIndexes = [];

    //Line arrays
    this._lineVertices = [];
    this._lineOrders = [];
    this._lineIndexes = [];
    this._lineColors = [];
    this._lineThickness = [];
    this._lineStrokes = [];
    this._lineStrokeColors = [];
    this._lineThicknessMask = [];

    //Buffers
    this._polyVerticesBuffer = null;
    this._polyColorsBuffer = null;
    this._polyIndexesBuffer = null;

    this._lineVerticesBuffer = null;
    this._lineColorsBuffer = null;
    this._lineThicknessBuffer = null;
    this._lineThicknessMaskBuffer = null;
    this._lineStrokesBuffer = null;
    this._lineStrokeColorsBuffer = null;
    this._lineOrdersBuffer = null;
    this._lineIndexesBuffer = null;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYVERTICES_BUFFER] = this.createPolyVerticesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYCOLORS_BUFFER] = this.createPolyColorsBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINEVERTICES_BUFFER] = this.createLineVerticesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINEINDEXESANDORDERS_BUFFER] = this.createLineIndexesAndOrdersBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINECOLORS_BUFFER] = this.createLineColorsBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINETHICKNESS_BUFFER] = this.createLineThicknessBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINESTROKES_BUFFER] = this.createLineStrokesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINESTROKECOLORS_BUFFER] = this.createLineStrokeColorsBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.GeometryHandler.staticCounter = 0;

og.GeometryHandler.POLYVERTICES_BUFFER = 0;
og.GeometryHandler.POLYCOLORS_BUFFER = 1;
og.GeometryHandler.LINEVERTICES_BUFFER = 2;
og.GeometryHandler.LINEINDEXESANDORDERS_BUFFER = 3;
og.GeometryHandler.LINECOLORS_BUFFER = 4;
og.GeometryHandler.LINETHICKNESS_BUFFER = 5;
og.GeometryHandler.LINESTROKES_BUFFER = 6;
og.GeometryHandler.LINESTROKECOLORS_BUFFER = 7;

og.GeometryHandler.appendLineRingData = function (pathArr, color, thickness, strokeColor, strokeSize,
    outVertices, outOrders, outIndexes, outColors, outThickness, outStrokeColors, outStrokes, outThicknessMask) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    }

    var t = thickness,
        c = [color.x, color.y, color.z, color.w],
        s = strokeSize,
        sc = [strokeColor.x, strokeColor.y, strokeColor.z, strokeColor.w];

    for (var j = 0; j < pathArr.length; j++) {
        path = pathArr[j];
        var startIndex = index;
        var last = path[path.length - 1];
        var prev = last;
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outStrokes.push(s, s, s, s);
            outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first = path[0];
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);
        outThickness.push(t, t, t, t);
        outStrokes.push(s, s, s, s);
        outThicknessMask.push(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outStrokeColors.push(sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3], sc[0], sc[1], sc[2], sc[3]);
        outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

og.GeometryHandler.prototype.assignHandler = function (handler) {
    this._handler = handler;
    this.refresh();
};

/**
 * @public
 * @param {og.Geometry} geometry - Geometry object.
 */
og.GeometryHandler.prototype.add = function (geometry) {
    //
    // Triangulates polygon and sets geometry data.
    if (geometry._handlerIndex === -1) {
        geometry._handler = this;
        geometry._handlerIndex = this._geometries.length;
        this._geometries.push(geometry);

        if (geometry._type === og.Geometry.POLYGON) {
            var data = og.utils.earcut.flatten(geometry._coordinates);
            var indexes = og.utils.earcut(data.vertices, data.holes, 2);

            geometry._polyVerticesHandlerIndex = this._polyVertices.length;
            geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

            this._polyVertices.push.apply(this._polyVertices, data.vertices);

            for (var i = 0; i < indexes.length; i++) {
                this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
            }

            var color = geometry._style.fillColor;
            for (var i = 0; i < data.vertices.length / 2; i++) {
                this._polyColors.push(color.x, color.y, color.z, color.w);
            }

            geometry._polyVerticesLength = data.vertices.length;
            geometry._polyIndexesLength = indexes.length;

            //Creates polygon stroke data
            geometry._lineVerticesHandlerIndex = this._lineVertices.length;
            geometry._lineOrdersHandlerIndex = this._lineOrders.length;
            geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
            geometry._lineColorsHandlerIndex = this._lineColors.length;
            geometry._lineThicknessHandlerIndex = this._lineThickness.length;

            og.GeometryHandler.appendLineRingData(geometry._coordinates,
                geometry._style.lineColor, geometry._style.lineWidth,
                geometry._style.strokeColor, geometry._style.strokeWidth,
                this._lineVertices, this._lineOrders, this._lineIndexes, this._lineColors,
                this._lineThickness, this._lineStrokeColors, this._lineStrokes, this._lineThicknessMask);

            geometry._lineVerticesLength = this._lineVertices.length - geometry._lineVerticesHandlerIndex;
            geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
            geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
            geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
            geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;

        } else if (geometry._type === og.Geometry.MULTIPOLYGON) {
            var coordinates = geometry._coordinates;
            var vertices = [],
                indexes = [],
                colors = [];

            //Creates polygon stroke data
            geometry._lineVerticesHandlerIndex = this._lineVertices.length;
            geometry._lineOrdersHandlerIndex = this._lineOrders.length;
            geometry._lineIndexesHandlerIndex = this._lineIndexes.length;
            geometry._lineColorsHandlerIndex = this._lineColors.length;
            geometry._lineThicknessHandlerIndex = this._lineThickness.length;

            for (var i = 0; i < coordinates.length; i++) {
                var ci = coordinates[i];
                var data = og.utils.earcut.flatten(ci);
                vertices.push.apply(vertices, data.vertices);
                indexes.push.apply(indexes, og.utils.earcut(data.vertices, data.holes, 2));

                og.GeometryHandler.appendLineRingData(ci,
                    geometry._style.lineColor, geometry._style.lineWidth,
                    geometry._style.strokeColor, geometry._style.strokeWidth,
                    this._lineVertices, this._lineOrders, this._lineIndexes, this._lineColors,
                    this._lineThickness, this._lineStrokeColors, this._lineStrokes, this._lineThicknessMask);
            }

            geometry._polyVerticesHandlerIndex = this._polyVertices.length;
            geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

            this._polyVertices.push.apply(this._polyVertices, vertices);

            for (var i = 0; i < indexes.length; i++) {
                this._polyIndexes.push(indexes[i] + geometry._polyVerticesHandlerIndex * 0.5);
            }

            var color = geometry._style.fillColor;
            for (var i = 0; i < vertices.length / 2; i++) {
                this._polyColors.push(color.x, color.y, color.z, color.w);
            }

            geometry._polyVerticesLength = vertices.length;
            geometry._polyIndexesLength = indexes.length;

            geometry._lineVerticesLength = this._lineVertices.length - geometry._lineVerticesHandlerIndex;
            geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex;
            geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex;
            geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex;
            geometry._lineThicknessLength = this._lineThickness.length - geometry._lineThicknessHandlerIndex;
        }

        this.refresh();
    }
};

og.GeometryHandler.prototype._refreshPlanetNode = function (treeNode) {
    var nodes = treeNode.nodes,
        g = this._updatedGeometryArr,
        lid = this._layer._id;
    for (var i = 0; i < nodes.length; i++) {
        var ni = nodes[i];
        for (var j = 0; j < g.length; j++) {
            if (g[j]._extent.overlaps(ni.planetSegment.getExtentLonLat())) {
                this._refreshPlanetNode(ni);
                var m = ni.planetSegment.materials[lid];
                if (m) {
                    if (m.isReady) {
                        m._updateTexture = m.texture;
                        if (m.segment.node.getState() !== og.quadTree.RENDERING) {
                            m.textureExists = false;
                        }
                    }
                    m.isReady = false;
                }
            }
        }
    }
};

og.GeometryHandler.prototype._updatePlanet = function () {
    var p = this._layer._planet;
    if (p) {
        this._refreshPlanetNode(p._quadTree);
        this._refreshPlanetNode(p._quadTreeNorth);
        this._refreshPlanetNode(p._quadTreeSouth);
    }
    this._updatedGeometryArr.length = 0;
    this._updatedGeometryArr = [];
    this._updatedGeometry = {};
};

og.GeometryHandler.prototype.refresh = function () {
    var i = this._changedBuffers.length;
    while (i--) {
        this._changedBuffers[i] = true;
    }
};

og.GeometryHandler.prototype.update = function () {
    if (this._handler) {
        var needUpdate = false;
        var i = this._changedBuffers.length;
        while (i--) {
            if (this._changedBuffers[i]) {
                needUpdate = true;
                this._buffersUpdateCallbacks[i].call(this);
                this._changedBuffers[i] = false;
            }
        }
        needUpdate && this._updatePlanet();
    }
};

og.GeometryHandler.prototype.setPolyColorArr = function (geometry, color) {
    var index = geometry._polyVerticesHandlerIndex * 2, // ... / 2 * 4
        size = index + geometry._polyVerticesLength * 2; // ... / 2 * 4
    var a = this._polyColors;
    for (var i = index; i < size; i += 4) {
        a[i] = color.x;
        a[i + 1] = color.y;
        a[i + 2] = color.z;
        a[i + 3] = color.w;
    }
    this._changedBuffers[og.GeometryHandler.POLYCOLORS_BUFFER] = true;
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.setLineStrokeColorArr = function (geometry, color) {
    var index = geometry._lineColorsHandlerIndex,
        size = index + geometry._lineColorsLength;
    var a = this._lineStrokeColors;
    for (var i = index; i < size; i += 4) {
        a[i] = color.x;
        a[i + 1] = color.y;
        a[i + 2] = color.z;
        a[i + 3] = color.w;
    }
    this._changedBuffers[og.GeometryHandler.LINESTROKECOLORS_BUFFER] = true;
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.setLineColorArr = function (geometry, color) {
    var index = geometry._lineColorsHandlerIndex,
        size = index + geometry._lineColorsLength;
    var a = this._lineColors;
    for (var i = index; i < size; i += 4) {
        a[i] = color.x;
        a[i + 1] = color.y;
        a[i + 2] = color.z;
        a[i + 3] = color.w;
    }
    this._changedBuffers[og.GeometryHandler.LINECOLORS_BUFFER] = true;
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.setLineStrokeArr = function (geometry, width) {
    var index = geometry._lineStrokesHandlerIndex,
        size = index + geometry._lineStrokesLength;
    var a = this._lineStrokes;
    for (var i = index; i < size; i++) {
        a[i] = width;
    }
    this._changedBuffers[og.GeometryHandler.LINESTROKES_BUFFER] = true;
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.setLineThicknessArr = function (geometry, width) {
    var index = geometry._lineThicknessHandlerIndex,
        size = index + geometry._lineThicknessLength;
    var a = this._lineThickness;
    for (var i = index; i < size; i++) {
        a[i] = width;
    }
    this._changedBuffers[og.GeometryHandler.LINETHICKNESS_BUFFER] = true;
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.setPolyVerticesArr = function (geometry, vertices, indexes) {
    var index = geometry._handlerIndex;
    if (vertices.length === geometry._polyVerticesLength && indexes.length === geometry._polyIndexesLength) {

        var vIndex = geometry._polyVerticesHandlerIndex,
            iIndex = geometry._polyIndexesHandlerIndex;

        var a = this._polyVertices,
            i;
        for (i = 0; i < vertices.length; i++) {
            a[vIndex + i] = vertices[i];
        }

        a = this._polyIndexes;
        for (i = 0; i < indexes.length; i++) {
            a[iIndex + i] = indexes[i];
        }
    } else {
        //
        //...
        //
    }
    this._changedBuffers[og.GeometryHandler.POLYVERTICES_BUFFER] = true;
    this._changedBuffers[og.GeometryHandler.POLYVERTICES_BUFFER] = true;

    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.createPolyVerticesBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._polyVerticesBuffer);
    this._polyVerticesBuffer = h.createArrayBuffer(new Float32Array(this._polyVertices), 2, this._polyVertices.length / 2);
    this._polyIndexesBuffer = h.createElementArrayBuffer(new Uint16Array(this._polyIndexes), 1, this._polyIndexes.length);
};

og.GeometryHandler.prototype.createPolyColorsBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._polyColorsBuffer);
    this._polyColorsBuffer = h.createArrayBuffer(new Float32Array(this._polyColors), 4, this._polyColors.length / 4);
};

og.GeometryHandler.prototype.createLineVerticesBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineVerticesBuffer);
    this._lineVerticesBuffer = h.createArrayBuffer(new Float32Array(this._lineVertices), 2, this._lineVertices.length / 2);
};

og.GeometryHandler.prototype.createLineIndexesAndOrdersBuffer = function () {
    var h = this._handler;

    h.gl.deleteBuffer(this._lineOrdersBuffer);
    this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);

    h.gl.deleteBuffer(this._lineIndexesBuffer);
    this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint16Array(this._lineIndexes), 1, this._lineIndexes.length);
};

og.GeometryHandler.prototype.createLineColorsBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineColorsBuffer);
    this._lineColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineColors), 4, this._lineColors.length / 4);
};

og.GeometryHandler.prototype.createLineThicknessBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineThicknessBuffer);
    this._lineThicknessBuffer = h.createArrayBuffer(new Float32Array(this._lineThickness), 1, this._lineThickness.length);

    h.gl.deleteBuffer(this._lineThicknessMaskBuffer);
    this._lineThicknessMaskBuffer = h.createArrayBuffer(new Float32Array(this._lineThicknessMask), 4, this._lineThicknessMask.length / 4);
};

og.GeometryHandler.prototype.createLineStrokesBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineStrokesBuffer);
    this._lineStrokesBuffer = h.createArrayBuffer(new Float32Array(this._lineStrokes), 1, this._lineStrokes.length);
};

og.GeometryHandler.prototype.createLineStrokeColorsBuffer = function () {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineStrokeColorsBuffer);
    this._lineStrokeColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineStrokeColors), 4, this._lineStrokeColors.length / 4);
};

og.GeometryHandler.prototype.remove = function (geometry) {
    var index = geometry._handlerIndex;
    if (index !== -1) {
        geometry._handlerIndex = -1;
        geometry._handler = null;
        this._geometries.splice(index, 1);
        //this._reindexGeometryArray(index);

        //polygon
        this._polyVertices.splice(geometry._polyVerticesHandlerIndex, geometry._polyVerticesLength);
        this._polyColors.splice(geometry._polyVerticesHandlerIndex * 2, geometry._polyVerticesLength * 2);
        this._polyIndexes.splice(geometry._polyIndexesHandlerIndex, geometry._polyIndexesLength);
        var di = geometry._polyVerticesLength * 0.5;
        for (var i = geometry._polyIndexesHandlerIndex; i < this._polyIndexes.length; i++) {
            this._polyIndexes[i] -= di;
        }

        //line
        this._lineVertices.splice(geometry._lineVerticesHandlerIndex, geometry._lineVerticesLength);
        this._lineOrders.splice(geometry._lineOrdersHandlerIndex, geometry._lineOrdersLength);
        this._lineColors.splice(geometry._lineColorsHandlerIndex, geometry._lineColorsLength);
        this._lineStrokeColors.splice(geometry._lineColorsHandlerIndex, geometry._lineColorsLength);
        this._lineThickness.splice(geometry._lineThicknessHandlerIndex, geometry._lineThicknessLength);
        this._lineStrokes.splice(geometry._lineThicknessHandlerIndex, geometry._lineThicknessLength);
        this._lineThicknessMask.splice(geometry._lineThicknessHandlerIndex, geometry._lineThicknessLength);
        this._lineIndexes.splice(geometry._lineIndexesHandlerIndex, geometry._lineIndexesLength);
        di = geometry._lineVerticesLength * 0.5;
        for (var i = geometry._lineIndexesHandlerIndex; i < this._lineIndexes.length; i++) {
            this._lineIndexes[i] -= di;
        }

        //reindex
        var g = this._geometries;
        for (i = index; i < g.length; i++) {
            var gi = g[i];
            gi._handlerIndex = i;
            gi._polyVerticesHandlerIndex -= geometry._polyVerticesLength;
            gi._polyIndexesHandlerIndex -= geometry._polyIndexesLength;

            gi._lineVerticesHandlerIndex -= geometry._lineVerticesLength;
            gi._lineOrdersHandlerIndex -= geometry._lineOrdersLength;
            gi._lineColorsHandlerIndex -= geometry._lineColorsLength;
            gi._lineThicknessHandlerIndex -= geometry._lineThicknessLength;
            gi._lineIndexesHandlerIndex -= geometry._lineIndexesLength;
        }

        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
        this.refresh();
    }
};

// og.GeometryHandler.prototype._reindexGeometryArray = function(startIndex) {
//     var g = this._geometries;
//     for (var i = startIndex; i < g.length; i++) {
//         g[i]._handlerIndex = i;
//     }
// };
