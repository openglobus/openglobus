import * as shaders from '../shaders/polyline';
import {EntityCollection} from "./EntityCollection";
import {Polyline} from "./Polyline";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";
import {Vec3} from "../math/Vec3";

class PolylineHandler {
    static __counter__: number = 0;
    protected __id: number;
    public _entityCollection: EntityCollection;
    public pickingEnabled: boolean;
    protected _renderer: Renderer | null;
    protected _polylines: Polyline[];
    public _relativeCenter: Vec3;
    public _rtcEyePositionHigh: Float32Array;
    public _rtcEyePositionLow: Float32Array;

    constructor(entityCollection: EntityCollection) {

        this.__id = PolylineHandler.__counter__++;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._polylines = [];

        this.pickingEnabled = true;

        this._relativeCenter = new Vec3();

        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);

        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);
    }

    protected _initProgram() {
        if (this._renderer && this._renderer.handler) {
            if (!this._renderer.handler.programs.polyline_screen) {
                this._renderer.handler.addProgram(shaders.polyline_screen());
            }
            if (!this._renderer.handler.programs.polyline_picking) {
                this._renderer.handler.addProgram(shaders.polyline_picking());
            }
        }
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._polylines.length; i++) {
            this._polylines[i].setRenderNode(renderNode);
        }
    }

    public add(polyline: Polyline) {
        if (polyline._handlerIndex === -1) {
            polyline._handler = this;
            polyline._handlerIndex = this._polylines.length;
            polyline.__doubleToTwoFloats = this.getRTCPosition.bind(this);
            this._polylines.push(polyline);
            if (this._entityCollection && this._entityCollection.renderNode) {
                polyline.setRenderNode(this._entityCollection.renderNode);
                polyline.updateRTCPosition();
            }
        }
    }

    public remove(polyline: Polyline) {
        let index = polyline._handlerIndex;
        if (index !== -1) {
            polyline._deleteBuffers();
            polyline._handlerIndex = -1;
            polyline._handler = null;
            this._polylines.splice(index, 1);
            this.reindexPolylineArray(index);
        }
    }

    public reindexPolylineArray(startIndex: number) {
        let ls = this._polylines;
        for (let i = startIndex; i < ls.length; i++) {
            ls[i]._handlerIndex = i;
        }
    }

    public draw() {
        this._updateRTCEyePosition();
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i].draw();
        }
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            let i = this._polylines.length;
            while (i--) {
                this._polylines[i].drawPicking();
            }
        }
    }

    public clear() {
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i]._deleteBuffers();
            this._polylines[i]._handler = null;
            this._polylines[i]._handlerIndex = -1;
        }
        this._polylines.length = 0;
        this._polylines = [];
    }

    public getRTCPosition(pos: Vec3, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        let rtcPosition = pos.sub(this._relativeCenter);
        Vec3.doubleToTwoFloats(rtcPosition, rtcPositionHigh, rtcPositionLow);
    }

    public setRelativeCenter(c: Vec3) {
        this._relativeCenter.copy(c);
        for (let i = 0; i < this._polylines.length; i++) {
            this._polylines[i].updateRTCPosition();
        }
    }

    protected _updateRTCEyePosition() {
        let r = this._renderer!;
        if (r.activeCamera.isFirstPass) {
            let rtcEyePosition = r.activeCamera.eye.sub(this._relativeCenter);
            Vec3.doubleToTwoFloat32Array(rtcEyePosition, this._rtcEyePositionHigh, this._rtcEyePositionLow);
        }
    }
}

export {PolylineHandler};