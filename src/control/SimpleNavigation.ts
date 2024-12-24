import {Camera} from "../camera/Camera";
import {Control, IControlParams} from "./Control";
import {input} from "../input/input";
import {IMouseState} from "../renderer/RendererEvents";
import {Vec3} from "../math/Vec3";

interface ISimpleNavigationParams extends IControlParams {
    speed?: number;
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleNavigation extends Control {
    public speed: number;
    public force: Vec3;
    public vel: Vec3;
    public mass: number;

    constructor(options: ISimpleNavigationParams = {}) {
        super({
            name: "SimpleNavigation",
            autoActivate: true, ...options
        });
        this.speed = options.speed || 1.0; // m/s
        this.force = new Vec3();
        this.vel = new Vec3();
        this.mass = 1;
    }

    override oninit() {

    }

    public override onactivate() {
        super.onactivate();
        let r = this.renderer!;

        r.events.on("mousewheel", this.onMouseWheel, this);
        r.events.on("keypress", input.KEY_W, this.onCameraMoveForward, this);
        r.events.on("keypress", input.KEY_S, this.onCameraMoveBackward, this);
        r.events.on("keypress", input.KEY_A, this.onCameraStrifeLeft, this);
        r.events.on("keypress", input.KEY_D, this.onCameraStrifeRight, this);
        r.events.on("keypress", input.KEY_UP, this.onCameraLookUp, this);
        r.events.on("keypress", input.KEY_DOWN, this.onCameraLookDown, this);
        r.events.on("keypress", input.KEY_LEFT, this.onCameraTurnLeft, this);
        r.events.on("keypress", input.KEY_RIGHT, this.onCameraTurnRight, this);
        r.events.on("keypress", input.KEY_Q, this.onCameraRollLeft, this);
        r.events.on("keypress", input.KEY_E, this.onCameraRollRight, this);

        r.events.on("draw", this.onDraw, this, -1000);
    }

    public override ondeactivate() {
        super.ondeactivate();
        let r = this.renderer!;
        r.events.off("mousewheel", this.onMouseWheel);
        r.events.off("keypress", input.KEY_W, this.onCameraMoveForward);
        r.events.off("keypress", input.KEY_S, this.onCameraMoveBackward);
        r.events.off("keypress", input.KEY_A, this.onCameraStrifeLeft);
        r.events.off("keypress", input.KEY_D, this.onCameraStrifeRight);
        r.events.off("keypress", input.KEY_UP, this.onCameraLookUp);
        r.events.off("keypress", input.KEY_DOWN, this.onCameraLookDown);
        r.events.off("keypress", input.KEY_LEFT, this.onCameraTurnLeft);
        r.events.off("keypress", input.KEY_RIGHT, this.onCameraTurnRight);
        r.events.off("keypress", input.KEY_Q, this.onCameraRollLeft);
        r.events.off("keypress", input.KEY_E, this.onCameraRollRight);

        r.events.off("draw", this.onDraw);
    }

    protected onMouseWheel(e: IMouseState) {
        if (this.renderer) {
            let pos = this.renderer.getCartesianFromPixel(e);
            if (pos) {
                console.log(e.wheelDelta);
            }
        }
    }

    protected onCameraMoveForward() {
        this.force.addA(this.renderer!.activeCamera.getForward()).normalize();
    }

    protected onCameraMoveBackward() {
        this.force.addA(this.renderer!.activeCamera.getBackward()).normalize();
    }

    protected onCameraStrifeLeft() {
        this.force.addA(this.renderer!.activeCamera.getLeft()).normalize();
    }

    protected onCameraStrifeRight() {
        this.force.addA(this.renderer!.activeCamera.getRight()).normalize();
    }

    protected onCameraLookUp() {
        let cam = this.renderer!.activeCamera!;
        cam.pitch(0.5);
        cam.update();
    }

    protected onCameraLookDown() {
        let cam = this.renderer!.activeCamera!;
        cam.pitch(-0.5);
        cam.update();
    }

    protected onCameraTurnLeft() {
        let cam = this.renderer!.activeCamera!;
        cam.yaw(0.5);
        cam.update();
    }

    protected onCameraTurnRight() {
        let cam = this.renderer!.activeCamera!;
        cam.yaw(-0.5);
        cam.update();
    }

    protected onCameraRollLeft() {
        let cam = this.renderer!.activeCamera!;
        cam.roll(-0.5);
        cam.update();
    }

    protected onCameraRollRight() {
        let cam = this.renderer!.activeCamera!;
        cam.roll(0.5);
        cam.update();
    }

    public get dt(): number {
        let dt = this.renderer!.handler.deltaTime;
        if (dt > 3) {
            dt = 3;
        } else if (dt < 1) {
            dt = 1;
        }
        return 0.001 * dt;
    }

    protected onDraw() {
        if (this.renderer) {
            let cam = this.renderer.activeCamera;

            let acc = this.force.scale(1.0 / this.mass);

            this.vel.addA(acc);

            this.vel.scale(0.99);

            cam.eye = cam.eye.add(this.vel.scaleTo(this.dt));

            cam.update();

            this.force.set(0, 0, 0);
        }
    }
}