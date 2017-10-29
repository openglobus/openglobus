goog.provide('og.gmx.Item');

/**
 * Represents geomixer item. Stores item attributes.
 * @class
 */
og.gmx.Item = function (id, options) {
    options = options || {};

    this.id = id;
    this.attributes = options.attributes || {};
    this.version = options.version || -1;

    this._layer = null;
    this._style = options.style || {};
};

og.gmx.Item.prototype.addTo = function (layer) {
    layer.addItem(this);
};