goog.provide('og.layer');
goog.provide('og.layer.Layer');

og.layer.MapServers = {
    "MapQuest": { url: "http://otile1.mqcdn.com/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "MapQuestSat": { url: "http://otile1.mqcdn.com/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "GoogleMap": { url: "http://mt1.google.com/vt/lyrs=m&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleTerrain": { url: "http://mt1.google.com/vt/lyrs=p&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleSat": { url: "http://mt1.google.com/vt/lyrs=s&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleHibrid": { url: "http://mt1.google.com/vt/lyrs=y&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "OSM": { url: "http://a.tile.openstreetmap.org/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "OSMb": { url: "http://b.tile.opencyclemap.org/cycle/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "ArcGISWorldImagery": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "ArcGISWorldStreetMap": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "ArcGISNatGeo": { url: "http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{zoom}/{tilx}/{tiley}", maxZoom: -1 },
    "Cosmosnimki": { url: "http://maps.kosmosnimki.ru/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", maxZoom: -1 }
};

og.layer.MapServersProxy = {
    "MapQuest": { url: "http://127.0.0.1/tiles/1.0.0/map/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "MapQuestSat": { url: "http://127.0.0.1/tiles/1.0.0/sat/{zoom}/{tilex}/{tiley}.jpg", maxZoom: -1 },
    "GoogleMap": { url: "http://mt1.google.com/vt/lyrs=m&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleTerrain": { url: "http://mt1.google.com/vt/lyrs=p&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleSat": { url: "http://mt1.google.com/vt/lyrs=s&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "GoogleHibrid": { url: "http://mt1.google.com/vt/lyrs=y&hl=ru&x={tilex}&y={tiley}&z={zoom}", maxZoom: -1 },
    "OSM": { url: "http://127.0.0.1/osm/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "OSMb": { url: "http://127.0.0.1/osmb/cycle/{zoom}/{tilex}/{tiley}.png", maxZoom: -1 },
    "ArcGISWorldImagery": { url: "http://127.0.0.1/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "ArcGISWorldStreetMap": { url: "http://127.0.0.1/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "ArcGISNatGeo": { url: "http://127.0.0.1/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{zoom}/{tiley}/{tilex}", maxZoom: -1 },
    "Cosmosnimki": { url: "http://127.0.0.1/TileService.ashx?Request=gettile&apikey=L5VW1QBBHJ&layerName=4F9F7CCCCBBC4BD08469F58C02F17AE4&crs=epsg:3857&z={zoom}&x={tilex}&y={tiley}", maxZoom: -1 }
};

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
        this.visibility = options.visibility ? options.visibility : false;
    }

    og.layer.Layer.layersCounter++;
    this.id = og.layer.Layer.layersCounter;

    this.counter = 0;
    this.pendingsQueue = [];
    this.MAX_LOADING_TILES = 10;
};

og.layer.Layer.layersCounter = 0;

og.layer.Layer.prototype.abortLoading = function () {
    this.pendingsQueue.length = 0;
};

og.layer.Layer.prototype.setVisibility = function (visibility) {
    this.setVisibility = visibility;
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