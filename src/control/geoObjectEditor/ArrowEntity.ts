import {Entity, IEntityParams} from "../../entity/Entity";
import {X_COLOR} from "./colors";
import {Object3d} from "../../Object3d";
import {Vec3} from "../../math/Vec3";

const SCALE = 0.1;
const SCALE_VEC = new Vec3(SCALE, SCALE, SCALE);
const TIP_LENGTH = 0.17;
const TIP_RADIUS = 0.04;
const SPIN_RADIUS = 0.0075;

const lineObj = Object3d.createCylinder(SPIN_RADIUS, SPIN_RADIUS, 1.0 - TIP_LENGTH).scale(SCALE_VEC);
const tipObj = Object3d.createCylinder(0, TIP_RADIUS, TIP_LENGTH, 16, 16,
    false, true, 0, -TIP_LENGTH).scale(SCALE_VEC);

export interface IArrowEntityParams extends IEntityParams {
    yaw?: number;
    pitch?: number;
    roll?: number;
    size?: number;
    color?: string,
    properties?: any;
}

export class ArrowEntity extends Entity {

    protected _size: number;

    constructor(params: IArrowEntityParams = {}) {

        const scale = 1.0;

        super({
            independentPicking: true,
            geoObject: {
                color: params.color || X_COLOR,
                scale,
                instanced: true,
                tag: "line",
                object3d: lineObj,
                yaw: params.yaw || 0,
                pitch: params.pitch || 0,
                roll: params.roll || 0
            },
            properties: params.properties
        });

        this._size = params.size != undefined ? params.size : 1.0;

        this.appendChild(new Entity({
            geoObject: {
                color: params.color || X_COLOR,
                scale,
                instanced: true,
                tag: "tip",
                object3d: tipObj,
                yaw: params.yaw || 0,
                pitch: params.pitch || 0,
                roll: params.roll || 0
            },
            properties: params.properties
        }));
    }

    public setSize(size: number) {
        this._size = size;
        const scale = new Vec3(1, (this._size - TIP_LENGTH) / (1.0 - TIP_LENGTH), 1);
        const trans = new Vec3(0, this._size * SCALE, 0);

        let line = this;
        let tip = line.childrenNodes[0];
        line.geoObject!.setScale3v(scale);
        tip.geoObject!.setTranslate3v(trans);
    }

    public setColorHTML(color: string) {
        let line = this;
        let tip = line.childrenNodes[0];
        line.geoObject!.setColorHTML(color);
        tip.geoObject!.setColorHTML(color);
    }
}