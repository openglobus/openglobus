/**
 * @module og/control/Ruler
 */

"use strict";

import { Control } from "../Control.js";
import { RulerScene } from "./RulerScene.js";
import { elementFactory, allMenuBtnOFF,  allDialogsHide, btnClickHandler} from "../UIhelpers.js";


/**
 * Activate ruler
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class Ruler extends Control {
    constructor(options = {}) {
        super(options);

        this._rulerScene = new RulerScene({
            name: `rulerScene:${this._id}`,
            ignoreTerrain: options.ignoreTerrain
        });

        this.dialog = null;
    }

    set ignoreTerrain(v) {
        this._rulerScene.ignoreTerrain = v;
    }

    oninit() {
        this._rulerScene.bindPlanet(this.planet);
        this. createMenuBtn();
        btnClickHandler('og-ruler-menu-btn', null, null, '#ruler-menu-icon'); // btn_id, dialog_id, dialog_selector, icon_id
    
    }

    onactivate() {
        this.renderer.addNode(this._rulerScene);
    }

    ondeactivate() {
        this.renderer.removeNode(this._rulerScene);
    }


    createMenuBtn() {
        let btn = elementFactory('div', { id: 'og-ruler-menu-btn', class: 'ruler menu-btn OFF' },
            elementFactory('div', { id: 'ruler-menu-icon', class: 'icon-holder' }));
        this.renderer.div.appendChild(btn);
        btn.addEventListener('click', () => {
            if(btn.classList.contains('OFF')){
                this.onactivate();
            }
            else{
                this.ondeactivate();
            }
        })
        }   
    }






export { Ruler };
