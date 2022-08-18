/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";
import { elementFactory } from '../utils/elementFactory.js'

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
        this.dialog = elementFactory('div', {class: 'layer-switcher-dialog dialog hide' });
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
        let that = this;
        let btn = elementFactory('div', { id: 'layer-switcher-menu-btn', class: 'menu-btn OFF' },
            elementFactory('div', { id: 'layer-switcher-menu-icon',class: 'icon-holder' }));
        this.renderer.div.appendChild(btn);

        // Button ON/OFF listener
        btn.addEventListener('click', e => {
            if (btn.classList == 'menu-btn OFF'){ // If I am OFF
                let buttons = document.querySelectorAll('.menu-btn');// select all buttons
                buttons = Array.from(buttons);
                buttons.map(x => x.classList.add('OFF')); // set all buttons to OFF
                
                let dialogs = document.querySelectorAll('.dialog');// select all dialogs
                dialogs = Array.from(dialogs);
                dialogs.map(x => x.classList.add('hide')); // set ll dialogs to hide
          
                btn.classList.remove('OFF'); // set myself to ON
                that.dialog.classList.remove('hide');
            }else{ // If I am ON
            btn.classList.toggle('OFF');
            that.dialog.classList.toggle('hide');
        }
        })
    }


    // dialogClickHandler() {
    //     document.addEventListener('click', e => {
    //         let dialog =  document.getElementById('the-dialog');
    //         let btn = document.getElementById('layer-switcher-menu-btn');
    //         if ( e.target.matches('#layer-switcher-menu-btn, #layer-switcher-menu-icon')) {
    //             // Clicked button --> toggle
    //             btn.classList.toggle('OFF');
    //             dialog.classList.toggle('hide');
    //         } else if (e.target.matches('.layer-switcher-dialog *')) {
    //             // Clicked dialog --> do nothing
    //             return;  
    //         } else if (e.target.matches('.menu-btn') || e.target.matches('.menu-btn *')) {
    //             // Clicked another button --> set that to active
    //             btn.classList.add('OFF');
    //         }  else {
    //             // Clicked outside dialog --> hide dialog 
    //             btn.classList.add('OFF');
    //             dialog.classList.add('hide');
    //         }
    //     })
    // }
}

export { LayerSwitcher };
