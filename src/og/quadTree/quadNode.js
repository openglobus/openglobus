goog.provide('og.quadTree.QuadNode');

goog.require('og.planetSegment.Material');
goog.require('og.Extent');
goog.require('og.LonLat');
goog.require('og.quadTree');
goog.require('og.proj.EPSG4326');
goog.require('og.mercator');

/**
 * Quad tree node class.
 * @class
 * @api
 */
og.quadTree.QuadNode = function (planetSegmentPrototype) {
    this.parentNode = null;
    this.nodes = [];
    this.planetSegment = null;
    this.partId = null;
    this.nodeId = null;
    this.planet = null;
    this.state = null;
    this.appliedTerrainNodeId = -1;
    //this.appliedTextureNodeId = -1;
    this.sideSize = [0, 0, 0, 0];
    this.hasNeighbor = [false, false, false, false];
    this.neighbors = [null, null, null, null];
    this.cameraInside = false;

    this.planetSegmentPrototype = planetSegmentPrototype;
};

og.quadTree.QuadNode._vertOrder = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
og.quadTree.QuadNode._neGridSize = Math.sqrt(og.quadTree.QuadNode._vertOrder.length) - 1;

og.quadTree.QuadNode.createNode = function (planetSegmentPrototype, planet, partId, parent, id, zoomIndex, extent) {
    var node = new og.quadTree.QuadNode();
    node.partId = partId;
    node.parentNode = parent;
    node.nodeId = partId + id;
    node.planet = planet;
    node.planetSegment = new planetSegmentPrototype();
    node.planetSegmentPrototype = planetSegmentPrototype;
    node.planetSegment.node = node;
    node.planetSegment.planet = planet;
    node.planetSegment.handler = planet.renderer.handler;
    node.planetSegment.assignTileIndexes(zoomIndex, extent);
    node.planetSegment.gridSize = planet.terrainProvider.gridSizeByZoom[zoomIndex];
    node.createBounds();
    node.planet.createdNodesCount++;
    return node;
};

og.quadTree.QuadNode.prototype.createBounds = function () {

    var seg = this.planetSegment;

    if (!seg.zoomIndex) {
        seg.bsphere.radius = seg.planet.ellipsoid._a;
        seg.bsphere.center = new og.math.Vector3();
    } else if (seg.zoomIndex < seg.planet.terrainProvider.minZoom) {
        seg.createBoundsByExtent();
    } else {
        var pn = this;

        while (pn.parentNode && !pn.planetSegment.terrainReady) {
            pn = pn.parentNode;
        }

        var scale = this.planetSegment.zoomIndex - pn.planetSegment.zoomIndex;

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
                    coords_lt = og.math.Vector3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).add(v_lt);
                } else {
                    coords_lt = og.math.Vector3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).add(v_rb);
                }

                vi_y = t_i0 + 1,
                vi_x = t_j0 + 1;

                if (vi_y + vi_x < insideSize) {
                    coords_rb = og.math.Vector3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).add(v_lt);
                } else {
                    coords_rb = og.math.Vector3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).add(v_rb);
                }

                seg.bsphere.radius = coords_lt.distance(coords_rb) * 0.5;
                seg.bsphere.center = coords_lt.add(coords_rb.sub(coords_lt).scale(0.5));
            }
        } else {
            seg.createBoundsByExtent();
        }
    }
};

og.quadTree.QuadNode.prototype.createChildrenNodes = function () {
    var p = this.planet;
    var ps = this.planetSegment;
    var ext = ps.extent;
    var size_x = ext.getWidth() * 0.5;
    var size_y = ext.getHeight() * 0.5;
    var ne = ext.northEast, sw = ext.southWest;
    var z = ps.zoomIndex + 1;
    var id = this.nodeId * 4 + 1;
    var c = new og.LonLat(sw.lon + size_x, sw.lat + size_y);
    var nd = this.nodes;

    nd[og.quadTree.NW] = og.quadTree.QuadNode.createNode(this.planetSegmentPrototype, p, og.quadTree.NW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat + size_y), new og.LonLat(sw.lon + size_x, ne.lat)));

    nd[og.quadTree.NE] = og.quadTree.QuadNode.createNode(this.planetSegmentPrototype, p, og.quadTree.NE, this, id, z,
        new og.Extent(c, new og.LonLat(ne.lon, ne.lat)));

    nd[og.quadTree.SW] = og.quadTree.QuadNode.createNode(this.planetSegmentPrototype, p, og.quadTree.SW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat), c));

    nd[og.quadTree.SE] = og.quadTree.QuadNode.createNode(this.planetSegmentPrototype, p, og.quadTree.SE, this, id, z,
         new og.Extent(new og.LonLat(sw.lon + size_x, sw.lat), new og.LonLat(ne.lon, sw.lat + size_y)));
};

og.quadTree.QuadNode.prototype.reloadTerrain = function () {

    this.planetSegment.clearBuffers();
    this.planetSegment.deleteElevations();

    if (this.getState() === og.quadTree.WALKTHROUGH) {
        this.planetSegment.loadTerrain();
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].reloadTerrain();
    }
};

og.quadTree.QuadNode.prototype.getState = function () {
    var pn = this.parentNode;
    while (pn) {
        if (pn.state != og.quadTree.WALKTHROUGH) {
            return og.quadTree.NOTRENDERING;
        }
        pn = pn.parentNode;
    }
    return this.state;
};

og.quadTree.QuadNode.VISIBLE_DISTANCE = 3570;

og.quadTree.QuadNode.prototype.prepareForRendering = function (cam) {
    if (cam._lonLat.height < 3000000.0) {
        var distance = cam.eye.distance(this.planetSegment.bsphere.center) - this.planetSegment.bsphere.radius;
        var horizon = og.quadTree.QuadNode.VISIBLE_DISTANCE * Math.sqrt(cam._lonLat.height);
        if (distance < horizon) {
            this.renderNode();
        } else {
            this.state = og.quadTree.NOTRENDERING;
        }

    } else {
        this.renderNode();
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

og.quadTree.QuadNode.prototype.renderTree = function () {
    this.state = og.quadTree.WALKTHROUGH;

    var cam = this.planet.renderer.activeCamera,
        seg = this.planetSegment,
        planet = this.planet;

    if (this.parentNode) {
        this.cameraInside = cam._isInsideSegment(this.planetSegment);
    } else {
        this.cameraInside = true;
    }

    if (cam.frustum.containsSphere(seg.bsphere) > 0 || this.cameraInside) {

        if (seg.acceptForRendering(cam)) {
            this.prepareForRendering(cam);
        }
        else {
            if (seg.zoomIndex < planet.terrainProvider.gridSizeByZoom.length - 1) {
                this.traverseNodes();
            }
            else {
                this.prepareForRendering(cam);
            }
        }
    } else {
        this.state = og.quadTree.NOTRENDERING;
    }
};

og.quadTree.QuadNode.prototype.createPlainSegment = function (segment) {
    var gridSize = this.planet.terrainProvider.gridSizeByZoom[segment.zoomIndex];
    segment.gridSize = gridSize;
    this.sideSize = [gridSize, gridSize, gridSize, gridSize];
    segment.createPlainVertices(gridSize);

    segment.terrainVertices = segment.plainVertices;

    segment.createCoordsBuffers(segment.plainVertices, gridSize);
    segment.ready = true;
};

og.quadTree.QuadNode.prototype.renderNode = function () {

    this.state = og.quadTree.RENDERING;
    var seg = this.planetSegment;

    if (!seg.ready) {
        this.createPlainSegment(seg);
    }

    if (!seg.terrainReady) {
        seg.loadTerrain();
        this.whileTerrainLoading();
    }

    if (seg.planet.lightEnabled && !(seg.normalMapReady || seg.parentNormalMapReady)) {
        this.whileNormalMapCreating();
    }

    this.createGeoImage();

    var vl = this.planet.visibleLayers,
        pm = seg.materials;

    for (var i = 0; i < vl.length; i++) {
        var li = vl[i],
            pml_id = pm[li._id];

        if (!pml_id) {
            pml_id = seg.materials[li._id] = new og.planetSegment.Material(seg, li);
        }

        if (!pml_id.imageReady) {
            pml_id.loadTileImage();
            this.whileTextureLoading(li._id);
        }
    }


    //minimal and maximal zoom index on the screen
    if (seg.zoomIndex > this.planet.maxCurrZoom) {
        this.planet.maxCurrZoom = seg.zoomIndex;
    }

    if (seg.zoomIndex < this.planet.minCurrZoom) {
        this.planet.minCurrZoom = seg.zoomIndex;
    }

    this.addToRender(this);
};

og.quadTree.QuadNode.prototype.createGeoImage = function () {
    var seg = this.planetSegment;

    if (this.planet.geoImagesArray.length && !(seg.geoImageReady || seg._inTheGeoImageTileCreatorQueue)) {

        var pn = this;
        while (pn.parentNode && !pn.planetSegment.geoImageReady) {
            pn = pn.parentNode;
        }

        var scale = seg.zoomIndex - pn.planetSegment.zoomIndex;

        var dZ2 = Math.pow(2, scale);

        var offsetX = seg.tileX - pn.planetSegment.tileX * dZ2,
            offsetY = seg.tileY - pn.planetSegment.tileY * dZ2;

        seg.geoImageTexture = pn.planetSegment.geoImageTexture || this.planet.transparentTexture;

        seg.geoImageTextureBias[0] = offsetX;
        seg.geoImageTextureBias[1] = offsetY;
        seg.geoImageTextureBias[2] = 1 / dZ2;

        this.planet.geoImageTileCreator.queue(seg);
    }
};

og.quadTree.QuadNode.prototype.addToRender = function (node) {
    var nodes = this.planet.renderedNodes;
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
                var ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.zoomIndex - ap.zoomIndex));

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
    var a = this.planetSegment.extent,
        b = node.planetSegment.extent;
    var a_ne = a.northEast, a_sw = a.southWest,
        b_ne = b.northEast, b_sw = b.southWest;
    var a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat,
        b_ne_lon = b_ne.lon, b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

    var POLE = og.mercator.POLE,
        MAX_LAT = og.mercator.MAX_LAT;

    if (a_ne_lon == b_sw_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
        a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
        return og.quadTree.E;
    } else if (a_sw_lon == b_ne_lon && (a_ne_lat <= b_ne_lat && a_sw_lat >= b_sw_lat ||
        a_ne_lat >= b_ne_lat && a_sw_lat <= b_sw_lat)) {
        return og.quadTree.W;
    } else if (a_ne_lat == b_sw_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
        a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
        return og.quadTree.N;
    } else if (a_sw_lat == b_ne_lat && (a_sw_lon >= b_sw_lon && a_ne_lon <= b_ne_lon ||
        a_sw_lon <= b_sw_lon && a_ne_lon >= b_ne_lon)) {
        return og.quadTree.S;
    } else if (a_ne_lon == POLE && b_sw_lon == -POLE) {
        return og.quadTree.E;
    } else if (a_sw.lon == -POLE && b_ne.lon == POLE) {
        return og.quadTree.W;
    }
        //Poles and mercator nodes common side.
    else if (a_ne_lat == POLE && b_sw_lat == MAX_LAT) {
        return og.quadTree.N;
    } else if (a_sw_lat == -POLE && b_ne_lat == -MAX_LAT) {
        return og.quadTree.S;
    }

    return -1;
};

og.quadTree.QuadNode.prototype.whileNormalMapCreating = function () {

    var seg = this.planetSegment;

    var pn = this;

    while (pn.parentNode && !pn.planetSegment.normalMapReady) {
        pn = pn.parentNode;
    }

    var scale = seg.zoomIndex - pn.planetSegment.zoomIndex;

    var dZ2 = Math.pow(2, scale);

    var offsetX = seg.tileX - pn.planetSegment.tileX * dZ2,
        offsetY = seg.tileY - pn.planetSegment.tileY * dZ2;

    seg.normalMapTexture = pn.planetSegment.normalMapTexture;
    seg.normalMapTextureBias[0] = offsetX;
    seg.normalMapTextureBias[1] = offsetY;
    seg.normalMapTextureBias[2] = 1 / dZ2;

    var maxZ = this.planet.terrainProvider.maxZoom;

    if (seg.zoomIndex <= maxZ && !seg.terrainIsLoading && seg.terrainReady && !seg._inTheQueue) {
        seg.planet.normalMapCreator.shift(seg);
    } else if (seg.zoomIndex > maxZ) {
        if (pn.planetSegment.zoomIndex == maxZ) {
            seg.parentNormalMapReady = true;
        } else {
            pn = this;
            while (pn.parentNode && pn.planetSegment.zoomIndex != maxZ) {
                pn = pn.parentNode;
            }
            var pns = pn.planetSegment;
            if (!pns.ready) {
                this.createPlainSegment(pns);
                pns.loadTerrain();
            } else if (!pns._inTheQueue && !pns.terrainIsLoading) {
                pns.planet.normalMapCreator.shift(pns);
            }
        }
    }
};

og.quadTree.QuadNode.prototype.whileTerrainLoading = function () {

    var pn = this;

    while (pn.parentNode && !pn.planetSegment.terrainReady) {
        pn = pn.parentNode;
    }

    var scale = this.planetSegment.zoomIndex - pn.planetSegment.zoomIndex;

    var dZ2 = Math.pow(2, scale);

    var offsetX = this.planetSegment.tileX - pn.planetSegment.tileX * dZ2,
        offsetY = this.planetSegment.tileY - pn.planetSegment.tileY * dZ2;

    var maxZ = this.planet.terrainProvider.maxZoom;

    if (pn.planetSegment.terrainReady) {

        var seg = this.planetSegment,
            pseg = pn.planetSegment;

        if (pn.planetSegment.terrainExists) {
            if (this.appliedTerrainNodeId != pn.nodeId) {

                var gridSize = pn.planetSegment.gridSize / Math.pow(2, scale);

                var tempVertices = [];

                seg.deleteBuffers();
                seg.refreshIndexesBuffer = true;

                if (gridSize >= 1) {
                    seg.gridSize = gridSize;
                    this.sideSize = [gridSize, gridSize, gridSize, gridSize];

                    var i0 = gridSize * offsetY;
                    var j0 = gridSize * offsetX;

                    tempVertices = og.quadTree.getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, gridSize);

                } else {
                    seg.gridSize = og.quadTree.QuadNode._neGridSize;
                    this.sideSize = [seg.gridSize, seg.gridSize, seg.gridSize, seg.gridSize];

                    var i0 = Math.floor(gridSize * offsetY);
                    var j0 = Math.floor(gridSize * offsetX);

                    var bigOne = og.quadTree.getMatrixSubArray(pseg.terrainVertices, pseg.gridSize, i0, j0, 1);

                    //v_lt(x,y,z)             vn 
                    //    *---------------------------------->*       
                    //    |        |        |        |     .  ^       
                    //    |        |        |        |   .    |       
                    //    |        |        |        | .      |       
                    //    *--------*--------*--------*--------*       
                    //    |        |        |     .  |        |       
                    //    |        |        |   .    |        |
                    //    |        |        |ofX, ofY|        |
                    //  vw*--------*--------*--------*--------*ve
                    //    |        |      . |        |        |
                    //    |        |   .    |        |        |
                    //    |        |.       |        |        |
                    //    *--------*--------*--------*--------*
                    //    |      . |        |        |        |
                    //    |   .    |        |        |        |
                    //    V.       |        |        |        |
                    //    *<----------------------------------*v_rb
                    //                  vs

                    var insideSize = 1 / gridSize;
                    var fullSize = insideSize * pseg.gridSize;

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

                    for (var i = 0; i < vo.length; i++) {
                        var vi_y = vo[i].y + t_i0,
                            vi_x = vo[i].x + t_j0;

                        var vi_x_is = vi_x / insideSize,
                            vi_y_is = vi_y / insideSize;

                        if (vi_y + vi_x < insideSize) {
                            coords = og.math.Vector3.add(vn.scaleTo(vi_x_is), vw.scaleTo(vi_y_is)).add(v_lt);
                        } else {
                            coords = og.math.Vector3.add(vs.scaleTo(1 - vi_x_is), ve.scaleTo(1 - vi_y_is)).add(v_rb);
                        }

                        var i3 = i * 3;

                        tempVertices[i3] = coords.x;
                        tempVertices[i3 + 1] = coords.y;
                        tempVertices[i3 + 2] = coords.z;
                    }

                    bigOne.length = 0;
                }

                seg.createCoordsBuffers(tempVertices, seg.gridSize);

                //seg.tempVertices is useful for earth point calculation(see planetSegment object)
                seg.tempVertices = tempVertices;
                this.appliedTerrainNodeId = pn.nodeId;
            }
        }

        if (seg.zoomIndex > maxZ) {
            if (pn.planetSegment.zoomIndex >= maxZ) {
                seg.terrainReady = true;
                seg.terrainIsLoading = false;
                this.appliedTerrainNodeId = this.nodeId;
                if (pn.planetSegment.terrainExists) {
                    seg.terrainExists = true;
                    seg.terrainVertices = tempVertices;
                } else {
                    seg.terrainExists = false;
                    seg.deleteBuffers();

                    var step = 3 * seg.gridSize;
                    var step2 = step * 0.5;
                    var lb = step * (seg.gridSize + 1);
                    var ml = step2 * (seg.gridSize + 1);

                    var v = seg.terrainVertices;
                    seg.terrainVertices = [v[0], v[1], v[2], v[step2], v[step2 + 1], v[step2 + 2], v[step], v[step + 1], v[step + 2],
                            v[ml], v[ml + 1], v[ml + 2], v[ml + step2], v[ml + step2 + 1], v[ml + step2 + 2], v[ml + step], v[ml + step + 1], v[ml + step + 2],
                            v[lb], v[lb + 1], v[lb + 2], v[lb + step2], v[lb + step2 + 1], v[lb + step2 + 2], v[lb + step], v[lb + step + 1], v[lb + step + 2]];

                    seg.createCoordsBuffers(seg.terrainVertices, 2);
                    seg.gridSize = 2;
                }
            } else {
                pn = this;
                while (pn.parentNode && pn.planetSegment.zoomIndex != maxZ) {
                    pn = pn.parentNode;
                }
                var pns = pn.planetSegment;
                if (!pns.ready) {
                    this.createPlainSegment(pns);
                }
                pns.loadTerrain();
            }
        }
    }
};

/**
 * Static function returns triangles coordinates array due the source triangles array.
 * @param {Array} sourceArr Source array
 * @param {number} gridSize SourceArray square matrix size
 * @param {number} i0 First row index source array matrix
 * @param {number} j0 First column index
 * @param {number} size Square matrix result size.
 * @return{Array} The inside quad triangles array.
 */
og.quadTree.getMatrixSubArray = function (sourceArr, gridSize, i0, j0, size) {
    var res = [];
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


og.quadTree.QuadNode.prototype.whileTextureLoading = function (mId) {
    var pn = this,
        notEmpty = false;

    var psegm = pn.planetSegment.materials[mId];
    while (pn.parentNode) {
        if (psegm && psegm.imageReady) {
            notEmpty = true;
            break;
        }
        pn = pn.parentNode;
        psegm = pn.planetSegment.materials[mId];
    }

    var texScale = this.planetSegment.zoomIndex - pn.planetSegment.zoomIndex;

    var dZ2 = Math.pow(2, texScale);

    var texOffsetX = this.planetSegment.tileX - pn.planetSegment.tileX * dZ2,
        texOffsetY = this.planetSegment.tileY - pn.planetSegment.tileY * dZ2;

    var segm = this.planetSegment.materials[mId];
    if (/*segm.imageIsLoading && */(notEmpty || (psegm && !pn.parentNode))) {
        segm.texture = psegm.texture;
        segm.texBias[0] = texOffsetX;
        segm.texBias[1] = texOffsetY;
        segm.texBias[2] = 1 / Math.pow(2, texScale);
    }
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

og.quadTree.QuadNode.prototype.destroyBranches = function (cls) {

    if (this.planetSegment.zoomIndex <= this.planetSegment.planet.terrainProvider.minZoom)
        return;

    if (cls) {
        this.planetSegment.clearSegment();
        this.appliedTerrainNodeId = -1;
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].planetSegment.destroySegment();
        this.appliedTerrainNodeId = -1;
        this.nodes[i].destroyBranches(false);
    }
    this.nodes.length = 0;
};

og.quadTree.QuadNode.prototype.traverseTree = function (callback) {
    callback(this);
    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].traverseTree(callback);
    }
};