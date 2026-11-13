import { Extent } from "../../Extent";
import type { Entity } from "../../entity/Entity";
import type { EntityCollection } from "../../entity/EntityCollection";
import type { Vector } from "../../layer/Vector";
import { CUBE_FACE_LINKS, CUBE_NODE_ID_OFFSET } from "../../proj/cube";
import { EntityCollectionsTreeStrategy } from "../EntityCollectionsTreeStrategy";
import type { QuadTreeStrategy } from "../QuadTreeStrategy";
import { CubeEntityCollectionNode } from "./CubeEntityCollectionNode";

/**
 * Entity collections of a vector layer in six trees, one on each cube face. The nodes have the ids of the planet
 * nodes with the same tiles, so a collection is drawn with the visible tile and its entities go down to its terrain.
 * @class
 * @extends {EntityCollectionsTreeStrategy}
 */
export class CubeEntityCollectionsTreeStrategy extends EntityCollectionsTreeStrategy {
    protected _faceTrees: CubeEntityCollectionNode[];

    constructor(quadTreeStrategy: QuadTreeStrategy, layer: Vector, nodeCapacity: number) {
        super(quadTreeStrategy, layer, nodeCapacity);

        const planet = layer._planet!;

        this._faceTrees = CUBE_FACE_LINKS.map((_, face) => {
            const root = new CubeEntityCollectionNode(
                this,
                0,
                null,
                Extent.createFromArray([face, 0, face + 1, 1]),
                planet,
                0
            );
            root.nodeId = CUBE_NODE_ID_OFFSET + face;
            return root;
        });
    }

    protected _getFace(entity: Entity): number {
        const face = Math.floor(this._faceTrees[0].__setLonLat__(entity).lon);
        return Math.min(Math.max(face, 0), this._faceTrees.length - 1);
    }

    protected _traverse(callback: (node: CubeEntityCollectionNode) => void) {
        for (const tree of this._faceTrees) {
            tree.traverseTree(callback);
        }
    }

    public override insertEntity(entity: Entity, rightNow: boolean = false) {
        this._faceTrees[this._getFace(entity)].insertEntity(entity, rightNow);
    }

    public override insertEntities(entitiesForTree: Entity[]) {
        const faceEntities: Entity[][] = this._faceTrees.map(() => []);

        for (const entity of entitiesForTree) {
            faceEntities[this._getFace(entity)].push(entity);
        }

        this._faceTrees.forEach((tree, face) => tree.buildTree(faceEntities[face]));
    }

    public override setPickingEnabled(pickingEnabled: boolean) {
        this._traverse((node) => node.entityCollection!.setPickingEnabled(pickingEnabled));
    }

    public override setReceiveProjectors(receiveProjectors: boolean) {
        this._traverse((node) => node.entityCollection!.setReceiveProjectors(receiveProjectors));
    }

    public override setReceiveShadows(receiveShadows: boolean) {
        this._traverse((node) => node.entityCollection!.setReceiveShadows(receiveShadows));
    }

    public override setReceiveFrameTransparency(receiveFrameTransparency: boolean) {
        this._traverse((node) => node.entityCollection!.setReceiveFrameTransparency(receiveFrameTransparency));
    }

    public override dispose() {
        this._faceTrees = [];
        this._renderingNodes = {};
    }

    public override collectVisibleEntityCollections(outArr: EntityCollection[]) {
        const visibleNodes = this.quadTreeStrategy._visibleNodes;

        this._renderingNodes = {};
        this._secondPASS = [];

        for (const tree of this._faceTrees) {
            tree.collectRenderCollectionsPASS1(visibleNodes, outArr);
        }

        let i = this._secondPASS.length;
        while (i--) {
            this._secondPASS[i].collectRenderCollectionsPASS2(visibleNodes, outArr, this._secondPASS[i].nodeId);
        }
    }
}
