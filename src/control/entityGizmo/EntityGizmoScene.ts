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

import { createEvents, type EventsHandler } from "../../Events";
import { MAX32 } from "../../math";
import { Plane } from "../../math/Plane";
import { Planet } from "../../scene/Planet";
import { Scene } from "../../scene/Scene";
import { Vec2 } from "../../math/Vec2";
import { Vec3 } from "../../math/Vec3";
import { Quat } from "../../math/Quat";
import type { IMouseState } from "../../renderer/RendererEvents";
import { Ellipsoid } from "../../ellipsoid/Ellipsoid";
import { LonLat } from "../../LonLat";
import { Entity } from "../../entity/Entity";
import { MoveAxisEntity } from "./MoveAxisEntity";
import { MovePlaneEntity } from "./MovePlaneEntity";
import { RotateEntity } from "./RotateEntity";
import { Ray } from "../../math/Ray";
import { Sphere } from "../../bv/Sphere";
import { AxisTrackEntity } from "./AxisTrackEntity";
import { CameraLock } from "../CameraLock";
import { Control } from "../Control";
import { EntityCollection } from "../../entity/EntityCollection";
import { SHADE_UNLIT } from "../../shadeModeConstants";

export interface IEntityGizmoSceneParams {
    planet?: Planet;
    name?: string;
    editMode?: EditModeName;
    tools?: GizmoTools;
    autoSelect?: boolean;
}

export const NATIVE_MODE = 0;
export const YAW_MODE = 1;

/** Rotation mode: the frame the rotation rings are built in and written back through. */
export type EditMode = typeof NATIVE_MODE | typeof YAW_MODE;
export type EditModeName = "native" | "yaw";

/**
 * Gizmo tool set, i.e. which handles are shown. Orthogonal to the rotation {@link EditModeName}.
 * `translate` - move axes and planes only.
 * `full` - move axes, planes and rotation rings.
 */
export type GizmoTools = "translate" | "full";

/** Gizmo handle names. Each handle belongs to exactly one {@link GizmoTransformKind}. */
export type GizmoTransformHandle =
    "move_x" | "move_y" | "move_z" | "move_xz" | "move_xy" | "move_zy" | "rotate_pitch" | "rotate_yaw" | "rotate_roll";

/** Kind of transformation a gesture performs. */
export type GizmoTransformKind = "translate" | "rotate";

/** Payload of `transformstart`, `transformchange`, `transformend` and `transformcancel`. */
export interface IGizmoTransformEvent {
    entity: Entity;
    kind: GizmoTransformKind;
    handle: GizmoTransformHandle;
}

const HANDLE_KINDS: Record<GizmoTransformHandle, GizmoTransformKind> = {
    move_x: "translate",
    move_y: "translate",
    move_z: "translate",
    move_xz: "translate",
    move_xy: "translate",
    move_zy: "translate",
    rotate_pitch: "rotate",
    rotate_yaw: "rotate",
    rotate_roll: "rotate"
};

const SUSPENDED_NAVIGATION_CONTROLS = ["navigation", "SimpleNavigation"];

interface IGizmoGesture {
    entity: Entity;
    handle: GizmoTransformHandle;
    kind: GizmoTransformKind;
    started: boolean;
    cartesian: Vec3;
    pitch: number;
    yaw: number;
    roll: number;
}

function dragSimpleRes(unit: Vec3, clickRay: Ray, currRay: Ray, p0: Vec3, res: Vec3) {
    let p1 = p0.add(Vec3.UP),
        p2 = p0.add(unit);

    let px = new Vec3();

    if (clickRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
        let clickCart = Vec3.proj_b_to_a(px, unit);
        if (currRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
            let dragCart = Vec3.proj_b_to_a(px, unit);
            let dragVec = dragCart.sub(clickCart);
            res.copy(p0.add(dragVec));
        }
    }
}

type EntityGizmoSceneEventsList = [
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter",
    "select",
    "unselect",
    "change",
    "position",
    "pitch",
    "yaw",
    "roll",
    "scale",
    "transformstart",
    "transformchange",
    "transformend",
    "transformcancel"
];

/**
 * Scene for translating and rotating entities with a gizmo.
 * @class
 * @extends {Scene}
 * @param {IEntityGizmoSceneParams} [options] - Gizmo scene options.
 */
class EntityGizmoScene extends Scene {
    public events: EventsHandler<EntityGizmoSceneEventsList>;

    protected _planet: Planet | null;

    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _moveLayer: EntityCollection;
    protected _planeLayer: EntityCollection;
    protected _rotateLayer: EntityCollection;
    protected _axisTrackLayer: EntityCollection;

    protected _selectedEntity: Entity | null;
    protected _selectedEntityCart: Vec3;
    protected _selectedEntityRotation: Quat;
    protected _selectedEntityPitch: number;
    protected _selectedEntityYaw: number;
    protected _selectedEntityRoll: number;

    protected _clickPos: Vec2;

    protected _axisEntity: MoveAxisEntity;
    protected _planeEntity: MovePlaneEntity;
    protected _rotateEntity: RotateEntity;
    protected _axisTrackEntity: AxisTrackEntity;

    protected _selectedMove: GizmoTransformHandle | null;

    protected _ops: Record<string, (mouseState: IMouseState) => void>;

    protected _axisTrackVisibility: boolean;
    protected _editMode: EditMode;
    protected _tools: GizmoTools;
    protected _autoSelect: boolean;
    protected _visibility: boolean;
    protected _isActivated: boolean;

    protected _gesture: IGizmoGesture | null;
    protected _suspendedNavigation: string[];

    constructor(options: IEntityGizmoSceneParams = {}) {
        super(options.name || "EntityGizmoScene");

        this.events = createEvents(ENTITY_GIZMO_SCENE_EVENTS);

        this._planet = options.planet || null;
        this._editMode = this._parseEditMode(options.editMode);
        this._tools = options.tools === "full" ? "full" : "translate";
        this._autoSelect = options.autoSelect !== false;

        this._startPos = null;
        this._startClick = new Vec2();

        this._axisEntity = new MoveAxisEntity();
        this._planeEntity = new MovePlaneEntity();
        this._rotateEntity = new RotateEntity();
        this._axisTrackEntity = new AxisTrackEntity();

        this._moveLayer = new EntityCollection({
            scaleByDistance: [0.1, MAX32, MAX32, 0.1],
            shadeMode: SHADE_UNLIT,
            pickingScale: [5, 1.1, 5],
            visibility: false,
            depthOrder: 1000
        });

        this._planeLayer = new EntityCollection({
            scaleByDistance: [0.1, MAX32, MAX32, 0.1],
            shadeMode: SHADE_UNLIT,
            visibility: false,
            depthOrder: 1000
        });

        this._rotateLayer = new EntityCollection({
            shadeMode: SHADE_UNLIT,
            visibility: false,
            depthOrder: 1000,
            pickingScale: 5
        });

        this._selectedEntity = null;
        this._clickPos = new Vec2();
        this._selectedEntityCart = new Vec3();
        this._selectedEntityRotation = Quat.IDENTITY;
        this._selectedEntityPitch = 0;
        this._selectedEntityYaw = 0;
        this._selectedEntityRoll = 0;
        this._selectedMove = null;

        this._axisTrackVisibility = false;
        this._visibility = false;
        this._isActivated = false;

        this._gesture = null;
        this._suspendedNavigation = [];

        this._axisTrackLayer = new EntityCollection({
            shadeMode: SHADE_UNLIT,
            visibility: false,
            pickingScale: 5,
            pickingEnabled: false,
            opacity: 0.6
        });

        this._ops = {
            move_x: this._moveX,
            move_y: this._moveY,
            move_z: this._moveZ,
            move_xz: this._moveXZ,
            move_xy: this._moveXY,
            move_zy: this._moveZY,
            rotate_pitch: this._rotatePitch,
            rotate_yaw: this._rotateYaw,
            rotate_roll: this._rotateRoll,
            scale: this._scale,
            scale_x: this._scaleX,
            scale_y: this._scaleY,
            scale_z: this._scaleZ
        };
    }

    get ellipsoid(): Ellipsoid | undefined {
        if (this._planet) {
            return this._planet.ellipsoid;
        }
    }

    get planet(): Planet | null {
        return this._planet;
    }

    get editMode(): EditMode {
        return this._editMode;
    }

    set editMode(mode: EditMode) {
        this._editMode = mode;
        if (this._selectedEntity) {
            let cart = this._selectedEntity.getAbsoluteCartesian();
            this._selectedEntityRotation = this._getEntityRotation(this._selectedEntity, cart);
            this._setRotateEntityCartesian3v(this._selectedEntity, cart);
        }
    }

    /** Gizmo tool set: which handles are shown. */
    get tools(): GizmoTools {
        return this._tools;
    }

    set tools(tools: GizmoTools) {
        if (tools === this._tools) return;
        this.cancelTransform();
        this._tools = tools;
        this._applyVisibility();
    }

    /** When `false`, a left click on a map entity does not change the gizmo selection. */
    get autoSelect(): boolean {
        return this._autoSelect;
    }

    set autoSelect(autoSelect: boolean) {
        this._autoSelect = autoSelect;
    }

    protected get _rotateEnabled(): boolean {
        return this._tools === "full";
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
    }

    protected _parseEditMode(mode: EditModeName | undefined): EditMode {
        if (mode === "native") {
            return NATIVE_MODE;
        } else if (mode === "yaw") {
            return YAW_MODE;
        }
        return NATIVE_MODE;
    }

    public override init() {
        this.activate();
    }

    public override onremove() {
        this.deactivate();
    }

    protected _addAxisLayers() {
        this._moveLayer.addTo(this);
        this._planeLayer.addTo(this);
        this._rotateLayer.addTo(this);
        this._axisTrackLayer.addTo(this);

        this._moveLayer.add(this._axisEntity);
        this._moveLayer.events.on("mouseenter", this._onAxisLayerMouseEnter);
        this._moveLayer.events.on("mouseleave", this._onAxisLayerMouseLeave);
        this._moveLayer.events.on("ldown", this._onAxisLayerLDown);

        this._planeLayer.add(this._planeEntity);
        this._planeLayer.events.on("mouseenter", this._onPlaneLayerMouseEnter);
        this._planeLayer.events.on("mouseleave", this._onPlaneLayerMouseLeave);
        this._planeLayer.events.on("ldown", this._onPlaneLayerLDown);

        this._rotateLayer.add(this._rotateEntity);
        this._rotateLayer.events.on("mouseenter", this._onRotateLayerMouseEnter);
        this._rotateLayer.events.on("mouseleave", this._onRotateLayerMouseLeave);
        this._rotateLayer.events.on("ldown", this._onRotateLayerLDown);

        this._axisTrackLayer.add(this._axisTrackEntity);
    }

    protected _onAxisLayerMouseEnter = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.setColorHTML(e.pickingObject.properties.style.selectColor);
    };

    protected _onAxisLayerMouseLeave = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.setColorHTML(e.pickingObject.properties.style.color);
    };

    /**
     * Suspends the navigation controls that are active right now, so that a drag gesture
     * does not fight with the camera. The suspended set is remembered and restored by
     * {@link EntityGizmoScene._navRestore}, which keeps controls that were already
     * deactivated beforehand deactivated.
     * @protected
     */
    protected _navSuspend() {
        if (!this.renderer) return;

        this._suspendedNavigation = [];

        for (let i = 0; i < SUSPENDED_NAVIGATION_CONTROLS.length; i++) {
            let name = SUSPENDED_NAVIGATION_CONTROLS[i];
            let control = this.renderer.controls[name] as (Control & { stop?: () => void }) | undefined;
            if (control && control.isActive()) {
                this._suspendedNavigation.push(name);
                control.deactivate();
                // Drops accumulated velocity and grabbed points, so no pressed button state survives.
                control.stop && control.stop();
            }
        }
    }

    protected _navRestore() {
        if (this.renderer) {
            for (let i = 0; i < this._suspendedNavigation.length; i++) {
                let control = this.renderer.controls[this._suspendedNavigation[i]];
                control && control.activate();
            }
        }
        this._suspendedNavigation = [];
    }

    protected _onAxisLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getAbsoluteCartesian();
        }

        this._beginGesture(e.pickingObject.properties.opName);
    };

    protected _onPlaneLayerMouseEnter = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.geoObject.setColorHTML(e.pickingObject.properties.style.selectColor);
    };

    protected _onPlaneLayerMouseLeave = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.geoObject.setColorHTML(e.pickingObject.properties.style.color);
    };

    protected _onPlaneLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getAbsoluteCartesian();
        }

        this._beginGesture(e.pickingObject.properties.opName);
    };

    protected _onRotateLayerMouseEnter = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.polyline!.setColorHTML(e.pickingObject.properties.style.selectColor);
    };

    protected _onRotateLayerMouseLeave = (e: IMouseState) => {
        this.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.polyline!.setColorHTML(e.pickingObject.properties.style.color);
    };

    protected _onRotateLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getAbsoluteCartesian();
            this._selectedEntityRotation = this._getEntityRotation(this._selectedEntity, this._selectedEntityCart);
            this._selectedEntityPitch = this._selectedEntity.getAbsolutePitch();
            this._selectedEntityYaw = this._selectedEntity.getAbsoluteYaw();
            this._selectedEntityRoll = this._selectedEntity.getAbsoluteRoll();
        }

        this._beginGesture(e.pickingObject.properties.opName);
    };

    protected _onMouseMove = (e: IMouseState) => {
        if (!this._gesture) return;

        if (!e.leftButtonHold && !e.leftButtonDown) {
            // The pointer has been released somewhere we did not hear about.
            this._endGesture();
            return;
        }

        if (!this._isEntityAttached(this._gesture.entity)) {
            this.cancelTransform();
            return;
        }

        if (this._selectedEntity && this._selectedMove && this._ops[this._selectedMove]) {
            this._ops[this._selectedMove](e);
        }
    };

    protected _removeAxisLayers() {
        this._moveLayer.events.off("mouseenter", this._onAxisLayerMouseEnter);
        this._moveLayer.events.off("mouseleave", this._onAxisLayerMouseLeave);
        this._moveLayer.events.off("ldown", this._onAxisLayerLDown);

        this._planeLayer.events.off("mouseenter", this._onPlaneLayerMouseEnter);
        this._planeLayer.events.off("mouseleave", this._onPlaneLayerMouseLeave);
        this._planeLayer.events.off("ldown", this._onPlaneLayerLDown);

        this._rotateLayer.events.off("mouseenter", this._onRotateLayerMouseEnter);
        this._rotateLayer.events.off("mouseleave", this._onRotateLayerMouseLeave);
        this._rotateLayer.events.off("ldown", this._onRotateLayerLDown);

        this._moveLayer.remove();
        this._planeLayer.remove();
        this._rotateLayer.remove();
        this._axisTrackLayer.remove();
    }

    public activate() {
        if (this._isActivated || !this.renderer) return;

        this._isActivated = true;

        this.renderer.events.on("lclick", this._onLclick);
        this.renderer.events.on("lup", this._onLUp);
        this.renderer.events.on("mousemove", this._onMouseMove);
        this.renderer.events.on("touchcancel", this._onTouchCancel);
        this.renderer.events.on("forwardpass", this._onForwardpass, this);
        this._addAxisLayers();
    }

    public deactivate() {
        if (!this._isActivated) return;

        this._isActivated = false;

        this.cancelTransform();
        this._unbindGestureListeners();
        this._navRestore();

        if (this._selectedEntity) {
            this.unselect();
        }

        if (this.renderer) {
            this.renderer.events.off("forwardpass", this._onForwardpass);
            this.renderer.events.off("lclick", this._onLclick);
            this.renderer.events.off("lup", this._onLUp);
            this.renderer.events.off("mousemove", this._onMouseMove);
            this.renderer.events.off("touchcancel", this._onTouchCancel);
        }

        this._selectedEntity = null;
        this._visibility = false;
        this._applyVisibility();
        this._setAxisTrackVisibility(false);
        this._removeAxisLayers();
    }

    protected _setAxisTrackVisibility(visibility: boolean) {
        if (visibility !== this._axisTrackVisibility) {
            this._axisTrackVisibility = visibility;
            this._axisTrackLayer.setVisibility(visibility);
        }
    }

    public setVisibility(visibility: boolean) {
        this._visibility = visibility;
        this._applyVisibility();
        this.unlockView();
    }

    protected _applyVisibility() {
        this._moveLayer.setVisibility(this._visibility);
        this._planeLayer.setVisibility(this._visibility);
        this._rotateLayer.setVisibility(this._visibility && this._rotateEnabled);
    }

    public readyToEdit(entity: Entity): boolean {
        return !entity.properties || !entity.properties.noEdit;
    }

    public select(entity: Entity) {
        if (
            (!this._selectedEntity || (this._selectedEntity && !entity.isEqual(this._selectedEntity))) &&
            this.readyToEdit(entity)
        ) {
            if (this._selectedEntity) {
                this.unselect();
            }
            this._selectedEntity = entity;

            this.renderer && this.renderer.setRelativeCenter();

            this.setVisibility(true);
            this.events.dispatch(this.events.select, this._selectedEntity);
        }
    }

    public unselect() {
        this.cancelTransform();
        this.setVisibility(false);
        let selectedEntity = this._selectedEntity;
        this._selectedEntity = null;
        this.events.dispatch(this.events.unselect, selectedEntity);
    }

    protected _onLclick = (e: IMouseState) => {
        if (this._autoSelect && e.pickingObject && e.pickingObject instanceof Entity) {
            this.select(e.pickingObject);
        }
    };

    public clear() {
        this.removeEntityCollection(this._moveLayer);
        this.removeEntityCollection(this._planeLayer);
        this.removeEntityCollection(this._rotateLayer);
        this.removeEntityCollection(this._axisTrackLayer);
    }

    protected _onForwardpass = () => {
        if (this._selectedEntity) {
            if (!this._isEntityAttached(this._selectedEntity)) {
                this.unselect();
                return;
            }

            let cart = this._selectedEntity.getAbsoluteCartesian();
            this._axisEntity.setCartesian3v(cart);
            this._planeEntity.setCartesian3v(cart);
            if (this._rotateEnabled) {
                this._setRotateEntityCartesian3v(this._selectedEntity, cart);
            }
            this._axisTrackEntity.setCartesian3v(cart);
        }
    };

    //
    // Gesture
    //

    /**
     * Returns `true` when a drag gesture is running right now.
     * @public
     */
    public isTransforming(): boolean {
        return this._gesture !== null;
    }

    /**
     * Returns the running gesture description or `null`.
     * @public
     */
    public getActiveTransform(): IGizmoTransformEvent | null {
        return this._gesture ? this._gestureEvent(this._gesture) : null;
    }

    /**
     * Cancels the current gesture and restores the entity transform when possible.
     * @public
     * @returns {boolean} Whether a gesture was cancelled.
     */
    public cancelTransform(): boolean {
        let gesture = this._gesture;
        if (!gesture) return false;

        this._gesture = null;
        this._selectedMove = null;
        this._unbindGestureListeners();
        this._setAxisTrackVisibility(false);
        this._navRestore();

        if (gesture.started && this._isEntityAttached(gesture.entity)) {
            this._restoreGesture(gesture);
        }

        if (gesture.started) {
            this.events.dispatch(this.events.transformcancel, this._gestureEvent(gesture));
        }

        return true;
    }

    protected _gestureEvent(gesture: IGizmoGesture): IGizmoTransformEvent {
        return {
            entity: gesture.entity,
            kind: gesture.kind,
            handle: gesture.handle
        };
    }

    protected _beginGesture(handle: GizmoTransformHandle) {
        if (!this._selectedEntity || !HANDLE_KINDS[handle]) return;

        this.cancelTransform();

        let entity = this._selectedEntity;

        this._selectedMove = handle;
        this._gesture = {
            entity,
            handle,
            kind: HANDLE_KINDS[handle],
            started: false,
            cartesian: entity.getCartesian().clone(),
            pitch: entity.getPitch(),
            yaw: entity.getYaw(),
            roll: entity.getRoll()
        };

        if (this._gesture.kind === "translate") {
            this._setAxisTrackVisibility(true);
        }

        this._bindGestureListeners();
        this._navSuspend();
    }

    /**
     * Dispatches `transformstart` right before the very first entity change of the gesture.
     * @protected
     */
    protected _beginChange() {
        let gesture = this._gesture;
        if (gesture && !gesture.started) {
            gesture.started = true;
            this.events.dispatch(this.events.transformstart, this._gestureEvent(gesture));
        }
    }

    protected _afterChange() {
        if (this._gesture) {
            this.events.dispatch(this.events.transformchange, this._gestureEvent(this._gesture));
        }
    }

    protected _endGesture() {
        let gesture = this._gesture;

        if (!gesture) return;

        this._gesture = null;
        this._selectedMove = null;

        this._unbindGestureListeners();
        this._setAxisTrackVisibility(false);
        this._navRestore();

        if (gesture.started) {
            this.events.dispatch(this.events.transformend, this._gestureEvent(gesture));
        }
    }

    protected _restoreGesture(gesture: IGizmoGesture) {
        if (gesture.kind === "translate") {
            gesture.entity.setCartesian3v(gesture.cartesian);
        } else {
            gesture.entity.setPitchYawRoll(gesture.pitch, gesture.yaw, gesture.roll);
        }
    }

    protected _isEntityAttached(entity: Entity): boolean {
        return Boolean(entity.entityCollection || entity._layer);
    }

    protected _bindGestureListeners() {
        if (typeof window === "undefined") return;

        window.addEventListener("pointerup", this._onWindowPointerUp, true);
        window.addEventListener("pointercancel", this._onWindowPointerCancel, true);
        window.addEventListener("blur", this._onWindowBlur);
    }

    protected _unbindGestureListeners() {
        if (typeof window === "undefined") return;

        window.removeEventListener("pointerup", this._onWindowPointerUp, true);
        window.removeEventListener("pointercancel", this._onWindowPointerCancel, true);
        window.removeEventListener("blur", this._onWindowBlur);
    }

    protected _onWindowPointerUp = () => {
        this._endGesture();
    };

    protected _onWindowPointerCancel = () => {
        this.cancelTransform();
    };

    protected _onWindowBlur = () => {
        this.cancelTransform();
    };

    protected _onLUp = () => {
        this._endGesture();
    };

    protected _onTouchCancel = () => {
        this.cancelTransform();
    };

    //
    // Operations
    //

    protected _moveX = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;

        let clickRay = cam.getRay2v(this._clickPos);
        let currRay = cam.getRay2v(e.pos);

        let px = new Vec3();

        if (this.planet) {
            let clickCart = clickRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;
            let currCart = currRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;

            if (!currCart) return;

            let rot = Quat.getRotationBetweenVectors(clickCart.normal(), currCart.normal());

            px = rot.mulVec3(p0);

            if (this.ellipsoid) {
                let p0_lonLat = this.ellipsoid.cartesianToLonLat(p0)!;
                let px_lonLat = this.ellipsoid.cartesianToLonLat(px)!;

                this.ellipsoid.lonLatToCartesianRes(new LonLat(px_lonLat.lon, p0_lonLat.lat, p0_lonLat.height), px);
            }
        } else {
            dragSimpleRes(Vec3.UNIT_X, clickRay, currRay, p0, px);
        }

        this._applyPosition(px);
    };

    protected _moveY = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;
        let groundNormal = Vec3.UP;
        if (this.planet) {
            groundNormal = this._axisEntity.getY();
        }
        let p1 = p0.add(groundNormal);
        let p2 = p0.add(cam.getRight());
        let px = new Vec3();

        let clickRay = cam.getRay2v(this._clickPos);
        let currRay = cam.getRay2v(e.pos);

        if (clickRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
            let clickCart = Vec3.proj_b_to_a(px, groundNormal);
            if (currRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), px) === Ray.INSIDE) {
                let dragCart = Vec3.proj_b_to_a(px, groundNormal);
                let dragVec = dragCart.sub(clickCart);
                let pos = this._selectedEntityCart.add(dragVec);
                this._applyPosition(pos);
            }
        }
    };

    protected _moveZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;

        let clickRay = cam.getRay2v(this._clickPos);
        let currRay = cam.getRay2v(e.pos);

        let px = new Vec3();

        if (this.planet) {
            let clickCart = clickRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;
            let currCart = currRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;

            if (!currCart) return;

            let rot = Quat.getRotationBetweenVectors(clickCart.normal(), currCart.normal());

            px = rot.mulVec3(p0);

            if (this.ellipsoid) {
                let p0_lonLat = this.ellipsoid.cartesianToLonLat(p0)!;
                let px_lonLat = this.ellipsoid.cartesianToLonLat(px)!;

                this.ellipsoid.lonLatToCartesianRes(new LonLat(p0_lonLat.lon, px_lonLat.lat, p0_lonLat.height), px);
            }
        } else {
            dragSimpleRes(Vec3.UNIT_Z, clickRay, currRay, p0, px);
        }

        this._applyPosition(px);
    };

    protected _moveXZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;

        let clickRay = cam.getRay2v(this._clickPos);
        let currRay = cam.getRay2v(e.pos);

        let px = new Vec3();

        if (this.planet) {
            let clickCart = clickRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;
            let currCart = currRay.hitSphere(new Sphere(p0.length(), new Vec3()))!;

            if (!currCart) return;

            let rot = Quat.getRotationBetweenVectors(clickCart.normal(), currCart.normal());

            px = rot.mulVec3(p0);

            if (this.ellipsoid) {
                let lonLat = this.ellipsoid.cartesianToLonLat(px)!;
                let height = this.ellipsoid.cartesianToLonLat(p0)!.height;

                this.ellipsoid.lonLatToCartesianRes(new LonLat(lonLat.lon, lonLat.lat, height), px);
            }
        } else {
            let p1 = p0.add(Vec3.UNIT_X),
                p2 = p0.add(Vec3.UNIT_Z);
            let clickCart = new Vec3(),
                dragCart = new Vec3();
            if (clickRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), clickCart) === Ray.INSIDE) {
                if (currRay.hitPlaneRes(Plane.fromPoints(p0, p1, p2), dragCart) === Ray.INSIDE) {
                    let dragVec = dragCart.sub(clickCart);
                    px = p0.add(dragVec);
                }
            }
        }

        this._applyPosition(px);
    };

    protected _moveXY = (e: IMouseState) => {};

    protected _moveZY = (e: IMouseState) => {};

    /**
     * Applies a new absolute position to the selected entity and emits the gesture events
     * around the change. The `position` event receives the applied `pos` and the entity.
     * @protected
     * @param {Vec3} pos - New absolute cartesian position.
     */
    protected _applyPosition(pos: Vec3) {
        let entity = this._selectedEntity!;

        this._beginChange();
        entity.setAbsoluteCartesian3v(pos);
        this.events.dispatch(this.events.position, pos, entity);
        this.events.dispatch(this.events.change, entity);
        this._afterChange();
    }

    public override getFrameRotation(cartesian: Vec3): Quat {
        return this._planet ? this._planet.getFrameRotation(cartesian) : super.getFrameRotation(cartesian);
    }

    protected _isPlanetEntity(entity: Entity): boolean {
        const scene = entity.entityCollection?.scene as Planet | undefined;
        const hasPlanetScene = Boolean(scene?.ellipsoid);
        const hasFallbackPlanet = Boolean(this._planet);

        return hasPlanetScene || hasFallbackPlanet;
    }

    protected _isYawMode(): boolean {
        return this.editMode === YAW_MODE;
    }

    protected _getYawModeFrameRotation(entity: Entity, cart: Vec3): Quat {
        const scene = entity.entityCollection?.scene as Planet | undefined;
        if (scene?.ellipsoid) {
            return scene.getFrameRotation(cart);
        }

        if (this._planet) {
            return this._planet.getFrameRotation(cart);
        }

        return Quat.getLookRotation(Vec3.FORWARD, Vec3.UP);
    }

    protected _getEntityRotation(entity: Entity, cart: Vec3): Quat {
        return this._isYawMode()
            ? new Quat().setPitchYawRoll(0, entity.getAbsoluteYaw(), 0, this._getYawModeFrameRotation(entity, cart))
            : entity.getAbsoluteRotation();
    }

    protected _setRotateEntityCartesian3v(entity: Entity, cart: Vec3) {
        if (this._isYawMode()) {
            this._rotateEntity.setYawCartesian3v(cart, entity.getAbsoluteYaw());
        } else {
            this._rotateEntity.setCartesian3v(cart, this._getEntityRotation(entity, cart));
        }
    }

    protected _setEntityRotation(entity: Entity, rotation: Quat, cart: Vec3) {
        if (entity.parent && entity.relativePosition) {
            entity.setAbsoluteRotation(rotation);
            return;
        }

        let rot = this._isPlanetEntity(entity)
            ? this.getFrameRotation(cart).conjugate().inverse().mul(rotation)
            : rotation;

        entity.setAbsolutePitch(rot.getPitch());
        entity.setAbsoluteYaw(rot.getYaw());
        entity.setAbsoluteRoll(rot.getRoll());
    }

    protected _rotatePitch = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;
        let norm = this._selectedEntityRotation.mulVec3(new Vec3(1, 0, 0)).normalize();

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (cam.getRay2v(this._clickPos).hitPlaneRes(pl, clickCart) === Ray.INSIDE) {
            if (cam.getRay2v(e.pos).hitPlaneRes(pl, dragCart) === Ray.INSIDE) {
                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c0.cross(c1).dot(norm));
                let angle = Math.acos(c0.dot(c1));
                let deg = this._selectedEntityPitch + sig * angle;

                this._beginChange();

                if (this._isYawMode()) {
                    this._selectedEntity.setAbsolutePitch(deg);
                } else {
                    let rot = Quat.axisAngleToQuat(norm, sig * angle).mul(this._selectedEntityRotation);
                    this._setEntityRotation(this._selectedEntity, rot, p0);
                }

                this.events.dispatch(this.events.pitch, deg, this._selectedEntity);
                this.events.dispatch(this.events.change, this._selectedEntity);
                this._afterChange();
            }
        }
    };

    protected _rotateYaw = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;
        let norm = this._selectedEntityRotation.mulVec3(new Vec3(0, 1, 0)).normalize();

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (cam.getRay2v(this._clickPos).hitPlaneRes(pl, clickCart) === Ray.INSIDE) {
            if (cam.getRay2v(e.pos).hitPlaneRes(pl, dragCart) === Ray.INSIDE) {
                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c1.cross(c0).dot(norm));
                let angle = Math.acos(c0.dot(c1));
                let deg = this._selectedEntityYaw + sig * angle;

                this._beginChange();

                if (this._isYawMode()) {
                    this._selectedEntity.setAbsoluteYaw(deg);
                } else {
                    let rot = Quat.axisAngleToQuat(norm, -sig * angle).mul(this._selectedEntityRotation);
                    this._setEntityRotation(this._selectedEntity, rot, p0);
                }

                this.events.dispatch(this.events.yaw, deg, this._selectedEntity);
                this.events.dispatch(this.events.change, this._selectedEntity);
                this._afterChange();
            }
        }
    };

    protected _rotateRoll = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this.renderer!.activeCamera;
        let p0 = this._selectedEntityCart;
        let norm = this._selectedEntityRotation.mulVec3(new Vec3(0, 0, 1)).normalize();

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (cam.getRay2v(this._clickPos).hitPlaneRes(pl, clickCart) === Ray.INSIDE) {
            if (cam.getRay2v(e.pos).hitPlaneRes(pl, dragCart) === Ray.INSIDE) {
                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c0.cross(c1).dot(norm));
                let angle = Math.acos(c0.dot(c1));
                let deg = this._selectedEntityRoll + sig * angle;

                this._beginChange();

                if (this._isYawMode()) {
                    this._selectedEntity.setAbsoluteRoll(deg);
                } else {
                    let rot = Quat.axisAngleToQuat(norm, sig * angle).mul(this._selectedEntityRotation);
                    this._setEntityRotation(this._selectedEntity, rot, p0);
                }

                this.events.dispatch(this.events.roll, deg, this._selectedEntity);
                this.events.dispatch(this.events.change, this._selectedEntity);
                this._afterChange();
            }
        }
    };

    protected _scale = (e: IMouseState) => {
        let scale = 1;
        this.events.dispatch(this.events.scale, scale, this._selectedEntity);
        this.events.dispatch(this.events.change, this._selectedEntity);
    };

    protected _scaleX = (e: IMouseState) => {};

    protected _scaleY = (e: IMouseState) => {};

    protected _scaleZ = (e: IMouseState) => {};

    public getSelectedEntity(): Entity | null {
        return this._selectedEntity;
    }

    public lockView() {
        if (this.renderer && this._selectedEntity) {
            let camLock = this.renderer.controls.CameraLock as CameraLock;
            camLock && camLock.lockView(this._selectedEntity);
        }
    }

    public unlockView() {
        if (this.renderer && this._selectedEntity) {
            let camLock = this.renderer.controls.CameraLock as CameraLock;
            if (camLock) {
                camLock.unlockView();
            }
        }
    }
}

const ENTITY_GIZMO_SCENE_EVENTS: EntityGizmoSceneEventsList = [
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter",
    "select",
    "unselect",
    "change",
    "position",
    "pitch",
    "yaw",
    "roll",
    "scale",
    "transformstart",
    "transformchange",
    "transformend",
    "transformcancel"
];

export { EntityGizmoScene };
