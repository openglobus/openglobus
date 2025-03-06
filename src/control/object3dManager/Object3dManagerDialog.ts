import {Dialog, type IDialogParams} from "../../ui/Dialog";
import {IObject3dItem, Object3dCollection} from "./Object3dCollection";
import {Button} from "../../ui/Button";
import {Object3dCollectionView} from "./Object3dCollectionView";

/*<div>Icons made from <a href="https://www.onlinewebfonts.com/icon">svg icons</a>is licensed by CC BY 4.0</div>*/
const ICON_LOAD_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 16 16" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" id="Folder-Open--Streamline-Tabler" height="16" width="16"><desc>Folder Open Streamline Icon: https://streamlinehq.com</desc><path d="m3.125 11.875 1.723125 -4.594375A0.625 0.625 0 0 1 5.4331249999999995 6.875H13.125a0.625 0.625 0 0 1 0.61625 0.7274999999999999l-0.6225 3.256875A1.25 1.25 0 0 1 11.89125 11.875H3.125a1.25 1.25 0 0 1 -1.25 -1.25V3.75a1.25 1.25 0 0 1 1.25 -1.25h2.5l1.875 1.875h4.375a1.25 1.25 0 0 1 1.25 1.25v1.25" stroke-width="1"></path></svg>`;

interface IObject3dManagerDialogParams extends IDialogParams {
    model: Object3dCollection
}

export class Object3dManagerDialog extends Dialog<null> {

    protected _object3dCollectionView: Object3dCollectionView;

    constructor(params: IObject3dManagerDialogParams) {
        super({
            classList: ["og-object3d-manager"],
            title: "Object3D Collection",
            visible: false,
            resizable: true,
            useHide: true,
            top: 25,
            right: 85,
            width: 252,
            height: 480,
            minHeight: 100,
            minWidth: 100,
        });

        this._object3dCollectionView = new Object3dCollectionView({model: params.model});
    }

    public override render(params: any): this {
        super.render(params);

        let $toolbar = document.createElement("div");
        $toolbar.classList.add("og-editor_toolbar");
        this.container?.appendChild($toolbar);

        let loadBtn = new Button({
            classList: ["og-editor_toolbar-button"],
            icon: ICON_LOAD_BUTTON_SVG,
            title: "Load 3D object"
        });
        loadBtn.appendTo($toolbar);

        this.events.on("visibility", this._onVisibility);

        this._object3dCollectionView.appendTo(this.container!);

        this._object3dCollectionView.events.on("select", this._onSelect);

        return this;
    }

    protected _onSelect = (item: IObject3dItem): void => {
        console.log(item);
    }

    protected _onVisibility = (vis: boolean) => {
    }

    public override remove(): void {
        super.remove();
        //this._clearEvents();
    }

    // protected _initEvents() {
    // }
    //
    // protected _clearEvents() {
    // }
}