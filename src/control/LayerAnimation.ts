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
    public events: EventsHandler<LayerAnimationEventsList>;
    protected _layersArr: Layer[];
    protected _currentIndex: number;
    protected _playInterval: number;
    protected _playIntervalHandler: any;
    protected _playIndex: number;
    protected _frameSize: number;
    public repeat: boolean;
    public skipTimeout: number;
    protected _timeoutStart: number;
    protected _currVisibleIndex: number = 0;

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

    protected _onViewchange = () => {
        this._timeoutStart = performance.now();
    }

    protected _getFramesNum(): number {
        return Math.ceil(this._layersArr.length / this._frameSize);
    }

    protected _setFrame(frameIndex: number) {
        for (let i = 0, len = this._getFramesNum(); i < len; i++) {
            if (i !== frameIndex) {
                this._removeFrameFromPlanet(i);
            } else {
                this._appendFrameToPlanet(i);
            }
        }
    }

    protected _getFrameIndex(layerIndex: number): number {
        return Math.floor(layerIndex / this._frameSize);
    }

    protected _appendFrameToPlanet(frameIndex: number) {
        if (this.planet) {
            let minIndex = frameIndex * this._frameSize;
            let maxIndex = minIndex + this._frameSize;
            for (let i = minIndex, len = maxIndex > this._layersArr.length ? this._layersArr.length : maxIndex; i < len; i++) {
                this.planet.addLayer(this._layersArr[i]);
            }
        }
    }

    protected _removeFrameFromPlanet(frameIndex: number) {
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

    public override oninit() {
        super.oninit();
        this.onactivate();
        this._initLayers();
        this.planet!.events.on("layerloadend", this._onLayerLoadend);
        this._setCurrentIndexAsync(0, false, true);
    }

    public override onactivate() {
        super.onactivate();
        this.planet!.camera.events.on("viewchange", this._onViewchange);
        this.planet!.renderer!.handler.events.on("visibilitychange", this._onVisibilityChange);
    }

    public override ondeactivate() {
        super.ondeactivate();
        this.planet!.camera.events.off("viewchange", this._onViewchange);

        for (let i = 0; i < this._layersArr.length; i++) {
            this._layersArr[i].setVisibility(false);
        }

        this.planet!.events.off("layerloadend", this._onLayerLoadend);
        this.planet!.renderer!.handler.events.off("visibilitychange", this._onVisibilityChange);
    }

    protected _onVisibilityChange = (isVisible: boolean) => {
        if (!isVisible) {
            this.pause();
        }
    }

    public clear() {
        this.stop();
        this._currentIndex = -1;
        this._currVisibleIndex = -1;
        let layersToRemove = this._layersArr;
        this._layersArr = [];
        for (let i = 0; i < layersToRemove.length; i++) {
            layersToRemove[i].remove();
        }
    }

    protected _initLayers() {
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

    public setLayers(layers: Layer[]) {
        this.clear();
        this._layersArr = [].concat(layers as any);
        this._initLayers();
    }

    public appendLayer(layer: Layer) {
        this._layersArr.push(layer);
        layer.setVisibility(false);
        layer.setBaseLayer(false);
        layer.opacity = 0.0;
        //check current frame
        this.planet?.addLayer(layer);
    }

    /**
     * warning: Use XYZ.isIdle in requestAnimationFrame(after setVisibility)
     * @returns Returns true if current layer is idle
     */
    public get isIdle(): boolean {
        let currLayer = this._layersArr[this._currentIndex];
        return currLayer && currLayer.isIdle || !currLayer;
    }

    public get playInterval() {
        return this._playInterval;
    }

    public set playInterval(val: number) {
        if (val !== this._playInterval) {
            this._playInterval = val;
            if (this.isPlaying) {
                this.pause();
                this.play();
            }
        }
    }

    public get isPlaying(): boolean {
        return this._playIntervalHandler !== -1;
    }

    public get layers(): Layer[] {
        return this._layersArr;
    }

    protected _checkEnd() {
        if (this._playIndex > this._layersArr.length) {
            if (this.repeat) {
                this._playIndex = 0;
            } else {
                this.pause();
            }
        }
    }

    public play() {
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

    public stop() {
        if (this._playIndex > 0) {
            this._clearInterval();
            this._playIndex = 0;
            this.setCurrentIndex(0);
            this.events.dispatch(this.events.stop);
        }
    }

    public pause() {
        if (this.isPlaying) {
            this._clearInterval();
            this.events.dispatch(this.events.pause);
        }
    }

    protected _clearInterval() {
        clearInterval(this._playIntervalHandler);
        this._playIntervalHandler = -1;
    }

    /**
     * Waiting for the current index layer loadend and make it non-transparent,
     * and make prev layer transparent, also check previous frame index to clean up.
     */
    private _onLayerLoadend = (layer: Layer) => {

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
     * @param {boolean} [stopPropagation=false]
     */
    setCurrentIndex(index: number, stopPropagation = false) {
        this._setCurrentIndexAsync(index, true, stopPropagation);
    }

    /**
     * Function sets layer index visible. If the layer is idle (all visible tiles loaded), sets opacity to one,
     * otherwise to ZERO it means that when all visible tiles will be loaded the opacity becomes ONE. So, previous
     * layer remains not transparent (opacity = 1) till current layer is loading.
     */
    protected _setCurrentIndexAsync(index: number, forceVisibility: boolean = false, stopPropagation: boolean = false) {

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
