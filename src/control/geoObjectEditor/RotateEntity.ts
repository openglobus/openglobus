import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {Quat} from "../../math/Quat";
import {MAX32, RADIANS} from "../../math";

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

        var circle = [];

        for (let i = 0; i < 360; i += 1) {
            let a = i * RADIANS;
            circle.push(new Vec3(Math.cos(a), Math.sin(a), 0));
        }

        for (let i = 0; i < circle.length; i++) {
            circle[i].scale(6378137.0 + 10000);
        }

        let yaw = new Entity({
            independentPicking: true,
            polyline: {
                path3v: [circle],
                thickness: 2.5,
                color: "rgba(355,0,0,0.7)",
                isClosed: true
            },
            properties: {opName: "rotate_yaw"}
        });

        this.appendChild(yaw);
    }

    public override setCartesian3v(cart: Vec3) {

        super.setCartesian3v(cart);

        if (this._layer && this._layer._planet) {

            let pl = this._layer._planet;
            let qNorthFrame = pl.getNorthFrameRotation(cart).conjugate();
            let dist = pl.camera.eye.distance(cart) * 0.15;
            let coords = [];

            for (let i = 0; i < 360; i++) {
                let a = i * RADIANS;
                let p = new Vec3(Math.cos(a), 0, Math.sin(a));

                let pos = qNorthFrame.mulVec3(p).normalize().scale(dist);

                coords.push(pos.add(cart));
            }

            this.childrenNodes[0].polyline!.setPath3v([coords], undefined, true);
        }
    }
}