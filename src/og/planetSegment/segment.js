goog.provide('og.planetSegment');
goog.provide('og.planetSegment.Segment');

goog.require('og.PlanetSegmentHelper');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.layer');
goog.require('og.Extent');
goog.require('og.bv.Box');
goog.require('og.bv.Sphere');
goog.require('og.mercator');
goog.require('og.LonLat');
goog.require('og.proj.EPSG3857');

/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 */
og.planetSegment.Segment = function (node, planet, tileZoom, extent) {

    /**
     * Quad tree node of the segment.
     * @type {og.quadTree.QuadNode}
     */
    this.node = node;

    /**
     * Planet pointer.
     * @type {pg.node.RenderNode}
     */
    this.planet = planet;

    /**
     * WebGl handler pointer.
     * @type {og.webgl.Handler}
     */
    this.handler = planet.renderer.handler;

    /**
     * Segment bounding box.
     * @type {og.bv.Box}
     */
    this.bbox = new og.bv.Box();

    /**
     * Segment bounding box.
     * @type {og.bv.Sphere}
     */
    this.bsphere = new og.bv.Sphere();

    /**
     * Geographical extent.
     * @type {og.Extent}
     */
    this._extent = extent;

    /**
     * Vertices grid size.
     * @type {number}
     */
    this.gridSize = planet.terrainProvider.gridSizeByZoom[tileZoom];

    /**
     * Tile zoom index.
     * @type {number}
     */
    this.tileZoom = tileZoom;

    /**
     * Horizontal tile index.
     * @type {number}
     */
    this.tileX = null;

    /**
     * Vertical tile index.
     * @type {number}
     */
    this.tileY = null;

    this._assignTileIndexes();

    /**
     * Texture materials array.
     * @type {Array.<og.planetSegment.Material>}
     */
    this.materials = [];

    /**
     * Segment is ready for rendering.
     * @type {boolean}
     */
    this.ready = false;

    /**
     * Normal map is allready made.
     * @type {boolean}
     */
    this.normalMapReady = false;

    /**
     * Parent normal map is made allready.
     * @type {boolean}
     */
    this.parentNormalMapReady = false;

    /**
     * Terrain is allready applied flag.
     * @type {boolean}
     */
    this.terrainReady = false;

    /**
     * Terrain is loading now flag.
     * @type {boolean}
     */
    this.terrainIsLoading = false;

    /**
     * Terrain existing flag.
     * @type {boolean}
     */
    this.terrainExists = false;

    this.plainIndexes = [];
    this.plainVertices = [];
    this.plainNormals = null;
    this.terrainVertices = [];
    this.tempVertices = [];

    this.normalMapTexture = null;
    this.normalMapTextureBias = new Float32Array(3);
    this.normalMapVertices = [];
    this.normalMapNormals = null;

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexTextureCoordBuffer = null;

    this._globalTextureCoordinates = new Float32Array(4);
    this._projection = og.proj.EPSG3857;
    this._inTheQueue = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];

    this._renderingSlices = [];
};

/**
 * Returns that segment good for rendering with camera by current RATIO_LOD.
 * @public
 * @returns {boolean}
 */
og.planetSegment.Segment.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;
    return camera.projectedSize(sphere.center) > this.planet.RATIO_LOD * sphere.radius;
};

/**
 * Returns entity terrain point.
 * @public
 * @param {og.Entity} entity - Entity.
 * @returns {og.math.Vector3}
 */
og.planetSegment.Segment.prototype.getEntityTerrainPoint = function (entity, res) {
    return this.getTerrainPoint(res, entity._cartesian, entity._lonlatMerc);
};

og.planetSegment.Segment.prototype.isEntityInside = function (e) {
    return this._extent.isInside(e._lonlatMerc);
};

/**
 * Returns distance from object to terrain coordinates and terrain point that calculates out in the res parameter.
 * @public
 * @param {og.math.Vector3} res - Result cartesian coordiantes on the terrain.
 * @param {og.math.Vector3} xyz - Cartesian object position.
 * @param {og.LonLat} insideSegmentPosition - Geodetic object position.
 * @returns {number}
 */
og.planetSegment.Segment.prototype.getTerrainPoint = function (res, xyz, insideSegmentPosition) {
    var ne = this._extent.northEast,
        sw = this._extent.southWest,
        size = this.gridSize;

    var xmax = ne.lon,
        ymax = ne.lat,
        xmin = sw.lon,
        ymin = sw.lat,
        x = insideSegmentPosition.lon,
        y = insideSegmentPosition.lat;

    var sxn = xmax - xmin,
        syn = ymax - ymin;

    var qx = sxn / size,
        qy = syn / size;

    var xn = x - xmin,
        yn = y - ymin;

    var indX = Math.floor(xn / qx),
        indY = Math.floor(size - yn / qy);

    var verts = this.terrainReady ? this.terrainVertices : this.tempVertices,
        ray = new og.math.Ray(xyz, xyz.negateTo());

    if (verts.length) {
        var ind_v0 = ((size + 1) * indY + indX) * 3;
        var ind_v2 = ((size + 1) * (indY + 1) + indX) * 3;

        var v0 = new og.math.Vector3(verts[ind_v0], verts[ind_v0 + 1], verts[ind_v0 + 2]),
            v1 = new og.math.Vector3(verts[ind_v0 + 3], verts[ind_v0 + 4], verts[ind_v0 + 5]),
            v2 = new og.math.Vector3(verts[ind_v2], verts[ind_v2 + 1], verts[ind_v2 + 2]);

        var d = ray.hitTriangle(v0, v1, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return xyz.distance(res);
        }

        var v3 = new og.math.Vector3(verts[ind_v2 + 3], verts[ind_v2 + 4], verts[ind_v2 + 5]);

        d = ray.hitTriangle(v1, v3, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return xyz.distance(res);
        }

        if (d == og.math.Ray.AWAY) {
            return -xyz.distance(res);
        }

        return xyz.distance(res);
    }

    res.copy(this.planet.ellipsoid.hitRay(ray.origin, ray.direction));
    return xyz.distance(res);
};

/**
 * Project wgs86 to segment native projection.
 * @public
 * @param {og.LonLat} lonlat - Coordinates to project.
 * @returns {og.LonLat}
 */
og.planetSegment.Segment.prototype.projectNative = function (lonlat) {
    return lonlat.forwardMercator();
};

/**
 * Starts and load terrain provider to make terrain.
 */
og.planetSegment.Segment.prototype.loadTerrain = function () {
    if (this.tileZoom >= this.planet.terrainProvider.minZoom) {
        if (!this.terrainIsLoading && !this.terrainReady) {
            this.planet.terrainProvider.handleSegmentTerrain(this);
        }
    } else {
        this.terrainReady = true;
        this.planet.normalMapCreator.queue(this);
    }
};

/**
 * Terrain obtained from server.
 * @param {Array.<number>} elevation - Elevation data.
 */
og.planetSegment.Segment.prototype.elevationsExists = function (elevations) {
    //terrain exists
    if (this.ready && this.terrainIsLoading) {

        var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
        var tgs = this.planet.terrainProvider.gridSizeByZoom[this.tileZoom];
        var fileGridSize = this.planet.terrainProvider.fileGridSize || (Math.sqrt(elevations.length) - 1);
        var fileGridSize_one = fileGridSize + 1;
        var gs = tgs + 1;
        var hf = this.planet._heightFactor;
        var terrainVertices = [];
        var normalMapVertices = [];

        var nmvInd = 0;
        var vInd = 0;
        var dg = this.planet.terrainProvider.fileGridSize / tgs;

        var normalMapNormals = new Float32Array(fileGridSize_one * fileGridSize_one * 3);

        var nv = this.normalMapVertices,
            nn = this.normalMapNormals;

        if (fileGridSize >= tgs) {
            for (var i = 0; i < fileGridSize_one; i++) {
                for (var j = 0; j < fileGridSize_one; j++) {
                    var hInd0 = i * fileGridSize_one + j;
                    var vInd0 = hInd0 * 3;
                    var h0 = hf * elevations[hInd0];
                    var v0 = new og.math.Vector3(nv[vInd0] + h0 * nn[vInd0], nv[vInd0 + 1] + h0 * nn[vInd0 + 1], nv[vInd0 + 2] + h0 * nn[vInd0 + 2]);
                    normalMapVertices[vInd0] = v0.x;
                    normalMapVertices[vInd0 + 1] = v0.y;
                    normalMapVertices[vInd0 + 2] = v0.z;

                    if (i % dg == 0 && j % dg == 0) {
                        terrainVertices[vInd++] = v0.x;
                        terrainVertices[vInd++] = v0.y;
                        terrainVertices[vInd++] = v0.z;

                        if (v0.x < xmin) xmin = v0.x; if (v0.x > xmax) xmax = v0.x;
                        if (v0.y < ymin) ymin = v0.y; if (v0.y > ymax) ymax = v0.y;
                        if (v0.z < zmin) zmin = v0.z; if (v0.z > zmax) zmax = v0.z;
                    }

                    if (i != fileGridSize && j != fileGridSize) {
                        var hInd1 = i * fileGridSize_one + j + 1;
                        var vInd1 = hInd1 * 3;
                        var h1 = hf * elevations[hInd1];
                        var v1 = new og.math.Vector3(nv[vInd1] + h1 * nn[vInd1], nv[vInd1 + 1] + h1 * nn[vInd1 + 1], nv[vInd1 + 2] + h1 * nn[vInd1 + 2]);
                        normalMapVertices[vInd1] = v1.x;
                        normalMapVertices[vInd1 + 1] = v1.y;
                        normalMapVertices[vInd1 + 2] = v1.z;

                        var hInd2 = (i + 1) * fileGridSize_one + j;
                        var vInd2 = hInd2 * 3;
                        var h2 = hf * elevations[hInd2];
                        var v2 = new og.math.Vector3(
                            nv[vInd2] + h2 * nn[vInd2],
                            nv[vInd2 + 1] + h2 * nn[vInd2 + 1],
                            nv[vInd2 + 2] + h2 * nn[vInd2 + 2]);
                        normalMapVertices[vInd2] = v2.x;
                        normalMapVertices[vInd2 + 1] = v2.y;
                        normalMapVertices[vInd2 + 2] = v2.z;

                        var hInd3 = (i + 1) * fileGridSize_one + (j + 1);
                        var vInd3 = hInd3 * 3;
                        var h3 = hf * elevations[hInd3];
                        var v3 = new og.math.Vector3(nv[vInd3] + h3 * nn[vInd3], nv[vInd3 + 1] + h3 * nn[vInd3 + 1], nv[vInd3 + 2] + h3 * nn[vInd3 + 2]);
                        normalMapVertices[vInd3] = v3.x;
                        normalMapVertices[vInd3 + 1] = v3.y;
                        normalMapVertices[vInd3 + 2] = v3.z;

                        var e10 = og.math.Vector3.sub(v1, v0),
                            e20 = og.math.Vector3.sub(v2, v0),
                            e30 = og.math.Vector3.sub(v3, v0);
                        var sw = e20.cross(e30);
                        var ne = e30.cross(e10);
                        var n0 = og.math.Vector3.add(ne, sw);

                        normalMapNormals[vInd0] += n0.x;
                        normalMapNormals[vInd0 + 1] += n0.y;
                        normalMapNormals[vInd0 + 2] += n0.z;

                        normalMapNormals[vInd1] += ne.x;
                        normalMapNormals[vInd1 + 1] += ne.y;
                        normalMapNormals[vInd1 + 2] += ne.z;

                        normalMapNormals[vInd2] += sw.x;
                        normalMapNormals[vInd2 + 1] += sw.y;
                        normalMapNormals[vInd2 + 2] += sw.z;

                        normalMapNormals[vInd3] += n0.x;
                        normalMapNormals[vInd3 + 1] += n0.y;
                        normalMapNormals[vInd3 + 2] += n0.z;
                    }
                }
            }

        } else {

            var plain_verts = this.plainVertices;
            var plainNormals = this.plainNormals;

            var oneSize = tgs / fileGridSize;
            var h, inside_i, inside_j, v_i, v_j;

            for (var i = 0; i < gs; i++) {
                if (i == gs - 1) {
                    inside_i = oneSize;
                    v_i = Math.floor(i / oneSize) - 1;
                } else {
                    inside_i = i % oneSize;
                    v_i = Math.floor(i / oneSize);
                }

                for (var j = 0; j < gs; j++) {
                    if (j == gs - 1) {
                        inside_j = oneSize;
                        v_j = Math.floor(j / oneSize) - 1;
                    } else {
                        inside_j = j % oneSize;
                        v_j = Math.floor(j / oneSize);
                    }

                    var hvlt = elevations[v_i * fileGridSize_one + v_j],
                        hvrt = elevations[v_i * fileGridSize_one + v_j + 1],
                        hvlb = elevations[(v_i + 1) * fileGridSize_one + v_j],
                        hvrb = elevations[(v_i + 1) * fileGridSize_one + v_j + 1];

                    if (inside_i + inside_j < oneSize) {
                        h = hf * (hvlt + og.math.slice(inside_j / oneSize, hvrt, hvlt) + og.math.slice(inside_i / oneSize, hvlb, hvlt));
                    } else {
                        h = hf * (hvrb + og.math.slice((oneSize - inside_j) / oneSize, hvlb, hvrb) + og.math.slice((oneSize - inside_i) / oneSize, hvrt, hvrb));
                    }

                    var x = plain_verts[vInd] + h * plainNormals[vInd],
                        y = plain_verts[vInd + 1] + h * plainNormals[vInd + 1],
                        z = plain_verts[vInd + 2] + h * plainNormals[vInd + 2];

                    terrainVertices[vInd] = x;
                    terrainVertices[vInd + 1] = y;
                    terrainVertices[vInd + 2] = z;

                    vInd += 3;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;

                }
            }

            normalMapNormals = this.plainNormals;
        }

        this.terrainExists = true;
        this.normalMapNormals = normalMapNormals;
        this.normalMapVertices = normalMapVertices;
        this.terrainVertices.length = 0;
        this.terrainVertices = terrainVertices;

        this.terrainReady = true;
        this.terrainIsLoading = false;

        if (this.planet.lightEnabled) {
            this.planet.normalMapCreator.queue(this);
        }

        this.createCoordsBuffers(terrainVertices, tgs);
        this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
        this.gridSize = tgs;
        this.node.appliedTerrainNodeId = this.node.nodeId;
    }
    elevations.length = 0;
};

/**
 * Terrain is not obtained or not exists on the server.
 */
og.planetSegment.Segment.prototype.elevationsNotExists = function () {
    if (this.tileZoom <= this.planet.terrainProvider.maxZoom) {
        if (this.ready && this.terrainIsLoading) {
            this.terrainIsLoading = false;
            this.terrainReady = true;
            this.terrainExists = false;
            this.node.appliedTerrainNodeId = this.node.nodeId;
            this.gridSize = this.planet.terrainProvider.gridSizeByZoom[this.tileZoom];

            if (this.planet.lightEnabled) {
                this.planet.normalMapCreator.queue(this);
            }

            this.createCoordsBuffers(this.terrainVertices, this.gridSize);
        }

        var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
        var v = this.terrainVertices;
        for (var i = 0; i < v.length; i += 3) {
            var x = v[i], y = v[i + 1], z = v[i + 2];
            if (x < xmin) xmin = x; if (x > xmax) xmax = x;
            if (y < ymin) ymin = y; if (y > ymax) ymax = y;
            if (z < zmin) zmin = z; if (z > zmax) zmax = z;
        }

        this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
    }
};

og.planetSegment.Segment.prototype._normalMapEdgeEqualize = function (side, i_a, vert) {

    var n = this.node.neighbors[side];
    var ns = n && n.planetSegment;

    if (n && ns) {

        this._appliedNeighborsZoom[side] = ns.tileZoom;

        if (ns.terrainReady && ns.terrainExists) {

            if (!ns._inTheQueue &&
                this.tileZoom > ns._appliedNeighborsZoom[og.quadTree.OPSIDE[side]]) {
                this.planet.normalMapCreator.queue(ns);
                return;
            }

            var size = this.planet.terrainProvider.fileGridSize;
            var s1 = size + 1;
            var i_b = size - i_a;

            var seg_a = this.normalMapNormals,
                seg_b = ns.normalMapNormals;

            if (!seg_a || !seg_b)
                return;

            if (this.tileZoom === ns.tileZoom) {
                //there is only one neighbor on the side
                if (vert) {
                    if ((this._extent.getEast() === og.mercator.POLE &&
                        ns._extent.getWest() === -og.mercator.POLE) ||
                        (this._extent.getWest() === -og.mercator.POLE &&
                            ns._extent.getEast() === og.mercator.POLE)) {
                        //UNKNOWN BUG
                        //for (var k = 0 ; k <= size; k++) {
                        //    var vInd_a = (k * s1 + i_a) * 3,
                        //        vInd_b = (k * s1 + i_b) * 3;

                        //    seg_b[vInd_b] = seg_a[vInd_a];;
                        //    seg_b[vInd_b + 1] = seg_a[vInd_a + 1];
                        //    seg_b[vInd_b + 2] = seg_a[vInd_a + 2];
                        //}
                    } else {
                        for (var k = 0; k <= size; k++) {
                            var vInd_a = (k * s1 + i_a) * 3,
                                vInd_b = (k * s1 + i_b) * 3;

                            seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                            seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                            seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                        }
                    }
                } else {
                    for (var k = 0; k <= size; k++) {
                        var vInd_a = (i_a * s1 + k) * 3,
                            vInd_b = (i_b * s1 + k) * 3;

                        seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                        seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                        seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                    }
                }
            } else if (this.tileZoom - ns.tileZoom === 1) {
                //there is only one neighbor on the side
                var offset = og.quadTree.NOPSORD[side][this.node.partId] * size * 0.5;
                if (vert) {
                    if ((this._extent.getEast() === og.mercator.POLE &&
                        ns._extent.getWest() === -og.mercator.POLE) ||
                        (this._extent.getWest() === -og.mercator.POLE &&
                            ns._extent.getEast() === og.mercator.POLE)) {
                        //UNKNOWN BUG
                        //for (var k = 0 ; k <= size; k++) {
                        //    var vInd_a = (k * s1 + i_a) * 3,
                        //        vInd_b = (k * s1 + i_b) * 3;

                        //    seg_b[vInd_b] = seg_a[vInd_a];;
                        //    seg_b[vInd_b + 1] = seg_a[vInd_a + 1];
                        //    seg_b[vInd_b + 2] = seg_a[vInd_a + 2];
                        //}
                    } else {
                        for (var k = 0; k <= size; k++) {
                            var vInd_a = (k * s1 + i_a) * 3,
                                vInd_b = ((Math.floor(k * 0.5) + offset) * s1 + i_b) * 3;

                            seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                            seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                            seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                        }
                    }
                } else {
                    for (var k = 0; k <= size; k++) {
                        var vInd_a = (i_a * s1 + k) * 3,
                            vInd_b = (i_b * s1 + Math.floor(k * 0.5) + offset) * 3;

                        seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                        seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                        seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                    }
                }
            } else if (this.tileZoom < ns.tileZoom) {
                //there are one or two neghbors on the side
                if (!ns._inTheQueue) {
                    this.planet.normalMapCreator.queue(ns);
                }

                //this is second small neighbour
                var n2 = n.parentNode.nodes[og.quadTree.NOPS[side][this.node.partId]];
                if (n2 && !n2.planetSegment._inTheQueue) {
                    this.planet.normalMapCreator.queue(n2.planetSegment);
                }
            }
        }
    }
};

/**
 * Creates normal map texture for the segment.
 */
og.planetSegment.Segment.prototype.createNormalMapTexture = function () {

    if (!this.planet ||
        this.tileZoom > this.planet.terrainProvider.maxZoom ||
        !this.normalMapNormals)
        return;

    var nb = this.node.neighbors;

    if (nb) {
        var nbn = nb[og.quadTree.N],
            nbe = nb[og.quadTree.E],
            nbs = nb[og.quadTree.S],
            nbw = nb[og.quadTree.W];

        if (this.tileZoom > this.planet.terrainProvider.minZoom) {
            if (nbn && nbn.planetSegment && nbn.planetSegment.terrainIsLoading ||
                nbe && nbe.planetSegment && nbe.planetSegment.terrainIsLoading ||
                nbs && nbs.planetSegment && nbs.planetSegment.terrainIsLoading ||
                nbw && nbw.planetSegment && nbw.planetSegment.terrainIsLoading) {
                if (!this._inTheQueue) {
                    this.planet.normalMapCreator.shift(this);
                }
                return;
            }
        }

        var gs = this.planet.terrainProvider.fileGridSize;
        this._normalMapEdgeEqualize(og.quadTree.N, 0);
        this._normalMapEdgeEqualize(og.quadTree.S, gs);
        this._normalMapEdgeEqualize(og.quadTree.W, 0, true);
        this._normalMapEdgeEqualize(og.quadTree.E, gs, true);

        this.normalMapTexture = this.handler.createTexture_l(this.planet.normalMapCreator.draw(this.normalMapNormals));

        this.normalMapReady = true;

        this.normalMapTextureBias[0] = 0;
        this.normalMapTextureBias[1] = 0;
        this.normalMapTextureBias[2] = 1;
    }
};

/**
 * Callback that calls in terrain provider to complete the terrain.
 */
og.planetSegment.Segment.prototype.applyTerrain = function (elevations) {
    if (this.ready) {
        if (elevations.length) {
            this.elevationsExists(elevations);
        } else {
            this.elevationsNotExists();
        }
    }
};

/**
 * Delete segment gl buffers.
 */
og.planetSegment.Segment.prototype.deleteBuffers = function () {
    var gl = this.handler.gl;
    gl.deleteBuffer(this.vertexNormalBuffer);
    gl.deleteBuffer(this.vertexPositionBuffer);
    gl.deleteBuffer(this.vertexTextureCoordBuffer);

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexTextureCoordBuffer = null;
};

/**
 * Delete materials.
 */
og.planetSegment.Segment.prototype.deleteMaterials = function () {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        var mi = m[i];
        if (mi) {
            mi.clear();
        }
    }
    this.materials.length = 0;
};

/**
 * Delete elevation data.
 */
og.planetSegment.Segment.prototype.deleteElevations = function () {
    this.terrainExists = false;
    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.normalMapVertices.length = 0;
    this.normalMapNormals = null;
    this.tempVertices.length = 0;
    this.terrainVertices.length = 0;
    this.plainVertices.length = 0;
    this.plainNormals = null;
    if (this.normalMapReady) {
        this.handler.gl.deleteTexture(this.normalMapTexture);
    }
    this.normalMapReady = false;
    this.parentNormalMapReady = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];
    this.normalMapTextureBias[0] = 0;
    this.normalMapTextureBias[1] = 0;
    this.normalMapTextureBias[2] = 1;
    this._inTheQueue = false;
};

/**
 * Clear but not destroy segment data.
 */
og.planetSegment.Segment.prototype.clearSegment = function () {
    this.ready = false;
    this.deleteBuffers();
    this.deleteMaterials();
    this.deleteElevations();
};

/**
 * Clear and destroy all segment data.
 */
og.planetSegment.Segment.prototype.destroySegment = function () {

    this.clearSegment();

    var i = this._renderingSlices.length;
    while (i--) {
        this._renderingSlices[i].clear();
    }

    this._renderingSlices = null;

    this.node = null;

    this.planet = null;
    this.handler = null;
    this.bbox = null;
    this.bsphere = null;
    this._extent = null;

    this.materials = null;

    this.plainIndexes = null;
    this.plainVertices = null;
    this.plainNormals = null;
    this.terrainVertices = null;
    this.tempVertices = null;

    this.normalMapTexture = null;
    this.normalMapTextureBias = null;
    this.normalMapVertices = null;
    this.normalMapNormals = null;

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexTextureCoordBuffer = null;

    this._tileOffsetArr = null;
    this._visibleExtentOffsetArr = null;

    this._projection = null;
    this._appliedNeighborsZoom = null;

    this._globalTextureCoordinates = null;
};

/**
 * Creates bound volumes by segment geographical extent.
 */
og.planetSegment.Segment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this._extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [og.LonLat.inverseMercator(extent.southWest.lon, extent.southWest.lat),
    og.LonLat.inverseMercator(extent.southWest.lon, extent.northEast.lat),
    og.LonLat.inverseMercator(extent.northEast.lon, extent.northEast.lat),
    og.LonLat.inverseMercator(extent.northEast.lon, extent.southWest.lat)];

    for (var i = 0; i < v.length; i++) {
        var coord = ellipsoid.lonLatToCartesian(v[i]);
        var x = coord.x, y = coord.y, z = coord.z;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
};

og.planetSegment.Segment.prototype.createCoordsBuffers = function (vertices, gridSize) {
    var gsgs = (gridSize + 1) * (gridSize + 1);
    var h = this.handler;
    h.gl.deleteBuffer(this.vertexPositionBuffer);
    h.gl.deleteBuffer(this.vertexTextureCoordBuffer);
    this.vertexTextureCoordBuffer = h.createArrayBuffer(og.PlanetSegmentHelper.textureCoordsTable[gridSize], 2, gsgs);
    var a = new Float32Array(vertices);
    this.vertexPositionBuffer = h.createArrayBuffer(a, 3, gsgs);
    a = null;
};

og.planetSegment.Segment.prototype._addViewExtent = function () {

    var ext = this._extent;
    if (!this.planet._viewExtentMerc) {
        this.planet._viewExtentMerc = new og.Extent(
            new og.LonLat(ext.southWest.lon, ext.southWest.lat),
            new og.LonLat(ext.northEast.lon, ext.northEast.lat));
        return;
    }

    var viewExt = this.planet._viewExtentMerc;

    if (ext.southWest.lon < viewExt.southWest.lon) {
        viewExt.southWest.lon = ext.southWest.lon;
    }

    if (ext.northEast.lon > viewExt.northEast.lon) {
        viewExt.northEast.lon = ext.northEast.lon;
    }

    if (ext.southWest.lat < viewExt.southWest.lat) {
        viewExt.southWest.lat = ext.southWest.lat;
    }

    if (ext.northEast.lat > viewExt.northEast.lat) {
        viewExt.northEast.lat = ext.northEast.lat;
    }
};

og.planetSegment.Segment.prototype._assignTileIndexes = function () {
    var tileZoom = this.tileZoom;
    var extent = this._extent;
    var pole = og.mercator.POLE;
    this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
    this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
};

og.planetSegment.Segment.prototype.createPlainSegment = function () {
    var gridSize = this.planet.terrainProvider.gridSizeByZoom[this.tileZoom];
    var n = this.node;
    n.sideSize[0] = gridSize;
    n.sideSize[1] = gridSize;
    n.sideSize[2] = gridSize;
    n.sideSize[3] = gridSize;
    this.gridSize = gridSize;
    this.createPlainVertices(gridSize);
    this.createCoordsBuffers(this.plainVertices, gridSize);
    this.ready = true;
};

og.planetSegment.Segment.prototype.createPlainVertices = function (gridSize) {

    var e = this._extent,
        fgs = this.planet.terrainProvider.fileGridSize;
    var lonSize = e.getWidth();
    var llStep = lonSize / Math.max(fgs, gridSize);
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;
    var dg = Math.max(fgs / gridSize, 1),
        gs = Math.max(fgs, gridSize) + 1;
    var r2 = this.planet.ellipsoid._invRadii2;
    var ind = 0,
        nmInd = 0;

    var gs3 = gs * gs * 3;
    this.plainNormals = new Float32Array(gs3);
    this.normalMapNormals = new Float32Array(gs3);

    var verts = this.plainVertices,
        norms = this.plainNormals,
        nmVerts = this.normalMapVertices,
        nmNorms = this.normalMapNormals;

    for (var i = 0; i < gs; i++) {
        for (var j = 0; j < gs; j++) {
            var v = this.planet.ellipsoid.lonLatToCartesian(og.LonLat.inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep));
            var nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
            var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            var nxl = nx * l, nyl = ny * l, nzl = nz * l;

            nmVerts[nmInd] = v.x;
            nmNorms[nmInd++] = nxl;

            nmVerts[nmInd] = v.y;
            nmNorms[nmInd++] = nyl;

            nmVerts[nmInd] = v.z;
            nmNorms[nmInd++] = nzl;

            if (i % dg == 0 && j % dg == 0) {
                verts[ind] = v.x;
                norms[ind++] = nxl;

                verts[ind] = v.y;
                norms[ind++] = nyl;

                verts[ind] = v.z;
                norms[ind++] = nzl;
            }
        }
    }

    this.normalMapTexture = this.planet.transparentTexture;
    this.terrainVertices = verts;
    this.tempVertices = verts;

    this._globalTextureCoordinates[0] = (e.southWest.lon + og.mercator.POLE) * og.mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[1] = (og.mercator.POLE - e.northEast.lat) * og.mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[2] = (e.northEast.lon + og.mercator.POLE) * og.mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[3] = (og.mercator.POLE - e.southWest.lat) * og.mercator.ONE_BY_POLE_DOUBLE;
};

/**
 * Gets material by layer object.
 * @public
 * @param {og.layer.Layer} layer - Layer object.
 * @returns {og.planetSegment.Material}
 */
og.planetSegment.Segment.prototype.getMaterialByLayer = function (layer) {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        if (m[i].layer == layer) {
            return m[i];
        }
    }
};

/**
 * Gets material by layer name.
 * @public
 * @param {string} name - Layer name.
 * @returns {og.planetSegment.Material}
 */
og.planetSegment.Segment.prototype.getMaterialByLayerName = function (name) {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        if (m[i].layer.name == name) {
            return m[i];
        }
    }
};

og.planetSegment.Segment.prototype._getLayerExtentOffset = function (layer) {
    var v0s = layer._extentMerc;
    var v0t = this._extent;
    var sSize_x = v0s.northEast.lon - v0s.southWest.lon;
    var sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    var dV0s_x = (v0t.southWest.lon - v0s.southWest.lon) / sSize_x;
    var dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    var dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    var dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    return [dV0s_x, dV0s_y, dSize_x, dSize_y];
};

og.planetSegment.Segment.prototype._multiRendering = function (sh, layerSlice, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE * 2 + 1);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this._getDefaultTexture());
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE * 2 + 1);

        var currHeight, li;
        if (layerSlice) {
            li = layerSlice[0];
            currHeight = li._height;
        } else {
            currHeight = 0;
        }

        var n = 0,
            i = 0;

        var notEmpty = false;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.planet.transparentTexture);

        while (li) {
            if (this.layerOverlap(li) && li.minZoom <= p.minCurrZoom && li.maxZoom >= p.maxCurrZoom) {
                notEmpty = true;
                var m = pm[li._id];
                if (!m) {
                    m = pm[li._id] = new og.planetSegment.Material(this, li);
                }

                var n4 = n * 4,
                    n3 = n * 3;

                var arr = li.applyMaterial(m);
                p._tileOffsetArr[n4] = arr[0];
                p._tileOffsetArr[n4 + 1] = arr[1];
                p._tileOffsetArr[n4 + 2] = arr[2];
                p._tileOffsetArr[n4 + 3] = arr[3];

                arr = this._getLayerExtentOffset(li);
                p._visibleExtentOffsetArr[n4] = arr[0];
                p._visibleExtentOffsetArr[n4 + 1] = arr[1];
                p._visibleExtentOffsetArr[n4 + 2] = arr[2];
                p._visibleExtentOffsetArr[n4 + 3] = arr[3];

                p._transparentColorArr[n4] = li.transparentColor[0];
                p._transparentColorArr[n4 + 1] = li.transparentColor[1];
                p._transparentColorArr[n4 + 2] = li.transparentColor[2];
                p._transparentColorArr[n4 + 3] = li.opacity;

                p._pickingColorArr[n3] = li._pickingColor.x / 255.0;
                p._pickingColorArr[n3 + 1] = li._pickingColor.y / 255.0;
                p._pickingColorArr[n3 + 2] = li._pickingColor.z / 255.0;

                p._diffuseMaterialArr[n3 + 3] = li.diffuse.x;
                p._diffuseMaterialArr[n3 + 1 + 3] = li.diffuse.y;
                p._diffuseMaterialArr[n3 + 2 + 3] = li.diffuse.z;

                p._ambientMaterialArr[n3 + 3] = li.ambient.x;
                p._ambientMaterialArr[n3 + 1 + 3] = li.ambient.y;
                p._ambientMaterialArr[n3 + 2 + 3] = li.ambient.z;

                p._specularMaterialArr[n4 + 4] = li.specular.x;
                p._specularMaterialArr[n4 + 1 + 4] = li.specular.y;
                p._specularMaterialArr[n4 + 2 + 4] = li.specular.z;
                p._specularMaterialArr[n4 + 3 + 4] = li.shininess;

                p._samplerArr[n] = n;
                gl.activeTexture(gl.TEXTURE0 + n);
                gl.bindTexture(gl.TEXTURE_2D, m.texture && gl.isTexture(m.texture) && m.texture || this.planet.transparentTexture);


                p._pickingMaskArr[n] = n + p.SLICE_SIZE;
                gl.activeTexture(gl.TEXTURE0 + n + p.SLICE_SIZE);
                gl.bindTexture(gl.TEXTURE_2D, m.pickingMask && gl.isTexture(m.pickingMask) && m.pickingMask || this.planet.transparentTexture);

                n++;
            }
            i++;
            li = layerSlice[i];
        }

        if (notEmpty || !isOverlay) {

            //bind normalmap texture
            if (p.lightEnabled) {
                gl.uniform3fv(shu.uNormalMapBias._pName, this.normalMapTextureBias);
                gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE * 2 + 2);
                gl.bindTexture(gl.TEXTURE_2D, this.normalMapTexture || this.planet.transparentTexture);
                gl.uniform1i(shu.uNormalMap._pName, p.SLICE_SIZE * 2 + 2);

                //bind segment specular and night material texture coordinates
                gl.uniform4fv(shu.uGlobalTextureCoord._pName, this._globalTextureCoordinates);

                gl.uniform3fv(shu.diffuseMaterial._pName, p._diffuseMaterialArr);
                gl.uniform3fv(shu.ambientMaterial._pName, p._ambientMaterialArr);
                gl.uniform4fv(shu.specularMaterial._pName, p._specularMaterialArr);
            }

            gl.uniform1i(shu.samplerCount._pName, n);
            gl.uniform1f(shu.height._pName, currHeight);
            gl.uniform1iv(shu.samplerArr._pName, p._samplerArr);
            gl.uniform1iv(shu.pickingMaskArr._pName, p._pickingMaskArr);
            gl.uniform4fv(shu.tileOffsetArr._pName, p._tileOffsetArr);
            gl.uniform4fv(shu.visibleExtentOffsetArr._pName, p._visibleExtentOffsetArr);
            gl.uniform4fv(shu.transparentColorArr._pName, p._transparentColorArr);
            gl.uniform3fv(shu.pickingColorArr._pName, p._pickingColorArr);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            sh.drawIndexBuffer(p.drawMode, this._getIndexBuffer());
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};

og.planetSegment._RenderingSlice = function (p) {
    this.layers = [];
    this.tileOffsetArr = new Float32Array(p.SLICE_SIZE_4);
    this.visibleExtentOffsetArr = new Float32Array(p.SLICE_SIZE_4);
    this.transparentColorArr = new Float32Array(p.SLICE_SIZE_4);

    this.clear = function () {
        this.layers.length = 0;
        this.tileOffsetArr.length = 0;
        this.visibleExtentOffsetArr.length = 0;
        this.transparentColorArr.length = 0;

        this.layers = null;
        this.tileOffsetArr = null;
        this.visibleExtentOffsetArr = null;
        this.transparentColorArr = null;
    };
};

og.planetSegment.Segment.prototype._screenRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this._getDefaultTexture());
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE + 1);

        var currHeight, li;
        if (layerSlice) {
            li = layerSlice[0];
            currHeight = li._height;
        } else {
            currHeight = 0;
        }

        var n = 0,
            i = 0;

        var notEmpty = false;

        var slice = this._renderingSlices[sliceIndex];

        if (!slice) {
            slice = this._renderingSlices[sliceIndex] = new og.planetSegment._RenderingSlice(p);
        } else {
            slice.layers = [];
        }

        this._indexBuffer = this._getIndexBuffer();

        while (li) {
            if (this.layerOverlap(li) && li.minZoom <= p.minCurrZoom && li.maxZoom >= p.maxCurrZoom) {
                notEmpty = true;
                var m = pm[li._id];
                if (!m) {
                    m = pm[li._id] = new og.planetSegment.Material(this, li);
                }

                slice.layers.push(li);

                var n4 = n * 4,
                    n3 = n * 3;

                var arr = li.applyMaterial(m);
                slice.tileOffsetArr[n4] = arr[0];
                slice.tileOffsetArr[n4 + 1] = arr[1];
                slice.tileOffsetArr[n4 + 2] = arr[2];
                slice.tileOffsetArr[n4 + 3] = arr[3];

                arr = this._getLayerExtentOffset(li);
                slice.visibleExtentOffsetArr[n4] = arr[0];
                slice.visibleExtentOffsetArr[n4 + 1] = arr[1];
                slice.visibleExtentOffsetArr[n4 + 2] = arr[2];
                slice.visibleExtentOffsetArr[n4 + 3] = arr[3];

                slice.transparentColorArr[n4] = li.transparentColor[0];
                slice.transparentColorArr[n4 + 1] = li.transparentColor[1];
                slice.transparentColorArr[n4 + 2] = li.transparentColor[2];
                slice.transparentColorArr[n4 + 3] = li.opacity;

                p._diffuseMaterialArr[n3 + 3] = li.diffuse.x;
                p._diffuseMaterialArr[n3 + 1 + 3] = li.diffuse.y;
                p._diffuseMaterialArr[n3 + 2 + 3] = li.diffuse.z;

                p._ambientMaterialArr[n3 + 3] = li.ambient.x;
                p._ambientMaterialArr[n3 + 1 + 3] = li.ambient.y;
                p._ambientMaterialArr[n3 + 2 + 3] = li.ambient.z;

                p._specularMaterialArr[n4 + 4] = li.specular.x;
                p._specularMaterialArr[n4 + 1 + 4] = li.specular.y;
                p._specularMaterialArr[n4 + 2 + 4] = li.specular.z;
                p._specularMaterialArr[n4 + 3 + 4] = li.shininess;

                p._samplerArr[n] = n;

                gl.activeTexture(gl.TEXTURE0 + n);
                gl.bindTexture(gl.TEXTURE_2D, m.texture || this.planet.transparentTexture);

                n++;
            }
            i++;
            li = layerSlice[i];
        }

        if (notEmpty || !isOverlay) {

            //bind normalmap texture
            if (p.lightEnabled) {
                gl.uniform3fv(shu.uNormalMapBias._pName, this.normalMapTextureBias);
                gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 2);
                gl.bindTexture(gl.TEXTURE_2D, this.normalMapTexture || this.planet.transparentTexture);
                gl.uniform1i(shu.uNormalMap._pName, p.SLICE_SIZE + 2);

                //bind segment specular and night material texture coordinates
                gl.uniform4fv(shu.uGlobalTextureCoord._pName, this._globalTextureCoordinates);

                gl.uniform3fv(shu.diffuseMaterial._pName, p._diffuseMaterialArr);
                gl.uniform3fv(shu.ambientMaterial._pName, p._ambientMaterialArr);
                gl.uniform4fv(shu.specularMaterial._pName, p._specularMaterialArr);
            }

            gl.uniform1i(shu.samplerCount._pName, n);
            gl.uniform1f(shu.height._pName, currHeight);
            gl.uniform1iv(shu.samplerArr._pName, p._samplerArr);
            gl.uniform4fv(shu.tileOffsetArr._pName, slice.tileOffsetArr);
            gl.uniform4fv(shu.visibleExtentOffsetArr._pName, slice.visibleExtentOffsetArr);
            gl.uniform4fv(shu.transparentColorArr._pName, slice.transparentColorArr);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            sh.drawIndexBuffer(p.drawMode, this._indexBuffer);
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};

og.planetSegment.Segment.prototype._colorPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        var currHeight;
        if (layerSlice) {
            currHeight = layerSlice[0]._height;
        } else {
            currHeight = 0;
        }

        var notEmpty = false;

        var slice = this._renderingSlices[sliceIndex];

        for (var n = 0; n < slice.layers.length; n++) {
            notEmpty = true;

            var li = slice.layers[n];
            var n3 = n * 3;

            p._pickingColorArr[n3] = li._pickingColor.x / 255.0;
            p._pickingColorArr[n3 + 1] = li._pickingColor.y / 255.0;
            p._pickingColorArr[n3 + 2] = li._pickingColor.z / 255.0;

            p._samplerArr[n] = n;
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, pm[li._id].texture || this.planet.transparentTexture);

            p._pickingMaskArr[n] = n + p.SLICE_SIZE;
            gl.activeTexture(gl.TEXTURE0 + n + p.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, pm[li._id].pickingMask || this.planet.transparentTexture);
        }

        if (notEmpty || !isOverlay) {
            gl.uniform1i(shu.samplerCount._pName, n);
            gl.uniform1f(shu.height._pName, currHeight);
            gl.uniform1iv(shu.samplerArr._pName, p._samplerArr);
            gl.uniform1iv(shu.pickingMaskArr._pName, p._pickingMaskArr);
            gl.uniform4fv(shu.tileOffsetArr._pName, slice.tileOffsetArr);
            gl.uniform4fv(shu.visibleExtentOffsetArr._pName, slice.visibleExtentOffsetArr);
            gl.uniform4fv(shu.transparentColorArr._pName, slice.transparentColorArr);
            gl.uniform3fv(shu.pickingColorArr._pName, p._pickingColorArr);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            sh.drawIndexBuffer(p.drawMode, this._indexBuffer);
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};

og.planetSegment.Segment.prototype._heightPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this.planet.solidTextureOne);
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE + 1);

        var currHeight;
        if (layerSlice) {
            currHeight = layerSlice[0]._height;
        } else {
            currHeight = 0;
        }

        var n = 0;

        var slice = this._renderingSlices[sliceIndex];

        var notEmpty = false;

        for (var n = 0; n < slice.layers.length; n++) {
            notEmpty = true;
            p._samplerArr[n] = n;
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, pm[slice.layers[n]._id].texture || this.planet.transparentTexture);
        }

        if (notEmpty || !isOverlay) {
            gl.uniform1i(shu.samplerCount._pName, n);
            gl.uniform1f(shu.height._pName, currHeight);
            gl.uniform1iv(shu.samplerArr._pName, p._samplerArr);
            gl.uniform4fv(shu.tileOffsetArr._pName, slice.tileOffsetArr);
            gl.uniform4fv(shu.visibleExtentOffsetArr._pName, slice.visibleExtentOffsetArr);
            gl.uniform4fv(shu.transparentColorArr._pName, slice.transparentColorArr);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            sh.drawIndexBuffer(p.drawMode, this._indexBuffer);
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};


og.planetSegment.Segment.prototype._getIndexBuffer = function () {
    var s = this.node.sideSize;
    return this.planet._indexesBuffers[this.gridSize][s[0]][s[1]][s[2]][s[3]];
};

og.planetSegment.Segment.prototype._collectRenderNodes = function () {
    this.planet._visibleNodes[this.node.nodeId] = this.node;
};

og.planetSegment.Segment.prototype.layerOverlap = function (layer) {
    return this._extent.overlaps(layer._extentMerc);
};

og.planetSegment.Segment.prototype._getDefaultTexture = function () {
    return this.planet.solidTextureOne;
};

og.planetSegment.Segment.prototype.getExtentLonLat = function () {
    return this._extent.inverseMercator();
};

og.planetSegment.Segment.prototype.getExtentMerc = function () {
    return this._extent;
};

og.planetSegment.Segment.prototype.getExtent = function () {
    return this._extent;
};

og.planetSegment.Segment.prototype.getNodeState = function () {
    var vn = this.planet._visibleNodes[this.node.nodeId];
    return vn && vn.state || og.quadTree.NOTRENDERING;
};