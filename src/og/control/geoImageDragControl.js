goog.provide('og.control.GeoImageDragControl');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.mercator');
goog.require('og.layer.BaseGeoImage');

og.control.GeoImageDragControl = function (options) {
    og.inheritance.base(this, options);

    options = options || {};

    this._cornerIndex = -1;
    this._catchCorner = false;

};

og.inheritance.extend(og.control.GeoImageDragControl, og.control.BaseControl);

og.control.geoImageDragControl = function (options) {
    return new og.control.GeoImageDragControl(options);
};

og.control.GeoImageDragControl.prototype.oninit = function () {
    var that = this;
    var p = this.planet;
    p.events.on('layeradd', function (e) {
        if (e instanceof og.layer.BaseGeoImage) {
            e.events.on('mousemove', function (ms) {
                if (that._active) {
                    if (that._catchCorner) {
                        var corners = e.getCornersLonLat();
                        corners[that._cornerIndex] = p.getLonLatFromPixelTerrain(ms, true);
                        e.setCornersLonLat(corners);
                    } else {
                        that._cornerIndex = -1;
                        for (var i = 0; i < e._cornersWgs84.length; i++) {
                            var ground = p.getLonLatFromPixelTerrain(ms, true)
                            if (ground && p.ellipsoid.getGreatCircleDistance(e._cornersWgs84[i], ground) / p.getDistanceFromPixel(ms, true) <= 0.05) {
                                that._cornerIndex = i;
                                break;
                            }
                        }
                    }
                }
            });
            e.events.on('ldown', function (ms) {
                if (that._active && that._cornerIndex != -1) {
                    that._catchCorner = true;
                    p.renderer.controls[0]._active = false;
                }
            });

            e.events.on('lup', function (ms) {
                if (that._active) {
                    that._catchCorner = false;
                    p.renderer.controls[0]._active = true;
                }
            });
        }
    });
};