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
 * @param {Array} [options.activationIconClasses] - array with a list of classes to change the button icons
 * @param {boolean} [options.ignoreTerrain=false].
 * @param {function} options.onSelect - callback (extent) => {} where extent is selected extent array [minLon,minLat,maxLon,maxLat]
 * @param {boolean} [options.autoSelectionHide=false] - clear selection rectangle  after passing extent to callback
 * @example:
 * to use bootstrap icons, include 
 *  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.2/font/bootstrap-icons.css">
 *  
 * new Selection({
 *       activationIconClasses: ['bi', 'bi-bounding-box-circles'],
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
        this._activationIconClasses = options.activationIconClasses || null;
      
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


        
        btnClickHandler('og-selection-menu-btn', null, null, 
            '#og-selection-menu-icon',
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
        let btnIcon  = 
                elementFactory('div',
                    {id: 'og-selection-menu-icon', class: 'og-icon-holder'});
                    
       btnIcon.setAttribute("style", "font-size:24px; display: flex; justify-content: center; align-items: center; background: none !important");
       
        if (this._activationIconClasses){
            btnIcon.classList.add(... this._activationIconClasses);
        } else {
            let defaultIcon = document.createElement("span");
            defaultIcon.setAttribute("style", "width: 24px;height: 24px;border: 1px solid black;");
            btnIcon.appendChild(defaultIcon);
        }
        
        let btn = elementFactory('div', {
            id: 'og-selection-menu-btn',
            class: 'og-geo-image-dragger og-menu-btn og-OFF'
        },btnIcon);
        
        btn.setAttribute("style", "top: 116px; right: 12px");
      
        
        this.renderer.div.appendChild(btn);
    }

}

export { Selection };
