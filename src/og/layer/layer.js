goog.provide('og.layer');
goog.provide('og.layer.Layer');

goog.require('og.Events');
goog.require('og.QueueArray');

og.layer.MAXIMUM_OVERLAYS = 8;

og.layer.Layer = function (name, options) {

    this.name = name || "noname";

    this.events = new og.Events();
    this.events.registerNames(og.layer.Layer.EVENT_NAMES);

    options = options || {};
    this.isBaseLayer = options.isBaseLayer || false;
    this.visibility = options.visibility || false;
    this.opacity = options.opacity || 1.0;
    this.transparentColor = options.transparentColor || [-1.0, -1.0, -1.0];

    this._planet = null;
    this._id = og.layer.__layersCounter++;
    this._attribution = options.attribution || "";
    this._zIndex = options.zIndex || 0;
};

og.layer.Layer.EVENT_NAMES = [
    "visibilitychange",
    "add",
    "remove"];

og.layer.__layersCounter = 0;

og.layer.Layer.prototype.getID = function () {
    return this._id;
};

og.layer.Layer.prototype.isEqual = function (layer) {
    return layer._id == this._id;
};

og.layer.Layer.prototype.addTo = function (planet) {
    planet.addLayer(this);
};

og.layer.Layer.prototype.remove = function () {
    this._planet && this._planet.removeLayer(this);
};

og.layer.Layer.prototype.setAttribution = function (html) {
    this._attribution = html;
    this._planet.updateAttributionsList();
};

og.layer.Layer.prototype.setZIndex = function (zIndex) {
    this._zIndex = zIndex;
    this._planet.updateVisibleLayers();
};

og.layer.Layer.prototype.getZIndex = function () {
    return this._zIndex;
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    if (visibility != this.visibility) {
        this.visibility = visibility;
        if (this.isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);
    }
};

og.layer.Layer.prototype.getVisibility = function () {
    return this.visibility;
};

og.layer.Layer.prototype.setName = function (name) {
    this.name = name;
};

og.layer.Layer.prototype.getName = function () {
    return this.name;
};