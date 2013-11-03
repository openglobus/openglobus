goog.provide('og.layer');
goog.provide('og.layer.Layer');

og.layer.lonlat2tile = function (lon, lat, zoom) {
    var x = (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    var y = (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
    return [x, y];
};

og.layer.getTileExtent = function (x, y, zoom) {
    var H = Math.pow(2, zoom),
        W = Math.pow(2, zoom),
        lnSize = 360 / W,
        ltSize = 180.0 / H;

    var left = -180.0 + x * lnSize,
        top = 90 - y * ltSize,
        bottom = top - ltSize,
        right = left + lnSize;

    return [left, bottom, right, top];
};

og.layer.MAX_REQUESTS = 8;
og.layer.layersCounter = 0;
og.layer.requestsCounter = 0;
og.layer.DEFAILT_Z_INDEX = 1000;
og.layer.DEFAILT_OPACITY = 1.0;

og.layer.Layer = function (name, options) {

    og.layer.layersCount++;

    this.name = name ? name : "noname";

    if (options) {
        this.isBaseLayer = options.isBaseLayer ? options.isBaseLayer : false;
        this.numZoomLevels = options.numZoomLevels ? options.numZoomLevels : -1;
        this.url = options.url ? options.url : "";
        this.visibility = options.visibility ? options.visibility : false;
        this.opacity = options.opacity ? options.opacity : og.layer.DEFAILT_OPACITY;
        this.transparentColor = options.transparentColor ? options.transparentColor : [1.0, 1.0, 1.0];
        this.zIndex = options.zIndex ? options.zIndex : og.layer.DEFAILT_Z_INDEX;
    }

    og.layer.layersCounter++;
    this.id = og.layer.layersCounter;

    this.counter = 0;
    this.pendingsQueue = [];
};

og.layer.Layer.prototype.abortLoading = function () {
    this.pendingsQueue.length = 0;
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    this.visibility = visibility;
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