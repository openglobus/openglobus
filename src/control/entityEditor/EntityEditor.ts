import { EntityGizmo, type IEntityGizmoParams } from "../entityGizmo/EntityGizmo";
import { EntityEditorDialog } from "./EntityEditorDialog";
import { CameraLock } from "../CameraLock";
import { Dialog } from "../../ui";

export interface IEntityEditorParams extends Omit<IEntityGizmoParams, "tools"> {}

/**
 * Entity properties editor. Combines the {@link EntityGizmo} on-map transform mechanism
 * with the "Entity Properties" dialog.
 * @class
 * @extends {EntityGizmo}
 */
export class EntityEditor extends EntityGizmo {
    protected _dialog: EntityEditorDialog;

    constructor(options: IEntityEditorParams = {}) {
        super({
            name: "EntityEditor",
            ...options,
            tools: "full"
        });

        this._dialog = new EntityEditorDialog({
            model: this._scene
        });
    }

    public override oninit() {
        super.oninit();
        if (this.renderer) {
            this.renderer.addControl(new CameraLock({ planet: this.planet }));
            this._dialog.appendTo(this.renderer.getUIContainer());
        }
    }

    public override ondeactivate() {
        super.ondeactivate();
        this._dialog.hide();
    }

    public positionDialogLeftOf(anchor: Dialog<unknown>): void {
        this._dialog.positionNearElementOnFirstOpen(anchor.el);
    }
}
