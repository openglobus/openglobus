import { EntityCollection } from "../EntityCollection";
import { Renderer } from "../../renderer/Renderer";
import { Scene } from "../../scene/Scene";
import { Strip } from "./Strip";
import { Vec3 } from "../../math/Vec3";
import { stripForward, stripForwardTime, stripTransparent, stripTransparentTime } from "../../shaders/strip/strip";

class StripHandler {
    static __counter__: number = 0;
    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled: boolean;

    /**
     * Parent collection
     * @protected
     * @type {EntityCollection}
     */
    protected _entityCollection: EntityCollection;

    /**
     * Renderer
     * @protected
     * @type {Renderer | null}
     */
    protected _renderer: Renderer | null;

    /**
     * Strip objects array
     * @protected
     * @type {Array.<Strip>}
     */
    protected _strips: Strip[];

    protected _opaqueCount: number;

    public _relativeCenter: Vec3;
    public _rtcEyePositionHigh: Float32Array;
    public _rtcEyePositionLow: Float32Array;

    /**
     * Current time of the lines with path times, in the same units as their times.
     * @public
     * @type {number}
     */
    public time: number = 0;

    /**
     * Opacity multipliers of the path parts already passed and still ahead of the current time.
     * @public
     * @type {Float32Array}
     */
    public timeOpacity: Float32Array = new Float32Array([1, 1]);

    public setTime(time: number) {
        this.time = time;
    }

    public setTimeOpacity(past: number, future: number) {
        this.timeOpacity[0] = past;
        this.timeOpacity[1] = future;
    }

    constructor(entityCollection: EntityCollection) {
        this.__id = StripHandler.__counter__++;

        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._strips = [];
        this._opaqueCount = 0;

        this._relativeCenter = new Vec3();
        this._rtcEyePositionHigh = new Float32Array(3);
        this._rtcEyePositionLow = new Float32Array(3);
    }

    public setRelativeCenter(c: Vec3) {
        this._relativeCenter.copy(c);
        for (let i = 0; i < this._strips.length; i++) {
            this._strips[i].updateRTCPosition();
        }
    }

    protected _updateRTCEyePosition() {
        if (!this._renderer) return;
        const rtcEyePosition = this._renderer.activeCamera.eye.sub(this._relativeCenter);
        Vec3.doubleToTwoFloat32Array(rtcEyePosition, this._rtcEyePositionHigh, this._rtcEyePositionLow);
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            !this._renderer.handler.programs.stripForward && this._renderer.handler.addProgram(stripForward());
            if (!this._renderer.deferredDisabled) {
                !this._renderer.handler.programs.stripTransparent &&
                    this._renderer.handler.addProgram(stripTransparent());
            }
        }
    }

    public initTimedPrograms() {
        if (this._renderer && this._renderer.handler) {
            this._renderer.addProgram(stripForwardTime());
            if (!this._renderer.deferredDisabled) {
                this._renderer.addProgram(stripTransparentTime());
            }
        }
    }

    public bindScene(scene: Scene) {
        this._renderer = scene.renderer;

        this._initProgram();

        if (this._strips.some((strip) => strip.isTimed())) {
            this.initTimedPrograms();
        }

        for (let i = 0; i < this._strips.length; i++) {
            this._strips[i].bindScene(scene);
        }
    }

    protected _swap(i: number, j: number) {
        if (i === j) return;
        const a = this._strips;
        const ti = a[i];
        const tj = a[j];
        a[i] = tj;
        a[j] = ti;
        tj._handlerIndex = i;
        ti._handlerIndex = j;
    }

    public add(strip: Strip) {
        if (strip._handlerIndex === -1) {
            strip._handler = this;
            const index = this._strips.length;
            strip._handlerIndex = index;
            this._strips.push(strip);

            if (strip.isTimed()) {
                this.initTimedPrograms();
            }

            // keep opaque first, transparent last
            if (strip.isOpaque()) {
                this._swap(index, this._opaqueCount);
                this._opaqueCount++;
            }
            this._entityCollection && this._entityCollection.scene && strip.bindScene(this._entityCollection.scene);
        }
    }

    public remove(strip: Strip) {
        const index = strip._handlerIndex;
        if (index === -1) return;

        strip._deleteBuffers();

        const a = this._strips;
        const lastIndex = a.length - 1;
        if (index < 0 || index > lastIndex) {
            strip._handlerIndex = -1;
            strip._handler = null;
            return;
        }

        if (index < this._opaqueCount) {
            const lastOpaqueIndex = this._opaqueCount - 1;
            this._swap(index, lastOpaqueIndex);
            this._opaqueCount--;
            this._swap(lastOpaqueIndex, lastIndex);
        } else {
            this._swap(index, lastIndex);
        }

        a.pop();

        strip._handlerIndex = -1;
        strip._handler = null;
    }

    public drawForward() {
        this.drawOpaque();
    }

    public drawOpaque(): void {
        this._updateRTCEyePosition();
        for (let i = 0; i < this._opaqueCount; i++) {
            this._strips[i].drawOpaque();
        }
    }

    public drawTransparent(): void {
        this._updateRTCEyePosition();
        for (let i = this._opaqueCount; i < this._strips.length; i++) {
            this._strips[i].drawTransparent();
        }
    }

    public drawTransparentForward(): void {
        this._updateRTCEyePosition();
        for (let i = this._opaqueCount; i < this._strips.length; i++) {
            this._strips[i].drawOpaque();
        }
    }

    public updateStripOpacity(strip: Strip) {
        const index = strip._handlerIndex;
        if (index === -1) return;

        const toOpaque = strip.isOpaque();
        const isOpaque = index < this._opaqueCount;
        if (toOpaque === isOpaque) return;

        if (toOpaque) {
            this._swap(index, this._opaqueCount);
            this._opaqueCount++;
        } else {
            const lastOpaqueIndex = this._opaqueCount - 1;
            this._swap(index, lastOpaqueIndex);
            this._opaqueCount--;
        }
    }

    public drawPicking() {
        this._updateRTCEyePosition();
        if (this.pickingEnabled) {
            let i = this._strips.length;
            while (i--) {
                this._strips[i].drawPicking();
            }
        }
    }

    public clear() {
        let i = this._strips.length;
        while (i--) {
            this._strips[i]._deleteBuffers();
            this._strips[i]._handler = null;
            this._strips[i]._handlerIndex = -1;
        }
        this._strips.length = 0;
        this._strips = [];
        this._opaqueCount = 0;
    }
}

export { StripHandler };
