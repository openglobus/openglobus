import {Extent} from "../Extent";
import {EPSG3857} from "../proj/EPSG3857";
import {EPSG4326} from "../proj/EPSG4326";
import {binaryInsert, getMatrixSubArray32, getMatrixSubArray64, getMatrixSubArrayBoundsExt} from "../utils/shared";
import {LonLat} from "../LonLat";
import {MAX, MIN} from "../math";
import {MAX_LAT} from "../mercator";
import {Planet} from "../scene/Planet";
import {Segment} from "../segment/Segment";

import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import {
    COMSIDE,
    E,
    MAX_RENDERED_NODES,
    N,
    NE,
    NEIGHBOUR,
    NOTRENDERING,
    NW,
    OPPART,
    OPSIDE,
    PARTOFFSET,
    RENDERING,
    S,
    SE,
    SW,
    W,
    WALKTHROUGH
} from "./quadTree";

import {
    TILEGROUP_COMMON,
    TILEGROUP_NORTH,
    TILEGROUP_SOUTH
} from "../segment/Segment";

import {PlanetCamera} from "../camera/PlanetCamera";

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

const _vertOrder: Vec2[] = [
    new Vec2(0, 0), new Vec2(1, 0),
    new Vec2(0, 1), new Vec2(1, 1)
];

const _neGridSize = Math.sqrt(_vertOrder.length) - 1;

type BoundsType = {
    xmin: number; ymin: number; zmin: number;
    xmax: number; ymax: number; zmax: number
};

let BOUNDS: BoundsType = {
    xmin: 0.0, ymin: 0.0, zmin: 0.0,
    xmax: 0.0, ymax: 0.0, zmax: 0.0
};

let __staticCounter = 0;

/**
 * Quad tree planet segment node.
 * @constructor
 * @param {Segment} segmentPrototype - Planet segment node constructor.
 * @param {Planet} planet - Planet scene instance.
 * @param {number} partId - NorthEast, SouthWest etc.
 * @param {Node} parent - Parent of this node.
 * @param {number} id - Tree node identifier (id * 4 + 1);
 * @param {number} tileZoom - Deep index of the quad tree.
 * @param {Extent} extent - Planet segment extent.
 */
class Node {
    public SegmentPrototype: typeof Segment;
    public planet: Planet;
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

    constructor(
        SegmentPrototype: typeof Segment,
        planet: Planet,
        partId: number,
        parent: Node | null,
        tileZoom: number,
        extent: Extent
    ) {
        planet._createdNodesCount++;

        this.SegmentPrototype = SegmentPrototype;
        this.planet = planet;
        this.parentNode = parent;
        this.partId = partId;
        this.nodeId = __staticCounter++;//partId + id;
        this.state = null;
        this.prevState = null;
        this.appliedTerrainNodeId = -1;
        this.sideSizeLog2 = [0, 0, 0, 0];
        this.ready = false;
        this.neighbors = [[], [], [], []];
        this.equalizedSideWithNodeId = [this.nodeId, this.nodeId, this.nodeId, this.nodeId];
        // @todo: this.nodes = null;
        this.nodes = [];
        this.segment = new SegmentPrototype(this, planet, tileZoom, extent);
        this._cameraInside = false;
        this.inFrustum = 0;
        this._fadingNodes = [];
        this.createBounds();
    }

    public createChildrenNodes() {
        this.ready = true;
        const p = this.planet;
        const ps = this.segment;
        const ext = ps._extent;
        const z = ps.tileZoom + 1;
        const size_x = ext.getWidth() * 0.5;
        const size_y = ext.getHeight() * 0.5;
        const ne = ext.northEast;
        const sw = ext.southWest;
        const c = new LonLat(sw.lon + size_x, sw.lat + size_y);
        const nd = this.nodes;

        nd[NW] = new Node(this.SegmentPrototype, p, NW, this, z, new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)));
        nd[NE] = new Node(this.SegmentPrototype, p, NE, this, z, new Extent(c, new LonLat(ne.lon, ne.lat)));
        nd[SW] = new Node(this.SegmentPrototype, p, SW, this, z, new Extent(new LonLat(sw.lon, sw.lat), c));
        nd[SE] = new Node(this.SegmentPrototype, p, SE, this, z, new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)));
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

    // public isBrother(node: Node): boolean {
    //     return !(this.parentNode || node.parentNode) || (this.parentNode!.nodeId === node.parentNode!.nodeId);
    // }

    public traverseNodes(cam: PlanetCamera, maxZoom?: number | null, terrainReadySegment?: Segment | null, stopLoading?: boolean, zoomPassNode?: Node) {
        if (!this.ready) {
            this.createChildrenNodes();
        }

        let n = this.nodes;

        n[0]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[1]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[2]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
        n[3]!.renderTree(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
    }

    public renderTree(cam: PlanetCamera, maxZoom?: number | null, terrainReadySegment?: Segment | null, stopLoading?: boolean, zoomPassNode?: Node) {
        if (this.planet._renderedNodes.length >= MAX_RENDERED_NODES) {
            return;
        }

        if (!maxZoom || zoomPassNode && this.segment.tileZoom > zoomPassNode.segment.tileZoom) {
            this.prevState = this.state;
        }
        this.state = WALKTHROUGH;

        this.clearNeighbors();

        let seg = this.segment,
            planet = this.planet;

        this._cameraInside = false;

        // Search a node which the camera is flying over.
        if (!this.parentNode || this.parentNode._cameraInside) {
            let inside;
            if (Math.abs(cam._lonLat.lat) <= MAX_LAT && seg._projection.id === EPSG3857.id) {
                inside = seg._extent.isInside(cam._lonLatMerc);
            } else if (seg._projection.id === EPSG4326.id) {
                inside = seg._extent.isInside(cam._lonLat);
            }

            if (inside) {
                cam._insideSegment = seg;
                this._cameraInside = true;
            }
        }

        this.inFrustum = 0;

        let frustums = cam.frustums, numFrustums = frustums.length;

        if (seg.tileZoom < 6) {
            for (let i = 0; i < numFrustums; i++) {
                if (frustums[i].containsSphere(seg.bsphere)) {
                    this.inFrustum |= 1 << i;
                }
            }
        } else {
            let commonFrustumFlag = 1 << (numFrustums - 1 - 1);
            for (let i = 0; commonFrustumFlag && i < numFrustums; i++) {
                if (seg.terrainReady) {
                    if (frustums[i].containsBox(seg.bbox)) {
                        commonFrustumFlag >>= 1;
                        this.inFrustum |= 1 << i;
                    }
                } else {
                    if (frustums[i].containsSphere(seg.bsphere)) {
                        commonFrustumFlag >>= 1;
                        this.inFrustum |= 1 << i;
                    }
                }
            }
        }

        if (this.inFrustum || this._cameraInside || seg.tileZoom < 3) {
            let h = Math.abs(cam._lonLat.height);

            let horizonDist = cam.eye.length2() - this.planet.ellipsoid.polarSizeSqr;
            horizonDist = horizonDist < 106876472875.63281 * planet._heightFactor ? 106876472875.63281 * planet._heightFactor : horizonDist;

            let altVis = seg.tileZoom < 2 || seg.tileZoom > 19 ||
                /* Could be replaced with camera frustum always looking down check,
                and not to go througn nodes from the oppositeside of the globe*/
                (seg.tileZoom < 4 && !seg.terrainReady);

            altVis = altVis ||
                cam.eye.distance2(seg._sw) < horizonDist ||
                cam.eye.distance2(seg._nw) < horizonDist ||
                cam.eye.distance2(seg._ne) < horizonDist ||
                cam.eye.distance2(seg._se) < horizonDist;

            if ((this.inFrustum && (altVis || h > 10000.0)) || this._cameraInside) {
                //@todo: replace to the strategy
                seg._collectVisibleNodes();
            }

            if (seg.tileZoom < 2) {
                this.traverseNodes(cam, maxZoom, terrainReadySegment, stopLoading, zoomPassNode);
            } else if (
                seg.terrainReady && (!maxZoom && cam.projectedSize(seg.bsphere.center, seg._plainRadius) < planet.lodSize
                    || maxZoom && ((seg.tileZoom === maxZoom) || !altVis))
            ) {

                if (altVis) {
                    seg.passReady = true;
                    this.renderNode(this.inFrustum, !this.inFrustum, terrainReadySegment, stopLoading);
                } else {
                    this.state = NOTRENDERING;
                }

            } else if (seg.terrainReady && seg.checkZoom() && (!maxZoom || cam.projectedSize(seg.bsphere.center, seg.bsphere.radius) > this.planet._maxLodSize)) {
                this.traverseNodes(cam, maxZoom, seg, stopLoading, zoomPassNode);
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

    public renderNode(inFrustum: number, onlyTerrain?: boolean, terrainReadySegment?: Segment | null, stopLoading?: boolean) {
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
        if (seg.planet.lightEnabled && !seg.normalMapReady) {
            this.whileNormalMapCreating();
        }

        if (onlyTerrain) {
            this.state = -1;
            return;
        }

        // Calculate minimal and maximal zoom index on the screen
        if (!this._cameraInside && seg.tileZoom > this.planet.maxCurrZoom) {
            this.planet.maxCurrZoom = seg.tileZoom;
        }

        if (seg.tileZoom < this.planet.minCurrZoom) {
            this.planet.minCurrZoom = seg.tileZoom;
        }

        seg._addViewExtent();

        // Finally this node proceeds to rendering.
        this.addToRender(inFrustum);
    }

    public childrenPrevStateEquals(state: number): boolean {
        let n = this.nodes;
        return n.length === 4 && n[0].prevState === state && n[1].prevState === state && n[2].prevState === state && n[3].prevState === state;
    }

    public isFading(): boolean {
        let n = this.nodes;
        return this.state === WALKTHROUGH && this.segment._transitionOpacity > 0.0 && n.length === 4 && (n[0].state === RENDERING && n[1].state === RENDERING && n[2].state === RENDERING && n[3].state === RENDERING);
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

                    // not sure it's necessary here
                    this.parentNode.whileTerrainLoading();

                    this._fadingNodes.push(this.parentNode);
                    this.parentNode.segment._transitionOpacity = 2.0;
                    this.parentNode.segment._transitionTimestamp = timestamp;
                } else {
                    // Check if the children were visible last frame, and make them fading
                    if (this.segment.childrenInitialized() && this.childrenPrevStateEquals(RENDERING)) {
                        for (let i = 0; i < this.nodes.length; i++) {
                            let ni = this.nodes[i];

                            // not sure it's necessary here
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
                    if (this.segment._transitionOpacity < 1.0 && this._fadingNodes[i].segment._transitionOpacity === 0) {
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

        let nodes = this.planet._renderedNodes;

        //@ts-ignore
        if (!this.planet._transitionOpacityEnabled) {
            this.getRenderedNodesNeighbors(nodes);
            nodes.push(this);
        } else {
            //@todo: check if it's possible to get rid of the sorting when using breadth traverse tree
            binaryInsert(nodes, this, (a: Node, b: Node) => {
                return a.segment.tileZoom - b.segment.tileZoom;
            });
        }

        if (!this.segment.terrainReady) {
            this.planet._renderCompleted = false;
            this.planet._terrainCompleted = false;
        }

        let k = 0,
            rf = this.planet._renderedNodesInFrustum;
        while (inFrustum) {
            if (inFrustum & 1) {
                rf[k].push(this);
            }
            k++;
            inFrustum >>= 1;
        }
    }

    public applyNeighbor(node: Node, side: number) {

        const opcs = OPSIDE[side];

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
     * Searching current node for its neighbours.
     * @public
     */
    public getRenderedNodesNeighbors(nodes: Node[]) {

        for (let i = nodes.length - 1; i >= 0; --i) {

            let ni = nodes[i];
            let cs = this.getCommonSide(ni);

            if (cs !== -1) {
                this.applyNeighbor(ni, cs);
            }
        }
    }

    /**
     * Checking if current node has a common side with input node and return side index N, E, S or W. Otherwise returns -1.
     * @param {Node} node - Input node
     * @returns {number} - Node side index
     */
    public getCommonSide(node: Node): number {
        const as = this.segment;
        const bs = node.segment;

        if (as.tileZoom === bs.tileZoom && as._tileGroup === bs._tileGroup) {
            return as.getNeighborSide(bs);
        } else {
            const a = as._extentLonLat;
            const b = bs._extentLonLat;

            let a_ne = a.northEast, a_sw = a.southWest, b_ne = b.northEast, b_sw = b.southWest;

            let a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat, b_ne_lon = b_ne.lon,
                b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

            if (as._tileGroup === bs._tileGroup) {
                if (a_ne_lon === b_sw_lon && ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))) {
                    return E;
                } else if (a_sw_lon === b_ne_lon && ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))) {
                    return W;
                } else if (a_ne_lat === b_sw_lat && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                    return N;
                } else if (a_sw_lat === b_ne_lat && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                    return S;
                } else if (bs.tileX === 0 && as.tileX === Math.pow(2, as.tileZoom) - 1 && ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))) {
                    return E;
                } else if (as.tileX === 0 && bs.tileX === Math.pow(2, bs.tileZoom) - 1 && ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) || (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))) {
                    return W;
                }
            }

            if (as._tileGroup === TILEGROUP_COMMON && bs._tileGroup === TILEGROUP_NORTH && as.tileY === 0 && bs.tileY === Math.pow(2, bs.tileZoom) - 1 && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                return N;
            } else if (as._tileGroup === TILEGROUP_SOUTH && bs._tileGroup === TILEGROUP_COMMON && as.tileY === 0 && bs.tileY === Math.pow(2, bs.tileZoom) - 1 && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                return N;
            } else if (bs._tileGroup === TILEGROUP_NORTH && as._tileGroup === TILEGROUP_COMMON && as.tileY === Math.pow(2, as.tileZoom) - 1 && bs.tileY === 0 && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                return S;
            } else if (as._tileGroup === TILEGROUP_NORTH && bs._tileGroup === TILEGROUP_COMMON && as.tileY === Math.pow(2, as.tileZoom) - 1 && bs.tileY === 0 && ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) || (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))) {
                return S;
            }
        }

        return -1;
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

        if (pn.segment.terrainReady && this.appliedTerrainNodeId !== pn.nodeId) {

            let dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1), // 2 * Math.pow(2, dZ-1)
                offsetX = seg.tileX - pn.segment.tileX * dZ2,
                offsetY = seg.tileY - pn.segment.tileY * dZ2;

            const pseg = pn.segment;

            let tempVertices: Float64Array,
                tempVerticesHigh: Float32Array,
                tempVerticesLow: Float32Array,
                noDataVertices: Uint8Array;

            this.appliedTerrainNodeId = pn.nodeId;
            this.equalizedSideWithNodeId[N] = this.equalizedSideWithNodeId[E] = this.equalizedSideWithNodeId[S] = this.equalizedSideWithNodeId[W] = this.appliedTerrainNodeId;

            let gridSize = pn.segment.gridSize / dZ2,
                gridSizeExt = pn.segment.fileGridSize / dZ2;

            BOUNDS.xmin = MAX;
            BOUNDS.xmax = MIN;
            BOUNDS.ymin = MAX;
            BOUNDS.ymax = MIN;
            BOUNDS.zmin = MAX;
            BOUNDS.zmax = MIN;

            if (gridSize >= 1) {
                seg.gridSize = gridSize;

                let len = (gridSize + 1) * (gridSize + 1) * 3;
                tempVertices = new Float64Array(len);
                tempVerticesHigh = new Float32Array(len);
                tempVerticesLow = new Float32Array(len);

                if (pseg.noDataVertices) {
                    noDataVertices = new Uint8Array(len / 3);
                }

                getMatrixSubArrayBoundsExt(
                    pseg.terrainVertices!,
                    pseg.terrainVerticesHigh!,
                    pseg.terrainVerticesLow!,
                    pseg.noDataVertices!,
                    pseg.gridSize,
                    gridSize * offsetY,
                    gridSize * offsetX,
                    gridSize,
                    tempVertices,
                    tempVerticesHigh,
                    tempVerticesLow,
                    BOUNDS,
                    noDataVertices!
                );

            } else if (gridSizeExt >= 1 && pn.segment.terrainExists) {

                seg.gridSize = gridSizeExt;

                let len = (gridSizeExt + 1) * (gridSizeExt + 1) * 3;
                tempVertices = new Float64Array(len);
                tempVerticesHigh = new Float32Array(len);
                tempVerticesLow = new Float32Array(len);

                if (pseg.noDataVertices) {
                    noDataVertices = new Uint8Array(len / 3);
                }

                getMatrixSubArrayBoundsExt(
                    pseg.normalMapVertices!,
                    pseg.normalMapVerticesHigh!,
                    pseg.normalMapVerticesLow!,
                    pseg.noDataVertices!,
                    pn.segment.fileGridSize,
                    gridSizeExt * offsetY,
                    gridSizeExt * offsetX,
                    gridSizeExt,
                    tempVertices,
                    tempVerticesHigh,
                    tempVerticesLow,
                    BOUNDS,
                    noDataVertices!
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

                let t_i0 = offsetY - insideSize * i0, t_j0 = offsetX - insideSize * j0;

                let v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

                let vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                let coords = new Vec3();

                tempVertices = new Float64Array(3 * _vertOrder.length);
                tempVerticesHigh = new Float32Array(3 * _vertOrder.length);
                tempVerticesLow = new Float32Array(3 * _vertOrder.length);

                for (let i = 0; i < _vertOrder.length; i++) {
                    let vi_y = _vertOrder[i].y + t_i0, vi_x = _vertOrder[i].x + t_j0;

                    let vi_x_is = vi_x * gridSize, vi_y_is = vi_y * gridSize;

                    if (vi_y + vi_x < insideSize) {
                        coords = vn.scaleTo(vi_x_is).addA(vw.scaleTo(vi_y_is)).addA(v_lt);
                    } else {
                        coords = vs.scaleTo(1 - vi_x_is).addA(ve.scaleTo(1 - vi_y_is)).addA(v_rb);
                    }

                    Vec3.doubleToTwoFloats(coords, _tempHigh, _tempLow);

                    let i3 = i * 3;

                    tempVertices[i3] = coords.x;
                    tempVertices[i3 + 1] = coords.y;
                    tempVertices[i3 + 2] = coords.z;

                    tempVerticesHigh[i3] = _tempHigh.x;
                    tempVerticesHigh[i3 + 1] = _tempHigh.y;
                    tempVerticesHigh[i3 + 2] = _tempHigh.z;

                    tempVerticesLow[i3] = _tempLow.x;
                    tempVerticesLow[i3 + 1] = _tempLow.y;
                    tempVerticesLow[i3 + 2] = _tempLow.z;

                    if (coords.x < BOUNDS.xmin) BOUNDS.xmin = coords.x;
                    if (coords.x > BOUNDS.xmax) BOUNDS.xmax = coords.x;
                    if (coords.y < BOUNDS.ymin) BOUNDS.ymin = coords.y;
                    if (coords.y > BOUNDS.ymax) BOUNDS.ymax = coords.y;
                    if (coords.z < BOUNDS.zmin) BOUNDS.zmin = coords.z;
                    if (coords.z > BOUNDS.zmax) BOUNDS.zmax = coords.z;
                }
            }

            seg.readyToEngage = true;

            seg.terrainVertices = tempVertices;
            seg.terrainVerticesHigh = tempVerticesHigh;
            seg.terrainVerticesLow = tempVerticesLow;

            seg.tempVertices = tempVertices;
            seg.tempVerticesHigh = tempVerticesHigh;
            seg.tempVerticesLow = tempVerticesLow;

            seg.noDataVertices = noDataVertices!;

            seg.setBoundingVolume(BOUNDS.xmin, BOUNDS.ymin, BOUNDS.zmin, BOUNDS.xmax, BOUNDS.ymax, BOUNDS.zmax);

            if (seg.tileZoom > seg.planet.terrain!.maxZoom) {
                if (pn.segment.tileZoom >= seg.planet.terrain!.maxZoom) {

                    seg._plainRadius = pn.segment._plainRadius / dZ2;

                    seg.terrainReady = true;
                    seg.terrainIsLoading = false;

                    seg.terrainVertices = tempVertices;
                    seg.terrainVerticesHigh = tempVerticesHigh;
                    seg.terrainVerticesLow = tempVerticesLow;

                    seg.passReady = true;

                    this.appliedTerrainNodeId = this.nodeId;
                    this.equalizedSideWithNodeId[N] = this.equalizedSideWithNodeId[E] = this.equalizedSideWithNodeId[S] = this.equalizedSideWithNodeId[W] = this.appliedTerrainNodeId;

                    if (pn.segment.terrainExists) {
                        seg.normalMapVertices = tempVertices;
                        seg.fileGridSize = Math.sqrt(tempVertices.length / 3) - 1;

                        let fgs = Math.sqrt(pseg.normalMapNormals!.length / 3) - 1,
                            fgsZ = fgs / dZ2;

                        if (fgs > 1) {
                            seg.normalMapNormals = getMatrixSubArray32(pseg.normalMapNormals!, fgs, fgsZ * offsetY, fgsZ * offsetX, fgsZ);
                        } else {
                            // TODO: interpolation
                            seg.normalMapNormals = pseg.normalMapNormals;
                        }
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

    public clearTree() {
        const state = this.getState();
        if (state === NOTRENDERING || state === RENDERING) {
            this.destroyBranches();
        } else {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i] && this.nodes[i].clearTree();
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

export {Node};