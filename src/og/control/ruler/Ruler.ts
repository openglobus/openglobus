import {Control, IControlParams} from "../Control";
import {RulerScene} from "./RulerScene";

export interface IRulerParams extends IControlParams {
    ignoreTerrain?: boolean
}

export class Ruler extends Control {
    protected _rulerScene: RulerScene;

    constructor(options: IRulerParams = {}) {
        super(options);

        this._rulerScene = new RulerScene({
            name: `rulerScene:${this.__id}`,
            ignoreTerrain: options.ignoreTerrain
        });
    }

    public set ignoreTerrain(v: boolean) {
        this._rulerScene.ignoreTerrain = v;
    }

    public override oninit() {
        this._rulerScene.bindPlanet(this.planet);
    }

    public override onactivate() {
        this.renderer && this.renderer.addNode(this._rulerScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._rulerScene);
    }
}
