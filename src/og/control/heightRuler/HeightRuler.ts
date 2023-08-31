import {Ruler, IRulerParams} from "../ruler/Ruler";
import {HeightRulerScene} from "./HeightRulerScene";

interface IHeightRulerParams extends IRulerParams {

}

export class HeightRuler extends Ruler {
    constructor(options: IHeightRulerParams = {}) {
        super(options);
        this._rulerScene = new HeightRulerScene({
            name: `heightRulerScene:${this.__id}`,
            ignoreTerrain: false
        });
    }
}