import {Entity, IEntityParams} from "../../entity/Entity";
import {Object3d} from "../../Object3d";
import {SEL_XZ_COLOR, XZ_COLOR} from "./colors";

const planeObj = Object3d.createPlane(1, 1, -0.5, 0, 0.5);

export interface IMovePlaneEntityParams extends IEntityParams {
}

export class MovePlaneEntity extends Entity {

    constructor(params: IMovePlaneEntityParams = {}) {
        super(params);
        this._init();
    }

    private _init() {
        let planeXZ = new Entity({
            independentPicking: true,
            geoObject: {
                color: XZ_COLOR,
                scale: 0.025,
                instanced: true,
                tag: "plane",
                object3d: planeObj,
                yaw: 0,
                pitch: 0,
                roll: 0
            },
            properties: {
                opName: "move_xz",
                noEdit: true,
                style: {
                    color: XZ_COLOR,
                    selectColor: SEL_XZ_COLOR
                }
            }
        });

        this.appendChild(planeXZ);
    }
}