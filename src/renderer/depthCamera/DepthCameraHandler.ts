import * as math from "../../math";
import type { Renderer } from "../Renderer";
import type { Planet } from "../../scene/Planet";
import { Scene } from "../../scene/Scene";
import type { Entity } from "../../entity/Entity";
import { EntityCollection } from "../../entity/EntityCollection";
import { DepthCamera } from "./DepthCamera";
import { depth_camera } from "./depth_camera";

const POLYLINE_DEPTH_OFFSET = -100;

/**
 * Renderer depth cameras. A camera index in the list is its slot in the planet quad tree strategies.
 */
export class DepthCameraHandler {
    public readonly renderer: Renderer;

    public _depthCameras: DepthCamera[];

    public readonly cameraFrustumCollection: EntityCollection;
    public readonly cameraFootprintCollection: EntityCollection;

    protected _initialized: boolean;
    protected _planet: Planet | null;
    protected _scene: Scene;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this._depthCameras = [];
        this._initialized = false;
        this._planet = null;

        this.cameraFootprintCollection = new EntityCollection({
            pickingEnabled: false,
            receiveProjectors: false,
            receiveShadows: false,
            depthOffset: POLYLINE_DEPTH_OFFSET
        });

        this.cameraFrustumCollection = new EntityCollection({
            pickingEnabled: true,
            receiveProjectors: false,
            receiveShadows: false,
            shadeMode: "phong",
            scaleByDistance: [100, 1000000, math.MAX32]
        });

        this._scene = new Scene("depthCameraHandler");
        this._scene.disableDepthCamera = true;
    }

    public get depthCameras(): DepthCamera[] {
        return [...this._depthCameras];
    }

    /**
     * First planet of the renderer, the default one to bind the cameras to.
     */
    public get planet(): Planet | null {
        return this._planet;
    }

    public init(): void {
        if (this._initialized) return;

        this._initialized = true;

        this.renderer.handler.addProgram(depth_camera());

        this._bindPlanet();

        if (this._planet) {
            this.cameraFootprintCollection.addTo(this._planet);
            this.cameraFrustumCollection.addTo(this._planet);
        } else {
            this.renderer.addScene(this._scene);
            this.cameraFrustumCollection.addTo(this._scene);
        }

        for (let i = 0; i < this._depthCameras.length; i++) {
            this._depthCameras[i].init(this._planet, this.renderer);
            this._addDepthCameraEntities(this._depthCameras[i]);
        }
    }

    public add(depthCamera: DepthCamera): DepthCamera {
        if (depthCamera._handlerIndex !== -1) {
            return depthCamera;
        }

        depthCamera._handler = this;
        depthCamera._handlerIndex = this._depthCameras.length;
        this._depthCameras.push(depthCamera);

        if (this._initialized) {
            depthCamera.init(this._planet, this.renderer);
            this._addDepthCameraEntities(depthCamera);
        }

        this.renderer.requestRedraw();

        return depthCamera;
    }

    public remove(depthCamera: DepthCamera): boolean {
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

        this.renderer.requestRedraw();

        return true;
    }

    public clear(): void {
        while (this._depthCameras.length) {
            this.remove(this._depthCameras[this._depthCameras.length - 1]);
        }
    }

    public destroy(): void {
        this.clear();
        this.cameraFootprintCollection.remove();
        this.cameraFrustumCollection.remove();
        this._scene.remove();
        this._planet = null;
        this._initialized = false;
    }

    /**
     * Puts the cameras in place, before the planets collect their nodes.
     */
    public prepareFrame(): void {
        for (let i = 0; i < this._depthCameras.length; i++) {
            const depthCamera = this._depthCameras[i];
            if (depthCamera.enabled && depthCamera.initialized) {
                depthCamera.prepareFrame();
            }
        }
    }

    /**
     * Renders the depth frames, after the planets have collected the nodes and before the scenes are drawn.
     */
    public frame(): void {
        for (let i = 0; i < this._depthCameras.length; i++) {
            this._depthCameras[i].frame();
        }
    }

    protected _bindPlanet(): void {
        if (this._planet) return;

        const scenes = this.renderer._scenesArr;

        for (let i = scenes.length - 1; i >= 0; i--) {
            const planet = scenes[i] as Planet;
            if (planet.quadTreeStrategy) {
                this._planet = planet;
                return;
            }
        }
    }

    public _showFrustumEntity(entity: Entity, show: boolean): void {
        if (!this._initialized) return;
        show ? this.cameraFrustumCollection.add(entity) : this.cameraFrustumCollection.removeEntity(entity);
    }

    public _showFootprintEntity(entity: Entity, show: boolean): void {
        if (!this._initialized || !this._planet) return;
        show ? this.cameraFootprintCollection.add(entity) : this.cameraFootprintCollection.removeEntity(entity);
    }

    protected _addDepthCameraEntities(depthCamera: DepthCamera): void {
        const cameraFootprintEntity = depthCamera.cameraFootprintEntity;
        if (depthCamera.showFootprint && cameraFootprintEntity) {
            this._showFootprintEntity(cameraFootprintEntity, true);
        }

        const cameraFrustumEntity = depthCamera.cameraFrustumEntity;
        if (depthCamera.showFrustum && cameraFrustumEntity) {
            this._showFrustumEntity(cameraFrustumEntity, true);
        }
    }

    protected _removeDepthCameraEntities(depthCamera: DepthCamera): void {
        const cameraFootprintEntity = depthCamera.cameraFootprintEntity;
        if (cameraFootprintEntity) {
            this._showFootprintEntity(cameraFootprintEntity, false);
        }

        const cameraFrustumEntity = depthCamera.cameraFrustumEntity;
        if (cameraFrustumEntity) {
            this._showFrustumEntity(cameraFrustumEntity, false);
        }
    }
}
