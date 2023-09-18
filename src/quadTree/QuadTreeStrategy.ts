import {EPSG3857} from "../proj/EPSG3857";
import {Layer} from "../layer/Layer";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {Proj} from "../proj/Proj";

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
}