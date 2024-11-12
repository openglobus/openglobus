import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";

export interface IRotationEntityParams extends IEntityParams {
}

export class RotateEntity extends Entity {

    constructor(params: IRotationEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {
        let yaw = new Entity({
            independentPicking: true,
            properties: {opName: "rotate_yaw"}
        });

        this.appendChild(yaw);
    }

    public override setCartesian3v(cart: Vec3) {
        super.setCartesian3v(cart);
    }
}