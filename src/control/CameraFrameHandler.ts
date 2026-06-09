/*
 * Copyright 2026 Michael Gevlich
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Object3d } from "../Object3d";
import { Camera } from "../camera/Camera";
import { Framebuffer } from "../webgl/Framebuffer";
import { Entity } from "../entity/Entity";
import { Vec3 } from "../math/Vec3";
import { CameraFrameComposer } from "./CameraFrameComposer";

let cameraFrustumObj = Object3d.createFrustum();

const DEFAULT_CAMERA_FRUSTUM_LENGTH = 2.5;

export type FrameHandlerFunc = (frameHandler: CameraFrameHandler) => void;

export interface ICameraFrameHadler {
    camera: Camera;
    frameBuffer: Framebuffer;
    frameHandler: FrameHandlerFunc;
    showFrustum?: boolean;
}

export class CameraFrameHandler {
    public readonly camera: Camera;
    public readonly frameBuffer: Framebuffer;
    public frameHandler: FrameHandlerFunc | null;
    protected _composer: CameraFrameComposer | null;
    protected _composerIndex: number;

    public readonly cameraEntity: Entity | null;
    public showFrustum: boolean;

    protected _prevCameraPos: Vec3;
    protected _prevCameraPitch: number;
    protected _prevCameraYaw: number;
    protected _prevCameraRoll: number;
    protected _prevCameraEntityPos: Vec3;
    protected _prevCameraEntityPitch: number;
    protected _prevCameraEntityYaw: number;
    protected _prevCameraEntityRoll: number;

    constructor(params: ICameraFrameHadler) {
        this.camera = params.camera;
        this.frameBuffer = params.frameBuffer;
        this.frameHandler = params.frameHandler || null;
        this._composer = null;
        this._composerIndex = -1;
        this.showFrustum = params.showFrustum != undefined ? params.showFrustum : true;

        this.cameraEntity = this.showFrustum
            ? new Entity({
                  visibility: true,
                  scale: this.frustumScale,
                  geoObject: {
                      //visibility: false,
                      tag: "frustum",
                      color: "rgb(155, 155, 255, 0.88)",
                      object3d: cameraFrustumObj
                  },
                  properties: {
                      camera: this.camera
                  }
              })
            : null;

        this._prevCameraPos = new Vec3();
        this._prevCameraPitch = 0;
        this._prevCameraYaw = 0;
        this._prevCameraRoll = 0;

        this._prevCameraEntityPos = new Vec3();
        this._prevCameraEntityPitch = 0;
        this._prevCameraEntityYaw = 0;
        this._prevCameraEntityRoll = 0;

        this.frameBuffer.init();
    }

    public get frustumScale(): Vec3 {
        return Object3d.getFrustumScaleByCameraAspectRatio(
            DEFAULT_CAMERA_FRUSTUM_LENGTH,
            this.camera.getViewAngle(),
            this.camera.getAspectRatio()
        );
    }

    public addTo(composer: CameraFrameComposer) {
        if (!this._composer) {
            this._composer = composer;
            this._composerIndex = composer.frameHandlers.length;
            this._composer._frameHandlers.push(this);
        }
    }

    public remove() {
        if (this._composer) {
            this._composer._frameHandlers.splice(this._composerIndex, 1);
            this._composer = null;
            this._composerIndex = -1;
        }
    }

    public frame() {
        if (this.frameHandler && this.frameBuffer.handler.gl) {
            if (this.showFrustum && this.cameraEntity) {
                let cam = this.camera;
                let cameraEntityPos = this.cameraEntity.getAbsoluteCartesian();
                let cameraEntityPitch = this.cameraEntity.getPitch();
                let cameraEntityYaw = this.cameraEntity.getYaw();
                let cameraEntityRoll = this.cameraEntity.getRoll();
                let cameraUpdated = false;

                if (this._prevCameraPos.equal(cam.eye) && !this._prevCameraPos.equal(cameraEntityPos)) {
                    cam.eye.copy(cameraEntityPos);
                    cameraUpdated = true;
                }

                let cameraPitch = cam.getPitch();
                let cameraYaw = cam.getYaw();
                let cameraRoll = cam.getRoll();

                if (
                    this._prevCameraPitch === cameraPitch &&
                    this._prevCameraYaw === cameraYaw &&
                    this._prevCameraRoll === cameraRoll &&
                    (this._prevCameraEntityPitch !== cameraEntityPitch ||
                        this._prevCameraEntityYaw !== cameraEntityYaw ||
                        this._prevCameraEntityRoll !== cameraEntityRoll)
                ) {
                    cam.setPitchYawRoll(cameraEntityPitch, cameraEntityYaw, cameraEntityRoll);
                    cameraUpdated = true;
                }

                if (
                    cameraUpdated ||
                    !this._prevCameraPos.equal(cam.eye) ||
                    this._prevCameraPitch !== cam.getPitch() ||
                    this._prevCameraYaw !== cam.getYaw() ||
                    this._prevCameraRoll !== cam.getRoll()
                ) {
                    cam.update();
                }
            }

            this.frameHandler(this);

            if (this.showFrustum && this.cameraEntity) {
                let cam = this.camera;

                this.cameraEntity.setScale3v(this.frustumScale);
                this.cameraEntity.setCartesian3v(cam.eye);
                this.cameraEntity.setAbsolutePitch(cam.getPitch());
                this.cameraEntity.setAbsoluteYaw(cam.getYaw());
                this.cameraEntity.setAbsoluteRoll(cam.getRoll());

                this._prevCameraPitch = cam.getPitch();
                this._prevCameraYaw = cam.getYaw();
                this._prevCameraRoll = cam.getRoll();
                this._prevCameraPos.copy(cam.eye);

                this._prevCameraEntityPos.copy(this.cameraEntity.getAbsoluteCartesian());
                this._prevCameraEntityPitch = this.cameraEntity.getPitch();
                this._prevCameraEntityYaw = this.cameraEntity.getYaw();
                this._prevCameraEntityRoll = this.cameraEntity.getRoll();

                let planet = this._composer!.planet || null;
                if (planet?.ellipsoid) {
                    this.cameraEntity._lonLat.copy(
                        planet.ellipsoid.cartesianToLonLat(this.cameraEntity.getAbsoluteCartesian())
                    );
                }
            }
        }
    }
}
