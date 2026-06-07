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
                  }
              })
            : null;

        this.frameBuffer.init();
    }

    public get frustumScale(): Vec3 {
        return Object3d.getFrustumScaleByCameraAspectRatio(
            1000,
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
            this.frameHandler(this);

            if (this.showFrustum && this.cameraEntity) {
                let cam = this.camera;
                let frustumScale = Object3d.getFrustumScaleByCameraAngles(
                    2.5,
                    cam.horizontalViewAngle,
                    cam.verticalViewAngle
                );
                this.cameraEntity.setScale3v(frustumScale);
                this.cameraEntity.setCartesian3v(cam.eye);
                this.cameraEntity.setAbsolutePitch(cam.getAbsolutePitch());
                this.cameraEntity.setAbsoluteYaw(cam.getAbsoluteYaw());
                this.cameraEntity.setAbsoluteRoll(cam.getAbsoluteRoll());
            }
        }
    }
}
