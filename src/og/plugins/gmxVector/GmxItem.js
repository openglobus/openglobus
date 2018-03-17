/**
 * @module og/gmx/GmxItem
 */

'use strict';

import * as utils from '../../utils/shared.js';

/**
 * Represents geomixer item. Stores item attributes.
 * @class
 * @param {Number} id - Geomixer item id like gmx_id.
 * @param {Object} options - Item additional options:
 * @param {Object} options.attributes - Item attributes.
 * @param {Object} options.style - Item rendering style.
 * @param {Number} options.version - Item version.
 */
const GmxItem = function (id, options) {
    options = options || {};

    this.id = id;
    this.attributes = options.attributes || {};
    this.version = options.version || -1;

    this._layer = null;
    this._style = options.style || {};

    this._pickingColor = null;

    this._pickingReady = false;

    this._extent = null;
};

GmxItem.prototype.addTo = function (layer) {
    layer.addItem(this);
};

GmxItem.prototype.getExtent = function () {
    return this._extent.clone();
};

GmxItem.prototype.setStyle = function (style) {
    var s = this._style;
    for (var i in style) {
        s[i] = style[i];
    }
    this._layer && this._layer.updateItem(this);
};

GmxItem.prototype.bringToFront = function () {
    this._pickingReady = false;
    //
    //...
    //
};

GmxItem.prototype.setZIndex = function (zIndex) {
    this._pickingReady = false;
    this._style.zIndex = zIndex;
    this._layer && this._layer.updateItem(this);
};

GmxItem.prototype.setFillColor = function (r, g, b, a) {
    var c = this._style.fillColor;
    if (c.w === 0.0 && a !== 0.0 || c.w !== 0.0 && a === 0.0) {
        this._pickingReady = false;
    }
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

GmxItem.prototype.setFillColor4v = function (color) {
    this.setFillColor(color.x, color.y, color.z, color.w);
};

GmxItem.prototype.setFillColorHTML = function (color) {
    var c = utils.htmlColorToRgba(color);
    this.setFillColor(c.x, c.y, c.z, c.w);
};

GmxItem.prototype.setLineColor = function (r, g, b, a) {
    var c = this._style.lineColor;
    if (c.w === 0.0 && a !== 0.0 || c.w !== 0.0 && a === 0.0) {
        this._pickingReady = false;
    }
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

GmxItem.prototype.setLineColor4v = function (color) {
    this.setLineColor(color.x, color.y, color.z, color.w);
};

GmxItem.prototype.setLineColorHTML = function (color) {
    var c = og.utils.htmlColorToRgba(color);
    this.setLineColor(c.x, c.y, c.z, c.w);
};

GmxItem.prototype.setStrokeColor = function (r, g, b, a) {
    var c = this._style.strokeColor;
    if (c.w === 0.0 && a !== 0.0 || c.w !== 0.0 && a === 0.0) {
        this._pickingReady = false;
    }
    c.x = r;
    c.y = g;
    c.z = b;
    (a !== null) && (c.w = a);
    this._layer && this._layer.updateItem(this);
};

GmxItem.prototype.setStrokeColor4v = function (color) {
    this.setLineColor(color.x, color.y, color.z, color.w);
};

GmxItem.prototype.setStrokeColorHTML = function (color) {
    var c = og.utils.htmlColorToRgba(color);
    this.setStrokeColor(c.x, c.y, c.z, c.w);
};

GmxItem.prototype.setLineWidth = function (v) {
    this._style.lineWidth = v;
};

GmxItem.prototype.setStrokeWidth = function (v) {
    this._style.strokeWidth = v;
};

export { GmxItem };