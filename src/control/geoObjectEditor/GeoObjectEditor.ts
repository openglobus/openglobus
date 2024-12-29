import {Control, IControlParams} from "../Control";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {GeoObjectPropertiesDialog} from "./GeoObjectEditorDialog";
import {CameraLock} from "../CameraLock";

export interface IGeoObjectEditorParams extends IControlParams {
}

export class GeoObjectEditor extends Control {
    protected _geoObjectEditopScene: GeoObjectEditorScene;
    protected _dialog: GeoObjectPropertiesDialog;

    constructor(options: IGeoObjectEditorParams = {}) {
        super(options);

        this._geoObjectEditopScene = new GeoObjectEditorScene({
            name: `geoObjectEditorScene:${this.__id}`
        });

        this._dialog = new GeoObjectPropertiesDialog({
            model: this._geoObjectEditopScene
        });
    }

    public override oninit() {
        //this.planet.addControl(new CameraLock());
        this._geoObjectEditopScene.bindPlanet(this.planet!);
        this._dialog.appendTo(this.renderer!.div!);
        this.activate();
    }

    public override onactivate() {
        this.renderer && this.renderer.addNode(this._geoObjectEditopScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._geoObjectEditopScene);
        this._dialog.hide();
    }
}
