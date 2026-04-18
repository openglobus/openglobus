import { createEvents, type EventsHandler } from "../../Events";
import type { Entity } from "../../entity/Entity";
import { View, type IViewParams, type ViewEventsList } from "../../ui/View";

type EntityTreeViewEvents = ["select"];

const EVENT_NAMES: EntityTreeViewEvents = ["select"];

const TEMPLATE = `<div class="og-entityTree"></div>`;

export interface IEntityTreeViewParams extends IViewParams {
    model: Entity[];
    expandedByDefault?: boolean;
    expandedEntityIds?: Set<number>;
}

type EntityTreeViewEventsExt = EventsHandler<EntityTreeViewEvents> & EventsHandler<ViewEventsList>;

export class EntityTreeView extends View<Entity[]> {
    public override events: EntityTreeViewEventsExt;

    protected _expandedByDefault: boolean;
    protected _expandedEntityIds: Set<number>;

    constructor(params: IEntityTreeViewParams) {
        super({
            ...params,
            template: TEMPLATE,
            model: params.model || []
        });

        this.events = createEvents<EntityTreeViewEvents>(EVENT_NAMES) as EntityTreeViewEventsExt;
        this._expandedByDefault = params.expandedByDefault ?? false;
        this._expandedEntityIds = params.expandedEntityIds || new Set<number>();
    }

    public override render(params?: any): this {
        super.render(params);
        this._renderTree();
        return this;
    }

    public setEntities(entities: Entity[]): void {
        this.model = entities;
        this._renderTree();
    }

    protected _renderTree(): void {
        if (!this.el) return;
        this.el.innerHTML = "";
        this._renderEntities(this.model, this.el);
    }

    protected _renderEntities(entities: Entity[], parentNode: HTMLElement): void {
        for (let i = 0; i < entities.length; i++) {
            parentNode.appendChild(this._createEntityNode(entities[i]));
        }
    }

    protected _createEntityNode(entity: Entity): HTMLElement {
        const nodeEl = document.createElement("div");
        nodeEl.classList.add("og-entityTree__node");

        const rowEl = document.createElement("div");
        rowEl.classList.add("og-entityTree__row");
        nodeEl.appendChild(rowEl);

        const hasChildren = entity.childEntities.length !== 0;
        let expanded = hasChildren && (this._expandedByDefault || this._expandedEntityIds.has(entity.id));

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.classList.add("og-entityTree__toggleBtn");
        toggleBtn.classList.add(
            hasChildren ? "og-entityTree__toggleBtn_hasChildren" : "og-entityTree__toggleBtn_empty"
        );
        toggleBtn.disabled = entity.childEntities.length === 0;
        toggleBtn.textContent = hasChildren ? this._getToggleText(expanded) : "";
        rowEl.appendChild(toggleBtn);

        const entityBtn = document.createElement("button");
        entityBtn.type = "button";
        entityBtn.classList.add("og-entityTree__entityBtn");
        entityBtn.title = entity.name || `entity:${entity.id.toString()}`;

        const nameEl = document.createElement("span");
        nameEl.classList.add("og-entityTree__name");
        nameEl.textContent = entity.name || `entity:${entity.id.toString()}`;
        entityBtn.appendChild(nameEl);

        const typeEl = document.createElement("span");
        typeEl.classList.add("og-entityTree__type");
        typeEl.textContent = this._getEntityTypes(entity);
        entityBtn.appendChild(typeEl);

        rowEl.appendChild(entityBtn);

        const childrenEl = document.createElement("div");
        childrenEl.classList.add("og-entityTree__children");
        if (hasChildren && !expanded) {
            childrenEl.classList.add("og-entityTree__children_hidden");
        }
        nodeEl.appendChild(childrenEl);

        if (hasChildren) {
            this._renderEntities(entity.childEntities, childrenEl);

            toggleBtn.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                expanded = !expanded;
                toggleBtn.textContent = this._getToggleText(expanded);
                childrenEl.classList.toggle("og-entityTree__children_hidden", !expanded);
            });
        }

        entityBtn.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            this.events.dispatch(this.events.select, entity, this);
        });

        return nodeEl;
    }

    protected _getToggleText(isExpanded: boolean): string {
        return isExpanded ? "▾" : "▸";
    }

    protected _getEntityTypes(entity: Entity): string {
        const entityTypes: string[] = [];

        entity.billboard && entityTypes.push("billboard");
        entity.label && entityTypes.push("label");
        entity.geoObject && entityTypes.push("geoObject");
        entity.geometry && entityTypes.push("geometry");
        entity.polyline && entityTypes.push("polyline");
        entity.ray && entityTypes.push("ray");
        entity.pointCloud && entityTypes.push("pointCloud");
        entity.strip && entityTypes.push("strip");

        return entityTypes.length ? entityTypes.join(", ") : "";
    }
}
