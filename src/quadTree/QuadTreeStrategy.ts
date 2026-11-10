import { EPSG3857 } from "../proj/EPSG3857";
import { Layer } from "../layer/Layer";
import { Vector } from "../layer/Vector";
import { Node } from "../quadTree/Node";
import { MAX_RENDERED_NODES, NE, NW, SE, SW } from "../quadTree/quadTree";
import { Planet } from "../scene/Planet";
import { Proj } from "../proj/Proj";
import { LonLat } from "../LonLat";
import { getTileCellExtent, getTileCellIndex, Segment, TILEGROUP_COMMON } from "../segment/Segment";
import { Extent } from "../Extent";
import { EntityCollectionsTreeStrategy } from "./EntityCollectionsTreeStrategy";
import { PlanetCamera } from "../camera";
import type { Camera } from "../camera/Camera";
import type { DepthCamera } from "../renderer/depthCamera/DepthCamera";
import * as math from "../math";
import { createEvents, EventsHandler } from "../Events";

export type QuadTreeStrategyEventsList = ["rendercompleted", "terraincompleted"];

const CUR_LOD_SIZE = 256; //px
const MIN_LOD_SIZE = 512; //px
const MAX_LOD_SIZE = 256; //px

const HORIZON_TANGENT = 0.81;

const __emptyArray__: readonly Node[] = [];

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

    public maxZoomLimit: number = 50;

    public name: string;
    public projection: Proj;
    public readonly planet: Planet;

    public disableNeighbors: boolean = false;

    /**
     * Width of a root tile in degrees of longitude, a tile of the zoom is 2^zoom times narrower. The native zoom of
     * a raster source is found by it.
     * @public
     * @type {number}
     */
    public rootTileWidth: number = 360;

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

    /**
     * Geocentric distance range of the terrain collected for the current rendering frame.     * @public
     * @type {number}
     */
    public minTerrainRadius: number = 0;
    public maxTerrainRadius: number = 0;

    public _minTerrainRadiusAcc: number = Infinity;
    public _maxTerrainRadiusAcc: number = -Infinity;

    public _renderedNodesInFrustum: Node[][];

    /**
     * Squared distance from the camera to the horizon of the highest terrain point.
     * @public
     * @type {number}
     */
    public _horizonDist2: number = 0;

    public _fadingNodes: Map<number, Node>;

    public _fadingOpaqueSegments: Segment[];

    public _transparentSegments: Segment[];

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

    public _renderCompleted: boolean;
    public _renderCompletedActivated: boolean;

    public _terrainCompleted: boolean;
    public _terrainCompletedActivated: boolean;

    protected _skipPreRender: boolean = false;

    /**
     * Opaque nodes collected for the renderer depth cameras, [depth camera index][frustumIndex].
     * @public
     */
    public _viewCamerasRenderedNodes: Node[][][] = [];

    /**
     * View camera collection counter, a node gone through by the last collection is marked with it.
     * @public
     */
    public _viewWalkFrame: number = 0;

    /**
     * Neighbor search counter, an opaque node of the current frame is marked with it.
     * @public
     */
    public _neighborFrame: number = 0;

    /**
     * True in a frame the segment corners can have changed in, see Segment._equalizeCorner.
     * @public
     */
    public _cornersChanged: boolean = true;

    /**
     * Set by a segment that has moved its corner, the others see it in the next frame.
     * @public
     */
    public _cornerMoved: boolean = false;

    protected _opaqueNodesIds: number[] = [];

    /**
     * Normal map creator version the normal map edges were compared at, see Segment._checkNormalMapEdges.
     */
    protected _normalMapEdgesVersion: number = -1;

    /**
     * False while a node only the view cameras render waits for its terrain. Keeps the frames coming in the
     * idle mode, apart from _terrainCompleted, which stays about the main camera view.
     * @public
     */
    public _viewCamerasTerrainCompleted: boolean = true;

    constructor(params: QuadTreeStrategyParams) {
        this.events = createEvents<QuadTreeStrategyEventsList>(QUADTREESTRATEGY_EVENTS);

        this.name = params.name || "";
        this.projection = params.proj || EPSG3857;
        this.planet = params.planet;
        this._quadTreeList = [];
        this._visibleNodes = {};

        this._renderedNodes = [];
        this._renderedNodesInFrustum = [];

        this._fadingNodes = new Map<number, Node>();
        this._fadingOpaqueSegments = [];
        this._transparentSegments = [];

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

        this._transitionOpacityEnabled =
            params.transitionOpacityEnabled != undefined ? params.transitionOpacityEnabled : true;
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
        this.planet.renderer?.requestRedraw();
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
        this.planet.renderer?.requestRedraw();
    }

    /**
     * clears layer material from the quad tree list.
     * @param layer
     * @param keepRendered if true, keeps materials that are currently rendered.
     */
    public clearLayerMaterial(layer: Layer, keepRendered: boolean = false) {
        let lid = layer.__id;
        for (let i = 0, len = this._quadTreeList.length; i < len; i++) {
            this._quadTreeList[i].traverseTree((node: Node) => {
                if (keepRendered && this._renderedNodes.includes(node)) {
                    return;
                }
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

    /**
     * Returns true when every rendered segment has got its materials applied and
     * the completion has already been announced.
     * @public
     * @returns {boolean}
     */
    public get renderReady(): boolean {
        return this._renderCompleted && this._renderCompletedActivated;
    }

    protected _checkRendercompleted() {
        if (!this.renderReady || !this.terrainReady || !this._viewCamerasTerrainCompleted) {
            this.planet.renderer!.requestRedraw();
        }

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

    protected _updateRenderedNodesInFrustumArray(camera: PlanetCamera) {
        this._renderedNodesInFrustum = new Array(camera.frustums.length);
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i] = [];
        }
    }

    public init(camera: PlanetCamera) {
        this._initEvents();

        this._updateRenderedNodesInFrustumArray(camera);

        camera.events.on("frustumschanged", () => {
            this._updateRenderedNodesInFrustumArray(camera);
        });

        this.preRender();
        this.clearRenderedNodes();
        this.preLoad();
    }

    public clearRenderedNodes() {
        this._clearRenderedNodeList();
        this._clearRenderNodesInFrustum();
        for (let i = 0; i < this._viewCamerasRenderedNodes.length; i++) {
            this._clearViewCameraRenderedNodes(i);
        }
        this.planet.renderer?.requestRedraw();
    }

    /**
     * Nodes of a renderer depth camera: where it sees the main camera nodes it gets the same ones, elsewhere
     * nodes chosen with the main camera LOD.
     * @public
     * @param {number} slot - Depth camera index in the renderer depth camera handler.
     * @param {number} [frustumIndex=0] - Depth camera frustum index.
     */
    public getViewCameraRenderedNodes(slot: number, frustumIndex: number = 0): readonly Node[] {
        const rn = this._viewCamerasRenderedNodes[slot];
        return (rn && rn[frustumIndex]) || __emptyArray__;
    }

    protected _clearViewCameraRenderedNodes(slot: number) {
        const rn = this._viewCamerasRenderedNodes[slot];
        if (!rn) return;
        for (let i = 0; i < rn.length; i++) {
            rn[i].length = 0;
        }
    }

    public _addViewCameraNode(slot: number, node: Node, inFrustum: number) {
        const rf = this._viewCamerasRenderedNodes[slot];
        let k = 0;
        while (inFrustum) {
            if (inFrustum & 1) {
                rf[k].push(node);
            }
            k++;
            inFrustum >>= 1;
        }
    }

    /**
     * Mask of the view camera frustums whose node lists are not full yet.
     * @public
     */
    public _getViewCameraOpenFrustums(slot: number): number {
        const rf = this._viewCamerasRenderedNodes[slot];
        let mask = 0;
        for (let i = 0; i < rf.length; i++) {
            if (rf[i].length < MAX_RENDERED_NODES) {
                mask |= 1 << i;
            }
        }
        return mask;
    }

    protected _addViewCameraOpaqueNode(slot: number, camera: Camera, frustumMask: number, node: Node) {
        const inFrustum = node.getFrustumMask(camera) & frustumMask;
        if (inFrustum) {
            this._addViewCameraNode(slot, node, inFrustum);
        }
    }

    /**
     * Runs after the main collection is complete. Takes the opaque main nodes the view camera sees, then walks
     * the tree for the parts the main camera has not rendered, never going under a main rendered node.
     * @protected
     */
    protected _collectViewCamerasRenderNodes(mainCamera: PlanetCamera) {
        const planet = this.planet;

        const depthCameras: DepthCamera[] =
            planet.renderer && !planet.disableDepthCamera && planet.quadTreeStrategy === this
                ? planet.renderer.depthCameraHandler._depthCameras
                : [];

        const lists = this._viewCamerasRenderedNodes;

        lists.length = depthCameras.length;

        this._viewWalkFrame++;
        this._viewCamerasTerrainCompleted = true;

        const mainState = this._renderedNodes.length < MAX_RENDERED_NODES;

        for (let slot = 0; slot < depthCameras.length; slot++) {
            const dc = depthCameras[slot];
            const rf = lists[slot] || (lists[slot] = []);

            if (!dc.enabled || !dc.initialized) {
                rf.length = 0;
                continue;
            }

            const camera = dc.camera;
            const frustumMask = dc.frustumMask;

            for (let i = rf.length; i < camera.frustums.length; i++) {
                rf[i] = [];
            }

            rf.length = camera.frustums.length;
            this._clearViewCameraRenderedNodes(slot);

            if (mainState) {
                const rn = this._renderedNodes;

                for (let i = 0; i < rn.length; i++) {
                    const ri = rn[i];
                    if (!this._transitionOpacityEnabled || ri.segment._transitionOpacity >= 1.0) {
                        this._addViewCameraOpaqueNode(slot, camera, frustumMask, ri);
                    }
                }

                // The opaque nodes shown instead of the fading in ones, each of them once. Exactly 1 is the frame the
                // fading in node has become opaque itself and is taken above.
                for (const fj of this._fadingNodes.values()) {
                    if (fj.segment && fj.segment._transitionOpacity > 1.0) {
                        this._addViewCameraOpaqueNode(slot, camera, frustumMask, fj);
                    }
                }
            }

            this._collectViewRenderNodes(slot, camera, frustumMask, mainCamera, mainState);
        }
    }

    protected _clearRenderedNodeList() {
        this._renderedNodes.length = 0;
        this._renderedNodes = [];
    }

    protected _clearRenderNodesInFrustum() {
        1;
        for (let i = 0, len = this._renderedNodesInFrustum.length; i < len; i++) {
            this._renderedNodesInFrustum[i].length = 0;
            this._renderedNodesInFrustum[i] = [];
        }
    }

    protected _collectRenderedNodesMaxZoom(cam: PlanetCamera) {
        if (
            cam.isOrthographic ||
            (cam.slope > this.minEqualZoomCameraSlope &&
                cam._lonLat.height < this.maxEqualZoomAltitude &&
                cam._lonLat.height > this.minEqualZoomAltitude)
        ) {
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
                    let k = 0,
                        inFrustum = ri.inFrustum;
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

            this._minTerrainRadiusAcc = Infinity;
            this._maxTerrainRadiusAcc = -Infinity;

            this._updateHorizonDist(cam);

            this._collectRenderNodes(cam);

            if (this._minTerrainRadiusAcc <= this._maxTerrainRadiusAcc) {
                this.minTerrainRadius = this._minTerrainRadiusAcc;
                this.maxTerrainRadius = this._maxTerrainRadiusAcc;
            }

            if (this.maxCurrZoom === math.MIN) {
                this.minCurrZoom = 0;
                this.maxCurrZoom = 0;
            }

            this._collectRenderedNodesMaxZoom(cam);

            // main camera effect
            this._fadingNodes.clear();

            const opaqueNodes: Node[] = [];

            this._neighborFrame++;

            if (this._transitionOpacityEnabled) {
                for (let i = 0; i < this._renderedNodes.length; i++) {
                    let ri = this._renderedNodes[i];
                    // it's not impossible to move the code into Node.addToRender, because
                    // we can't know actual state before _collectRenderedNodesMaxZoom pass
                    ri._collectFadingNodes();
                    ri._refreshTransitionOpacity();

                    if (ri.segment._transitionOpacity >= 1.0) {
                        this._addOpaqueNode(opaqueNodes, ri);
                    } else {
                        for (let j = 0; j < ri._fadingNodes.length; j++) {
                            let rij = ri._fadingNodes[j];
                            if (rij.segment && rij.segment._transitionOpacity >= 1.0) {
                                this._addOpaqueNode(opaqueNodes, rij);
                            }
                        }
                    }
                }
            } else {
                for (let i = 0; i < this._renderedNodes.length; i++) {
                    this._addOpaqueNode(opaqueNodes, this._renderedNodes[i]);
                }
            }

            this._linkOpaqueNodes(opaqueNodes);

            this._collectViewCamerasRenderNodes(cam);
        }

        this._skipPreRender = true;
    }

    /**
     * Takes the node into the opaque nodes of the frame, the neighbors are searched among them. A parent fading
     * under its children comes here from each of them, it is taken once.
     * @protected
     */
    protected _addOpaqueNode(opaqueNodes: Node[], node: Node) {
        if (node._neighborFrame !== this._neighborFrame) {
            node._neighborFrame = this._neighborFrame;
            node.clearNeighbors();
            opaqueNodes.push(node);
        }
    }

    protected _linkOpaqueNodes(opaqueNodes: Node[]) {
        if (this.disableNeighbors) return;

        const ids = this._opaqueNodesIds;

        let changed = this._cornerMoved || ids.length !== opaqueNodes.length;

        for (let i = 0; i < opaqueNodes.length; i++) {
            const ni = opaqueNodes[i];
            ni.getRenderedNodesNeighbors(this._neighborFrame);
            changed = changed || ids[i] !== ni.__id || ni.segment.readyToEngage;
            ids[i] = ni.__id;
        }

        ids.length = opaqueNodes.length;

        // The edges change only with the nodes on the screen or with a new normal map
        const terrain = this.planet && this.planet.terrain,
            nmc = this.planet && this.planet._normalMapCreator;
        if (terrain && terrain.equalizeNormals && nmc && (changed || nmc.__version__ !== this._normalMapEdgesVersion)) {
            this._normalMapEdgesVersion = nmc.__version__;
            for (let i = 0; i < opaqueNodes.length; i++) {
                opaqueNodes[i].segment._checkNormalMapEdges();
            }
        }

        this._cornersChanged = changed;
        this._cornerMoved = false;
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

    /**
     * Calculates the distance from the camera to the horizon of the highest terrain point: a point farther than it
     * is under the horizon. Used in renderTree to skip rendering of segments that are under the horizon.
     * @protected
     */
    protected _updateHorizonDist(cam: PlanetCamera) {
        this._horizonDist2 = this._getHorizonDist2(cam);
    }

    protected _getHorizonDist2(cam: Camera): number {
        let planet = this.planet,
            r = planet.ellipsoid.polarSize,
            h = (planet.terrain ? planet.terrain.getMaxHeight() : 0) * planet._heightFactor,
            eyeHorizon2 = cam.eye.length2() - r * r,
            d = Math.sqrt(eyeHorizon2 > 0 ? eyeHorizon2 : 0) + Math.sqrt(2 * r * h + h * h);
        return d * d;
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

    /**
     * The tree traversal of a view camera, it runs after the main camera one.
     * @protected
     */
    protected _collectViewRenderNodes(
        slot: number,
        camera: Camera,
        frustumMask: number,
        mainCamera: PlanetCamera,
        mainState: boolean
    ) {
        const horizonDist2 = camera.isOrthographic ? Infinity : this._getHorizonDist2(camera);

        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].renderViewCameraTree(
                slot,
                camera,
                frustumMask,
                mainCamera,
                horizonDist2,
                mainState,
                null
            );
        }
    }

    /**
     * Destroys the branches the main camera does not render.
     * @public
     * @param {boolean} [keepViewCameraBranches=false] - Keeps the branches leading to the nodes the depth cameras
     * render now. They are under the nodes the main camera has not gone into, and would be made and loaded again.
     */
    public clear(keepViewCameraBranches: boolean = false) {
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].clearTree(keepViewCameraBranches);
        }
    }

    public get quadTreeList(): Node[] {
        return this._quadTreeList;
    }

    /**
     * Returns the most detailed node made under the point, not deeper than the zoom.
     * @public
     * @param {LonLat} lonLat - Point.
     * @param {number} [zoom] - Maximal node zoom.
     * @returns {Node | null} -
     */
    public getNodeByLonLat(lonLat: LonLat, zoom: number = Infinity): Node | null {
        let node: Node | undefined = this._quadTreeList.find((root) => root.segment.isLonLatInside(lonLat));

        if (!node) {
            return null;
        }

        let p = node.segment.projectNative(lonLat);

        while (node.nodes.length && node.segment.tileZoom < zoom) {
            let e: Extent = node.segment._extent,
                isEast = p.lon >= (e.southWest.lon + e.northEast.lon) * 0.5,
                isSouth = p.lat < (e.southWest.lat + e.northEast.lat) * 0.5;
            node = node.nodes[isSouth ? (isEast ? SE : SW) : isEast ? NE : NW];
        }

        return node;
    }

    public getTileXY(lonLat: LonLat, zoom: number): [number, number, number, number] {
        let z = zoom,
            x: number,
            y: number,
            pz = 1 << z;

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

const QUADTREESTRATEGY_EVENTS: QuadTreeStrategyEventsList = ["rendercompleted", "terraincompleted"];
