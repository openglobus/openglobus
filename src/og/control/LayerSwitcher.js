/**
 * @module og/control/LayerSwitcher
 */

'use strict';

import { BaseControl } from './BaseControl.js';

/**
 * Simple(OpenLayers like)layer switcher, includes base layers, overlays, geo images etc. groups.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
class LayerSwitcher extends BaseControl {
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
        this.createSwitcher();
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
    };

    onLayerRemoved(layer) {
        layer._removeCallback();
        layer._removeCallback = null;
    }

    addSwitcher(type, obj, container, id) {
        var lineDiv = document.createElement('div');

        var that = this;
        var center = document.createElement('div');
        center.classList.add('ogViewExtentBtn');
        center.onclick = function () {
            that.planet.flyExtent(obj.getExtent());
        };

        var inp = document.createElement('input');
        inp.type = type;
        inp.name = "ogBaseLayerRadiosId" + (id || "");
        inp.checked = obj.getVisibility();
        inp.className = "ogLayerSwitcherInput";
        inp.onclick = function () {
            obj.setVisibility(this.checked);
        };

        obj.events && obj.events.on("visibilitychange", function (e) {
            inp.checked = e.getVisibility();
        });

        var lbl = document.createElement('label');
        lbl.className = "ogLayerSwitcherLabel";
        lbl.innerHTML = (obj.name || obj.src || "noname") + "</br>";

        obj._removeCallback = function () {
            container.removeChild(lineDiv);
        }

        lineDiv.appendChild(center);
        lineDiv.appendChild(inp);
        lineDiv.appendChild(lbl);

        container.appendChild(lineDiv);
    }

    createBaseLayersContainer() {
        var layersDiv = document.createElement('div');
        layersDiv.className = "layersDiv";
        this.dialog.appendChild(layersDiv);

        var baseLayersLbl = document.createElement('div');
        baseLayersLbl.className = "layersDiv";
        baseLayersLbl.innerHTML = "Base Layer";
        layersDiv.appendChild(baseLayersLbl);

        this.baseLayersDiv = document.createElement('div');
        layersDiv.appendChild(this.baseLayersDiv);
    }

    createOverlaysContainer() {
        var overlaysDiv = document.createElement('div');
        overlaysDiv.className = "layersDiv";
        this.dialog.appendChild(overlaysDiv);

        var overlaysLbl = document.createElement('div');
        overlaysLbl.className = "layersDiv";
        overlaysLbl.innerHTML = "Overlays";
        overlaysDiv.appendChild(overlaysLbl);

        this.overlaysDiv = document.createElement('div');
        overlaysDiv.appendChild(this.overlaysDiv);
    }

    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.id = "ogLayerSwitcherDialog";
        this.dialog.className = "displayNone";
        this.renderer.div.appendChild(this.dialog);

        this.createBaseLayersContainer();
        this.createOverlaysContainer();

        if (this.planet) {
            for (var i = 0; i < this.planet.layers.length; i++) {
                this.onLayerAdded(this.planet.layers[i]);
            }
        }
    }

    createSwitcher() {
        var button = document.createElement('div');
        button.className = 'ogLayerSwitcherButton';
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
};

export { LayerSwitcher };

