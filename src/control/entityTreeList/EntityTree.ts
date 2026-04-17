import { Control } from "../Control";
import type { IControlParams } from "../Control";
import { Dialog } from "../../ui/Dialog";
import { Entity } from "../../entity/Entity";
import { ToggleButton } from "../../ui/ToggleButton";
import { View } from "../../ui/View";
import { EntityTreeView } from "./EntityTreeView";

export interface IEntityTreeParams extends IControlParams {
    entities?: Entity[];
    title?: string;
    top?: number;
    right?: number;
    width?: number;
    maxHeight?: number;
    expandedByDefault?: boolean;
}

const ICON_BUTTON_SVG = `<svg width="1200pt" height="1200pt" version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
<path d="m120 0h300v300h-300z"/>
<path d="m1080 660v-300h-300v120h-480v-120h-60v840h60v-240h480v120h300v-300h-300v120h-480v-360h480v120z"/>
</svg>`;

const TEMPLATE = `<div class="og-entityTreeControl">
      <div class="og-entityTreeControl__tree"></div>
    </div>`;

export class EntityTree extends Control {
    protected _dialog: Dialog<null>;
    protected _toggleBtn: ToggleButton;
    protected _panel: View<null>;
    protected _treeView: EntityTreeView | null;

    protected _entities: Entity[];
    protected _expandedEntityIds: Set<number>;
    protected _expandedByDefault: boolean;
    protected _$tree: HTMLElement | null;

    constructor(options: IEntityTreeParams = {}) {
        super({
            name: "EntityTree",
            ...options
        });

        this._entities = options.entities ? [...options.entities] : [];
        this._expandedEntityIds = new Set<number>();
        this._expandedByDefault = options.expandedByDefault ?? false;

        this._dialog = new Dialog({
            title: options.title || "Entity Tree",
            top: options.top ?? 15,
            right: options.right ?? 67,
            visible: false,
            useHide: true,
            width: options.width ?? 340,
            maxHeight: options.maxHeight ?? 560
        });

        this._panel = new View({
            template: TEMPLATE
        });

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-entityTreeControl_button"],
            icon: ICON_BUTTON_SVG,
            title: "Entity tree"
        });

        this._treeView = null;
        this._$tree = null;
    }

    public override oninit() {
        if (!this.renderer) return;

        const rootContainer = this.renderer.div || this.renderer.handler.canvas?.parentElement || document.body;

        this._toggleBtn.appendTo(this.renderer.topRightContainer());
        this._dialog.appendTo(rootContainer);

        if (!this._dialog.container) return;

        this._panel.appendTo(this._dialog.container);

        if (!this._panel.el) return;

        this._$tree = this._panel.el.querySelector(".og-entityTreeControl__tree");

        this._dialog.events.on("visibility", this._onDialogVisibility);
        this._toggleBtn.events.on("change", this._onToggleButtonChange);

        this._renderEntityTree();
    }

    public override onremove() {
        this._dialog.events.off("visibility", this._onDialogVisibility);
        this._toggleBtn.events.off("change", this._onToggleButtonChange);

        this._clearTreeView();

        this._dialog.remove();
        this._panel.remove();
        this._toggleBtn.remove();
    }

    public override onactivate() {}

    public override ondeactivate() {
        this._dialog.hide();
    }

    public setEntity(entity: Entity | null): void {
        this._entities = entity ? [entity] : [];
        this._expandedEntityIds.clear();
        this._renderEntityTree();
    }

    public setEntities(entities: Entity[]): void {
        this._entities = [...entities];
        this._expandedEntityIds.clear();
        this._renderEntityTree();
    }

    public addEntity(entity: Entity): void {
        const rootEntity = entity.rootEntity;

        if (!this._containsEntity(this._entities, rootEntity)) {
            this._entities.push(rootEntity);
        }

        let current: Entity | null = entity;
        while (current) {
            this._expandedEntityIds.add(current.id);
            current = current.parent;
        }

        this._renderEntityTree();
    }

    public removeEntity(entity: Entity): void {
        if (!this._entities.length) return;

        const removedIds = new Set<number>();
        this._collectEntityIds(entity, removedIds);

        const removeRecursively = (entities: Entity[]): boolean => {
            for (let i = 0; i < entities.length; i++) {
                const current = entities[i];

                if (current.isEqual(entity)) {
                    entities.splice(i, 1);
                    return true;
                }

                if (removeRecursively(current.childEntities)) {
                    return true;
                }
            }

            return false;
        };

        removeRecursively(this._entities);
        removedIds.forEach((id) => this._expandedEntityIds.delete(id));
        this._renderEntityTree();
    }

    protected _containsEntity(entities: Entity[], target: Entity): boolean {
        for (let i = 0; i < entities.length; i++) {
            if (entities[i].isEqual(target)) {
                return true;
            }
        }
        return false;
    }

    protected _collectEntityIds(entity: Entity, result: Set<number>): void {
        result.add(entity.id);
        for (let i = 0; i < entity.childEntities.length; i++) {
            this._collectEntityIds(entity.childEntities[i], result);
        }
    }

    protected _onDialogVisibility = (isVisible: boolean): void => {
        this._toggleBtn.setActive(isVisible);
        if (isVisible) {
            this._dialog.positionNearElementOnFirstOpen(this._toggleBtn.el, this.renderer?.div || undefined);
        }
    };

    protected _onToggleButtonChange = (isActive: boolean): void => {
        this._dialog.setVisibility(isActive);
    };

    protected _onEntitySelect = (entity: Entity): void => {
        console.log(entity);
    };

    protected _clearTreeView(): void {
        if (this._treeView) {
            this._treeView.events.off("select", this._onEntitySelect);
            this._treeView.remove();
            this._treeView = null;
        }
    }

    protected _renderEntityTree(): void {
        if (!this._$tree) return;

        this._clearTreeView();
        this._$tree.innerHTML = "";

        if (!this._entities.length) {
            const emptyEl = document.createElement("div");
            emptyEl.classList.add("og-entityTreeControl__empty");
            emptyEl.textContent = "No entities";
            this._$tree.appendChild(emptyEl);
            return;
        }

        this._treeView = new EntityTreeView({
            model: this._entities,
            expandedByDefault: this._expandedByDefault,
            expandedEntityIds: this._expandedEntityIds
        });
        this._treeView.appendTo(this._$tree);
        this._treeView.events.on("select", this._onEntitySelect);
    }
}
