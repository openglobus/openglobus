/**
 * @module og/control/LayerSwitcher
 */

"use strict";

import { Control } from "./Control.js";
import { elementFactory, appendChildren, toggleText, enableElmovement } from "./UIhelpers.js";
import { compose } from "../utils/functionComposition.js"
/**
 * Advanced :) layer switcher, includes base layers, overlays, geo images etc. groups.
 * Double click for zoom, drag-and-drop to change zIndex
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerSwitcher extends Control {
    constructor(options = {}) {
        super({
            name: "LayerSwitcher",
            ...options
        });

        this._id = LayerSwitcher.numSwitches++;
        this.switcherDependent = options.switcherDependent
        this.expandedSections = options.expandedSections
        this.switcherInMenu = options.switcherInMenu // none (default)
    }

    // Why do we need those two functions? 
    static get numSwitches() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set numSwitches(n) {
        this._counter = n;
    }

    //----------------------------

    oninit() {

        const myData = this.getRecords(this.planet)
        const mainContainer = this.buildBasicDOM()
        this.buildRecords(myData, mainContainer, 0)

        const layerEvents = () => {
            this.planet.events.on("layeradd", this.addNewLayer, this)
            this.planet.events.on("layerremove", this.removeLayer, this)
        }

        this.planet.events.on("rendercompleted", layerEvents, this)
    }

    // BASIC DATA COLLECTION-PREPARATION FUNCTIONS
    planetDataBasic = () => {

        const collectTerrains = (planet) => {
            return [...planet._terrainPool]
        }

        const collectLayers = (planet) => {
            return planet.getLayers()
        }

        const pickBaseLayers = (layers) => {
            return layers.filter(x => x.isBaseLayer())
        }

        const pickOverlays = (layers) => {
            return layers.filter(x => !x.isBaseLayer())
        }

        const classifyObject = (object) => {
            let r = object.isBaseLayer()
            if (r === true || r === false) {
                return r === true ? 'BaseLayers' : 'Overlays'
            }
            else {
                return 'Terrain Providers'
            }
        }

        const sortByZIndex = (layers) => {
            return layers.sort((a, b) => (a.getZIndex() < b.getZIndex()) ? 1 : -1)
        }

        const serializeZIndices = (layers) => {
            layers.forEach((el, i) => el.setZIndex(10000 - i * 100))
            return layers
        }

        const normalizeOverlay = (overlay) => {
            overlay.data = overlay._entities || null
            return overlay
        }

        return {
            collectTerrains, collectLayers, pickBaseLayers, pickOverlays,
            classifyObject, sortByZIndex, serializeZIndices, normalizeOverlay
        }
    }

    // OUTPOUT TERRAINS, BASELAYERS, OVERLAYS
    planetDataReturn = (planet) => {

        const { collectTerrains, collectLayers, pickBaseLayers, pickOverlays,
            sortByZIndex, serializeZIndices, normalizeOverlay } = this.planetDataBasic()

        const terrains = collectTerrains(planet)

        const baseLayers = compose(planet)
            .run(collectLayers)
            .run(pickBaseLayers)
            .end()

        const overlays = compose(planet)
            .run(collectLayers)
            .run(pickOverlays)
            .run(sortByZIndex)
            .run(serializeZIndices)
            .runForEach(normalizeOverlay)
            .end()

        return { terrains, baseLayers, overlays }
    }

    dialogSectionStructure = (name, input, data) => {
        const section = {}
        section.name = name
        section.input = input
        section.data = data
        return section
    }

    recordsStructure = (terrains, baseLayers, overlays) => {
        const myData = {
            data: [
                this.dialogSectionStructure('Terrain Providers', 'radio', terrains),
                this.dialogSectionStructure('Base Layers', 'radio', baseLayers),
                this.dialogSectionStructure('Overlays', 'checkbox', overlays),
            ]
        }
        // console.log(myData) // enable this to have a visual representation of the dialog structure
        return myData
    }

    getRecords = (planet) => {
        const { terrains, baseLayers, overlays } = this.planetDataReturn(planet)
        const records = this.recordsStructure(terrains, baseLayers, overlays)
        return records
    }

    addNewLayer = (layer) => {
        // Put the data(layer) to the appropriate recordsStructure section and run the build function
        const { classifyObject } = this.planetDataBasic()
        const targets = [...document.body.querySelectorAll('.og-layer-switcher-record.og-depth-0 > details')]
        const type = classifyObject(layer)
        const object = this.recordsStructure().data.filter(x => x.name == type)
        const index = this.recordsStructure().data.findIndex(x => x.name == type)
        object[0].data = [layer]
        this.buildRecords(object[0], targets[index], 1, true)
    }

    removeLayer = (layer) => {
        // TODO...Haven't tested it yet 
        let id = layer.getID()
        let el = document.body.querySelector('#' + id + ".og-layer-switcher-record.og-depth-1")
        el.remove()

        if (layer.displayInLayerSwitcher) { // check necessary, or else error with layers not in switcher - e.g rulerScene layers.
            layer._removeCallback();
            layer._removeCallback = null
        }
    }

    getUserPrefs = () => {
        const switcherDependency = this.switcherDependent == undefined ? true : this.switcherDependent
        const sectionsOpening = this.expandedSections == undefined ? true : this.expandedSections
        const btnInMenu = this.switcherInMenu == undefined ? true : this.switcherInMenu

        return { switcherDependency, sectionsOpening, btnInMenu }
    }

    buildBasicDOM() {

        const { switcherDependency, sectionsOpening, btnInMenu } = this.getUserPrefs()

        // Basic DOM creation
        const D_menu_btn = elementFactory('div', { id: 'og-layer-switcher-menu-btn', class: 'og-menu-btn og-OFF' },
            elementFactory('div', { id: 'og-layer-switcher-menu-icon', class: 'og-icon-holder' }))
        const D_dialog = elementFactory('div', { class: 'og-layer-switcher-dialog og-dialog og-not-visible', id: 'og-layer-switcher-dialog' })
        const D_header = elementFactory('div', { class: 'og-layer-switcher-dialog-header' })
        const D_header_close = elementFactory('div', { id: 'og-layer-switcher-dialog-close-btn', class: 'og-dialog-header-btn og-OFF' },
            elementFactory('div', { class: 'og-icon-holder' }))
        const D_header_minMax = elementFactory('div', { id: 'og-layer-switcher-dialog-minMax-btn', class: 'og-dialog-header-btn og-OFF' },
            elementFactory('div', { class: 'og-icon-holder' }))
        const D_header_title = elementFactory('span', { class: 'og-dialog-header-title' }, 'Layer Switcher')
        const D_header_pin = elementFactory('div', { id: 'og-layer-switcher-dialog-pin-btn', class: 'og-dialog-header-btn og-OFF' },
            elementFactory('div', { class: 'og-icon-holder' }))
        const D_main_container = elementFactory('div', { class: 'og-layer-switcher-main-container' })

        D_header_pin.dataset.attachement = 'UNPINNED'

        // Append children to parents
        appendChildren(this.planet.renderer.div, [D_menu_btn, D_dialog])
        appendChildren(D_dialog, [D_header, D_main_container])
        appendChildren(D_header, [D_header_close, D_header_minMax, D_header_title, D_header_pin])

        // Behaviour according to dependency on switcher
        if (switcherDependency == false) {
            D_menu_btn.classList.add('og-hide') // hide menu btn
            D_dialog.classList.remove('og-not-visible') // Show dialog when opening webpage
            D_header_pin.classList.add('og-not-visible') //  hide the pin that attaches the dialog window    
        }

        const dialogBoxInitial = D_dialog.getBoundingClientRect() // Initial position of the dialog window

        // LISTENERS
        const whereClick = (e, wrapper, menuBtn) => {
            if (wrapper.contains(e.target)) { return 'inside' }
            else if (menuBtn.contains(e.target)) { return 'on-btn' }
            else { return 'outside' }
        }

        const whereClickHandler = (e) => {
            // Check where I clicked : in dialog, in button, elsewhere
            let whereIclicked = D_menu_btn ? whereClick(e, D_dialog, D_menu_btn) : null

            // If I clicked elsewhere and the dialog is unpinned, then hide dialog and set menu btn to OFF
            if (whereIclicked == 'outside' && D_header_pin.dataset.attachement == 'UNPINNED') {
                D_dialog.classList.add('og-not-visible')
                D_menu_btn.classList.add('og-OFF')
                // If Iclicked on button, toggle dialog and menu btn
            } else if (whereIclicked == 'on-btn') {
                D_dialog.classList.toggle('og-not-visible')
                D_menu_btn.classList.toggle('og-OFF')
            }
        }

        // Document
        document.addEventListener('click', (e) => whereClickHandler(e))

        // Header pin - here I am using instead of CSS classes, the data-* attribute of the DOM element to store the state
        D_header_pin.addEventListener('click', () => {
            let newText = toggleText(D_header_pin.dataset.attachement, ['PINNED', 'UNPINNED'])
            D_header_pin.classList.toggle('og-OFF')
            D_header_pin.dataset.attachement = newText
        })

        // Header double click
        D_header.addEventListener('dblclick', (e) => {
            if (D_header !== e.target) return
            restoreInitialPos(D_dialog)
        }, false)

        const restoreInitialPos = (el) => {
            el.style.top = dialogBoxInitial.top + "px";
            el.style.left = dialogBoxInitial.left + "px";
        }

        // Header mousedown --> move dialog OR nothing
        const { behaviour, mouseMove } = enableElmovement(D_dialog, this.planet)

        D_header.addEventListener('mousedown', (e) => {
            if (D_header_pin.dataset.attachement == 'UNPINNED') {
                behaviour(e)
            } else {
                document.removeEventListener('mousemove', mouseMove)
            }
        })

        D_header_close.addEventListener('click', () => {
            D_dialog.classList.add('og-not-visible')
            D_menu_btn.classList.add('og-OFF')
        })

        D_header_minMax.addEventListener('click', () => {
            D_main_container.classList.toggle('og-hide')
            D_main_container.classList.toggle('og-minimized')
            D_dialog.classList.toggle('og-minimized')
        })

        return D_main_container
    }

    buildRecords(myData, mainContainer, depth, createLastDropZone) {
        let planet = this.planet

        // Record functions
        const createTitle = (object) => {
            if (object.data) {
                return elementFactory('details', { class: 'og-layer-switcher-record-title' },
                    elementFactory('summary', {}, object.name || object.url || 'no-name'))
            } else {
                return elementFactory('label', { class: 'og-layer-switcher-record-title' },
                    object.name || object.properties.name || 'no-name')
            }
        }

        const visibility = (object, nameConcat) => {
            if (nameConcat == 'TerrainProviders' && planet.terrain == object) {
                return true
            } else if (nameConcat == 'BaseLayers' && planet.baseLayer == object) {
                return true
            } else if (nameConcat == 'OverLays' && object.getVisibility() == true) {
                return true
            }
        }

        const createInput = (object, depth, type, nameConcat) => {
            if (depth > 0) {
                return elementFactory('input', {
                    class: 'og-layer-switcher-record-input ' +
                        nameConcat, type: type || 'checkbox',
                    ...(visibility(object, nameConcat) ? { checked: true } : null)
                }, '')
            }
        }

        const createDropZone = (object, depth, type) => {
            if (depth > 0 && type === 'checkbox') {
                return elementFactory('div', { class: 'og-layer-switcher-dropZone' },)
            }
        }

        // Record listeners
        const inputListener = (input, nameConcat, object, title) => {
            input ? input.addEventListener('click', () => inputClick(input, nameConcat, object, title)) : null
        }

        const inputClick = (input, nameConcat, object, title) => {
            let siblings = [...document.querySelectorAll('.og-layer-switcher-record-input' + '.' + nameConcat)]
            if (nameConcat == 'BaseLayers') {
                siblings.forEach(sibling => sibling.checked = false)
                input.checked = true
                object.setVisibility(true)
            } else if (nameConcat == 'TerrainProviders') {
                siblings.forEach(sibling => sibling.checked = false)
                input.checked = true
                planet.setTerrain(object)
            } else if (nameConcat == 'Overlays') {
                object.setVisibility(input.checked)
                // Handle any entities contained in layer
                let entities = object._entities
                let inputs = [...title.querySelectorAll('input')]
                entities ? object._entities.forEach((entity, index) => {
                    inputs[index].checked = entity.getVisibility()
                }) : null
            } else {
                object.setVisibility(input.checked)
            }
        }

        const titleListener = (title, object) => {
            title ? title.addEventListener('dblclick', () => titleDoubleClick(object)) : null
        }

        const titleDoubleClick = (object) => {
            planet.flyExtent(object.getExtent())
        }

        // Record listeners - dragging behaviour
        const recordDragStart = (record) => {
            record.addEventListener('dragstart', () => {
                record.classList.add('og-dragging');
            })
        }
        const recordDragEnd = (record) => {
            record.addEventListener('dragend', () => {
                record.classList.remove('og-dragging');
            })
        }

        const recordDrag = (record) => {
            recordDragStart(record)
            recordDragEnd(record)
        }


        const dropZonedragOver = (dropZone) => {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault()
                dropZone.classList.add('og-drag-over')
            })
        }

        const dropZonedragLeave = (dropZone) => {
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('og-drag-over');
            })
        }

        // TODO in case layer entities will have dropZones I will have to modify this
        const dropZonedrop = (dropZone) => {
            dropZone.addEventListener('drop', (e) => {
                let overlayContainer = document.body.querySelector('div.og-depth-0:nth-child(3) > details:nth-child(1)')
                let dropZones = [...document.querySelectorAll('.og-layer-switcher-dropZone')];
                e.preventDefault();
                dropZone.classList.remove('og-drag-over');
                let selectedLayerRecord = document.querySelector('.og-dragging');
                // Get position of drop zone - last is a special case
                let pos = dropZones.indexOf(dropZone)
                if (pos < dropZones.length - 1) { // not last 
                    overlayContainer.insertBefore(selectedLayerRecord, dropZone.parentElement);  // Appear before the parent element     

                } else { // last
                    overlayContainer.insertBefore(selectedLayerRecord, dropZone); // Appear before last (fixed) dropzone element
                }
                indicesPerDialogOrder();
            });
        }

        const indicesPerDialogOrder = () => { // See how user has placed overlays in switcher and change ZIndexes accordingly (start 10000, go down 100)
            let records = [...document.querySelectorAll('.og-layer-switcher-record.og-depth-1.Overlays')]
            let ids = records.map(x => x.id)
            let layers = planet.layers

            let overlays = layers.filter(x => !x.isBaseLayer());
            let visible_overlays = [...overlays.filter(x => x.displayInLayerSwitcher)];
            for (let i = 0; i < ids.length; i++) {
                let the_layer = visible_overlays.filter(x => x.getID() == ids[i]);
                //
                //TODO: No need to set zIndexes manually, just change the order in planet container.
                //
                the_layer[0].setZIndex(10000 - i * 100);
            }
        }

        const dropZoneBehaviour = (dropZone) => {
            dropZonedragOver(dropZone)
            dropZonedragLeave(dropZone)
            dropZonedrop(dropZone)
        }

        const { sectionsOpening } = this.getUserPrefs()
        // Actual record creation
        const createChildren = (object, D_outerWrapper, depth) => {
            let data = object.data || object._entities
            if (data) {
                data.map((x, index) => {
                    let nameConcat = object.name ? object.name.replace(/\s/g, '') : null
                    let D_dropZone = createDropZone(x, depth, object.input)
                    let D_input = createInput(x, depth, object.input, nameConcat)
                    let D_title = createTitle(x)
                    D_input ? inputListener(D_input, nameConcat, x, D_title) : null
                    D_title && depth > 0 ? titleListener(D_title, x) : null // need depth > 0 cause to avoid calling on main sections
                    D_title && depth == 0 && sectionsOpening == true ? D_title.setAttribute("open", "") : null // open summaries of depth 0
                    let D_innerWrapper = elementFactory('div', {
                        id: depth == 1 ? x._id : null,
                        class: 'og-layer-switcher-record ' + 'og-depth-'
                            + depth + (nameConcat ? ' ' + nameConcat : ''),
                        draggable: D_dropZone ? true : false
                    })

                    D_dropZone ? dropZoneBehaviour(D_dropZone) : null
                    D_dropZone ? recordDrag(D_innerWrapper) : null
                    D_dropZone ? D_innerWrapper.appendChild(D_dropZone) : null

                    D_input ? D_innerWrapper.appendChild(D_input) : null
                    D_title ? D_innerWrapper.appendChild(D_title) : null
                    D_outerWrapper.appendChild(D_innerWrapper)

                    // Is last time in data array? Make another dropZone - fixed, not movable
                    if (index === data.length - 1 && createLastDropZone === true) {
                        let D_dropZone = createDropZone(x, depth, object.input)
                        D_dropZone ? dropZoneBehaviour(D_dropZone) : null
                        D_dropZone ? recordDrag(D_innerWrapper) : null
                        D_dropZone ? D_outerWrapper.appendChild(D_dropZone) : null
                    }

                    createChildren(x, D_title, depth + 1)
                })
            }
        }
        createChildren(myData, mainContainer, depth)

    }

    removeRecords() {
        let records = [...document.querySelectorAll('.og-layer-switcher-record.og-depth-0')]
        records.forEach(record => record.remove())
    }
}

export { LayerSwitcher }
