/**
 * @module og/control/Selector
 */

"use strict";

import { Control } from "../Control.js";
import { elementFactory, btnClickHandler } from "../../ui/UIhelpers.js";
import { SelectionScene } from "./SelectionScene.js";
import { ToggleButton } from "../../ui/ToggleButton.js";

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--gis" preserveAspectRatio="xMidYMid meet"><path d="M2.1 0v1.914H0v6h3V3h5.1V0h-6zm9 0v3h6V0h-6zm9 0v3h6V0h-6zm9 0v3h6V0h-6zm9 0v3h6V0h-6zm9 0v3h6V0h-6zm9 0v3h6V0h-6zm9 0v3h1.8v1.2h3V0h-4.8zm1.8 7.2v6h3v-6h-3zM0 10.913v6h3v-6H0zM66.9 16.2v6h3v-6h-3zM0 19.914v6h3v-6H0zM66.9 25.2v6h3v-6h-3zM0 28.914v6h3v-6H0zM66.9 34.2v6h3v-6h-3zM0 37.914v6h3v-6H0zM66.9 43.2v6h3v-6h-3zM0 46.914v6h3v-6H0zM66.9 52.2v6h3v-6h-3zM0 55.914v5.191h3.809v-3H3v-2.19H0zm6.809 2.191v3h6v-3h-6zm9 0v3h6v-3h-6zm9 0v3h6v-3h-6zm9 0v3h6v-3h-6zm9 0v3h6v-3h-6zm9 0v3h6v-3h-6zm9 0v3h6v-3h-6zm9.648 1.899a2.076 2.076 0 0 0-2.19 2.324l3.137 33.676c.2 1.635 2.135 2.399 3.397 1.34l6.623-5.371l2.969 5.142c1.707 2.958 4.417 3.684 7.375 1.977c2.957-1.708 3.684-4.417 1.976-7.375l-2.959-5.125l7.848-3.008c1.548-.564 1.855-2.62.539-3.611L71.576 60.416a2.073 2.073 0 0 0-1.119-.412z" fill="#000000"></path></svg>`;

/**
 * Activate Selection
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 * @param {boolean} [options.ignoreTerrain=false].
 * @param {function} options.onSelect - callback (extent) => {} where extent is selected extent array [minLon,minLat,maxLon,maxLat]
 * @param {boolean} [options.autoSelectionHide=false] - clear selection rectangle  after passing extent to callback
 * @example:
 * to use bootstrap icons, include
 *  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.2/font/bootstrap-icons.css">
 *
 * new Selection({
 *       ignoreTerrain: false,
 *       autoSelectionHide:true,
 *       onSelect: (extent) => {
 *
 *           var vectorSource = new ol.source.Vector({
 *               format: new GeoJSON(),
 *               url: function (extent) {
 *                   return 'https://snap.ogs.trieste.it/geoserver/snap/ows?service=WFS&' +
 *                           'version=1.1.0&request=GetFeature&typename=snap:all_dataset_segy_view&' +
 *                           'outputFormat=application/json&srsname=EPSG:4326&' +
 *                           'bbox=' + extent.join(',') + ',EPSG:4326';
 *               },
 *               strategy: function (extent, resolution) {
 *                   if (this.resolution && this.resolution != resolution) {
 *                       this.loadedExtentsRtree_.clear();
 *                   }
 *                   return [extent];
 *               }
 *           });
 *
 *           vectorSource.loadFeatures(extent);
 *           
 *           console.log(extent);
 *
 *       }
 *   });
 */
class Selection extends Control {
    constructor(options = {}) {
        super(options);

        this._selectorScene = new SelectionScene({
            name: `selectionScene:${this._id}`,
            ignoreTerrain: options.ignoreTerrain,
            onSelect: options.onSelect,
            autoSelectionHide: options.autoSelectionHide
        });


        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-selection_button"],
            icon: ICON_BUTTON_SVG
        });
    }

    set ignoreTerrain(v) {
        this._selectorScene.ignoreTerrain = v;
    }

    oninit() {
        this._toggleBtn.appendTo(this.renderer.div);

        this._toggleBtn.on("change", (isActive) => {
            if (isActive) {
                this.activate();
            } else {
                this.deactivate();
            }
        });

        this._selectorScene.bindPlanet(this.planet);
    }

    onactivate() {
        this.renderer.addNode(this._selectorScene);
    }

    ondeactivate() {
        this.renderer.removeNode(this._selectorScene);
    }
}

export { Selection };
