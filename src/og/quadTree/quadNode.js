goog.provide('og.quadTree.QuadNode');

goog.require('og.planetSegment.PlanetSegment');
goog.require('og.planetSegment.PlanetSegmentMaterial');
goog.require('og.Extent');
goog.require('og.LonLat');
goog.require('og.quadTree');

/* class QuadNode
 *
 *
 *
 */
og.quadTree.QuadNode = function () {
    this.parentNode;
    this.nodes = [];
    this.planetSegment;
    this.partId;
    this.nodeId;
    this.planet;
    this.state;
    this.appliedTerrainNodeId;
    this.appliedTextureNodeId;
    this.sideSize = [0, 0, 0, 0];
    this.hasNeighbor = [];
};

og.quadTree.QuadNode.createNode = function (planet, partId, parent, id, zoomIndex, extent) {
    var node = new og.quadTree.QuadNode();
    node.partId = partId;
    node.parentNode = parent;
    node.nodeId = partId + id;
    node.planet = planet;
    node.planetSegment = new og.planetSegment.PlanetSegment();
    node.planetSegment.node = node;
    node.planetSegment.planet = planet;
    node.planetSegment.handler = planet.renderer.handler;
    node.planetSegment.assignTileIndexes(zoomIndex, extent);
    node.createBounds(node.planetSegment);
    node.planet.createdNodesCount++;
    return node;
};

og.quadTree.QuadNode.prototype.getCommonSide = function (node) {
    var a = this.planetSegment.extent,
        b = node.planetSegment.extent;
    var a_ne = a.northEast, a_sw = a.southWest,
        b_ne = b.northEast, b_sw = b.southWest;
    var a_ne_lon = a_ne.lon, a_ne_lat = a_ne.lat, a_sw_lon = a_sw.lon, a_sw_lat = a_sw.lat,
        b_ne_lon = b_ne.lon, b_ne_lat = b_ne.lat, b_sw_lon = b_sw.lon, b_sw_lat = b_sw.lat;

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
    } else if (a_ne_lon == 20037508.34 && b_sw_lon == -20037508.34) {
        return og.quadTree.E;
    } else if (a_sw.lon == -20037508.34 && b_ne.lon == 20037508.34) {
        return og.quadTree.W;
    }

    return -1;
};

og.quadTree.QuadNode.prototype.createBounds = function (planetSeg) {
    var pn = this,
        scale = 0,
        offsetX = 0,
        offsetY = 0;

    while (pn.parentNode && !pn.planetSegment.terrainReady) {
        if (pn.partId === og.quadTree.NW) {
        } else if (pn.partId === og.quadTree.NE) {
            offsetX += Math.pow(2, scale);
        } else if (pn.partId === og.quadTree.SW) {
            offsetY += Math.pow(2, scale);
        } else if (pn.partId === og.quadTree.SE) {
            offsetX += Math.pow(2, scale);
            offsetY += Math.pow(2, scale);
        }
        scale++;
        pn = pn.parentNode;
    }

    var partGridSize = pn.planetSegment.gridSize / Math.pow(2, scale);
    if (pn.planetSegment.terrainReady && partGridSize > 1) {
        var pVerts = pn.planetSegment.terrainVertices;
        var i0 = partGridSize * offsetY;
        var j0 = partGridSize * offsetX;
        var ind1 = 3 * (i0 * (pn.planetSegment.gridSize + 1) + j0);
        var ind2 = 3 * ((i0 + partGridSize) * (pn.planetSegment.gridSize + 1) + j0 + partGridSize);

        planetSeg.bbox.setFromBounds([pVerts[ind1], pVerts[ind2], pVerts[ind1 + 1], pVerts[ind2 + 1], pVerts[ind1 + 2], pVerts[ind2 + 2]]);
        planetSeg.bsphere.setFromBounds([pVerts[ind1], pVerts[ind2], pVerts[ind1 + 1], pVerts[ind2 + 1], pVerts[ind1 + 2], pVerts[ind2 + 2]]);
    } else {
        planetSeg.bbox.setFromExtent(planetSeg.planet.ellipsoid, planetSeg.extent);
        planetSeg.bsphere.setFromExtent(planetSeg.planet.ellipsoid, planetSeg.extent);
    }
};

og.quadTree.QuadNode.prototype.createChildrenNodes = function () {
    var p = this.planet;
    var ps = this.planetSegment;
    var ext = ps.extent;
    var size = ext.getWidth() * 0.5;
    var ne = ext.northEast, sw = ext.southWest;
    var z = ps.zoomIndex + 1;
    var id = this.nodeId * 4 + 1;
    var c = new og.LonLat(sw.lon + size, sw.lat + size);
    var nd = this.nodes;

    nd[og.quadTree.NW] = og.quadTree.QuadNode.createNode(p, og.quadTree.NW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat + size), new og.LonLat(sw.lon + size, ne.lat)));

    nd[og.quadTree.NE] = og.quadTree.QuadNode.createNode(p, og.quadTree.NE, this, id, z,
        new og.Extent(c, new og.LonLat(ne.lon, ne.lat)));

    nd[og.quadTree.SW] = og.quadTree.QuadNode.createNode(p, og.quadTree.SW, this, id, z,
        new og.Extent(new og.LonLat(sw.lon, sw.lat), c));

    nd[og.quadTree.SE] = og.quadTree.QuadNode.createNode(p, og.quadTree.SE, this, id, z,
         new og.Extent(new og.LonLat(sw.lon + size, sw.lat), new og.LonLat(ne.lon, sw.lat + size)));
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

og.quadTree.QuadNode.prototype.prepareForRendering = function (cam) {
    if (cam.altitude < 3000.0) {
        var distance = cam.eye.distance(this.planetSegment.bsphere.center) - this.planetSegment.bsphere.radius;
        var horizon = 113.0 * Math.sqrt(this.planet.renderer.activeCamera.altitude);
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

    var cam = this.planet.renderer.activeCamera;

    if (cam.frustum.containsSphere(this.planetSegment.bsphere) > 0) {
        if (og.quadTree.acceptableForRender(cam, this.planetSegment.bsphere)) {
            this.prepareForRendering(cam);
        }
        else {
            if (this.planetSegment.zoomIndex < this.planet.terrainProvider.gridSizeByZoom.length - 1) {
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

og.quadTree.QuadNode.prototype.renderNode = function () {

    this.state = og.quadTree.RENDERING;
    var seg = this.planetSegment;

    if (!seg.ready) {
        var gridSize = this.planet.terrainProvider.gridSizeByZoom[seg.zoomIndex];
        seg.gridSize = gridSize;
        this.sideSize = [gridSize, gridSize, gridSize, gridSize];
        seg.createPlainVertices(gridSize);
        seg.terrainVertices = seg.plainVertices;
        seg.createCoordsBuffers(seg.plainVertices, gridSize);
        seg.ready = true;
    }

    if (!seg.terrainReady) {
        seg.loadTerrain();
        this.whileTerrainLoading();
    }

    var vl = this.planet.visibleLayers,
        pm = seg.materials;

    for (var i = 0; i < vl.length; i++) {
        var li = vl[i],
            pml_id = pm[li.id];

        if (!pml_id) {
            pml_id = seg.materials[li.id] = new og.planetSegment.PlanetSegmentMaterial(seg, li);
        }

        if (!pml_id.imageReady) {
            pml_id.loadTileImage();
            this.whileTextureLoading(li.id);
        }
    }

    this.addToRender();
};

og.quadTree.QuadNode.prototype.addToRender = function () {
    var nodes = this.planet.renderedNodes;
    for (var i = 0; i < nodes.length; i++) {
        var ni = nodes[i];
        var cs = this.getCommonSide(ni);
        if (cs != -1) {
            var opcs = og.quadTree.OPSIDE[cs];
            if (!(this.hasNeighbor[cs] && ni.hasNeighbor[opcs])) {
                var ap = this.planetSegment;
                var bp = ni.planetSegment;
                var ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.zoomIndex - ap.zoomIndex));

                this.hasNeighbor[cs] = true;
                ni.hasNeighbor[opcs] = true;

                if (ld > 1) {
                    this.sideSize[cs] = ap.gridSize / ld;
                    ni.sideSize[opcs] = bp.gridSize;
                }
                else if (ld < 1) {
                    this.sideSize[cs] = ap.gridSize;
                    ni.sideSize[opcs] = bp.gridSize * ld;
                } else {
                    this.sideSize[cs] = ap.gridSize;
                    ni.sideSize[opcs] = bp.gridSize;
                }
            }
        }
    }
    nodes.push(this);
};

og.quadTree.QuadNode.prototype.whileTerrainLoading = function () {

    var pn = this,
        scale = 0,
        offsetX = 0,
        offsetY = 0;

    while (pn.parentNode && !pn.planetSegment.terrainReady) {
        if (pn.partId == og.quadTree.NE) {
            offsetX += Math.pow(2, scale);
        } else if (pn.partId == og.quadTree.SW) {
            offsetY += Math.pow(2, scale);
        } else if (pn.partId == og.quadTree.SE) {
            offsetX += Math.pow(2, scale);
            offsetY += Math.pow(2, scale);
        }
        scale++;
        pn = pn.parentNode;
    }

    if (pn.planetSegment.terrainReady) {
        if (this.appliedTerrainNodeId != pn.nodeId) {

            var gridSize = pn.planetSegment.gridSize / Math.pow(2, scale);

            if (gridSize > 1) {
                var seg = this.planetSegment,
                    pseg = pn.planetSegment;

                seg.gridSize = gridSize;
                this.sideSize = [gridSize, gridSize, gridSize, gridSize];
                var i0 = gridSize * offsetY;
                var j0 = gridSize * offsetX;

                var tempVertices = [];
                var psegVerts = pseg.terrainVertices;
                for (var i = i0; i <= i0 + gridSize; i++) {
                    for (var j = j0; j <= j0 + gridSize; j++) {
                        var ind = 3 * (i * (pseg.gridSize + 1) + j);
                        tempVertices.push(psegVerts[ind], psegVerts[ind + 1], psegVerts[ind + 2]);
                    }
                }
                seg.deleteBuffers();
                seg.createCoordsBuffers(tempVertices, gridSize);
                seg.refreshIndexesBuffer = true;

                if (seg.zoomIndex > this.planet.terrainProvider.maxZoom) {
                    pn = this;
                    while (pseg.zoomIndex >= this.planet.terrainProvider.maxZoom && !seg.terrainReady) {
                        pn = pn.parentNode;
                        seg.terrainReady = pseg.terrainReady;
                        seg.terrainIsLoading = pseg.terrainIsLoading;
                    }
                    seg.terrainVertices.length = 0;
                    seg.terrainVertices = tempVertices;
                } else {
                    this.appliedTerrainNodeId = pn.nodeId;
                    tempVertices.length = 0;
                }
            }
        }
    }
};

og.quadTree.QuadNode.prototype.whileTextureLoading = function (mId) {
    var pn = this,
        texScale = 0,
        texOffsetX = 0,
        texOffsetY = 0,
        notEmpty = false;

    var psegm = pn.planetSegment.materials[mId];
    while (pn.parentNode) {
        if (psegm) {
            if (psegm.imageReady) {
                notEmpty = true;
                break;
            }
        }

        if (pn.partId == og.quadTree.NE) {
            texOffsetX += Math.pow(2, texScale);
        } else if (pn.partId == og.quadTree.SW) {
            texOffsetY += Math.pow(2, texScale);
        } else if (pn.partId == og.quadTree.SE) {
            texOffsetX += Math.pow(2, texScale);
            texOffsetY += Math.pow(2, texScale);
        }
        texScale++;
        pn = pn.parentNode;
        psegm = pn.planetSegment.materials[mId];
    }

    var segm = this.planetSegment.materials[mId];
    if (segm.imageIsLoading) {
        if (notEmpty) {
            segm.texture = psegm.texture;
            segm.texBias[0] = texOffsetX;
            segm.texBias[1] = texOffsetY;
            segm.texBias[2] = 1 / Math.pow(2, texScale);
        }
    }
};

og.quadTree.QuadNode.prototype.clearTree = function () {

    var state = this.getState();

    if (state === og.quadTree.NOTRENDERING) {
        this.destroyBranches(true);
    } else if (state === og.quadTree.RENDERING) {
        this.destroyBranches(false);
    }
    else {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clearTree();
        }
    }
};

og.quadTree.QuadNode.prototype.destroyBranches = function (cls) {

    if (cls) {
        this.planetSegment.clearSegment();
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].planetSegment.destroySegment();
        this.nodes[i].destroyBranches(false);
    }
    this.nodes.length = 0;
};