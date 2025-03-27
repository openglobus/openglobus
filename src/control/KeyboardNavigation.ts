import * as math from "../math";
import {Control, type IControlParams} from "./Control";
import {input} from "../input/input";
import {Vec3} from "../math/Vec3";
import {Camera} from "../camera/Camera";
import {PlanetCamera} from "../camera/PlanetCamera";
import {RADIANS} from "../math";

interface IKeyboardNavigationParams extends IControlParams {
    speed?: number;
    camera?: Camera | PlanetCamera;
}

/**
 * Planet camera keyboard navigation. Use W,S,A,D and left shift key for fly around a planet.
 */
export class KeyboardNavigation extends Control {

    public speed: number;
    public force: Vec3;
    public vel: Vec3;
    public mass: number;

    protected _camera: Camera | PlanetCamera | null;

    constructor(options: IKeyboardNavigationParams = {}) {
        options = options || {};
        super({name: "KeyboardNavigation", ...options});
        this._camera = options.camera || null;

        this.speed = options.speed || 10.0;
        this.force = new Vec3();
        this.vel = new Vec3();
        this.mass = 1;
    }

    public bindCamera(camera: Camera) {
        this._camera = camera;
    }

    public override onactivate() {
        let r = this.renderer!;
        // r.events.on("keypress", input.KEY_PGUP, this.onCameraMoveForward, this);
        // r.events.on("keypress", input.KEY_PGDN, this.onCameraMoveBackward, this);
        // r.events.on("keypress", input.KEY_PLUS, this.onCameraMoveForward, this);
        // r.events.on("keypress", input.KEY_EQUALS, this.onCameraMoveForward, this);
        r.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        r.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        // r.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        // r.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        r.events.on("keypress", input.KEY_UP, this.onCameraPitchUp, this);
        r.events.on("keypress", input.KEY_DOWN, this.onCameraPitchDown, this);
        r.events.on("keypress", input.KEY_LEFT, this.onCameraYawLeft, this);
        r.events.on("keypress", input.KEY_RIGHT, this.onCameraYawRight, this);

        r.events.on("draw", this.onDraw, this, -1000);
    }

    public override ondeactivate() {
        let r = this.renderer!;
    }

    public override oninit() {
        this.activate();
    }

    protected get dt(): number {
        return 0.001 * this.renderer!.handler.deltaTime;
    }

    protected onCameraPitchUp = () => {
        if (this._camera) {
            this._camera.setPitch(this._camera.getPitch() + 0.1 * RADIANS);
        }
    }

    protected onCameraPitchDown = () => {
        if (this._camera) {
            this._camera.setPitch(this._camera.getPitch() - 0.1 * RADIANS);
        }
    }

    protected onCameraYawLeft = () => {
        if (this._camera) {
            this._camera.setYaw(this._camera.getYaw() - 0.1 * RADIANS);
        }
    }

    protected onCameraYawRight = () => {
        if (this._camera) {
            this._camera.setYaw(this._camera.getYaw() + 0.1 * RADIANS);
        }
    }

    protected onCameraMoveForward = () => {
        if (this._camera) {
            this.force.addA(this._camera.getForward()).normalize();
        }
    }

    protected onCameraMoveBackward = () => {
        if (this._camera) {
            this.force.addA(this._camera.getBackward()).normalize();
        }
    }

    protected onDraw() {
        if (this.renderer && this._camera) {

            let acc = this.force.scale(1.0 / this.mass);
            this.vel.addA(acc);
            this.vel.scale(0.96);
            this.force.set(0, 0, 0);

            let cam = this._camera;
            cam.eye = cam.eye.add(this.vel.scaleTo(this.dt));
            cam.update();
        }
    }
}