import {Object3d} from "../../Object3d";
import {type EventsHandler, createEvents} from "../../Events";

type Object3dCollectionEvents = ["add", "remove"];

const EVENT_NAMES: Object3dCollectionEvents = [
    "add",
    "remove"
];

export interface IObject3dItem {
    name: string;
    objects: Object3d[];
    scale?: number
}

interface Object3dCollectionParams {
    collection?: IObject3dItem[]
}

export class Object3dCollection {

    protected _items: Map<string, IObject3dItem>;

    public events: EventsHandler<Object3dCollectionEvents>;

    constructor(params: Object3dCollectionParams = {}) {

        this.events = createEvents<Object3dCollectionEvents>(EVENT_NAMES, this);

        this._items = Object3dCollection.createItemsMap(params.collection || []);
    }

    static createItemsMap(items: IObject3dItem[]): Map<string, IObject3dItem> {
        let res: Map<string, IObject3dItem> = new Map();
        for (let i = 0; i < items.length; i++) {
            res.set(items[i].name, items[i]);
        }
        return res;
    }

    public getItem(name: string): IObject3dItem | undefined {
        return this._items.get(name);
    }

    public addItem(item: IObject3dItem, force: boolean = false) {
        if (!this._items.has(item.name) || force) {
            this._items.set(item.name, item);
            this.events.dispatch(this.events.add, item);
        }
    }

    public getItems(): IObject3dItem[] {
        return Array.from(this._items, ([name, objects]) => (objects));
    }
}