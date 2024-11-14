import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {Quat} from "../../math/Quat";
import {RADIANS} from "../../math";

export interface IRotationEntityParams extends IEntityParams {
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
                color: "red",
                isClosed: true
            },
            properties: {opName: "rotate_yaw"}
        });

        this.appendChild(yaw);
    }

    public override setCartesian3v(cart: Vec3) {
        super.setCartesian3v(cart);
    }
}