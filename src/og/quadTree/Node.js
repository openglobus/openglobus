/**
 * @module og/quadTree/Node
 */

'use strict';

import * as mercator from '../mercator.js';
import * as math from '../math.js';
import * as quadTree from './quadTree.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { EPSG4326 } from '../proj/EPSG4326.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Vec3 } from '../math/Vec3.js';

const VISIBLE_DISTANCE = 3570;

/**
 * Returns triangle coordinate array from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 */
function getMatrixSubArray(sourceArr, gridSize, i0, j0, size) {
    var res = new Float32Array((i0 + size + 1) * (j0 + size + 1) * 3);
    var vInd = 0;
    for (var i = i0; i <= i0 + size; i++) {
        for (var j = j0; j <= j0 + size; j++) {
            var ind = 3 * (i * (gridSize + 1) + j);
            res[vInd++] = sourceArr[ind];
            res[vInd++] = sourceArr[ind + 1];
            res[vInd++] = sourceArr[ind + 2];
        }
    }
    return res;
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
const Node = function (segmentPrototype, planet, partId, parent, id, tileZoom, extent) {
    this.planet = planet;
    this.parentNode = parent;
    this.nodes = [];
    this.partId = partId;
    this.nodeId = partId + id;
    this.state = null;
    this.appliedTerrainNodeId = -1;
    this.sideSize = [1, 1, 1, 1];
    this.hasNeighbor = [false, false, false, false];
    this.neighbors = [null, null, null, null];
    this.SegmentPrototype = segmentPrototype;
    this.segment = new segmentPrototype(this, planet, tileZoom, extent);

    /**
     * @private
     */
    this._cameraInside = false;
    this.createBounds();
    this.planet._createdNodesCount++;
};

const _vertOrder = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
const _neGridSize = Math.sqrt(_vertOrder.length) - 1;

Node.prototype.createChildrenNodes = function () {
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

    nd[quadTree.NW] = new Node(this.SegmentPrototype, p, quadTree.NW, this, id, z,
        new Extent(new LonLat(sw.lon, sw.lat + size_y), new LonLat(sw.lon + size_x, ne.lat)));

    nd[quadTree.NE] = new Node(this.SegmentPrototype, p, quadTree.NE, this, id, z,
        new Extent(c, new LonLat(ne.lon, ne.lat)));

    nd[quadTree.SW] = new Node(this.SegmentPrototype, p, quadTree.SW, this, id, z,
        new Extent(new LonLat(sw.lon, sw.lat), c));

    nd[quadTree.SE] = new Node(this.SegmentPrototype, p, quadTree.SE, this, id, z,
        new Extent(new LonLat(sw.lon + size_x, sw.lat), new LonLat(ne.lon, sw.lat + size_y)));
};

Node.prototype.createBounds = function () {

    var seg = this.segment;

    if (!seg.tileZoom) {
        seg.bsphere.radius = seg.planet.ellipsoid._a;
        seg.bsphere.center = new Vec3();
    } else if (seg.tileZoom < seg.planet.terrain.minZoom) {
        seg.createBoundsByExtent();
    } else {
        var pn = this;

        while (pn.parentNode && !pn.segment.terrainReady) {
            pn = pn.parentNode;
        }

        var scale = this.segment.tileZoom - pn.segment.tileZoom;

        var dZ2 = Math.pow(2, scale);

        var offsetX = this.segment.tileX - pn.segment.tileX * dZ2,
            offsetY = this.segment.tileY - pn.segment.tileY * dZ2;

        if (pn.segment.terrainReady) {
            var gridSize = pn.segment.gridSize / Math.pow(2, scale);
            if (gridSize >= 1) {
                var pVerts = pn.segment.terrainVertices;
                var i0 = gridSize * offsetY;
                var j0 = gridSize * offsetX;
                var ind1 = 3 * (i0 * (pn.segment.gridSize + 1) + j0);
                var ind2 = 3 * ((i0 + gridSize) * (pn.segment.gridSize + 1) + j0 + gridSize);
                seg.bsphere.setFromBounds([pVerts[ind1], pVerts[ind2], pVerts[ind1 + 1], pVerts[ind2 + 1], pVerts[ind1 + 2], pVerts[ind2 + 2]]);
            } else {
                var pseg = pn.segment;

                var i0 = Math.floor(gridSize * offsetY);
                var j0 = Math.floor(gridSize * offsetX);

                var insideSize = 1 / gridSize;
                var fullSize = insideSize * pseg.gridSize;

                var t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                var bigOne = getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);

                var v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

                var vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                var vi_y = t_i0,
                    vi_x = t_j0;

                var coords_lt, coords_rb;

                if (vi_y + vi_x < insideSize) {
                    coords_lt = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_lt = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                vi_y = t_i0 + 1,
                    vi_x = t_j0 + 1;

                if (vi_y + vi_x < insideSize) {
                    coords_rb = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_rb = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                seg.bsphere.radius = coords_lt.distance(coords_rb) * 0.5;
                seg.bsphere.center = coords_lt.addA(coords_rb.subA(coords_lt).scale(0.5));
            }
        } else {
            seg.createBoundsByExtent();
        }
    }
};

Node.prototype.getState = function () {
    //return this.segment.getNodeState();
    var pn = this.parentNode;
    while (pn) {
        if (pn.state !== quadTree.WALKTHROUGH) {
            return quadTree.NOTRENDERING;
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
    var part = quadTree.NEIGHBOUR[side][pn.partId];
    if (part !== -1) {
        return pn.parentNode.nodes[part];
    } else {
        var pathId = [];
        while (pn.parentNode) {
            pathId.push(pn.partId);
            part = quadTree.NEIGHBOUR[side][pn.partId];
            pn = pn.parentNode;
            if (part !== -1) {
                var i = pathId.length;
                side = quadTree.OPSIDE[side];
                while (pn && i--) {
                    part = quadTree.OPPART[side][pathId[i]];
                    pn = pn.nodes[part];
                }
                return pn;
            }
        }
    }
};

Node.prototype.prepareForRendering = function (height, altVis, onlyTerrain) {
    if (height < 3000000.0) {
        if (altVis) {
            this.renderNode(onlyTerrain);
        } else {
            this.state = quadTree.NOTRENDERING;
        }
    } else {
        this.renderNode(onlyTerrain);
    }
};

Node.prototype.traverseNodes = function (maxZoom) {
    if (!this.nodes.length) {
        this.createChildrenNodes();
    }
    this.nodes[quadTree.NW].renderTree(maxZoom);
    this.nodes[quadTree.NE].renderTree(maxZoom);
    this.nodes[quadTree.SW].renderTree(maxZoom);
    this.nodes[quadTree.SE].renderTree(maxZoom);
};

Node.prototype.isBrother = function (node) {
    return !(this.parentNode || node.parentNode) ||
        this.parentNode.id === node.parentNode.id;
};

Node.prototype.renderTree = function (maxZoom) {
    this.state = quadTree.WALKTHROUGH;

    this.neighbors[0] = null;
    this.neighbors[1] = null;
    this.neighbors[2] = null;
    this.neighbors[3] = null;

    var cam = this.planet.renderer.activeCamera,
        seg = this.segment,
        planet = this.planet;


    if (this.parentNode) {

        this._cameraInside = false;

        //Search a node which the camera is flying over.
        if (this.parentNode._cameraInside) {
            var inside;
            if (Math.abs(cam._lonLat.lat) <= mercator.MAX_LAT &&
                seg._projection.id === EPSG3857.id) {
                inside = seg._extent.isInside(cam._lonLatMerc);
                cam._insideSegmentPosition = cam._lonLatMerc;
            } else if (seg._projection.id === EPSG4326.id) {
                inside = seg._extent.isInside(cam._lonLat);
                cam._insideSegmentPosition = cam._lonLat;
            }

            if (inside) {
                cam._insideSegment = seg;
                this._cameraInside = true;
            }
        }
    } else {
        this._cameraInside = true;
    }

    var inFrustum = cam.frustum.containsSphere(seg.bsphere),
        underBottom = false;

    var h = cam._lonLat.height;

    // if (h < 10000.0) {
    //     underBottom = true;
    // }

    var onlyTerrain = !inFrustum && underBottom;

    var altVis = cam.eye.distance(seg.bsphere.center) - seg.bsphere.radius <
        VISIBLE_DISTANCE * Math.sqrt(h);

    if (inFrustum || onlyTerrain || this._cameraInside) {
        if (seg.tileZoom < 2 && seg.normalMapReady) {
            this.traverseNodes(maxZoom);
        } else if (seg.tileZoom === maxZoom || !maxZoom && seg.acceptForRendering(cam)) {
            this.prepareForRendering(h, altVis, onlyTerrain);
        } else {
            if (seg.tileZoom < planet.terrain.gridSizeByZoom.length - 1) {
                this.traverseNodes(maxZoom);
            } else {
                this.prepareForRendering(h, altVis, onlyTerrain);
            }
        }
    } else {
        this.state = quadTree.NOTRENDERING;
    }

    if (inFrustum && (altVis || h > 10000.0)) {
        seg._collectRenderNodes();
    }
};

/**
 * When a node is visible in frustum than begins to render it.
 * @public
 * @param {Boolean} onlyTerrain - It means that loads only terrain for this node.
 */
Node.prototype.renderNode = function (onlyTerrain) {

    this.state = quadTree.NOTRENDERING;

    var seg = this.segment;

    //Create and load terrain data.
    if (!seg.terrainReady) {
        //if true proceed to load
        if (this.whileTerrainLoading()) {
            seg.loadTerrain();
        }
    }

    if (onlyTerrain) {
        return;
    }

    this.state = quadTree.RENDERING;

    //Create normal map texture.
    if (seg.planet.lightEnabled && !seg.normalMapReady && !seg.parentNormalMapReady) {
        this.whileNormalMapCreating();
    }

    //Calculate minimal and maximal zoom index on the screen
    if (!this._cameraInside && seg.tileZoom > this.planet.maxCurrZoom) {
        this.planet.maxCurrZoom = seg.tileZoom;
    }

    if (seg.tileZoom < this.planet.minCurrZoom) {
        this.planet.minCurrZoom = seg.tileZoom;
    }

    seg._addViewExtent();

    //Finally this node proceed to rendering.
    this.addToRender();
};

/**
 * Seraching for neighbours and pickup current node to render processing.
 * @public
 */
Node.prototype.addToRender = function () {
    var node = this;
    var nodes = node.planet._renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        var ni = nodes[i];
        var cs = node.getCommonSide(ni);
        if (cs !== -1) {
            var opcs = quadTree.OPSIDE[cs];

            node.neighbors[cs] = ni;
            ni.neighbors[opcs] = node;

            if (!(node.hasNeighbor[cs] && ni.hasNeighbor[opcs])) {
                var ap = node.segment;
                var bp = ni.segment;
                var ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.tileZoom - ap.tileZoom));

                node.hasNeighbor[cs] = true;
                ni.hasNeighbor[opcs] = true;

                if (ld > 1) {
                    node.sideSize[cs] = Math.ceil(ap.gridSize / ld);
                    ni.sideSize[opcs] = bp.gridSize;
                }
                else if (ld < 1) {
                    node.sideSize[cs] = ap.gridSize;
                    ni.sideSize[opcs] = Math.ceil(bp.gridSize * ld);
                } else {
                    node.sideSize[cs] = ap.gridSize;
                    ni.sideSize[opcs] = bp.gridSize;
                }
            }
        }
    }
    nodes.push(node);
};

Node.prototype.getCommonSide = function (node) {
    var a = this.segment._extent,
        b = node.segment._extent;
    var a_ne = a.northEast, a_sw = a.southWest,
        b_ne = b.northEast, b_sw = b.southWest;
    var a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat,
        b_ne_lon = b_ne.lon, b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

    var POLE = mercator.POLE,
        MAX_LAT = mercator.MAX_LAT;

    if (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat || a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat) {
        if (a_ne_lon === b_sw_lon) {
            return quadTree.E;
        } else if (a_sw_lon === b_ne_lon) {
            return quadTree.W;
        } else if (this.segment.tileZoom > 0) {
            if (a_ne_lon === POLE && b_sw_lon === -POLE) {
                return quadTree.E;
            } else if (a_sw_lon === -POLE && b_ne_lon === POLE) {
                return quadTree.E;
            } else if (a_sw_lon === -POLE && b_ne_lon === POLE) {
                return quadTree.W;
            }
        }
    } else if (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon || a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon) {
        if (a_ne_lat === b_sw_lat) {
            return quadTree.N;
        } else if (a_sw_lat === b_ne_lat) {
            return quadTree.S;
        } else if (a_ne_lat === POLE && b_sw_lat === MAX_LAT) {
            return quadTree.N;
        } else if (a_sw_lat === -POLE && b_ne_lat === -MAX_LAT) {
            return quadTree.S;
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
    seg.normalMapTextureBias[2] = 1 / dZ2;


    if (seg.tileZoom > maxZ) {
        if (pn.segment.tileZoom === maxZ) {
            seg.parentNormalMapReady = true;
        } else {
            pn = this;
            while (pn.parentNode && pn.segment.tileZoom !== maxZ) {
                pn = pn.parentNode;
            }
            var pns = pn.segment;
            if (!pns.ready) {
                pns.createPlainSegment();
                pns.loadTerrain();
            } else if (!pns._inTheQueue && !pns.terrainIsLoading) {
                pns.planet._normalMapCreator.queue(pns);
            }
        }
    }
};

Node.prototype.whileTerrainLoading = function () {

    var seg = this.segment;

    //Looking for terrain nodes under
    var n = this.nodes;

    //Maybe better is to replace this code to the Segment module?
    if (seg.tileZoom >= this.planet.terrain.minZoom &&
        seg.tileZoom < this.planet.terrain.maxZoom &&
        n.length === 4 && n[0].segment.terrainReady && n[1].segment.terrainReady &&
        n[2].segment.terrainReady && n[3].segment.terrainReady
    ) {
        var xmin = math.MAX, xmax = math.MIN, ymin = math.MAX,
            ymax = math.MIN, zmin = math.MAX, zmax = math.MIN;

        seg.initializePlainSegment();

        var fgs = this.planet.terrain.fileGridSize;
        var dg = Math.max(fgs / seg.gridSize, 1),
            gs = Math.max(fgs, seg.gridSize) + 1;
        var ind = 0,
            nmInd = 0;

        var gs3 = gs * gs * 3,
            sgs3 = (seg.gridSize + 1) * (seg.gridSize + 1) * 3;

        var hgsOne = 0.5 * (gs - 1) + 1;

        seg.terrainVertices && (seg.terrainVertices = null);
        seg.normalMapNormals && (seg.normalMapNormals = null);
        seg.normalMapVertices && (seg.normalMapVertices = null);

        seg.terrainVertices = new Float32Array(sgs3);
        seg.normalMapVertices = new Float32Array(gs3);
        seg.normalMapNormals = new Float32Array(gs3);

        var verts = seg.terrainVertices,
            nmVerts = seg.normalMapVertices,
            nmNorms = seg.normalMapNormals;

        for (var i = 0; i < gs; i++) {

            var ni = Math.floor(i / hgsOne),
                ii = i % hgsOne + ni;

            for (var j = 0; j < gs; j++) {

                var nj = Math.floor(j / hgsOne);
                var n = this.nodes[2 * ni + nj];

                var nii = ii * 2,
                    njj = (j % hgsOne + nj) * 2;

                var n_index = 3 * (nii * gs + njj);

                var n_nmVerts = n.segment.normalMapVertices,
                    n_nmNorms = n.segment.normalMapNormals;

                var x = n_nmVerts[n_index],
                    y = n_nmVerts[n_index + 1],
                    z = n_nmVerts[n_index + 2];

                nmVerts[nmInd] = x;
                nmNorms[nmInd++] = n_nmNorms[n_index];

                nmVerts[nmInd] = y;
                nmNorms[nmInd++] = n_nmNorms[n_index + 1];

                nmVerts[nmInd] = z;
                nmNorms[nmInd++] = n_nmNorms[n_index + 2];

                if (i % dg === 0 && j % dg === 0) {
                    verts[ind++] = x;
                    verts[ind++] = y;
                    verts[ind++] = z;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;
                }
            }
        }

        if (seg.planet.lightEnabled) {
            //seg.createNormalMapTexture();
            this.planet._normalMapCreator.unshift(seg);
        }

        seg.createCoordsBuffers(seg.terrainVertices, seg.gridSize);
        seg.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);

        this.appliedTerrainNodeId = this.nodeId;
        seg.terrainReady = true;
        seg.terrainExists = true;
        seg.terrainIsLoading = false;

        seg.ready = true;

        var e = seg._extent;
        seg._globalTextureCoordinates[0] = (e.southWest.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[1] = (mercator.POLE - e.northEast.lat) * mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[2] = (e.northEast.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[3] = (mercator.POLE - e.southWest.lat) * mercator.ONE_BY_POLE_DOUBLE;

        return false;
    }


    //Looking for ready terrain above

    if (!seg.ready) {
        seg.createPlainSegment();
    }

    var pn = this;

    while (pn.parentNode && !pn.segment.terrainReady) {
        pn = pn.parentNode;
    }

    if (pn.segment.terrainReady) {

        var dZ2 = 2 << (seg.tileZoom - pn.segment.tileZoom - 1);
        var offsetX = seg.tileX - pn.segment.tileX * dZ2,
            offsetY = seg.tileY - pn.segment.tileY * dZ2;

        var pseg = pn.segment;

        if (pn.segment.terrainExists && this.appliedTerrainNodeId !== pn.nodeId) {

            var gridSize = pn.segment.gridSize / dZ2;
            var tempVertices;

            var fgs = this.planet.terrain.fileGridSize,
                fgsZ = fgs / dZ2;
            var tempNormalMapNormals;

            seg.deleteBuffers();
            seg.refreshIndexesBuffer = true;

            if (gridSize >= 1) {
                seg.gridSize = gridSize;
                this.sideSize = [gridSize, gridSize, gridSize, gridSize];

                tempVertices = getMatrixSubArray(pseg.terrainVertices,
                    pseg.gridSize, gridSize * offsetY, gridSize * offsetX, gridSize);

                tempNormalMapNormals = getMatrixSubArray(pseg.normalMapNormals,
                    fgs, fgsZ * offsetY, fgsZ * offsetX, fgsZ);
            } else {
                seg.gridSize = _neGridSize;
                this.sideSize = [seg.gridSize, seg.gridSize, seg.gridSize, seg.gridSize];

                var i0 = Math.floor(gridSize * offsetY);
                var j0 = Math.floor(gridSize * offsetX);

                var bigOne = getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);

                var insideSize = 1.0 / gridSize;

                var t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                var v_lt = new Vec3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new Vec3(bigOne[9], bigOne[10], bigOne[11]);

                var vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                var coords = new Vec3();
                var vo = _vertOrder;

                tempVertices = new Float32Array(3 * vo.length);

                for (var i = 0; i < vo.length; i++) {
                    var vi_y = vo[i].y + t_i0,
                        vi_x = vo[i].x + t_j0;

                    var vi_x_is = vi_x * gridSize,
                        vi_y_is = vi_y * gridSize;

                    if (vi_y + vi_x < insideSize) {
                        coords = vn.scaleTo(vi_x_is).addA(vw.scaleTo(vi_y_is)).addA(v_lt);
                    } else {
                        coords = vs.scaleTo(1 - vi_x_is).addA(ve.scaleTo(1 - vi_y_is)).addA(v_rb);
                    }

                    var i3 = i * 3;

                    tempVertices[i3] = coords.x;
                    tempVertices[i3 + 1] = coords.y;
                    tempVertices[i3 + 2] = coords.z;
                }
            }

            seg.createCoordsBuffers(tempVertices, seg.gridSize);

            //seg.tempVertices is useful for earth point calculation(see planetSegment object)
            seg.tempVertices = tempVertices;
            this.appliedTerrainNodeId = pn.nodeId;
        }

        var maxZ = this.planet.terrain.maxZoom;

        if (seg.tileZoom > maxZ) {
            if (pn.segment.tileZoom >= maxZ) {
                seg.terrainReady = true;
                seg.terrainIsLoading = false;
                this.appliedTerrainNodeId = this.nodeId;
                if (pn.segment.terrainExists) {
                    seg.terrainExists = true;
                    seg.terrainVertices = tempVertices;
                    seg.normalMapNormals = tempNormalMapNormals;
                }
            } else {
                pn = this;
                while (pn.parentNode && pn.segment.tileZoom !== maxZ) {
                    pn = pn.parentNode;
                }
                var pns = pn.segment;
                if (!pns.ready) {
                    pns.createPlainSegment();
                }
                pns.loadTerrain();
            }
        }
    }

    return true;
};

Node.prototype.clearTree = function () {

    var state = this.getState();

    if (state === quadTree.NOTRENDERING) {
        this.destroyBranches(true);
    } else if (state === quadTree.RENDERING) {
        this.destroyBranches(false);
    } else {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clearTree();
        }
    }
};

Node.prototype.destroy = function () {
    this.state = quadTree.NOTRENDERING;
    this.segment.destroySegment();
    var n = this.neighbors;
    n[quadTree.N] && n[quadTree.N].neighbors && (n[quadTree.N].neighbors[quadTree.S] = null);
    n[quadTree.E] && n[quadTree.E].neighbors && (n[quadTree.E].neighbors[quadTree.W] = null);
    n[quadTree.S] && n[quadTree.S].neighbors && (n[quadTree.S].neighbors[quadTree.N] = null);
    n[quadTree.W] && n[quadTree.W].neighbors && (n[quadTree.W].neighbors[quadTree.E] = null);
    this.neighbors = null;
    this.hasNeighbors = null;
    this.parentNode = null;
    this.sideSize = null;
    this.segment = null;
};

Node.prototype.destroyBranches = function (cls) {

    var nodesToRemove = [],
        i;

    for (i = 0; i < this.nodes.length; i++) {
        nodesToRemove[i] = this.nodes[i];
    }

    this.nodes.neighbors = [null, null, null, null];
    this.nodes.length = 0;
    this.nodes = [];

    for (i = 0; i < nodesToRemove.length; i++) {
        nodesToRemove[i].destroyBranches(false);
        nodesToRemove[i].destroy();
        nodesToRemove[i] = null;
    }
    nodesToRemove.length = 0;
    nodesToRemove = null;
};

Node.prototype.traverseTree = function (callback) {
    callback(this);
    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].traverseTree(callback);
    }
};

export { Node };