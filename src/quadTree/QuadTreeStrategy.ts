import {EPSG3857} from "../proj/EPSG3857";
import {Layer} from "../layer/Layer";
import {Vector} from "../layer/Vector";
import {Node} from "../quadTree/Node";
import {Planet} from "../scene/Planet";
import {Proj} from "../proj/Proj";
import {LonLat} from "../LonLat";
import {getTileCellExtent, getTileCellIndex, Segment, TILEGROUP_COMMON} from "../segment/Segment";
import {Extent} from "../Extent";
import {EntityCollectionsTreeStrategy} from "./EntityCollectionsTreeStrategy";
import {PlanetCamera} from "../camera";
import * as math from "../math";
import {createEvents, EventsHandler} from "../Events";

export type QuadTreeStrategyEventsList = [
    "rendercompleted",
    "terraincompleted",
];

const CUR_LOD_SIZE = 256; //px
const MIN_LOD_SIZE = 512; //px
const MAX_LOD_SIZE = 256; //px

const HORIZON_TANGENT = 0.81;

export interface QuadTreeStrategyParams {
    planet: Planet;
    name?: string;
    proj?: Proj;
    maxEqualZoomAltitude?: number;
    minEqualZoomAltitude?: number;
    minEqualZoomCameraSlope?: number;
    transitionOpacityEnabled?: boolean;
}

export class QuadTreeStrategy {

    public events: EventsHandler<QuadTreeStrategyEventsList>;

    public name: string;
    public projection: Proj;
    public readonly planet: Planet;

    /**
     * grid tree list.
     * @protected
     * @type {Node[]}
     */
    protected _quadTreeList: Node[];

    /**
     * Current visible mercator segments tree nodes array.
     * @public
     * @type {Node}
     */
    public _visibleNodes: Record<number, Node>;

    /**
     * Planet's segments collected for rendering frame.
     * @public
     * @type {Node}
     */
    public _renderedNodes: Node[];

    public _renderedNodesInFrustum: Node[][];

    public _fadingNodes: Map<number, Node>;

    public _fadingNodesInFrustum: Node[][];

    public _fadingOpaqueSegments: Segment[];

    /**
     * Current visible minimal zoom index planet segment.
     * @public
     * @type {number}
     */
    public minCurrZoom: number;

    /**
     * Current visible maximal zoom index planet segment.
     * @public
     * @type {number}
     */
    public maxCurrZoom: number;

    protected _transitionOpacityEnabled: boolean;

    public _viewExtent: Extent;

    /**
     * Level of details of visible segments.
     * @protected
     * @type {number}
     */
    protected _lodSize: number;
    protected _curLodSize: number;
    protected _minLodSize: number;
    public _maxLodSize: number;

    public maxEqualZoomAltitude: number;
    public minEqualZoomAltitude: number;
    public minEqualZoomCameraSlope: number;

    public _renderCompleted: boolean
    public _renderCompletedActivated: boolean;

    public _terrainCompleted: boolean;
    public _terrainCompletedActivated: boolean;

    protected _skipPreRender: boolean = false;

    constructor(params: QuadTreeStrategyParams) {

        this.events = createEvents<QuadTreeStrategyEventsList>(QUADTREESTRATEGY_EVENTS);

        this.name = params.name || "";
        this.projection = params.proj || EPSG3857;
        this.planet = params.planet;
        this._quadTreeList = [];
        this._visibleNodes = {};

        this._renderedNodes = [];
        this._renderedNodesInFrustum = [];

        this._fadingNodes = new Map<number, Node>;
        this._fadingNodesInFrustum = [];
        this._fadingOpaqueSegments = [];

        this.minCurrZoom = math.MAX;

        this.maxCurrZoom = math.MIN;

        this._viewExtent = new Extent(new LonLat(180, 180), new LonLat(-180, -180));

        this._lodSize = CUR_LOD_SIZE;
        this._curLodSize = CUR_LOD_SIZE;
        this._minLodSize = MIN_LOD_SIZE;
        this._maxLodSize = MAX_LOD_SIZE;

        this.maxEqualZoomAltitude = params.maxEqualZoomAltitude || 15000000.0;
        this.minEqualZoomAltitude = params.minEqualZoomAltitude || 10000.0;
        this.minEqualZoomCameraSlope = params.minEqualZoomCameraSlope || 0.8;

        this._renderCompleted = false;
        this._renderCompletedActivated = false;

        this._terrainCompleted = false;
        this._terrainCompletedActivated = false;

        this._transitionOpacityEnabled = params.transitionOpacityEnabled != undefined ? params.transitionOpacityEnabled : true;
    }

    public get lodSize(): number {
        return this._lodSize;
    }

    public setLodSize(currentLodSize: number, minLodSize?: number, maxLodSize?: number) {
        this._maxLodSize = maxLodSize || this._maxLodSize;
        this._minLodSize = minLodSize || this._minLodSize;
        this._curLodSize = currentLodSize;
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;
    }

    public createEntityCollectionsTreeStrategy(layer: Vector, nodeCapacity: number): EntityCollectionsTreeStrategy {
        return new EntityCollectionsTreeStrategy(this, layer, nodeCapacity);
    }

    public destroyBranches() {
        this._renderCompletedActivated = false;
        this._terrainCompletedActivated = false;
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

    public get terrainReady(): boolean {
        return this._terrainCompleted && this._terrainCompletedActivated;
    }

    protected _checkRendercompleted() {
        if (this._renderCompleted) {
            if (!this._renderCompletedActivated) {
                this._renderCompletedActivated = true;
                this.events.dispatch(this.events.rendercompleted, true);
            }
        } else {
            this._renderCompletedActivated = false;
        }
        this._renderCompleted = true;

        if (this._terrainCompleted) {
            if (!this._terrainCompletedActivated) {
                this._terrainCompletedActivated = true;
                this.events.dispatch(this.events.terraincompleted, true);
            }
        } else {
            this._terrainCompletedActivated = false;
        }

        this._terrainCompleted = true;
    }

    protected _initEvents() {
        this.planet.renderer!.events.on("resize", () => {
            this._renderCompletedActivated = false;
            this._terrainCompletedActivated = false;
        });

        this.planet.renderer!.events.on("postdraw", () => {
            this._checkRendercompleted();
        });
    }

    public init(camera: PlanetCamera) {
        this._initEvents();
        this._renderedNodesInFrustum = new Array(camera.frustums.length);
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i] = [];
        }

        this.preRender();
        this.clearRenderedNodes();
        this.preLoad();
    }

    public clearRenderedNodes() {
        this._clearRenderedNodeList();
        this._clearRenderNodesInFrustum();
    }

    protected _clearRenderedNodeList() {
        this._renderedNodes.length = 0;
        this._renderedNodes = [];
    }

    protected _clearRenderNodesInFrustum() {
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i].length = 0;
            this._renderedNodesInFrustum[i] = [];
        }
    }

    protected _collectRenderedNodesMaxZoom(cam: PlanetCamera) {
        if (cam.slope > this.minEqualZoomCameraSlope && cam._lonLat.height < this.maxEqualZoomAltitude && cam._lonLat.height > this.minEqualZoomAltitude) {

            this.minCurrZoom = this.maxCurrZoom;

            let temp = this._renderedNodes,
                rf = this._renderedNodesInFrustum,
                temp2 = [];

            this._clearRenderNodesInFrustum();
            this._renderedNodes = [];

            for (let i = 0, len = temp.length; i < len; i++) {
                let ri = temp[i];
                let ht = ri.segment.centerNormal.dot(cam.getBackward());
                if (ri.segment.tileZoom === this.maxCurrZoom || ht < HORIZON_TANGENT) {
                    this._renderedNodes.push(ri);
                    let k = 0, inFrustum = ri.inFrustum;
                    while (inFrustum) {
                        if (inFrustum & 1) {
                            rf[k].push(ri);
                        }
                        k++;
                        inFrustum >>= 1;
                    }
                } else {
                    temp2.push(ri);
                }
            }

            for (let i = 0, len = temp2.length; i < len; i++) {
                temp2[i].renderTree(cam, this.maxCurrZoom, null, false, temp2[i]);
            }
        }
    }

    public set transitionOpacityEnabled(isEnabled: boolean) {
        this._transitionOpacityEnabled = isEnabled;
        //@todo: set render nodes transition opacity to one
    }

    public get transitionOpacityEnabled(): boolean {
        return this._transitionOpacityEnabled;
    }

    /**
     * Collects visible quad nodes.
     * @protected
     */
    public collectRenderNodes(cam: PlanetCamera) {

        if (this._skipPreRender) {

            this._lodSize = math.lerp(cam.slope < 0.0 ? 0.0 : cam.slope, this._curLodSize, this._minLodSize);
            cam._insideSegment = null;

            // clear first
            this._clearRenderedNodeList();
            this._clearRenderNodesInFrustum();

            this._viewExtent.southWest.set(180, 180);
            this._viewExtent.northEast.set(-180, -180);

            // todo: replace to camera
            this.minCurrZoom = math.MAX;
            this.maxCurrZoom = math.MIN;

            this._collectRenderNodes(cam);

            this._collectRenderedNodesMaxZoom(cam);

            // main camera effect
            this._fadingNodes.clear();

            if (this._transitionOpacityEnabled) {

                let opaqueNodes: Node[] = [];

                for (let i = 0; i < this._renderedNodes.length; i++) {
                    let ri = this._renderedNodes[i];
                    // it's not impossible to move the code into Node.addToRender, because
                    // we can't know actual state before _collectRenderedNodesMaxZoom pass
                    ri._collectFadingNodes();
                    ri._refreshTransitionOpacity();

                    if (ri.segment._transitionOpacity >= 1.0) {
                        ri.clearNeighbors();
                        ri.getRenderedNodesNeighbors(opaqueNodes);
                        opaqueNodes.push(ri);
                    } else {
                        for (let j = 0; j < ri._fadingNodes.length; j++) {
                            let rij = ri._fadingNodes[j];
                            if (rij.segment && rij.segment._transitionOpacity >= 1.0) {
                                rij.clearNeighbors();
                                rij.getRenderedNodesNeighbors(opaqueNodes);
                                opaqueNodes.push(rij);
                            }
                        }
                    }
                }
            }
        }

        this._skipPreRender = true;
    }

    public preRender() {
        this._skipPreRender = false;
        for (let i = 0; i < this._quadTreeList.length; i++) {

            let quadTree = this._quadTreeList[i];
            quadTree.createChildNodes();
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
            this.planet.normalMapCreator.drawSingle(quadTree.segment);

            for (let j = 0; j < quadTree.nodes.length; j++) {
                quadTree.nodes[j].segment.passReady = true;
                quadTree.nodes[j].renderNode(1);
                this.planet._normalMapCreator.drawSingle(quadTree.nodes[j].segment);
            }
        }
    }

    protected _clearVisibleNodes() {
        this._visibleNodes = {};
    }

    protected _collectRenderNodes(camera: PlanetCamera) {
        this._clearVisibleNodes();
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].renderTree(camera, 0, null);
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
            x: number,
            y: number,
            pz = (1 << z);

        x = getTileCellIndex(lonLat.lon, 360 / pz, -180);
        y = getTileCellIndex(lonLat.lat, 180 / pz, 90);

        return [x, y, z, TILEGROUP_COMMON];
    }

    public getLonLatTileOffset(lonLat: LonLat, x: number, y: number, z: number, gridSize: number): [number, number] {
        let extent: Extent;

        let worldExtent = Extent.createFromArray([-180, -90, 180, 90]);
        extent = getTileCellExtent(x, y, z, worldExtent);

        let sizeImgW = extent.getWidth() / (gridSize - 1),
            sizeImgH = extent.getHeight() / (gridSize - 1);

        let i = gridSize - Math.ceil((lonLat.lat - extent.southWest.lat) / sizeImgH) - 1,
            j = Math.floor((lonLat.lon - extent.southWest.lon) / sizeImgW);

        return [i, j];
    }

    public collectVisibleNode(node: Node) {
        this._visibleNodes[node.nodeId] = node;
    }
}

const QUADTREESTRATEGY_EVENTS: QuadTreeStrategyEventsList = [
    "rendercompleted",
    "terraincompleted"
]