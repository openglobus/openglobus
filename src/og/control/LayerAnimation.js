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

        this.events = new Events(["change", "idle", "play", "pause", "stop"])

        this._name = options.name || `layerAnimation-${this._id}`;

        this._layersArr = options.layers ? [].concat(options.layers) : [];
        this._currentIndex = -1;
        this._prevIndex = -1;
        this._prevReadyIndex = -1;

        this._playInterval = options.playInterval || 150;
        this._playIntervalHandler = -1;
        this._playIndex = 0;

        this._frameSize = options.frameSize || 25;

        this.repeat = options.repeat != undefined ? options.repeat : true;

        this.skipTimeout = options.skipTimeout || 5000;

        this._timeoutStart = 0;
    }

    _setFrame(frameIndex) {
        if (this._getFrameIndex(this._currentIndex) !== frameIndex) {
            for (let i = 0, len = this._getFramesNum(); i < len; i++) {
                if (i !== frameIndex) {
                    this._removeFrameFromPlanet(i);
                } else {
                    this._appendFrameToPlanet(i);
                }
            }
        }
    }

    _getFramesNum() {
        return Math.ceil(this._layersArr.length / this._frameSize);
    }

    _getFrameIndex(layerIndex) {
        return Math.floor(layerIndex / this._frameSize);
    }

    _appendFrameToPlanet(frameIndex) {
        if (this.planet) {
            let minIndex = frameIndex * this._frameSize;
            let maxIndex = minIndex + this._frameSize;
            for (let i = minIndex, len = maxIndex > this._layersArr.length ? this._layersArr.length : maxIndex; i < len; i++) {
                let li = this._layersArr[i];
                li.opacity = 0;
                li.setVisibility(false);
                this.planet.addLayer(li);
            }
        }
    }

    _removeFrameFromPlanet(frameIndex) {
        if (this.planet) {
            let minIndex = frameIndex * this._frameSize;
            let maxIndex = minIndex + this._frameSize;
            for (let i = minIndex, len = maxIndex > this._layersArr.length ? this._layersArr.length : maxIndex; i < len; i++) {
                this._layersArr[i].remove();
            }
        }
    }

    oninit() {
        super.oninit();
        this._initLayers();
        this._onLayerLoadend_ = this._onLayerLoadend.bind(this);
        this.planet.events.on("layerloadend", this._onLayerLoadend_, this);
        this.setCurrentIndex(0, true);
    }

    _onViewchange() {
        this._timeoutStart = performance.now();
    }

    onactivate() {
        super.onactivate();
        this._onViewchange_ = this._onViewchange.bind(this);
        this.planet.camera.events.on("viewchange", this._onViewchange_, this)
        //...
    }

    ondeactivate() {
        super.ondeactivate();
        this.planet.camera.events.off("viewchange", this._onViewchange_);
        this._onViewchange_ = null;

        for (let i = 0; i < this._layersArr.length; i++) {
            this._layersArr[i].setVisibility(false);
        }

        this.planet.events.off("layerloadend", this._onLayerLoadend_);
        this._onLayerLoadend_ = null;
    }

    clear() {
        this.stop();
        this._currentIndex = -1;
        this._prevReadyIndex = -1;
        this._prevIndex = -1;
        let layersToRemove = this._layersArr;
        this._layersArr = [];
        for (let i = 0; i < layersToRemove.length; i++) {
            layersToRemove[i].remove();
        }
    }

    _initLayers() {
        if (this.planet) {
            for (let i = 0, len = this._layersArr.length; i < len; i++) {
                let li = this._layersArr[i];
                li.setVisibility(false);
                li.setBaseLayer(false);
                li.opacity = 0.0;
            }
            this._appendFrameToPlanet(0);
        }
    }

    setLayers(layers) {
        this.clear();
        this._layersArr = [].concat(layers);
        this._initLayers();
    }

    appendLayer(layer) {
        this._layersArr.push(layer);
        layer.setVisibility(false);
        layer.setBaseLayer(false);
        layer.opacity = 0.0;
        if (this.planet) {
            //check current frame
            this.planet.addLayer(layer);
        }
    }

    /**
     * warning: Use XYZ.isIdle in requesAnimationFrame(after setVisibility)
     * @returns {boolean} Returns truw if current layer is idle
     */
    get isIdle() {
        let currLayer = this._layersArr[this._currentIndex];
        return currLayer && currLayer.isIdle || !currLayer;
    }

    get playInterval() {
        return this._playInterval;
    }

    set playInterval(val) {
        if (val !== this._playInterval) {
            this._playInterval = val;
            if (this.isPlaying) {
                this.pause();
                this.play();
            }
        }
    }

    get isPlaying() {
        return this._playIntervalHandler !== -1;
    }

    get layers() {
        return this._layersArr;
    }

    _checkEnd() {
        if (this._playIndex > this._layersArr.length) {
            if (this.repeat) {
                this._playIndex = 0;
            } else {
                this.pause();
            }
        }
    }

    stop() {
        if (this._playIndex !== 0) {
            this._clearInterval();
            this._playIndex = 0;
            this._setFrame(0);
            this.setCurrentIndex(0);
            this.events.dispatch(this.events.stop);
        }
    }

    pause() {
        if (this.isPlaying) {
            this._clearInterval();
            this.events.dispatch(this.events.pause);
        }
    }

    _clearInterval() {
        clearInterval(this._playIntervalHandler);
        this._playIntervalHandler = -1;
    }

    play() {
        if (!this.isPlaying) {

            if (this._currentIndex >= this._layersArr.length - 1) {
                this.stop();
            }

            this._playIntervalHandler = setInterval(() => {
                this._checkEnd();
                this._setCurrentIndexAsync(this._playIndex);

                requestAnimationFrame(() => {
                    if (performance.now() - this._timeoutStart > this.skipTimeout) {
                        this._playIndex++;
                        this._timeoutStart = performance.now();
                        this._layersArr[this._currentIndex].setVisibility(false);
                    } else if (this.isIdle) {
                        this._playIndex++;
                        this._timeoutStart = performance.now();
                    }
                });

            }, this._playInterval);

            this.events.dispatch(this.events.play);
        }
    }

    /**
     * Function sets layer index visible. If the layer is idle (all visible tiles loaded), sets opacity to one,
     * otherwise to ZERO it means that when all visible tiles will be loaded the opacity becomes ONE. So, previous
     * layer remains non transparent (opacity = 1) till current layer is loading.
     * @param {number} index
     * @param {boolean} [stopPropagation]
     */
    setCurrentIndex(index, stopPropagation) {
        if (index != this._currentIndex && index >= 0 && index < this._layersArr.length) {
            this._prevIndex = this._currentIndex;
            this._currentIndex = index;

            let prevFrame = this._getFrameIndex(this._prevIndex);
            let currFrame = this._getFrameIndex(this._currentIndex);

            let currLayer = this._layersArr[index];
            let prevLayer = this._layersArr[this._prevIndex];

            let frameChanged = currFrame != prevFrame && this._prevIndex !== -1;
            if (frameChanged) {
                this._appendFrameToPlanet(currFrame);
            }

            if (currLayer) {
                this.pause();
                this._playIndex = index;
                currLayer.opacity = 1.0;
                currLayer.setVisibility(true);
                if (prevLayer) {
                    prevLayer.opacity = 0.0;
                    prevLayer.setVisibility(false);
                }
                let prevReadyLayer = this._layersArr[this._prevReadyIndex];
                if (prevReadyLayer) {
                    prevReadyLayer.opacity = 0.0;
                    prevReadyLayer.setVisibility(false)
                }

                let prevReadyFrame = this._getFrameIndex(this._prevReadyIndex);
                let readyFrameChanged = currFrame != prevReadyFrame && this._prevReadyIndex !== -1;
                if (readyFrameChanged) {
                    this._removeFrameFromPlanet(prevReadyFrame);
                }

                // If frame is changed - remove it from the planet
                if (frameChanged) {
                    this._removeFrameFromPlanet(prevFrame);
                }

                if (!stopPropagation) {
                    this.events.dispatch(this.events.change, this._currentIndex, this._prevIndex);
                }
            }
        }
    }

    /**
     * Waiting for the current index layer loadend and make it non transparent,
     * and make prev layer transparent, also check previous frame index to cleanup.
     * @param {Layer} layer
     * @private
     */
    _onLayerLoadend(layer) {
        let currLayer = this._layersArr[this._currentIndex];
        if (currLayer && currLayer.isEqual(layer)) {

            // * CURRENT Layer is VISIBLE NOW *
            currLayer.opacity = 1.0;

            let prevLayer = this._layersArr[this._prevIndex];
            if (prevLayer) {
                prevLayer.opacity = 0.0;
                prevLayer.setVisibility(false);
                // If frame is changed - remove it from the planet
                let prevFrame = this._getFrameIndex(this._prevIndex);
                if (this._getFrameIndex(this._currentIndex) !== prevFrame) {
                    this._removeFrameFromPlanet(prevFrame);
                }
            }

            let prevReadyLayer = this._layersArr[this._prevReadyIndex];
            if (prevReadyLayer) {
                prevReadyLayer.opacity = 0.0;
                prevReadyLayer.setVisibility(false);
                // If frame is changed - remove it from the planet
                let prevReadyFrame = this._getFrameIndex(this._prevReadyIndex);
                if (this._getFrameIndex(this._currentIndex) !== prevReadyFrame) {
                    this._removeFrameFromPlanet(prevReadyFrame);
                }
            }

            this.events.dispatch(this.events.idle, currLayer, prevLayer, this._currentIndex, this._prevIndex);
        }
    }

    _setCurrentIndexAsync(index) {
        if (index != this._currentIndex && index >= 0 && index < this._layersArr.length) {
            this._prevIndex = this._currentIndex;
            this._currentIndex = index;

            let prevFrame = this._getFrameIndex(this._prevIndex);
            let currFrame = this._getFrameIndex(this._currentIndex);

            let currLayer = this._layersArr[index];
            let prevLayer = this._layersArr[this._prevIndex];

            let frameChanged = currFrame != prevFrame && this._prevIndex !== -1;
            if (frameChanged) {
                this._appendFrameToPlanet(currFrame);
            }

            if (currLayer) {
                currLayer.opacity = 0.0;
                currLayer.setVisibility(true);
                requestAnimationFrame(() => {

                    if (prevLayer && prevLayer.isIdle) {
                        this._prevReadyIndex = this._prevIndex;
                    }

                    if (currLayer.isIdle) {
                        currLayer.opacity = 1.0;
                        if (prevLayer) {
                            prevLayer.opacity = 0.0;
                            prevLayer.setVisibility(false);
                        }

                        // If frame is changed - remove it from the planet
                        if (frameChanged) {
                            this._removeFrameFromPlanet(prevFrame);
                        }

                        let prevReadyFrame = this._getFrameIndex(this._prevReadyIndex);
                        let readyFrameChanged = currFrame != prevReadyFrame && this._prevReadyIndex !== -1;
                        if (readyFrameChanged) {
                            this._removeFrameFromPlanet(prevReadyFrame);
                        }
                    }
                });

                this.events.dispatch(this.events.change, this._currentIndex, this._prevIndex);
            }
        }
    }
}

export function

layerAnimation(options) {
    return LayerAnimation(options);
}

export {
    LayerAnimation
};
