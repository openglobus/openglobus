import {IViewParams, View, type ViewEventsList} from "../../ui/View";
import {IObject3dItem, Object3dCollection} from "./Object3dCollection";
import {Object3dItemView} from "./Object3dItemView";
import {type EventsHandler, createEvents} from "../../Events";
import {Object3d} from "../../Object3d";

type Object3dCollectionViewEvents = ["select"];

const EVENT_NAMES: Object3dCollectionViewEvents = [
    "select",
];

const TEMPLATE = `<div class="og-object3d-collection"></div>`;

export class Object3dCollectionView extends View<Object3dCollection> {

    public override events: EventsHandler<Object3dCollectionViewEvents> & EventsHandler<ViewEventsList>;

    protected _activeView: Object3dItemView | null;

    constructor(params: IViewParams) {
        super({
            template: TEMPLATE,
            model: params.model,
            ...params
        });

        //@ts-ignore
        this.events = createEvents<Object3dItemViewEvents>(EVENT_NAMES);

        this._activeView = null;
    }

    protected _addItem(item: IObject3dItem) {
        let itemView = new Object3dItemView({model: item});
        itemView.appendTo(this.el!);
        itemView.events.on("click", (item: IObject3dItem) => {
            if (this._activeView) {
                this._activeView.el?.classList.remove("active");
            }
            this._activeView = itemView;
            this._activeView.el?.classList.add("active");
            this.events.dispatch(this.events.select, item, itemView);
        });
    }

    public override render(params: IViewParams) {
        super.render(params);
        let items = this.model.getItems();
        for (let item of items) {
            this._addItem(item);
        }

        this._initEvents();

        return this;
    }

    protected _initEvents() {
        this.model.events.on("add", this._onAdd);
    }

    protected _onAdd = (item: IObject3dItem) => {
        this._addItem(item);
    }
}