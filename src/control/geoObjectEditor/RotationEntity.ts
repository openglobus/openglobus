import {Entity, IEntityParams} from "../../entity/Entity";

export interface IRotationEntityParams extends IEntityParams {
}

export class RotationEntity extends Entity {

    constructor(params: IRotationEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {
        let planeXZ = new Entity({
            independentPicking: true,
            properties: {opName: "move_xz"}
        });

        this.appendChild(planeXZ);
    }
}