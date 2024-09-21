import {Vector} from "../layer/Vector";
import {EntityCollectionNode} from "./EntityCollectionNode";
import {EntityCollectionNodeLonLat} from "./EntityCollectionNode";
import {Entity} from "../entity/Entity";
import {EntityCollection} from "../entity/EntityCollection";
import * as mercator from "../mercator";
import {QueueArray} from "../QueueArray";
import * as quadTree from "./quadTree";
import {Extent} from "../Extent";
import {EarthQuadTreeStrategy} from "./EarthQuadTreeStrategy";

export class EntityCollectionsTreeStrategy {

    public _layer: Vector;

    /**
     * Maximum entities quantity in the tree node.
     * @public
     */
    public _nodeCapacity: number;

    public _secondPASS: EntityCollectionNode[];

    protected _counter: number;
    protected _deferredEntitiesPendingQueue: QueueArray<EntityCollectionNode>;

    public _renderingNodes: Record<number, boolean>;

    constructor(layer: Vector, nodeCapacity: number) {
        this._layer = layer;
        this._nodeCapacity = nodeCapacity;
        this._secondPASS = [];

        this._counter = 0;
        this._deferredEntitiesPendingQueue = new QueueArray<EntityCollectionNode>();

        this._renderingNodes = {};
    }

    public insertEntity(entity: Entity, rightNow: boolean = false) {

    }

    public setPickingEnabled(pickingEnabled: boolean) {

    }

    public dispose() {

    }

    public insertEntities(entitiesForTree: Entity[]) {

    }

    public collectVisibleEntityCollections(outArr: EntityCollection[]) {
    }

    public _queueDeferredNode(node: EntityCollectionNode) {
        if (this._layer.getVisibility()) {
            node._inTheQueue = true;
            if (this._counter >= 1) {
                this._deferredEntitiesPendingQueue.push(node);
            } else {
                this._execDeferredNode(node);
            }
        }
    }

    protected _execDeferredNode(node: EntityCollectionNode) {
        this._counter++;
        requestAnimationFrame(() => {
            node.applyCollection();
            this._counter--;
            if (this._deferredEntitiesPendingQueue.length && this._counter < 1) {
                while (this._deferredEntitiesPendingQueue.length) {
                    let n = this._deferredEntitiesPendingQueue.pop()!;
                    n._inTheQueue = false;
                    if (n.isVisible()) {
                        this._execDeferredNode(n);
                        return;
                    }
                }
            }
        });
    }
}