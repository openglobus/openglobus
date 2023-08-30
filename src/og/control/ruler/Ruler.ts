import { Control } from "../Control";
import { RulerScene } from "./RulerScene";

/**
 * Activate ruler
 */
export class Ruler extends Control {
    protected _rulerScene: any;
    constructor(options: { ignoreTerrain?: boolean, name?: string, autoActivate?: boolean } = {}) {
        super(options);

        this._rulerScene = new RulerScene({
            name: `rulerScene:${this._id}`,
            ignoreTerrain: options.ignoreTerrain
        });
    }

    set ignoreTerrain(v: boolean) {
        this._rulerScene.ignoreTerrain = v;
    }

    override oninit() {
        this._rulerScene.bindPlanet(this.planet);
    }

    override onactivate() {
        this.renderer.addNode(this._rulerScene);
    }

    override ondeactivate() {
        this.renderer.removeNode(this._rulerScene);
    }
}
