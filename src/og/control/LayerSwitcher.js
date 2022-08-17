/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";

/**
 * Simple(OpenLayers like)layer switcher, includes base layers, overlays, geo images etc. groups.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerSwitcher extends Control {
    constructor(options) {
        super(options);

        this.dialog = null;
        this.baseLayersDiv = null;
        this.overlaysDiv = null;
        this._id = LayerSwitcher.numSwitches++;
    }

    static get numSwitches() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set numSwitches(n) {
        this._counter = n;
    }

    oninit() {
        this.planet.events.on("layeradd", this.onLayerAdded, this);
        this.planet.events.on("layerremove", this.onLayerRemoved, this);
        this.createMainMenuBtn();
        this.createDialog();
    }

    onLayerAdded(layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.isBaseLayer()) {
                this.addSwitcher("radio", layer, this.baseLayersDiv);
            } else {
                this.addSwitcher("checkbox", layer, this.overlaysDiv, this._id);
            }
        }
    }

    onLayerRemoved(layer) {
        layer._removeCallback();
        layer._removeCallback = null;
    }

    addSwitcher(type, obj, container, id = "") {
        var lineDiv = document.createElement("div");
        lineDiv.className = "layersEntry"


        // lineDiv.setAttribute('draggable', true); // Make the whole entry draggable
        // lineDiv.addEventListener('dragstart', dragStart)
        // lineDiv.addEventListener('dragend', dragEnd)
        // function dragStart() {
        //     console.log('drag started');
        // }
        // function dragEnd() {
        //     console.log('drag ended');
        // }


        var that = this;
        var inp = document.createElement("input");
        inp.type = type;
        inp.name = "ogBaseLayerRadiosId" + (id || "");
        inp.checked = obj.getVisibility();
        inp.className = "ogLayerSwitcherInput";
        inp.onclick = function () {
            obj.setVisibility(this.checked);
        };



        obj.events &&
            obj.events.on("visibilitychange", function (e) {
                inp.checked = e.getVisibility();
            });

        var lbl = document.createElement("label");
        lbl.className = "ogLayerSwitcherLabel";
        lbl.innerHTML = (obj.name || obj.src || "noname");

        lbl.ondblclick = function () {
            that.planet.flyExtent(obj.getExtent());
        }
        obj._removeCallback = function () {
            container.removeChild(lineDiv);
        };

        lineDiv.appendChild(inp);
        lineDiv.appendChild(lbl);

        container.appendChild(lineDiv);
    }



    createElementAndChildren = (type, attributes, ...children) => {
        const el = document.createElement(type);

        for (key in attributes) {
            el.setAttribute(key, attributes[key])
        }

        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child))
            } else {
                el.appendChild(child)
            }
        })
        return el
    }


    createBaseLayers(){
        
    }









    createBaseLayersContainer() {
        var layersDiv = document.createElement("div");
        layersDiv.className = "layersDiv";
        this.dialog.appendChild(layersDiv);

        var baseLayersLbl = document.createElement("div");
        baseLayersLbl.className = "layersDivLabel";
        baseLayersLbl.innerHTML = "Base Layers";
        layersDiv.appendChild(baseLayersLbl);

        this.baseLayersDiv = document.createElement("div");
        layersDiv.appendChild(this.baseLayersDiv);
    }

    createOverlaysContainer() {
        var overlaysDiv = document.createElement("div");
        overlaysDiv.className = "layersDiv";
        this.dialog.appendChild(overlaysDiv);

        var overlaysLbl = document.createElement("div");
        overlaysLbl.className = "layersDivLabel";
        overlaysLbl.innerHTML = "Overlays";
        overlaysDiv.appendChild(overlaysLbl);

        this.overlaysDiv = document.createElement("div");
        overlaysDiv.appendChild(this.overlaysDiv);
    }

    createDialog() {
        this.dialog = document.createElement("div");
        this.dialog.id = "ogLayerSwitcherDialog";
        this.dialog.className = "displayNone";
        this.renderer.div.appendChild(this.dialog);

        this.createBaseLayersContainer();
        this.createOverlaysContainer();

        if (this.planet) {
            let layers = this.planet.layers;
            layers.sort((a, b) => (a._zIndex < b._zIndex) ? 1 : -1) // Sort by zIndex, so I get the highest first


            for (var i = 0; i < this.planet.layers.length; i++) {
                this.onLayerAdded(layers[i]);
            }
        }
    }

    createMainMenuBtn() {
        var button = document.createElement("div");
        button.className = "ogLayerSwitcherButton";
        button.id = "ogLayerSwitcherButtonMaximize";
        var that = this;
        button.onclick = function (e) {
            if (this.id === "ogLayerSwitcherButtonMaximize") {
                this.id = "ogLayerSwitcherButtonMinimize";
                that.dialog.className = "displayBlock";
            } else {
                this.id = "ogLayerSwitcherButtonMaximize";
                that.dialog.className = "displayNone";
            }
        };
        this.renderer.div.appendChild(button);
    }
}

export { LayerSwitcher };
