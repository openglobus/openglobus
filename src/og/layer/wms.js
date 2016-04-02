goog.provide('og.layer.WMS');

goog.require('og.inheritance');
goog.require('og.layer.XYZ');

og.layer.WMS = function (name, options) {
    og.inheritance.base(this, name, options);
    this.layers = options.layers;
}

og.inheritance.extend(og.layer.WMS, og.layer.XYZ);

og.layer.WMS.prototype.handleSegmentTile = function (material) {
    if (this._planet.layersActivity) {
        material.imageReady = false;
        material.imageIsLoading = true;
        if (og.layer.XYZ.__requestsCounter >= og.layer.XYZ.MAX_REQUESTS && this.counter) {
            this.pendingsQueue.push(material);
        } else {
            this._exec(material);
        }
    };
};


og.layer.WMS.prototype.GetHTTPRequestString = function (segment) {
    return this.url + "wms?" + "LAYERS=" + this.layers +
            "&FORMAT=image/jpeg&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
            "&SRS=" + segment._projection.code +
            "&BBOX=" + segment.extent.getWest() + "," + segment.extent.getSouth() + "," + segment.extent.getEast() + "," + segment.extent.getNorth() +
            "&WIDTH=" + (this.width ? this.width : 256) +
            "&HEIGHT=" + (this.height ? this.height : 256);
};