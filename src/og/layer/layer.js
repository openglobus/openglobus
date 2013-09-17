og.layer = { };

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

og.layer.Layer = function (name, options) {
    this.name = name ? name : "noname";

    if (options) {
        this.isBaseLayer = options.isBaseLayer ? options.isBaseLayer : false;
        this.numZoomLevels = options.numZoomLevels ? options.numZoomLevels : -1;
        this.url = options.url ? options.url : "";
        this.visibility = options.visibility ? options.visibility : true;
    }

    og.layer.Layer.layersCounter++;
    this.id = og.layer.Layer.layersCounter;

    this.counter = 0;
    this.pendingsQueue = [];
    this.MAX_LOADING_TILES = 10;
};

og.layer.Layer.layersCounter = 0;

og.layer.Layer.prototype.setVisibility = function (visibility) {
    this.setVisibility = visibility;
}

og.layer.replaceTemplate = function (template, params) {
    return template.replace(/{[^{}]+}/g, function (key) {
        return params[key.replace(/[{}]+/g, "")] || "";
    });
}

og.layer.Layer.prototype.setUrl = function (url) {
    this.url = url;
}

og.layer.Layer.prototype.setName = function (name) {
    this.name = name;
}