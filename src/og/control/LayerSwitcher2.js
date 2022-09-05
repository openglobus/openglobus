/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";
import { elementFactory, btnClickHandler } from "./UIhelpers.js";

/**
 * Advanced :) layer switcher, includes base layers, overlays, geo images etc. groups.
 * Double click for zoom, drag-and-drop to change zIndex
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerSwitcher extends Control {
    constructor(options) {
        super({
            name: "LayerSwitcher",
            options
        });

        // Options and default values
        // this.popupType = options.popupType ||' dialog';

        // Each layer record has it's own dropzone to the top of the div. We need a final one to the very end.
        this.lastDropZone = elementFactory('div', {
            id: 'og-last-layer-drop-zone',
            class: 'og-layer-record-drop-zone'
        });
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
        this.createMenuVbar(); // no need ????
        this.createMenuBtn();
        this.createDialog();
        this.createDOM();

        btnClickHandler(
            'og-layer-switcher-menu-btn',
            'og-layer-switcher-dialog',
            '.og-layer-switcher.og-dialog *',
            '#og-layer-switcher-menu-icon'
        ); // btn_id, dialog_id, dialog_selector, icon_id
    }

    onLayerAdded(layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.isBaseLayer()) {
                this.createContainerRecord("radio", layer, this.baseLayersContainer);
            } else {
                this.createContainerRecord("checkbox", layer, this.overlaysContainer, layer._id);

                var dropZone = elementFactory('div', { class: 'og-layer-record-drop-zone' }); // create and append dropZone element
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

    objectDOM() {
        let terrainPool = this.planet._terrainPool;
        let layers = this.planet.getLayers();
        let baseLayers = layers.filter(x => x.isBaseLayer());
        let overlays = layers.filter(x => !x.isBaseLayer());

        const HTML_SETTINGS = [
            {
                name: 'Terrain Providers',
                children:
                {
                    data: terrainPool,
                    input: 'radio'
                }
            },
            {
                name: 'Base Layers',
                children:
                {
                    data: baseLayers,
                    input: 'radio'
                }
            },
            {
                name: 'Overlays',
                children:
                {
                    data: overlays,
                    input: 'checkbox',
                    grandchildren: true

                }

            }
        ]

        return HTML_SETTINGS;
    }

    createDOM() {
        let theEntities = (overlay) => overlay._entities;
        let wrapper = elementFactory('div', { class: 'og-layer-switcher-wrapper' });

        this.objectDOM().forEach(parent => {

            // Create Section/Parent
            var theParent = elementFactory('details', { class: 'og-layer-switcher-section' },
                elementFactory('summary', { class: 'og-layer-switcher-summary' }, parent.name));
            wrapper.appendChild(theParent);

            // Create Section's children
            let children = parent.children.data;

            children.forEach(child => {

                if (parent.children.grandchildren && theEntities(child)) {
                    var theChild = elementFactory('details', { class: 'og-layer-switcher-section' },
                        elementFactory('summary', { class: 'og-layer-switcher-summary' }, child.name));

                        // Create grandchildren
               
                    let grandchildren = theEntities(child);
                    grandchildren.forEach(grandchild => {
                        let theGrandchild = elementFactory('label', { class: 'child' }, grandchild.name);
                        theChild.appendChild(theGrandchild);
                    })
                } else {
                    var theChild = elementFactory('div', { class: 'child' });
                    let input = elementFactory('input', { class: 'child', type: parent.children.input });
                    let label = elementFactory('label', { class: 'child' }, child.name);
                    theChild.appendChild(input);
                    theChild.appendChild(label);
                }

                theParent.appendChild(theChild);

                
                
            })

        })

        document.body.appendChild(wrapper)
    }


    createContainerRecord(type, obj, container, id = "") {

        let thelayerRecord = elementFactory(
            'div', {
            id: id,
            class: 'og-layer-record'
        });

        this.layerRecord = thelayerRecord; // export to global variable, to access onLayerAdded

        let input = elementFactory(
            'input',
            {
                type: type,
                class: 'og-layer-switcher-input',
                ...(obj.getVisibility() ? { checked: true } : null)
            });

        let caption = obj.name || obj.url;

        let label = elementFactory(
            'span',
            {
                class: 'og-layer-record-label',
                title: caption
            },
            caption
        );

        let info = elementFactory(
            'img',
            {
                class: 'og-layer-record-info'
            });

        this.layerRecord.appendChild(input);
        this.layerRecord.appendChild(label);
        this.layerRecord.appendChild(info);

        container.appendChild(this.layerRecord);

        // Drag events for the layer-record (for CSS styling)
        thelayerRecord.addEventListener('dragstart', () => {
            thelayerRecord.classList.add('og-dragging');
        });

        thelayerRecord.addEventListener('dragend', () => {
            thelayerRecord.classList.remove('og-dragging');
        });

        // Events of input click and label double click
        input.onclick = function () {
            obj.setVisibility(input.checked);
        };

        obj.events &&
            obj.events.on("visibilitychange", function (e) {
                input.checked = e.getVisibility();
            });

        label.ondblclick = () => {
            this.planet.flyExtent(obj.getExtent());
        }

        obj._removeCallback = function () {
            container.removeChild(thelayerRecord);
        }
    }

    assignZindexesPerDialogOrder() { // See how user has placed overlays in switcher and change ZIndexes accordingly (start 10000, go down 100)
        let dialog_layer_records = [...document.querySelectorAll('#og-overlay-container .og-layer-record')];
        let dialog_layer_ids = dialog_layer_records.map(x => x.id);
        let layers = this.planet.layers;
        let overlays = layers.filter(x => !x.isBaseLayer());
        let visible_overlays = [...overlays.filter(x => x.displayInLayerSwitcher)];
        for (let i = 0; i < dialog_layer_ids.length; i++) {
            let the_layer = visible_overlays.filter(x => x.getID() == dialog_layer_ids[i]);
            //
            //TODO: No need to set zIndexes manually, just change the order in planet container.
            //
            the_layer[0].setZIndex(10000 - i * 100);
        }
    }

    dropZonedragOver(dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('og-drag-over');
        });
    }

    dropZonedragLeave(dropZone) {
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('og-drag-over');
        });
    }

    dropZonedrop(dropZone) {
        let dropZones = [...document.querySelectorAll('.og-layer-record-drop-zone')];
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('og-drag-over');
            let selectedLayerRecord = document.querySelector('.og-dragging');
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

    createTerrainRecord(id, obj) {

        let terrainRecord = elementFactory(
            'div',
            {
                id: id,
                class: 'og-layer-record'
            });

        let input = elementFactory(
            'input',
            {
                type: "radio",
                class: 'og-layer-switcher-input'
            });

        let caption = obj.name || obj.url;
        let label = elementFactory(
            'span',
            {
                class: 'og-layer-record-label',
                title: caption
            },
            caption
        );

        let info = elementFactory(
            'img',
            {
                class: 'og-layer-record-info'
            });

        terrainRecord.appendChild(input);
        terrainRecord.appendChild(label);
        terrainRecord.appendChild(info);

        this.terrainContainer.appendChild(terrainRecord);

        if (id === 0) {
            input.checked = true;
        }

        // Events of input click and label double click
        input.onclick = () => {

            let inputs = document.querySelectorAll('.og-terrain-switcher-container input');

            inputs.forEach(input => {
                input.checked = false;
            })

            input.checked = true;
            this.planet.setTerrain(obj);
        };
    }

    createDialog() {
        this.terrainContainer = elementFactory(
            'div',
            {
                class: 'og-terrain-switcher-container og-layer-container'
            },
            'Terrain Providers'
        );

        this.baseLayersContainer = elementFactory(
            'div',
            {
                class: 'og-layer-switcher-base-layer-container og-layer-container'
            },
            'Base Layers'
        );

        this.overlaysContainer = elementFactory(
            'div',
            {
                id: 'og-overlay-container',
                class: 'og-layer-switcher-overlay-container og-layer-container'
            },
            'Overlays'
        );

        this.dialog = elementFactory('div',
            {
                id: 'og-layer-switcher-dialog',
                class: 'og-layer-switcher og-dialog og-hide'
            });

        this.renderer.div.appendChild(this.dialog);
        this.dialog.appendChild(this.terrainContainer);
        this.dialog.appendChild(this.baseLayersContainer);
        this.dialog.appendChild(this.overlaysContainer);

        if (this.planet) {
            let layers = this.planet.layers;
            let baseLayers = layers.filter(x => x.isBaseLayer());
            let overlays = layers.filter(x => !x.isBaseLayer());
            let overlays_sorted = overlays.sort((a, b) => (a.getZIndex() < b.getZIndex()) ? 1 : -1) // Sort by zIndex, so I get the highest first

            for (let i = 0; i < baseLayers.length; i++) { // Loop baselayers and add them, running the function
                this.onLayerAdded(baseLayers[i]);
            }

            for (let i = 0; i < overlays_sorted.length; i++) { // Loop overlays - with new zIndexes - and add them, running the function
                this.onLayerAdded(overlays_sorted[i]);
            }

            // Create terrain records
            let terrainPool = [...this.planet._terrainPool];

            if (terrainPool) {
                for (let i = 0; i < terrainPool.length; i++) {
                    this.createTerrainRecord(i, terrainPool[i]);
                }
            }
        }

        // Last dropZone events - haven't been attached before
        this.dropZoneBehaviour(this.lastDropZone);
    }

    createMenuBtn() {
        let btn = elementFactory('div', {
            id: 'og-layer-switcher-menu-btn',
            class: 'og-layer-switcher og-has-dialog og-menu-btn og-OFF'
        },
            elementFactory(
                'div',
                {
                    id: 'og-layer-switcher-menu-icon',
                    class: 'og-icon-holder'
                })
        );

        this.renderer.div.appendChild(btn);
    }

    createMenuVbar() {
        let menuBar = elementFactory(
            'div',
            {
                class: 'og-menu-bar-vertical'
            });

        this.renderer.div.appendChild(menuBar);
    }
}

export { LayerSwitcher };
