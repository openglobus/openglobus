/**
 * @module og/control/GeoImageDragControl
 */

'use strict';

import { Control } from './Control.js';
import { BaseGeoImage } from '../layer/BaseGeoImage.js';
import { elementFactory } from '../utils/elementFactory.js'



class GeoImageDragControl extends Control {
    constructor(options) {
        super(options);

        options = options || {};

        this._cornerIndex = -1;
        this._catchCorner = false;

    }

    oninit() {
        let p = this.planet;
        this.createDraggerButton();

        p.events.on('layeradd', function (e) {
            this._bindLayer(e);
        }, this);

        for (let i = 0; i < p.layers.length; i++) {
            if (p.layers[i] instanceof BaseGeoImage) {
                this._bindLayer(p.layers[i]);
            }
        }
        this.clickHandler();
    }

    // Create a button to activate-deactivate control
    createDraggerButton() {
        let btn = elementFactory('div', {id: 'geo-image-dragger-menu-btn',class: 'menu-btn OFF' },
        elementFactory('div', {id: 'geo-image-dragger-icon',class: 'icon-holder'}));
        // btn.onclick = function (e) { this.classList.toggle('OFF')};
        this.renderer.div.appendChild(btn);
    }

    clickHandler() {
        document.addEventListener('click', e => {
            let that = this;
            let btn = document.getElementById('geo-image-dragger-menu-btn');
            if ( e.target.matches('#geo-image-dragger-menu-btn, #geo-image-dragger-icon')) {
                // Clicked button --> toggle
                btn.classList.toggle('OFF');
                // Clicked other button --> set this OFF
            } else if (e.target.matches('.menu-btn')) {
                btn.classList.add('OFF');
            }
        })
    }

    _bindLayer(layer) {
        if (layer instanceof BaseGeoImage) { // if the layer is a geoImage layer

            var p = this.planet;

            layer.events.on('mousemove', function (ms) {
                var btn = document.getElementById('geo-image-dragger-menu-btn');
                var btn_class = btn.className;
                if (this._active && btn_class == "menu-btn") { // active layer and button ON

                    if (this._catchCorner) {// mouse is catching a corner
                        
                        var corners = layer.getCornersLonLat();
                        corners[this._cornerIndex] = p.getLonLatFromPixelTerrain(ms, true);
                        layer.setCornersLonLat(corners);

                    } else { // mouse isn't catching
                        this._cornerIndex = -1;

                        for (var i = 0; i < layer._cornersWgs84.length; i++) {
                            var ground = p.getLonLatFromPixelTerrain(ms, true);
                            // mouse is near
                            if (ground && p.ellipsoid.getGreatCircleDistance(layer._cornersWgs84[i], ground) / p.getDistanceFromPixel(ms, true) <= 0.05) {
                                this._cornerIndex = i;
                                document.body.style.cursor = 'move';
                              
                                break;
                            // mouse is far
                            } else { 
                                document.body.style.cursor = 'auto';
                         
                            }
                        }
                    }

                }

                layer.events.on("mouseleave", function (
                ) {
                    document.body.style.cursor = 'auto';
                });

            }, this);

            layer.events.on('ldown', function (ms) {
                if (this._active && this._cornerIndex != -1) {
                    this._catchCorner = true;
                    ms.renderer.controls.mouseNavigation.deactivate();
                }
            }, this);

            layer.events.on('lup', function (ms) {
                if (this._active) {
                    this._catchCorner = false;
                    ms.renderer.controls.mouseNavigation.activate();
                }
            }, this);

            layer.events.on('rdblclick', function(){
                alert(layer.getID());
            })

        }
    }
}

export { GeoImageDragControl };