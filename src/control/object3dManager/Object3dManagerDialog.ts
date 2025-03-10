import {Dialog, type IDialogParams, type DialogEventsList} from "../../ui/Dialog";
import {IObject3dItem, Object3dCollection} from "./Object3dCollection";
import {Button} from "../../ui/Button";
import {Object3dCollectionView} from "./Object3dCollectionView";
import {type EventsHandler, createEvents} from "../../Events";
import {type ViewEventsList} from "../../ui/View";
import {View} from "../../ui/View";
import {Object3d} from "../../Object3d";

type Object3dManagerDialogEvents = ["select"];

const EVENT_NAMES: Object3dManagerDialogEvents = [
    "select",
];

const ICON_LOAD_BUTTON_SVG = `<svg class="svg-icon" style="vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M426.666667 170.666667H170.666667c-47.146667 0-84.906667 38.186667-84.906667 85.333333L85.333333 768c0 47.146667 38.186667 85.333333 85.333334 85.333333h682.666666c47.146667 0 85.333333-38.186667 85.333334-85.333333V341.333333c0-47.146667-38.186667-85.333333-85.333334-85.333333H512l-85.333333-85.333333z"  /></svg>`;

interface IObject3dManagerDialogParams extends IDialogParams {
    model: Object3dCollection
}

type Object3dManagerDialogEventsExt =
    EventsHandler<Object3dManagerDialogEvents>
    & EventsHandler<DialogEventsList>
    & EventsHandler<ViewEventsList>;

export class Object3dManagerDialog extends Dialog<null> {

    public override events: Object3dManagerDialogEventsExt;

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

        //@ts-ignore
        this.events = createEvents<Object3dManagerDialogEventsExt>(EVENT_NAMES);

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

        loadBtn.events.on("click", this._onLoadClick);

        this._object3dCollectionView.appendTo(this.container!);

        this._object3dCollectionView.events.on("select", (item: IObject3dItem): void => {
            this.events.dispatch(this.events.select, item);
        });

        return this;
    }

    protected _onLoadClick = () => {

        let fileInp = new View({
            initRender: true,
            template: `<input type="file" accept=".obj,.mtl" multiple />`
        });

        if (fileInp.el) {
            fileInp.el.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) {
                    const files = Array.from(target.files);
                    const objFile = files.find(file => file.name.toLowerCase().endsWith(".obj"));
                    const mtlFile = files.find(file => file.name.toLowerCase().endsWith(".mtl"));
                    if (objFile) {
                        loadObj(objFile, mtlFile).then(this._addObject);
                    }
                }
            });
            fileInp.el.click();
        }
    }

    protected _addObject = (item: { name: string; objects: Object3d[] }) => {
        this._object3dCollectionView.model.addItem(item);
    }
}

async function loadObj(objFile: File, mtlFile?: File): Promise<{ name: string; objects: Object3d[] }> {
    return await Object3d.readFileObj(objFile, mtlFile).then(objects => ({
        name: objFile.name,
        objects: mtlFile ? objects : [Object3d.merge(objects)]
    }))
}
