/**
 * @module og/control/Lighting
 */

"use strict";

import { Control } from "./Control.js";
import { parseHTML } from "../utils/shared.js";

const TEMPLATE = `<div class="og-lighing">

       <div class="og-screen-options">

         <div class="og-option">
          <div class="og-caption">Lighting enabled<input type="checkbox" id="lighting" name="light"/></div>
         </div>

         <div class="og-option">
            <div class="og-caption">Gamma</div>
            <div class="og-slider">
                <input type="range" id="gamma" name="gamma" value="0.0" min="0.0" max="5.0" step="0.01" />
            </div>
            <div class="og-value gamma"></div>
         </div>
         <div class="og-option">
            <div class="og-caption">Exposure</div>
            <div class="og-slider">
                <input type="range" id="exposure" name="exposure" value="0.0" min="0.0" max="12.0" step="0.01" />
            </div>
            <div class="og-value exposure"></div>
         </div>
       </div>
       
       <div class="og-layers">
         <div class="og-caption">Select layer:</div>
         <select id="layers"></select>
       </div>
      
       <div class="og-color-options">
         <div class="og-caption">Opacity</div>
         <div class="og-option">
            <div class="og-label">A</div>
            <div class="og-slider">
                <input type="range" id="opacity" name="opacity" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value opacity"></div>
         </div>
         <div class="og-caption">Ambient</div>
         <div class="og-option">
            <div class="og-label">R</div>
            <div class="og-slider">
                <input type="range" id="ambient-r" name="ambient-r" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value ambient-r"></div>
         </div>
         <div class="og-option">
            <div class="og-label">G</div>
            <div class="og-slider">
                <input type="range" id="ambient-g" name="ambient-g" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value ambient-g"></div>
         </div>
         <div class="og-option">
            <div class="og-label">B</div>
            <div class="og-slider">
                <input type="range" id="ambient-b" name="ambient-b" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value ambient-b"></div>
         </div>

         <div class="og-caption">Diffuse</div>
         <div class="og-option">
            <div class="og-label">R</div>
            <div class="og-slider">
                <input type="range" id="diffuse-r" name="diffuse-r" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value diffuse-r"></div>
         </div>
         <div class="og-option">
            <div class="og-label">G</div>
            <div class="og-slider">
                <input type="range" id="diffuse-g" name="diffuse-g" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value diffuse-g"></div>
         </div>
         <div class="og-option">
            <div class="og-label">B</div>
            <div class="og-slider">
                <input type="range" id="diffuse-b" name="diffuse-b" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value diffuse-b"></div>
         </div>


         <div class="og-caption">Specular</div>
         <div class="og-option">
            <div class="og-label">R</div>
            <div class="og-slider">
                <input type="range" id="specular-r" name="specular-r" value="0.0" min="0.0" max="1.0" step="0.0001" />
            </div>
            <div class="og-value specular-r"></div>
         </div>
         <div class="og-option">
            <div class="og-label">G</div>
            <div class="og-slider">
                <input type="range" id="specular-g" name="specular-g" value="0.0" min="0.0" max="1.0" step="0.0001" />
            </div>
            <div class="og-value specular-g"></div>
         </div>
         <div class="og-option">
            <div class="og-label">B</div>
            <div class="og-slider">
                <input type="range" id="specular-b" name="specular-b" value="0.0" min="0.0" max="1.0" step="0.0001" />
            </div>
            <div class="og-value specular-b"></div>
         </div>

         <div class="og-caption">Shininess</div>
         <div class="og-option" style="margin-left: 8px;">
            <div class="og-slider">
                <input type="range" id="shininess" name="shininess" value="0.0" min="0.0" max="1000.0" step="0.1" />
            </div>
            <div class="og-value shininess"></div>
         </div>
       </div>
    </div>`;

/**
 * Helps to setup lighting.
 * @class
 * @extends {Control}
 * @param {Object} [options] -
 */
class Lighting extends Control {
    constructor(options = {}) {
        super(options);

        this._selectedLayer = null;
    }

    bindLayer(layer) {
        this._selectedLayer = layer;

        document.getElementById("opacity").value = layer.opacity;

        document.getElementById("ambient-r").value = layer.ambient.x;
        document.getElementById("ambient-g").value = layer.ambient.y;
        document.getElementById("ambient-b").value = layer.ambient.z;

        document.getElementById("diffuse-r").value = layer.diffuse.x;
        document.getElementById("diffuse-g").value = layer.diffuse.y;
        document.getElementById("diffuse-b").value = layer.diffuse.z;

        document.getElementById("specular-r").value = layer.specular.x;
        document.getElementById("specular-g").value = layer.specular.y;
        document.getElementById("specular-b").value = layer.specular.z;

        document.getElementById("shininess").value = layer.shininess;

        document.querySelector(".og-value.opacity").innerHTML = layer.opacity.toString();

        document.querySelector(".og-value.ambient-r").innerHTML = layer.ambient.x.toString();
        document.querySelector(".og-value.ambient-g").innerHTML = layer.ambient.y.toString();
        document.querySelector(".og-value.ambient-b").innerHTML = layer.ambient.z.toString();

        document.querySelector(".og-value.diffuse-r").innerHTML = layer.diffuse.x.toString();
        document.querySelector(".og-value.diffuse-g").innerHTML = layer.diffuse.y.toString();
        document.querySelector(".og-value.diffuse-b").innerHTML = layer.diffuse.z.toString();

        document.querySelector(".og-value.specular-r").innerHTML = layer.specular.x.toString();
        document.querySelector(".og-value.specular-g").innerHTML = layer.specular.y.toString();
        document.querySelector(".og-value.specular-b").innerHTML = layer.specular.z.toString();

        document.querySelector(".og-value.shininess").innerHTML = layer.shininess.toString();
    }

    oninit() {
        var panel = parseHTML(TEMPLATE);
        document.body.appendChild(panel[0]);

        var _this = this;

        document.getElementById("lighting").checked = this.planet.lightEnabled;

        document.getElementById("lighting").addEventListener("change", (e) => {
            _this.planet.lightEnabled = e.target.checked;
        });

        document.getElementById("layers").addEventListener("change", (e) => {
            //this._selectedLayer = _this.planet.getLayerByName(e.target.value);
            this.bindLayer(_this.planet.getLayerByName(e.target.value));
        });

        document.getElementById("gamma").addEventListener("input", function (e) {
            _this.planet.renderer.gamma = Number(this.value);
            document.querySelector(".og-value.gamma").innerHTML = this.value;
        });
        document.getElementById("exposure").addEventListener("input", function (e) {
            _this.planet.renderer.exposure = Number(this.value);
            document.querySelector(".og-value.exposure").innerHTML = this.value;
        });

        document.querySelector(".og-value.gamma").innerHTML = this.planet.renderer.gamma.toString();
        document.querySelector(".og-value.exposure").innerHTML =
            this.planet.renderer.exposure.toString();

        document.getElementById("gamma").value = this.planet.renderer.gamma;
        document.getElementById("exposure").value = this.planet.renderer.exposure;

        document.getElementById("opacity").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.opacity = Number(this.value);
            }
            document.querySelector(".og-value.opacity").innerHTML = this.value;
        });

        document.getElementById("ambient-r").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.ambient.x = Number(this.value);
            }
            document.querySelector(".og-value.ambient-r").innerHTML = this.value;
        });
        document.getElementById("ambient-g").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.ambient.y = Number(this.value);
            }
            document.querySelector(".og-value.ambient-g").innerHTML = this.value;
        });
        document.getElementById("ambient-b").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.ambient.z = Number(this.value);
            }
            document.querySelector(".og-value.ambient-b").innerHTML = this.value;
        });

        document.getElementById("diffuse-r").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.diffuse.x = Number(this.value);
            }
            document.querySelector(".og-value.diffuse-r").innerHTML = this.value;
        });
        document.getElementById("diffuse-g").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.diffuse.y = Number(this.value);
            }
            document.querySelector(".og-value.diffuse-g").innerHTML = this.value;
        });
        document.getElementById("diffuse-b").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.diffuse.z = Number(this.value);
            }
            document.querySelector(".og-value.diffuse-b").innerHTML = this.value;
        });

        document.getElementById("specular-r").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.specular.x = Number(this.value);
            }
            document.querySelector(".og-value.specular-r").innerHTML = this.value;
        });
        document.getElementById("specular-g").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.specular.y = Number(this.value);
            }
            document.querySelector(".og-value.specular-g").innerHTML = this.value;
        });
        document.getElementById("specular-b").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.specular.z = Number(this.value);
            }
            document.querySelector(".og-value.specular-b").innerHTML = this.value;
        });

        document.getElementById("shininess").addEventListener("input", function (e) {
            if (_this._selectedLayer) {
                _this._selectedLayer.shininess = Number(this.value);
            }
            document.querySelector(".og-value.shininess").innerHTML = this.value;
        });

        if (this.planet) {
            this.planet.events.on("layeradd", this._onLayerAdd, this);
            this.planet.events.on("layerremove", this._onLayerRemove, this);
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
        opt.innerHTML = e.name;
        document.getElementById("layers").appendChild(opt);
        document.getElementById("layers").value = e.name;
    }

    _onLayerRemove(e) { }
}

export function lighting(options) {
    return new Lighting(options);
}

export { Lighting };
