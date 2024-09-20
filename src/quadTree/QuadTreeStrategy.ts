import {EPSG3857} from "../proj/EPSG3857";
import {Layer} from "../layer/Layer";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {Proj} from "../proj/Proj";
import {LonLat} from "../LonLat";
import {getTileCellExtent, getTileCellIndex, TILEGROUP_COMMON} from "../segment/Segment";
import {Extent} from "../Extent";
import * as mercator from "../mercator";

export class QuadTreeStrategy {
    public name: string;
    public projection: Proj;
    protected _planet: Planet;

    /**
     * grid tree list.
     * @protected
     * @type {Node[]}
     */
    protected _quadTreeList: Node[];

    constructor(planet: Planet, name: string = "", proj: Proj = EPSG3857) {
        this.name = name;
        this.projection = proj;
        this._planet = planet;
        this._quadTreeList = [];
    }

    public destroyBranches() {
        for (let i = 0, len = this._quadTreeList.length; i < len; i++) {
            this._quadTreeList[i].destroyBranches();
        }
    }

    public clearLayerMaterial(layer: Layer) {
        let lid = layer.__id;
        for (let i = 0, len = this._quadTreeList.length; i < len; i++) {
            this._quadTreeList[i].traverseTree(function (node: Node) {
                let mats = node.segment.materials;
                if (mats[lid]) {
                    mats[lid].clear();
                    //@ts-ignore
                    mats[lid] = null;
                    //delete mats[lid];
                }
            });
        }
    }

    public get planet() {
        return this._planet;
    }

    public init() {

    }

    public preRender() {
        for (let i = 0; i < this._quadTreeList.length; i++) {

            let quadTree = this._quadTreeList[i];
            quadTree.createChildrenNodes();
            quadTree.segment.createPlainSegment();

            for (let j = 0; j < quadTree.nodes.length; j++) {
                quadTree.nodes[j].segment.createPlainSegment();
            }
        }
    }

    public preLoad() {

        for (let i = 0; i < this._quadTreeList.length; i++) {

            let quadTree = this._quadTreeList[i];
            quadTree.segment.passReady = true;
            quadTree.renderNode(1);
            this._planet.normalMapCreator.drawSingle(quadTree.segment);

            for (let j = 0; j < quadTree.nodes.length; j++) {
                quadTree.nodes[j].segment.passReady = true;
                quadTree.nodes[j].renderNode(1);
                this._planet._normalMapCreator.drawSingle(quadTree.nodes[j].segment);
            }
        }
    }

    public collectRenderNodes() {
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].renderTree(this._planet.camera, 0, null);
        }
    }

    public clear() {
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].clearTree();
        }
    }

    public get quadTreeList(): Node[] {
        return this._quadTreeList;
    }

    public getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let z = zoom,
            x = -1,
            y = -1,
            pz = (1 << z);

        x = getTileCellIndex(lonLat.lon, 360 / pz, -180);
        y = getTileCellIndex(lonLat.lat, 180 / pz, 90);

        return [x, y, z, TILEGROUP_COMMON];
    }

    public getLonLatTileOffset(lonLat: LonLat, x: number, y: number, z: number, gridSize: number): [number, number] {
        let coords = lonLat;
        let extent = new Extent();

        let worldExtent = Extent.createFromArray([-180, -90, 180, 90]);
        extent = getTileCellExtent(x, y, z, worldExtent);

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((coords.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((coords.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }
}