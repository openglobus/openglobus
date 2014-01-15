goog.provide('og.LonLat');

og.LonLat = function (lon, lat, height) {
    this.lon = lon || 0;
    this.lat = lat || 0;
    this.height = height || 0;
};

og.LonLat.createFromArray = function (arr) {
    return new og.LonLat(arr[0], arr[1], arr[2]);
};

og.LonLat.prototype.clone = function () {
    return new og.LonLat(this.lon, this.lat, this.height);
};

og.LonLat.prototype.toTile = function (zoom) {
    return {
        x: (Math.floor((this.lon + 180) / 360 * Math.pow(2, zoom))),
        y: (Math.floor((1 - Math.log(Math.tan(this.lat * Math.PI / 180) + 1 / Math.cos(this.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
    };
};