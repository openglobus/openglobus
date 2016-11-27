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
    this.planet = this.renderer.renderNodes.Earth;
    var that = this;
    this.planet.events.on('layeradd', null, function (e) {
        if (e instanceof og.layer.BaseGeoImage) {
            e.events.on('mousemove', null, function (ms) {
                if (that.active) {
                    if (that._catchCorner) {
                        var corners = e.getCornersLonLat();
                        corners[that._cornerIndex] = that.planet.getLonLatFromPixelTerrain(ms, true);
                        e.setCornersLonLat(corners);
                    } else {
                        that._cornerIndex = -1;
                        for (var i = 0; i < e._cornersWgs84.length; i++) {
                            if (that.planet.ellipsoid.getGreatCircleDistance(e._cornersWgs84[i],
                                that.planet.getLonLatFromPixelTerrain(ms, true)) / that.planet.getDistanceFromPixel(ms, true)
                                <= 0.05) {
                                that._cornerIndex = i;
                                break;
                            }
                        }
                    }
                }
            });
            e.events.on('mouselbuttondown', null, function (ms) {
                if (that.active && that._cornerIndex != -1) {
                    that._catchCorner = true;
                    globus.planet.renderer.controls[0].active = false;
                }
            });

            e.events.on('mouselbuttonup', null, function (ms) {
                if (that.active) {
                    that._catchCorner = false;
                    globus.planet.renderer.controls[0].active = true;
                }
            });
        }
    });
};