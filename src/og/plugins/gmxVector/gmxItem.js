goog.provide('og.gmx.Item');

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

    this._renderedBounds = null;
};

og.gmx.Item.prototype.addTo = function (layer) {
    layer.addItem(this);
};

og.gmx.Item.prototype.setStyle = function(style){
    this._style = style;
    this._layer && this._layer.updateItem(this);
};