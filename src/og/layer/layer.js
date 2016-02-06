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

    this.opacity = options.opacity || 1.0;
    this.transparentColor = options.transparentColor || [-1.0, -1.0, -1.0];

    this._planet = null;
    this._minZoom = options.minZoom || 0;
    this._maxZoom = options.maxZoom || 50;
    this._id = og.layer.__layersCounter++;
    this._attribution = options.attribution || "";
    this._zIndex = options.zIndex || 0;
    this._isBaseLayer = options.isBaseLayer || false;
    this._visibility = options.visibility != undefined ? options.visibility : true;
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

og.layer.Layer.prototype._assignPlanet = function (planet) {
    planet.layers.push(this);
    this._planet = planet;
    this.events.on("visibilitychange", planet, planet._onLayerVisibilityChanged);
    if (this._isBaseLayer && this._visibility) {
        planet.setBaseLayer(this);
    }
    planet.events.dispatch(planet.events.layeradd, this);
    this.events.dispatch(this.events.add, planet);
    planet.updateVisibleLayers();
};

og.layer.Layer.prototype.addTo = function (planet) {
    this._assignPlanet(planet);
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

og.layer.Layer.prototype.isBaseLayer = function () {
    return this._isBaseLayer;
};

og.layer.Layer.prototype.setBaseLayer = function (flag) {
    this._isBaseLayer = flag;

    if (this._planet && !flag && this.isEqual(this._planet.baseLayer)) {
        this._planet.baseLayer = null;
    }

    this._planet.updateVisibleLayers();
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    if (visibility != this._visibility) {
        this._visibility = visibility;
        if (this._isBaseLayer && visibility) {
            this._planet.setBaseLayer(this);
        }
        this._planet.updateVisibleLayers();
        this.events.dispatch(this.events.visibilitychange, this);
    }
};

og.layer.Layer.prototype.getVisibility = function () {
    return this._visibility;
};

og.layer.Layer.prototype.setName = function (name) {
    this.name = name;
};

og.layer.Layer.prototype.getName = function () {
    return this.name;
};