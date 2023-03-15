import { Ruler } from "../ruler/Ruler.js";
import { HeightRulerScene } from "./HeightRulerScene.js";

export class HeightRuler extends Ruler {
    constructor(options) {
        super({ ...options });
        this._rulerScene = new HeightRulerScene({
            name: `heightRulerScene:${this._id}`,
            ignoreTerrain: false
        });
    }
}