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

export class EarthEntityCollectionsTreeStrategy extends EntityCollectionsTreeStrategy {

    protected _entityCollectionsTree: EntityCollectionNode;
    protected _entityCollectionsTreeNorth: EntityCollectionNodeLonLat;
    protected _entityCollectionsTreeSouth: EntityCollectionNodeLonLat;

    public _renderingNodesNorth: Record<number, boolean>;
    public _renderingNodesSouth: Record<number, boolean>;

    constructor(layer: Vector, nodeCapacity: number) {
        super(layer, nodeCapacity);

        let planet = layer._planet!;

        this._entityCollectionsTree = new EntityCollectionNode(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([-20037508.34, -20037508.34, 20037508.34, 20037508.34]),
            planet,
            0
        );

        this._entityCollectionsTreeNorth = new EntityCollectionNodeLonLat(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90]),
            planet,
            0
        );

        this._entityCollectionsTreeSouth = new EntityCollectionNodeLonLat(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([-180, -90, 180, mercator.MIN_LAT]),
            planet,
            0
        );

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};
    }

    public override insertEntity(entity: Entity, rightNow: boolean = false) {
        if (entity._lonLat.lat > mercator.MAX_LAT) {
            this._entityCollectionsTreeNorth!.__setLonLat__(entity);
            this._entityCollectionsTreeNorth!.insertEntity(entity, rightNow);
        } else if (entity._lonLat.lat < mercator.MIN_LAT) {
            this._entityCollectionsTreeSouth!.__setLonLat__(entity);
            this._entityCollectionsTreeSouth!.insertEntity(entity, rightNow);
        } else {
            this._entityCollectionsTree!.__setLonLat__(entity);
            this._entityCollectionsTree!.insertEntity(entity, rightNow);
        }
    }

    public override setPickingEnabled(pickingEnabled: boolean) {
        this._entityCollectionsTree && this._entityCollectionsTree.traverseTree((node: EntityCollectionNode) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });

        this._entityCollectionsTreeNorth && this._entityCollectionsTreeNorth.traverseTree((node: EntityCollectionNodeLonLat) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });

        this._entityCollectionsTreeSouth && this._entityCollectionsTreeSouth.traverseTree((node: EntityCollectionNodeLonLat) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });
    }

    public override dispose() {
        //@ts-ignore
        this._entityCollectionsTree = null;
        //@ts-ignore
        this._entityCollectionsTreeNorth = null;
        //@ts-ignore
        this._entityCollectionsTreeSouth = null;

        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};
    }

    public override insertEntities(entitiesForTree: Entity[]) {
        for (let i = 0, len = entitiesForTree.length; i < len; i++) {
            let entity = entitiesForTree[i];
            // north tree
            if (entity._lonLat.lat > mercator.MAX_LAT) {
                this._entityCollectionsTreeNorth.__setLonLat__(entity);
            } else if (entity._lonLat.lat < mercator.MIN_LAT) {
                // south tree
                this._entityCollectionsTreeSouth.__setLonLat__(entity);
            } else {
                this._entityCollectionsTree.__setLonLat__(entity);
            }
        }

        this._entityCollectionsTree.buildTree(entitiesForTree);
        this._entityCollectionsTreeNorth.buildTree(entitiesForTree);
        this._entityCollectionsTreeSouth.buildTree(entitiesForTree);
    }

    public override collectVisibleEntityCollections(outArr: EntityCollection[]) {
        this._renderingNodes = {};
        this._renderingNodesNorth = {};
        this._renderingNodesSouth = {};

        let pqs = this._layer._planet!.quadTreeStrategy as EarthQuadTreeStrategy;

        // Merc nodes
        this._secondPASS = [];
        this._entityCollectionsTree && this._entityCollectionsTree.collectRenderCollectionsPASS1(pqs._visibleNodes, outArr);
        let i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodes, outArr, this._secondPASS[i].nodeId);
        }

        // North nodes
        this._secondPASS = [];
        this._entityCollectionsTreeNorth && this._entityCollectionsTreeNorth.collectRenderCollectionsPASS1(pqs._visibleNodesNorth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesNorth, outArr, this._secondPASS[i].nodeId);
        }

        // South nodes
        this._secondPASS = [];
        this._entityCollectionsTreeSouth && this._entityCollectionsTreeSouth.collectRenderCollectionsPASS1(pqs._visibleNodesSouth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesSouth, outArr, this._secondPASS[i].nodeId);
        }
    }
}