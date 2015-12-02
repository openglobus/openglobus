goog.provide('og.layer');
goog.provide('og.layer.Layer');

goog.require('og.Events');
goog.require('og.QueueArray');

og.layer.MAX_OVERLAYS = 8;
og.layer.MAX_REQUESTS = 7;
og.layer.layersCounter = 0;
og.layer.requestsCounter = 0;
og.layer.DEFAILT_Z_INDEX = 0;
og.layer.DEFAILT_OPACITY = 1.0;

og.layer.Layer = function (name, options) {

    this.name = name ? name : "noname";
    this.planet = null;

    this.events = new og.Events();
    this.events.registerNames([
        "onload",
        "onloadend",
        "onvisibilitychanged",
        "onadded",
        "onremoved"]);

    options = options || {};
    this.isBaseLayer = options.isBaseLayer || false;
    this.numZoomLevels = options.numZoomLevels || -1;
    this.visibility = options.visibility || false;
    this.opacity = options.opacity || og.layer.DEFAILT_OPACITY;
    this.transparentColor = options.transparentColor || [-1.0, -1.0, -1.0];
    this.zIndex = options.zIndex || og.layer.DEFAILT_Z_INDEX;
    this._attribution = options.attribution || "";
    this.url = options.url || "";

    this.id = og.layer.layersCounter++;

    this.counter = 0;
    this.pendingsQueue = new og.QueueArray();
};

og.layer.Layer.prototype.addTo = function (planet) {
    planet.addLayer(this);
};

og.layer.Layer.prototype.remove = function () {
    this.planet && this.planet.removeLayer(this);
};

og.layer.Layer.prototype.setAttribution = function (html) {
    this._attribution = html;
    this.planet.updateAttributionsList();
};

og.layer.Layer.prototype.clone = function () {
    //...
    //TODO: clone function is very important!
    //..
};

og.layer.Layer.prototype.setZIndex = function (zIndex) {
    this.zIndex = zIndex;
    this.planet.updateVisibleLayers();
};

og.layer.Layer.prototype.abortLoading = function () {
    var q = this.pendingsQueue;
    for (var i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
        if (q._array[i]) {
            q._array[i].abortLoading();
        }
    }
    this.pendingsQueue.clear();
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    if (this.isBaseLayer && visibility) {
        this.planet.setBaseLayer(this);
    } else if (!visibility) {
        this.abortLoading();
    }
    if (visibility != this.visibility) {
        this.events.dispatch(this.events.onvisibilitychanged, this);
        this.visibility = visibility;
        this.planet.updateVisibleLayers();
    }
};

og.layer.Layer.prototype.getVisibility = function () {
    return this.visibility;
};

og.layer.replaceTemplate = function (template, params) {
    return template.replace(/{[^{}]+}/g, function (key) {
        return params[key.replace(/[{}]+/g, "")] || "";
    });
};

og.layer.Layer.prototype.setUrl = function (url) {
    this.url = url;
};

og.layer.Layer.prototype.setName = function (name) {
    this.name = name;
};