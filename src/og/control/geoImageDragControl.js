goog.provide('og.control.GeoImageDragControl');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.mercator');
goog.require('og.layer.IGeoImage');

og.control.GeoImageDragControl = function (options) {
    og.inheritance.base(this, options);
    this._cornerIndex = -1;
    this._catchCorner = false;

};

og.inheritance.extend(og.control.GeoImageDragControl, og.control.BaseControl);

og.control.GeoImageDragControl.prototype.oninit = function () {
    this.planet = this.renderer.renderNodes.Earth;
    var that = this;
    this.planet.events.on('layeradd', null, function (e) {
        if (e instanceof og.layer.IGeoImage) {
            e.events.on('mousemove', null, function (ms) {
                if (that._catchCorner) {
                    var corners = e.getCornersLonLat();
                    corners[that._cornerIndex] = that.planet.getLonLatFromPixelTerrain(ms, true);
                    e.setCornersLonLat(corners);
                } else {
                    var d = [];
                    that._cornerIndex = -1;
                    for (var i = 0; i < e._corners.length; i++) {
                        var c = e._corners[i];
                        var cd = that.planet.getGreatCircleDistance(c,
                            that.planet.getLonLatFromPixelTerrain(ms, true)) / that.planet.getDistanceFromPixel(ms, true);
                        d[i] = cd;
                        if (cd <= 0.03) {
                            that._cornerIndex = i;
                            break;
                        }
                    }
                }
            });
            e.events.on('mouselbuttondown', null, function (ms) {
                if (that._cornerIndex != -1) {
                    that._catchCorner = true;
                    globus.planet.renderer.controls[0].active = false;
                }
            });

            e.events.on('mouselbuttonup', null, function (ms) {
                that._catchCorner = false;
                globus.planet.renderer.controls[0].active = true;
            });
        }
    });
};