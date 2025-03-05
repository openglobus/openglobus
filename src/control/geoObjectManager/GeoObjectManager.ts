import {Control, type IControlParams} from "../Control";
import {GeoObjectManagerDialog} from "./GeoObjectManagerDialog";
import {GeoObjectCollection} from "./GeoObjectCollection";

export interface IGeoObjectManagerParams extends IControlParams {
    collection?: []
}

export class GeoObjectManager extends Control {
    protected _dialog: GeoObjectManagerDialog;

    constructor(options: IGeoObjectManagerParams = {}) {
        super(options);

        this._dialog = new GeoObjectManagerDialog({
            model: new GeoObjectCollection({collection: options.collection || []})
        });
    }

    public override oninit() {
        if (this.renderer) {
            this._dialog.appendTo(this.renderer.div || document.body);
            this.activate();
        }
    }

    public override onactivate() {

    }

    public override ondeactivate() {
        this._dialog.hide();
    }
}
