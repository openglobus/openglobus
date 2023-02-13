/**
 * @module og/control/Lighting
 */

"use strict";

import { Control } from "./Control.js";
import { Dialog } from '../ui/Dialog.js';
import { View } from '../ui/View.js';
import { ToggleButton } from "../ui/ToggleButton.js";
import { Slider } from "../ui/ToggleButton.js";

const TEMPLATE =
    `<div class="og-lighing">

         <div class="og-option">
           <div class="og-caption">Lighting enabled<input type="checkbox" id="lighting" name="light"/></div>
         </div>

         <div class="og-option og-gamma">
         </div>
         
         <div class="og-option og-exposure">
         </div>
       
         <div class="og-layers">
           <div class="og-caption">Select layer:</div>
           <select id="layers"></select>
         </div>

         <div class="og-option og-opacity">
         </div>

         <div class="og-option og-diffuse">
         </div>
      
         <div class="og-option og-ambient">
         </div>

         <div class="og-option og-specular">
         </div>        

    </div>`;

/**
 * Helps to setup lighting.
 * @class
 * @extends {Control}
 * @param {Object} [options] -
 */

const ICON_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="256" height="256" viewBox="0 0 256 256" xml:space="preserve">

<defs>
</defs>
<g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)" >
\t<path d="M 45 68 c -12.682 0 -23 -10.317 -23 -23 c 0 -12.682 10.318 -23 23 -23 c 12.683 0 23 10.318 23 23 C 68 57.683 57.683 68 45 68 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 45 17.556 c -1.657 0 -3 -1.343 -3 -3 V 3 c 0 -1.657 1.343 -3 3 -3 c 1.657 0 3 1.343 3 3 v 11.556 C 48 16.212 46.657 17.556 45 17.556 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 45 90 c -1.657 0 -3 -1.343 -3 -3 V 75.444 c 0 -1.657 1.343 -3 3 -3 c 1.657 0 3 1.343 3 3 V 87 C 48 88.657 46.657 90 45 90 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 14.556 48 H 3 c -1.657 0 -3 -1.343 -3 -3 c 0 -1.657 1.343 -3 3 -3 h 11.556 c 1.657 0 3 1.343 3 3 C 17.556 46.657 16.212 48 14.556 48 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 87 48 H 75.444 c -1.657 0 -3 -1.343 -3 -3 c 0 -1.657 1.343 -3 3 -3 H 87 c 1.657 0 3 1.343 3 3 C 90 46.657 88.657 48 87 48 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 66.527 26.473 c -0.768 0 -1.535 -0.293 -2.121 -0.878 c -1.172 -1.172 -1.172 -3.071 0 -4.243 l 8.171 -8.171 c 1.172 -1.172 3.07 -1.171 4.242 0 c 1.172 1.172 1.172 3.071 0 4.243 l -8.171 8.171 C 68.063 26.18 67.295 26.473 66.527 26.473 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 15.302 77.698 c -0.768 0 -1.536 -0.293 -2.121 -0.879 c -1.172 -1.171 -1.172 -3.071 0 -4.242 l 8.171 -8.171 c 1.171 -1.172 3.071 -1.172 4.242 0 c 1.172 1.171 1.172 3.071 0 4.242 l -8.171 8.171 C 16.837 77.405 16.069 77.698 15.302 77.698 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 23.473 26.473 c -0.768 0 -1.536 -0.293 -2.121 -0.878 l -8.171 -8.171 c -1.172 -1.172 -1.172 -3.071 0 -4.243 c 1.172 -1.172 3.072 -1.171 4.243 0 l 8.171 8.171 c 1.172 1.172 1.172 3.071 0 4.243 C 25.008 26.18 24.24 26.473 23.473 26.473 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
\t<path d="M 74.698 77.698 c -0.768 0 -1.535 -0.293 -2.121 -0.879 l -8.171 -8.171 c -1.172 -1.171 -1.172 -3.071 0 -4.242 c 1.172 -1.172 3.07 -1.172 4.242 0 l 8.171 8.171 c 1.172 1.171 1.172 3.071 0 4.242 C 76.233 77.405 75.466 77.698 74.698 77.698 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
</g>
</svg>`;

class Lighting extends Control {
    constructor(options = {}) {
        super(options);

        this._selectedLayer = null;

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-lighting_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Lighting Parameters",
            visible: false,
            useHide: true,
            top: 60,
            left: 60,
            width: 600
        });

        this._dialog.on("visibility", (v) => {
            this._toggleBtn.setActive(v);
        });

        this._panel = new View({
            template: TEMPLATE
        });
    }

    bindLayer(layer) {
        this._selectedLayer = layer;

        document.getElementById("opacity").value = layer.opacity;
        document.querySelector(".og-value.opacity").innerText = layer.opacity.toString();
    }

    oninit() {
        this._toggleBtn.appendTo(this.renderer.div);
        this._dialog.appendTo(this.renderer.div);
        this._panel.appendTo(this._dialog.container);

        this._toggleBtn.on("change", (isActive) => {
            this._dialog.setVisibility(isActive);
        });

        var _this = this;

        document.getElementById("lighting").checked = this.planet.lightEnabled;

        document.getElementById("lighting").addEventListener("change", (e) => {
            _this.planet.lightEnabled = e.target.checked;
        });

        document.getElementById("layers").addEventListener("change", (e) => {
            //this._selectedLayer = _this.planet.getLayerByName(e.target.value);
            this.bindLayer(_this.planet.getLayerByName(e.target.value));
        });


        // document.getElementById("gamma").addEventListener("input", function (e) {
        //     _this.planet.renderer.gamma = Number(this.value);
        //     document.querySelector(".og-value.gamma").innerText = this.value;
        // });
        // document.getElementById("exposure").addEventListener("input", function (e) {
        //     _this.planet.renderer.exposure = Number(this.value);
        //     document.querySelector(".og-value.exposure").innerText = this.value;
        // });
        //
        // document.querySelector(".og-value.gamma").innerText = this.planet.renderer.gamma.toString();
        // document.querySelector(".og-value.exposure").innerText =
        //     this.planet.renderer.exposure.toString();
        //
        // document.getElementById("gamma").value = this.planet.renderer.gamma;
        // document.getElementById("exposure").value = this.planet.renderer.exposure;
        //
        // document.getElementById("opacity").addEventListener("input", function (e) {
        //     if (_this._selectedLayer) {
        //         _this._selectedLayer.opacity = Number(this.value);
        //     }
        //     document.querySelector(".og-value.opacity").innerText = this.value;
        // });
        //
        // document.getElementById("ambient-r").addEventListener("input", function (e) {
        //     _this._selectedLayer._ambient[0] = Number(this.value);
        //     document.querySelector(".og-value.ambient-r").innerText = this.value;
        // });
        // document.getElementById("ambient-g").addEventListener("input", function (e) {
        //     _this._selectedLayer._ambient[1] = Number(this.value);
        //     document.querySelector(".og-value.ambient-g").innerText = this.value;
        // });
        // document.getElementById("ambient-b").addEventListener("input", function (e) {
        //     _this._selectedLayer._ambient[2] = Number(this.value);
        //     document.querySelector(".og-value.ambient-b").innerText = this.value;
        // });
        //
        // document.getElementById("diffuse-r").addEventListener("input", function (e) {
        //     _this._selectedLayer._diffuse[0] = Number(this.value);
        //     document.querySelector(".og-value.diffuse-r").innerText = this.value;
        // });
        // document.getElementById("diffuse-g").addEventListener("input", function (e) {
        //     _this._selectedLayer._diffuse[1] = Number(this.value);
        //     document.querySelector(".og-value.diffuse-g").innerText = this.value;
        // });
        // document.getElementById("diffuse-b").addEventListener("input", function (e) {
        //     _this._selectedLayer._diffuse[2] = Number(this.value);
        //     document.querySelector(".og-value.diffuse-b").innerText = this.value;
        // });
        //
        // document.getElementById("specular-r").addEventListener("input", function (e) {
        //     _this._selectedLayer._specular[0] = Number(this.value);
        //     document.querySelector(".og-value.specular-r").innerText = this.value;
        // });
        // document.getElementById("specular-g").addEventListener("input", function (e) {
        //     _this._selectedLayer._specular[1] = Number(this.value);
        //     document.querySelector(".og-value.specular-g").innerText = this.value;
        // });
        // document.getElementById("specular-b").addEventListener("input", function (e) {
        //     _this._selectedLayer._specular[2] = Number(this.value);
        //     document.querySelector(".og-value.specular-b").innerText = this.value;
        // });
        //
        // document.getElementById("shininess").addEventListener("input", function (e) {
        //     _selectedLayer._specular[3] = Number(this.value);
        //     document.querySelector(".og-value.shininess").innerText = this.value;
        // });

        if (this.planet) {
            this.planet.events.on("layeradd", this._onLayerAdd, this);
            this.planet.events.on("layerremove", this._onLayerRemove, this);

            // document.getElementById("ambient-r").value = this.planet._ambient[0];
            // document.getElementById("ambient-g").value = this.planet._ambient[1];
            // document.getElementById("ambient-b").value = this.planet._ambient[2];
            //
            // document.getElementById("diffuse-r").value = this.planet._diffuse[0];
            // document.getElementById("diffuse-g").value = this.planet._diffuse[1];
            // document.getElementById("diffuse-b").value = this.planet._diffuse[2];
            //
            // document.getElementById("specular-r").value = this.planet._specular[0];
            // document.getElementById("specular-g").value = this.planet._specular[1];
            // document.getElementById("specular-b").value = this.planet._specular[2];
            // document.getElementById("shininess").value = this.planet._specular[3];
            //
            // document.querySelector(".og-value.ambient-r").innerText = this.planet._ambient[0].toString();
            // document.querySelector(".og-value.ambient-g").innerText = this.planet._ambient[1].toString();
            // document.querySelector(".og-value.ambient-b").innerText = this.planet._ambient[2].toString();
            //
            // document.querySelector(".og-value.diffuse-r").innerText = this.planet._diffuse[0].toString();
            // document.querySelector(".og-value.diffuse-g").innerText = this.planet._diffuse[1].toString();
            // document.querySelector(".og-value.diffuse-b").innerText = this.planet._diffuse[2].toString();
            //
            // document.querySelector(".og-value.specular-r").innerText = this.planet._specular[0].toString();
            // document.querySelector(".og-value.specular-g").innerText = this.planet._specular[1].toString();
            // document.querySelector(".og-value.specular-b").innerText = this.planet._specular[2].toString();
            // document.querySelector(".og-value.shininess").innerText = this.planet._specular[3].toString();
        }

        this._fetchLayers();
    }

    _fetchLayers() {
        if (this.planet) {
            for (var i = 0; i < this.planet.layers.length; i++) {
                this._onLayerAdd(this.planet.layers[i]);
            }
        }
    }

    _onLayerAdd(e) {
        this.bindLayer(e);
        let opt = document.createElement("option");
        opt.value = e.name;
        opt.innerText = e.name;
        document.getElementById("layers").appendChild(opt);
        document.getElementById("layers").value = e.name;
    }

    _onLayerRemove(e) {
    }
}

export { Lighting };
