/**
 * @module og/segment/Segment
 */

'use sctrict';

import * as math from '../math.js';
import * as mercator from '../mercator.js';
import * as quadTree from '../quadTree/quadTree.js';
import { Box } from '../bv/Box.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Extent } from '../Extent.js';
import { Layer } from '../layer/Layer.js';
import { LonLat } from '../LonLat.js';
import { textureCoordsTable } from './segmentHelper.js';
import { Ray } from '../math/Ray.js';
import { Sphere } from '../bv/Sphere.js';
import { Vec3 } from '../math/Vec3.js';

var _RenderingSlice = function (p) {
    this.layers = [];
    this.tileOffsetArr = new Float32Array(p.SLICE_SIZE_4);
    this.visibleExtentOffsetArr = new Float32Array(p.SLICE_SIZE_4);
    this.transparentColorArr = new Float32Array(p.SLICE_SIZE_4);

    this.clear = function () {
        this.layers = null;
        this.tileOffsetArr = null;
        this.visibleExtentOffsetArr = null;
        this.transparentColorArr = null;
    };
};

/**
 * Planet segment Web Mercator tile class that stored and rendered with quad tree.
 * @class
 * @param {og.quadTree.Node} node - Segment node.
 * @param {og.scene.Planet} planet - Current planet scene.
 * @param {Number} tileZoom - Zoom index.
 * @param {og.Extent} extent - Segment extent.
 */
const Segment = function (node, planet, tileZoom, extent) {

    /**
     * Quad tree node of the segment.
     * @type {og.quadTree.Node}
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
    this.bbox = new Box();

    /**
     * Segment bounding box.
     * @type {og.bv.Sphere}
     */
    this.bsphere = new Sphere();

    /**
     * Geographical extent.
     * @type {og.Extent}
     */
    this._extent = extent;

    /**
     * Vertices grid size.
     * @type {number}
     */
    this.gridSize = planet.terrain.gridSizeByZoom[tileZoom];

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

    this.tileIndex = "";

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
     * Segment is ready to create plain vertices.
     * @type {boolean}
     */
    this.initialized = false;

    /**
     * Normal map is allready made.
     * @type {boolean}
     */
    this.normalMapReady = false;

    /**
     * Parent normal map is made allready(optimization parameter).
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

    this.plainIndexes = null;
    this.plainVertices = null;
    this.plainNormals = null;
    this.terrainVertices = null;
    this.tempVertices = null;

    this.normalMapTexture = null;
    this.normalMapTextureBias = new Float32Array(3);
    this.normalMapVertices = null;
    this.normalMapNormals = null;

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexTextureCoordBuffer = null;

    this._globalTextureCoordinates = new Float32Array(4);
    this._projection = EPSG3857;
    this._inTheQueue = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];

    this._renderingSlices = [];

    this._indexBuffer = null;
};

/**
 * Returns that segment good for rendering with camera by current RATIO_LOD.
 * @public
 * @param {og.Camera} camera - Camera object.
 * @returns {boolean} -
 */
Segment.prototype.acceptForRendering = function (camera) {
    return camera.projectedSize(this.bsphere.center, this.bsphere.radius) < 256 / this.planet.RATIO_LOD;
};


/**
 * Returns entity terrain point.
 * @public
 * @param {og.Entity} entity - Entity.
 * @returns {og.math.Vector3}
 */
Segment.prototype.getEntityTerrainPoint = function (entity, res) {
    return this.getTerrainPoint(res, entity._cartesian, entity._lonlatMerc);
};

Segment.prototype.isEntityInside = function (e) {
    return this._extent.isInside(e._lonlatMerc);
};

/**
 * Returns distance from object to terrain coordinates and terrain point that calculates out in the res parameter.
 * @public
 * @param {og.math.Vector3} res - Result cartesian coordiantes on the terrain.
 * @param {og.math.Vector3} xyz - Cartesian object position.
 * @param {og.LonLat} insideSegmentPosition - Geodetic object position.
 * @returns {number} -
 */
Segment.prototype.getTerrainPoint = function (res, xyz, insideSegmentPosition) {
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
        ray = new Ray(xyz, xyz.negateTo());

    if (verts && verts.length) {
        var ind_v0 = ((size + 1) * indY + indX) * 3;
        var ind_v2 = ((size + 1) * (indY + 1) + indX) * 3;

        var v0 = new Vec3(verts[ind_v0], verts[ind_v0 + 1], verts[ind_v0 + 2]),
            v1 = new Vec3(verts[ind_v0 + 3], verts[ind_v0 + 4], verts[ind_v0 + 5]),
            v2 = new Vec3(verts[ind_v2], verts[ind_v2 + 1], verts[ind_v2 + 2]);

        var d = ray.hitTriangle(v0, v1, v2, res);
        if (d === Ray.INSIDE) {
            return xyz.distance(res);
        }

        var v3 = new Vec3(verts[ind_v2 + 3], verts[ind_v2 + 4], verts[ind_v2 + 5]);

        d = ray.hitTriangle(v1, v3, v2, res);
        if (d === Ray.INSIDE) {
            return xyz.distance(res);
        }

        if (d === Ray.AWAY) {
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
 * @returns {og.LonLat} -
 */
Segment.prototype.projectNative = function (lonlat) {
    return lonlat.forwardMercator();
};

Segment.prototype.loadTerrain = function () {
    if (this.tileZoom >= this.planet.terrain.minZoom) {
        if (!this.terrainIsLoading && !this.terrainReady) {
            this.planet.terrain.loadTerrain(this);
        }
    } else {
        this.terrainReady = true;
        if (!this._inTheQueue) {
            this.planet._normalMapCreator.queue(this);
        }
    }
};

/**
 * Terrain obtained from server.
 * @param {Float32Array} elevations - Elevation data.
 */
Segment.prototype.elevationsExists = function (elevations) {
    //terrain exists
    if (this.ready && this.terrainIsLoading) {
        this.planet._terrainWorker.make(this, elevations);
    }
};

Segment.prototype._terrainWorkerCallback = function (data) {
    if (this.ready) {
        this.normalMapNormals = null;
        this.normalMapVertices = null;
        this.terrainVertices = null;
        this.tempVertices = null;

        this.normalMapNormals = data.normalMapNormals;
        this.normalMapVertices = data.normalMapVertices;
        this.terrainVertices = data.terrainVertices;
        this.tempVertices = data.terrainVertices;

        this.terrainReady = true;
        this.terrainIsLoading = false;
        this.parentNormalMapReady = true;

        if (!this.normalMapTexturePtr) {
            var nmc = this.planet._normalMapCreator;
            this.normalMapTexturePtr = this.planet.renderer.handler.createEmptyTexture_l(nmc._width, nmc._height);
        }

        if (this.planet.lightEnabled) {
            this.planet._normalMapCreator.queue(this);
        }

        var tgs = this.planet.terrain.gridSizeByZoom[this.tileZoom];
        this.createCoordsBuffers(this.terrainVertices, tgs);
        this.bsphere.setFromBounds(data.bounds);
        this.gridSize = tgs;
        this.terrainExists = true;
        this.node.appliedTerrainNodeId = this.node.nodeId;
    }
};

/**
 * Terrain is not obtained or not exists on the server.
 */
Segment.prototype.elevationsNotExists = function () {
    if (this.tileZoom <= this.planet.terrain.maxZoom) {
        if (this.ready && this.terrainIsLoading) {
            this.terrainIsLoading = false;
            this.terrainReady = true;
            this.terrainExists = false;
            this.node.appliedTerrainNodeId = this.node.nodeId;
            this.gridSize = this.planet.terrain.gridSizeByZoom[this.tileZoom];

            if (this.planet.lightEnabled && !this._inTheQueue) {
                this.planet._normalMapCreator.queue(this);
            }

            this.createCoordsBuffers(this.terrainVertices, this.gridSize);
        }

        var xmin = math.MAX, xmax = math.MIN, ymin = math.MAX, ymax = math.MIN, zmin = math.MAX, zmax = math.MIN;
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

Segment.prototype._normalMapEdgeEqualize = function (side, i_a, vert) {

    var nn = this.node.neighbors;
    var n = nn[side];
    var maxZ = this.planet.terrain.maxZoom;

    if (this.tileZoom === maxZ) {
        if (!(nn[0] || nn[1] || nn[2] || nn[3])) {
            n = this.node.getEqualNeighbor(side);
        }
    }

    var ns = n && n.segment;

    if (n && ns && ns.terrainReady && ns.terrainExists &&
        ns.tileZoom <= maxZ &&
        this._appliedNeighborsZoom[side] !== ns.tileZoom) {

        var s = this, b = ns;

        s._appliedNeighborsZoom[side] = b.tileZoom;

        var seg_a = s.normalMapNormals,
            seg_b = b.normalMapNormals;

        if (!(seg_a && seg_b)) return;

        var s_gs = Math.sqrt(s.normalMapNormals.length / 3),
            b_gs = Math.sqrt(b.normalMapNormals.length / 3),
            s_gs1 = s_gs - 1,
            b_gs1 = b_gs - 1;

        i_a *= s_gs1;

        var nx, ny, nz, q;

        if (s.tileZoom === b.tileZoom) {

            var i_b = s_gs1 - i_a;

            if (vert) {
                for (var k = 0; k < s_gs; k++) {
                    var vInd_a = (k * s_gs + i_a) * 3,
                        vInd_b = (k * s_gs + i_b) * 3;

                    nx = seg_a[vInd_a] + seg_b[vInd_b];
                    ny = seg_a[vInd_a + 1] + seg_b[vInd_b + 1];
                    nz = seg_a[vInd_a + 2] + seg_b[vInd_b + 2];

                    q = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            } else {
                for (var k = 0; k < s_gs; k++) {
                    var vInd_a = (i_a * s_gs + k) * 3,
                        vInd_b = (i_b * s_gs + k) * 3;

                    nx = seg_a[vInd_a] + seg_b[vInd_b];
                    ny = seg_a[vInd_a + 1] + seg_b[vInd_b + 1];
                    nz = seg_a[vInd_a + 2] + seg_b[vInd_b + 2];

                    q = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            }

            if (!b._inTheQueue && b._appliedNeighborsZoom[quadTree.OPSIDE[side]] !== s.tileZoom) {
                this.planet._normalMapCreator.queue(b);
            }
            b._appliedNeighborsZoom[quadTree.OPSIDE[side]] = s.tileZoom;

        } else {
            var s_edge, b_edge;

            if (i_a) {
                s_edge = 1;
                b_edge = 0;
            } else {
                s_edge = 0;
                b_edge = 1;
            }

            if (s.tileZoom < b.tileZoom) {
                if (!b._inTheQueue && b._appliedNeighborsZoom[quadTree.OPSIDE[side]] !== s.tileZoom) {
                    this.planet._normalMapCreator.queue(b);
                }
                b._appliedNeighborsZoom[quadTree.OPSIDE[side]] = s.tileZoom;
                side = quadTree.OPSIDE[side];
                var t = b;
                t = s;
                s = b;
                b = t;
                s_edge ^= 1;
                b_edge ^= 1;
            }

            var s_nm = s.normalMapNormals,
                b_nm = b.normalMapNormals;

            var dZ2 = 1.0 / (2 << (s.tileZoom - b.tileZoom - 1));

            if (vert) {
                var offsetY = s.tileY * dZ2 - b.tileY;

                for (var k = 0; k < s_gs; k++) {
                    var s_ind = (s_gs * k + s_gs1 * s_edge) * 3;
                    var kk = Math.round(k * dZ2);
                    var b_ind = (b_gs * (kk + offsetY * b_gs1) + b_gs1 * b_edge) * 3;

                    nx = seg_a[vInd_a] + seg_b[vInd_b];
                    ny = seg_a[vInd_a + 1] + seg_b[vInd_b + 1];
                    nz = seg_a[vInd_a + 2] + seg_b[vInd_b + 2];

                    q = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            } else {
                var offsetX = s.tileX * dZ2 - b.tileX;

                for (var k = 0; k < s_gs; k++) {
                    var s_ind = (s_gs * s_gs1 * s_edge + k) * 3;
                    var kk = Math.round(k * dZ2);
                    var b_ind = (b_gs * b_gs1 * b_edge + (kk + offsetX * b_gs1)) * 3;

                    nx = seg_a[vInd_a] + seg_b[vInd_b];
                    ny = seg_a[vInd_a + 1] + seg_b[vInd_b + 1];
                    nz = seg_a[vInd_a + 2] + seg_b[vInd_b + 2];

                    q = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            }
        }
    }
};

Segment.prototype.applyTerrain = function (elevations) {
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
Segment.prototype.deleteBuffers = function () {
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
Segment.prototype.deleteMaterials = function () {
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
Segment.prototype.deleteElevations = function () {
    this.terrainExists = false;
    this.terrainReady = false;
    this.terrainIsLoading = false;

    this.normalMapVertices = null;
    this.normalMapNormals = null;
    this.tempVertices = null;
    this.terrainVertices = null;
    this.plainVertices = null;
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
Segment.prototype.clearSegment = function () {
    this.ready = false;
    this.initialized = false;
    this.deleteBuffers();
    this.deleteMaterials();
    this.deleteElevations();
};

/**
 * Removes cache record.
 */
Segment.prototype._freeCache = function () {
    this.planet._quadTreeNodesCacheMerc[this.tileIndex] = null;
    delete this.planet._quadTreeNodesCacheMerc[this.tileIndex];
};

/**
 * Clear and destroy all segment data.
 */
Segment.prototype.destroySegment = function () {

    this._freeCache();

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
Segment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this._extent;

    var xmin = math.MAX, xmax = math.MIN, ymin = math.MAX, ymax = math.MIN, zmin = math.MAX, zmax = math.MIN;
    var v = [LonLat.inverseMercator(extent.southWest.lon, extent.southWest.lat),
    LonLat.inverseMercator(extent.southWest.lon, extent.northEast.lat),
    LonLat.inverseMercator(extent.northEast.lon, extent.northEast.lat),
    LonLat.inverseMercator(extent.northEast.lon, extent.southWest.lat)];

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

Segment.prototype.createCoordsBuffers = function (vertices, gridSize) {
    var gsgs = (gridSize + 1) * (gridSize + 1);
    var h = this.handler;
    h.gl.deleteBuffer(this.vertexPositionBuffer);
    h.gl.deleteBuffer(this.vertexTextureCoordBuffer);
    this.vertexTextureCoordBuffer = h.createArrayBuffer(textureCoordsTable[gridSize], 2, gsgs);
    this.vertexPositionBuffer = h.createArrayBuffer(vertices, 3, gsgs);
};

Segment.prototype._addViewExtent = function () {

    var ext = this._extent;
    if (!this.planet._viewExtentMerc) {
        this.planet._viewExtentMerc = new Extent(
            new LonLat(ext.southWest.lon, ext.southWest.lat),
            new LonLat(ext.northEast.lon, ext.northEast.lat));
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

Segment.prototype._assignTileIndexes = function () {
    var tileZoom = this.tileZoom;
    var extent = this._extent;
    var pole = mercator.POLE;
    this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
    this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
    this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, tileZoom);
    this.planet._quadTreeNodesCacheMerc[this.tileIndex] = this.node;
};

Segment.prototype.initializePlainSegment = function () {
    var p = this.planet;
    var n = this.node;
    n.sideSize[0] = n.sideSize[1] =
        n.sideSize[2] = n.sideSize[3] =
        this.gridSize = p.terrain.gridSizeByZoom[this.tileZoom];
    this.initialized = true;

    if (this.tileZoom <= p.terrain.maxZoom) {
        var nmc = this.planet._normalMapCreator;
        this.normalMapTexturePtr = p.renderer.handler.createEmptyTexture_l(nmc._width, nmc._height);
    }
};

Segment.prototype.createPlainSegment = function () {
    this.initializePlainSegment();
    this.createPlainVertices(this.gridSize);
    this.createCoordsBuffers(this.plainVertices, this.gridSize);
    this.ready = true;
};

Segment.prototype.createPlainVertices = function (gridSize) {

    var e = this._extent,
        fgs = this.planet.terrain.fileGridSize;
    var lonSize = e.getWidth();
    var llStep = lonSize / Math.max(fgs, gridSize);
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;
    var dg = Math.max(fgs / gridSize, 1),
        gs = Math.max(fgs, gridSize) + 1;
    var r2 = this.planet.ellipsoid._invRadii2;
    var ind = 0,
        nmInd = 0;

    var gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;
    this.plainNormals = new Float32Array(gridSize3);
    this.plainVertices = new Float32Array(gridSize3);

    var gs3 = gs * gs * 3;
    this.normalMapNormals = new Float32Array(gs3);
    this.normalMapVertices = new Float32Array(gs3);

    var verts = this.plainVertices,
        norms = this.plainNormals,
        nmVerts = this.normalMapVertices,
        nmNorms = this.normalMapNormals;

    for (var i = 0; i < gs; i++) {
        for (var j = 0; j < gs; j++) {
            var v = this.planet.ellipsoid.lonLatToCartesian(LonLat.inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep));
            var nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
            var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            var nxl = nx * l, nyl = ny * l, nzl = nz * l;

            nmVerts[nmInd] = v.x;
            nmNorms[nmInd++] = nxl;

            nmVerts[nmInd] = v.y;
            nmNorms[nmInd++] = nyl;

            nmVerts[nmInd] = v.z;
            nmNorms[nmInd++] = nzl;

            if (i % dg === 0 && j % dg === 0) {
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

    this._globalTextureCoordinates[0] = (e.southWest.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[1] = (mercator.POLE - e.northEast.lat) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[2] = (e.northEast.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[3] = (mercator.POLE - e.southWest.lat) * mercator.ONE_BY_POLE_DOUBLE;
};

/**
 * Gets specific layer material.
 * @public
 * @param {og.layer.Layer} layer - Layer object.
 * @returns {og.planetSegment.Material} - Segment material.
 */
Segment.prototype.getMaterialByLayer = function (layer) {
    return this.materials[layer._id];
};

Segment.prototype._getLayerExtentOffset = function (layer) {
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

Segment.prototype._multiRendering = function (sh, layerSlice, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE * 2 + 2);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this._getDefaultTexture());
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE * 2 + 2);

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

        //gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_2D, this.planet.transparentTexture);

        while (li) {
            if (this.layerOverlap(li) && li.minZoom <= p.minCurrZoom && li.maxZoom >= p.maxCurrZoom) {
                notEmpty = true;
                var m = pm[li._id];

                if (!m) {
                    m = pm[li._id] = li.createMaterial(this);
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
                gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE * 2 + 3);
                gl.bindTexture(gl.TEXTURE_2D, this.normalMapTexture || this.planet.transparentTexture);
                gl.uniform1i(shu.uNormalMap._pName, p.SLICE_SIZE * 2 + 3);

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

            var _indexBuffer = this._getIndexBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _indexBuffer);
            gl.drawElements(p.drawMode, _indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};

Segment.prototype._screenRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        var currHeight, li;
        if (layerSlice) {
            li = layerSlice[0];
            currHeight = li._height;
        } else {
            currHeight = 0;
        }

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 2);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this._getDefaultTexture());
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE + 2);

        var n = 0,
            i = 0;

        var notEmpty = false;

        var slice = this._renderingSlices[sliceIndex];

        if (!slice) {
            slice = this._renderingSlices[sliceIndex] = new _RenderingSlice(p);
        } else {
            slice.layers = [];
        }

        this._indexBuffer = this._getIndexBuffer();

        while (li) {
            if (this.layerOverlap(li) && li.minZoom <= p.minCurrZoom && li.maxZoom >= p.maxCurrZoom) {
                notEmpty = true;
                var m = pm[li._id];
                if (!m) {
                    m = pm[li._id] = li.createMaterial(this);
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
                gl.bindTexture(gl.TEXTURE_2D, m.texture || p.transparentTexture);

                n++;
            }
            i++;
            li = layerSlice[i];
        }

        if (notEmpty || !isOverlay) {
            gl.uniform1i(shu.samplerCount._pName, n);
            gl.uniform1f(shu.height._pName, currHeight);
            gl.uniform1iv(shu.samplerArr._pName, p._samplerArr);
            gl.uniform4fv(shu.tileOffsetArr._pName, slice.tileOffsetArr);
            gl.uniform4fv(shu.visibleExtentOffsetArr._pName, slice.visibleExtentOffsetArr);
            gl.uniform4fv(shu.transparentColorArr._pName, slice.transparentColorArr);

            //bind normalmap texture
            if (p.lightEnabled) {
                gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 3);
                gl.bindTexture(gl.TEXTURE_2D, this.normalMapTexture || p.transparentTexture);
                gl.uniform1i(shu.uNormalMap._pName, p.SLICE_SIZE + 3);

                gl.uniform3fv(shu.uNormalMapBias._pName, this.normalMapTextureBias);

                //bind segment specular and night material texture coordinates
                gl.uniform4fv(shu.uGlobalTextureCoord._pName, this._globalTextureCoordinates);

                gl.uniform3fv(shu.diffuseMaterial._pName, p._diffuseMaterialArr);
                gl.uniform3fv(shu.ambientMaterial._pName, p._ambientMaterialArr);
                gl.uniform4fv(shu.specularMaterial._pName, p._specularMaterialArr);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }

    this.node.hasNeighbor[0] = false;
    this.node.hasNeighbor[1] = false;
    this.node.hasNeighbor[2] = false;
    this.node.hasNeighbor[3] = false;
};

Segment.prototype._colorPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
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

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
};

Segment.prototype._heightPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
    if (this.ready) {
        var gl = this.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var pm = this.materials,
            p = this.planet;

        //First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, defaultTexture || p.solidTextureOne);
        gl.uniform1i(shu.defaultTexture._pName, p.SLICE_SIZE);

        var currHeight;
        if (layerSlice) {
            currHeight = layerSlice[0]._height;
        } else {
            currHeight = 0;
        }

        var n = 0;

        var slice = this._renderingSlices[sliceIndex];

        var notEmpty = false;

        for (n = 0; n < slice.layers.length; n++) {
            notEmpty = true;
            p._samplerArr[n] = n;
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, pm[slice.layers[n]._id].texture || p.transparentTexture);
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

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
};


Segment.prototype._getIndexBuffer = function () {
    var s = this.node.sideSize;
    var cache = this.planet._indexesCache[this.gridSize][s[0]][s[1]][s[2]][s[3]];
    if (!cache.buffer) {
        cache.buffer = this.planet.renderer.handler.createElementArrayBuffer(cache.indexes, 1);
    }
    return cache.buffer;
};

Segment.prototype._collectRenderNodes = function () {
    this.planet._visibleNodes[this.node.nodeId] = this.node;
};

Segment.prototype.layerOverlap = function (layer) {
    return this._extent.overlaps(layer._extentMerc);
};

Segment.prototype._getDefaultTexture = function () {
    return this.planet.solidTextureOne;
};

Segment.prototype.getExtentLonLat = function () {
    return this._extent.inverseMercator();
};

Segment.prototype.getExtentMerc = function () {
    return this._extent;
};

Segment.prototype.getExtent = function () {
    return this._extent;
};

Segment.prototype.getNodeState = function () {
    var vn = this.planet._visibleNodes[this.node.nodeId];
    return vn && vn.state || quadTree.NOTRENDERING;
};

Segment.prototype.getTileIndex = function () {
    return this.tileZoom + "_" + this.tileX + "_" + this.tileY;
};

export { Segment };