goog.provide('og.Geometry');

goog.require('og.Extent');
goog.require('og.utils');
goog.require('og.math.Vector4');
goog.require('og.LonLat');

og.Geometry = function(options) {
    this._id = og.Geometry.__staticCounter++;

    options = options || {};
    options.style = options.style || {};

    /**
     * Entity instance that holds this geometry.
     * @protected
     * @type {og.Entity}
     */
    this._entity = null;

    this._handler = null;
    this._handlerIndex = -1;

    //Polygon
    this._polyVerticesLength = -1;
    this._polyIndexesLength = -1;
    this._polyVerticesHandlerIndex = -1;
    this._polyIndexesHandlerIndex = -1;

    //Line(Linestring and polygon's stroke(s)
    this._lineVerticesLength = -1;
    this._lineOrdersLength = -1;
    this._lineIndexesLength = -1;
    this._lineThicknessLength = -1;
    this._lineVerticesHandlerIndex = -1;
    this._lineOrdersHandlerIndex = -1;
    this._lineIndexesHandlerIndex = -1;
    this._lineThicknessHandlerIndex = -1;

    this._type = options.type && og.Geometry.getType(options.type) || og.Geometry.POINT;
    this._coordinates = [];
    this._extent = og.Geometry.getExtent({
        'type': options.type || "Point",
        'coordinates': options.coordinates || []
    }, this._coordinates);

    this._style = options.style || {};
    this._style.fillColor = og.utils.createColorRGBA(options.style.fillColor, new og.math.Vector4(0, 0, 1, 0.5));
    this._style.lineColor = og.utils.createColorRGBA(options.style.lineColor, new og.math.Vector4(0, 0, 1, 1));
    this._style.strokeColor = og.utils.createColorRGBA(options.style.strokeColor, new og.math.Vector4(1, 1, 1, 0.95));
    this._style.lineWidth = options.style.lineWidth || 3;
    this._style.strokeWidth = options.style.strokeWidth || 0;

    this._visibility = options.visibility || true
};

og.Geometry.__staticCounter = 0;

og.Geometry.POINT = 1;
og.Geometry.LINESTRING = 2;
og.Geometry.POLYGON = 3;
og.Geometry.MULTIPOLYGON = 4;

og.Geometry.getType = function(typeStr) {
    return og.Geometry[typeStr.toUpperCase()];
};

/**
 * Returns geometry feature extent.
 @static
 @param {Object} geometryObj - GeoJSON style geometry feature.
 @param {Array} outoordinates - Geometry feature coordinates clone.
 @returns {og.Extent}
 */
og.Geometry.getExtent = function(geometryObj, outCoordinates) {
    var res = new og.Extent(new og.LonLat(180.0, 90.0), new og.LonLat(-180.0, -90.0));
    var t = og.Geometry.getType(geometryObj.type);
    if (t === og.Geometry.POINT) {
        var lon = res.coordinates[0],
            lat = res.coordinates[1];
        res.southWest.lon = lon;
        res.southWest.lat = lat;
        res.northEast.lon = lon;
        res.northEast.lat = lat;
        outCoordinates && (outCoordinates[0] = lon) && (outCoordinates[1] = lat);
    } else if (t === og.Geometry.LINESTRING) {
        var c = geometryObj.coordinates;
        for (var i = 0; i < c.length; i++) {
            var lon = c[i][0],
                lat = c[i][1];
            if (lon < res.southWest.lon) res.southWest.lon = lon;
            if (lat < res.southWest.lat) res.southWest.lat = lat;
            if (lon > res.northEast.lon) res.northEast.lon = lon;
            if (lat > res.northEast.lat) res.northEast.lat = lat;
            outCoordinates && (outCoordinates[i] = [lon, lat]);
        }
    } else if (t === og.Geometry.POLYGON) {
        var c = geometryObj.coordinates;
        for (var i = 0; i < c.length; i++) {
            var ci = c[i];
            outCoordinates && (outCoordinates[i] = []);
            for (var j = 0; j < ci.length; j++) {
                var cij = ci[j];
                var lon = cij[0],
                    lat = cij[1];
                if (lon < res.southWest.lon) res.southWest.lon = lon;
                if (lat < res.southWest.lat) res.southWest.lat = lat;
                if (lon > res.northEast.lon) res.northEast.lon = lon;
                if (lat > res.northEast.lat) res.northEast.lat = lat;
                outCoordinates && (outCoordinates[i][j] = [lon, lat]);
            }
        }
    } else if (t === og.Geometry.MULTIPOLYGON) {
        var p = geometryObj.coordinates;
        for (var i = 0; i < p.length; i++) {
            var pi = p[i];
            outCoordinates && (outCoordinates[i] = []);
            for (var j = 0; j < pi.length; j++) {
                var pij = pi[j];
                outCoordinates && (outCoordinates[i][j] = []);
                for (var k = 0; k < pij.length; k++) {
                    var pijk = pij[k];
                    var lon = pijk[0],
                        lat = pijk[1];
                    if (lon < res.southWest.lon) res.southWest.lon = lon;
                    if (lat < res.southWest.lat) res.southWest.lat = lat;
                    if (lon > res.northEast.lon) res.northEast.lon = lon;
                    if (lat > res.northEast.lat) res.northEast.lat = lat;
                    outCoordinates && (outCoordinates[i][j][k] = [lon, lat]);
                }
            }
        }
    } else {
        res.southWest.lon = res.southWest.lat = res.northEast.lon = res.northEast.lat = 0.0;
        outCoordinates && (outCoordinates[0] = lon) && (outCoordinates[1] = lat);
    }
    return res;
};

/**
 */
og.Geometry.prototype.setGeometry = function(geometryObj) {
    this._type = og.Geometry.getType(geometryObj.type || "Point");
    this._extent = og.Geometry.getExtent(geometryObj, this._coordinates);
    return this;
};

og.Geometry.prototype.setFillColor = function(r, g, b, a) {
    var c = this._style.fillColor;
    c.x = r;
    c.y = g;
    c.z = b;
    c.w = a;
    this._handler && this._handler.setPolyColorArr(this, c);
    return this;
};

og.Geometry.prototype.setFillColor4v = function(rgba) {
    return this.setFillColor(rgba.x, rgba.y, rgba.z, rgba.w);
};

og.Geometry.prototype.setStrokeColor = function(r,g,b,a){
    var c = this._style.strokeColor;
    c.x = r;
    c.y = g;
    c.z = b;
    c.w = a;
    this._handler && this._handler.setStrokeColorArr(this, c);
    return this;
};

og.Geometry.prototype.setLineColor = function(r,g,b,a){
    var c = this._style.lineColor;
    c.x = r;
    c.y = g;
    c.z = b;
    c.w = a;
    this._handler && this._handler.setLineColorArr(this, c);
    return this;
};

og.Geometry.prototype.setStrokeColor4v = function(rgba){
    return this.setStrokeColor(rgba.x, rgba.y, rgba.z, rgba.w);
};

og.Geometry.prototype.setLineColor4v = function(rgba){
    return this.setLineColor(rgba.x, rgba.y, rgba.z, rgba.w);
};

og.Geometry.prototype.setStrokeOpacity = function(opacity){
    var c = this._style.strokeColor;
    c.w = opacity;
    return this.setStrokeColor(c.x, c.y, c.z, opacity);
};

og.Geometry.prototype.setLineOpacity = function(opacity){
    var c = this._style.lineColor;
    c.w = opacity;
    return this.setLineColor(c.x, c.y, c.z, opacity);
};

og.Geometry.prototype.setStrokeWidth = function(width){
    this._style.strokeWidth = width;
    this._handler && this._handler.setStrokeThicknessArr(this, width);
    return this;
};

og.Geometry.prototype.setLineWidth = function(width){
    this._style.lineWidth = width;
    this._handler && this._handler.setLineThicknessArr(this, width);
    return this;
};

og.Geometry.prototype.setFillOpacity = function(opacity) {
    var c = this._style.fillColor;
    c.w = opacity;
    this._handler && this._handler.setPolyColorArr(this, c);
    return this;
};

og.Geometry.prototype.setVisibility = function(visibility) {
    this._visibility = visibility;
    //...
    return this;
};

og.Geometry.prototype.remove = function() {
    //...
};

og.Geometry.prototype.getExtent = function() {
    return this._extent.clone();
};

og.Geometry.prototype.getType = function() {
    return this._type;
};
