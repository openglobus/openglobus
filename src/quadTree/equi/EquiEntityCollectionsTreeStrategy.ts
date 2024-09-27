import {Vector} from "../../layer/Vector";
import * as quadTree from "../quadTree";
import {Extent} from "../../Extent";
import {Entity} from "../../entity/Entity";
import {EntityCollection} from "../../entity/EntityCollection";
import {EquiQuadTreeStrategy} from "./EquiQuadTreeStrategy";
import {EntityCollectionsTreeStrategy} from "../EntityCollectionsTreeStrategy";
import {EquiEntityCollectionNodeLonLat} from "./EquiEntityCollectionNodeLonLat";

export class EquiEntityCollectionsTreeStrategy extends EntityCollectionsTreeStrategy {

    protected _entityCollectionsTreeWest: EquiEntityCollectionNodeLonLat;
    protected _entityCollectionsTreeEast: EquiEntityCollectionNodeLonLat;

    public _renderingNodesWest: Record<number, boolean>;
    public _renderingNodesEast: Record<number, boolean>;

    constructor(layer: Vector, nodeCapacity: number) {
        super(layer, nodeCapacity);

        let planet = layer._planet!;

        this._entityCollectionsTreeWest = new EquiEntityCollectionNodeLonLat(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([-180, -90, 0, 90]),
            planet,
            0
        );

        this._entityCollectionsTreeEast = new EquiEntityCollectionNodeLonLat(
            this,
            quadTree.NW,
            null,
            Extent.createFromArray([0, -90, 180, 90]),
            planet,
            0
        );

        this._renderingNodesWest = {};
        this._renderingNodesEast = {};
    }

    public override insertEntity(entity: Entity, rightNow: boolean = false) {
        if (entity._lonLat.lon < 0) {
            this._entityCollectionsTreeWest!.__setLonLat__(entity);
            this._entityCollectionsTreeWest!.insertEntity(entity, rightNow);
        } else {
            this._entityCollectionsTreeEast!.__setLonLat__(entity);
            this._entityCollectionsTreeEast!.insertEntity(entity, rightNow);
        }
    }

    public override setPickingEnabled(pickingEnabled: boolean) {
        this._entityCollectionsTreeWest.traverseTree((node: EquiEntityCollectionNodeLonLat) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });

        this._entityCollectionsTreeEast.traverseTree((node: EquiEntityCollectionNodeLonLat) => {
            node.entityCollection!.setPickingEnabled(pickingEnabled);
        });
    }

    public override dispose() {
        //@ts-ignore
        this._entityCollectionsTreeWest = null;
        //@ts-ignore
        this._entityCollectionsTreeEast = null;

        this._renderingNodesWest = {};
        this._renderingNodesEast = {};
    }

    public override insertEntities(entitiesForTree: Entity[]) {
        let westEntities: Entity[] = [],
            eastEntities: Entity[] = [];
        for (let i = 0, len = entitiesForTree.length; i < len; i++) {
            let entity = entitiesForTree[i];
            if (entity._lonLat.lon < 0) {
                westEntities.push(entity);
                this._entityCollectionsTreeWest.__setLonLat__(entity);
            } else {
                eastEntities.push(entity);
                this._entityCollectionsTreeEast.__setLonLat__(entity);
            }
        }

        this._entityCollectionsTreeWest.buildTree(westEntities);
        this._entityCollectionsTreeEast.buildTree(eastEntities);
    }

    public override collectVisibleEntityCollections(outArr: EntityCollection[]) {
        this._renderingNodesWest = {};
        this._renderingNodesEast = {};

        let pqs = this._layer._planet!.quadTreeStrategy as EquiQuadTreeStrategy;

        // Wset
        this._secondPASS = [];
        this._entityCollectionsTreeWest.collectRenderCollectionsPASS1(pqs._visibleNodesWest, outArr);
        let i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesWest, outArr, this._secondPASS[i].nodeId);
        }

        // East
        this._secondPASS = [];
        this._entityCollectionsTreeEast.collectRenderCollectionsPASS1(pqs._visibleNodesEast, outArr);
        i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(pqs._visibleNodesEast, outArr, this._secondPASS[i].nodeId);
        }
    }
}