import { EntityGizmo, type IEntityGizmoParams } from "../entityGizmo/EntityGizmo";
import { EntityEditorDialog } from "./EntityEditorDialog";
import { CameraLock } from "../CameraLock";
import { Dialog } from "../../ui";

export interface IEntityEditorParams extends Omit<IEntityGizmoParams, "tools"> {
    visibility?: boolean;
}

/**
 * Entity properties editor. Combines the {@link EntityGizmo} on-map transform mechanism
 * with the "Entity Properties" dialog.
 * @class
 * @extends {EntityGizmo}
 */
export class EntityEditor extends EntityGizmo {
    protected _dialog: EntityEditorDialog;
    protected _visibility: boolean;

    constructor(options: IEntityEditorParams = {}) {
        super({
            name: "EntityEditor",
            ...options,
            tools: "full"
        });

        this._dialog = new EntityEditorDialog({
            model: this._scene
        });

        this._visibility = options.visibility || false;

        this.events.on("unselect", this._onUnselectEntity);
    }

    public override oninit() {
        super.oninit();
        if (this.renderer) {
            this.renderer.addControl(new CameraLock({ planet: this.planet }));
            this._dialog.appendTo(this.renderer.getUIContainer());
            if (this._visibility) {
                this._dialog.show();
            }
        }
    }

    public override ondeactivate() {
        super.ondeactivate();
        this._dialog.hide();
    }

    protected _onUnselectEntity = () => {
        if (!this._visibility) {
            this._dialog.hide();
        }
    };

    public positionDialogLeftOf(anchor: Dialog<unknown>): void {
        this._dialog.positionNearElementOnFirstOpen(anchor.el);
    }
}
