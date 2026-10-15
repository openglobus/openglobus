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

import { Control, type IControlParams } from "../Control";
import { createEvents, type EventsHandler } from "../../Events";
import { Entity } from "../../entity/Entity";
import {
    EntityGizmoScene,
    NATIVE_MODE,
    YAW_MODE,
    type EditModeName,
    type GizmoTools,
    type IGizmoTransformEvent
} from "./EntityGizmoScene";

export interface IEntityGizmoParams extends IControlParams {
    tools?: GizmoTools;
    editMode?: EditModeName;
    autoSelect?: boolean;
}

type EntityGizmoEventsList = [
    "select",
    "unselect",
    "transformstart",
    "transformchange",
    "transformend",
    "transformcancel"
];

const ENTITY_GIZMO_EVENTS: EntityGizmoEventsList = [
    "select",
    "unselect",
    "transformstart",
    "transformchange",
    "transformend",
    "transformcancel"
];

/**
 * On-map gizmo for translating and rotating entities.
 * @class
 * @extends {Control}
 * @param {IEntityGizmoParams} [options] - Gizmo options:
 * @param {GizmoTools} [options.tools] - Gizmo tool set, i.e. which handles are shown. `translate`
 * shows move axes and planes only, `full` adds rotation rings. Orthogonal to `editMode`.
 * @param {EditModeName} [options.editMode] - Rotation mode. `native` rotates in the entity's own
 * frame, `yaw` rotates in the local horizon frame. Affects the rotation rings only, so it does
 * nothing with `tools: "translate"`.
 * @param {boolean} [options.autoSelect] - When `false`, a left click on a map entity does not
 * change the gizmo selection, so the host application stays the only source of the selection.
 * Default is `true`.
 */
export class EntityGizmo extends Control {
    public events: EventsHandler<EntityGizmoEventsList>;

    protected _scene: EntityGizmoScene;

    constructor(options: IEntityGizmoParams = {}) {
        super({
            name: "EntityGizmo",
            autoActivate: true,
            ...options
        });

        this.events = createEvents(ENTITY_GIZMO_EVENTS, this);

        this._scene = new EntityGizmoScene({
            name: `entityGizmoScene:${this.__id}`,
            tools: options.tools,
            editMode: options.editMode,
            autoSelect: options.autoSelect
        });

        this._bindSceneEvents();
    }

    public override oninit() {
        if (this.planet) {
            this._scene.bindPlanet(this.planet);
        }
    }

    public override onactivate() {
        this.renderer && this.renderer.addScene(this._scene);
    }

    public override ondeactivate() {
        this._scene.deactivate();
        this.renderer && this.renderer.removeNode(this._scene);
    }

    public override onremove() {
        this._unbindSceneEvents();
    }

    /**
     * Gizmo tool set: which handles are shown.
     * @public
     */
    public get tools(): GizmoTools {
        return this._scene.tools;
    }

    public set tools(tools: GizmoTools) {
        this._scene.tools = tools;
    }

    /**
     * Rotation mode of the rotation rings. Does nothing with `tools: "translate"`.
     * @public
     */
    public get editMode(): EditModeName {
        return this._scene.editMode === YAW_MODE ? "yaw" : "native";
    }

    public set editMode(editMode: EditModeName) {
        this._scene.editMode = editMode === "yaw" ? YAW_MODE : NATIVE_MODE;
    }

    /**
     * When `false`, a left click on a map entity does not change the gizmo selection.
     * @public
     */
    public get autoSelect(): boolean {
        return this._scene.autoSelect;
    }

    public set autoSelect(autoSelect: boolean) {
        this._scene.autoSelect = autoSelect;
    }

    /**
     * Shows the gizmo on the given entity. Activates the control when it is inactive.
     * Changing the selection cancels any running gesture on the previously selected entity.
     * @public
     * @param {Entity} entity - Entity to transform.
     */
    public selectEntity(entity: Entity): void {
        if (!this.isActive()) {
            this.activate();
        }
        this._scene.select(entity);
    }

    /**
     * Hides the gizmo and drops the selection. Cancels a running gesture.
     * @public
     */
    public unselectEntity(): void {
        this._scene.unselect();
    }

    /**
     * Returns the selected entity or `null`.
     * @public
     * @returns {Entity | null}
     */
    public getSelectedEntity(): Entity | null {
        return this._scene.getSelectedEntity();
    }

    /**
     * Returns `true` while a drag gesture is running.
     * @public
     * @returns {boolean}
     */
    public isTransforming(): boolean {
        return this._scene.isTransforming();
    }

    /**
     * Returns the running gesture description or `null`.
     * @public
     * @returns {IGizmoTransformEvent | null}
     */
    public getActiveTransform(): IGizmoTransformEvent | null {
        return this._scene.getActiveTransform();
    }

    /**
     * Cancels the current gesture and restores the entity transform when possible.
     * @public
     * @returns {boolean} Whether a gesture was cancelled.
     */
    public cancelTransform(): boolean {
        return this._scene.cancelTransform();
    }

    protected _bindSceneEvents() {
        this._scene.events.on("select", this._onSelect);
        this._scene.events.on("unselect", this._onUnselect);
        this._scene.events.on("transformstart", this._onTransformStart);
        this._scene.events.on("transformchange", this._onTransformChange);
        this._scene.events.on("transformend", this._onTransformEnd);
        this._scene.events.on("transformcancel", this._onTransformCancel);
    }

    protected _unbindSceneEvents() {
        this._scene.events.off("select", this._onSelect);
        this._scene.events.off("unselect", this._onUnselect);
        this._scene.events.off("transformstart", this._onTransformStart);
        this._scene.events.off("transformchange", this._onTransformChange);
        this._scene.events.off("transformend", this._onTransformEnd);
        this._scene.events.off("transformcancel", this._onTransformCancel);
    }

    protected _onSelect = (entity: Entity) => {
        this.events.dispatch(this.events.select, entity);
    };

    protected _onUnselect = (entity: Entity | null) => {
        this.events.dispatch(this.events.unselect, entity);
    };

    protected _onTransformStart = (e: IGizmoTransformEvent) => {
        this.events.dispatch(this.events.transformstart, e);
    };

    protected _onTransformChange = (e: IGizmoTransformEvent) => {
        this.events.dispatch(this.events.transformchange, e);
    };

    protected _onTransformEnd = (e: IGizmoTransformEvent) => {
        this.events.dispatch(this.events.transformend, e);
    };

    protected _onTransformCancel = (e: IGizmoTransformEvent) => {
        this.events.dispatch(this.events.transformcancel, e);
    };
}
