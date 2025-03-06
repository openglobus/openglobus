import {Control, type IControlParams} from "../Control";
import {Object3dManagerDialog} from "./Object3dManagerDialog";
import {Object3dCollection} from "./Object3dCollection";
import {IObject3dItem} from "./Object3dCollection";

export interface IObject3dManagerParams extends IControlParams {
    collection?: IObject3dItem[]
}

export class Object3dManager extends Control {
    protected _dialog: Object3dManagerDialog;
    protected _collection: Object3dCollection;

    constructor(options: IObject3dManagerParams = {}) {
        super(options);

        this._collection = new Object3dCollection({
            collection: options.collection
        });

        this._dialog = new Object3dManagerDialog({
            model: this._collection
        });
    }

    public override oninit() {
        if (this.renderer) {
            this._dialog.appendTo(this.renderer.div || document.body);
            this.activate();
        }
    }

    public override onactivate() {
        this._dialog.show();
    }

    public override ondeactivate() {
        this._dialog.hide();
    }
}
