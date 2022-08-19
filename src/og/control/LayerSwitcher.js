/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";
import { elementFactory, allMenuBtnOFF,  allDialogsHide, btnClickHandler} from "./UIhelpers.js";

/**
 * Advanced :) layer switcher, includes base layers, overlays, geo images etc. groups.
 * Double click for zoom, drag-and-drop to change zIndex
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerSwitcher extends Control {
    constructor(options) {
        super(options);
        this.dialog = null;
        this.baseLayersContainer = null;
        this.overlaysContainer = null;
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
        this.createMenuBtn();
        this.createDialog();
        btnClickHandler('layer-switcher-menu-btn', 'layer-switcher-dialog', '.layer-switcher.dialog *', '#layer-switcher-menu-icon'); // btn_id, dialog_id, dialog_selector, icon_id
    }

    onLayerAdded(layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.isBaseLayer()) {
                this.createContainerRecord("radio", layer, this.baseLayersContainer);
            } else {
                this.createContainerRecord("checkbox", layer, this.overlaysContainer, this._id);
            }
        }
    }

    onLayerRemoved(layer) {
        layer._removeCallback();
        layer._removeCallback = null;
    }

    createContainerRecord(type, obj, container, id = "") {
        var that = this;
        var layer_record = elementFactory('div', { class: 'layer-record' })
        var input = elementFactory('input', { type: type, class: 'layer-switcher-input' });
        input.checked = obj.getVisibility();
        var label = elementFactory('span', { class: 'layer-record-label' }, obj.name || obj.src || "noname");

        layer_record.appendChild(input);
        layer_record.appendChild(label);
        container.appendChild(layer_record);

        // Events
        input.onclick = function () {
            obj.setVisibility(input.checked);
        };

        obj.events &&
            obj.events.on("visibilitychange", function (e) {
                input.checked = e.getVisibility();
            });

        label.ondblclick = function () {
            that.planet.flyExtent(obj.getExtent());
        }

        obj._removeCallback = function () {
            container.removeChild(layer_record);
        };
    }

    createDialog() {
        this.baseLayersContainer = elementFactory('div', { class: 'layer-switcher-base-layer-container layer-container' }, 'Base Layers');
        this.overlaysContainer = elementFactory('div', { class: 'layer-switcher-overlay-container layer-container' }, 'Overlays');
        this.dialog = elementFactory('div', { id: 'layer-switcher-dialog',class: 'layer-switcher dialog hide' });
        this.renderer.div.appendChild(this.dialog);
        this.dialog.appendChild(this.baseLayersContainer);
        this.dialog.appendChild(this.overlaysContainer);

        if (this.planet) {
            let layers = this.planet.layers;
            layers.sort((a, b) => (a._zIndex < b._zIndex) ? 1 : -1) // Sort by zIndex, so I get the highest first
            for (var i = 0; i < this.planet.layers.length; i++) {
                this.onLayerAdded(this.planet.layers[i]);
            }
        }
    }

    createMenuBtn() {
        let btn = elementFactory('div', { id: 'layer-switcher-menu-btn', class: 'layer-switcher has-dialog menu-btn OFF' },
            elementFactory('div', { id: 'layer-switcher-menu-icon', class: 'icon-holder' }));
        this.renderer.div.appendChild(btn);
    }
}

export { LayerSwitcher };
