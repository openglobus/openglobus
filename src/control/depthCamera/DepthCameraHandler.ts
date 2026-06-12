import { Control, IControlParams } from "../Control";
import { DepthCamera } from "./DepthCamera";
import { depth_camera } from "./depth_camera";
import { Vector } from "../../layer";
import { SHADE_PHONG } from "../../shadeModeConstants";

const DEPTH_CAMERA_HANDLER_PREDRAW_PRIORITY = 0;
const POLYLINE_DEPTH_OFFSET = -100;

export interface IDepthCameraHandlerParams extends IControlParams {
    depthCameras?: DepthCamera[];
}

export class DepthCameraHandler extends Control {
    protected _depthCameras: DepthCamera[];

    public readonly cameraFootprintLayer: Vector;
    public readonly cameraFrustumLayer: Vector;

    constructor(params: IDepthCameraHandlerParams = {}) {
        super({
            name: "DepthCameraHandler",
            autoActivate: true,
            ...params
        });

        this._depthCameras = [];

        this.cameraFootprintLayer = new Vector(`depthCameraFootprintLayer`, {
            entities: [],
            pickingEnabled: false,
            receiveProjectors: false,
            depthOffset: POLYLINE_DEPTH_OFFSET,
            hideInLayerSwitcher: true,
            clampToGround: true,
            visibility: true
        });

        this.cameraFrustumLayer = new Vector(`depthCameraFrustumLayer`, {
            entities: [],
            pickingEnabled: true,
            receiveProjectors: false,
            shadeMode: SHADE_PHONG,
            hideInLayerSwitcher: true,
            scaleByDistance: [100, 100000, 1.0]
        });

        if (params.depthCameras) {
            for (let i = 0; i < params.depthCameras.length; i++) {
                this.add(params.depthCameras[i]);
            }
        }
    }

    public get depthCameras(): DepthCamera[] {
        return [...this._depthCameras];
    }

    public add(depthCamera: DepthCamera): DepthCamera {
        if (depthCamera._handlerIndex !== -1) {
            return depthCamera;
        }

        depthCamera._handler = this;
        depthCamera._handlerIndex = this._depthCameras.length;
        this._depthCameras.push(depthCamera);
        this._addDepthCameraEntities(depthCamera);

        if (this.renderer?.isInitialized() && this.planet) {
            this._initDepthCamera(depthCamera);
        }

        return depthCamera;
    }

    public override remove(): void;
    public override remove(depthCamera: DepthCamera): boolean;
    public override remove(depthCamera?: DepthCamera): void | boolean {
        if (!depthCamera) {
            super.remove();
            return;
        }

        const index = depthCamera._handlerIndex;
        if (index === -1 || this._depthCameras[index] !== depthCamera) {
            return false;
        }

        this._removeDepthCameraEntities(depthCamera);
        depthCamera.destroy();

        const last = this._depthCameras.length - 1;
        if (index !== last) {
            const moved = this._depthCameras[last];
            this._depthCameras[index] = moved;
            moved._handlerIndex = index;
        }
        this._depthCameras.pop();

        depthCamera._handler = null;
        depthCamera._handlerIndex = -1;

        return true;
    }

    public clear(): void {
        while (this._depthCameras.length) {
            this.remove(this._depthCameras[this._depthCameras.length - 1]);
        }
    }

    public override oninit(): void {
        super.oninit();

        if (!this.renderer || !this.planet) return;

        this.renderer.handler.addProgram(depth_camera());

        this.planet.addLayer(this.cameraFootprintLayer);
        this.planet.addLayer(this.cameraFrustumLayer);

        for (let i = 0; i < this._depthCameras.length; i++) {
            this._initDepthCamera(this._depthCameras[i]);
        }
    }

    public override onactivate(): void {
        if (this.renderer) {
            this.renderer.events.on("predraw", this._onDraw, this, DEPTH_CAMERA_HANDLER_PREDRAW_PRIORITY);
        }
    }

    public override ondeactivate(): void {
        if (this.renderer) {
            this.renderer.events.off("predraw", this._onDraw);
        }
    }

    public override onremove(): void {
        this.clear();
        this.cameraFootprintLayer.remove();
        this.cameraFrustumLayer.remove();
    }

    protected _initDepthCamera(depthCamera: DepthCamera): void {
        if (!this.renderer || !this.planet || depthCamera.initialized) return;

        depthCamera.init(this.planet, this.renderer);
    }

    protected _addDepthCameraEntities(depthCamera: DepthCamera): void {
        const cameraFootprintEntity = depthCamera.cameraFootprintEntity;
        if (depthCamera.showFootprint && cameraFootprintEntity) {
            this.cameraFootprintLayer.add(cameraFootprintEntity);
        }

        const cameraFrustumEntity = depthCamera.cameraFrustumEntity;
        if (depthCamera.showFrustum && cameraFrustumEntity) {
            this.cameraFrustumLayer.add(cameraFrustumEntity);
        }
    }

    protected _removeDepthCameraEntities(depthCamera: DepthCamera): void {
        const cameraFootprintEntity = depthCamera.cameraFootprintEntity;
        if (cameraFootprintEntity) {
            this.cameraFootprintLayer.removeEntity(cameraFootprintEntity);
        }

        const cameraFrustumEntity = depthCamera.cameraFrustumEntity;
        if (cameraFrustumEntity) {
            this.cameraFrustumLayer.removeEntity(cameraFrustumEntity);
        }
    }

    protected _onDraw = (): void => {
        if (!this.renderer || !this.planet) return;

        for (let i = 0; i < this._depthCameras.length; i++) {
            this._depthCameras[i].frame();
        }
    };
}
