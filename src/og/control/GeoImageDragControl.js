/**
 * @module og/control/GeoImageDragControl
 */

'use strict';

import { BaseControl } from './BaseControl.js';
import { BaseGeoImage } from '../layer/BaseGeoImage.js';

class GeoImageDragControl extends BaseControl {
    constructor(options) {
        super(options);

        options = options || {};

        this._cornerIndex = -1;
        this._catchCorner = false;

    }

    oninit() {
        let p = this.planet;

        p.events.on('layeradd', function (e) {
            this._bindLayer(e);
        }, this);

        for (let i = 0; i < p.layers.length; i++) {
            if (p.layers[i] instanceof BaseGeoImage) {
                this._bindLayer(p.layers[i]);
            }
        }
    }

    _bindLayer(layer) {
        if (layer instanceof BaseGeoImage) {
            
            var p = this.planet;

            layer.events.on('mousemove', function (ms) {
                if (this._active) {
                    if (this._catchCorner) {
                        var corners = layer.getCornersLonLat();
                        corners[this._cornerIndex] = p.getLonLatFromPixelTerrain(ms, true);
                        layer.setCornersLonLat(corners);
                    } else {
                        this._cornerIndex = -1;
                        for (var i = 0; i < layer._cornersWgs84.length; i++) {
                            var ground = p.getLonLatFromPixelTerrain(ms, true)
                            if (ground && p.ellipsoid.getGreatCircleDistance(layer._cornersWgs84[i], ground) / p.getDistanceFromPixel(ms, true) <= 0.05) {
                                this._cornerIndex = i;
                                break;
                            }
                        }
                    }
                }
            }, this);

            layer.events.on('ldown', function (ms) {
                if (this._active && this._cornerIndex != -1) {
                    this._catchCorner = true;
                    //p.renderer.controls.mouseNavigation._active = false;
                    ms.renderer.controls.mouseNavigation.deactivate();
                }
            }, this);

            layer.events.on('lup', function (ms) {
                if (this._active) {
                    this._catchCorner = false;
                    //p.renderer.controls.mouseNavigation._active = true;
                    ms.renderer.controls.mouseNavigation.activate();
                }
            }, this);
        }
    }
};

export { GeoImageDragControl };