og.utils = { };

og.utils.TILE_WIDTH = 256;
og.utils.TILE_HEIGHT = 256;

og.utils.LON = 0;
og.utils.LAT = 1;

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