import {Entity, type IEntityParams} from "../../entity/Entity";
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
            scale: 0.025,
            forceGlobalPosition: true,
            geoObject: {
                color: XZ_COLOR,
                tag: "plane",
                object3d: planeObj
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