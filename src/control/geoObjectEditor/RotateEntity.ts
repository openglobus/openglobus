import {Entity, IEntityParams} from "../../entity/Entity";

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
}