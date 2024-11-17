import {Control, IControlParams} from "../Control";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {GeoObjectPropertiesDialog} from "./GeoObjectEditorDialog";

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
        this._geoObjectEditopScene.bindPlanet(this.planet!);
        this._dialog.appendTo(this.planet!.renderer!.div!);

        this._dialog.events.on("visibility", (v: boolean) => {
            if (v) {
                this.activate();
            } else {
                this.deactivate();
            }
        });

        //this._geoObjectEditopScene.events.on("change", (isActive: boolean) => {})
        //this._geoObjectEditopScene.events.on("select", (isActive: boolean) => {})

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
