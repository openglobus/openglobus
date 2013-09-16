og.layer.WMS = function (name, options) {
    og.layer.WMS.superclass.constructor.call(this, name, options);
    this.layers = options.layers;
}

og._class_.extend(og.layer.WMS, og.layer.XYZ);

og.layer.WMS.prototype.GetHTTPRequestString = function (segment) {
    return this.url + "wms?" + "LAYERS=" + this.layers +
            "&FORMAT=image/jpeg&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
            "&SRS=" + "EPSG:900913" +
            "&BBOX=" + segment.extent[0] + "," + segment.extent[1] + "," + segment.extent[2] + "," + segment.extent[3] +
            "&WIDTH=" + (this.width ? this.width : 256) +
            "&HEIGHT=" + (this.height ? this.height : 256);
}
//localhost:8080/geoserver/gwc/service/wms?LAYERS=lem3d%3Akray5m&STYLES=&FORMAT=image%2Fjpeg&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG%3A4326&BBOX=0,0,45,90&WIDTH=256&HEIGHT=256