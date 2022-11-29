/**
 * @module og/control/Selector
 */

"use strict";

import { Control } from "../Control.js";
import { elementFactory, btnClickHandler } from "../UIhelpers.js";
import { SelectionScene } from "./SelectionScene.js";


/**
 * Activate Selection
 * @class 
 * @extends {Control}
 * @param {Object} [options] - Control options.
 * @param {boolean} [options.ignoreTerrain=false].
 * @param {function} options.onSelect - callback (extent) => {} where extent is selected extent array [minLon,minLat,maxLon,maxLat]
 * @param {boolean} [options.autoSelectionHide=false] - clear selection rectangle  after passing extent to callback
 * @example:
 * new Selection({
 *      ignoreTerrain: false,
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
        
    }

    set ignoreTerrain(v) {
        this._selectorScene.ignoreTerrain = v;
    }

    oninit() {
        this.createSelectorButton();


        
        btnClickHandler('og-geo-image-dragger-menu-btn', null, null, 
            '#og-geo-image-dragger-menu-icon',
            (off) => {
                if (off){
                    this.deactivate();
                }  else {
                    this.activate();
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

    createSelectorButton() {
        let btn = elementFactory('div', {
            id: 'og-geo-image-dragger-menu-btn',
            class: 'og-geo-image-dragger og-menu-btn og-OFF'
        },
                elementFactory('div', {id: 'og-geo-image-dragger-menu-icon', class: 'og-icon-holder'}));
               
        this.renderer.div.appendChild(btn);
    }

}

export { Selection };
