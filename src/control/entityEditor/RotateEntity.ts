import { Entity, type IEntityParams } from "../../entity/Entity";
import { Vec3 } from "../../math/Vec3";
import { RADIANS } from "../../math";
import { Quat } from "../../math/Quat";
import { SEL_X_COLOR, SEL_Y_COLOR, SEL_Z_COLOR, X_COLOR, Y_COLOR, Z_COLOR } from "./colors";

const POLYLINE_THICKNESS = 3.8;
const SEG_SIZE = 360;
const VISIBLESPHERE_DOT_THRESHOLD = 0.95;

export interface IRotationEntityParams extends IEntityParams {}

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
                path3v: [Array.from({ length }, (_, i) => new Vec3())],
                thickness: POLYLINE_THICKNESS,
                color: [X_COLOR],
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
                path3v: [Array.from({ length }, (_, i) => new Vec3())],
                thickness: POLYLINE_THICKNESS,
                color: [Y_COLOR],
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
                path3v: [Array.from({ length }, (_, i) => new Vec3())],
                thickness: POLYLINE_THICKNESS,
                color: [Z_COLOR],
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

    public override setCartesian3v(cart: Vec3): void;
    public override setCartesian3v(cart: Vec3, rotation: Quat): void;
    public override setCartesian3v(cart: Vec3, rotation?: Quat) {
        super.setCartesian3v(cart);

        if (this._entityCollection && this._entityCollection.scene) {
            let rn = this._entityCollection.scene;
            let qRot = rotation || rn.getFrameRotation(cart).conjugate();

            this._updateGizmo(cart, qRot, qRot);
        }
    }

    public setYawCartesian3v(cart: Vec3, yaw: number) {
        super.setCartesian3v(cart);

        if (this._entityCollection && this._entityCollection.scene) {
            let rn = this._entityCollection.scene;
            let frameRotation = rn.getFrameRotation(cart);
            let qYaw = frameRotation.conjugate();
            let qRot = Quat.zRotation(0).mul(Quat.xRotation(0)).mul(Quat.yRotation(yaw)).mul(frameRotation).conjugate();

            this._updateGizmo(cart, qRot, qYaw);
        }
    }

    protected _updateGizmo(cart: Vec3, qRot: Quat, qYaw: Quat) {
        let rn = this._entityCollection!.scene!;
        let cam = rn.renderer!.activeCamera;

        let radiusDist = cam.isOrthographic ? cam.focusDistance : cam.eye.distance(cart);
        let r = radiusDist * 0.15;

        for (let i = 0, j = 0, step = 360 / SEG_SIZE; i < SEG_SIZE; i += step, j++) {
            let a = i * RADIANS,
                cos_a = Math.cos(a),
                sin_a = Math.sin(a);

            let pitch_p = qRot
                .mulVec3(new Vec3(0, sin_a, cos_a))
                .normalize()
                .scale(r)
                .add(cart);
            let yaw_p = qYaw
                .mulVec3(new Vec3(cos_a, 0, sin_a))
                .normalize()
                .scale(r)
                .add(cart);
            let roll_p = qRot
                .mulVec3(new Vec3(cos_a, sin_a, 0))
                .normalize()
                .scale(r)
                .add(cart);

            pitchCoords[j] = pitch_p;
            yawCoords[j] = yaw_p;
            rollCoords[j] = roll_p;
        }

        this.childEntities[0].polyline!.setPath3v([pitchCoords], undefined, true);
        this.childEntities[1].polyline!.setPath3v([yawCoords], undefined, true);
        this.childEntities[2].polyline!.setPath3v([rollCoords], undefined, true);

        // Gets whole circle visibility
        let dir_pitch = qRot.mulVec3(new Vec3(1, 0, 0)).normalize();
        this._entityCollection!.setVisibleSphere(
            cart,
            Math.abs(dir_pitch.dot(cam.getForward())) > VISIBLESPHERE_DOT_THRESHOLD ? 0.0 : r
        );
    }
}
