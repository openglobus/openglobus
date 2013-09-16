og.node.planet.quadTree = { };

/* class QuadNode
 *
 *
 *
 */

og.node.planet.quadTree.QuadNode = function () {
    this.parentNode;
    this.nodes = [];
    this.planetSegment;
    this.partId;
    this.nodeId;
    this.planet;
    this.state;
    this.appliedTerrainNodeId;
    this.appliedTextureNodeId;
};

og.node.planet.quadTree.QuadNode.NW = 0;
og.node.planet.quadTree.QuadNode.NE = 1;
og.node.planet.quadTree.QuadNode.SW = 2;
og.node.planet.quadTree.QuadNode.SE = 3;

og.node.planet.quadTree.QuadNode.N = 0;
og.node.planet.quadTree.QuadNode.E = 1;
og.node.planet.quadTree.QuadNode.S = 2;
og.node.planet.quadTree.QuadNode.W = 3;

og.node.planet.quadTree.QuadNode.WALKTHROUGH = 0;
og.node.planet.quadTree.QuadNode.RENDERING = 1;
og.node.planet.quadTree.QuadNode.NOTRENDERING = 2;

og.node.planet.quadTree.QuadNode.ADJ = [[true, true, false, false],
                [false, true, false, true],
                [false, false, true, true],
                [true, false, true, false]];

og.node.planet.quadTree.QuadNode.REFLECT = [[og.node.planet.quadTree.QuadNode.SW, og.node.planet.quadTree.QuadNode.SE, og.node.planet.quadTree.QuadNode.NW, og.node.planet.quadTree.QuadNode.NE],
                    [og.node.planet.quadTree.QuadNode.NE, og.node.planet.quadTree.QuadNode.NW, og.node.planet.quadTree.QuadNode.SE, og.node.planet.quadTree.QuadNode.SW],
                    [og.node.planet.quadTree.QuadNode.SW, og.node.planet.quadTree.QuadNode.SE, og.node.planet.quadTree.QuadNode.NW, og.node.planet.quadTree.QuadNode.NE],
                    [og.node.planet.quadTree.QuadNode.NE, og.node.planet.quadTree.QuadNode.NW, og.node.planet.quadTree.QuadNode.SE, og.node.planet.quadTree.QuadNode.SW]];

og.node.planet.quadTree.QuadNode.COMMONSIDE = [[-1, og.node.planet.quadTree.QuadNode.N, og.node.planet.quadTree.QuadNode.W, -1],
                       [og.node.planet.quadTree.QuadNode.N, -1, -1, og.node.planet.quadTree.QuadNode.E],
                       [og.node.planet.quadTree.QuadNode.W, -1, -1, og.node.planet.quadTree.QuadNode.S],
                       [-1, og.node.planet.quadTree.QuadNode.E, og.node.planet.quadTree.QuadNode.S, -1]];

og.node.planet.quadTree.QuadNode.OPQUAD = [og.node.planet.quadTree.QuadNode.SE, og.node.planet.quadTree.QuadNode.SW, og.node.planet.quadTree.QuadNode.NE, og.node.planet.quadTree.QuadNode.NW];


og.node.planet.quadTree.QuadNode.createNode = function (planet, partId, parent, id, zoomIndex, extent) {
    var node = new og.node.planet.quadTree.QuadNode();
    node.partId = partId;
    node.parentNode = parent;
    node.nodeId = id;
    node.planet = planet;
    node.planetSegment = new og.node.planet.PlanetSegment();
    node.planetSegment.node = node;
    node.planetSegment.planet = planet;
    node.planetSegment._ctx = planet.renderer.ctx;
    node.planetSegment.assignTileIndexes(zoomIndex, extent);
    node.planetSegment.createBounds();
    node.planet.createdNodesCount++;
    return node;
};

og.node.planet.quadTree.QuadNode.prototype.createChildrenNodes = function () {

    var lnSize = this.planetSegment.extent[og.extent.RIGHT] - this.planetSegment.extent[og.extent.LEFT];
    var ltSize = this.planetSegment.extent[og.extent.TOP] - this.planetSegment.extent[og.extent.BOTTOM];

    this.nodes[og.node.planet.quadTree.QuadNode.NW] = og.node.planet.quadTree.QuadNode.createNode(this.planet, og.node.planet.quadTree.QuadNode.NW, this,
        this.nodeId * 4 + og.node.planet.quadTree.QuadNode.NW + 1, this.planetSegment.zoomIndex + 1, 
        [this.planetSegment.extent[og.extent.LEFT], this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2,
            this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.TOP]]);

    this.nodes[og.node.planet.quadTree.QuadNode.NE] = og.node.planet.quadTree.QuadNode.createNode(this.planet, og.node.planet.quadTree.QuadNode.NE, this,
        this.nodeId * 4 + og.node.planet.quadTree.QuadNode.NE + 1, this.planetSegment.zoomIndex + 1, 
        [this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2,
            this.planetSegment.extent[og.extent.RIGHT], this.planetSegment.extent[og.extent.TOP]]);

    this.nodes[og.node.planet.quadTree.QuadNode.SW] = og.node.planet.quadTree.QuadNode.createNode(this.planet, og.node.planet.quadTree.QuadNode.SW, this,
        this.nodeId * 4 + og.node.planet.quadTree.QuadNode.SW + 1, this.planetSegment.zoomIndex + 1, 
        [this.planetSegment.extent[og.extent.LEFT], this.planetSegment.extent[og.extent.BOTTOM],
            this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2]);

    this.nodes[og.node.planet.quadTree.QuadNode.SE] = og.node.planet.quadTree.QuadNode.createNode(this.planet, og.node.planet.quadTree.QuadNode.SE, this,
        this.nodeId * 4 + og.node.planet.quadTree.QuadNode.SE + 1, this.planetSegment.zoomIndex + 1, 
        [this.planetSegment.extent[og.extent.LEFT] + lnSize / 2, this.planetSegment.extent[og.extent.BOTTOM],
            this.planetSegment.extent[og.extent.RIGHT], this.planetSegment.extent[og.extent.BOTTOM] + ltSize / 2]);
};

og.node.planet.quadTree.QuadNode.prototype.reloadTextures = function () {

    this.planetSegment.deleteTexture();

    if (this.getState() === og.node.planet.quadTree.QuadNode.WALKTHROUGH) {
        this.planetSegment.loadTileImage();
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].reloadTextures();
    }
};

og.node.planet.quadTree.QuadNode.prototype.reloadTerrain = function () {

    this.planetSegment.clearBuffers();
    this.planetSegment.deleteElevations();

    if (this.getState() === og.node.planet.quadTree.QuadNode.WALKTHROUGH) {
        this.planetSegment.loadTerrain();
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].reloadTerrain();
    }
};

og.node.planet.quadTree.QuadNode.prototype.getState = function () {
    var pn = this.parentNode;
    while (pn) {
        if (pn.state != og.node.planet.quadTree.QuadNode.WALKTHROUGH) {
            return og.node.planet.quadTree.QuadNode.NOTRENDERING;
        }
        pn = pn.parentNode;
    }
    return this.state;
};

og.node.planet.quadTree.QuadNode.acceptableForRender = function (camera, sphere, lodEps) {
    return camera.projectedSize(sphere.center) > lodEps * sphere.radius;
};

og.node.planet.quadTree.QuadNode.prototype.prepareForRendering = function (cam) {
    if (cam.altitude < 3000.0) {
        var distance = cam.eye.distance(this.planetSegment.bsphere.center) - this.planetSegment.bsphere.radius;
        var horizon = 113.0 * Math.sqrt(this.planet.renderer.activeCamera.altitude);
        if (distance < horizon) {
            this.renderNode();
        } else {
            this.state = og.node.planet.quadTree.QuadNode.NOTRENDERING;
        }
    } else {
        this.renderNode();
    }
};

og.node.planet.quadTree.QuadNode.prototype.traverseNodes = function () {
    if (!this.nodes.length) {
        this.createChildrenNodes();
    }
    this.nodes[og.node.planet.quadTree.QuadNode.NW].renderTree();
    this.nodes[og.node.planet.quadTree.QuadNode.NE].renderTree();
    this.nodes[og.node.planet.quadTree.QuadNode.SW].renderTree();
    this.nodes[og.node.planet.quadTree.QuadNode.SE].renderTree();
};

og.node.planet.quadTree.QuadNode.prototype.renderTree = function () {
    this.state = og.node.planet.quadTree.QuadNode.WALKTHROUGH;

    var cam = this.planet.renderer.activeCamera;
    
    if (cam.frustum.containsSphere(this.planetSegment.bsphere) > 0) {
        if (og.node.planet.quadTree.QuadNode.acceptableForRender(cam, this.planetSegment.bsphere, 1.0)) {
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
        this.state = og.node.planet.quadTree.QuadNode.NOTRENDERING;
    }
};

og.node.planet.quadTree.QuadNode.prototype.renderNode = function () {

    this.state = og.node.planet.quadTree.QuadNode.RENDERING;

    if (!this.planetSegment.ready) {
        var gridSize = this.planet.terrainProvider.gridSizeByZoom[this.planetSegment.zoomIndex];
        this.planetSegment.gridSize = gridSize;
        this.planetSegment.createPlainVertices(gridSize);
        this.planetSegment.terrainVertices = this.planetSegment.plainVertices;
        this.planetSegment.createCoordsBuffers(this.planetSegment.plainVertices, gridSize);
        this.planetSegment.createIndexesBuffer(gridSize, gridSize, gridSize, gridSize, gridSize);
        this.planetSegment.ready = true;
    }

    if (!this.planetSegment.terrainReady) {
        this.planetSegment.loadTerrain();
    }

    if (!this.planetSegment.imageReady) {
        this.planetSegment.loadTileImage();
    }

    if (!this.planetSegment.imageReady) {
        this.whileTextureLoading();
    }

    if (!this.planetSegment.terrainReady) {
        this.whileTerrainLoading();
    }

    this.planet.renderedNodes.push(this);
};

og.node.planet.quadTree.QuadNode.prototype.whileTerrainLoading = function () {

    var pn = this,
        scale = 0,
        offsetX = 0,
        offsetY = 0;

    while (pn.parentNode && !pn.planetSegment.terrainReady) {
        if (pn.partId === og.node.planet.quadTree.QuadNode.NW) {
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.NE) {
            offsetX += Math.pow(2, scale);
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.SW) {
            offsetY += Math.pow(2, scale);
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.SE) {
            offsetX += Math.pow(2, scale);
            offsetY += Math.pow(2, scale);
        }
        scale++;
        pn = pn.parentNode;
    }

    if (pn.planetSegment.terrainReady) {
        if (this.appliedTerrainNodeId != pn.nodeId) {

            var gridSize = pn.planetSegment.gridSize / Math.pow(2, scale);

            if (gridSize >= 1) {
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


og.node.planet.quadTree.QuadNode.prototype.whileTextureLoading = function () {
    var pn = this,
        texScale = 0,
        texOffsetX = 0,
        texOffsetY = 0;

    while (pn.parentNode && !pn.planetSegment.imageReady) {
        if (pn.partId === og.node.planet.quadTree.QuadNode.NW) {
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.NE) {
            texOffsetX += Math.pow(2, texScale);
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.SW) {
            texOffsetY += Math.pow(2, texScale);
        } else if (pn.partId === og.node.planet.quadTree.QuadNode.SE) {
            texOffsetX += Math.pow(2, texScale);
            texOffsetY += Math.pow(2, texScale);
        }
        texScale++;
        pn = pn.parentNode;
    }

    if (this.planetSegment.imageIsLoading) {
        if (pn.nodeId != this.appliedTextureNodeId) {
            this.planetSegment.texture = pn.planetSegment.texture;
            this.planetSegment.texBias = [texOffsetX, texOffsetY, 1 / Math.pow(2, texScale)];
        }
    }
};

og.node.planet.quadTree.QuadNode.prototype.clearTree = function () {

    var state = this.getState();

    if (state === og.node.planet.quadTree.QuadNode.NOTRENDERING) {
        this.destroyBranches(true);
    } else if (state === og.node.planet.quadTree.QuadNode.RENDERING) {
        this.destroyBranches(false);
    }
    else {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clearTree();
        }
    }
};

og.node.planet.quadTree.QuadNode.prototype.destroyBranches = function (cls) {

    if (cls) {
        this.planetSegment.clearSegment();
    }

    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].planetSegment.destroySegment();
        this.nodes[i].destroyBranches(false);
    }
    this.nodes.length = 0;
};
