/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";
import { elementFactory, allMenuBtnOFF, allDialogsHide, btnClickHandler } from "./UIhelpers.js";

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
        this.terrainContainer = null;
        this.baseLayersContainer = null
        this.overlaysContainer = null;
        this.layerRecord = null;
        // Each layer record has it's own dropzone to the top of the div. We need a final one to the very end.
        this.lastDropZone = elementFactory('div', { id: 'last-layer-drop-zone', class: 'layer-record-drop-zone' });
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
        this.createMenuVbar();
        this.createMenuBtn();
        this.createDialog();

        btnClickHandler('layer-switcher-menu-btn', 'layer-switcher-dialog', '.layer-switcher.dialog *', '#layer-switcher-menu-icon'); // btn_id, dialog_id, dialog_selector, icon_id
    }

    onLayerAdded(layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.isBaseLayer()) {
                this.createContainerRecord("radio", layer, this.baseLayersContainer);
            } else {
                this.createContainerRecord("checkbox", layer, this.overlaysContainer, layer._id);

                var dropZone = elementFactory('div', { class: 'layer-record-drop-zone' }); // create and append dropZone element
                this.layerRecord.insertBefore(dropZone, this.layerRecord.firstChild); // Insert drop zone to the top of layer-record div
                this.layerRecord.setAttribute('draggable', 'true'); // make this record draggable
                this.overlaysContainer.appendChild(this.lastDropZone); // each time append  lastDropZone so that we make sure it is the last child
                                                                       // necessary if new Layer is added to the glob programmatically
                this.dropZoneBehaviour(dropZone);
            }
        }
    }

    onLayerRemoved(layer) {
        if (layer.displayInLayerSwitcher) { // check necessary, or else error with layers not in switcher - e.g rulerScene layers.
            layer._removeCallback();
            layer._removeCallback = null;
        }
    }

    createContainerRecord(type, obj, container, id = "") {
        var that = this;
        let thelayerRecord = elementFactory('div', { id: id, class: 'layer-record' });
        this.layerRecord = thelayerRecord; // export to global variable, to access onLayerAdded
        var input = elementFactory('input', { type: type, class: 'layer-switcher-input' });
        input.checked = obj.getVisibility();
        var label = elementFactory('span', { class: 'layer-record-label' }, obj.name || obj.src || "noname");
        var info = elementFactory('img', { class: 'layer-record-info' });

        this.layerRecord.appendChild(input);
        this.layerRecord.appendChild(label);
        this.layerRecord.appendChild(info);
        container.appendChild(this.layerRecord);


        // Drag events for the layer-record (for CSS styling)
        thelayerRecord.addEventListener('dragstart', () => {
            thelayerRecord.classList.add('dragging');
        })

        thelayerRecord.addEventListener('dragend', () => {
            thelayerRecord.classList.remove('dragging');
        })

        // Events of input click and label double click
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
            container.removeChild(thelayerRecord);
        };
    }

    assignZindexesPerDialogOrder() { // See how user has placed overlays in switcher and change ZIndexes accordingly (start 10000, go down 100)
        let dialog_layer_records = [...document.querySelectorAll('#overlay-container .layer-record')];
        let dialog_layer_ids = dialog_layer_records.map(x => x.id);
        let layers = this.planet.layers;
        let overlays = layers.filter(x => !x.isBaseLayer());
        let visible_overlays = [...overlays.filter(x => x.displayInLayerSwitcher)];
        for (var i = 0; i < dialog_layer_ids.length; i++) {
            let the_layer = visible_overlays.filter(x => x.getID() == dialog_layer_ids[i]);
            the_layer[0].setZIndex(10000 - i * 100);

        }
    }

    dropZonedragOver(dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    }

    dropZonedragLeave(dropZone) {
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        })
    }

    dropZonedrop(dropZone) {
        let dropZones = [...document.querySelectorAll('.layer-record-drop-zone')];
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            let selectedLayerRecord = document.querySelector('.dragging');
            // Get position of drop zone - last is a special case
            let pos = dropZones.indexOf(dropZone);
            if (pos < dropZones.length - 1) { // not last 
                this.overlaysContainer.insertBefore(selectedLayerRecord, dropZone.parentElement);  // Appear before the parent element     
            } else { // last
                this.overlaysContainer.insertBefore(selectedLayerRecord, dropZone); // Appear before last (fixed) dropzone element
            }
            this.assignZindexesPerDialogOrder();
        });
    }

    dropZoneBehaviour(dropZone) {
        this.dropZonedragOver(dropZone);
        this.dropZonedragLeave(dropZone);
        this.dropZonedrop(dropZone);
    }

    createTerrainRecord(id, obj){
        var that = this;
       
        let terrainRecord = elementFactory('div', { id: id, class: 'layer-record' });
        var input = elementFactory('input', { type: "radio", class: 'layer-switcher-input' });
        var label = elementFactory('span', { class: 'layer-record-label' }, obj.name || obj.src || "noname");
        var info = elementFactory('img', { class: 'layer-record-info' });

        terrainRecord.appendChild(input);
        terrainRecord.appendChild(label);
        terrainRecord.appendChild(info);
        this.terrainContainer.appendChild(terrainRecord);

        if(id ==0){
            input.checked = true;
        }

        // Events of input click and label double click
        input.onclick = function () {
            
            let inputs = document.querySelectorAll('.terrain-switcher-container input');
            
            inputs.forEach(input => {
                input.checked = false;
            })

            input.checked = true;
            that.planet.setTerrain(obj);
        };

        // obj.events &&
        //     obj.events.on("visibilitychange", function (e) {
        //         input.checked = e.getVisibility();
        //     });

        // label.ondblclick = function () {
        //     that.planet.flyExtent(obj.getExtent());
        // }

        // obj._removeCallback = function () {
        //     container.removeChild(thelayerRecord);
        // };
    }

    createDialog() {
        this.terrainContainer = elementFactory('div', { class: 'terrain-switcher-container layer-container' }, 'Terrain Providers')
        this.baseLayersContainer = elementFactory('div', { class: 'layer-switcher-base-layer-container layer-container' }, 'Base Layers');
        this.overlaysContainer = elementFactory('div', { id: 'overlay-container', class: 'layer-switcher-overlay-container layer-container' }, 'Overlays');
        this.dialog = elementFactory('div', { id: 'layer-switcher-dialog', class: 'layer-switcher dialog hide' });
        this.renderer.div.appendChild(this.dialog);
        this.dialog.appendChild(this.terrainContainer);
        this.dialog.appendChild(this.baseLayersContainer);
        this.dialog.appendChild(this.overlaysContainer);

        if (this.planet) {
            let layers = this.planet.layers;
            let baseLayers = layers.filter(x => x.isBaseLayer());
            let overlays = layers.filter(x => !x.isBaseLayer());
            let overlays_sorted = overlays.sort((a, b) => (a._zIndex < b._zIndex) ? 1 : -1) // Sort by zIndex, so I get the highest first
            let overlays_new_zIndex = overlays_sorted.map((overlay, index) => {
                overlay._zIndex = 10000 - index * 100; // First layer (highest zIndex) will be assigned 10000 and others 9900, 9800 etc
                return overlay;
            })

            for (var i = 0; i < baseLayers.length; i++) { // Loop baselayers and add them, running the function
                this.onLayerAdded(baseLayers[i]);
            }
            for (var i = 0; i < overlays_new_zIndex.length; i++) { // Loop overlays - with new zIndexes - and add them, running the function
                this.onLayerAdded(overlays_new_zIndex[i]);
            }

            // Create terrain records

            let terrainPool = this.planet._terrainPool;
            
            if(terrainPool){
                terrainPool.forEach((terrain, index) => {
                    this.createTerrainRecord(index, terrain);
                })
            }

        }
        // Last dropZone events - haven't been attached before
        this.dropZoneBehaviour(this.lastDropZone);
    }

    createMenuBtn() {
        let btn = elementFactory('div', { id: 'layer-switcher-menu-btn', class: 'layer-switcher has-dialog menu-btn OFF' },
            elementFactory('div', { id: 'layer-switcher-menu-icon', class: 'icon-holder' }));
        this.renderer.div.appendChild(btn);
    }

    createMenuVbar() {
        let menuBar = elementFactory('div', { class: 'og-menu-bar-vertical' });
        this.renderer.div.appendChild(menuBar);
    }
}

export { LayerSwitcher };
