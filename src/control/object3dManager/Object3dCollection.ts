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
}

interface Object3dCollectionParams {
    collection?: IObject3dItem[]
}

export class Object3dCollection {

    protected _items: Map<string, Object3d[]>;

    public events: EventsHandler<Object3dCollectionEvents>;

    constructor(params: Object3dCollectionParams = {}) {

        this.events = createEvents<Object3dCollectionEvents>(EVENT_NAMES, this);

        this._items = Object3dCollection.createItemsMap(params.collection || []);
    }

    static createItemsMap(items: IObject3dItem[]): Map<string, Object3d[]> {
        let res: Map<string, Object3d[]> = new Map();
        for (let i = 0; i < items.length; i++) {
            res.set(items[i].name, items[i].objects);
        }
        return res;
    }

    public getItem(name: string): Object3d[] | undefined {
        return this._items.get(name);
    }

    public addItem(name: string, objects: Object3d[], force: boolean = false) {
        if (!this._items.has(name) || force) {
            this._items.set(name, objects);
            this.events.dispatch(this.events.add, name, objects, this._items);
        }
    }

    public getItems(): IObject3dItem[] {
        return Array.from(this._items, ([name, objects]) => ({name, objects}));
    }
}