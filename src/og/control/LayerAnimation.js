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
        let currLayer = this._layersArr[this._currentIndex];
        if (currLayer.isEqual(layer)) {
            console.log("current layer is visible now");
            currLayer.opacity = 1.0;
            let prevLayer = this._layersArr[this._prevIndex];
            if (prevLayer) {
                prevLayer.setVisibility(false);
                prevLayer.opacity = 0.0;
            }
        }
    }

    setLayers(layers) {

    }

    appendLayer(layer) {

    }

    setCurrentIndex(index) {
        if (index != this._currentIndex && index >= 0 && index < this._layersArr.length) {
            this._prevIndex = this._currentIndex;
            this._currentIndex = index;

            let prevLayer = this._layersArr[this._prevIndex],
                currLayer = this._layersArr[index];

            if (currLayer) {
                currLayer.opacity = 0.0;
                currLayer.setVisibility(true);
                requestAnimationFrame(() => {
                    if (currLayer.isIdle) {
                        currLayer.opacity = 1.0;
                        if (prevLayer) {
                            prevLayer.setVisibility(false);
                            prevLayer.opacity = 0.0;
                        }
                    }
                });
            }
            this.events.dispatch(this.events.change, this._currentIndex, this._prevIndex);
        }
    }
}

export function layerAnimation(options) {
    return LayerAnimation(options);
}

export { LayerAnimation };
