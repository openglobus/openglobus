goog.provide('og.mercator');

og.mercator.POLE = 20037508.34;

og.mercator.forward_lon = function (lon) {
    return lon * og.mercator.POLE / 180;
};

og.mercator.forward_lat = function (lat) {
    return Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * og.mercator.POLE;
};

og.mercator.inverse_lon = function (lon) {
    return 180 * lon / og.mercator.POLE;
};

og.mercator.inverse_lat = function (lat) {
    return 180 / Math.PI * (2 * Math.atan(Math.exp((lat / og.mercator.POLE) * Math.PI)) - Math.PI / 2);
};

og.mercator.getTileX = function (lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

og.mercator.getTileY = function (lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

og.mercator.forwardArray = function (lonlatArr) {
    var res = [];
    for (var i = 0; i < lonlatArr.length; i++) {
        res.push(lonlatArr[i].forwardMercator());
    }
    return res;
};

og.mercator.MAX_LAT = og.mercator.inverse_lat(og.mercator.POLE);
og.mercator.MIN_LAT = -og.mercator.MAX_LAT;
