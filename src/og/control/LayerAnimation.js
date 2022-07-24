/**
 * @module og/control/LayerAnimation
 */

"use strict";

import { Control } from "./Control.js";
import { Events } from '../Events.js';

/**
 *
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class LayerAnimation extends Control {
    constructor(options = {}) {
        super(options);

        this.events = new Events(["change"])

        this._name = `layerAnimation ${this._id}`;

        this._layersArr = options.layers || [];
        this._layersIndexesArr = this._layersArr.map((l) => l._id);

        this._currentIndex = -1;
    }

    oninit() {
        super.oninit();

        for (let i = 0; i < this._layersArr.length; i++) {
            let li = this._layersArr[i];
            li.setVisibility(false);
            li.opacity = 0.0;
            this.planet.addLayer(li);
        }


            this._onLayerLoadend_ = this._onLayerLoadend.bind(this);
        this.planet._tileLoader.events.on("layerloadend", this._onLayerLoadend_, this);

        this.setCurrentIndex(0);
    }

    onactivate() {
        super.onactivate();
        //...
    }

    ondeactivate() {
        super.ondeactivate();

        for (let i = 0; i < this._layersArr.length; i++) {
            this._layersArr[i].setVisibility(false);
            this._layersArr[i].opacity = 1.0;
        }

        this.planet._tileLoader.events.off("layerloadend", this._onLayerLoadend_);
        this._onLayerLoadend_ = null;
    }

    _onLayerLoadend(layer) {
        if (this._layersIndexesArr.indexOf(layer._id) !== -1) {
            console.log("loadend", layer);
        }
    }

    setLayers(layers) {

    }

    appendLayer(layer) {

    }

    setCurrentIndex(index) {
        if (index != this._currentIndex && index >= 0 && index < this._layersArr.length) {
            let prevIndex = this._currentIndex;
            this._currentIndex = index;

            let prevLayer = this._layersArr[prevIndex],
                currLayer = this._layersArr[index];

            if (prevLayer) {
                prevLayer.setVisibility(false);
                prevLayer.opacity = 0.0;
            }

            if (currLayer) {
                currLayer.setVisibility(true);
                currLayer.opacity = 1.0;
            }
            this.events.dispatch(this.events.change, index, prevIndex);
        }
    }
}

export function layerAnimation(options) {
    return LayerAnimation(options);
}

export { LayerAnimation };
