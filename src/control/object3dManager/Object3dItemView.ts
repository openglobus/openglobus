import {IViewParams, View, type ViewEventsList} from "../../ui/View";
import {IObject3dItem} from "./Object3dCollection";
import {createEvents, EventsHandler} from "../../Events";
import {stringTemplate} from "../../utils/shared";

type Object3dItemViewEvents = ["click"];

const EVENT_NAMES: Object3dItemViewEvents = [
    "click",
];

const ITEM_TEMPLATE =
    `<button class="og-object3d-collection__item">
        <div class="og-object3d-collection__item_name">{name}</div>
    </button>`;

export class Object3dItemView extends View<IObject3dItem> {

    public override events: EventsHandler<Object3dItemViewEvents> & EventsHandler<ViewEventsList>;

    constructor(params: IViewParams) {
        super({
            template: stringTemplate(ITEM_TEMPLATE, {
                name: params.model.name
            }),
            ...params
        });

        //@ts-ignore
        this.events = createEvents<Object3dItemViewEvents>(EVENT_NAMES);
    }

    public override render(params?: any): this {
        super.render(params);
        this.el?.addEventListener("click", (e) => {
            this.events.dispatch(this.events.click, this.model, this, e);
        });
        return this;
    }
}