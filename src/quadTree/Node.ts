import { Extent } from "../Extent";
import { binaryInsert, getMatrixSubArray32, getMatrixSubArray64, getMatrixSubArrayBoundsExt } from "../utils/shared";
import { getMedian } from "../terrain/terrainUtils";
import { LonLat } from "../LonLat";
import { MAX, MIN } from "../math";
import { Segment } from "../segment/Segment";
import { QuadTreeStrategy } from "./QuadTreeStrategy";

import { Vec2 } from "../math/Vec2";
import { Vec3 } from "../math/Vec3";
import {
    E,
    MAX_RENDERED_NODES,
    N,
    NE,
    NEIGHBOUR,
    NOPSORD,
    NOTRENDERING,
    NW,
    OPPART,
    OPSIDE,
    PARTOFFSET,
    RENDERING,
    ROOTPART,
    S,
    SE,
    SIDEFLIP,
    SW,
    W,
    WALKTHROUGH
} from "./quadTree";

import { PlanetCamera } from "../camera/PlanetCamera";
import type { Camera } from "../camera/Camera";

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

const _vertOrder: Vec2[] = [new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1), new Vec2(1, 1)];

const _neGridSize = Math.sqrt(_vertOrder.length) - 1;

type BoundsType = {
    xmin: number;
    ymin: number;
    zmin: number;
    xmax: number;
    ymax: number;
    zmax: number;
    // Squared geocentric distance range of the same vertices, see getMatrixSubArrayBoundsExt.
    r2min: number;
    r2max: number;
};

let BOUNDS: BoundsType = {
    xmin: 0.0,
    ymin: 0.0,
    zmin: 0.0,
    xmax: 0.0,
    ymax: 0.0,
    zmax: 0.0,
    r2min: 0.0,
    r2max: 0.0
};

// Squared vertex radii of the cut segment, their median is the LOD radius
let _r2 = new Float64Array(_vertOrder.length);

function getR2Buffer(count: number): Float64Array {
    if (_r2.length < count) {
        _r2 = new Float64Array(count);
    }
    return _r2;
}

// Node parts on the way up from the node, see Node._linkSideNeighbors
const _pathId: number[] = [];

let __staticCounter = 0;

/**
 * Quad tree planet segment node.
 * @constructor
 * @param {Segment} segmentPrototype - Planet segment node constructor.
 * @param {QuadTreeStrategy} quadTreeStrategy - Quad tree strategy handler.
 * @param {number} partId - NorthEast, SouthWest etc.
 * @param {Node} parent - Parent of this node.
 * @param {number} id - Tree node identifier (id * 4 + 1);
 * @param {number} tileZoom - Deep index of the quad tree.
 * @param {Extent} extent - Segment extent.
 */
class Node {
    public __id: number;
    public SegmentPrototype: typeof Segment;
    public quadTreeStrategy: QuadTreeStrategy;
    public parentNode: Node | null;
    public partId: number;
    public nodeId: number;
    public state: number | null;
    public prevState: number | null;
    public appliedTerrainNodeId: number;
    public sideSizeLog2: [number, number, number, number];
    public ready: boolean;
    public neighbors: [Node[], Node[], Node[], Node[]];
    public equalizedSideWithNodeId: number[];
    public nodes: [Node, Node, Node, Node] | [];
    public segment: Segment;
    public _cameraInside: boolean;
    public inFrustum: number;
    public _fadingNodes: Node[];

    /**
     * View camera collection the node was last gone through by, see QuadTreeStrategy._viewWalkFrame.
     */
    public _viewWalkFrame: number;

    /**
     * Neighbor search the node was last taken into as an opaque node, see QuadTreeStrategy._neighborFrame.
     */
    public _neighborFrame: number;

    /**
     * Root nodes behind the N, E, S and W sides of a root node, null on a side with no tree behind it.
     */
    public rootNeighbors: [Node | null, Node | null, Node | null, Node | null] | null;

    constructor(
        SegmentPrototype: typeof Segment,
        quadTreeStrategy: QuadTreeStrategy,
        partId: number,
        parent: Node | null,
        tileZoom: number,
        extent: Extent
    ) {
        quadTreeStrategy.planet._createdNodesCount++;

        this.__id = __staticCounter++;

        this.SegmentPrototype = SegmentPrototype;
        this.quadTreeStrategy = quadTreeStrategy;
        this.parentNode = parent;
        this.partId = partId;
        this.nodeId = partId + (parent ? parent.nodeId * 4 + 1 : 0);
        this.state = null;
        this.prevState = null;
        this.appliedTerrainNodeId = -1;
        this.sideSizeLog2 = [0, 0, 0, 0];
        this.ready = false;
        this.neighbors = [[], [], [], []];
        this.equalizedSideWithNodeId = [this.nodeId, this.nodeId, this.nodeId, this.nodeId];
        this.nodes = [];
        this.segment = new SegmentPrototype(this, quadTreeStrategy, tileZoom, extent);
        this._cameraInside = false;
        this.inFrustum = 0;
        this._fadingNodes = [];
        this._viewWalkFrame = -1;
        this._neighborFrame = -1;
        this.rootNeighbors = null;
        this.createBounds();
    }

    public createChildNodes() {
        this.ready = true;
        const qts = this.quadTreeStrategy;
        const ps = this.segment;
        const ext = ps._extent;
        const z = ps.tileZoom + 1;
        const size_x = ext.getWidth() * 0.5;
        const size_y = ext.getHeight() * 0.5;
        const ne = ext.northEast;
        const sw = ext.southWest;
        const c = new LonLat(sw.lon + size_x, sw.lat + size_y);
        const nd = this.nodes;

        nd[NW] = new Node(
            this.SegmentPrototype,
            qts,
            NW,
            this,
            z,
            new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat))
        );
        nd[NE] = new Node(this.SegmentPrototype, qts, NE, this, z, new Extent(c, new LonLat(ne.lon, ne.lat)));
        nd[SW] = new Node(this.SegmentPrototype, qts, SW, this, z, new Extent(new LonLat(sw.lon, sw.lat), c));
        nd[SE] = new Node(
            this.SegmentPrototype,
            qts,
            SE,
            this,
            z,
            new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y))
        );
    }

    public createBounds() {
        let seg = this.segment;

        seg._setExtentLonLat();

        if (seg.tileZoom === 0) {
            seg.setBoundingSphere(0.0, 0.0, 0.0, new Vec3(0.0, 0.0, seg.planet.ellipsoid.equatorialSize));
        } else if (seg.tileZoom < seg.planet.terrain!.minZoom) {
            seg.createBoundsByExtent();
        } else {
            seg.createBoundsByParent();
        }

        let x = seg.bsphere.center.x,
            y = seg.bsphere.center.y,
            z = seg.bsphere.center.z;

        let length = 1.0 / Math.sqrt(x * x + y * y + z * z);
        seg.centerNormal.x = x * length;
        seg.centerNormal.y = y * length;
        seg.centerNormal.z = z * length;

        // Initial relative center is the same as bounding sphere center
        seg._relativeCenter.set(x, y, z);

        seg._createPlainBounds();
    }

    public getState(): number | null {
        if (this.state === -1) {
            return this.state;
        }
        let pn = this.parentNode;
        while (pn) {
            if (pn.state !== WALKTHROUGH) {
                return NOTRENDERING;
            }
            pn = pn.parentNode;
        }
        return this.state;
    }

    /**
     * Returns the same deep existent neighbour node.
     * @public
     * @param {number} side - Neighbour side index e.g. og.quadTree.N, og.quadTree.W etc.
     * @returns {Node} -
     */
    public getEqualNeighbor(side: number): Node | undefined {
        let pn: Node = this;
        let part = NEIGHBOUR[side][pn.partId];
        if (part !== -1) {
            // (!) it means that we would never ask to get head node neighbors
            return pn.parentNode!.nodes[part];
        } else {
            let pathId = [];
            while (pn.parentNode) {
                pathId.push(pn.partId);
                part = NEIGHBOUR[side][pn.partId];
                pn = pn.parentNode;
                if (part !== -1) {
                    let i = pathId.length;
                    side = OPSIDE[side];
                    while (pn && i--) {
                        part = OPPART[side][pathId[i]];
                        pn = pn.nodes[part];
                    }
                    return pn;
                }
            }
        }
    }

    public traverseNodes(
        cam: PlanetCamera,
        maxZoom?: number | null,
        terrainReadySegment?: Segment | null,
        stopLoading?: boolean,
        zoomPassNode?: Node
    ) {
        if (!this.ready) {
            this.createChildNodes();
        }

        let n = this.nodes;

        n[0]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[1]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[2]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[3]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
    }

    public renderTree(
        cam: PlanetCamera,
        maxZoom?: number | null,
        terrainReadySegment?: Segment | null,
        stopLoading?: boolean,
        zoomPassNode?: Node
    ) {
        if (this.quadTreeStrategy._renderedNodes.length >= MAX_RENDERED_NODES) {
            return;
        }

        if (!maxZoom || (zoomPassNode && this.segment.tileZoom > zoomPassNode.segment.tileZoom)) {
            this.prevState = this.state;
        }
        this.state = WALKTHROUGH;

        this.clearNeighbors();

        let seg = this.segment;

        this._cameraInside = false;

        // Search a node which the camera is flying over.
        if (!this.parentNode || this.parentNode._cameraInside) {
            if (seg._extent.isInside(seg.getInsideLonLat(cam))) {
                cam._insideSegment = seg;
                this._cameraInside = true;
            }
        }

        this.inFrustum = 0;

        let frustums = cam.frustums,
            numFrustums = frustums.length;

        if (seg.tileZoom < 6) {
            for (let i = 0; i < numFrustums; i++) {
                if (frustums[i].containsSphere(seg.bsphere)) {
                    this.inFrustum |= 1 << i;
                }
            }
        } else {
            for (let i = 0; i < numFrustums; i++) {
                if (seg.terrainReady) {
                    if (frustums[i].containsBox(seg.bbox)) {
                        this.inFrustum |= 1 << i;
                    }
                } else {
                    if (frustums[i].containsSphere(seg.bsphere)) {
                        this.inFrustum |= 1 << i;
                    }
                }
            }
        }

        if (this.inFrustum || this._cameraInside || seg.tileZoom < 3) {
            let h = Math.abs(cam._lonLat.height);

            let horizonDist = this.quadTreeStrategy._horizonDist2;

            let altVis =
                seg.tileZoom < 2 ||
                seg.tileZoom > 19 ||
                /* Could be replaced with camera frustum always looking down check,
                and not to go through nodes from the opposite of the globe*/
                (seg.tileZoom < 6 && !seg.terrainReady);

            //
            // It brakes depth camera
            //
            // if (cam.isOrthographic) {
            //     let f = cam.getForward();
            //     altVis =
            //         altVis ||
            //         f.dot(seg._sw.getNormal()) < -0 ||
            //         f.dot(seg._nw.getNormal()) < -0 ||
            //         f.dot(seg._ne.getNormal()) < -0 ||
            //         f.dot(seg._se.getNormal()) < -0;
            // } else {
            altVis =
                altVis ||
                cam.eye.distance2(seg._sw) < horizonDist ||
                cam.eye.distance2(seg._nw) < horizonDist ||
                cam.eye.distance2(seg._ne) < horizonDist ||
                cam.eye.distance2(seg._se) < horizonDist;
            //}

            if ((this.inFrustum && (altVis || h > 10000.0)) || this._cameraInside) {
                this.quadTreeStrategy.collectVisibleNode(this);
            }

            if (seg.tileZoom < 2) {
                this.traverseNodes(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
            } else if (
                seg.terrainReady &&
                ((!maxZoom && cam.projectedSize(seg.lodCenter, seg._plainRadius) < this.quadTreeStrategy.lodSize) ||
                    (maxZoom && (seg.tileZoom === maxZoom || !altVis)))
            ) {
                if (altVis) {
                    seg.passReady = true;
                    this.renderNode(this.inFrustum, !this.inFrustum, terrainReadySegment, stopLoading);
                } else {
                    this.state = NOTRENDERING;
                }
            } else if (
                seg.terrainReady &&
                seg.checkZoom() &&
                (!maxZoom || cam.projectedSize(seg.lodCenter, seg._plainRadius) > this.quadTreeStrategy._maxLodSize)
            ) {
                if (seg.tileZoom < this.quadTreeStrategy.maxZoomLimit) {
                    this.traverseNodes(cam, maxZoom, seg, stopLoading, zoomPassNode);
                } else {
                    this.renderNode(this.inFrustum, !this.inFrustum, terrainReadySegment, stopLoading);
                }
            } else if (altVis) {
                seg.passReady = maxZoom ? seg.terrainReady : false;
                this.renderNode(this.inFrustum, !this.inFrustum, terrainReadySegment, stopLoading);
            } else {
                this.state = NOTRENDERING;
            }
        } else {
            this.state = NOTRENDERING;
        }
    }

    /**
     * Bit mask of the camera frustums the node is in, the same test renderTree makes.
     * @public
     * @param {Camera} cam - Camera.
     * @returns {number} -
     */
    public getFrustumMask(cam: Camera): number {
        const seg = this.segment,
            frustums = cam.frustums,
            useBox = seg.tileZoom >= 6 && seg.terrainReady;

        let mask = 0;
        for (let i = 0, len = frustums.length; i < len; i++) {
            if (useBox ? frustums[i].containsBox(seg.bbox) : frustums[i].containsSphere(seg.bsphere)) {
                mask |= 1 << i;
            }
        }

        return mask;
    }

    /**
     * Tree traversal of a view (depth) camera, after the main camera one. While mainState is true the node state
     * was set by the main traversal in this frame: it stops at the main rendered nodes (the strategy takes them)
     * and goes down where the main camera went down. Elsewhere the nodes are chosen by the main camera LOD and the
     * node state is not read anymore. It never changes the node state.
     * @public
     */
    public renderViewCameraTree(
        slot: number,
        cam: Camera,
        frustumMask: number,
        mainCamera: PlanetCamera,
        horizonDist2: number,
        mainState: boolean,
        terrainReadySegment: Segment | null
    ) {
        const qts = this.quadTreeStrategy;

        const openFrustums = qts._getViewCameraOpenFrustums(slot);
        if (!openFrustums) {
            return;
        }

        const inFrustum = this.getFrustumMask(cam) & frustumMask & openFrustums;
        if (!inFrustum) {
            return;
        }

        const seg = this.segment;
        let goDown: boolean;

        if (mainState && this.state === RENDERING) {
            return;
        } else if (mainState && this.state === WALKTHROUGH) {
            goDown = true;
        } else {
            mainState = false;

            const altVis =
                seg.tileZoom < 2 ||
                seg.tileZoom > 19 ||
                (seg.tileZoom < 6 && !seg.terrainReady) ||
                cam.eye.distance2(seg._sw) < horizonDist2 ||
                cam.eye.distance2(seg._nw) < horizonDist2 ||
                cam.eye.distance2(seg._ne) < horizonDist2 ||
                cam.eye.distance2(seg._se) < horizonDist2;

            if (!altVis) {
                return;
            }

            goDown =
                seg.tileZoom < 2 ||
                (seg.terrainReady &&
                    seg.tileZoom < qts.maxZoomLimit &&
                    mainCamera.projectedSize(seg.lodCenter, seg._plainRadius) >= qts.lodSize &&
                    seg.checkZoom());
        }

        if (goDown) {
            this._viewWalkFrame = qts._viewWalkFrame;

            if (!this.ready) {
                this.createChildNodes();
            }

            const n = this.nodes,
                trs = seg.terrainReady ? seg : terrainReadySegment;

            for (let i = 0; i < n.length; i++) {
                n[i].renderViewCameraTree(slot, cam, frustumMask, mainCamera, horizonDist2, mainState, trs);
            }
        } else {
            // Terrain loading part of renderNode. Forced, because the terrain loader drops the requests of the nodes
            // the main traversal has marked NOTRENDERING, and that is where the view camera own nodes are.
            if (!seg.terrainReady) {
                qts._viewCamerasTerrainCompleted = false;
                if (!seg.initialized) {
                    seg.initialize();
                }
                this.whileTerrainLoading(terrainReadySegment);
                if (!seg.plainProcessing) {
                    seg.createPlainSegmentAsync();
                }
                if (seg.plainReady) {
                    seg.loadTerrain(true);
                }
            }
            qts._addViewCameraNode(slot, this, inFrustum);
        }
    }

    public renderNode(
        inFrustum: number,
        onlyTerrain?: boolean,
        terrainReadySegment?: Segment | null,
        stopLoading?: boolean
    ) {
        let seg = this.segment;

        // Create and load terrain data
        if (!seg.terrainReady) {
            if (!seg.initialized) {
                seg.initialize();
            }

            this.whileTerrainLoading(terrainReadySegment);

            if (!seg.plainProcessing) {
                seg.createPlainSegmentAsync();
            }

            if (seg.plainReady && !stopLoading) {
                seg.loadTerrain();
            }
        }

        // Create normal map texture
        if (!seg.normalMapReady) {
            this.whileNormalMapCreating();
        }

        if (onlyTerrain) {
            this.state = -1;
            return;
        }

        // Calculate minimal and maximal zoom index on the screen
        if (!this._cameraInside && seg.tileZoom > this.quadTreeStrategy.maxCurrZoom) {
            this.quadTreeStrategy.maxCurrZoom = seg.tileZoom;
        }

        if (seg.tileZoom < this.quadTreeStrategy.minCurrZoom) {
            this.quadTreeStrategy.minCurrZoom = seg.tileZoom;
        }

        seg._addViewExtent();

        // Finally this node proceeds to rendering.
        this.addToRender(inFrustum);
    }

    public childrenPrevStateEquals(state: number): boolean {
        let n = this.nodes;
        return (
            n.length === 4 &&
            n[0].prevState === state &&
            n[1].prevState === state &&
            n[2].prevState === state &&
            n[3].prevState === state
        );
    }

    /**
     * Returns true if the node is rendered, or fades in or out after a level of detail change.
     * @public
     * @returns {boolean} -
     */
    public isRenderedOrFading(): boolean {
        return this.getState() === RENDERING || this.isInFadingTransition();
    }

    /**
     * Returns true if the node is drawn this frame as a fading node of a level of detail change:
     * a parent fading out after zooming in, or a child fading out after zooming out.
     * Unlike isFading(), it also covers the fading children, whose state is NOTRENDERING.
     * @public
     * @returns {boolean} -
     */
    public isInFadingTransition(): boolean {
        return this.quadTreeStrategy._fadingNodes.has(this.__id);
    }

    public isFading(): boolean {
        let n = this.nodes;
        return (
            this.state === WALKTHROUGH &&
            this.segment._transitionOpacity > 0.0 &&
            n.length === 4 &&
            n[0].state === RENDERING &&
            n[1].state === RENDERING &&
            n[2].state === RENDERING &&
            n[3].state === RENDERING
        );
    }

    public _collectFadingNodes() {
        if (this.segment.tileZoom < 3) {
            this.segment._transitionOpacity = 1.0;
            return;
        }

        // Light up the node
        if (this.prevState !== RENDERING) {
            // means that the node is lighting up
            this.segment._transitionOpacity = 0.0;

            // store fading nodes, could be a parent or children nodes
            this._fadingNodes = [];

            let timestamp = window.performance.now();
            this.segment._transitionTimestamp = timestamp;

            if (this.parentNode) {
                // Parent was visible the last frame, make the parent fading
                if (this.parentNode.prevState === RENDERING) {
                    let pn: Node | null = this.parentNode.parentNode;
                    while (pn) {
                        if (pn.isFading()) {
                            for (let i = 0; i < pn.nodes.length; i++) {
                                pn.nodes[i].segment._transitionOpacity = 1.0;
                                pn.nodes[i]._fadingNodes = [];
                            }
                            pn.segment._transitionOpacity = 0.0;
                            break;
                        }
                        pn = pn.parentNode;
                    }

                    // not sure that it's necessary here
                    this.parentNode.whileTerrainLoading();

                    this._fadingNodes.push(this.parentNode);
                    this.parentNode.segment._transitionOpacity = 2.0;
                    this.parentNode.segment._transitionTimestamp = timestamp;
                } else {
                    // Check if the children were visible last frame, and make them fading
                    if (this.segment.childrenInitialized() && this.childrenPrevStateEquals(RENDERING)) {
                        for (let i = 0; i < this.nodes.length; i++) {
                            let ni = this.nodes[i];

                            // not sure that it's necessary here
                            ni.whileTerrainLoading();

                            this._fadingNodes.push(ni);
                            ni.segment._transitionOpacity = 2.0;
                            ni.segment._transitionTimestamp = timestamp;
                            ni.prevState = ni.state;
                            ni.state = NOTRENDERING;
                        }
                    }
                }
            }
        }
    }

    public clearNeighbors() {
        //this.sideSizeLog2[0] = this.sideSizeLog2[1] = this.sideSizeLog2[2] = this.sideSizeLog2[3] = Math.log2(this.segment.gridSize);
        if (this.neighbors) {
            // @ts-ignore
            this.neighbors[0] = this.neighbors[1] = this.neighbors[2] = this.neighbors[3] = null;

            this.neighbors[0] = [];
            this.neighbors[1] = [];
            this.neighbors[2] = [];
            this.neighbors[3] = [];
        }
    }

    public _refreshTransitionOpacity() {
        if (this._fadingNodes.length === 0) {
            this.segment._transitionOpacity = 1.0;
        } else {
            if (this._fadingNodes.length === 4 && !this.childrenPrevStateEquals(RENDERING)) {
                this.segment._transitionOpacity = 1.0;
                this._fadingNodes = [];
            } else {
                // Looks like a bug fix for suddenly empty spaces
                for (let i = 0; i < this._fadingNodes.length; i++) {
                    if (
                        this.segment._transitionOpacity < 1.0 &&
                        this._fadingNodes[i].segment._transitionOpacity === 0
                    ) {
                        this._fadingNodes[i].segment._transitionOpacity = 0;
                        this.segment._transitionOpacity = 1.0;
                    }
                }
                this.segment.increaseTransitionOpacity();
            }
        }
    }

    /**
     * Picking up current node to render processing.
     * @public
     */
    public addToRender(inFrustum: number) {
        this.state = RENDERING;

        let seg = this.segment,
            qts = this.quadTreeStrategy;

        if (seg.maxTerrainRadius > 0) {
            if (seg.minTerrainRadius < qts._minTerrainRadiusAcc) {
                qts._minTerrainRadiusAcc = seg.minTerrainRadius;
            }
            if (seg.maxTerrainRadius > qts._maxTerrainRadiusAcc) {
                qts._maxTerrainRadiusAcc = seg.maxTerrainRadius;
            }
        }

        let nodes = this.quadTreeStrategy._renderedNodes;

        //@ts-ignore
        if (!this.quadTreeStrategy._transitionOpacityEnabled) {
            nodes.push(this);
        } else {
            //@todo: check if it's possible to get rid of the sorting when using breadth traverse tree
            binaryInsert(nodes, this, (a: Node, b: Node) => {
                return a.segment.tileZoom - b.segment.tileZoom;
            });
        }

        if (!this.segment.terrainReady) {
            this.quadTreeStrategy._renderCompleted = false;
            this.quadTreeStrategy._terrainCompleted = false;
        }

        let k = 0,
            rf = this.quadTreeStrategy._renderedNodesInFrustum;
        while (inFrustum) {
            if (inFrustum & 1) {
                rf[k].push(this);
            }
            k++;
            inFrustum >>= 1;
        }
    }

    public applyNeighbor(node: Node, side: number) {
        const opcs = this.segment.opside[side];

        if (this.neighbors[side].length === 0 || node.neighbors[opcs].length === 0) {
            const ap = this.segment;
            const bp = node.segment;

            const ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.tileZoom - ap.tileZoom));

            let cs_size = ap.gridSize,
                opcs_size = bp.gridSize;

            if (ld > 1) {
                cs_size = Math.ceil(ap.gridSize / ld);
                opcs_size = bp.gridSize;
            } else if (ld < 1) {
                cs_size = ap.gridSize;
                opcs_size = Math.ceil(bp.gridSize * ld);
            }

            this.sideSizeLog2[side] = Math.log2(cs_size);
            node.sideSizeLog2[opcs] = Math.log2(opcs_size);
        }

        //@todo: fix dupe neighbors
        this.neighbors[side].push(node);
        node.neighbors[opcs].push(this);
    }

    /**
     * Links the node with its neighbors of the same or lower zoom among the nodes marked with the frame. The deeper
     * ones find this node themselves, as both sides of a pair are set by applyNeighbor.
     * @public
     * @param {number} frame - Neighbor search counter of the strategy.
     */
    public getRenderedNodesNeighbors(frame: number) {
        for (let side = N; side <= W; side++) {
            this._linkSideNeighbors(side, frame);
        }
    }

    /**
     * Climbs to the node that holds both this node and the tile next to it, or to the neighbor tree when the side
     * lies on the edge of the tree, and goes down to the tile by the mirrored path.
     */
    protected _linkSideNeighbors(side: number, frame: number) {
        let pn: Node = this,
            part = -1,
            depth = 0;

        while (pn.parentNode && part === -1) {
            _pathId[depth++] = pn.partId;
            part = NEIGHBOUR[side][pn.partId];
            pn = pn.parentNode;
        }

        let mirror = OPPART[OPSIDE[side]];

        if (part === -1) {
            const rootNeighbor = pn.rootNeighbors && pn.rootNeighbors[side];
            if (!rootNeighbor) {
                return;
            }
            pn = rootNeighbor;
            mirror = ROOTPART[side][this.segment.opside[side]];
        }

        const zoom = this.segment.tileZoom;

        // Fading can leave a parent and its child opaque in one frame, so the walk doesn't stop at the first one
        for (let i = depth - 1; i >= 0 && pn.nodes.length; i--) {
            pn = pn.nodes[mirror[_pathId[i]]];
            if (pn._neighborFrame === frame && (pn.segment.tileZoom < zoom || pn.__id < this.__id)) {
                this.applyNeighbor(pn, side);
            }
        }
    }

    public whileNormalMapCreating() {
        const seg = this.segment;

        if (!seg.terrainIsLoading && seg.terrainExists && !seg._inTheQueue) {
            seg.planet._normalMapCreator.queue(seg);
        }

        let pn: Node = this;
        while (pn.parentNode && !pn.segment.normalMapReady) {
            pn = pn.parentNode;
        }

        const dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1);

        seg.normalMapTexture = pn.segment.normalMapTexture;
        seg.normalMapTextureBias[0] = seg.tileX - pn.segment.tileX * dZ2;
        seg.normalMapTextureBias[1] = seg.tileY - pn.segment.tileY * dZ2;
        seg.normalMapTextureBias[2] = 1.0 / dZ2;
    }

    public whileTerrainLoading(terrainReadySegment?: Segment | null) {
        const seg = this.segment;

        let pn: Node = this;

        if (terrainReadySegment && terrainReadySegment.terrainReady) {
            pn = terrainReadySegment.node;
        } else {
            while (pn.parentNode && !pn.segment.terrainReady) {
                pn = pn.parentNode;
            }
        }

        if (!pn.segment.terrainReady || this.appliedTerrainNodeId === pn.nodeId) {
            return;
        }

        let dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1), // 2 * Math.pow(2, dZ-1)
            offsetX = seg.tileX - pn.segment.tileX * dZ2,
            offsetY = seg.tileY - pn.segment.tileY * dZ2;

        const pseg = pn.segment;

        let renderVertices: Float64Array, renderVerticesHigh: Float32Array, renderVerticesLow: Float32Array;

        this.appliedTerrainNodeId = pn.nodeId;
        this.equalizedSideWithNodeId[N] =
            this.equalizedSideWithNodeId[E] =
            this.equalizedSideWithNodeId[S] =
            this.equalizedSideWithNodeId[W] =
                this.appliedTerrainNodeId;

        let gridSize = pn.segment.gridSize / dZ2,
            gridSizeExt = pn.segment.fileGridSize / dZ2;

        BOUNDS.xmin = BOUNDS.ymin = BOUNDS.zmin = MAX;
        BOUNDS.xmax = BOUNDS.ymax = BOUNDS.zmax = MIN;
        BOUNDS.r2min = Infinity;
        BOUNDS.r2max = -Infinity;

        if (gridSize >= 1) {
            seg.gridSize = gridSize;

            let len = (gridSize + 1) * (gridSize + 1) * 3;
            renderVertices = new Float64Array(len);
            renderVerticesHigh = new Float32Array(len);
            renderVerticesLow = new Float32Array(len);

            getMatrixSubArrayBoundsExt(
                pseg.terrainVertices!,
                pseg.gridSize,
                gridSize * offsetY,
                gridSize * offsetX,
                gridSize,
                pseg._relativeCenter,
                seg._relativeCenter,
                renderVertices,
                renderVerticesHigh,
                renderVerticesLow,
                BOUNDS,
                getR2Buffer(len / 3)
            );
        } else if (gridSizeExt >= 1 && pn.segment.terrainExists) {
            seg.gridSize = gridSizeExt;

            let len = (gridSizeExt + 1) * (gridSizeExt + 1) * 3;
            renderVertices = new Float64Array(len);
            renderVerticesHigh = new Float32Array(len);
            renderVerticesLow = new Float32Array(len);

            getMatrixSubArrayBoundsExt(
                pseg.normalMapVertices!,
                pn.segment.fileGridSize,
                gridSizeExt * offsetY,
                gridSizeExt * offsetX,
                gridSizeExt,
                pseg._relativeCenter,
                seg._relativeCenter,
                renderVertices,
                renderVerticesHigh,
                renderVerticesLow,
                BOUNDS,
                getR2Buffer(len / 3)
            );
        } else {
            seg.gridSize = _neGridSize;

            let i0 = Math.floor(gridSize * offsetY),
                j0 = Math.floor(gridSize * offsetX);

            let bigOne;
            if (pseg.gridSize === 1) {
                bigOne = pseg.terrainVertices!;
            } else {
                bigOne = getMatrixSubArray64(pseg.terrainVertices!, pseg.gridSize, i0, j0, 1);
            }

            let insideSize = 1.0 / gridSize;

            let t_i0 = offsetY - insideSize * i0,
                t_j0 = offsetX - insideSize * j0;

            let v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

            let vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

            let coords = new Vec3();

            renderVertices = new Float64Array(3 * _vertOrder.length);
            renderVerticesHigh = new Float32Array(3 * _vertOrder.length);
            renderVerticesLow = new Float32Array(3 * _vertOrder.length);

            for (let i = 0; i < _vertOrder.length; i++) {
                let vi_y = _vertOrder[i].y + t_i0,
                    vi_x = _vertOrder[i].x + t_j0;

                let vi_x_is = vi_x * gridSize,
                    vi_y_is = vi_y * gridSize;

                if (vi_y + vi_x < insideSize) {
                    coords = vn.scaleTo(vi_x_is).addA(vw.scaleTo(vi_y_is)).addA(v_lt);
                } else {
                    coords = vs
                        .scaleTo(1 - vi_x_is)
                        .addA(ve.scaleTo(1 - vi_y_is))
                        .addA(v_rb);
                }

                coords.addA(pseg._relativeCenter);
                let dstCoords = coords.sub(seg._relativeCenter);

                Vec3.doubleToTwoFloats(dstCoords, _tempHigh, _tempLow);

                let i3 = i * 3;

                renderVertices[i3] = dstCoords.x;
                renderVertices[i3 + 1] = dstCoords.y;
                renderVertices[i3 + 2] = dstCoords.z;

                renderVerticesHigh[i3] = _tempHigh.x;
                renderVerticesHigh[i3 + 1] = _tempHigh.y;
                renderVerticesHigh[i3 + 2] = _tempHigh.z;

                renderVerticesLow[i3] = _tempLow.x;
                renderVerticesLow[i3 + 1] = _tempLow.y;
                renderVerticesLow[i3 + 2] = _tempLow.z;

                if (coords.x < BOUNDS.xmin) BOUNDS.xmin = coords.x;
                if (coords.x > BOUNDS.xmax) BOUNDS.xmax = coords.x;
                if (coords.y < BOUNDS.ymin) BOUNDS.ymin = coords.y;
                if (coords.y > BOUNDS.ymax) BOUNDS.ymax = coords.y;
                if (coords.z < BOUNDS.zmin) BOUNDS.zmin = coords.z;
                if (coords.z > BOUNDS.zmax) BOUNDS.zmax = coords.z;

                let r2 = coords.x * coords.x + coords.y * coords.y + coords.z * coords.z;
                if (r2 < BOUNDS.r2min) BOUNDS.r2min = r2;
                if (r2 > BOUNDS.r2max) BOUNDS.r2max = r2;
                _r2[i] = r2;
            }
        }

        seg.readyToEngage = true;

        seg.terrainVertices = renderVertices;
        seg.terrainVerticesHigh = renderVerticesHigh;
        seg.terrainVerticesLow = renderVerticesLow;

        seg.renderVertices = renderVertices;
        seg.renderVerticesHigh = renderVerticesHigh;
        seg.renderVerticesLow = renderVerticesLow;

        seg.setTerrainBoundingVolume([BOUNDS.xmin, BOUNDS.ymin, BOUNDS.zmin, BOUNDS.xmax, BOUNDS.ymax, BOUNDS.zmax]);
        seg.setTerrainRadiusRange(
            BOUNDS.r2max >= BOUNDS.r2min ? [Math.sqrt(BOUNDS.r2min), Math.sqrt(BOUNDS.r2max)] : null
        );
        seg.setLodRadius(Math.sqrt(getMedian(_r2, renderVertices.length / 3)));

        if (seg.tileZoom > seg.planet.terrain!.maxZoom) {
            if (pn.segment.tileZoom >= seg.planet.terrain!.maxZoom) {
                seg.terrainReady = true;
                seg.terrainIsLoading = false;

                seg.terrainVertices = renderVertices;
                seg.terrainVerticesHigh = renderVerticesHigh;
                seg.terrainVerticesLow = renderVerticesLow;

                seg.passReady = true;

                this.appliedTerrainNodeId = this.nodeId;
                this.equalizedSideWithNodeId[N] =
                    this.equalizedSideWithNodeId[E] =
                    this.equalizedSideWithNodeId[S] =
                    this.equalizedSideWithNodeId[W] =
                        this.appliedTerrainNodeId;

                if (pn.segment.terrainExists) {
                    seg.normalMapVertices = renderVertices;
                    seg.fileGridSize = Math.sqrt(renderVertices.length / 3) - 1;

                    let fgs = Math.sqrt(pseg.normalMapNormals!.length / 3) - 1,
                        fgsZ = fgs / dZ2;

                    if (fgs > 1) {
                        seg.normalMapNormals = getMatrixSubArray32(
                            pseg.normalMapNormals!,
                            fgs,
                            fgsZ * offsetY,
                            fgsZ * offsetX,
                            fgsZ
                        );
                    } else {
                        // TODO: interpolation
                        seg.normalMapNormals = pseg.normalMapNormals;
                    }
                }
            }
        }
    }

    public destroy() {
        this.prevState = this.state = NOTRENDERING;
        this.segment.destroySegment();

        let n = this.neighbors;
        for (let i = 0, len = n.length; i < len; i++) {
            let ni = n[i];
            if (ni) {
                for (let j = 0; j < ni.length; j++) {
                    let nij = ni[j];
                    if (nij && nij.neighbors) {
                        nij.clearNeighbors();
                    }
                }
            }
        }

        // @ts-ignore
        this.neighbors = null;
        // @ts-ignore
        this.parentNode = null;
        // @ts-ignore
        this.sideSizeLog2 = null;
        // @ts-ignore
        this.segment = null;
    }

    /**
     * Destroys the branches the main camera does not render.
     * @public
     * @param {boolean} [keepViewCameraBranches=false] - Keeps the branches the last view camera collection has
     * gone through, they lead to the nodes the depth cameras render.
     */
    public clearTree(keepViewCameraBranches: boolean = false) {
        const state = this.getState();
        const viewBranch = keepViewCameraBranches && this._viewWalkFrame === this.quadTreeStrategy._viewWalkFrame;
        if (!viewBranch && (state === NOTRENDERING || state === RENDERING)) {
            this.destroyBranches();
        } else {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i] && this.nodes[i].clearTree(keepViewCameraBranches);
            }
        }
    }

    public clearBranches() {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i]!.clearBranches();
            this.nodes[i]!.segment.deleteMaterials();
        }
    }

    public destroyBranches() {
        if (this.ready) {
            let nodesToRemove: Node[] = [],
                i;

            for (i = 0; i < this.nodes.length; i++) {
                nodesToRemove[i] = this.nodes[i]!;
            }

            this.ready = false;
            this.nodes = [];

            for (i = 0; i < nodesToRemove.length; i++) {
                nodesToRemove[i].destroyBranches();
                nodesToRemove[i].destroy();
                //@ts-ignore
                nodesToRemove[i] = null;
            }

            nodesToRemove.length = 0;

            // @ts-ignore
            nodesToRemove = null;
        }
    }

    public traverseTree(callback: Function) {
        callback(this);
        if (this.ready) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i]!.traverseTree(callback);
            }
        }
    }

    /**
     * Returns the neighbor behind the side that has a corner in the same point as the corner of this node.
     * @public
     * @param {number} side - The side that the corner belongs to.
     * @param {number} corner - Corner index, NW, NE, SW or SE.
     * @returns {Node | null | undefined} - Neighbor, null when there is none, undefined when the point lies inside
     * the side of a neighbor of a lower zoom.
     */
    public getCornerNeighbor(side: number, corner: number): Node | null | undefined {
        const list = this.neighbors[side],
            seg = this.segment,
            far = NOPSORD[side][corner],
            // The tile index along the side: x along the N and S sides, y along the E and W ones
            pos = (side & 1 ? seg.tileY : seg.tileX) + far,
            opcs = seg.opside[side],
            flip = SIDEFLIP[side][opcs];

        for (let i = 0; i < list.length; i++) {
            const n = list[i],
                ns = n.segment,
                nIndex = opcs & 1 ? ns.tileY : ns.tileX,
                nPos = (flip ? ns.powTileZoom - 1 - nIndex : nIndex) + far,
                dz = ns.tileZoom - seg.tileZoom;

            if (dz >= 0) {
                if (nPos === pos * (1 << dz)) {
                    return n;
                }
            } else {
                return pos === nPos * (1 << -dz) ? n : undefined;
            }
        }

        return null;
    }

    /**
     * Returns the corner of the neighbors behind the side that lies in the same point as the corner of this node.
     * @public
     * @param {number} side - The side that the corner belongs to.
     * @param {number} corner - Corner index, NW, NE, SW or SE.
     * @returns {number} -
     */
    public getNeighborCorner(side: number, corner: number): number {
        return ROOTPART[side][this.segment.opside[side]][corner];
    }

    public getOffsetOppositeNeighbourSide(neighbourNode: Node, side: number): number {
        let pNode: Node = this,
            neighbourZoom = neighbourNode.segment.tileZoom,
            offset = 0;

        while (pNode.segment.tileZoom > neighbourZoom) {
            offset += PARTOFFSET[pNode.partId][side] / (1 << (pNode.segment.tileZoom - neighbourZoom));
            pNode = pNode.parentNode!;
        }

        return offset;
    }
}

export { Node };
