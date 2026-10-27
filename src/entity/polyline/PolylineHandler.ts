import * as shaders from "../../shaders/polyline/polyline";
import { EntityCollection } from "../EntityCollection";
import { Polyline } from "./Polyline";
import { Renderer } from "../../renderer/Renderer";
import { Scene } from "../../scene/Scene";
import { Vec3 } from "../../math/Vec3";
import { PolylineBatchRenderer } from "./PolylineBatchRenderer";

class PolylineHandler {
    static __counter__: number = 0;
    protected __id: number;
    public _entityCollection: EntityCollection;
    public pickingEnabled: boolean;
    protected _renderer: Renderer | null;
    protected _scene: Scene | null;
    public _relativeCenter: Vec3;
    public _rtcEyePositionHigh: Float32Array;
    public _rtcEyePositionLow: Float32Array;

    public _opaqueRenderer: PolylineBatchRenderer;
    public _transparentRenderer: PolylineBatchRenderer;
    public _opaqueTexRenderer: PolylineBatchRenderer;
    public _transparentTexRenderer: PolylineBatchRenderer;
    public _timedRenderer: PolylineBatchRenderer | null;
    public _timedTexRenderer: PolylineBatchRenderer | null;

    protected _polylines: Polyline[] = [];
    protected _visibleSpherePosition: Vec3 | null;
    protected _visibleSphereRadius: number;

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
        this.__id = PolylineHandler.__counter__++;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._scene = null;

        this._polylines = [];

        this._opaqueRenderer = new PolylineBatchRenderer(this, {
            path3v: []
            //isTextured: true,
        });

        this._transparentRenderer = new PolylineBatchRenderer(this, {
            path3v: []
            //isTextured: true,
        });

        this._opaqueTexRenderer = new PolylineBatchRenderer(this, {
            path3v: [],
            isTextured: true
        });

        this._transparentTexRenderer = new PolylineBatchRenderer(this, {
            path3v: [],
            isTextured: true
        });

        this._timedRenderer = null;
        this._timedTexRenderer = null;

        this._visibleSpherePosition = null;
        this._visibleSphereRadius = 0;

        this.pickingEnabled = true;

        this._relativeCenter = new Vec3();

        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);

        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);

        const rtcProject = this.getRTCPosition.bind(this);
        this._opaqueRenderer.__doubleToTwoFloats = rtcProject;
        this._transparentRenderer.__doubleToTwoFloats = rtcProject;
        this._opaqueTexRenderer.__doubleToTwoFloats = rtcProject;
        this._transparentTexRenderer.__doubleToTwoFloats = rtcProject;
    }

    public setVisibleSphere(p: Vec3, r: number) {
        this._opaqueRenderer.setVisibleSphere(p, r);
        this._transparentRenderer.setVisibleSphere(p, r);
        this._opaqueTexRenderer.setVisibleSphere(p, r);
        this._transparentTexRenderer.setVisibleSphere(p, r);
        this._timedRenderer && this._timedRenderer.setVisibleSphere(p, r);
        this._timedTexRenderer && this._timedTexRenderer.setVisibleSphere(p, r);
        this._visibleSpherePosition = p;
        this._visibleSphereRadius = r;
    }

    /**
     * Requests the next frame to be rendered.
     * @public
     */
    public requestRedraw() {
        this._renderer && (this._renderer.handler.needRedraw = true);
    }

    protected _initProgram() {
        if (!this._renderer) return;

        this._renderer.addPrograms(shaders.polylineTex(), shaders.polylinePlain(), shaders.polyline_picking());

        if (!this._renderer.deferredDisabled) {
            this._renderer.addPrograms(shaders.polylineTexWoit(), shaders.polylineWoitPlain());
        }

        if (this._timedRenderer || this._timedTexRenderer) {
            this._initTimedPrograms();
        }
    }

    protected _initTimedPrograms() {
        if (!this._renderer) return;

        this._renderer.addPrograms(shaders.polylineTexTime(), shaders.polylinePlainTime());

        if (!this._renderer.deferredDisabled) {
            this._renderer.addPrograms(shaders.polylineTexWoitTime(), shaders.polylineWoitPlainTime());
        }
    }

    protected _createTimedRenderer(textured: boolean): PolylineBatchRenderer {
        const renderer = new PolylineBatchRenderer(this, {
            path3v: [],
            isTextured: textured,
            isTimed: true
        });

        renderer.__doubleToTwoFloats = this.getRTCPosition.bind(this);

        if (this._visibleSpherePosition) {
            renderer.setVisibleSphere(this._visibleSpherePosition, this._visibleSphereRadius);
        }

        if (this._scene) {
            this._initTimedPrograms();
            renderer.bindScene(this._scene);
        }

        return renderer;
    }

    public bindScene(scene: Scene) {
        this._scene = scene;
        this._renderer = scene.renderer;
        this._initProgram();

        this._opaqueRenderer.bindScene(scene);
        this._transparentRenderer.bindScene(scene);

        this._opaqueTexRenderer.bindScene(scene);
        this._transparentTexRenderer.bindScene(scene);

        this._timedRenderer && this._timedRenderer.bindScene(scene);
        this._timedTexRenderer && this._timedTexRenderer.bindScene(scene);
    }

    public add(polyline: Polyline) {
        if (polyline._handlerIndex === -1) {
            const batchRenderer = this.getRenderer(
                polyline.getOpacity(),
                polyline.getSrc() != null,
                polyline.isTimed()
            );
            polyline._handler = this;
            polyline._handlerIndex = this._polylines.length;
            polyline._batchRenderer = batchRenderer;
            this._polylines.push(polyline);

            if (polyline.getVisibility()) {
                polyline._addToBatchRenderer();
            }

            if (this._entityCollection && this._entityCollection.scene) {
                batchRenderer.updateRTCPosition();
            }
        }
    }

    public remove(polyline: Polyline) {
        let index = polyline._handlerIndex;
        if (index !== -1) {
            polyline._removeFromBatchRenderer();
            polyline._handlerIndex = -1;
            polyline._handler = null;
            polyline._batchRenderer = null;
            this._polylines.splice(index, 1);
            this.reindexPolylineArray(index);
        }
    }

    public getRenderer(opacity: number, textured: boolean, timed: boolean = false): PolylineBatchRenderer {
        if (timed) {
            if (textured) {
                return this._timedTexRenderer || (this._timedTexRenderer = this._createTimedRenderer(true));
            }
            return this._timedRenderer || (this._timedRenderer = this._createTimedRenderer(false));
        }

        if (textured) {
            return opacity < 1.0 ? this._transparentTexRenderer : this._opaqueTexRenderer;
        }

        return opacity < 1.0 ? this._transparentRenderer : this._opaqueRenderer;
    }

    public reindexAfterRemoval(removedBatchIndex: number, renderer: PolylineBatchRenderer) {
        for (let p = 0; p < this._polylines.length; p++) {
            if (this._polylines[p]._batchRenderer !== renderer) {
                continue;
            }
            const indices = this._polylines[p]._batchRendererIndexes;
            for (let i = 0; i < indices.length; i++) {
                if (indices[i] > removedBatchIndex) {
                    indices[i]--;
                }
            }
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
        this._opaqueRenderer.drawOpaque();
        this._opaqueTexRenderer.drawOpaque();
    }

    public drawTransparent() {
        this._updateRTCEyePosition();
        this._transparentRenderer.drawTransparent();
        this._transparentTexRenderer.drawTransparent();
        this._timedRenderer && this._timedRenderer.drawTransparent();
        this._timedTexRenderer && this._timedTexRenderer.drawTransparent();
    }

    public drawTransparentForward() {
        this._updateRTCEyePosition();
        this._transparentRenderer.drawOpaque();
        this._transparentTexRenderer.drawOpaque();
        this._timedRenderer && this._timedRenderer.drawOpaque();
        this._timedTexRenderer && this._timedTexRenderer.drawOpaque();
    }

    public drawPicking() {
        if (this.pickingEnabled) {
            this._opaqueRenderer.drawPicking();
            this._transparentRenderer.drawPicking();
            this._opaqueTexRenderer.drawPicking();
            this._transparentTexRenderer.drawPicking();
            this._timedRenderer && this._timedRenderer.drawPicking();
            this._timedTexRenderer && this._timedTexRenderer.drawPicking();
        }
    }

    public clear() {
        //
        // remove lines
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i]._handler = null;
            this._polylines[i]._handlerIndex = -1;
            this._polylines[i]._batchRenderer = null;
            this._polylines[i]._batchRendererIndexes.length = 0;
        }
        this._polylines.length = 0;
        this._polylines = [];

        // clear renderers
        this._opaqueRenderer.clear();
        this._transparentRenderer.clear();
        this._opaqueTexRenderer.clear();
        this._transparentTexRenderer.clear();
        this._timedRenderer && this._timedRenderer.clear();
        this._timedTexRenderer && this._timedTexRenderer.clear();
    }

    public getRTCPosition(pos: Vec3, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        let rtcPosition = pos.sub(this._relativeCenter);
        Vec3.doubleToTwoFloats(rtcPosition, rtcPositionHigh, rtcPositionLow);
    }

    public setRelativeCenter(c: Vec3) {
        this._relativeCenter.copy(c);
        this._opaqueRenderer.updateRTCPosition();
        this._transparentRenderer.updateRTCPosition();
        this._opaqueTexRenderer.updateRTCPosition();
        this._transparentTexRenderer.updateRTCPosition();
        this._timedRenderer && this._timedRenderer.updateRTCPosition();
        this._timedTexRenderer && this._timedTexRenderer.updateRTCPosition();
    }

    protected _updateRTCEyePosition() {
        let r = this._renderer!;
        if (r.activeCamera.isFarthestFrustumActive) {
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

    protected _updateTexCoords(renderer: PolylineBatchRenderer) {
        if (!this._renderer) return;
        const ta = this._renderer.strokeTextureAtlas;
        const img = renderer.getImage();
        const tc: (number[] | null)[] = [];
        for (let j = 0; j < img.length; j++) {
            const m = img[j];
            const d = m?.__nodeIndex != null ? ta.get(m.__nodeIndex) : null;
            tc[j] = d?.texCoords ?? null;
        }
        if (tc.length) renderer._setTexCoordArr(tc);
    }

    public refreshTexCoordsArr() {
        const bc = this._entityCollection;
        if (!bc || !this._renderer) return;
        for (let i = 0; i < this._polylines.length; i++) {
            this._updateTexCoords(this._opaqueTexRenderer);
            this._updateTexCoords(this._transparentTexRenderer);
            this._timedTexRenderer && this._updateTexCoords(this._timedTexRenderer);
        }
    }
}

export { PolylineHandler };
