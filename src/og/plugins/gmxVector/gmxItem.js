goog.provide('og.gmx.Item');

goog.require('og.utils');

/**
 * Represents geomixer item. Stores item attributes.
 * @class
 * @param {Number} id - Geomixer item id like gmx_id.
 * @param {Object} options - Item additional options:
 * @param {Object} options.attributes - Item attributes.
 * @param {Object} options.style - Item rendering style.
 * @param {Number} options.version - Item version.
 */
og.gmx.Item = function (id, options) {
    options = options || {};

    this.id = id;
    this.attributes = options.attributes || {};
    this.version = options.version || -1;

    this._layer = null;
    this._style = options.style || {};

    this._pickingColor = null;

    this._extent = null;
};

og.gmx.Item.prototype.addTo = function (layer) {
    layer.addItem(this);
};

og.gmx.Item.prototype.getExtent = function () {
    return this._extent.clone();
};

og.gmx.Item.prototype.setStyle = function (style) {
    var s = this._style;
    for (var i in style) {
        s[i] = style[i];
    }
    this._layer && this._layer.updateItem(this);
};

og.gmx.Item.prototype.setFillColor = function (r, g, b, a) {
    var c = this._style.fillColor;
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

og.gmx.Item.prototype.setFillColor4v = function (color) {
    this.setFillColor(color.x, color.y, color.z, color.w);
};

og.gmx.Item.prototype.setFillColorHTML = function (color) {
    var c = og.utils.htmlColorToRgba(color);
    this.setFillColor(c.x, c.y, c.z, c.w);
};

og.gmx.Item.prototype.setLineColor = function (r, g, b, a) {
    var c = this._style.lineColor;
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

og.gmx.Item.prototype.setLineColor4v = function (color) {
    this.setLineColor(color.x, color.y, color.z, color.w);
};

og.gmx.Item.prototype.setLineColorHTML = function (color) {
    var c = og.utils.htmlColorToRgba(color);
    this.setLineColor(c.x, c.y, c.z, c.w);
};

og.gmx.Item.prototype.setStrokeColor = function (r, g, b, a) {
    var c = this._style.strokeColor;
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

og.gmx.Item.prototype.setStrokeColor4v = function (color) {
    this.setLineColor(color.x, color.y, color.z, color.w);
};

og.gmx.Item.prototype.setStrokeColorHTML = function (color) {
    var c = og.utils.htmlColorToRgba(color);
    this.setStrokeColor(c.x, c.y, c.z, c.w);
};

og.gmx.Item.prototype.setLineWidth = function (v) {
    this._style.lineWidth = v;
};

og.gmx.Item.prototype.setStrokeWidth = function (v) {
    this._style.strokeWidth = v;
};