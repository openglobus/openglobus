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

    this._polyVertices = [];
    this._polyColors = [];
    this._polyIndexes = [];

    this._lineVertices = [];
    this._lineColors = [];
    this._lineThickness = [];
    this._lineOrders = [];

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

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.GeometryHandler.staticCounter = 0;

og.GeometryHandler.POLYVERTICES_BUFFER = 0;
og.GeometryHandler.POLYCOLORS_BUFFER = 1;

og.GeometryHandler.createLineRingData = function(pathArr, color, thickness) {
    var index = 0;
    var t = thickness,
        c = color;
    var _lineVertices = [],
        _lineOrders = [],
        _lineThickness = [],
        _lineIndexes = [];

    for (var j = 0; j < pathArr.length; j++) {
        var path = pathArr[j];
        var startIndex = index;
        var last = path[path.length - 1];
        var prev = last;
        _lineVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        _lineOrders.push(1, -1, 2, -2);
        _lineThickness.push(t, t, t, t);
        _lineColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            _lineVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            _lineOrders.push(1, -1, 2, -2);
            _lineThickness.push(t, t, t, t);
            _lineColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
            _lineIndexes.push(index++, index++, index++, index++);
        }

        var first = path[0];
        _lineVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        _lineOrders.push(1, -1, 2, -2);
        _lineThickness.push(t, t, t, t);
        _lineColors.push(c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3], c[0], c[1], c[2], c[3]);
        _lineIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);

        if (j < pathArr.length - 1) {
            _lineIndexes.push(index + 8, index + 8);
            index += 8;
        }
    }

    return {
        'vertices': _lineVertices,
        'colors': _lineColors,
        'thickness': _lineThickness,
        'indexes': _lineIndexes,
        'orders': _lineOrders
    };
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

            geometry._polyVertices = data.vertices;
            geometry._polyIndexes = indexes;

            //Creates polygon stroke data
            var ringData = og.GeometryHandler.createLineRingData(geometry._coordinates[i],
                geometry._style.strokeColor, geometry._style.strokeWidth);
            //...
            //

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

            geometry._polyVertices = vertices;
            geometry._polyIndexes = indexes;
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
        size = index + geometry._polyVertices.length * 2; // ... / 2 * 4
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
    if (vertices.length === geometry._polyVertices.length && indexes.length === geometry._polyIndexes.length) {

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
