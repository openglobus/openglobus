import {Control, IControlParams} from "../Control";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";
import {Dialog} from "../../ui/Dialog";
import {GeoObjectPropertiesDialog} from "./GeoObjectEditorDialog";

export interface IGeoObjectEditorParams extends IControlParams {
}

export class GeoObjectEditor extends Control {
    protected _geoObjectEditopScene: GeoObjectEditorScene;
    protected _dialog: GeoObjectPropertiesDialog;

    constructor(options: IGeoObjectEditorParams = {}) {
        super(options);

        this._dialog = new GeoObjectPropertiesDialog();

        this._geoObjectEditopScene = new GeoObjectEditorScene({
            name: `geoObjectEditorScene:${this.__id}`
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
