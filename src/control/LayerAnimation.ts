import {EventsHandler, createEvents} from '../Events';
import {Layer} from '../layer/Layer';
import {Control, IControlParams} from "./Control";

type LayerAnimationEventsList = ["change", "idle", "play", "pause", "stop"];

const LAYERANIMATION_EVENTS: LayerAnimationEventsList = ["change", "idle", "play", "pause", "stop"];

interface ILayerAnimationParams extends IControlParams {
    layers?: Layer,
    playInterval?: number,
    frameSize?: number,
    repeat?: boolean;
    skipTimeout?: number;
}

export class LayerAnimation extends Control {
    events: EventsHandler<LayerAnimationEventsList>;
    _layersArr: Layer[];
    _currentIndex: number;
    _playInterval: number;
    _playIntervalHandler: any;
    _playIndex: number;
    _frameSize: number;
    repeat: boolean;
    skipTimeout: number;
    _timeoutStart: number;
    _currVisibleIndex: number = 0;


    _onLayerLoadend_: any;
    _onViewchange_: any;
    _onVisibityChange_: any;


    constructor(options: ILayerAnimationParams = {}) {
        super(options);
        this.events = createEvents(LAYERANIMATION_EVENTS);
        this._name = options.name || `layerAnimation-${this.__id}`;
        this._layersArr = options.layers ? ([] as Layer[]).concat(options.layers) : [];
        this._currentIndex = -1;
        this._playInterval = options.playInterval || 120;
        this._playIntervalHandler = -1;
        this._playIndex = 0;
        this._frameSize = options.frameSize || 50;
        this.repeat = options.repeat != undefined ? options.repeat : true;
        this.skipTimeout = options.skipTimeout || 5000;
        this._timeoutStart = 0;
    }

    _onViewchange() {
        this._timeoutStart = performance.now();
    }

    _getFramesNum() {
        return Math.ceil(this._layersArr.length / this._frameSize);
    }

    _setFrame(frameIndex: number) {
        for (let i = 0, len = this._getFramesNum(); i < len; i++) {
            if (i !== frameIndex) {
                this._removeFrameFromPlanet(i);
            } else {
                this._appendFrameToPlanet(i);
            }
        }
    }

    _getFrameIndex(layerIndex: number) {
        return Math.floor(layerIndex / this._frameSize);
    }

    _appendFrameToPlanet(frameIndex: number) {
        if (this.planet) {
            let minIndex = frameIndex * this._frameSize;
            let maxIndex = minIndex + this._frameSize;
            for (let i = minIndex, len = maxIndex > this._layersArr.length ? this._layersArr.length : maxIndex; i < len; i++) {
                this.planet.addLayer(this._layersArr[i]);
            }
        }
    }

    _removeFrameFromPlanet(frameIndex: number) {
        if (this.planet) {
            let minIndex = frameIndex * this._frameSize;
            let maxIndex = minIndex + this._frameSize;
            for (let i = minIndex, len = maxIndex > this._layersArr.length ? this._layersArr.length : maxIndex; i < len; i++) {
                this._layersArr[i].abortLoading();
                this._layersArr[i].remove();
                this._layersArr[i].setVisibility(false);
            }
        }
    }

    override oninit() {
        super.oninit();
        this.onactivate();
        this._initLayers();
        this._onLayerLoadend_ = this._onLayerLoadend.bind(this);
        this.planet!.events.on("layerloadend", this._onLayerLoadend_, this);
        this._setCurrentIndexAsync(0, false, true);
    }

    override onactivate() {
        super.onactivate();
        this._onViewchange_ = this._onViewchange.bind(this);
        this.planet!.camera.events.on("viewchange", this._onViewchange_, this);

        this._onVisibityChange_ = this._onVisibityChange.bind(this);
        this.planet!.renderer!.handler.events.on("visibilitychange", this._onVisibityChange_, this);
    }

    override ondeactivate() {
        super.ondeactivate();
        this.planet!.camera.events.off("viewchange", this._onViewchange_);
        this._onViewchange_ = null;

        for (let i = 0; i < this._layersArr.length; i++) {
            this._layersArr[i].setVisibility(false);
        }

        this.planet!.events.off("layerloadend", this._onLayerLoadend_);
        this._onLayerLoadend_ = null;

        this.planet!.renderer!.handler.events.off("visibilitychange", this._onVisibityChange_);
        this._onVisibityChange_ = null;
    }

    _onVisibityChange(isVisible: boolean) {
        if (!isVisible) {
            this.pause();
        }
    }

    clear() {
        this.stop();
        this._currentIndex = -1;
        this._currVisibleIndex = -1;
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

    setLayers(layers: Layer[]) {
        this.clear();
        this._layersArr = [].concat(layers as any);
        this._initLayers();
    }

    appendLayer(layer: Layer) {
        this._layersArr.push(layer);
        layer.setVisibility(false);
        layer.setBaseLayer(false);
        layer.opacity = 0.0;
        //check current frame
        this.planet?.addLayer(layer);
    }

    /**
     * warning: Use XYZ.isIdle in requesAnimationFrame(after setVisibility)
     * @returns Returns truw if current layer is idle
     */
    get isIdle(): boolean {
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

    play() {
        if (!this.isPlaying) {

            if (this._currentIndex >= this._layersArr.length - 1) {
                this.stop();
            }

            this._timeoutStart = performance.now();

            this._playIntervalHandler = setInterval(() => {
                this._checkEnd();
                this._setCurrentIndexAsync(this._playIndex, false, false);

                requestAnimationFrame(() => {
                    if (this.isIdle || (performance.now() - this._timeoutStart > this.skipTimeout)) {
                        this._playIndex++;
                        this._timeoutStart = performance.now();
                    }
                });

            }, this._playInterval);

            this.events.dispatch(this.events.play);
        }
    }

    stop() {
        if (this._playIndex > 0) {
            this._clearInterval();
            this._playIndex = 0;
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

    /**
     * Waiting for the current index layer loadend and make it non transparent,
     * and make prev layer transparent, also check previous frame index to cleanup.
     */
    private _onLayerLoadend(layer: Layer) {

        let currLayer = this._layersArr[this._currentIndex];

        if (currLayer && currLayer.isEqual(layer)) {

            // BRUTE
            let currFrame = this._getFrameIndex(this._currentIndex);
            let from = currFrame * this._frameSize,
                to = this._currentIndex;
            for (let i = from; i < to; i++) {
                let li = this._layersArr[i];
                li.opacity = 0;
                li.setVisibility(false);
            }

            // * Make CURRENT Layer VISIBLE *
            currLayer.opacity = 1.0;

            let currVisibleLayer = this._layersArr[this._currVisibleIndex];
            if (currVisibleLayer) {
                currVisibleLayer.opacity = 0.0;
                currVisibleLayer.setVisibility(false);

                // If frame is changed - remove it from the planet
                let prevFrame = this._getFrameIndex(this._currVisibleIndex);
                if (this._getFrameIndex(this._currentIndex) !== prevFrame) {
                    this._removeFrameFromPlanet(prevFrame);
                }
            }

            this.events.dispatch(this.events.idle, currLayer);
        }
    }


    /**
     * Function sets layer index visible.
     * @param {number} index
     * @param {boolean} [stopPropagation]
     */
    setCurrentIndex(index: number, stopPropagation = false) {
        this._setCurrentIndexAsync(index, true, stopPropagation);
    }

    /**
     * Function sets layer index visible. If the layer is idle (all visible tiles loaded), sets opacity to one,
     * otherwise to ZERO it means that when all visible tiles will be loaded the opacity becomes ONE. So, previous
     * layer remains non transparent (opacity = 1) till current layer is loading.
     */
    _setCurrentIndexAsync(index: number, forceVisibility: boolean, stopPropagation: boolean) {

        if (index != this._currentIndex && index >= 0 && index < this._layersArr.length) {

            let prevCurrIndex = this._currentIndex;
            this._currentIndex = index;
            this._playIndex = index;

            let prevCurrFrame = this._getFrameIndex(prevCurrIndex);
            let currFrame = this._getFrameIndex(this._currentIndex);

            let prevCurrLayer = this._layersArr[prevCurrIndex],
                currLayer = this._layersArr[index];

            let frameChanged = currFrame != prevCurrFrame;
            if (frameChanged) {
                this._appendFrameToPlanet(currFrame);
            }

            if (prevCurrLayer) {
                if (prevCurrLayer.isIdle) {
                    this._currVisibleIndex = prevCurrIndex;
                } else {
                    prevCurrLayer.opacity = 0;
                    prevCurrLayer.setVisibility(false);
                }
            }

            if (currLayer) {

                currLayer.opacity = 0.0;
                currLayer.setVisibility(true);

                requestAnimationFrame(() => {
                    if (currLayer.isIdle || forceVisibility) {

                        currLayer.opacity = 1.0;

                        // If frame is changed - remove it from the planet
                        if (frameChanged) {
                            this._removeFrameFromPlanet(prevCurrFrame);
                        }

                        if (prevCurrLayer) {
                            prevCurrLayer.opacity = 0.0;
                            prevCurrLayer.setVisibility(false);
                        }

                        let currVisibleLayer = this._layersArr[this._currVisibleIndex];
                        if (currVisibleLayer) {
                            currVisibleLayer.opacity = 0.0;
                            currVisibleLayer.setVisibility(false);
                        }
                    }
                });

                if (!stopPropagation) {
                    this.events.dispatch(this.events.change, this._currentIndex, prevCurrIndex);
                }
            }
        }
    }
}

/**
 * @deprecated
 */
export const layerAnimation = (options: any) => new LayerAnimation(options);
