import {Control, IControlParams} from "../Control";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";

export interface IGeoObjectEditorParams extends IControlParams {
}

export class GeoObjectEditor extends Control {
    protected _geoObjectEditopScene: GeoObjectEditorScene;

    constructor(options: IGeoObjectEditorParams = {}) {
        super(options);

        this._geoObjectEditopScene = new GeoObjectEditorScene({
            name: `geoObjectEditorScene:${this.__id}`
        });
    }

    public override oninit() {
        this._geoObjectEditopScene.bindPlanet(this.planet!);
        this.activate();
    }

    public override onactivate() {
        this.renderer && this.renderer.addNode(this._geoObjectEditopScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._geoObjectEditopScene);
    }
}
