'use strict';

import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { EPSG4326 } from '../proj/EPSG4326.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Vec3 } from '../math/Vec3.js';
import { MAX_LAT, POLE } from '../mercator.js';
import { MAX, MIN } from '../math.js';

import {
    NW, NE, SW, SE,
    N, E, S, W,
    COMSIDE, OPSIDE,
    WALKTHROUGH, NOTRENDERING,
    NEIGHBOUR, OPPART,
    VISIBLE_DISTANCE, RENDERING,
    MAX_RENDERED_NODES,
    PARTOFFSET
} from './quadTree.js';

import { MAX_NORMAL_ZOOM } from '../segment/Segment.js';

const DOT_VIS = 0.3;
const VISIBLE_HEIGHT = 3000000.0;

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

/**
 * Returns triangle coordinate array from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 * @TODO: optimization
 */
function getMatrixSubArray(sourceArr, gridSize, i0, j0, size) {

    const size_1 = size + 1;
    const i0size = i0 + size_1;
    const j0size = j0 + size_1;

    var res = new Float64Array(size_1 * size_1 * 3);

    var vInd = 0;
    for (var i = i0; i < i0size; i++) {
        for (var j = j0; j < j0size; j++) {
            var ind = 3 * (i * (gridSize + 1) + j);

            res[vInd++] = sourceArr[ind];
            res[vInd++] = sourceArr[ind + 1];
            res[vInd++] = sourceArr[ind + 2];
        }
    }
    return res;
};

// /**
// * Returns two float32 triangle coordinate arrays from inside of the source triangle array.
// * @static
// * @param {Array.<number>} sourceArr - Source array
// * @param {number} gridSize - Source array square matrix size
// * @param {number} i0 - First row index source array matrix
// * @param {number} j0 - First column index
// * @param {number} size - Square matrix result size.
// * @return{Array.<number>} Triangle coordinates array from the source array.
// * @TODO: optimization
// */
// function getMatrixSubArrayExt(sourceArrHigh, sourceArrLow, gridSize, i0, j0, size, outArrHigh, outArrLow) {

//    const i0size = i0 + size + 1;
//    const j0size = j0 + size + 1;

//    var vInd = 0;
//    for (var i = i0; i < i0size; i++) {
//        for (var j = j0; j < j0size; j++) {
//            var ind = 3 * (i * (gridSize + 1) + j);

//            outArrLow[vInd] = sourceArrLow[ind];
//            outArrHigh[vInd++] = sourceArrHigh[ind];

//            outArrLow[vInd] = sourceArrLow[ind + 1];
//            outArrHigh[vInd++] = sourceArrHigh[ind + 1];

//            outArrLow[vInd] = sourceArrLow[ind + 2];
//            outArrHigh[vInd++] = sourceArrHigh[ind + 2];
//        }
//    }
// };

// /**
// * Returns triangle coordinate array from inside of the source triangle array.
// * @static
// * @param {Array.<number>} sourceArr - Source array
// * @param {number} gridSize - Source array square matrix size
// * @param {number} i0 - First row index source array matrix
// * @param {number} j0 - First column index
// * @param {number} size - Square matrix result size.
// * @param {object} outBounds - Output bounds.
// * @return{Array.<number>} Triangle coordinates array from the source array.
// * @TODO: optimization
// */
// function getMatrixSubArrayBounds(sourceArr, gridSize, i0, j0, size, outBounds) {

//    const size_1 = size + 1;
//    const i0size = i0 + size_1;
//    const j0size = j0 + size_1;

//    var res = new Float64Array(size_1 * size_1 * 3);

//    var vInd = 0;
//    for (var i = i0; i < i0size; i++) {
//        for (var j = j0; j < j0size; j++) {
//            var ind = 3 * (i * (gridSize + 1) + j);

//            let x = sourceArr[ind],
//                y = sourceArr[ind + 1],
//                z = sourceArr[ind + 2];

//            if (x < outBounds.xmin) outBounds.xmin = x;
//            if (x > outBounds.xmax) outBounds.xmax = x;
//            if (y < outBounds.ymin) outBounds.ymin = y;
//            if (y > outBounds.ymax) outBounds.ymax = y;
//            if (z < outBounds.zmin) outBounds.zmin = z;
//            if (z > outBounds.zmax) outBounds.zmax = z;

//            res[vInd++] = x;
//            res[vInd++] = y;
//            res[vInd++] = z;
//        }
//    }
//    return res;
// };

/**
 * Returns two float32 triangle coordinate arrays from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @param {object} outBounds - Output bounds.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 * @TODO: optimization
 */
function getMatrixSubArrayBoundsExt(sourceArr, sourceArrHigh, sourceArrLow, gridSize, i0, j0, size, outArr, outArrHigh, outArrLow, outBounds) {

    const i0size = i0 + size + 1;
    const j0size = j0 + size + 1;
    gridSize += 1;
    var vInd = 0;
    for (var i = i0; i < i0size; i++) {
        for (var j = j0; j < j0size; j++) {
            var ind = 3 * (i * gridSize + j);

            let x = sourceArr[ind],
                y = sourceArr[ind + 1],
                z = sourceArr[ind + 2];

            if (x < outBounds.xmin) outBounds.xmin = x;
            if (x > outBounds.xmax) outBounds.xmax = x;
            if (y < outBounds.ymin) outBounds.ymin = y;
            if (y > outBounds.ymax) outBounds.ymax = y;
            if (z < outBounds.zmin) outBounds.zmin = z;
            if (z > outBounds.zmax) outBounds.zmax = z;

            outArr[vInd] = x;
            outArrLow[vInd] = sourceArrLow[ind];
            outArrHigh[vInd++] = sourceArrHigh[ind];

            outArr[vInd] = y;
            outArrLow[vInd] = sourceArrLow[ind + 1];
            outArrHigh[vInd++] = sourceArrHigh[ind + 1];

            outArr[vInd] = z;
            outArrLow[vInd] = sourceArrLow[ind + 2];
            outArrHigh[vInd++] = sourceArrHigh[ind + 2];
        }
    }
};

/**
 * Quad tree planet segment node.
 * @constructor
 * @param {og.planetSegment.Segment|og.planetSegment.SegmentLonLat} segmentPrototype - Planet segment node constructor.
 * @param {og.scene.RenderNode} planet - Planet render node.
 * @param {number} partId - NorthEast, SouthWest etc.
 * @param {og.quadTree.Node} parent - Parent of this node.
 * @param {number} id - Tree node identifier (id * 4 + 1);
 * @param {number} tileZoom - Deep index of the quad tree.
 * @param {og.Extent} extent - Planet segment extent.
 */
const Node = function (SegmentPrototype, planet, partId, parent, id, tileZoom, extent) {
    this.SegmentPrototype = SegmentPrototype;
    this.planet = planet;
    this.parentNode = parent;
    this.partId = partId;
    this.nodeId = partId + id;
    this.state = null;
    this.appliedTerrainNodeId = -1;
    this.sideSize = [1, 1, 1, 1];
    this.ready = false;
    this.neighbors = [[], [], [], []];
    this.equalizedNeighborId = [-1, -1, -1, -1];
    this.nodes = [null, null, null, null];
    this.segment = new SegmentPrototype(this, planet, tileZoom, extent);
    this._cameraInside = false;
    this.inFrustum = 0;
    this.createBounds();
    this.planet._createdNodesCount++;
};

const _vertOrder = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
const _neGridSize = Math.sqrt(_vertOrder.length) - 1;

Node.prototype.createChildrenNodes = function () {

    this.ready = true;

    var p = this.planet;
    var ps = this.segment;
    var ext = ps._extent;
    var size_x = ext.getWidth() * 0.5;
    var size_y = ext.getHeight() * 0.5;
    var ne = ext.northEast, sw = ext.southWest;
    var z = ps.tileZoom + 1;
    var id = this.nodeId * 4 + 1;
    var c = new LonLat(sw.lon + size_x, sw.lat + size_y);
    var nd = this.nodes;

    nd[NW] = new Node(this.SegmentPrototype, p, NW, this, id, z,
        new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)));

    nd[NE] = new Node(this.SegmentPrototype, p, NE, this, id, z,
        new Extent(c, new LonLat(ne.lon, ne.lat)));

    nd[SW] = new Node(this.SegmentPrototype, p, SW, this, id, z,
        new Extent(new LonLat(sw.lon, sw.lat), c));

    nd[SE] = new Node(this.SegmentPrototype, p, SE, this, id, z,
        new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)));
};

Node.prototype.createBounds = function () {

    let seg = this.segment;

    seg._setExtentLonLat();

    if (seg.tileZoom === 0) {

        seg.setBoundingSphere(0.0, 0.0, 0.0, new Vec3(0.0, 0.0, seg.planet.ellipsoid._a));

    } else if (seg.tileZoom < seg.planet.terrain.minZoom) {

        seg.createBoundsByExtent();

    } else {

        let pn = this;

        while (pn.parentNode && !pn.segment.terrainReady) {
            pn = pn.parentNode;
        }

        let dZ2 = 1 << (this.segment.tileZoom - pn.segment.tileZoom);

        let offsetX = this.segment.tileX - pn.segment.tileX * dZ2,
            offsetY = this.segment.tileY - pn.segment.tileY * dZ2;

        if (pn.segment.terrainReady && pn.segment.tileZoom >= seg.planet.terrain.minZoom) {

            let gridSize = pn.segment.gridSize / dZ2;

            if (gridSize >= 1.0) {

                let i0 = gridSize * offsetY;
                let j0 = gridSize * offsetX;

                let pnGsOne = pn.segment.gridSize + 1;

                let ind_sw = 3 * ((i0 + gridSize) * pnGsOne + j0),
                    ind_nw = 3 * (i0 * pnGsOne + j0),
                    ind_ne = 3 * (i0 * pnGsOne + j0 + gridSize),
                    ind_se = 3 * ((i0 + gridSize) * pnGsOne + j0 + gridSize);

                let pVerts = pn.segment.tempVertices;

                let v_sw = new Vec3(pVerts[ind_sw], pVerts[ind_sw + 1], pVerts[ind_sw + 2]),
                    v_ne = new Vec3(pVerts[ind_ne], pVerts[ind_ne + 1], pVerts[ind_ne + 2]);

                seg.setBoundingSphere(
                    v_sw.x + (v_ne.x - v_sw.x) * 0.5,
                    v_sw.y + (v_ne.y - v_sw.y) * 0.5,
                    v_sw.z + (v_ne.z - v_sw.z) * 0.5,
                    v_sw
                );

                if (seg.tileZoom < MAX_NORMAL_ZOOM) {
                    // check for segment zoom
                    let v_nw = new Vec3(pVerts[ind_nw], pVerts[ind_nw + 1], pVerts[ind_nw + 2]),
                        v_se = new Vec3(pVerts[ind_se], pVerts[ind_se + 1], pVerts[ind_se + 2]);

                    seg._swNorm = v_sw.normal();
                    seg._nwNorm = v_nw.normal();
                    seg._neNorm = v_ne.normal();
                    seg._seNorm = v_se.normal();
                }

            } else {

                let pseg = pn.segment;

                let i0 = Math.floor(gridSize * offsetY),
                    j0 = Math.floor(gridSize * offsetX);

                let insideSize = 1.0 / gridSize;

                let t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                let bigOne;
                if (pseg.gridSize === 1) {
                    bigOne = pseg.tempVertices;
                } else {
                    bigOne = getMatrixSubArray(pseg.tempVertices, pseg.gridSize, i0, j0, 1);
                }

                let v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

                let vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                let vi_y = t_i0,
                    vi_x = t_j0;

                let coords_lt, coords_rb;

                if (vi_y + vi_x < insideSize) {
                    coords_lt = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_lt = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                vi_y = t_i0 + 1;
                vi_x = t_j0 + 1;

                if (vi_y + vi_x < insideSize) {
                    coords_rb = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_rb = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                seg.setBoundingSphere(
                    coords_lt.x + (coords_rb.x - coords_lt.x) * 0.5,
                    coords_lt.y + (coords_rb.y - coords_lt.y) * 0.5,
                    coords_lt.z + (coords_rb.z - coords_lt.z) * 0.5,
                    coords_lt
                );
            }
        } else {
            seg.createBoundsByExtent();
        }
    }
};

Node.prototype.getState = function () {
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
};

/**
 * Returns the same deep existent neighbour node.
 * @public
 * @param {Number} side - Neighbour side index e.g. og.quadTree.N, og.quadTree.W etc.
 * @returns {og.quadTree.Node} -
 */
Node.prototype.getEqualNeighbor = function (side) {
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
};

Node.prototype.isBrother = function (node) {
    return !(this.parentNode || node.parentNode) ||
        this.parentNode.id === node.parentNode.id;
};

Node.prototype.renderTree = function (cam, maxZoom, terrainReadySegment, stopLoading) {

    if (this.planet._renderedNodes.length >= MAX_RENDERED_NODES ||
        this.planet._nodeCounterError_ > 2000) {
        return;
    }

    this.planet._nodeCounterError_++;

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
        if (Math.abs(cam._lonLat.lat) <= MAX_LAT &&
            seg._projection.id === EPSG3857.id) {
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
        let commonFrustumFlag = Math.pow(2, numFrustums - 1) - 1;
        for (let i = 0; commonFrustumFlag && (i < numFrustums); i++) {
            if (frustums[i].containsSphere(seg.bsphere)) {
                commonFrustumFlag >>= 1;
                this.inFrustum |= 1 << i;
            }
        }
    }

    if (this.inFrustum || this._cameraInside) {

        let h = cam._lonLat.height;

        let altVis = (cam.eye.distance(seg.bsphere.center) - seg.bsphere.radius < VISIBLE_DISTANCE * Math.sqrt(h)) || seg.tileZoom < 2;

        if ((this.inFrustum && (altVis || h > 10000.0)) || this._cameraInside) {
            seg._collectVisibleNodes();
        }

        if (seg.tileZoom < 2 && seg.normalMapReady) {
            this.traverseNodes(cam, maxZoom, terrainReadySegment, stopLoading);
        } else if ((!maxZoom && seg.acceptForRendering(cam)) || seg.tileZoom === maxZoom) {
            this.prepareForRendering(cam, altVis, this.inFrustum, terrainReadySegment, stopLoading);
        } else if ((seg.tileZoom < planet.terrain._maxNodeZoom) && seg.terrainReady) {
            this.traverseNodes(cam, maxZoom, seg, stopLoading);
        } else {
            this.prepareForRendering(cam, altVis, this.inFrustum, terrainReadySegment, stopLoading);
        }

    } else {
        this.state = NOTRENDERING;
    }
};

Node.prototype.traverseNodes = function (cam, maxZoom, terrainReadySegment, stopLoading) {

    if (!this.ready) {
        this.createChildrenNodes();
    }

    let n = this.nodes;

    n[0].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
    n[1].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
    n[2].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
    n[3].renderTree(cam, maxZoom, terrainReadySegment, stopLoading);
};

Node.prototype.prepareForRendering = function (cam, altVis, inFrustum, terrainReadySegment, stopLoading) {

    let seg = this.segment;

    if (cam._lonLat.height < VISIBLE_HEIGHT) {

        if (altVis) {
            this.renderNode(inFrustum, !inFrustum, terrainReadySegment, stopLoading);
        } else {
            this.state = NOTRENDERING;
        }

    } else {

        if (seg.tileZoom < MAX_NORMAL_ZOOM && (
            seg._swNorm.dot(cam.eyeNorm) > DOT_VIS ||
            seg._nwNorm.dot(cam.eyeNorm) > DOT_VIS ||
            seg._neNorm.dot(cam.eyeNorm) > DOT_VIS ||
            seg._seNorm.dot(cam.eyeNorm) > DOT_VIS)) {
            this.renderNode(inFrustum, !inFrustum, terrainReadySegment, stopLoading);
        } else {
            this.state = NOTRENDERING;
        }
    }
};

Node.prototype.renderNode = function (inFrustum, onlyTerrain, terrainReadySegment, stopLoading) {

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
    if (seg.planet.lightEnabled && !seg.normalMapReady && !seg.parentNormalMapReady) {
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
};

/**
 * Seraching for neighbours and pickup current node to render processing.
 * @public
 */
Node.prototype.addToRender = function (inFrustum) {

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
            }

            this.neighbors[cs].push(ni);
            ni.neighbors[opcs].push(this);

        }
    }

    nodes.push(this);

    let k = 0,
        rf = this.planet._renderedNodesInFrustum;
    while (inFrustum) {
        if (inFrustum & 1) {
            rf[k].push(this);
        }
        k++;
        inFrustum >>= 1;
    }
};

Node.prototype.getCommonSide = function (node) {

    var as = this.segment,
        bs = node.segment;

    if (as.tileZoom === bs.tileZoom) {
        return as.getNeighborSide(bs);
    } else {

        var a = as._extent,
            b = bs._extent;
        var a_ne = a.northEast, a_sw = a.southWest,
            b_ne = b.northEast, b_sw = b.southWest;
        var a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat,
            b_ne_lon = b_ne.lon, b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

        if (a_ne_lon === b_sw_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
            a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
            return E;
        } else if (a_sw_lon === b_ne_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
            a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
            return W;
        } else if (a_ne_lat === b_sw_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
            a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
            return N;
        } else if (a_sw_lat === b_ne_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
            a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
            return S;
        } else if (a_ne_lon === POLE && b_sw_lon === -POLE) {
            return E;
        } else if (a_sw.lon === -POLE && b_ne.lon == POLE) {
            return W;
        } else if (a_ne_lat === POLE && b_sw_lat === MAX_LAT) {
            return N;
        } else if (a_sw_lat === -POLE && b_ne_lat === -MAX_LAT) {
            return S;
        }
    }

    return -1;
};

// TODO: test test test
Node.prototype.___getCommonSide___ = function (b) {

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
};

Node.prototype.whileNormalMapCreating = function () {

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
};

let BOUNDS = {
    xmin: 0.0,
    ymin: 0.0,
    zmin: 0.0,
    xmax: 0.0,
    ymax: 0.0,
    zmax: 0.0
};

Node.prototype.whileTerrainLoading = function (terrainReadySegment, stopLoading) {

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

        let tempVertices,
            tempVerticesHigh,
            tempVerticesLow;

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

            getMatrixSubArrayBoundsExt(
                pseg.terrainVertices,
                pseg.terrainVerticesHigh,
                pseg.terrainVerticesLow,
                pseg.gridSize,
                gridSize * offsetY,
                gridSize * offsetX,
                gridSize,
                tempVertices,
                tempVerticesHigh,
                tempVerticesLow,
                BOUNDS);

        } else if (gridSizeExt >= 1) {

            seg.gridSize = gridSizeExt;

            let len = (gridSizeExt + 1) * (gridSizeExt + 1) * 3;
            tempVertices = new Float64Array(len);
            tempVerticesHigh = new Float32Array(len);
            tempVerticesLow = new Float32Array(len);

            getMatrixSubArrayBoundsExt(
                pseg.normalMapVertices,
                pseg.normalMapVerticesHigh,
                pseg.normalMapVerticesLow,
                pn.segment.fileGridSize,
                gridSizeExt * offsetY,
                gridSizeExt * offsetX,
                gridSizeExt,
                tempVertices,
                tempVerticesHigh,
                tempVerticesLow,
                BOUNDS);

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
                ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

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

        seg.setBoundingSphere(
            BOUNDS.xmin + (BOUNDS.xmax - BOUNDS.xmin) * 0.5,
            BOUNDS.ymin + (BOUNDS.ymax - BOUNDS.ymin) * 0.5,
            BOUNDS.zmin + (BOUNDS.zmax - BOUNDS.zmin) * 0.5,
            new Vec3(BOUNDS.xmin, BOUNDS.ymin, BOUNDS.zmin)
        );

        if (seg.tileZoom > terrain.maxZoom) {
            if (pn.segment.tileZoom >= terrain.maxZoom) {

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
                        seg.normalMapNormals = getMatrixSubArray(pseg.normalMapNormals,
                            fgs, fgsZ * offsetY, fgsZ * offsetX, fgsZ);
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
};

Node.prototype.destroy = function () {
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
    this.segment = null;
};

Node.prototype.clearTree = function () {

    var state = this.getState();

    if (state === NOTRENDERING) {
        this.destroyBranches();
    } else if (state === RENDERING) {
        this.destroyBranches();
    } else {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i] && this.nodes[i].clearTree();
        }
    }
};

Node.prototype.clearBranches = function () {
    for (let i = 0; i < this.nodes.length; i++) {
        this.nodes[i].clearBranches();
        this.nodes[i].segment.deleteMaterials();
    }
};

Node.prototype.destroyBranches = function () {

    if (this.ready) {

        var nodesToRemove = [], i;

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
};

Node.prototype.traverseTree = function (callback) {
    callback(this);
    if (this.ready) {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].traverseTree(callback);
        }
    }
};

Node.prototype.getOffsetOppositeNeighbourSide = function (neighbourNode, side) {

    let pNode = this,
        neighbourZoom = neighbourNode.segment.tileZoom,
        offset = 0;

    while (pNode.segment.tileZoom > neighbourZoom) {
        offset += PARTOFFSET[pNode.partId][side] / (1 << (pNode.segment.tileZoom - neighbourZoom));
        pNode = pNode.parentNode;
    }

    return offset;
};

export { Node };