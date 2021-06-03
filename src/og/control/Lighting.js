/**
 * @module og/control/Lighting
 */

'use strict';

import { Control } from './Control.js';
import { parseHTML } from '../utils/shared.js';

const TEMPLATE =
    `<div class="og-lighing">

       <div class="og-screen-options">
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
                <input type="range" id="exposure" name="exposure" value="0.0" min="0.0" max="2.0" step="0.01" />
            </div>
            <div class="og-value exposure"></div>
         </div>
       </div>
       
       <div class="og-layers">
         <div class="og-caption">Select layer:</div>
         <select id="layers"></select>
       </div>
      
       <div class="og-color-options">
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
            <div class="og-value specular-r">0.888</div>
         </div>
         <div class="og-option">
            <div class="og-label">G</div>
            <div class="og-slider">
                <input type="range" id="specular-g" name="specular-g" value="0.0" min="0.0" max="1.0" step="0.0001" />
            </div>
            <div class="og-value specular-g">0.888</div>
         </div>
         <div class="og-option">
            <div class="og-label">B</div>
            <div class="og-slider">
                <input type="range" id="specular-b" name="specular-b" value="0.0" min="0.0" max="1.0" step="0.0001" />
            </div>
            <div class="og-value specular-b">0.888</div>
         </div>

         <div class="og-caption">Shininess</div>
         <div class="og-option">
            <div class="og-label">R</div>
            <div class="og-slider">
                <input type="range" id="shininess" name="shininess" value="0.0" min="0.0" max="1000.0" step="1" />
            </div>
            <div class="og-value shininess">0.888</div>
         </div>
       </div>
    </div>`;

/**
 * Helps to setup lighting.
 * @class
 * @extends {og.control.Control}
 * @param {Object} [options] - 
 */
class Lighting extends Control {
    constructor(options = {}) {
        super(options);

        this._selectedLayer = null;
    }

    bingLayer(layer) {
        this._selectedLayer = layer;
    }

    oninit() {
        var panel = parseHTML(TEMPLATE);
        document.body.appendChild(panel);

        document.getElementById("layers").addEventListener("change", (e) => {
            console.log(e.target.value);
        });

        document.getElementById("gamma").addEventListener("input", function (e) {
            this.planet.renderer.gamma = Number(this.value);
            document.querySelector(".value.gamma").innerHTML = this.value;
        });
        document.getElementById("exposure").addEventListener("input", function (e) {
            this.planet.renderer.exposure = Number(this.value);
            document.querySelector(".value.exposure").innerHTML = this.value;
        });

        document.getElementById("ambient-r").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.ambient.x = this.value;
            }
            document.querySelector(".value.ambient-r").innerHTML = this.value;
        });
        document.getElementById("ambient-g").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.ambient.y = this.value;
            }
            document.querySelector(".value.ambient-g").innerHTML = this.value;
        });
        document.getElementById("ambient-b").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.ambient.z = this.value;
            }
            document.querySelector(".value.ambient-b").innerHTML = this.value;
        });

        document.getElementById("diffuse-r").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.diffuse.x = this.value;
            }
            document.querySelector(".value.diffuse-r").innerHTML = this.value;
        });
        document.getElementById("diffuse-g").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.diffuse.y = this.value;
            }
            document.querySelector(".value.diffuse-g").innerHTML = this.value;
        });
        document.getElementById("diffuse-b").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.diffuse.z = this.value;
            }
            document.querySelector(".value.diffuse-b").innerHTML = this.value;
        });

        document.getElementById("specular-r").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.specular.x = this.value;
            }
            document.querySelector(".value.specular-r").innerHTML = this.value;
        });
        document.getElementById("specular-g").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.specular.y = this.value;
            }
            document.querySelector(".value.specular-g").innerHTML = this.value;
        });
        document.getElementById("specular-b").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.specular.z = this.value;
            }
            document.querySelector(".value.specular-b").innerHTML = this.value;
        });

        document.getElementById("shininess").addEventListener("input", function (e) {
            if (this._selectedLayer) {
                this._selectedLayer.shininess = this.value;
            }
            document.querySelector(".value.shininess").innerHTML = this.value;
        });

        if (this.planet) {

            this.planet.events.on("layeradd", this._onLayerAdd, this);
            this.planet.events.on("layerremove", this._onLayerRemove, this);

            for (var i = 0; i < this.planet.layers.length; i++) {
                this._onLayerAdd(this.planet.layers[i]);
            }
        }
    }

    _onLayerAdd(e) {
        console.log(e);
    }

    _onLayerRemove(e) {
    }
};

export function lighting(options) {
    return new Lighting(options);
};

export { Lighting };
