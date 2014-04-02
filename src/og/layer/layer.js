goog.provide('og.layer');
goog.provide('og.layer.Layer');

goog.require('og.Events');

og.layer.MAX_OVERLAYS = 8;
og.layer.MAX_REQUESTS = 10;
og.layer.layersCounter = 0;
og.layer.requestsCounter = 0;
og.layer.DEFAILT_Z_INDEX = 0;
og.layer.DEFAILT_OPACITY = 1.0;

og.layer.Layer = function (name, options) {

    this.name = (name ? name : "noname");
    this.planet = null;

    this.events = new og.Events();
    this.events.registerNames(["onload", "onloadend"]);

    if (options) {
        this.isBaseLayer = options.isBaseLayer ? options.isBaseLayer : false;
        this.numZoomLevels = options.numZoomLevels ? options.numZoomLevels : -1;
        this.url = options.url ? options.url : "";
        this.visibility = options.visibility ? options.visibility : false;
        this.opacity = options.opacity ? options.opacity : og.layer.DEFAILT_OPACITY;
        this.transparentColor = options.transparentColor ? options.transparentColor : [1.0, 1.0, 1.0];
        this.zIndex = options.zIndex ? options.zIndex : og.layer.DEFAILT_Z_INDEX;
    }

    this.counter = 0;
    this.pendingsQueue = [];
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
    this.pendingsQueue.length = 0;
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    if (this.isBaseLayer && visibility) {
        this.planet.setBaseLayer(this);
    }
    this.visibility = visibility;
    this.planet.updateVisibleLayers();
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