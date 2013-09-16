og.utils = { };

og.utils.TILE_WIDTH = 256;
og.utils.TILE_HEIGHT = 256;

og.utils.LON = 0;
og.utils.LAT = 1;

og.utils.lonlat2tile = function (lon, lat, zoom) {
    var x = (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    var y = (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
    return [x, y];
};


og.utils.inverseMercator = function (x, y) {
    var pole = 20037508.34;
    var lon = 180 * x / pole;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / pole) * Math.PI)) - Math.PI / 2);
    return [lon, lat];
};

og.utils.forwardMercator = function (lon, lat) {
    var pole = 20037508.34;
    var x = lon * pole / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * pole;
    return [x, y];
};

og.utils.getMapquestTile = function (params, callback) {
    var img = new Image();
    var handle = this;
    img.onload = function () {
        callback.call(params.sender ? params.sender : handle, this);
    }
    img.src = "http://127.0.0.1/tiles/1.0.0/map/" + params.zoom + "/" + params.tilex + "/" + params.tiley + ".jpg";
};

og.utils.getMapWMS = function (url, params, callback) {
    var img = new Image();
    var handle = this;
    img.onload = function () {
        callback.call(params.sender ? params.sender : handle, this);
    }
    img.src = url + "wms?" + "LAYERS=" + params.layers +
    "&FORMAT=image/jpeg&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
    "&SRS=" + (params.srs ? params.srs : "EPSG:4326") +
    "&BBOX=" + params.bbox + "&WIDTH=" + (params.width ? params.width : Utils.TILE_WIDTH) +
    "&HEIGHT=" + (params.height ? params.height : Utils.TILE_HEIGHT);
};

og.utils.getTileExtent = function (x, y, zoom) {
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

