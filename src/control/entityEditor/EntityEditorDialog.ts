import { Dialog, type IDialogParams } from "../../ui/Dialog";
import { EntityEditorScene } from "./EntityEditorScene";
import { Entity } from "../../entity/Entity";
import { Vec3 } from "../../math/Vec3";
import { ToggleButton } from "../../ui/ToggleButton";
import { CameraEditorView, hasEntityEditorDepthCamera } from "./CameraEditorView";
import { EntityEditorView } from "./EntityEditorView";
import { ProjectorEditorView } from "./ProjectorEditorView";

const ICON_LOCK_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" id="filter-center-focus">
  <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
</svg>`;

interface IEntityEditorDialog extends IDialogParams {
    model: EntityEditorScene;
}

export class EntityEditorDialog extends Dialog<EntityEditorScene> {
    protected _entityView: EntityEditorView | null;
    protected _cameraView: CameraEditorView | null;
    protected _projectorView: ProjectorEditorView | null;

    constructor(params: IEntityEditorDialog) {
        super({
            title: "Entity Properties",
            visible: false,
            resizable: true,
            useHide: true,
            top: 25,
            right: 85,
            width: 252,
            height: 480,
            minHeight: 100,
            minWidth: 100,
            model: params.model
        });

        this._entityView = null;
        this._cameraView = null;
        this._projectorView = null;
    }

    public override render(params: any): this {
        super.render(params);

        this._initSceneEvents();

        let $toolbar = document.createElement("div");
        $toolbar.classList.add("og-editor_toolbar");
        this.container?.appendChild($toolbar);

        let cameraLockBtn = new ToggleButton({
            classList: ["og-editor_toolbar-button"],
            icon: ICON_LOCK_BUTTON_SVG,
            title: "Lock/Unlock camera view"
        });
        cameraLockBtn.appendTo($toolbar);

        cameraLockBtn.events.on("change", (isActive: boolean) => {
            if (isActive) {
                this.model.lockView();
            } else {
                this.model.unlockView();
            }
        });

        this.events.on("visibility", (vis: boolean) => {
            if (!vis) {
                cameraLockBtn.events.stopPropagation();
                cameraLockBtn.setActive(false);
            }
        });

        this.events.on("visibility", this._onVisibility);

        return this;
    }

    protected _onVisibility = (vis: boolean) => {
        this.model.setVisibility(vis);
    };

    public override remove(): void {
        this._removeViews();
        super.remove();
        this._clearSceneEvents();
    }

    protected _initSceneEvents() {
        this.model.events.on("select", this._onSelect);
        this.model.events.on("unselect", this._onUnselect);
        this.model.events.on("position", this._onPosition);
        this.model.events.on("pitch", this._onPitch);
        this.model.events.on("yaw", this._onYaw);
        this.model.events.on("roll", this._onRoll);
    }

    protected _clearSceneEvents() {
        this.model.events.off("select", this._onSelect);
        this.model.events.off("unselect", this._onUnselect);
        this.model.events.off("position", this._onPosition);
        this.model.events.off("pitch", this._onPitch);
        this.model.events.off("yaw", this._onYaw);
        this.model.events.off("roll", this._onRoll);
    }

    protected _onSelect = (entity: Entity) => {
        this._setDialogTitle(entity);
        this.show();
        this._refreshViews(entity);
    };

    protected _refreshViews(entity: Entity): void {
        this._setDialogTitle(entity);
        this._refreshEntityView(entity);
        this._refreshCameraView(entity);
        this._refreshProjectorView(entity);
    }

    protected _refreshEntityView(entity: Entity): void {
        if (!this._entityView) {
            this._entityView = new EntityEditorView({
                model: this.model,
                entity
            });
            this._entityView.appendTo(this.container!);
        } else {
            this._entityView.bindEntity(entity);
        }
    }

    protected _removeEntityView(): void {
        if (this._entityView) {
            this._entityView.remove();
            this._entityView = null;
        }
    }

    protected _refreshCameraView(entity: Entity): void {
        if (!hasEntityEditorDepthCamera(entity)) {
            this._removeCameraView();
            return;
        }

        if (!this._cameraView) {
            this._cameraView = new CameraEditorView({
                entity
            });
            this._cameraView.appendTo(this.container!);
        } else {
            this._cameraView.bindEntity(entity);
            this._cameraView.refresh();
        }
    }

    protected _removeCameraView(): void {
        if (this._cameraView) {
            this._cameraView.remove();
            this._cameraView = null;
        }
    }

    protected _refreshProjectorView(entity: Entity): void {
        const depthCamera = entity.properties.depthCamera;
        const renderer = entity.entityCollection?.scene?.renderer;
        const projector = depthCamera && renderer ? renderer.projectors.getByDepthCamera(depthCamera) : null;

        if (!projector) {
            this._removeProjectorView();
            return;
        }

        if (!this._projectorView) {
            this._projectorView = new ProjectorEditorView({
                projector
            });
            this._projectorView.appendTo(this.container!);
        } else {
            this._projectorView.bindProjector(projector);
            this._projectorView.refresh();
        }
    }

    protected _removeProjectorView(): void {
        if (this._projectorView) {
            this._projectorView.remove();
            this._projectorView = null;
        }
    }

    protected _removeViews(): void {
        this._removeProjectorView();
        this._removeCameraView();
        this._removeEntityView();
    }

    protected _setDialogTitle(entity: Entity): void {
        const entityName = entity.name?.trim();
        const title = entityName && entityName.length > 0 ? entityName : `entity:${entity.id.toString()}`;
        this.setTitle(title);
    }

    public override hide() {
        super.hide();
        this.model.events.stopPropagation();
        this.model.unselect();
    }

    protected _onUnselect = () => {
        this._removeViews();
        this.hide();
    };

    protected _onPosition = (pos: Vec3, entity: Entity) => {
        this._refreshViews(entity);
    };

    protected _onPitch = (a: number, entity: Entity) => {
        this._entityView?.refreshRotation(entity);
    };

    protected _onYaw = (a: number, entity: Entity) => {
        this._entityView?.refreshRotation(entity);
    };

    protected _onRoll = (a: number, entity: Entity) => {
        this._entityView?.refreshRotation(entity);
    };
}
