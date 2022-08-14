"use strict";

import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { MAX, MIN } from "../math.js";
import { Vec3 } from "../math/Vec3.js";
import { MAX_LAT } from "../mercator.js";
import { EPSG3857 } from "../proj/EPSG3857.js";
import { EPSG4326 } from "../proj/EPSG4326.js";
import { getMatrixSubArray, getMatrixSubArrayBoundsExt } from "../utils/shared.js";
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
    VISIBLE_DISTANCE,
    W,
    WALKTHROUGH
} from "./quadTree.js";

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

const _vertOrder = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 }
];
const _neGridSize = Math.sqrt(_vertOrder.length) - 1;

let BOUNDS = {
    xmin: 0.0,
    ymin: 0.0,
    zmin: 0.0,
    xmax: 0.0,
    ymax: 0.0,
    zmax: 0.0
};

/**
 * Quad tree planet segment node.
 * @constructor
 * @param {Segment|og.planetSegment.SegmentLonLat} segmentPrototype - Planet segment node constructor.
 * @param {RenderNode} planet - Planet render node.
 * @param {number} partId - NorthEast, SouthWest etc.
 * @param {quadTree.Node} parent - Parent of this node.
 * @param {number} id - Tree node identifier (id * 4 + 1);
 * @param {number} tileZoom - Deep index of the quad tree.
 * @param {Extent} extent - Planet segment extent.
 */
class Node {

    constructor(SegmentPrototype, planet, partId, parent, id, tileZoom, extent) {
        this.SegmentPrototype = SegmentPrototype;
        planet._createdNodesCount++;
        this.planet = planet;
        this.parentNode = parent;
        this.partId = partId;
        this.nodeId = partId + id;
        this.state = null;
        this.appliedTerrainNodeId = -1;
        this.sideSize = [1, 1, 1, 1];
        this.sideSizeLog2 = [0, 0, 0, 0];
        this.ready = false;
        this.neighbors = [[], [], [], []];
        this.equalizedNeighborId = [-1, -1, -1, -1];
        this.equalizedNeighborGridSize = [-1, -1, -1, -1];
        this.nodes = [null, null, null, null];
        this.segment = new SegmentPrototype(this, planet, tileZoom, extent);
        this._cameraInside = false;
        this.inFrustum = 0;
        this.createBounds();
    }

    createChildrenNodes() {
        this.ready = true;

        var p = this.planet;
        var ps = this.segment;
        var ext = ps._extent;
        var size_x = ext.getWidth() * 0.5;
        var size_y = ext.getHeight() * 0.5;
        var ne = ext.northEast,
            sw = ext.southWest;
        var z = ps.tileZoom + 1;
        var id = this.nodeId * 4 + 1;
        var c = new LonLat(sw.lon + size_x, sw.lat + size_y);
        var nd = this.nodes;

        nd[NW] = new Node(this.SegmentPrototype, p, NW, this, id, z, new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)));
        nd[NE] = new Node(this.SegmentPrototype, p, NE, this, id, z, new Extent(c, new LonLat(ne.lon, ne.lat)));
        nd[SW] = new Node(this.SegmentPrototype, p, SW, this, id, z, new Extent(new LonLat(sw.lon, sw.lat), c));
        nd[SE] = new Node(this.SegmentPrototype, p, SE, this, id, z, new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)));
    }

    createBounds() {
        let seg = this.segment;
        seg._setExtentLonLat();
        if (seg.tileZoom === 0) {
            seg.setBoundingSphere(0.0, 0.0, 0.0, new Vec3(0.0, 0.0, seg.planet.ellipsoid._a));
        } else if (seg.tileZoom < seg.planet.terrain.minZoom) {
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

    getState() {
        if (this.state === -1) {
            return this.state;
        }
        var pn = this.parentNode;
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
     * @param {Number} side - Neighbour side index e.g. og.quadTree.N, og.quadTree.W etc.
     * @returns {quadTree.Node} -
     */
    getEqualNeighbor(side) {
        var pn = this;
        var part = NEIGHBOUR[side][pn.partId];
        if (part !== -1) {
            return pn.parentNode.nodes[part];
        } else {
            var pathId = [];
            while (pn.parentNode) {
                pathId.push(pn.partId);
                part = NEIGHBOUR[side][pn.partId];
                pn = pn.parentNode;
                if (part !== -1) {
                    var i = pathId.length;
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

    isBrother(node) {
        return !(this.parentNode || node.parentNode) || this.parentNode.id === node.parentNode.id;
    }

    renderTree(cam, maxZoom, terrainReadySegment, stopLoading) {
        if (this.planet._renderedNodes.length >= MAX_RENDERED_NODES) {
            return;
        }

        this.state = WALKTHROUGH;

        this.neighbors[0] = null;
        this.neighbors[1] = null;
        this.neighbors[2] = null;
        this.neighbors[3] = null;

        this.neighbors[0] = [];
        this.neighbors[1] = [];
        this.neighbors[2] = [];
        this.neighbors[3] = [];

        let seg = this.segment,
            planet = this.planet;

        this._cameraInside = false;

        let insideLonLat = null;

        // Search a node which the camera is flying over.
        if (!this.parentNode || this.parentNode._cameraInside) {
            let inside;
            if (Math.abs(cam._lonLat.lat) <= MAX_LAT && seg._projection.id === EPSG3857.id) {
                inside = seg._extent.isInside(cam._lonLatMerc);
                insideLonLat = cam._lonLatMerc;
            } else if (seg._projection.id === EPSG4326.id) {
                inside = seg._extent.isInside(cam._lonLat);
                insideLonLat = cam._lonLat;
            }

            if (inside) {
                cam._insideSegmentPosition.lon = insideLonLat.lon;
                cam._insideSegmentPosition.lat = insideLonLat.lat;
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
            let h = cam._lonLat.height;

            let eye = cam.eye;
            let horizonDist = eye.length2() - this.planet.ellipsoid._b2;

            let altVis = seg.tileZoom > 19 ||
                (seg.tileZoom < 4 && !seg.terrainReady) ||
                seg.tileZoom < 2;

            if (h > 21000) {
                altVis = altVis || eye.distance2(seg._sw) < horizonDist
                    || eye.distance2(seg._nw) < horizonDist
                    || eye.distance2(seg._ne) < horizonDist
                    || eye.distance2(seg._se) < horizonDist;
            } else {
                altVis = altVis || cam.eye.distance(seg.bsphere.center) - seg.bsphere.radius < VISIBLE_DISTANCE * Math.sqrt(h);
            }

            if ((this.inFrustum && (altVis || h > 10000.0)) || this._cameraInside) {
                seg._collectVisibleNodes();
            }

            if (seg.tileZoom < 2 && seg.normalMapReady) {
                this.traverseNodes(cam, maxZoom, terrainReadySegment, stopLoading);
            } else if (seg.terrainReady && (
                !maxZoom && cam.projectedSize(seg.bsphere.center, seg._plainRadius) < planet._lodSize ||
                maxZoom && ((seg.tileZoom === maxZoom) || !altVis))) {

                if (altVis) {
                    seg.passReady = true;
                    this.renderNode(this.inFrustum, !this.inFrustum, terrainReadySegment, stopLoading);
                } else {
                    this.state = NOTRENDERING;
                }

            } else if (
                seg.terrainReady &&
                seg.tileZoom < planet.terrain._maxNodeZoom &&
                (!maxZoom || cam.projectedSize(seg.bsphere.center, seg.bsphere.radius) > this.planet._maxLodSize)) {
                this.traverseNodes(cam, maxZoom, seg, stopLoading);
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

    traverseNodes(cam, maxZoom, terrainReadySegment, stopLoading) {
        if (!this.ready) {
            this.createChildrenNodes();
        }

        let n = this.nodes;

        n[0].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
        n[1].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
        n[2].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
        n[3].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
    }

    renderNode(inFrustum, onlyTerrain, terrainReadySegment, stopLoading) {
        var seg = this.segment;

        // Create and load terrain data
        if (!seg.terrainReady) {
            if (!seg.initialized) {
                seg.initialize();
            }

            this.whileTerrainLoading(terrainReadySegment, stopLoading);

            if (!seg.plainProcessing) {
                seg.createPlainSegmentAsync();
            }

            if (seg.plainReady && !stopLoading) {
                seg.loadTerrain();
            }
        }

        // Create normal map texture
        if (seg.planet.lightEnabled && !seg.normalMapReady /*&& !seg.parentNormalMapReady*/) {
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

    /**
     * Seraching for neighbours and pickup current node to render processing.
     * @public
     */
    addToRender(inFrustum) {
        this.state = RENDERING;

        var nodes = this.planet._renderedNodes;

        for (var i = nodes.length - 1; i >= 0; --i) {
            var ni = nodes[i];

            var cs = this.getCommonSide(ni);

            if (cs !== -1) {
                var opcs = OPSIDE[cs];

                if (this.neighbors[cs].length === 0 || ni.neighbors[opcs].length === 0) {
                    var ap = this.segment;
                    var bp = ni.segment;
                    var ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.tileZoom - ap.tileZoom));

                    let cs_size = ap.gridSize,
                        opcs_size = bp.gridSize;

                    if (ld > 1) {
                        cs_size = Math.ceil(ap.gridSize / ld);
                        opcs_size = bp.gridSize;
                    } else if (ld < 1) {
                        cs_size = ap.gridSize;
                        opcs_size = Math.ceil(bp.gridSize * ld);
                    }

                    this.sideSize[cs] = cs_size;
                    ni.sideSize[opcs] = opcs_size;

                    this.sideSizeLog2[cs] = Math.log2(cs_size);
                    ni.sideSizeLog2[opcs] = Math.log2(opcs_size);
                }

                this.neighbors[cs].push(ni);
                ni.neighbors[opcs].push(this);
            }
        }

        nodes.push(this);

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

    getCommonSide(node) {
        var as = this.segment,
            bs = node.segment;

        if (as.tileZoom === bs.tileZoom && as._tileGroup === bs._tileGroup) {
            return as.getNeighborSide(bs);
        } else {
            var a = as._extentLonLat,
                b = bs._extentLonLat;

            var a_ne = a.northEast,
                a_sw = a.southWest,
                b_ne = b.northEast,
                b_sw = b.southWest;

            var a_ne_lon = a_ne.lon,
                a_ne_lat = a_ne.lat,
                a_sw_lon = a_sw.lon,
                a_sw_lat = a_sw.lat,
                b_ne_lon = b_ne.lon,
                b_ne_lat = b_ne.lat,
                b_sw_lon = b_sw.lon,
                b_sw_lat = b_sw.lat;

            if (as._tileGroup === bs._tileGroup) {
                if (
                    a_ne_lon === b_sw_lon &&
                    ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) ||
                        (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
                ) {
                    return E;
                } else if (
                    a_sw_lon === b_ne_lon &&
                    ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) ||
                        (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
                ) {
                    return W;
                } else if (
                    a_ne_lat === b_sw_lat &&
                    ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                        (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
                ) {
                    return N;
                } else if (
                    a_sw_lat === b_ne_lat &&
                    ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                        (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
                ) {
                    return S;
                } else if (
                    bs.tileX === 0 &&
                    as.tileX === Math.pow(2, as.tileZoom) - 1 &&
                    ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) ||
                        (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
                ) {
                    return E;
                } else if (
                    as.tileX === 0 &&
                    bs.tileX === Math.pow(2, bs.tileZoom) - 1 &&
                    ((a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat) ||
                        (a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat))
                ) {
                    return W;
                }
            }

            if (
                as._tileGroup === 0 &&
                bs._tileGroup === 1 &&
                as.tileY === 0 &&
                bs.tileY === Math.pow(2, bs.tileZoom) - 1 &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                    (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return N;
            } else if (
                as._tileGroup === 2 &&
                bs._tileGroup === 0 &&
                as.tileY === 0 &&
                bs.tileY === Math.pow(2, bs.tileZoom) - 1 &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                    (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return N;
            } else if (
                bs._tileGroup === 1 &&
                as._tileGroup === 0 &&
                as.tileY === Math.pow(2, as.tileZoom) - 1 &&
                bs.tileY === 0 &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                    (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return S;
            } else if (
                as._tileGroup === 1 &&
                bs._tileGroup === 0 &&
                as.tileY === Math.pow(2, as.tileZoom) - 1 &&
                bs.tileY === 0 &&
                ((a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon) ||
                    (a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon))
            ) {
                return S;
            }
        }

        return -1;
    }

    // TODO: test test test
    ___getCommonSide___(b) {
        var a = this,
            as = a.segment,
            bs = b.segment;

        if (as.tileZoom === bs.tileZoom) {
            return as.getNeighborSide(bs);
        } else if (as.tileZoom > bs.tileZoom) {
            let dz = as.tileZoom - bs.tileZoom,
                i = dz,
                p = this;

            while (i--) {
                p = p.parentNode;
            }

            let side = p.segment.getNeighborSide(bs);

            if (side !== -1) {
                i = dz;
                p = this;
                let _n = true;

                while (i--) {
                    _n = _n && COMSIDE[p.partId][side];
                }

                if (_n) {
                    return side;
                }
            }
        } else {
            let dz = bs.tileZoom - as.tileZoom,
                i = dz,
                p = b;

            while (i--) {
                p = p.parentNode;
            }

            let side = p.segment.getNeighborSide(as);

            if (side !== -1) {
                i = dz;
                p = b;
                let _n = true;

                while (i--) {
                    _n = _n && COMSIDE[p.partId][side];
                }

                if (_n) {
                    return OPSIDE[side];
                }
            }
        }

        return -1;
    }

    whileNormalMapCreating() {
        var seg = this.segment;
        var maxZ = this.planet.terrain.maxZoom;

        if (seg.tileZoom <= maxZ && !seg.terrainIsLoading && seg.terrainReady && !seg._inTheQueue) {
            seg.planet._normalMapCreator.queue(seg);
        }

        var pn = this;

        while (pn.parentNode && !pn.segment.normalMapReady) {
            pn = pn.parentNode;
        }

        var dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1);

        seg.normalMapTexture = pn.segment.normalMapTexture;
        seg.normalMapTextureBias[0] = seg.tileX - pn.segment.tileX * dZ2;
        seg.normalMapTextureBias[1] = seg.tileY - pn.segment.tileY * dZ2;
        seg.normalMapTextureBias[2] = 1.0 / dZ2;

        if (seg.tileZoom > maxZ) {
            if (pn.segment.tileZoom === maxZ) {
                seg.parentNormalMapReady = true;
            }
        }
    }

    whileTerrainLoading(terrainReadySegment, stopLoading) {
        const seg = this.segment;
        const terrain = this.planet.terrain;

        let pn = this;

        if (terrainReadySegment && terrainReadySegment.terrainReady) {
            pn = terrainReadySegment.node;
        } else {
            while (pn.parentNode && !pn.segment.terrainReady) {
                pn = pn.parentNode;
            }
        }

        if (pn.segment.terrainReady && this.appliedTerrainNodeId !== pn.nodeId) {
            let dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1),
                offsetX = seg.tileX - pn.segment.tileX * dZ2,
                offsetY = seg.tileY - pn.segment.tileY * dZ2;

            let pseg = pn.segment;

            let tempVertices, tempVerticesHigh, tempVerticesLow, noDataVertices;

            this.appliedTerrainNodeId = pn.nodeId;

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
                    pseg.terrainVertices,
                    pseg.terrainVerticesHigh,
                    pseg.terrainVerticesLow,
                    pseg.noDataVertices,
                    pseg.gridSize,
                    gridSize * offsetY,
                    gridSize * offsetX,
                    gridSize,
                    tempVertices,
                    tempVerticesHigh,
                    tempVerticesLow,
                    BOUNDS,
                    noDataVertices
                );
            } else if (gridSizeExt >= 1) {
                seg.gridSize = gridSizeExt;

                let len = (gridSizeExt + 1) * (gridSizeExt + 1) * 3;
                tempVertices = new Float64Array(len);
                tempVerticesHigh = new Float32Array(len);
                tempVerticesLow = new Float32Array(len);

                if (pseg.noDataVertices) {
                    noDataVertices = new Uint8Array(len / 3);
                }

                getMatrixSubArrayBoundsExt(
                    pseg.normalMapVertices,
                    pseg.normalMapVerticesHigh,
                    pseg.normalMapVerticesLow,
                    pseg.noDataVertices,
                    pn.segment.fileGridSize,
                    gridSizeExt * offsetY,
                    gridSizeExt * offsetX,
                    gridSizeExt,
                    tempVertices,
                    tempVerticesHigh,
                    tempVerticesLow,
                    BOUNDS,
                    noDataVertices
                );
            } else {
                seg.gridSize = _neGridSize;

                let i0 = Math.floor(gridSize * offsetY),
                    j0 = Math.floor(gridSize * offsetX);

                let bigOne;
                if (pseg.gridSize === 1) {
                    bigOne = pseg.terrainVertices;
                } else {
                    bigOne = getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);
                }

                let insideSize = 1.0 / gridSize;

                let t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                let v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

                let vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(
                        bigOne[3] - bigOne[9],
                        bigOne[4] - bigOne[10],
                        bigOne[5] - bigOne[11]
                    ),
                    vs = new Vec3(
                        bigOne[6] - bigOne[9],
                        bigOne[7] - bigOne[10],
                        bigOne[8] - bigOne[11]
                    );

                let coords = new Vec3();

                tempVertices = new Float64Array(3 * _vertOrder.length);
                tempVerticesHigh = new Float32Array(3 * _vertOrder.length);
                tempVerticesLow = new Float32Array(3 * _vertOrder.length);

                for (var i = 0; i < _vertOrder.length; i++) {
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

            seg.noDataVertices = noDataVertices;

            seg.setBoundingVolume(
                BOUNDS.xmin,
                BOUNDS.ymin,
                BOUNDS.zmin,
                BOUNDS.xmax,
                BOUNDS.ymax,
                BOUNDS.zmax
            );

            if (seg.tileZoom > terrain.maxZoom) {
                if (pn.segment.tileZoom >= terrain.maxZoom) {
                    //TODO: find better place for this
                    seg._plainRadius = pn.segment._plainRadius / dZ2;

                    seg.terrainReady = true;
                    seg.terrainIsLoading = false;

                    seg.terrainVertices = tempVertices;
                    seg.terrainVerticesHigh = tempVerticesHigh;
                    seg.terrainVerticesLow = tempVerticesLow;

                    this.appliedTerrainNodeId = this.nodeId;

                    if (pn.segment.terrainExists) {
                        seg.terrainExists = true;
                        seg.normalMapVertices = tempVertices;
                        seg.fileGridSize = Math.sqrt(tempVertices.length / 3) - 1;

                        let fgs = Math.sqrt(pseg.normalMapNormals.length / 3) - 1,
                            fgsZ = fgs / dZ2;

                        if (fgs > 1) {
                            seg.normalMapNormals = getMatrixSubArray(
                                pseg.normalMapNormals,
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
                } else {
                    pn = this;
                    while (pn.parentNode && pn.segment.tileZoom !== terrain.maxZoom) {
                        pn = pn.parentNode;
                    }

                    let pns = pn.segment;

                    if (!pns.initialized) {
                        pns.initialize();
                    }

                    if (!pns.plainProcessing) {
                        pn.segment.createPlainSegmentAsync();
                    }

                    if (pns.plainReady && !stopLoading) {
                        pns.loadTerrain(true);
                    }
                }
            }
        }
    }

    destroy() {
        this.state = NOTRENDERING;
        this.segment.destroySegment();
        var n = this.neighbors;
        n[N] && n[N].neighbors && (n[N].neighbors[S] = []);
        n[E] && n[E].neighbors && (n[E].neighbors[W] = []);
        n[S] && n[S].neighbors && (n[S].neighbors[N] = []);
        n[W] && n[W].neighbors && (n[W].neighbors[E] = []);
        this.neighbors = null;
        this.parentNode = null;
        this.sideSize = null;
        this.sideSizeLog2 = null;
        this.segment = null;
    }

    clearTree() {
        var state = this.getState();

        if (state === NOTRENDERING || state === RENDERING) {
            this.destroyBranches();
        } else {
            for (var i = 0; i < this.nodes.length; i++) {
                this.nodes[i] && this.nodes[i].clearTree();
            }
        }
    }

    clearBranches() {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clearBranches();
            this.nodes[i].segment.deleteMaterials();
        }
    }

    destroyBranches() {
        if (this.ready) {
            var nodesToRemove = [],
                i;

            for (i = 0; i < this.nodes.length; i++) {
                nodesToRemove[i] = this.nodes[i];
            }

            this.ready = false;
            this.nodes.length = 0;

            for (i = 0; i < nodesToRemove.length; i++) {
                nodesToRemove[i].destroyBranches();
                nodesToRemove[i].destroy();
                nodesToRemove[i] = null;
            }

            nodesToRemove.length = 0;
            nodesToRemove = null;
        }
    }

    traverseTree(callback) {
        callback(this);
        if (this.ready) {
            for (var i = 0; i < this.nodes.length; i++) {
                this.nodes[i].traverseTree(callback);
            }
        }
    }

    getOffsetOppositeNeighbourSide(neighbourNode, side) {
        let pNode = this,
            neighbourZoom = neighbourNode.segment.tileZoom,
            offset = 0;

        while (pNode.segment.tileZoom > neighbourZoom) {
            offset += PARTOFFSET[pNode.partId][side] / (1 << (pNode.segment.tileZoom - neighbourZoom));
            pNode = pNode.parentNode;
        }

        return offset;
    }
}

export { Node };
