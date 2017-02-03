goog.provide('og.GeometryHandler');

goog.require('og.utils.earcut');
goog.require('og.Geometry');

og.GeometryHandler = function() {
    this.__staticId = og.GeometryHandler.staticCounter++;

    this._handler = null;

    this._geometries = [];

    this._polyVertices = [];
    this._polyColors = [];
    this._polyIndexes = [];

    this._polyVerticesBuffer = null;
    this._polyColorsBuffer = null;

    this._buffersUpdateCallbacks = [];
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYVERTICES_BUFFER] = this.createPolyVerticesBuffer;
    this._buffersUpdateCallbacks[og.GeometryHandler.POLYCOLORS_BUFFER] = this.createPolyColorsBuffer;

    this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
};

og.GeometryHandler.staticCounter = 0;

og.GeometryHandler.POLYVERTICES_BUFFER = 0;
og.GeometryHandler.POLYCOLORS_BUFFER = 1;

og.GeometryHandler.prototype.assignHandler = function(handler) {
    this._handler = handler;
    this.refresh();
};

/**
 * @public
 * @param {og.Geometry} geometry - Geometry object.
 */
og.GeometryHandler.prototype.add = function(geometry) {
    if (geometry._handlerIndex == -1) {
        geometry._handler = this;
        geometry._handlerIndex = this._geometries.length;
        this._geometries.push(geometry);

        if (geometry._type === og.Geometry.POLYGON) {
            var data = og.utils.earcut.flatten(geometry._coordinates);
            this._polyVertices.push.apply(this._polyVertices, data.vertices);
            this._polyIndexes.push.apply(this._polyIndexes, og.utils.earcut(data.vertices, data.holes, 2));
            var color = geometry.getFillColorRGBA();
            for (var i = 0; i < data.vertices.length / 2; i++) {
                this._polyColors.push(color.x, color.y, color.z, color.w);
            }

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
            var color = geometry.getFillColorRGBA();
            for (var i = 0; i < vertices.length / 2; i++) {
                this._polyColors.push(color.x, color.y, color.z, color.w);
            }
            this._polyVertices.push.apply(this._polyVertices, vertices);
            this._polyIndexes.push.apply(this._polyIndexes, indexes);

        }

        this.refresh();
    }
};

og.GeometryHandler.prototype.refresh = function() {
    var i = this._changedBuffers.length;
    while (i--) {
        this._changedBuffers[i] = true;
    }
};

og.GeometryHandler.prototype.update = function() {
    if (this._handler) {
        var i = this._changedBuffers.length;
        while (i--) {
            if (this._changedBuffers[i]) {
                this._buffersUpdateCallbacks[i].call(this);
                this._changedBuffers[i] = false;
            }
        }
    }
};

og.GeometryHandler.prototype.setPolyColorArr = function(index, color) {
    //
    //...
    //
    this._changedBuffers[og.GeometryHandler.POLYCOLORS_BUFFER] = true;
};

og.GeometryHandler.prototype.setPolyVerticesArr = function(index, vertices) {
    //
    //...
    //
    this._changedBuffers[og.GeometryHandler.POLYVERTICES_BUFFER] = true;
};

og.GeometryHandler.prototype.createPolyVerticesBuffer = function() {
    var h = this._handler;
    h.gl.deleteBuffer(this._polyVerticesBuffer);
    this._polyVerticesBuffer = h.createArrayBuffer(new Float32Array(this._polyVertices), 2, this._polyVertices.length / 2);
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
    }
};

og.GeometryHandler.prototype.reindexArray = function(startIndex) {
    var g = this._geometries;
    for (var i = startIndex; i < g.length; i++) {
        g[i]._handlerIndex = i;
    }
};

og.GeometryHandler.prototype.collect = function(segment) {
    return this._polyIndexes;
};
