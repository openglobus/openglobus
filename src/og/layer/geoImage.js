goog.provide('og.layer.GeoImage');

goog.require('og.layer.Layer');

/**
 * Used to load and display a single image over specific corner coordinates on the globe, implements og.layer.Layer interface.
 * @class
 */
og.layer.GeoImage = function (name, options) {
    og.inheritance.base(this, name, options);
};

og.inheritance.extend(og.layer.GeoImage, og.layer.Layer);

og.layer.GeoImage.prototype.handleSegmentTile = function (material) {
    if (this._planet.layersActivity) {
    }
};


og.layer.GeoImage.prototype.getTexCoordsOffset = function (segment) {
    var v0s = segment.getLayerExtent(this);
    var v0t = segment.extent;
    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};