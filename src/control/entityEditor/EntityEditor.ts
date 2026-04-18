import { Control, type IControlParams } from "../Control";
import { EntityEditorScene } from "./EntityEditorScene";
import { EntityEditorDialog } from "./EntityEditorDialog";
import { CameraLock } from "../CameraLock";

export interface IEntityEditorParams extends IControlParams {}

export class EntityEditor extends Control {
    protected _entityEditorScene: EntityEditorScene;
    protected _dialog: EntityEditorDialog;

    constructor(options: IEntityEditorParams = {}) {
        super(options);

        this._entityEditorScene = new EntityEditorScene({
            name: `entityEditorScene:${this.__id}`
        });

        this._dialog = new EntityEditorDialog({
            model: this._entityEditorScene
        });
    }

    public override oninit() {
        if (this.renderer) {
            this.renderer.addControl(new CameraLock({ planet: this.planet }));
            this._entityEditorScene.bindPlanet(this.planet!);
            this._dialog.appendTo(this.renderer.div || document.body);
            this.activate();
        }
    }

    public override onactivate() {
        this.renderer && this.renderer.addNode(this._entityEditorScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._entityEditorScene);
        this._dialog.hide();
    }
}
