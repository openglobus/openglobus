import {Entity, IEntityParams} from "../../entity/Entity";
import {EntityCollection} from "../../entity/EntityCollection";
import {Vector} from "../../layer/Vector";
import {Vec3} from "../../math/Vec3";
import {Object3d} from "../../Object3d";

const SCALE = 0.1;
const SCALE_VEC = new Vec3(SCALE, SCALE, SCALE);
const TIP_LENGTH = 0.17;
const TIP_RADIUS = 0.04;
const SPIN_RADIUS = 0.0055;

const lineObj = Object3d.createCylinder(SPIN_RADIUS, SPIN_RADIUS, 1.0 - TIP_LENGTH).scale(SCALE_VEC);
const tipObj = Object3d.createCylinder(0, TIP_RADIUS, TIP_LENGTH, 16, 16, false, true, 0, -TIP_LENGTH).scale(SCALE_VEC);

export interface IAxisEntityParams extends IEntityParams {
    size?: number;
}

export class MoveAxisEntity extends Entity {
    protected _size: number;

    constructor(params: IAxisEntityParams = {}) {
        super(params);
        this._size = params.size != undefined ? params.size : 1.5;
        this._initArrows();
    }

    private _initArrows() {
        const scale = 1.5;

        let arrowX = new Entity({
            independentPicking: true,
            geoObject: {
                color: "green",
                scale,
                instanced: true,
                tag: "line",
                object3d: lineObj,
                yaw: 0,
                pitch: 0,
                roll: 90
            }
        });

        arrowX.appendChild(new Entity({
            geoObject: {
                color: "green",
                scale,
                instanced: true,
                tag: "tip",
                object3d: tipObj,
                yaw: 0,
                pitch: 0,
                roll: 90
            }
        }));


        let arrowY = new Entity({
            independentPicking: true,
            geoObject: {
                color: "blue",
                scale,
                instanced: true,
                tag: "line",
                object3d: lineObj,
                yaw: 0,
                pitch: 0
            }
        });

        arrowY.appendChild(new Entity({
            geoObject: {
                color: "blue",
                scale,
                instanced: true,
                tag: "tip",
                object3d: tipObj,
                yaw: 0,
                pitch: 0
            }
        }));

        let arrowZ = new Entity({
            independentPicking: true,
            geoObject: {
                color: "red",
                scale,
                instanced: true,
                tag: "line",
                object3d: lineObj,
                yaw: 0,
                pitch: 90
            }
        });

        arrowZ.appendChild(new Entity({
            geoObject: {
                color: "red",
                scale,
                instanced: true,
                tag: "tip",
                object3d: tipObj,
                yaw: 0,
                pitch: 90
            }
        }));

        this.appendChild(arrowX);
        this.appendChild(arrowY);
        this.appendChild(arrowZ);

        this.setSize(this._size);
    }

    public setSize(size: number) {
        this._size = size;

        const scale = new Vec3(1, (this._size - TIP_LENGTH) / (1.0 - TIP_LENGTH), 1);
        const trans = new Vec3(0, this._size * SCALE, 0);

        // X
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setScale3v(scale);
        tip.geoObject!.setTranslate3v(trans);

        // Y
        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setScale3v(scale);
        tip.geoObject!.setTranslate3v(trans);

        // Z
        line = this.childrenNodes[2];
        tip = line.childrenNodes[0];
        line.geoObject!.setScale3v(scale);
        tip.geoObject!.setTranslate3v(trans);
    }

    public setPitch(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a);
        tip.geoObject!.setPitch(a);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a);
        tip.geoObject!.setPitch(a);

        line = this.childrenNodes[2];
        tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a + 90);
        tip.geoObject!.setPitch(a + 90);
    }

    public setYaw(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);

        line = this.childrenNodes[2];
        tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);
    }

    public setRoll(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setRoll(a + 90);
        tip.geoObject!.setRoll(a + 90);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setRoll(a);
        tip.geoObject!.setRoll(a);
    }
}