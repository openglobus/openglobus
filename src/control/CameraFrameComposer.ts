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

import { Control, IControlParams } from "./Control";
import { CameraFrameHandler } from "./CameraFrameHandler";
import { EntityCollection } from "../entity";
import { Scene } from "../scene/Scene";

export interface ICameraFrameComposerParams extends IControlParams {
    frameHandlers?: CameraFrameHandler[];
}

export class CameraFrameComposer extends Control {
    public readonly _frameHandlers: CameraFrameHandler[];
    protected _cameraLayer: EntityCollection;
    protected _cameraScene: Scene;

    constructor(params: ICameraFrameComposerParams = {}) {
        super({
            name: "CameraFrameComposer",
            autoActivate: true,
            ...params
        });

        this._cameraLayer = new EntityCollection({
            scaleByDistance: [100, 1000000, 1.0],
            pickingEnabled: false
        });

        this._cameraScene = new Scene("CameraScene");

        this._frameHandlers = params.frameHandlers || [];
    }

    public get frameHandlers(): CameraFrameHandler[] {
        return [...this._frameHandlers];
    }

    public add(handler: CameraFrameHandler) {
        handler.addTo(this);
        if (handler.cameraEntity) {
            this._cameraLayer.add(handler.cameraEntity);
        }
    }

    public override oninit() {
        super.oninit();
        this._cameraLayer.addTo(this._cameraScene);
    }

    public override activate() {
        super.activate();
        if (this.renderer) {
            this.renderer.events.on("postdraw", this._onPostdraw);
            this.renderer.addScene(this._cameraScene);
        }
    }

    public override deactivate() {
        super.deactivate();
        if (this.renderer) {
            this.renderer.events.off("postdraw", this._onPostdraw);
            this.renderer.removeNode(this._cameraScene);
        }
    }

    protected _onPostdraw = () => {
        for (let i = 0, len = this._frameHandlers.length; i < len; i++) {
            this._frameHandlers[i].frame();
        }
    };
}
