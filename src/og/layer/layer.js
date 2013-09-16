og.layer = { };

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