goog.provide('og.GeometryHandler');

goog.require('og.utils.earcut');
goog.require('og.Geometry');

og.GeometryHandler = function(layer) {
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

    this._polyVerticesBuffer = null;
    this._polyColorsBuffer = null;
    this._polyIndexesBuffer = null;

    this._lineVerticesBuffer = null;
    this._lineColorsBuffer = null;
    this._lineThicknessBuffer = null;
    this._lineOrdersBuffer = null;
    this._lineIndexesBuffer = null;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYVERTICES_BUFFER] = this.createPolyVerticesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYCOLORS_BUFFER] = this.createPolyColorsBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINEVERTICES_BUFFER] = this.createLineVerticesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINEINDEXESANDORDERS_BUFFER] = this.createLineIndexesAndOrdersBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINECOLORS_BUFFER] = this.createLineColorsBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.LINETHICKNESS_BUFFER] = this.createLineThicknessBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.GeometryHandler.staticCounter = 0;

og.GeometryHandler.POLYVERTICES_BUFFER = 0;
og.GeometryHandler.POLYCOLORS_BUFFER = 1;
og.GeometryHandler.LINEVERTICES_BUFFER = 2;
og.GeometryHandler.LINEINDEXESANDORDERS_BUFFER = 3;
og.GeometryHandler.LINECOLORS_BUFFER = 4;
og.GeometryHandler.LINETHICKNESS_BUFFER = 5;

og.GeometryHandler.appendLineRingData(pathArr, color, thickness,
    outVertices, outOrders, outIndexes, outColors, outThickness) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    }

    var t = thickness,
        c = color;

    for (var j = 0; j < pathArr.length; j++) {
        path = pathArr[j];
        var startIndex = index;
        var last = path[path.length - 1];
        var prev = last;
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        outThickness.push(t, t, t, t);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outThickness.push(t, t, t, t);
            outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first = path[0];
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);
        outThickness.push(t, t, t, t);
        outColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

og.GeometryHandler.prototype.assignHandler = function(handler) {
    this._handler = handler;
    this.refresh();
};

/**
 * @public
 * @param {og.Geometry} geometry - Geometry object.
 */
og.GeometryHandler.prototype.add = function(geometry) {
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
                this._polyIndexes.push(indexes[i] + geometry._polyIndexesHandlerIndex);
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
            geometry._lineThicknesHandlerIndex = this._lineThickness.length;

            var ringData = og.GeometryHandler.appendLineRingData(geometry._coordinates,
                geometry._style.strokeColor, geometry._style.strokeWidth,
                this._lineVertices, this._lineOrders, this._lineIndexes, this._lineColors, this._lineThickness);

            geometry._lineVerticesLength = this._lineVertices.length - geometry._lineVerticesHandlerIndex + 1;
            geometry._lineOrdersLength = this._lineOrders.length - geometry._lineOrdersHandlerIndex + 1;
            geometry._lineIndexesLength = this._lineIndexes.length - geometry._lineIndexesHandlerIndex + 1;
            geometry._lineColorsLength = this._lineColors.length - geometry._lineColorsHandlerIndex + 1;
            geometry._lineThicknesLength = this._lineThicknes.length - geometry._lineThicknesHandlerIndex + 1;

        } else if (geometry._type === og.Geometry.MULTIPOLYGON) {
            var coordinates = geometry._coordinates;
            var vertices = [],
                indexes = [],
                colors = [];

            for (var i = 0; i < coordinates.length; i++) {
                var ci = coordinates[i];
                var data = og.utils.earcut.flatten(ci);
                vertices.push.apply(vertices, data.vertices);
                indexes.push.apply(indexes, og.utils.earcut(data.vertices, data.holes, 2));
            }

            geometry._polyVerticesHandlerIndex = this._polyVertices.length;
            geometry._polyIndexesHandlerIndex = this._polyIndexes.length;

            this._polyVertices.push.apply(this._polyVertices, vertices);
            this._polyIndexes.push.apply(this._polyIndexes, indexes);

            var color = geometry._style.fillColor;
            for (var i = 0; i < vertices.length / 2; i++) {
                this._polyColors.push(color.x, color.y, color.z, color.w);
            }

            geometry._polyVerticesLength = vertices.length;
            geometry._polyIndexesLength = indexes.length;
        }

        this.refresh();
    }
};

og.GeometryHandler.prototype._refreshPlanetNode = function(treeNode) {
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

og.GeometryHandler.prototype._updatePlanet = function() {
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

og.GeometryHandler.prototype.refresh = function() {
    var i = this._changedBuffers.length;
    while (i--) {
        this._changedBuffers[i] = true;
    }
};

og.GeometryHandler.prototype.update = function() {
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

og.GeometryHandler.prototype.setPolyColorArr = function(geometry, color) {
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

og.GeometryHandler.prototype.setPolyVerticesArr = function(geometry, vertices, indexes) {
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
    !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
    this._updatedGeometry[geometry._id] = true;
};

og.GeometryHandler.prototype.createPolyVerticesBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._polyVerticesBuffer);
    this._polyVerticesBuffer = h.createArrayBuffer(new Float32Array(this._polyVertices), 2, this._polyVertices.length / 2);
    this._polyIndexesBuffer = h.createElementArrayBuffer(new Uint16Array(this._polyIndexes), 1, this._polyIndexes.length);
};

og.GeometryHandler.prototype.createPolyColorsBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._polyColorsBuffer);
    this._polyColorsBuffer = h.createArrayBuffer(new Float32Array(this._polyColors), 4, this._polyColors.length / 4);
};

og.GeometryHandler.prototype.createLineVerticesBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineVerticesBuffer);
    this._lineVerticesBuffer = h.createArrayBuffer(new Float32Array(this._lineVertices), 2, this._lineVertices.length / 2);
};

og.GeometryHandler.prototype.createLineIndexesAndOrdersBuffer = function() {
    var h = this._handler;

    h.gl.deleteBuffer(this._lineOrdersBuffer);
    this._lineOrdersBuffer = h.createArrayBuffer(new Float32Array(this._lineOrders), 1, this._lineOrders.length / 2);

    h.gl.deleteBuffer(this._lineIndexesBuffer);
    this._lineIndexesBuffer = h.createElementArrayBuffer(new Uint16Array(this._lineIndexes), 1, this._lineIndexes.length);
};

og.GeometryHandler.prototype.createLineColorsBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineColorsBuffer);
    this._lineColorsBuffer = h.createArrayBuffer(new Float32Array(this._lineColors), 4, this._lineColors.length / 4);
};

og.GeometryHandler.prototype.createLineThicknessBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._lineThicknessBuffer);
    this._lineThicknessBuffer = h.createArrayBuffer(new Float32Array(this._lineThickness), 1, this._lineThickness.length);
};

og.GeometryHandler.prototype.remove = function(geometry) {
    var index = geometry._handlerIndex;
    if (index !== -1) {
        geometry._handlerIndex = -1;
        geometry._handler = null;
        this._geometries.splice(index, 1);
        this.reindexArray(index);
        //
        //...
        //
        !this._updatedGeometry[geometry._id] && this._updatedGeometryArr.push(geometry);
        this._updatedGeometry[geometry._id] = true;
        this.refresh();
    }
};

og.GeometryHandler.prototype.reindexArray = function(startIndex) {
    var g = this._geometries;
    for (var i = startIndex; i < g.length; i++) {
        g[i]._handlerIndex = i;
    }
};
