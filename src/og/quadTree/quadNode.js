goog.provide('og.quadTree.QuadNode');

goog.require('og.Extent');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.proj.EPSG4326');
goog.require('og.mercator');

/**
 * Quad tree planet segment node.
 * @constructor
 * @param {og.planetSegment.Segment|og.planetSegment.SegmentLonLat} segmentPrototype - Planet segment node constructor.
 * @param {og.scene.RenderNode} planet - Planet render node.
 * @param {number} partId - NorthEast, SouthWest etc.
 * @param {og.quadTree.QuadNode} parent - Parent of this node.
 * @param {number} id - Tree node identifier (id * 4 + 1);
 * @param {number} tileZoom - Deep index of the quad tree.
 * @param {og.Extent} extent - Planet segment extent.
 */
og.quadTree.QuadNode = function (segmentPrototype, planet, partId, parent, id, tileZoom, extent) {
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
    this.planetSegment = new segmentPrototype(this, planet, tileZoom, extent);

    /**
     * @private
     */
    this._cameraInside = false;
    this.createBounds();
    this.planet._createdNodesCount++;
};

og.quadTree.QuadNode.VISIBLE_DISTANCE = 3570;
og.quadTree.QuadNode._vertOrder = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
og.quadTree.QuadNode._neGridSize = Math.sqrt(og.quadTree.QuadNode._vertOrder.length) - 1;

og.quadTree.QuadNode.prototype.createChildrenNodes = function () {
    var p = this.planet;
    var ps = this.planetSegment;
    var ext = ps._extent;
    var size_x = ext.getWidth() * 0.5;
    var size_y = ext.getHeight() * 0.5;
    var ne = ext.northEast, sw = ext.southWest;
    var z = ps.tileZoom + 1;
    var id = this.nodeId * 4 + 1;
    var c = new og.LonLat(sw.lon + size_x, sw.lat + size_y);
    var nd = this.nodes;

    nd[og.quadTree.NW] = new og.quadTree.QuadNode(this.SegmentPrototype, p, og.quadTree.NW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat + size_y), new og.LonLat(sw.lon + size_x, ne.lat)));

    nd[og.quadTree.NE] = new og.quadTree.QuadNode(this.SegmentPrototype, p, og.quadTree.NE, this, id, z,
        new og.Extent(c, new og.LonLat(ne.lon, ne.lat)));

    nd[og.quadTree.SW] = new og.quadTree.QuadNode(this.SegmentPrototype, p, og.quadTree.SW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat), c));

    nd[og.quadTree.SE] = new og.quadTree.QuadNode(this.SegmentPrototype, p, og.quadTree.SE, this, id, z,
        new og.Extent(new og.LonLat(sw.lon + size_x, sw.lat), new og.LonLat(ne.lon, sw.lat + size_y)));
};

og.quadTree.QuadNode.prototype.createBounds = function () {

    var seg = this.planetSegment;

    if (!seg.tileZoom) {
        seg.bsphere.radius = seg.planet.ellipsoid._a;
        seg.bsphere.center = new og.math.Vector3();
    } else if (seg.tileZoom < seg.planet.terrainProvider.minZoom) {
        seg.createBoundsByExtent();
    } else {
        var pn = this;

        while (pn.parentNode && !pn.planetSegment.terrainReady) {
            pn = pn.parentNode;
        }

        var scale = this.planetSegment.tileZoom - pn.planetSegment.tileZoom;

        var dZ2 = Math.pow(2, scale);

        var offsetX = this.planetSegment.tileX - pn.planetSegment.tileX * dZ2,
            offsetY = this.planetSegment.tileY - pn.planetSegment.tileY * dZ2;

        if (pn.planetSegment.terrainReady) {
            var gridSize = pn.planetSegment.gridSize / Math.pow(2, scale);
            if (gridSize >= 1) {
                var pVerts = pn.planetSegment.terrainVertices;
                var i0 = gridSize * offsetY;
                var j0 = gridSize * offsetX;
                var ind1 = 3 * (i0 * (pn.planetSegment.gridSize + 1) + j0);
                var ind2 = 3 * ((i0 + gridSize) * (pn.planetSegment.gridSize + 1) + j0 + gridSize);
                seg.bsphere.setFromBounds([pVerts[ind1], pVerts[ind2], pVerts[ind1 + 1], pVerts[ind2 + 1], pVerts[ind1 + 2], pVerts[ind2 + 2]]);
            } else {
                var pseg = pn.planetSegment;

                var i0 = Math.floor(gridSize * offsetY);
                var j0 = Math.floor(gridSize * offsetX);

                var insideSize = 1 / gridSize;
                var fullSize = insideSize * pseg.gridSize;

                var t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                var bigOne = og.quadTree.getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);

                var v_lt = new og.math.Vector3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new og.math.Vector3(bigOne[9], bigOne[10], bigOne[11]);

                var vn = new og.math.Vector3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new og.math.Vector3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new og.math.Vector3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new og.math.Vector3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                var vi_y = t_i0,
                    vi_x = t_j0;

                var coords_lt, coords_rb;

                if (vi_y + vi_x < insideSize) {
                    coords_lt = og.math.Vector3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_lt = og.math.Vector3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                vi_y = t_i0 + 1,
                    vi_x = t_j0 + 1;

                if (vi_y + vi_x < insideSize) {
                    coords_rb = og.math.Vector3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_rb = og.math.Vector3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(v_rb);
                }

                seg.bsphere.radius = coords_lt.distance(coords_rb) * 0.5;
                seg.bsphere.center = coords_lt.addA(coords_rb.subA(coords_lt).scale(0.5));
            }
        } else {
            seg.createBoundsByExtent();
        }
    }
};

og.quadTree.QuadNode.prototype.getState = function () {
    //return this.planetSegment.getNodeState();
    var pn = this.parentNode;
    while (pn) {
        if (pn.state !== og.quadTree.WALKTHROUGH) {
            return og.quadTree.NOTRENDERING;
        }
        pn = pn.parentNode;
    }
    return this.state;
};

/**
 * Returns the same deep existent neighbour node.
 * @public
 * @param {Number} side - Neighbour side index e.g. og.quadTree.N, og.quadTree.W etc.
 * @returns {og.quadTree.QuadNode}
 */
og.quadTree.QuadNode.prototype.getEqualNeighbor = function (side) {
    var pn = this;
    var part = og.quadTree.NEIGHBOUR[side][pn.partId];
    if (part !== -1) {
        return pn.parentNode.nodes[part];
    } else {
        var pathId = [];
        while (pn.parentNode) {
            pathId.push(pn.partId);
            part = og.quadTree.NEIGHBOUR[side][pn.partId];
            pn = pn.parentNode;
            if (part !== -1) {
                var i = pathId.length;
                side = og.quadTree.OPSIDE[side];
                while (i--) {
                    var part = og.quadTree.OPPART[side][pathId[i]];
                    pn = pn.nodes[part];
                }
                return pn;
            }
        }
    }
};

og.quadTree.QuadNode.prototype.prepareForRendering = function (height, altVis, onlyTerrain) {
    if (height < 3000000.0) {
        if (altVis) {
            this.renderNode(onlyTerrain);
        } else {
            this.state = og.quadTree.NOTRENDERING;
        }
    } else {
        this.renderNode(onlyTerrain);
    }
};

og.quadTree.QuadNode.prototype.traverseNodes = function () {
    if (!this.nodes.length) {
        this.createChildrenNodes();
    }
    this.nodes[og.quadTree.NW].renderTree();
    this.nodes[og.quadTree.NE].renderTree();
    this.nodes[og.quadTree.SW].renderTree();
    this.nodes[og.quadTree.SE].renderTree();
};

og.quadTree.QuadNode.prototype.isBrother = function (node) {
    return !(this.parentNode || node.parentNode) ||
        this.parentNode.id === node.parentNode.id;
};

og.quadTree.QuadNode.prototype.renderTree = function () {
    this.state = og.quadTree.WALKTHROUGH;

    this.neighbors[0] = null;
    this.neighbors[1] = null;
    this.neighbors[2] = null;
    this.neighbors[3] = null;

    var cam = this.planet.renderer.activeCamera,
        seg = this.planetSegment,
        planet = this.planet;

    if (this.parentNode) {

        this._cameraInside = false;

        //Search a node which the camera is flying over.
        if (this.parentNode._cameraInside) {

            var inside;

            if (Math.abs(cam._lonLat.lat) <= og.mercator.MAX_LAT &&
                seg._projection.id === og.proj.EPSG3857.id) {
                inside = seg._extent.isInside(cam._lonLatMerc);
                cam._insideSegmentPosition = cam._lonLatMerc;
            } else if (seg._projection.id === og.proj.EPSG4326.id) {
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

    if (cam._lonLat.height < 10000.0) {
        underBottom = false;
    }

    var onlyTerrain = !inFrustum && underBottom;

    var altVis = cam.eye.distance(seg.bsphere.center) - seg.bsphere.radius <
        og.quadTree.QuadNode.VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height)

    if (inFrustum || onlyTerrain || this._cameraInside) {
        if (seg.tileZoom <= 1 && seg.normalMapReady) {
            this.traverseNodes();
        } else if (seg.acceptForRendering(cam)) {
            this.prepareForRendering(cam._lonLat.height, altVis, onlyTerrain);
        } else {
            if (seg.tileZoom < planet.terrainProvider.gridSizeByZoom.length - 1) {
                this.traverseNodes();
            } else {
                this.prepareForRendering(cam._lonLat.height, altVis, onlyTerrain);
            }
        }
    } else {
        this.state = og.quadTree.NOTRENDERING;
    }

    if (inFrustum && altVis) {
        seg._collectRenderNodes();
    }
};

/**
 * When a node is visible in frustum than begins to render it.
 * @public
 */
og.quadTree.QuadNode.prototype.renderNode = function (onlyTerrain) {

    this.state = og.quadTree.NOTRENDERING;

    var seg = this.planetSegment;

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

    this.state = og.quadTree.RENDERING;

    //Create normal map texture.
    if (seg.planet.lightEnabled && !seg.normalMapReady && !seg.parentNormalMapReady) {
        this.whileNormalMapCreating();
    }

    //Calculate minimal and maximal zoom index on the screen
    if (seg.tileZoom > this.planet.maxCurrZoom) {
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
og.quadTree.QuadNode.prototype.addToRender = function () {
    var node = this;
    var nodes = node.planet._renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        var ni = nodes[i];
        var cs = node.getCommonSide(ni);
        if (cs != -1) {
            var opcs = og.quadTree.OPSIDE[cs];

            node.neighbors[cs] = ni;
            ni.neighbors[opcs] = node;

            if (!(node.hasNeighbor[cs] && ni.hasNeighbor[opcs])) {
                var ap = node.planetSegment;
                var bp = ni.planetSegment;
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

og.quadTree.QuadNode.prototype.getCommonSide = function (node) {
    var a = this.planetSegment._extent,
        b = node.planetSegment._extent;
    var a_ne = a.northEast, a_sw = a.southWest,
        b_ne = b.northEast, b_sw = b.southWest;
    var a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat,
        b_ne_lon = b_ne.lon, b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

    var POLE = og.mercator.POLE,
        MAX_LAT = og.mercator.MAX_LAT;

    if (a_ne_lon === b_sw_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
        a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
        return og.quadTree.E;
    } else if (a_sw_lon === b_ne_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
        a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
        return og.quadTree.W;
    } else if (a_ne_lat === b_sw_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
        a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
        return og.quadTree.N;
    } else if (a_sw_lat === b_ne_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
        a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
        return og.quadTree.S;

        //POLE border
    } else if (this.planetSegment.tileZoom > 0) {
        if (a_ne_lon === POLE && b_sw_lon === -POLE) {
            return og.quadTree.E;
        } else if (a_sw_lon === -POLE && b_ne_lon === POLE) {
            return og.quadTree.E;
        } else if (a_sw_lon === -POLE && b_ne_lon === POLE) {
            return og.quadTree.W;
        }
    }

    //Poles and mercator nodes common side.
    else if (a_ne_lat === POLE && b_sw_lat === MAX_LAT) {
        return og.quadTree.N;
    } else if (a_sw_lat === -POLE && b_ne_lat === -MAX_LAT) {
        return og.quadTree.S;
    }

    return -1;
};

og.quadTree.QuadNode.prototype.whileNormalMapCreating = function () {

    var seg = this.planetSegment;
    var maxZ = this.planet.terrainProvider.maxZoom;

    if (seg.tileZoom <= maxZ && !seg.terrainIsLoading && seg.terrainReady && !seg._inTheQueue) {
        seg.planet._normalMapCreator.queue(seg);
    }

    var pn = this;

    while (pn.parentNode && !pn.planetSegment.normalMapReady) {
        pn = pn.parentNode;
    }

    var dZ2 = 2 << (seg.tileZoom - pn.planetSegment.tileZoom - 1);

    seg.normalMapTexture = pn.planetSegment.normalMapTexture;
    seg.normalMapTextureBias[0] = seg.tileX - pn.planetSegment.tileX * dZ2;
    seg.normalMapTextureBias[1] = seg.tileY - pn.planetSegment.tileY * dZ2;
    seg.normalMapTextureBias[2] = 1 / dZ2;


    if (seg.tileZoom > maxZ) {
        if (pn.planetSegment.tileZoom === maxZ) {
            seg.parentNormalMapReady = true;
        } else {
            pn = this;
            while (pn.parentNode && pn.planetSegment.tileZoom != maxZ) {
                pn = pn.parentNode;
            }
            var pns = pn.planetSegment;
            if (!pns.ready) {
                pns.createPlainSegment();
                pns.loadTerrain();
            } else if (!pns._inTheQueue && !pns.terrainIsLoading) {
                pns.planet._normalMapCreator.queue(pns);
            }
        }
    }
};

og.quadTree.QuadNode.prototype.whileTerrainLoading = function () {

    var seg = this.planetSegment;

    //Looking for terrain nodes under
    var n = this.nodes;

    //Maybe better is to replace this code to the Segment module?
    if (seg.tileZoom >= this.planet.terrainProvider.minZoom &&
        seg.tileZoom < this.planet.terrainProvider.maxZoom &&
        n.length === 4 && n[0].planetSegment.terrainReady && n[1].planetSegment.terrainReady &&
        n[2].planetSegment.terrainReady && n[3].planetSegment.terrainReady
    ) {
        var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX,
            ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;

        seg.initializePlainSegment();

        var fgs = this.planet.terrainProvider.fileGridSize;
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

                var n_nmVerts = n.planetSegment.normalMapVertices,
                    n_nmNorms = n.planetSegment.normalMapNormals;

                var x = n_nmVerts[n_index],
                    y = n_nmVerts[n_index + 1],
                    z = n_nmVerts[n_index + 2];

                nmVerts[nmInd] = x;
                nmNorms[nmInd++] = n_nmNorms[n_index];

                nmVerts[nmInd] = y;
                nmNorms[nmInd++] = n_nmNorms[n_index + 1];

                nmVerts[nmInd] = z;
                nmNorms[nmInd++] = n_nmNorms[n_index + 2];

                if (i % dg == 0 && j % dg == 0) {
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
        seg._globalTextureCoordinates[0] = (e.southWest.lon + og.mercator.POLE) * og.mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[1] = (og.mercator.POLE - e.northEast.lat) * og.mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[2] = (e.northEast.lon + og.mercator.POLE) * og.mercator.ONE_BY_POLE_DOUBLE;
        seg._globalTextureCoordinates[3] = (og.mercator.POLE - e.southWest.lat) * og.mercator.ONE_BY_POLE_DOUBLE;

        return false;
    }


    //Looking for ready terrain above

    if (!seg.ready) {
        seg.createPlainSegment();
    }

    var pn = this;

    while (pn.parentNode && !pn.planetSegment.terrainReady) {
        pn = pn.parentNode;
    }

    if (pn.planetSegment.terrainReady) {

        var dZ2 = 2 << (seg.tileZoom - pn.planetSegment.tileZoom - 1);
        var offsetX = seg.tileX - pn.planetSegment.tileX * dZ2,
            offsetY = seg.tileY - pn.planetSegment.tileY * dZ2;

        var pseg = pn.planetSegment;

        if (pn.planetSegment.terrainExists && this.appliedTerrainNodeId != pn.nodeId) {

            var gridSize = pn.planetSegment.gridSize / dZ2;
            var tempVertices;

            var fgs = this.planet.terrainProvider.fileGridSize,
                fgsZ = fgs / dZ2;
            var tempNormalMapNormals;

            seg.deleteBuffers();
            seg.refreshIndexesBuffer = true;

            if (gridSize >= 1) {
                seg.gridSize = gridSize;
                this.sideSize = [gridSize, gridSize, gridSize, gridSize];

                tempVertices = og.quadTree.getMatrixSubArray(pseg.terrainVertices,
                    pseg.gridSize, gridSize * offsetY, gridSize * offsetX, gridSize);

                tempNormalMapNormals = og.quadTree.getMatrixSubArray(pseg.normalMapNormals,
                    fgs, fgsZ * offsetY, fgsZ * offsetX, fgsZ);
            } else {
                seg.gridSize = og.quadTree.QuadNode._neGridSize;
                this.sideSize = [seg.gridSize, seg.gridSize, seg.gridSize, seg.gridSize];

                var i0 = Math.floor(gridSize * offsetY);
                var j0 = Math.floor(gridSize * offsetX);

                var bigOne = og.quadTree.getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);

                var insideSize = 1.0 / gridSize;

                var t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                var v_lt = new og.math.Vector3(bigOne[0], bigOne[1], bigOne[2]),
                    v_rb = new og.math.Vector3(bigOne[9], bigOne[10], bigOne[11]);

                var vn = new og.math.Vector3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new og.math.Vector3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new og.math.Vector3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new og.math.Vector3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                var coords = new og.math.Vector3();
                var vo = og.quadTree.QuadNode._vertOrder;

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

        var maxZ = this.planet.terrainProvider.maxZoom;

        if (seg.tileZoom > maxZ) {
            if (pn.planetSegment.tileZoom >= maxZ) {
                seg.terrainReady = true;
                seg.terrainIsLoading = false;
                this.appliedTerrainNodeId = this.nodeId;
                if (pn.planetSegment.terrainExists) {
                    seg.terrainExists = true;
                    seg.terrainVertices = tempVertices;
                    seg.normalMapNormals = tempNormalMapNormals;
                }
            } else {
                pn = this;
                while (pn.parentNode && pn.planetSegment.tileZoom !== maxZ) {
                    pn = pn.parentNode;
                }
                var pns = pn.planetSegment;
                if (!pns.ready) {
                    pns.createPlainSegment();
                }
                pns.loadTerrain();
            }
        }
    }

    return true;
};

/**
 * Static function returns triangle coordinate array from inside of the source triangle array.
 * @static
 * @param {Array.<number>} sourceArr - Source array
 * @param {number} gridSize - Source array square matrix size
 * @param {number} i0 - First row index source array matrix
 * @param {number} j0 - First column index
 * @param {number} size - Square matrix result size.
 * @return{Array.<number>} Triangle coordinates array from the source array.
 */
og.quadTree.getMatrixSubArray = function (sourceArr, gridSize, i0, j0, size) {
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

og.quadTree.QuadNode.prototype.clearTree = function () {

    var state = this.getState();

    if (state === og.quadTree.NOTRENDERING) {
        this.destroyBranches(true);
    } else if (state === og.quadTree.RENDERING) {
        this.destroyBranches(false);
    } else {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clearTree();
        }
    }
};

og.quadTree.QuadNode.prototype.destroy = function () {
    this.state = og.quadTree.NOTRENDERING;
    this.planetSegment.destroySegment();
    var n = this.neighbors;
    n[og.quadTree.N] && n[og.quadTree.N].neighbors && (n[og.quadTree.N].neighbors[og.quadTree.S] = null);
    n[og.quadTree.E] && n[og.quadTree.E].neighbors && (n[og.quadTree.E].neighbors[og.quadTree.W] = null);
    n[og.quadTree.S] && n[og.quadTree.S].neighbors && (n[og.quadTree.S].neighbors[og.quadTree.N] = null);
    n[og.quadTree.W] && n[og.quadTree.W].neighbors && (n[og.quadTree.W].neighbors[og.quadTree.E] = null);
    this.neighbors = null;
    this.hasNeighbors = null;
    this.parentNode = null;
    this.sideSize = null;
    this.planetSegment = null;
};

og.quadTree.QuadNode.prototype.destroyBranches = function (cls) {

    if (cls) {
        //this.planetSegment.clearSegment();
        //this.appliedTerrainNodeId = -1;
    }

    var nodesToRemove = [];
    for (var i = 0; i < this.nodes.length; i++) {
        nodesToRemove[i] = this.nodes[i];
    }

    this.nodes.neighbors = [null, null, null, null];
    this.nodes.length = 0;
    this.nodes = [];

    for (var i = 0; i < nodesToRemove.length; i++) {
        nodesToRemove[i].destroyBranches(false);
        nodesToRemove[i].destroy();
        nodesToRemove[i] = null;
    }
    nodesToRemove.length = 0;
    nodesToRemove = null;
};

og.quadTree.QuadNode.prototype.traverseTree = function (callback) {
    callback(this);
    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].traverseTree(callback);
    }
};
