goog.provide('og.mercator');

goog.require('og.LonLat');

og.mercator.POLE = 20037508.34;

og.mercator.inverseMercator = function (x, y) {
    var lon = 180 * x / og.mercator.POLE;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / og.mercator.POLE) * Math.PI)) - Math.PI / 2);
    return new og.LonLat(lon, lat);
};

og.mercator.forwardMercator = function (lon, lat) {
    var x = lon * og.mercator.POLE / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * pole;
    return new og.LonLat(x, y);
};