/**
 * @module og/control/Lighting
 */

"use strict";

import { Control } from "./Control.js";
import { Dialog } from '../ui/Dialog.js';
import { View } from '../ui/View.js';
import { ToggleButton } from "../ui/ToggleButton.js";
import { Slider } from "../ui/Slider.js";

const TEMPLATE =
    `<div class="og-lighing">

         <div class="og-option">
           <div class="og-caption">Lighting enabled<input type="checkbox" id="lighting" name="light"/></div>
         </div>

         <div class="og-option og-gamma">
         </div>
         
         <div class="og-option og-exposure">
         </div>
       
         <div class="og-option">
         <div class="og-layers">
           <div class="og-caption">Select layer:</div>
           <select id="layers"></select>
         </div>
         </div>

         <div class="og-option og-opacity">
         </div>
         
         <div class="og-option og-night">
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

const MAX_COLOR = 5;

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

        this.$gamma;
        this.$exposure;
        this.$night;
        this.$opacity;
        this.$diffuse;
        this.$ambient;
        this.$specular;

        this._gamma = new Slider({
            label: "Gamma",
            max: 5
        });

        this._exposure = new Slider({
            label: "Exposure",
            max: 5
        });

        this._night = new Slider({
            label: "Nightlight",
            max: 5
        });

        this._opacity = new Slider({
            label: "Opacity",
            max: 1
        });

        //
        // Diffuse sliders
        //
        this._diffuse_r = new Slider({
            label: "Diffuse R",
            max: MAX_COLOR
        });

        this._diffuse_g = new Slider({
            label: "Diffuse G",
            max: MAX_COLOR
        });

        this._diffuse_b = new Slider({
            label: "Diffuse B",
            max: MAX_COLOR
        });

        //
        // Ambient sliders
        //
        this._ambient_r = new Slider({
            label: "Ambient R",
            max: MAX_COLOR
        });

        this._ambient_g = new Slider({
            label: "Ambient G",
            max: MAX_COLOR
        });

        this._ambient_b = new Slider({
            label: "Ambient B",
            max: MAX_COLOR
        });

        //
        // Specular sliders
        //
        this._specular_r = new Slider({
            label: "Specular R",
            max: 0.2
        });

        this._specular_g = new Slider({
            label: "Specular G",
            max: 0.2
        });

        this._specular_b = new Slider({
            label: "Specular B",
            max: 0.2
        });

        this._shininess = new Slider({
            label: "Shininess",
            max: 100
        });
    }

    bindLayer(layer) {
        this._selectedLayer = layer;
        this._opacity.value = layer.opacity;
        this._update();
    }

    oninit() {
        this._toggleBtn.appendTo(this.renderer.div);
        this._dialog.appendTo(this.renderer.div);
        this._panel.appendTo(this._dialog.container);

        this._toggleBtn.on("change", (isActive) => {
            this._dialog.setVisibility(isActive);
        });

        this.$gamma = document.querySelector(".og-option.og-gamma");
        this.$exposure = document.querySelector(".og-option.og-exposure");
        this.$opacity = document.querySelector(".og-option.og-opacity");
        this.$diffuse = document.querySelector(".og-option.og-diffuse");
        this.$ambient = document.querySelector(".og-option.og-ambient");
        this.$specular = document.querySelector(".og-option.og-specular");
        this.$night = document.querySelector(".og-option.og-night");

        this._gamma.appendTo(this.$gamma);
        this._exposure.appendTo(this.$exposure);

        this._night.appendTo(this.$night);
        this._opacity.appendTo(this.$opacity);

        this._diffuse_r.appendTo(this.$diffuse);
        this._diffuse_g.appendTo(this.$diffuse);
        this._diffuse_b.appendTo(this.$diffuse);

        this._ambient_r.appendTo(this.$ambient);
        this._ambient_g.appendTo(this.$ambient);
        this._ambient_b.appendTo(this.$ambient);

        this._specular_r.appendTo(this.$specular);
        this._specular_g.appendTo(this.$specular);
        this._specular_b.appendTo(this.$specular);
        this._shininess.appendTo(this.$specular);

        document.getElementById("lighting").checked = this.planet.lightEnabled;

        document.getElementById("lighting").addEventListener("change", (e) => {
            this.planet.lightEnabled = e.target.checked;
        });

        document.getElementById("layers").addEventListener("change", (e) => {
            this.bindLayer(this.planet.getLayerByName(e.target.value));
        });

        this._gamma.value = this.planet.renderer.gamma;
        this._exposure.value = this.planet.renderer.exposure;

        this._gamma.on("change", (val) => {
            this.planet.renderer.gamma = val;
        });

        this._exposure.on("change", (val) => {
            this.planet.renderer.exposure = val;
        });

        this._night.on("change", (val) => {
            if (this._selectedLayer)
                this._selectedLayer.nightTextureCoefficient = val;
        });

        this._opacity.on("change", (val) => {
            if (this._selectedLayer)
                this._selectedLayer.opacity = val;
        });

        this._ambient_r.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._ambient)
                this._selectedLayer._ambient[0] = val
        });

        this._ambient_g.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._ambient)
                this._selectedLayer._ambient[1] = val
        });

        this._ambient_b.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._ambient)
                this._selectedLayer._ambient[2] = val
        });

        this._diffuse_r.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._diffuse)
                this._selectedLayer._diffuse[0] = val
        });

        this._diffuse_g.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._diffuse)
                this._selectedLayer._diffuse[1] = val
        });

        this._diffuse_b.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._diffuse)
                this._selectedLayer._diffuse[2] = val
        });

        this._specular_r.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._specular)
                this._selectedLayer._specular[0] = val
        });

        this._specular_g.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._specular)
                this._selectedLayer._specular[1] = val
        });

        this._specular_b.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._specular)
                this._selectedLayer._specular[2] = val
        });

        this._shininess.on("change", (val) => {
            if (this._selectedLayer && this._selectedLayer._specular)
                this._selectedLayer._specular[3] = val
        });


        if (this.planet) {
            this.planet.events.on("layeradd", this._onLayerAdd, this);
            this.planet.events.on("layerremove", this._onLayerRemove, this);
        }

        this._fetchLayers();
    }

    _update() {
        let l = this._selectedLayer;

        let o = l && l.opacity ? l.opacity : 0.0;
        this._opacity.value = o;

        let n = l && l.nightTextureCoefficient ? l.nightTextureCoefficient : this.planet.nightTextureCoefficient;
        this._night.value = n;

        let a = l && l._ambient ? l._ambient : this.planet._ambient;
        this._ambient_r.value = a[0];
        this._ambient_g.value = a[1];
        this._ambient_b.value = a[2];

        let d = l && l._diffuse ? l._diffuse : this.planet._diffuse;
        this._diffuse_r.value = d[0];
        this._diffuse_g.value = d[1];
        this._diffuse_b.value = d[2];

        let s = l && l._specular ? l._specular : this.planet._specular;
        this._specular_r.value = s[0];
        this._specular_g.value = s[1];
        this._specular_b.value = s[2];
        this._shininess.value = s[3];
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
