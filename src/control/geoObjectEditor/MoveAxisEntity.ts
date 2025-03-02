import {Entity, type IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {SEL_X_COLOR, SEL_Y_COLOR, SEL_Z_COLOR, X_COLOR, Y_COLOR, Z_COLOR} from "./colors";
import {ArrowEntity} from "./ArrowEntity";
import {RADIANS} from "../../math";

export interface IAxisEntityParams extends IEntityParams {
    size?: number;
}

export class MoveAxisEntity extends Entity {
    protected _size: number;
    public override childEntities: ArrowEntity[];

    constructor(params: IAxisEntityParams = {}) {
        super(params);
        this._size = params.size != undefined ? params.size : 1.0;
        this.childEntities = [];
        this._init();
    }

    private _init() {

        let arrowX = new ArrowEntity({
            color: X_COLOR,
            yaw: 0,
            pitch: 0,
            roll: 90 * RADIANS,
            properties: {
                opName: "move_x",
                noEdit: true,
                style: {
                    color: X_COLOR,
                    selectColor: SEL_X_COLOR
                }
            }
        });

        let arrowY = new ArrowEntity({
            color: Y_COLOR,
            yaw: 0,
            pitch: 0,
            roll: 0,
            properties: {
                opName: "move_y",
                noEdit: true,
                style: {
                    color: Y_COLOR,
                    selectColor: SEL_Y_COLOR
                }
            }
        });

        let arrowZ = new ArrowEntity({
            color: Z_COLOR,
            yaw: 0,
            pitch: 90 * RADIANS,
            roll: 0,
            properties: {
                opName: "move_z",
                noEdit: true,
                style: {
                    color: Z_COLOR,
                    selectColor: SEL_Z_COLOR
                }
            }
        });

        this.appendChild(arrowX);
        this.appendChild(arrowY);
        this.appendChild(arrowZ);

        this.setSize(this._size);
    }

    public setSize(size: number) {
        this.childEntities[0].setSize(size);
        this.childEntities[1].setSize(size);
        this.childEntities[2].setSize(size);
    }

    public override setPitch(a: number) {
        let line = this.childEntities[0];
        let tip = line.childEntities[0];
        line.setPitch(a);
        tip.setPitch(a);

        line = this.childEntities[1];
        tip = line.childEntities[0];
        line.setPitch(a);
        tip.setPitch(a);

        line = this.childEntities[2];
        tip = line.childEntities[0];
        line.setPitch(a + 90);
        tip.setPitch(a + 90);
    }

    public override setYaw(a: number) {
        let line = this.childEntities[0];
        let tip = line.childEntities[0];
        line.setYaw(a);
        tip.setYaw(a);

        line = this.childEntities[1];
        tip = line.childEntities[0];
        line.setYaw(a);
        tip.setYaw(a);

        line = this.childEntities[2];
        tip = line.childEntities[0];
        line.setYaw(a);
        tip.setYaw(a);
    }

    public override setRoll(a: number) {
        let line = this.childEntities[0];
        let tip = line.childEntities[0];
        line.setRoll(a + 90);
        tip.setRoll(a + 90);

        line = this.childEntities[1];
        tip = line.childEntities[0];
        line.setRoll(a);
        tip.setRoll(a);
    }

    public getY(): Vec3 {
        return this.childEntities[1].getAbsoluteRotation().mulVec3(Vec3.UP).normalize();
    }
}