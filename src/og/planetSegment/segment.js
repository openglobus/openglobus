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
og.planetSegment.Segment = function () {

    /**
     * Quad tree node of the segment.
     * @type {og.quadTree.QuadNode}
     */
    this.node = null;

    /**
     * Planet pointer.
     * @type {pg.node.RenderNode}
     */
    this.planet = null;

    /**
     * WebGl handler pointer.
     * @type {og.webgl.Handler}
     */
    this.handler = null;

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
    this.extent = null;

    /**
     * Vertices grid size.
     * @type {number}
     */
    this.gridSize = null;

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

    /**
     * Tile zoom index.
     * @type {number}
     */
    this.tileZoom = null;

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
     * GeoImages already made for the segment.
     * @type {boolean}
     */
    this.geoImageReady = false;

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
    this.plainNormals = [];
    this.terrainVertices = [];
    this.tempVertices = [];

    this.normalMapTexture = null;
    this.normalMapTextureBias = [0, 0, 1];
    this.normalMapVertices = [];
    this.normalMapNormals = [];

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;
    this.vertexTextureCoordBuffer = null;

    this.geoImageTexture = null;
    this.geoImageTextureBias = [0, 0, 1];

    this._texBiasArr = new Float32Array(og.layer.MAXIMUM_OVERLAYS * 3);
    this._samplerArr = new Int32Array(og.layer.MAXIMUM_OVERLAYS);

    this._extentParams = [];
    this._projection = og.proj.EPSG3857;
    this._inTheQueue = false;
    this._inTheGeoImageTileCreatorQueue = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];
};

/**
 * Level of the visible segment detalization.
 * @type {number}
 */
og.planetSegment.Segment.RATIO_LOD = 1.12;

/**
 * Returns that segment good for rendering with camera by current RATIO_LOD.
 * @public
 * @returns {boolean}
 */
og.planetSegment.Segment.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;
    return camera.projectedSize(sphere.center) > og.planetSegment.Segment.RATIO_LOD * sphere.radius;
};

/**
 * Returns distance from object to terrain coordinates.
 * @public
 * @param {og.math.Vector3} res - - Result cartesian coordiantes on the terrain.
 * @param {og.math.Vector3} xyz - Cartesian object position.
 * @param {og.LonLat} insideSegmentPosition - Geodetic object position.
 * @returns {og.math.Vector3}
 */
og.planetSegment.Segment.prototype.getTerrainPoint = function (res, xyz, insideSegmentPosition) {
    var ne = this.extent.northEast,
        sw = this.extent.southWest,
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
        ray = new og.math.Ray(xyz, xyz.getNegate());

    if (verts.length) {
        var ind_v0 = ((size + 1) * indY + indX) * 3;
        var ind_v2 = ((size + 1) * (indY + 1) + indX) * 3;

        var v0 = new og.math.Vector3(verts[ind_v0], verts[ind_v0 + 1], verts[ind_v0 + 2]),
            v1 = new og.math.Vector3(verts[ind_v0 + 3], verts[ind_v0 + 4], verts[ind_v0 + 5]),
            v2 = new og.math.Vector3(verts[ind_v2], verts[ind_v2 + 1], verts[ind_v2 + 2]),
            v3 = new og.math.Vector3(verts[ind_v2 + 3], verts[ind_v2 + 4], verts[ind_v2 + 5]);

        var d = ray.hitTriangle(v0, v1, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return xyz.distance(res);
        }

        d = ray.hitTriangle(v1, v3, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return xyz.distance(res);
        }

        if (d == og.math.Ray.AWAY) {
            return -xyz.distance(res);
        }

        return xyz.distance(res);
    }

    res.copy(this.planet.hitRayEllipsoid(ray.origin, ray.direction));
    return xyz.distance(res);
};

/**
 * Project wgs86 to segment native projection.
 * @public
 * @param {og.LonLat} lonlat - Coordinates to project.
 * @returns {og.LonLat}
 */
og.planetSegment.Segment.prototype.projectNative = function (lonlat, readyNative) {
    return lonlat.forwardMercator();
};

/**
 * Starts and load terrain provider to make terrain.
 */
og.planetSegment.Segment.prototype.loadTerrain = function () {
    if (this.tileZoom >= this.planet.terrainProvider.minZoom) {
        if (!this.terrainIsLoading && !this.terrainReady) {
            this.terrainReady = false;
            this.terrainIsLoading = true;
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
        var dg = 32 / tgs;

        var normalMapNormals = new Float64Array(fileGridSize_one * fileGridSize_one * 3);

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


        this.deleteBuffers();
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

            this.deleteBuffers();

            if (this.planet.lightEnabled) {
                this.planet.normalMapCreator.queue(this);
            }

            if (this.tileZoom > 5) {
                var step = 3 * this.gridSize;
                var step2 = step * 0.5;
                var lb = step * (this.gridSize + 1);
                var ml = step2 * (this.gridSize + 1);

                var v = this.terrainVertices;
                this.terrainVertices = [v[0], v[1], v[2], v[step2], v[step2 + 1], v[step2 + 2], v[step], v[step + 1], v[step + 2],
                        v[ml], v[ml + 1], v[ml + 2], v[ml + step2], v[ml + step2 + 1], v[ml + step2 + 2], v[ml + step], v[ml + step + 1], v[ml + step + 2],
                        v[lb], v[lb + 1], v[lb + 2], v[lb + step2], v[lb + step2 + 1], v[lb + step2 + 2], v[lb + step], v[lb + step + 1], v[lb + step + 2]];

                this.createCoordsBuffers(this.terrainVertices, 2);

                this.gridSize = 2;
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

og.planetSegment.Segment.prototype.normalMapEdgeEqualize = function (side, i_a, vert) {

    var n = this.node.neighbors[side];

    if (n) {

        var ns = n.planetSegment;

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

            //there is no cases when zoom indexes different between neighbor more than 2

            if (this.tileZoom == ns.tileZoom) {
                //there is only one neighbor on the side

                if (vert) {
                    for (var k = 0 ; k <= size; k++) {
                        var vInd_a = (k * s1 + i_a) * 3,
                            vInd_b = (k * s1 + i_b) * 3;

                        seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                        seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                        seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                    }
                } else {
                    for (var k = 0 ; k <= size; k++) {
                        var vInd_a = (i_a * s1 + k) * 3,
                            vInd_b = (i_b * s1 + k) * 3;

                        seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                        seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                        seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                    }
                }
            } else if (this.tileZoom > ns.tileZoom) {
                //there is only one neighbor on the side

                var offset = og.quadTree.NOPSORD[side][this.node.partId] * size * 0.5;

                if (vert) {
                    for (var k = 0 ; k <= size; k++) {
                        var vInd_a = (k * s1 + i_a) * 3,
                            vInd_b = ((Math.floor(k * 0.5) + offset) * s1 + i_b) * 3;

                        seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                        seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                        seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
                    }
                } else {
                    for (var k = 0 ; k <= size; k++) {
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

    if (this.tileZoom > this.planet.terrainProvider.maxZoom)
        return;

    var nb = this.node.neighbors;

    if (nb) {
        var nbn = nb[og.quadTree.N],
            nbe = nb[og.quadTree.E],
            nbs = nb[og.quadTree.S],
            nbw = nb[og.quadTree.W];

        if (this.tileZoom > this.planet.terrainProvider.minZoom) {
            if (nbn && nbn.planetSegment.terrainIsLoading ||
                nbe && nbe.planetSegment.terrainIsLoading ||
                nbs && nbs.planetSegment.terrainIsLoading ||
                nbw && nbw.planetSegment.terrainIsLoading) {
                if (!this._inTheQueue) {
                    this.planet.normalMapCreator.shift(this);
                }
                return;
            }
        }

        this.normalMapEdgeEqualize(og.quadTree.N, 0);
        this.normalMapEdgeEqualize(og.quadTree.S, 32);
        this.normalMapEdgeEqualize(og.quadTree.W, 0, true);
        this.normalMapEdgeEqualize(og.quadTree.E, 32, true);

        this.normalMapTexture = this.handler.createTexture_mm(this.planet.normalMapCreator.draw(this.normalMapNormals));

        this.normalMapReady = true;
        this.normalMapTextureBias = [0, 0, 1];
    }
};

/**
 * Render geoImages to the segment texture.
 */
og.planetSegment.Segment.prototype.createGeoImageTileTexture = function () {
    var canvas = this.planet.geoImageTileCreator.draw(this);
    if (canvas) {
        this.geoImageTexture = this.handler.createTexture_mm(canvas);
    } else {
        this.geoImageTexture = this.planet.transparentTexture;
    }
    this.geoImageTextureBias = [0, 0, 1];
    this.geoImageReady = true;
};

og.planetSegment.Segment.prototype.drawGeoImage = function (geoImage) {
    if (geoImage.visibility && geoImage.imageLoaded && geoImage._mercExtent.intersects(this.extent)) {

        var tc = this.planet.geoImageTileCreator;

        if (!geoImage._mercSamplerReady) {
            tc.createMercatorSamplerPASS(geoImage);
        }

        var h = tc._handler;
        var sh = h.shaderPrograms.geoImage._program;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var gl = h.gl;

        h.shaderPrograms.geoImage.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, tc._texCoordsBuffer);
        gl.vertexAttribPointer(sha.a_texCoord._pName, tc._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._mercCornersBuffer);
        gl.vertexAttribPointer(sha.a_corner._pName, geoImage._mercCornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.u_extentParams._pName, this._extentParams);
        gl.uniform1f(shu.u_opacity._pName, geoImage.opacity);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._mercFramebuffer.texture);
        gl.uniform1i(shu.u_sourceImage._pName, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
    }
};

/**
 * Callback that calls in terrain provider to complete the terrain.
 */
og.planetSegment.Segment.prototype.applyTerrain = function (elevations) {
    if (elevations.length) {
        this.elevationsExists(elevations);
    } else {
        this.elevationsNotExists();
    }
};

/**
 * Delete segment gl buffers.
 */
og.planetSegment.Segment.prototype.deleteBuffers = function () {
    var gl = this.handler.gl;
    gl.deleteBuffer(this.vertexNormalBuffer);
    gl.deleteBuffer(this.vertexPositionBuffer);
    gl.deleteBuffer(this.vertexIndexBuffer);
    gl.deleteBuffer(this.vertexTextureCoordBuffer);

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;
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
    m.length = 0;
};

/**
 * Delete elevation data.
 */
og.planetSegment.Segment.prototype.deleteElevations = function () {
    this._inTheQueue = false;
    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.normalMapVertices.length = 0;
    this.normalMapNormals.length = 0;
    this.tempVertices.length = 0;
    this.terrainVertices.length = 0;
    this.plainVertices.length = 0;
    this.plainNormals.length = 0;
    if (this.normalMapReady) {
        this.handler.gl.deleteTexture(this.normalMapTexture);
    }
    if (this.geoImageReady && !this.geoImageTexture.default) {
        this.handler.gl.deleteTexture(this.geoImageTexture);
    }
    this.geoImageReady = false;
    this.geoImageTextureBias = [0, 0, 1];
    this.normalMapReady = false;
    this.parentNormalMapReady = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];
    this.normalMapTextureBias = [0, 0, 1];
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
    this.node.state = og.quadTree.NOTRENDERING;

    this.clearSegment();
    this.extent = null;

    this._appliedNeighborsZoom = null;
    this.normalMapTextureBias = null;

    this.node.neighbors = null;
    this.node.hasNeighbors = null;
    this.node.parentNode = null;
};

/**
 * Creates bound volumes by segment geographical extent.
 */
og.planetSegment.Segment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this.extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(og.LonLat.inverseMercator(extent.southWest.lon, extent.southWest.lat),
        og.LonLat.inverseMercator(extent.southWest.lon, extent.northEast.lat),
        og.LonLat.inverseMercator(extent.northEast.lon, extent.northEast.lat),
        og.LonLat.inverseMercator(extent.northEast.lon, extent.southWest.lat));

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
    this.vertexTextureCoordBuffer = this.handler.createArrayBuffer(new Float32Array(og.PlanetSegmentHelper.textureCoordsTable[gridSize]), 2, gsgs);
    this.vertexPositionBuffer = this.handler.createArrayBuffer(new Float32Array(vertices), 3, gsgs);
};

og.planetSegment.Segment.prototype.createIndexesBuffer = function (sidesSizes, gridSize) {
    var indexes = og.PlanetSegmentHelper.createSegmentIndexes(gridSize, sidesSizes);
    this.vertexIndexBuffer = this.handler.createElementArrayBuffer(indexes, 1, indexes.length);
};

og.planetSegment.Segment.prototype.assignTileIndexes = function (tileZoom, extent) {
    this.tileZoom = tileZoom;
    this.extent = extent;
    var pole = og.mercator.POLE;
    this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
    this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
    this._extentParams = [this.extent.southWest.lon, this.extent.southWest.lat, 2.0 / this.extent.getWidth(), 2.0 / this.extent.getHeight()];
};

og.planetSegment.Segment.prototype.createPlainVertices = function (gridSize) {
    var verts = this.plainVertices,
        norms = this.plainNormals,
        nmVerts = this.normalMapVertices,
        nmNorms = this.normalMapNormals;

    var e = this.extent,
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

og.planetSegment.drawSingle = function (sh, segment) {
    if (segment.ready) {
        var gl = segment.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleTileLayers;
        if (layers.length) {
            var baseMat = segment.materials[layers[0]._id];
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, baseMat.texture);
            gl.uniform3fv(shu.texBias._pName, baseMat.texBias);
            gl.uniform1i(shu.uSampler._pName, 0);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, segment.geoImageTexture);
            gl.uniform1i(shu.uGeoImage._pName, 2);
            gl.uniform3fv(shu.geoImageTexBias._pName, segment.geoImageTextureBias);

            if (segment.planet.lightEnabled) {
                gl.uniform3fv(shu.uNormalMapBias._pName, segment.normalMapTextureBias);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, segment.normalMapTexture);
                gl.uniform1i(shu.uNormalMap._pName, 1);
            }
        }
        segment.draw(sh);
    }
};

og.planetSegment.drawOverlays = function (sh, segment) {
    if (segment.ready) {
        var gl = segment.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleTileLayers;

        for (var l = 0; l < layers.length; l++) {
            var ll = layers[l];
            var mat = segment.materials[ll._id];
            var nt3 = l * 3;
            //var nt4 = l * 4;

            segment._texBiasArr[nt3] = mat.texBias[0];
            segment._texBiasArr[nt3 + 1] = mat.texBias[1];
            segment._texBiasArr[nt3 + 2] = mat.texBias[2];

            segment._samplerArr[l] = l;

            gl.activeTexture(gl.TEXTURE0 + sh._textureID + l);
            gl.bindTexture(gl.TEXTURE_2D, mat.texture);
        }

        gl.uniform3fv(shu.texBiasArr._pName, segment._texBiasArr);
        gl.uniform1iv(shu.uSamplerArr._pName, segment._samplerArr);

        if (segment.planet.lightEnabled) {
            gl.uniform3fv(shu.uNormalMapBias._pName, segment.normalMapTextureBias);
            gl.activeTexture(gl.TEXTURE0 + layers.length);
            gl.bindTexture(gl.TEXTURE_2D, segment.normalMapTexture);
            gl.uniform1i(shu.uNormalMap._pName, layers.length);
        }

        gl.activeTexture(gl.TEXTURE0 + layers.length + 1);
        gl.bindTexture(gl.TEXTURE_2D, segment.geoImageTexture);
        gl.uniform1i(shu.uGeoImage._pName, +layers.length + 1);
        gl.uniform3fv(shu.geoImageTexBias._pName, segment.geoImageTextureBias);

        segment.draw(sh);
    }
};

og.planetSegment.Segment.prototype.draw = function (sh) {
    var gl = this.handler.gl;
    var sha = sh.attributes;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this._setVIb();
    sh.drawIndexBuffer(this.planet.drawMode, this._vib);
    this.node.hasNeighbor = [false, false, false, false];
};

og.planetSegment.Segment.prototype._setVIb = function () {
    if (this.node.sideSize[og.quadTree.N] & this.node.sideSize[og.quadTree.W] &
        this.node.sideSize[og.quadTree.S] & this.node.sideSize[og.quadTree.E]) {
        this._vib = this.planet._indexesBuffers[this.gridSize];
    } else {
        this.createIndexesBuffer(this.node.sideSize, this.gridSize);
        this._vib = this.vertexIndexBuffer;
    }
};

og.planetSegment.Segment.prototype.drawHeightPicking = function () {
    if (this.ready) {
        var gl = this.handler.gl;
        var sh = this.handler.shaderPrograms.heightPicking._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var cam = this.node.planet.renderer.activeCamera;
        gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, cam._pmvMatrix._m);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        this._setVIb();

        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._vib);

        this.node.sideSize = [this.gridSize, this.gridSize, this.gridSize, this.gridSize];
    }
};