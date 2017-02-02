goog.provide('og.Geometry');

goog.require('og.Extent');

og.Geometry = function(options) {
    options = options || {};
    options.style = options.style || {};

    /**
     * Entity instance that holds this geometry.
     * @protected
     * @type {og.Entity}
     */
    this._entity = null; //this._entity._vectorLayer._geometryHandler

    this._handler = null;

    this._type = options.type && og.Geometry.getType(options.type) || og.Geometry.POINT;
    this._coordinates = [];
    this._extent = og.Geometry.getExtent({
        'type': options.type || "Point",
        'coordinates': options.coordinates || []
    }, this._coordinates);

    this._style = options.style || {};
    this._style.fillStyle = options.style.fillStyle || 'blue';
    this._style.lineWidth = options.style.lineWidth || 3;
    this._style.strokeStyle = options.style.strokeStyle || 'darkblue';

    this._visibility = options.visibility || true

    this._handlerIndex = -1;
};

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

og.Geometry.prototype.setStyle = function(style) {
    this._style = style;
    return this;
};

og.Geometry.prototype.setVisibility = function(visibility) {
    this._visibility = visibility;
    return this;
};

og.Geometry.prototype.remove = function() {

};

og.Geometry.prototype.getExtent = function() {
    return this._extent.clone();
};

og.Geometry.prototype.getType = function() {
    return this._type;
};

og.Geometry.prototype.getFillColorRGBA = function() {
    return og.utils.htmlColorToRgba(this._style.fillStyle);
};
