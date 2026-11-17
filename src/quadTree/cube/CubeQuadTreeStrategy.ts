import { Extent } from "../../Extent";
import { LonLat } from "../../LonLat";
import { PlanetCamera } from "../../camera";
import { CUBE_FACE_LINKS, CUBE_NODE_ID_OFFSET, cube, cubeEquiangular } from "../../proj/cube";
import type { CubeProj } from "../../proj/cube";
import { SegmentCube } from "../../segment/SegmentCube";
import type { Vector } from "../../layer/Vector";
import { CubeEntityCollectionsTreeStrategy } from "./CubeEntityCollectionsTreeStrategy";
import { Node } from "../Node";
import { E, N, S, W } from "../quadTree";
import { QuadTreeStrategy } from "../QuadTreeStrategy";
import type { QuadTreeStrategyParams } from "../QuadTreeStrategy";

/**
 * Quad trees on the six faces of a cube inflated to the ellipsoid: the tiles are close to squares all over the
 * planet and there are no poles in the tree.
 * @class
 * @extends {QuadTreeStrategy}
 */
export class CubeQuadTreeStrategy extends QuadTreeStrategy {
    constructor(params: QuadTreeStrategyParams) {
        super({ name: "cube", proj: cube, ...params });
        this.rootTileWidth = 90;
    }

    public override init(camera: PlanetCamera) {
        const roots = CUBE_FACE_LINKS.map((_, face) => {
            const root = new Node(SegmentCube, this, 0, null, 0, Extent.createFromArray([face, 0, face + 1, 1]));
            root.nodeId = CUBE_NODE_ID_OFFSET + face;
            return root;
        });

        roots.forEach((root, face) => {
            const l = CUBE_FACE_LINKS[face];
            root.rootNeighbors = [roots[l[N][0]], roots[l[E][0]], roots[l[S][0]], roots[l[W][0]]];
        });

        this._quadTreeList = roots;

        super.init(camera);
    }

    public override createEntityCollectionsTreeStrategy(
        layer: Vector,
        nodeCapacity: number
    ): CubeEntityCollectionsTreeStrategy {
        return new CubeEntityCollectionsTreeStrategy(this, layer, nodeCapacity);
    }

    public override getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        const p = (this.projection as CubeProj).fromLonLat(lonLat),
            face = Math.floor(p.lon),
            pz = 1 << zoom;

        return [Math.floor((p.lon - face) * pz), Math.min(Math.floor((1.0 - p.lat) * pz), pz - 1), zoom, face];
    }

    public override getLonLatTileOffset(
        lonLat: LonLat,
        x: number,
        y: number,
        z: number,
        gridSize: number
    ): [number, number] {
        const p = (this.projection as CubeProj).fromLonLat(lonLat),
            face = Math.floor(p.lon),
            pz = 1 << z,
            cells = gridSize - 1;

        return [Math.floor(((1.0 - p.lat) * pz - y) * cells), Math.floor(((p.lon - face) * pz - x) * cells)];
    }
}

/**
 * The cube with tiles of about the same size all over the planet: equal steps on a face are equal angles.
 * @class
 * @extends {CubeQuadTreeStrategy}
 */
export class EquiangularCubeQuadTreeStrategy extends CubeQuadTreeStrategy {
    constructor(params: QuadTreeStrategyParams) {
        super({ name: "cubeEquiangular", proj: cubeEquiangular, ...params });
    }
}
