/**
 * @module og/control/GeoImageDragControl
 */

'use strict';

import {BaseControl} from './BaseControl.js';
import { BaseGeoImage } from '../layer/BaseGeoImage.js');

class GeoImageDragControl extends BaseControl {
    constructor(options) {
        super(options);

        options = options || {};

        this._cornerIndex = -1;
        this._catchCorner = false;

    }

    oninit() {
        var that = this;
        var p = this.planet;
        p.events.on('layeradd', function (e) {
            if (e instanceof BaseGeoImage) {
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
    }
};

export { GeoImageDragControl };