import {Camera} from "../camera/Camera";
import {Control, IControlParams} from "./Control";
import {input} from "../input/input";
import {IMouseState} from "../renderer/RendererEvents";

interface ISimpleNavigationParams extends IControlParams {
    speed?: number;
}

/**
 * Simple keyboard camera navigation with W,S,A,D and shift keys to fly around the scene.
 */
export class SimpleNavigation extends Control {
    public speed: number;

    constructor(options: ISimpleNavigationParams = {}) {
        super({
            name: "SimpleNavigation",
            autoActivate: true, ...options
        });
        this.speed = options.speed || 1.0; // m/s
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
        if (this._active) {
            let cam = this.renderer!.activeCamera!;
            cam.slide(0, 0, -this.speed);
            //cam.update();
        }
    }

    protected onCameraMoveBackward() {
        let cam = this.renderer!.activeCamera!;
        cam.slide(0, 0, this.speed);
        //cam.update();
    }

    protected onCameraStrifeLeft() {
        let cam = this.renderer!.activeCamera!;
        cam.slide(-this.speed, 0, 0);
        //cam.update();
    }

    protected onCameraStrifeRight() {
        let cam = this.renderer!.activeCamera!;
        cam.slide(this.speed, 0, 0);
        //cam.update();
    }

    protected onCameraLookUp() {
        let cam = this.renderer!.activeCamera!;
        cam.pitch(0.5);
        //cam.update();
    }

    protected onCameraLookDown() {
        let cam = this.renderer!.activeCamera!;
        cam.pitch(-0.5);
        //cam.update();
    }

    protected onCameraTurnLeft() {
        let cam = this.renderer!.activeCamera!;
        cam.yaw(0.5);
        //cam.update();
    }

    protected onCameraTurnRight() {
        let cam = this.renderer!.activeCamera!;
        cam.yaw(-0.5);
        //cam.update();
    }

    protected onCameraRollLeft() {
        let cam = this.renderer!.activeCamera!;
        cam.roll(-0.5);
        //cam.update();
    }

    protected onCameraRollRight() {
        let cam = this.renderer!.activeCamera!;
        cam.roll(0.5);
        //cam.update();
    }

    protected onDraw() {
        if (this.renderer) {
            let frame = this.renderer.handler.deltaTime * 1000;
            this.renderer!.activeCamera.update();
        }
    }
}