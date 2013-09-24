goog.provide('og.geo');

og.geo.LON = 0;
og.geo.LAT = 1;

og.geo.inverseMercator = function (x, y) {
    var pole = 20037508.34;
    var lon = 180 * x / pole;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / pole) * Math.PI)) - Math.PI / 2);
    return [lon, lat];
};

og.geo.forwardMercator = function (lon, lat) {
    var pole = 20037508.34;
    var x = lon * pole / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * pole;
    return [x, y];
};
