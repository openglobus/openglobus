import * as shaders from '../../shaders/polyline/polyline';
import {EntityCollection} from "../EntityCollection";
import {Polyline} from "./Polyline";
import {Renderer} from "../../renderer/Renderer";
import {RenderNode} from "../../scene/RenderNode";
import {Vec3} from "../../math/Vec3";
import {PolylineBatchRenderer} from "./PolylineBatchRenderer";

class PolylineHandler {
    static __counter__: number = 0;
    protected __id: number;
    public _entityCollection: EntityCollection;
    public pickingEnabled: boolean;
    protected _renderer: Renderer | null;
    public _relativeCenter: Vec3;
    public _rtcEyePositionHigh: Float32Array;
    public _rtcEyePositionLow: Float32Array;

    protected _opaqueRenderer: PolylineBatchRenderer;
    protected _transparentRenderer: PolylineBatchRenderer;

    protected _polylines: Polyline[] = [];

    constructor(entityCollection: EntityCollection) {

        this.__id = PolylineHandler.__counter__++;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._polylines = [];

        this._opaqueRenderer = new PolylineBatchRenderer({
            path3v: [],
        });

        this._transparentRenderer = new PolylineBatchRenderer({
            path3v: [],
        });

        this.pickingEnabled = true;

        this._relativeCenter = new Vec3();

        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);

        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);
    }

    protected _initProgram() {
        if (!this._renderer) return;

        this._renderer.addPrograms(
            shaders.polylineTex(),
            shaders.polylinePlain(),
            shaders.polyline_picking()
        );
    }

    public setRenderNode(renderNode: RenderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();

        this._opaqueRenderer.setRenderNode(renderNode);
        this._transparentRenderer.setRenderNode(renderNode);
    }

    public add(polyline: Polyline) {
        if (polyline._handlerIndex === -1) {
            polyline._handler = this;
            polyline._handlerIndex = this._polylines.length;
            this._opaqueRenderer.__doubleToTwoFloats = this.getRTCPosition.bind(this);
            this._polylines.push(polyline);

            this._opaqueRenderer.appendPath3v(polyline.getPath3v());

            if (this._entityCollection && this._entityCollection.renderNode) {
                this._opaqueRenderer.updateRTCPosition();
            }
        }
    }

    public remove(polyline: Polyline) {
        let index = polyline._handlerIndex;
        if (index !== -1) {
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

    public drawForward() {
        this.drawOpaque();
    }

    public drawOpaque() {
        this._updateRTCEyePosition();
        this._opaqueRenderer.draw();
    }

    public drawTransparent() {
        this._transparentRenderer.draw();
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            this._opaqueRenderer.drawPicking();
            this._transparentRenderer.drawPicking();
        }
    }

    public clear() {
        //
        // remove lines
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i]._handler = null;
            this._polylines[i]._handlerIndex = -1;
        }
        this._polylines.length = 0;
        this._polylines = [];

        // clear renderers
        this._opaqueRenderer.clear();
        this._transparentRenderer.clear();
    }

    public getRTCPosition(pos: Vec3, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        let rtcPosition = pos.sub(this._relativeCenter);
        Vec3.doubleToTwoFloats(rtcPosition, rtcPositionHigh, rtcPositionLow);
    }

    public setRelativeCenter(c: Vec3) {
        this._relativeCenter.copy(c);
        this._opaqueRenderer.updateRTCPosition();
        this._transparentRenderer.updateRTCPosition();
    }

    protected _updateRTCEyePosition() {
        let r = this._renderer!;
        if (r.activeCamera.isFirstPass) {
            let rtcEyePosition = r.activeCamera.eye.sub(this._relativeCenter);
            Vec3.doubleToTwoFloat32Array(rtcEyePosition, this._rtcEyePositionHigh, this._rtcEyePositionLow);
        }
    }

    public reloadTextures() {
        for (let i = 0; i < this._polylines.length; i++) {
            let ri = this._polylines[i];
            ri.setSrc(ri.getSrc());
        }
    }

    public get polylines(): Polyline[] {
        return [...this._polylines];
    }

    public refreshTexCoordsArr() {
        const bc = this._entityCollection;
        if (!bc || !this._renderer) return;
        const ta = this._renderer.strokeTextureAtlas;
        for (let i = 0; i < this._polylines.length; i++) {
            const ri = this._opaqueRenderer;
            const img = ri.getImage();
            const tc: (number[] | null)[] = [];
            for (let j = 0; j < img.length; j++) {
                const m = img[j];
                const d = m?.__nodeIndex != null ? ta.get(m.__nodeIndex) : null;
                tc[j] = d?.texCoords ?? null;
            }
            if (tc.length) ri._setTexCoordArr(tc);
        }
    }
}

export {PolylineHandler};
