import type { IControlParams } from "./Control";
import { Control } from "./Control";
import type { IMouseState } from "../renderer/RendererEvents";
import { Navigation } from "./Navigation";
import { Quat } from "../math/Quat";
import type { Vec2 } from "../math/Vec2";
import { Vec3 } from "../math/Vec3";
import { input } from "../input/input";
import { createEvents, type EventsHandler } from "../Events";
import * as math from "../math";
import { RADIANS } from "../math";

export interface IFreeNavigationParams extends IControlParams {
    speed?: number;
    minSpeed?: number;
    maxSpeed?: number;
    speedStep?: number;
    speedFactor?: number;
    lookSensitivity?: number;
    rollSpeed?: number;
    accelerationTime?: number;
    decelerationTime?: number;
    pitchLimit?: number;
    invertY?: boolean;
    pointerLock?: boolean;
    toggleKey?: number;
    showInfo?: boolean;
}

export type FreeNavigationEventsList = ["move", "rotate", "speedchange", "activate", "deactivate"];

const FREE_NAVIGATION_EVENTS: FreeNavigationEventsList = [
    /**
     * Triggered on camera movement.
     * @event og.FreeNavigation#move
     */
    "move",

    /**
     * Triggered on camera rotation.
     * @event og.FreeNavigation#rotate
     */
    "rotate",

    /**
     * Triggered when selected movement speed has been changed.
     * @event og.FreeNavigation#speedchange
     */
    "speedchange",

    /**
     * Triggered on the control activation.
     * @event og.FreeNavigation#activate
     */
    "activate",

    /**
     * Triggered on the control deactivation, i.e. when the pointer lock has been released.
     * @event og.FreeNavigation#deactivate
     */
    "deactivate"
];

// Selected movement speed in meters per second
const DEFAULT_SPEED = 0;
const DEFAULT_MAX_SPEED = 1000000;
const DEFAULT_MIN_SPEED = -DEFAULT_MAX_SPEED;

// Mouse wheel step in meters per second near the zero speed
const DEFAULT_SPEED_STEP = 1;

// Relative speed increment per one mouse wheel step, i.e. 0.45 is 45% of the current speed
const DEFAULT_SPEED_FACTOR = 0.45;

// Camera rotation angle per one mouse move pixel
const DEFAULT_LOOK_SENSITIVITY = 0.08 * RADIANS;

// Q/E roll angular speed in radians per second
const DEFAULT_ROLL_SPEED = 60 * RADIANS;

// Time in seconds the velocity needs to approach the selected speed
const DEFAULT_ACCELERATION_TIME = 0.6;

// Time in seconds the velocity needs to approach zero after keys have been released
const DEFAULT_DECELERATION_TIME = 0.4;

// Maximal camera pitch angle above and below the local horizon
const DEFAULT_PITCH_LIMIT = 89.5 * RADIANS;

// Maximal mouse movement of a single locked pointer event in pixels
const MAX_POINTER_MOVEMENT = 400;

const MIN_VELOCITY = 1e-3;
const MAX_FRAME_DELTA_TIME = 0.1;
const FREE_NAVIGATION_PREDRAW_PRIORITY = -10000;

/**
 * Free-flight camera navigation.
 *
 * - W/S — move forward/backward
 * - A/D — strafe left/right
 * - Space/Ctrl — increase/decrease altitude
 * - Q/E — roll
 * - Mouse — look around
 * - Mouse wheel — adjust movement speed
 * - Right mouse button — hold to keep the point under the screen center in the center
 * - F — activate and deactivate the control, see `toggleKey`
 *
 * Yaw follows the local ellipsoid normal, while pitch uses the camera's right vector.
 * The camera preserves its orientation relative to the local horizon while moving.
 *
 * By default, pointer lock allows unrestricted mouse rotation. Pressing Escape releases
 * the pointer and deactivates the control. Set `pointerLock` to `false` to use regular
 * mouse movement instead.
 *
 * The control conflicts with the {@link Navigation} control, so an active {@link Navigation}
 * is deactivated while the free navigation is active, and restored back on deactivation.
 *
 * @class
 * @extends {Control}
 * @param {IFreeNavigationParams} [options] - Free navigation options:
 * @param {number} [options.speed] - Initial selected movement speed in m/s. Default is 0
 * @param {number} [options.minSpeed] - Minimal selected movement speed in m/s. Default is -300
 * @param {number} [options.maxSpeed] - Maximal selected movement speed in m/s. Default is 1000000
 * @param {number} [options.speedStep] - Mouse wheel speed step near the zero speed in m/s. Default is 1
 * @param {number} [options.speedFactor] - Relative speed increment per one mouse wheel step. Default is 0.45
 * @param {number} [options.lookSensitivity] - Camera rotation angle in radians per mouse move pixel
 * @param {number} [options.rollSpeed] - Q/E roll angular speed in radians per second
 * @param {number} [options.accelerationTime] - Acceleration smoothing time in seconds. Default is 0.6
 * @param {number} [options.decelerationTime] - Deceleration smoothing time in seconds. Default is 0.4
 * @param {number} [options.pitchLimit] - Maximal pitch angle above and below the local horizon in radians
 * @param {boolean} [options.invertY] - Inverts vertical mouse rotation direction. Default is false
 * @param {boolean} [options.pointerLock] - Locks and hides the mouse pointer. Default is true
 * @param {number} [options.toggleKey] - Key code which activates and deactivates the control,
 * it works while the control is inactive as well. Zero disables it. Default is `input.KEY_F`
 * @param {boolean} [options.showInfo] - Shows the movement speed and the key hint. Default is false
 * @fires move
 * @fires rotate
 * @fires speedchange
 * @fires activate
 * @fires deactivate
 */
export class FreeNavigation extends Control {
    public events: EventsHandler<FreeNavigationEventsList>;

    public minSpeed: number;
    public maxSpeed: number;
    public speedStep: number;
    public speedFactor: number;
    public lookSensitivity: number;
    public rollSpeed: number;
    public accelerationTime: number;
    public decelerationTime: number;
    public pitchLimit: number;
    public invertY: boolean;
    public pointerLock: boolean;
    public toggleKey: number;

    /**
     * Current camera velocity in meters per second.
     * @public
     * @type {Vec3}
     */
    public vel: Vec3;

    /**
     * Selected movement speed in meters per second.
     * @protected
     * @type {number}
     */
    protected _speed: number;

    protected _moveForward: boolean;
    protected _moveBackward: boolean;
    protected _moveLeft: boolean;
    protected _moveRight: boolean;
    protected _moveUp: boolean;
    protected _moveDown: boolean;

    protected _rollDir: number;

    protected _dx: number;
    protected _dy: number;
    protected _skipPointerMove: boolean;

    protected _targetPoint: Vec3 | null;
    protected _targetRequest: number;

    protected _lastFrameTime: number;
    protected _frameDeltaTime: number;

    protected _infoEl: HTMLElement | null;

    protected _suspendedNavigation: Navigation[];

    constructor(options: IFreeNavigationParams = {}) {
        super({
            name: "freeNavigation",
            autoActivate: true,
            ...options
        });

        this.events = createEvents<FreeNavigationEventsList>(FREE_NAVIGATION_EVENTS, this);

        this.minSpeed = options.minSpeed ?? DEFAULT_MIN_SPEED;
        this.maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;
        this.speedStep = options.speedStep ?? DEFAULT_SPEED_STEP;
        this.speedFactor = options.speedFactor ?? DEFAULT_SPEED_FACTOR;
        this.lookSensitivity = options.lookSensitivity ?? DEFAULT_LOOK_SENSITIVITY;
        this.rollSpeed = options.rollSpeed ?? DEFAULT_ROLL_SPEED;
        this.accelerationTime = options.accelerationTime ?? DEFAULT_ACCELERATION_TIME;
        this.decelerationTime = options.decelerationTime ?? DEFAULT_DECELERATION_TIME;
        this.pitchLimit = options.pitchLimit ?? DEFAULT_PITCH_LIMIT;
        this.invertY = options.invertY ?? false;
        this.pointerLock = options.pointerLock ?? true;
        this.toggleKey = options.toggleKey ?? input.KEY_F;

        this._infoEl = options.showInfo ? document.createElement("div") : null;

        this.vel = new Vec3();

        this._speed = math.clamp(options.speed ?? DEFAULT_SPEED, this.minSpeed, this.maxSpeed);

        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;
        this._moveUp = false;
        this._moveDown = false;

        this._rollDir = 0;

        this._dx = 0;
        this._dy = 0;
        this._skipPointerMove = true;

        this._targetPoint = null;
        this._targetRequest = 0;

        this._lastFrameTime = 0;
        this._frameDeltaTime = 0;

        this._suspendedNavigation = [];
    }

    override onadd(): void {
        if (this.planet?.camera) {
            this.planet.camera.events.on("flystart", this._onCameraFly);
        }
    }

    public override oninit() {
        if (this.toggleKey) {
            this.renderer!.events.on("keyfree", this.toggleKey, this._onToggleKey);
        }

        let div = this.renderer!.div;
        if (this._infoEl && div) {
            this._infoEl.className = "og-free-navigation-info";
            div.appendChild(this._infoEl);
            this._updateInfo();
        }
    }

    override onremove(): void {
        if (this.planet?.camera) {
            this.planet.camera.events.off("flystart", this._onCameraFly);
        }

        if (this.toggleKey) {
            this.renderer!.events.off("keyfree", this.toggleKey, this._onToggleKey);
        }

        if (this._infoEl) {
            this._infoEl.remove();
        }
    }

    /**
     * Activates the control when it is inactive and deactivates it otherwise.
     * @public
     */
    public toggle() {
        if (this.isActive()) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    protected _onToggleKey = () => {
        this.toggle();
    };

    protected _updateInfo() {
        if (!this._infoEl) return;

        this._infoEl.innerText = this.isActive()
            ? `Free flight — W,S,A,D move, Space/Ctrl altitude, Q,E roll, RMB lock target, wheel speed: ` +
              `${this._speed} m/s (${Math.round(this._speed * 3.6)} km/h)`
            : "Press F for the free flight";
    }

    public override onactivate() {
        super.onactivate();

        this._suspendNavigation();

        this._lastFrameTime = 0;

        let r = this.renderer!;
        r.events.on("mousewheel", this._onMouseWheel);
        r.events.on("mousemove", this._onMouseMove);
        r.events.on("mouseleave", this._onMouseLeave);
        r.events.on("ldown", this._onLDown);
        r.events.on("rdown", this._onRDown);
        r.events.on("rup", this._onRUp);
        r.events.on("keyfree", input.KEY_ESC, this._onKeyEscape);
        r.events.on("keypress", input.KEY_W, this._onKeyForward);
        r.events.on("keypress", input.KEY_S, this._onKeyBackward);
        r.events.on("keypress", input.KEY_A, this._onKeyLeft);
        r.events.on("keypress", input.KEY_D, this._onKeyRight);
        r.events.on("keypress", input.KEY_SPACE, this._onKeyUp);
        r.events.on("keypress", input.KEY_CTRL, this._onKeyDown);
        r.events.on("keypress", input.KEY_Q, this._onKeyRollLeft);
        r.events.on("keypress", input.KEY_E, this._onKeyRollRight);
        r.events.on("predraw", this.onPreDraw, this, FREE_NAVIGATION_PREDRAW_PRIORITY);

        document.addEventListener("pointerlockchange", this._onPointerLockChange);
        document.addEventListener("mousemove", this._onLockedMouseMove);

        this.requestPointerLock();

        this._updateInfo();

        this.events.dispatch(this.events.activate, this);
    }

    public override ondeactivate() {
        super.ondeactivate();

        let r = this.renderer!;
        r.events.off("mousewheel", this._onMouseWheel);
        r.events.off("mousemove", this._onMouseMove);
        r.events.off("mouseleave", this._onMouseLeave);
        r.events.off("ldown", this._onLDown);
        r.events.off("rdown", this._onRDown);
        r.events.off("rup", this._onRUp);
        r.events.off("keyfree", input.KEY_ESC, this._onKeyEscape);
        r.events.off("keypress", input.KEY_W, this._onKeyForward);
        r.events.off("keypress", input.KEY_S, this._onKeyBackward);
        r.events.off("keypress", input.KEY_A, this._onKeyLeft);
        r.events.off("keypress", input.KEY_D, this._onKeyRight);
        r.events.off("keypress", input.KEY_SPACE, this._onKeyUp);
        r.events.off("keypress", input.KEY_CTRL, this._onKeyDown);
        r.events.off("keypress", input.KEY_Q, this._onKeyRollLeft);
        r.events.off("keypress", input.KEY_E, this._onKeyRollRight);
        r.events.off("predraw", this.onPreDraw);

        document.removeEventListener("pointerlockchange", this._onPointerLockChange);
        document.removeEventListener("mousemove", this._onLockedMouseMove);

        this.exitPointerLock();

        this.stop();

        this._restoreNavigation();

        this._updateInfo();

        this.events.dispatch(this.events.deactivate, this);
    }

    /**
     * Returns selected movement speed in meters per second.
     * @public
     * @return {number} -
     */
    public get speed(): number {
        return this._speed;
    }

    /**
     * Sets selected movement speed in meters per second.
     * @public
     * @param {number} speed - Speed in m/s.
     */
    public set speed(speed: number) {
        this.setSpeed(speed);
    }

    /**
     * Sets selected movement speed in meters per second, clamped to the min and max speed.
     * @public
     * @param {number} speed - Speed in m/s.
     */
    public setSpeed(speed: number) {
        let s = math.clamp(speed, this.minSpeed, this.maxSpeed);
        if (s !== this._speed) {
            this._speed = s;
            this._updateInfo();
            this.events.dispatch(this.events.speedchange, this);
        }
    }

    /**
     * Changes the movement speed by the given number of wheel steps.
     *
     * The speed step increases with the current speed. Changes are reversible,
     * and zero speed is always reachable.
     * @public
     * @param {number} steps - Number of the wheel steps, negative decreases the speed.
     */
    public stepSpeed(steps: number) {
        if (steps === 0) return;

        if (this.speedFactor <= 0) {
            this.setSpeed(this._speed + steps * this.speedStep);
            return;
        }

        let zeroStep = this.speedStep / this.speedFactor;
        let s = this._speed;
        let scaled = Math.sign(s) * Math.log(1.0 + Math.abs(s) / zeroStep) + steps * this.speedFactor;

        let speed = Math.sign(scaled) * zeroStep * Math.expm1(Math.abs(scaled));
        speed = Math.round(speed);

        if (speed === this._speed) {
            speed = this._speed + Math.sign(steps);
        }

        if (this._speed !== 0 && Math.sign(speed) !== Math.sign(this._speed)) {
            speed = 0;
        }

        this.setSpeed(speed);
    }

    /**
     * True when the mouse pointer is locked by the control.
     * @public
     * @return {boolean} -
     */
    public isPointerLocked(): boolean {
        let canvas = this.renderer?.handler.canvas;
        return !!canvas && document.pointerLockElement === canvas;
    }

    /**
     * Locks and hides the mouse pointer over the canvas.
     * @public
     */
    public requestPointerLock() {
        if (!this.pointerLock || this.isPointerLocked()) return;

        let canvas = this.renderer?.handler.canvas;
        if (!canvas) return;

        let lock = canvas.requestPointerLock as (options?: any) => Promise<void> | undefined;

        // Fixed mouse jump.
        let request = lock.call(canvas, { unadjustedMovement: true });

        if (request && typeof request.catch === "function") {
            request.catch(() => {
                let fallback = lock.call(canvas);
                if (fallback && typeof fallback.catch === "function") {
                    fallback.catch(() => {});
                }
            });
        }
    }

    /**
     * Releases the mouse pointer.
     * @public
     */
    public exitPointerLock() {
        if (this.isPointerLocked()) {
            document.exitPointerLock();
        }
    }

    /**
     * Locked target point in the cartesian coordinates, or null when no target is locked.
     * @public
     * @return {Vec3 | null} -
     */
    public get targetPoint(): Vec3 | null {
        return this._targetPoint;
    }

    /**
     * Locks the target point, so the camera keeps looking at it wherever it moves,
     * @public
     * @param {Vec3} [point] - Target point in the cartesian coordinates.
     */
    public lockTarget(point?: Vec3 | null) {
        this._targetRequest++;

        if (point) {
            this._targetPoint = point;
            return;
        }

        let px = this._getTargetPixel();
        let request = this._targetRequest;

        this._targetPoint = this._pickTargetPoint(px);

        this.renderer!.getCartesianFromPixelAsync(px).then((picked?: Vec3) => {
            if (picked && request === this._targetRequest) {
                this._targetPoint = picked;
            }
        });
    }

    /**
     * Releases the locked target point.
     * @public
     */
    public unlockTarget() {
        this._targetRequest++;
        this._targetPoint = null;
    }

    /**
     * Stops the camera movement and releases the locked target point.
     * @public
     */
    public stop() {
        this.vel.set(0, 0, 0);
        this.unlockTarget();
        this._resetInput();
    }

    protected onPreDraw() {
        if (!this.planet) return;

        this._updateFrameDeltaTime();

        if (this._hasInput()) {
            this.planet.stopFlying();
        }

        this._handleRotation();
        this._handleRoll();
        this._handleMove();
        this._handleTargetLock();

        this._resetInput();
    }

    protected _hasInput(): boolean {
        return (
            this._dx !== 0 ||
            this._dy !== 0 ||
            this._rollDir !== 0 ||
            this._moveForward ||
            this._moveBackward ||
            this._moveLeft ||
            this._moveRight ||
            this._moveUp ||
            this._moveDown
        );
    }

    protected _resetInput() {
        this._dx = 0;
        this._dy = 0;
        this._rollDir = 0;
        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;
        this._moveUp = false;
        this._moveDown = false;
    }

    private _onCameraFly = () => {
        this.stop();
    };

    protected _onMouseMove = (e: IMouseState) => {
        if (this.isPointerLocked()) return;

        this._dx += e.x - e.prev_x;
        this._dy += e.y - e.prev_y;
    };

    protected _onLockedMouseMove = (e: MouseEvent) => {
        if (!this.isPointerLocked()) return;

        if (this._skipPointerMove) {
            this._skipPointerMove = false;
            return;
        }

        if (Math.abs(e.movementX) > MAX_POINTER_MOVEMENT || Math.abs(e.movementY) > MAX_POINTER_MOVEMENT) {
            return;
        }

        let pixelRatio = this.renderer!.handler.pixelRatio;

        this._dx += e.movementX * pixelRatio;
        this._dy += e.movementY * pixelRatio;
    };

    protected _onPointerLockChange = () => {
        this._dx = 0;
        this._dy = 0;
        this._skipPointerMove = true;

        if (this._active && this.pointerLock && !this.isPointerLocked()) {
            this.deactivate();
        }
    };

    protected _onLDown = () => {
        this.requestPointerLock();
    };

    protected _onRDown = () => {
        this.planet?.stopFlying();

        this.lockTarget();
    };

    protected _onRUp = () => {
        this.unlockTarget();
    };

    protected _onKeyEscape = () => {
        this.deactivate();
    };

    protected _onMouseLeave = () => {
        this._dx = 0;
        this._dy = 0;
    };

    protected _onMouseWheel = (e: IMouseState) => {
        this.stepSpeed(Math.sign(e.wheelDelta));
    };

    protected _onKeyForward = () => {
        this._moveForward = true;
    };

    protected _onKeyBackward = () => {
        this._moveBackward = true;
    };

    protected _onKeyLeft = () => {
        this._moveLeft = true;
    };

    protected _onKeyRight = () => {
        this._moveRight = true;
    };

    protected _onKeyUp = () => {
        this._moveUp = true;
    };

    protected _onKeyDown = () => {
        this._moveDown = true;
    };

    protected _onKeyRollLeft = () => {
        this._rollDir -= 1;
    };

    protected _onKeyRollRight = () => {
        this._rollDir += 1;
    };

    protected _getLocalUp(eye: Vec3): Vec3 {
        return this.planet!.ellipsoid.getSurfaceNormal3v(eye);
    }

    protected _getTargetPixel(): Vec2 {
        let r = this.renderer!;
        return this.isPointerLocked() ? r.handler.getCenter() : r.events.mouseState.pos.clone();
    }

    protected _pickTargetPoint(px: Vec2): Vec3 | null {
        return this.planet?.getCartesianFromPixelTerrain(px) || null;
    }

    protected _handleTargetLock() {
        if (!this._targetPoint) return;

        let cam = this.planet!.camera;
        let dir = this._targetPoint.sub(cam.eye);

        if (dir.length2() === 0) {
            return;
        }

        dir.normalize();

        let localUp = this._getLocalUp(cam.eye);
        let rotated = false;

        let forwardProj = Vec3.proj_b_to_plane(cam.getForward(), localUp);
        let dirProj = Vec3.proj_b_to_plane(dir, localUp);

        if (forwardProj.length2() > 0 && dirProj.length2() > 0) {
            forwardProj.normalize();
            dirProj.normalize();

            let yaw = Math.atan2(forwardProj.cross(dirProj).dot(localUp), forwardProj.dot(dirProj));

            if (yaw !== 0) {
                cam.rotate(Quat.axisAngleToQuat(localUp, yaw));
                rotated = true;
            }
        }

        // Pitch around the horizontal axis, which is the camera right vector when there is no roll
        let forward = cam.getForward();
        let axis = forward.cross(localUp);
        axis = axis.length2() > 0 ? axis.normalize() : cam.getRight();

        let pitch = Math.atan2(forward.cross(dir).dot(axis), forward.dot(dir));

        if (pitch !== 0) {
            cam.rotate(Quat.axisAngleToQuat(axis, pitch));
            rotated = true;
        }

        if (!rotated) return;

        this._orthonormalizeCamera();

        this.events.dispatch(this.events.rotate, this);
    }

    protected _handleRotation() {
        if (this._targetPoint) {
            return;
        }

        if (this._dx === 0 && this._dy === 0) {
            return;
        }

        let cam = this.planet!.camera;
        let localUp = this._getLocalUp(cam.eye);

        let yaw = -this._dx * this.lookSensitivity;
        let pitch = (this.invertY ? this._dy : -this._dy) * this.lookSensitivity;

        if (yaw !== 0) {
            cam.rotate(Quat.axisAngleToQuat(localUp, yaw));
        }

        if (pitch !== 0) {
            pitch = this._limitPitch(pitch, cam.getForward(), cam.getRight(), localUp);
            if (pitch !== 0) {
                cam.rotate(Quat.axisAngleToQuat(cam.getRight(), pitch));
            }
        }

        this._orthonormalizeCamera();

        this.events.dispatch(this.events.rotate, this);
    }

    /**
     * Clamps the pitch rotation angle.
     * @protected
     * @param {number} angle - Pitch angle in radians.
     * @param {Vec3} forward - Camera forward vector.
     * @param {Vec3} right - Camera right vector.
     * @param {Vec3} localUp - Local reference frame up direction.
     * @return {number} - Applicable pitch angle in radians.
     */
    protected _limitPitch(angle: number, forward: Vec3, right: Vec3, localUp: Vec3): number {
        let pitchSin = forward.dot(localUp);
        let radius = Math.hypot(pitchSin, right.cross(forward).dot(localUp));
        let limitSin = Math.sin(this.pitchLimit);

        if (radius <= limitSin) {
            return angle;
        }

        let dir = Math.sign(angle);
        let pos = Math.atan2(pitchSin, right.cross(forward).dot(localUp));

        let halfArc = Math.asin(limitSin / radius);
        let center: number;

        if (Math.abs(pitchSin) <= limitSin) {
            center = Math.abs(pos) <= math.PI_TWO ? 0 : Math.sign(pos) * Math.PI;
        } else {
            let vertical = Math.sign(pos) * math.PI_TWO;
            let away = Math.sign(pos - vertical);
            if (away !== 0 && dir !== away) {
                return 0;
            }
            center = vertical + dir * math.PI_TWO;
        }

        return dir * Math.min(Math.abs(angle), Math.abs(center + dir * halfArc - pos));
    }

    /**
     * Rollls the camera around its forward axis.
     * @protected
     */
    protected _handleRoll() {
        if (this._rollDir === 0) {
            return;
        }

        let cam = this.planet!.camera;
        let angle = Math.sign(this._rollDir) * this.rollSpeed * this.dt;
        cam.rotate(Quat.axisAngleToQuat(cam.getForward(), angle));

        this._orthonormalizeCamera();

        this.events.dispatch(this.events.rotate, this);
    }

    protected _orthonormalizeCamera() {
        let cam = this.planet!.camera;
        cam._b.normalize();
        cam._r.copy(cam._u.cross(cam._b).normalize());
        cam._u.copy(cam._b.cross(cam._r).normalize());
        cam._f.set(-cam._b.x, -cam._b.y, -cam._b.z);
    }

    /**
     * Moves the camera and keeps its orientation in the local reference frame.
     * @protected
     */
    protected _handleMove() {
        let cam = this.planet!.camera;
        let dt = this.dt;
        let localUp = this._getLocalUp(cam.eye);

        let dir = new Vec3();
        if (this._moveForward) {
            dir.addA(cam.getForward());
        }
        if (this._moveBackward) {
            dir.subA(cam.getForward());
        }
        if (this._moveRight) {
            dir.addA(cam.getRight());
        }
        if (this._moveLeft) {
            dir.subA(cam.getRight());
        }

        if (this._moveUp) {
            dir.addA(localUp);
        }

        if (this._moveDown) {
            dir.subA(localUp);
        }

        // Diagonal movement must not be faster than a straight one
        if (dir.length2() > 0) {
            dir.normalize();
        }

        // Negative speed reverses the movement direction, zero speed keeps the camera in place
        let targetVel = dir.scale(this._speed);

        // Frame rate independent velocity smoothing
        let time = targetVel.length2() > 0 ? this.accelerationTime : this.decelerationTime;
        let k = time > 0 ? 1.0 - Math.exp(-dt / time) : 1.0;
        this.vel.addA(targetVel.subA(this.vel).scale(k));

        if (this.vel.length() < MIN_VELOCITY) {
            this.vel.set(0, 0, 0);
            return;
        }

        cam.eye.addA(this.vel.scaleTo(dt));

        // Follow the local surface normal without adding roll.
        let rot = Quat.getRotationBetweenVectors(localUp, this._getLocalUp(cam.eye));
        cam.rotate(rot);
        this.vel.copy(rot.mulVec3(this.vel));

        this._orthonormalizeCamera();

        this.events.dispatch(this.events.move, this);
    }

    protected _suspendNavigation() {
        this._suspendedNavigation = [];

        let controls = this.renderer?.controls;
        if (!controls) return;

        for (let name in controls) {
            let c = controls[name];
            if (c instanceof Navigation && c.isActive()) {
                c.stop();
                c.deactivate();
                this._suspendedNavigation.push(c);
            }
        }
    }

    protected _restoreNavigation() {
        for (let i = 0; i < this._suspendedNavigation.length; i++) {
            this._suspendedNavigation[i].activate();
        }
        this._suspendedNavigation = [];
    }

    protected _updateFrameDeltaTime() {
        let now = window.performance.now();
        this._frameDeltaTime =
            this._lastFrameTime > 0 ? math.clamp(0.001 * (now - this._lastFrameTime), 0, MAX_FRAME_DELTA_TIME) : 0;
        this._lastFrameTime = now;
    }

    protected get dt(): number {
        return this._frameDeltaTime;
    }
}
