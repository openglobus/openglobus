import {Dialog, IDialogParams} from "../../ui/Dialog";
import {GeoObjectEditorScene} from "./GeoObjectEditorScene";

interface IGeoObjectPropertiesDialog extends IDialogParams {
    model: GeoObjectEditorScene
}

export class GeoObjectPropertiesDialog extends Dialog<GeoObjectEditorScene> {
    constructor(params: IGeoObjectPropertiesDialog) {
        super({
            title: "GeoObject Properties",
            visible: false,
            resizable: false,
            useHide: true,
            top: 175,
            left: 65,
            width: 150,
            height: 400,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });
    }

    public override render(params: any): this {
        return super.render(params);
        return this;
    }
}