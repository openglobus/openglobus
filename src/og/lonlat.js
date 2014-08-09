goog.provide('og.LonLat');

goog.require('og.mercator');

og.LonLat = function (lon, lat, height) {
    this.lon = lon || 0;
    this.lat = lat || 0;
    this.height = height || 0;
};

og.LonLat.prototype.set = function (lon, lat, height) {
    this.lon = lon;
    this.lat = lat;
    this.height = height;
    return this;
};

og.LonLat.createFromArray = function (arr) {
    return new og.LonLat(arr[0], arr[1], arr[2]);
};

og.LonLat.prototype.clone = function () {
    return new og.LonLat(this.lon, this.lat, this.height);
};

og.LonLat.forwardMercator = function (lon, lat) {
    var x = lon * og.mercator.POLE / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * og.mercator.POLE;
    return new og.LonLat(x, y);
};

og.LonLat.inverseMercator = function (x, y) {
    var lon = 180 * x / og.mercator.POLE;
    var lat = 180 / Math.PI * (2 * Math.atan(Math.exp((y / og.mercator.POLE) * Math.PI)) - Math.PI / 2);
    return new og.LonLat(lon, lat);
};

og.LonLat.prototype.forwardMercator = function () {
    return og.LonLat.forwardMercator(this.lon, this.lat);
};

og.LonLat.prototype.inverseMercator = function () {
    return og.LonLat.inverseMercator(this.lon, this.lat);
};
