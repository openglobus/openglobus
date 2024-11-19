import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {RADIANS} from "../../math";
import {Quat} from "../../math/Quat";
import {SEL_X_COLOR, SEL_Y_COLOR, SEL_Z_COLOR, X_COLOR, Y_COLOR, Z_COLOR} from "./colors";

const SEG_SIZE = 360;
const VISIBLESPHERE_DOT_THRESHOLD = 0.95

export interface IRotationEntityParams extends IEntityParams {
}

const pitchCoords = new Array(SEG_SIZE);
const yawCoords = new Array(SEG_SIZE);
const rollCoords = new Array(SEG_SIZE);

export class RotateEntity extends Entity {

    constructor(params: IRotationEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {

        const length = SEG_SIZE;

        let pitch = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: X_COLOR,
                isClosed: true
            },
            properties: {
                opName: "rotate_pitch",
                noEdit: true,
                style: {
                    color: X_COLOR,
                    selectColor: SEL_X_COLOR
                }
            }
        });

        let yaw = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: Y_COLOR,
                isClosed: true
            },
            properties: {
                opName: "rotate_yaw",
                noEdit: true,
                style: {
                    color: Y_COLOR,
                    selectColor: SEL_Y_COLOR
                }
            }
        });

        let roll = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [Array.from({length}, (_, i) => new Vec3())],
                thickness: 2.5,
                color: Z_COLOR,
                isClosed: true
            },
            properties: {
                opName: "rotate_roll",
                noEdit: true,
                style: {
                    color: Z_COLOR,
                    selectColor: SEL_Z_COLOR
                }
            }
        });

        this.appendChild(pitch);
        this.appendChild(yaw);
        this.appendChild(roll);
    }

    public override setCartesian3v(cart: Vec3, yaw: number = 0) {

        super.setCartesian3v(cart);

        if (this._layer && this._layer._planet) {

            let pl = this._layer._planet;
            let qNorthFrame = pl.getNorthFrameRotation(cart).conjugate();
            let r = pl.camera.eye.distance(cart) * 0.15;

            let qp = Quat.xRotation(0);
            let qy = Quat.yRotation(yaw * RADIANS);
            let qr = Quat.zRotation(0);

            let qRot = qr.mul(qp).mul(qy).mul(pl.getNorthFrameRotation(cart)).conjugate();

            for (let i = 0, j = 0, step = 360 / SEG_SIZE; i < SEG_SIZE; i += step, j++) {
                let a = i * RADIANS,
                    cos_a = Math.cos(a),
                    sin_a = Math.sin(a);

                let pitch_p = qRot.mulVec3(new Vec3(0, sin_a, cos_a)).normalize().scale(r).add(cart);
                let yaw_p = qNorthFrame.mulVec3(new Vec3(cos_a, 0, sin_a)).normalize().scale(r).add(cart);
                let roll_p = qRot.mulVec3(new Vec3(cos_a, sin_a, 0)).normalize().scale(r).add(cart);

                pitchCoords[j] = pitch_p;
                yawCoords[j] = yaw_p;
                rollCoords[j] = roll_p;
            }

            this.childrenNodes[0].polyline!.setPath3v([pitchCoords], undefined, true);
            this.childrenNodes[1].polyline!.setPath3v([yawCoords], undefined, true);
            this.childrenNodes[2].polyline!.setPath3v([rollCoords], undefined, true);

            let dir_pitch = qNorthFrame.mulVec3(new Vec3(1, 0, 0)).normalize();
            let dir_yaw = qNorthFrame.mulVec3(new Vec3(0, 1, 0)).normalize();
            let dir_roll = qNorthFrame.mulVec3(new Vec3(0, 0, 1)).normalize();

            this.childrenNodes[0].polyline!.setVisibleSphere(cart, Math.abs(dir_pitch.dot(pl.camera.getForward())) > VISIBLESPHERE_DOT_THRESHOLD ? 0.0 : r);
            this.childrenNodes[1].polyline!.setVisibleSphere(cart, Math.abs(dir_yaw.dot(pl.camera.getForward())) > VISIBLESPHERE_DOT_THRESHOLD ? 0.0 : r);
            this.childrenNodes[2].polyline!.setVisibleSphere(cart, Math.abs(dir_roll.dot(pl.camera.getForward())) > VISIBLESPHERE_DOT_THRESHOLD ? 0.0 : r);
        }
    }
}