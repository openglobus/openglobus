import {EntityCollectionNode} from "../EntityCollectionNode";
import {EarthEntityCollectionNodeLonLat} from "./EarthEntityCollectionNodeLonLat";
import {Vector} from "../../layer/Vector";
import * as quadTree from "../quadTree";
import {Extent} from "../../Extent";
import * as mercator from "../../mercator";
import {Entity} from "../../entity/Entity";
import {EntityCollection} from "../../entity/EntityCollection";
import {EarthQuadTreeStrategy} from "./EarthQuadTreeStrategy";
import {EntityCollectionsTreeStrategy} from "../EntityCollectionsTreeStrategy";

export class EarthEntityCollectionsTreeStrategy extends EntityCollectionsTreeStrategy {

    protected _entityCollectionsTree: EntityCollectionNode;
    protected _entityCollectionsTreeNorth: EarthEntityCollectionNodeLonLat;
    protected _entityCollectionsTreeSouth: EarthEntityCollectionNodeLonLat;

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

        this._entityCollectionsTreeNorth = new EarthEntityCollectionNodeLonLat(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([-180, mercator.MAX_LAT, 180, 90]),
            planet,
            0
        );

        this._entityCollectionsTreeSouth = new EarthEntityCollectionNodeLonLat(
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

        this._entityCollectionsTreeNorth && this._entityCollectionsTreeNorth.traverseTree((node: EarthEntityCollectionNodeLonLat) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });

        this._entityCollectionsTreeSouth && this._entityCollectionsTreeSouth.traverseTree((node: EarthEntityCollectionNodeLonLat) => {
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
        this._entityCollectionsTree.collectRenderCollectionsPASS1(pqs._visibleNodes, outArr);
        let i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodes, outArr, this._secondPASS[i].nodeId);
        }

        // North nodes
        this._secondPASS = [];
        this._entityCollectionsTreeNorth.collectRenderCollectionsPASS1(pqs._visibleNodesNorth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesNorth, outArr, this._secondPASS[i].nodeId);
        }

        // South nodes
        this._secondPASS = [];
        this._entityCollectionsTreeSouth.collectRenderCollectionsPASS1(pqs._visibleNodesSouth, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesSouth, outArr, this._secondPASS[i].nodeId);
        }
    }
}