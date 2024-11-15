import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {Quat} from "../../math/Quat";
import {MAX32, RADIANS} from "../../math";

const PITCH_COLOR = "rgba(355, 40, 40, 0.85)";
const YAW_COLOR = "rgba(70, 70, 355, 0.85)";
const ROLL_COLOR = "rgba(7, 255, 7, 0.85)";

const SEG_SIZE = 360;

export interface IRotationEntityParams extends IEntityParams {
}

function getScale(camPos: Vec3, center: Vec3): number {
    return camPos.distance(center);
}

export class RotateEntity extends Entity {

    constructor(params: IRotationEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {

        // var circle = [];
        //
        // for (let i = 0; i < 360; i += 1) {
        //     circle.push(new Vec3());
        // }

        const length = SEG_SIZE;

        let pitch = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: PITCH_COLOR,
                isClosed: true
            },
            properties: {opName: "rotate_pitch"}
        });

        let yaw = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: YAW_COLOR,
                isClosed: true
            },
            properties: {opName: "rotate_yaw"}
        });

        let roll = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: ROLL_COLOR,
                isClosed: true
            },
            properties: {opName: "rotate_roll"}
        });

        this.appendChild(pitch);
        this.appendChild(yaw);
        this.appendChild(roll);
    }

    public override setCartesian3v(cart: Vec3) {

        super.setCartesian3v(cart);

        if (this._layer && this._layer._planet) {

            let pl = this._layer._planet;
            let qNorthFrame = pl.getNorthFrameRotation(cart).conjugate();
            let dist = pl.camera.eye.distance(cart) * 0.15;
            let pitchCoords = [];
            let yawCoords = [];
            let rollCoords = [];

            for (let i = 0, step = 360 / SEG_SIZE; i < SEG_SIZE; i += step) {
                let a = i * RADIANS;
                let pitch_p = qNorthFrame.mulVec3(new Vec3(0, Math.sin(a), Math.cos(a))).normalize().scale(dist).add(cart);
                let yaw_p = qNorthFrame.mulVec3(new Vec3(Math.cos(a), 0, Math.sin(a))).normalize().scale(dist).add(cart);
                let roll_p = qNorthFrame.mulVec3(new Vec3(Math.cos(a), Math.sin(a), 0)).normalize().scale(dist).add(cart);

                pitchCoords.push(pitch_p);
                yawCoords.push(yaw_p);
                rollCoords.push(roll_p);
            }

            this.childrenNodes[0].polyline!.setPath3v([pitchCoords], undefined, true);
            this.childrenNodes[1].polyline!.setPath3v([yawCoords], undefined, true);
            this.childrenNodes[2].polyline!.setPath3v([rollCoords], undefined, true);
        }
    }
}