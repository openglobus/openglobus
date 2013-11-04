goog.provide('og.quadTree.QuadNode');

goog.require('og.planetSegment.PlanetSegment');
goog.require('og.planetSegment.PlanetSegmentMaterial');
goog.require('og.extent');
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
};

og.quadTree.QuadNode.createNode = function (planet, partId, parent, id, zoomIndex, extent) {
    var node = new og.quadTree.QuadNode();
    node.partId = partId;
    node.parentNode = parent;
    node.nodeId = id;
    node.planet = planet;
    node.planetSegment = new og.planetSegment.PlanetSegment();
    node.planetSegment.node = node;
    node.planetSegment.planet = planet;
    node.planetSegment._ctx = planet.renderer.ctx;
    node.planetSegment.assignTileIndexes(zoomIndex, extent);
    node.createBounds(node.planetSegment);
    node.planet.createdNodesCount++;
    return node;
};

og.quadTree.QuadNode.prototype.getCommonSide = function (node) {
    var a = this.planetSegment,
        b = node.planetSegment;

    if (a.extent[og.extent.RIGHT] == b.extent[og.extent.LEFT]) {
        if (a.extent[og.extent.TOP] <= b.extent[og.extent.TOP] && a.extent[og.extent.BOTTOM] >= b.extent[og.extent.BOTTOM] ||
            a.extent[og.extent.TOP] >= b.extent[og.extent.TOP] && a.extent[og.extent.BOTTOM] <= b.extent[og.extent.BOTTOM]) {
            return og.quadTree.E;
        }
    } else if (a.extent[og.extent.LEFT] == b.extent[og.extent.RIGHT]) {
        if (a.extent[og.extent.TOP] <= b.extent[og.extent.TOP] && a.extent[og.extent.BOTTOM] >= b.extent[og.extent.BOTTOM] ||
            a.extent[og.extent.TOP] >= b.extent[og.extent.TOP] && a.extent[og.extent.BOTTOM] <= b.extent[og.extent.BOTTOM]) {
            return og.quadTree.W;
        }
    } else if (a.extent[og.extent.TOP] == b.extent[og.extent.BOTTOM]) {
        if (a.extent[og.extent.LEFT] >= b.extent[og.extent.LEFT] && a.extent[og.extent.RIGHT] <= b.extent[og.extent.RIGHT] ||
            a.extent[og.extent.LEFT] <= b.extent[og.extent.LEFT] && a.extent[og.extent.RIGHT] >= b.extent[og.extent.RIGHT]) {
            return og.quadTree.N;
        }
    } else if (a.extent[og.extent.BOTTOM] == b.extent[og.extent.TOP]) {
        if (a.extent[og.extent.LEFT] >= b.extent[og.extent.LEFT] && a.extent[og.extent.RIGHT] <= b.extent[og.extent.RIGHT] ||
            a.extent[og.extent.LEFT] <= b.extent[og.extent.LEFT] && a.extent[og.extent.RIGHT] >= b.extent[og.extent.RIGHT]) {
            return og.quadTree.S;
        }
    } else if (a.extent[og.extent.RIGHT] == 20037508.34 && b.extent[og.extent.LEFT] == -20037508.34) {
        return og.quadTree.E;
    } else if (a.extent[og.extent.LEFT] == -20037508.34 && b.extent[og.extent.RIGHT] == 20037508.34) {
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

    var lnSize = this.planetSegment.extent[og.extent.RIGHT] - this.planetSegment.extent[og.extent.LEFT];
    var ltSize = this.planetSegment.extent[og.extent.TOP] - this.planetSegment.extent[og.extent.BOTTOM];

    this.nodes[og.quadTree.NW] = og.quadTree.QuadNode.createNode(this.planet, og.quadTree.NW, this,
        this.nodeId * 4 + og.quadTree.NW + 1, this.planetSegment.zoomIndex + 1,
        [this.planetSegment.extent[og.extent.LEFT], this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2,
            this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.TOP]]);

    this.nodes[og.quadTree.NE] = og.quadTree.QuadNode.createNode(this.planet, og.quadTree.NE, this,
        this.nodeId * 4 + og.quadTree.NE + 1, this.planetSegment.zoomIndex + 1,
        [this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2,
            this.planetSegment.extent[og.extent.RIGHT], this.planetSegment.extent[og.extent.TOP]]);

    this.nodes[og.quadTree.SW] = og.quadTree.QuadNode.createNode(this.planet, og.quadTree.SW, this,
        this.nodeId * 4 + og.quadTree.SW + 1, this.planetSegment.zoomIndex + 1,
        [this.planetSegment.extent[og.extent.LEFT], this.planetSegment.extent[og.extent.BOTTOM],
            this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2]);

    this.nodes[og.quadTree.SE] = og.quadTree.QuadNode.createNode(this.planet, og.quadTree.SE, this,
        this.nodeId * 4 + og.quadTree.SE + 1, this.planetSegment.zoomIndex + 1,
        [this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM],
            this.planetSegment.extent[og.extent.RIGHT], this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2]);
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

    if (!this.planetSegment.ready) {
        var gridSize = this.planet.terrainProvider.gridSizeByZoom[this.planetSegment.zoomIndex];
        this.planetSegment.gridSize = gridSize;
        this.planetSegment.createPlainVertices(gridSize);
        this.planetSegment.terrainVertices = this.planetSegment.plainVertices;
        this.planetSegment.createCoordsBuffers(this.planetSegment.plainVertices, gridSize);
        this.planetSegment.ready = true;
    }

    if (!this.planetSegment.terrainReady) {
        this.planetSegment.loadTerrain();
        this.whileTerrainLoading();
    }

    var vl = this.planet.visibleLayers,
        pm = this.planetSegment.materials;

    for (var i = 0; i < vl.length; i++) {
        var li = vl[i],
            pml_id = pm[li.id];

        if (!pml_id) {
            pml_id = this.planetSegment.materials[li.id] = new og.planetSegment.PlanetSegmentMaterial(this.planetSegment, li);
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
            if (!(this.sideSize[cs] && ni.sideSize[opcs])) {
                var ap = this.planetSegment;
                var bp = ni.planetSegment;
                var ld = ap.gridSize / (bp.gridSize * Math.pow(2, bp.zoomIndex - ap.zoomIndex));
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

    if (pn.planetSegment.terrainReady) {
        if (this.appliedTerrainNodeId != pn.nodeId) {

            var gridSize = pn.planetSegment.gridSize / Math.pow(2, scale);

            if (gridSize > 1) {
                this.planetSegment.gridSize = gridSize;
                var i0 = gridSize * offsetY;
                var j0 = gridSize * offsetX;

                var tempVertices = [];
                for (var i = i0; i <= i0 + gridSize; i++) {
                    for (var j = j0; j <= j0 + gridSize; j++) {
                        var ind = 3 * (i * (pn.planetSegment.gridSize + 1) + j);
                        var x = pn.planetSegment.terrainVertices[ind],
                            y = pn.planetSegment.terrainVertices[ind + 1],
                            z = pn.planetSegment.terrainVertices[ind + 2];

                        tempVertices.push(x, y, z);
                    }
                }

                this.planetSegment.deleteBuffers();
                this.planetSegment.createCoordsBuffers(tempVertices, gridSize);
                this.planetSegment.refreshIndexesBuffer = true;

                if (this.planetSegment.zoomIndex > this.planet.terrainProvider.maxZoom) {
                    pn = this;
                    while (pn.planetSegment.zoomIndex >= this.planet.terrainProvider.maxZoom && !this.planetSegment.terrainReady) {
                        pn = pn.parentNode;
                        this.planetSegment.terrainReady = pn.planetSegment.terrainReady;
                        this.planetSegment.terrainIsLoading = pn.planetSegment.terrainIsLoading;
                    }
                    this.planetSegment.terrainVertices.length = 0;
                    this.planetSegment.terrainVertices = tempVertices;
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

    while (1) {
        if (!pn.parentNode)
            break;
        else if (pn.planetSegment.materials[mId]) {
            if (pn.planetSegment.materials[mId].imageReady) {
                notEmpty = true;
                break;
            }
        }

        if (pn.partId === og.quadTree.NW) {
        } else if (pn.partId === og.quadTree.NE) {
            texOffsetX += Math.pow(2, texScale);
        } else if (pn.partId === og.quadTree.SW) {
            texOffsetY += Math.pow(2, texScale);
        } else if (pn.partId === og.quadTree.SE) {
            texOffsetX += Math.pow(2, texScale);
            texOffsetY += Math.pow(2, texScale);
        }
        texScale++;
        pn = pn.parentNode;
    }

    if (this.planetSegment.materials[mId].imageIsLoading) {
        if (notEmpty) {
            if (pn.nodeId != this.appliedTextureNodeId) {
                this.planetSegment.materials[mId].texture = pn.planetSegment.materials[mId].texture;
                this.planetSegment.materials[mId].texBias = [texOffsetX, texOffsetY, 1 / Math.pow(2, texScale)];
            }
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