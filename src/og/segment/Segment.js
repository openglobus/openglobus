'use sctrict';

import * as math from '../math.js';
import * as mercator from '../mercator.js';
import { N, E, S, W, OPSIDE, NOTRENDERING } from '../quadTree/quadTree.js';
import { EPSG3857 } from '../proj/EPSG3857.js';
import { Extent } from '../Extent.js';
import { Layer } from '../layer/Layer.js';
import { LonLat } from '../LonLat.js';
import { textureCoordsTable } from './segmentHelper.js';
import { Ray } from '../math/Ray.js';
import { Sphere } from '../bv/Sphere.js';
import { Vec3 } from '../math/Vec3.js';

export const MAX_NORMAL_ZOOM = 7;

var _tempHigh = new Vec3();
var _tempLow = new Vec3();

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

    this._tileGroup = 0;

    this._projection = EPSG3857;

    /**
     * Quad tree node of the segment.
     * @type {og.quadTree.Node}
     */
    this.node = node;

    /**
     * Planet pointer.
     * @type {og.scene.Planet}
     */
    this.planet = planet;

    /**
     * WebGl handler pointer.
     * @type {og.webgl.Handler}
     */
    this.handler = planet.renderer.handler;

    /**
     * Segment bounding box.
     * @type {og.bv.Sphere}
     */
    this.bsphere = new Sphere();

    this._swNorm = null;
    this._nwNorm = null;
    this._seNorm = null;
    this._neNorm = null;

    /**
     * Geographical extent.
     * @type {og.Extent}
     */
    this._extent = extent;

    this._extentLonLat = null;

    /**
     * Vertices grid size.
     * @type {number}
     */
    this.gridSize = planet.terrain.gridSizeByZoom[tileZoom];

    this.fileGridSize = 0;

    /**
     * Tile zoom index.
     * @type {number}
     */
    this.tileZoom = tileZoom;

    /**
     * Horizontal tile index.
     * @type {number}
     */
    this.tileX = 0;

    this.tileXE = 0;

    this.tileXW = 0;

    this.tileYN = 0;

    this.tileYS = 0;

    /**
     * Vertical tile index.
     * @type {number}
     */
    this.tileY = 0;

    this.tileIndex = '';

    this._assignTileIndexes();

    /**
     * Texture materials array.
     * @type {Array.<og.planetSegment.Material>}
     */
    this.materials = [];

    /**
     * Plain segment vertices was created.
     * @type {boolean}
     */
    this.plainReady = false;

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

    // this.plainIndexes = null;
    this.plainVertices = null;
    this.plainVerticesHigh = null;
    this.plainVerticesLow = null;

    this.plainNormals = null;

    this.terrainVertices = null;
    this.terrainVerticesHigh = null;
    this.terrainVerticesLow = null;

    this.tempVertices = null;
    this.tempVerticesHigh = null;
    this.tempVerticesLow = null;

    this.normalMapTexture = null;
    this.normalMapTextureBias = new Float32Array(3);
    this.normalMapVertices = null;
    this.normalMapVerticesHigh = null;
    this.normalMapVerticesLow = null;
    this.normalMapNormals = null;
    this.normalMapNormalsRaw = null;

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexPositionBufferHigh = null;
    this.vertexPositionBufferLow = null;
    this.vertexTextureCoordBuffer = null;

    this._globalTextureCoordinates = new Float32Array(4);
    this._inTheQueue = false;
    this._appliedNeighborsZoom = [0, 0, 0, 0];

    this._renderingSlices = [];

    this._indexBuffer = null;

    this.readyToEngage = false;

    //this.readyToEqualize = false;

    this.plainProcessing = false;
};

/**
 * Returns that segment good for rendering with camera by current lod ratio.
 * @public
 * @param {og.Camera} camera - Camera object.
 * @returns {boolean} -
 */
Segment.prototype.acceptForRendering = function (camera) {
    return camera.projectedSize(this.bsphere.center, this.bsphere.radius) < 256 / this.planet._lodRatio;
};

/**
 * Returns entity terrain point.
 * @public
 * @param {og.Entity} entity - Entity.
 * @param {og.Vec3} res - Point coordinates.
 * @param {og.Vec3} [normal] - Terrain point normal.
 * @returns {og.Vec3} -
 */
Segment.prototype.getEntityTerrainPoint = function (entity, res, normal) {
    return this.getTerrainPoint(entity._cartesian, entity._lonlatMerc, res, normal);
};

Segment.prototype.isEntityInside = function (e) {
    return this._extent.isInside(e._lonlatMerc);
};

/**
 * Returns distance from object to terrain coordinates and terrain point that calculates out in the res parameter.
 * @public
 * @param {og.Vec3} xyz - Cartesian object position.
 * @param {og.LonLat} insideSegmentPosition - Geodetic object position.
 * @param {og.Vec3} [res] - Result cartesian coordiantes on the terrain.
 * @param {og.Vec3} [normal] - Terrain point normal.
 * @returns {number} -
 */
Segment.prototype.getTerrainPoint = function (xyz, insideSegmentPosition, res, normal) {
    var verts = this.tempVertices, // this.terrainReady ? this.terrainVertices : this.tempVertices,
        ray = new Ray(xyz, xyz.negateTo());

    if (verts) {

        var ne = this._extent.northEast,
            sw = this._extent.southWest,
            size = Math.sqrt(verts.length / 3) - 1;

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

        if (verts && verts.length) {
            var ind_v0 = ((size + 1) * indY + indX) * 3;
            var ind_v2 = ((size + 1) * (indY + 1) + indX) * 3;

            //
            // TODO: replace with temp variables            
            var v0 = new Vec3(verts[ind_v0], verts[ind_v0 + 1], verts[ind_v0 + 2]),
                v1 = new Vec3(verts[ind_v0 + 3], verts[ind_v0 + 4], verts[ind_v0 + 5]),
                v2 = new Vec3(verts[ind_v2], verts[ind_v2 + 1], verts[ind_v2 + 2]);

            let d = ray.hitTriangle(v0, v1, v2, res, normal);

            if (d === Ray.INSIDE) {
                return xyz.distance(res);
            } else if (d === Ray.AWAY) {
                let ray = new Ray(xyz, xyz);
                let d = ray.hitTriangle(v0, v1, v2, res, normal);
                if (d === Ray.INSIDE) {
                    return -xyz.distance(res);
                }
            }

            var v3 = new Vec3(verts[ind_v2 + 3], verts[ind_v2 + 4], verts[ind_v2 + 5]);

            d = ray.hitTriangle(v1, v3, v2, res, normal);
            if (d === Ray.INSIDE) {
                return xyz.distance(res);
            } else if (d === Ray.AWAY) {
                let ray = new Ray(xyz, xyz);
                let d = ray.hitTriangle(v1, v3, v2, res, normal);
                if (d === Ray.INSIDE) {
                    return -xyz.distance(res);
                }
            }

            if (d === Ray.AWAY) {
                return -xyz.distance(res);
            }

            return xyz.distance(res);
        }

        res.copy(this.planet.ellipsoid.hitRay(ray.origin, ray.direction));
        normal && normal.copy(xyz.normal());
        return xyz.distance(res);
    } else {
        normal && normal.copy(xyz.normal());
        return xyz.distance(this.planet.ellipsoid.hitRay(ray.origin, ray.direction));
    }
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

Segment.prototype.loadTerrain = function (forceLoading) {
    if (this.tileZoom < this.planet.terrain.minZoom) {

        this.terrainIsLoading = true;

        this.elevationsNotExists();

        if (!this._inTheQueue) {
            this.planet._normalMapCreator.queue(this);
        }

    } else {

        if (this.tileZoom > this.planet.terrain.maxZoom) {

            this.elevationsNotExists();

        } else if (!this.terrainIsLoading && !this.terrainReady) {

            this.planet.terrain.loadTerrain(this, forceLoading);
        }

    }
};

/**
 * Terrain obtained from server.
 * @param {Float32Array} elevations - Elevation data.
 */
Segment.prototype.elevationsExists = function (elevations) {
    if (this.plainReady && this.terrainIsLoading) {
        this.planet._terrainWorker.make(this, elevations);
    }
};

Segment.prototype.equalize = function () {
    this.readyToEngage = true;
    let nn = this.node.neighbors;
    let v = this.tempVertices, vHigh = this.tempVerticesHigh, vLow = this.tempVerticesLow;
    let gs = this.gridSize,
        gsOne = gs + 1;

    let n = nn[N][0];
    if (n &&
        // this.node.equalizedNeighborId[N] !== n.appliedTerrainNodeId && 
        this.tileZoom >= n.segment.tileZoom) {
        // this.node.equalizedNeighborId[N] = n.appliedTerrainNodeId;
        // n.equalizedNeighborId[OPSIDE[N]] = this.node.nodeId;
        this.readyToEngage = true;

        let offset = this.node.getOffsetOppositeNeighbourSide(n, N);

        let nv = n.segment.tempVertices,
            nvHigh = n.segment.tempVerticesHigh,
            nvLow = n.segment.tempVerticesLow;

        let n_gs = n.segment.gridSize,
            n_gsOne = n_gs + 1;

        let dz = 1 / (1 << (this.tileZoom - n.segment.tileZoom));

        let inc = Math.max(gs / (n_gs * dz), 1),
            n_inc = Math.max((n_gs * dz) / gs, 1),
            n_offset = offset * n_gs;

        for (let k = 0, nk = n_offset; k < gsOne; k += inc, nk += n_inc) {
            const index = k * 3;
            const n_index = (n_gsOne * n_gs + nk) * 3;

            v[index] = nv[n_index];
            v[index + 1] = nv[n_index + 1];
            v[index + 2] = nv[n_index + 2];

            vHigh[index] = nvHigh[n_index];
            vHigh[index + 1] = nvHigh[n_index + 1];
            vHigh[index + 2] = nvHigh[n_index + 2];

            vLow[index] = nvLow[n_index];
            vLow[index + 1] = nvLow[n_index + 1];
            vLow[index + 2] = nvLow[n_index + 2];
        }
    }

    n = nn[E][0];
    if (n &&
        // this.node.equalizedNeighborId[E] !== n.appliedTerrainNodeId && 
        this.tileZoom >= n.segment.tileZoom) {
        // this.node.equalizedNeighborId[E] = n.appliedTerrainNodeId;
        // n.equalizedNeighborId[OPSIDE[E]] = this.node.nodeId;
        this.readyToEngage = true;

        let offset = this.node.getOffsetOppositeNeighbourSide(n, E);

        let nv = n.segment.tempVertices,
            nvHigh = n.segment.tempVerticesHigh,
            nvLow = n.segment.tempVerticesLow;

        let n_gs = n.segment.gridSize,
            n_gsOne = n_gs + 1;

        let dz = 1 / (1 << (this.tileZoom - n.segment.tileZoom));

        let inc = Math.max(gs / (n_gs * dz), 1),
            n_inc = Math.max((n_gs * dz) / gs, 1),
            n_offset = offset * n_gs;

        for (let k = 0, nk = n_offset; k < gsOne; k += inc, nk += n_inc) {
            const index = (gsOne * k + gs) * 3;
            const n_index = (n_gsOne * nk) * 3;

            v[index] = nv[n_index];
            v[index + 1] = nv[n_index + 1];
            v[index + 2] = nv[n_index + 2];

            vHigh[index] = nvHigh[n_index];
            vHigh[index + 1] = nvHigh[n_index + 1];
            vHigh[index + 2] = nvHigh[n_index + 2];

            vLow[index] = nvLow[n_index];
            vLow[index + 1] = nvLow[n_index + 1];
            vLow[index + 2] = nvLow[n_index + 2];
        }
    }

    n = nn[S][0];
    if (n &&
        // this.node.equalizedNeighborId[S] !== n.appliedTerrainNodeId && 
        this.tileZoom >= n.segment.tileZoom) {
        // this.node.equalizedNeighborId[S] = n.appliedTerrainNodeId;
        // n.equalizedNeighborId[OPSIDE[S]] = this.node.nodeId;
        this.readyToEngage = true;

        let offset = this.node.getOffsetOppositeNeighbourSide(n, S);

        let nv = n.segment.tempVertices,
            nvHigh = n.segment.tempVerticesHigh,
            nvLow = n.segment.tempVerticesLow;

        let n_gs = n.segment.gridSize,
            n_gsOne = n_gs + 1;

        let dz = 1 / (1 << (this.tileZoom - n.segment.tileZoom));

        let inc = Math.max(gs / (n_gs * dz), 1),
            n_inc = Math.max((n_gs * dz) / gs, 1),
            n_offset = offset * n_gs;

        for (let k = 0, nk = n_offset; k < gsOne; k += inc, nk += n_inc) {
            const index = (gsOne * gs + k) * 3;
            const n_index = nk * 3;

            v[index] = nv[n_index];
            v[index + 1] = nv[n_index + 1];
            v[index + 2] = nv[n_index + 2];

            vHigh[index] = nvHigh[n_index];
            vHigh[index + 1] = nvHigh[n_index + 1];
            vHigh[index + 2] = nvHigh[n_index + 2];

            vLow[index] = nvLow[n_index];
            vLow[index + 1] = nvLow[n_index + 1];
            vLow[index + 2] = nvLow[n_index + 2];
        }
    }

    n = nn[W][0];
    if (n &&
        //this.node.equalizedNeighborId[W] !== n.appliedTerrainNodeId && 
        this.tileZoom >= n.segment.tileZoom) {
        // this.node.equalizedNeighborId[W] = n.appliedTerrainNodeId;
        // n.equalizedNeighborId[OPSIDE[W]] = this.node.nodeId;
        this.readyToEngage = true;

        let offset = this.node.getOffsetOppositeNeighbourSide(n, W);

        let nv = n.segment.tempVertices,
            nvHigh = n.segment.tempVerticesHigh,
            nvLow = n.segment.tempVerticesLow;

        let n_gs = n.segment.gridSize,
            n_gsOne = n_gs + 1;

        let dz = 1 / (1 << (this.tileZoom - n.segment.tileZoom));

        let inc = Math.max(gs / (n_gs * dz), 1),
            n_inc = Math.max((n_gs * dz) / gs, 1),
            n_offset = offset * n_gs;

        for (let k = 0, nk = n_offset; k < gsOne; k += inc, nk += n_inc) {
            const index = (gsOne * k) * 3;
            const n_index = (n_gsOne * nk + n_gs) * 3;

            v[index] = nv[n_index];
            v[index + 1] = nv[n_index + 1];
            v[index + 2] = nv[n_index + 2];

            vHigh[index] = nvHigh[n_index];
            vHigh[index + 1] = nvHigh[n_index + 1];
            vHigh[index + 2] = nvHigh[n_index + 2];

            vLow[index] = nvLow[n_index];
            vLow[index + 1] = nvLow[n_index + 1];
            vLow[index + 2] = nvLow[n_index + 2];
        }
    }
};

Segment.prototype.engage = function () {
    this.readyToEngage = false;
    this.createCoordsBuffers(this.tempVerticesHigh, this.tempVerticesLow, this.gridSize);
};

Segment.prototype._plainSegmentWorkerCallback = function (data) {

    this.plainProcessing = false;

    if (this.initialized && !this.terrainReady) {

        this.plainVertices = data.plainVertices;
        this.plainVerticesHigh = data.plainVerticesHigh;
        this.plainVerticesLow = data.plainVerticesLow;

        this.plainNormals = data.plainNormals;

        this.normalMapNormals = data.normalMapNormals;
        this.normalMapNormalsRaw = data.normalMapNormalsRaw;
        this.normalMapVertices = data.normalMapVertices;
        this.normalMapVerticesHigh = data.normalMapVerticesHigh;
        this.normalMapVerticesLow = data.normalMapVerticesLow;

        this.terrainVertices = this.plainVertices;
        this.terrainVerticesHigh = this.plainVerticesHigh;
        this.terrainVerticesLow = this.plainVerticesLow;

        this.fileGridSize = Math.sqrt(data.normalMapVertices.length / 3) - 1;

        this.plainReady = true;
    }
};

Segment.prototype._terrainWorkerCallback = function (data) {
    if (this.plainReady) {

        this.readyToEngage = true;

        this.normalMapNormals = null;
        this.normalMapNormalsRaw = null;

        this.normalMapVertices = null;
        this.normalMapVerticesHigh = null;
        this.normalMapVerticesLow = null;

        this.terrainVertices = null;
        this.terrainVerticesHigh = null;
        this.terrainVerticesLow = null;

        this.tempVertices = null;
        this.tempVerticesHigh = null;
        this.tempVerticesLow = null;

        this.normalMapNormals = data.normalMapNormals;
        this.normalMapNormalsRaw = data.normalMapNormalsRaw;
        this.normalMapVertices = data.normalMapVertices;
        this.normalMapVerticesHigh = data.normalMapVerticesHigh;
        this.normalMapVerticesLow = data.normalMapVerticesLow;

        this.terrainVertices = data.terrainVertices;
        this.terrainVerticesHigh = data.terrainVerticesHigh;
        this.terrainVerticesLow = data.terrainVerticesLow;

        this.tempVertices = this.terrainVertices;
        this.tempVerticesHigh = this.terrainVerticesHigh;
        this.tempVerticesLow = this.terrainVerticesLow;

        var b = data.bounds;
        this.setBoundingSphere(
            b[0] + (b[1] - b[0]) * 0.5,
            b[2] + (b[3] - b[2]) * 0.5,
            b[4] + (b[5] - b[4]) * 0.5,
            new Vec3(b[0], b[2], b[4])
        );

        this.gridSize = Math.sqrt(this.terrainVertices.length / 3) - 1;
        this.node.appliedTerrainNodeId = this.node.nodeId;

        this.terrainReady = true;
        this.terrainIsLoading = false;
        this.parentNormalMapReady = true;
        this.terrainExists = true;

        if (!this.normalMapTexturePtr) {
            var nmc = this.planet._normalMapCreator;
            this.normalMapTexturePtr = this.planet.renderer.handler.createEmptyTexture_l(nmc._width, nmc._height);
        }

        if (this.planet.lightEnabled) {
            this.planet._normalMapCreator.queue(this);
        }
    }
};

/**
 * Terrain is not obtained or not exists on the server.
 */
Segment.prototype.elevationsNotExists = function () {
    if (this.planet && this.tileZoom <= this.planet.terrain.maxZoom) {

        if (this.plainReady && this.terrainIsLoading) {
            this.terrainIsLoading = false;

            this.node.appliedTerrainNodeId = this.node.nodeId;

            if (this.planet.lightEnabled && !this._inTheQueue) {
                this.planet._normalMapCreator.queue(this);
            }

            this.readyToEngage = true;
        }

        this.terrainVertices = this.plainVertices;
        this.terrainVerticesHigh = this.plainVerticesHigh;
        this.terrainVerticesLow = this.plainVerticesLow;

        this.tempVertices = this.terrainVertices;
        this.tempVerticesHigh = this.terrainVerticesHigh;
        this.tempVerticesLow = this.terrainVerticesLow;

        this.fileGridSize = Math.sqrt(this.terrainVertices.length / 3) - 1;
        this.gridSize = this.fileGridSize;
        this.terrainReady = true;
        this.terrainExists = false;
    }
};

const _S = new Array(4);
_S[N] = 0;
_S[E] = 1;
_S[S] = 1;
_S[W] = 0;

const _V = new Array(4);
_V[N] = false;
_V[E] = true;
_V[S] = false;
_V[W] = true;

Segment.prototype._normalMapEdgeEqualize = function (side) {

    let nn = this.node.neighbors;
    let n = nn[side][0];
    let maxZ = this.planet.terrain.maxZoom;

    if (this.tileZoom === maxZ) {
        if (!(nn[0].length || nn[1].length || nn[2].length || nn[3].length)) {
            n = this.node.getEqualNeighbor(side);
        }
    }

    let b = n && n.segment,
        s = this;

    if (n && b && b.terrainReady && b.terrainExists &&
        b.tileZoom <= maxZ &&
        s._appliedNeighborsZoom[side] !== b.tileZoom) {

        s._appliedNeighborsZoom[side] = b.tileZoom;

        let seg_a = s.normalMapNormals,
            seg_b = b.normalMapNormals;

        if (!(seg_a && seg_b)) return;

        let seg_a_raw = s.normalMapNormalsRaw,
            seg_b_raw = b.normalMapNormalsRaw;

        // let seg_a_verts = s.terrainVertices,
        //     seg_b_verts = s.terrainVertices;

        let s_gs = Math.sqrt(seg_a.length / 3),
            // b_gs = Math.sqrt(seg_b.length / 3),
            s_gs1 = s_gs - 1;
        // b_gs1 = b_gs - 1;

        const i_a = s_gs1 * _S[side];

        let nx, ny, nz, q;

        if (s.tileZoom === b.tileZoom) {

            const i_b = s_gs1 - i_a;

            if (_V[side]) {
                for (let k = 0; k < s_gs; k++) {
                    let vInd_a = (k * s_gs + i_a) * 3,
                        vInd_b = (k * s_gs + i_b) * 3;

                    nx = seg_a_raw[vInd_a] + seg_b_raw[vInd_b];
                    ny = seg_a_raw[vInd_a + 1] + seg_b_raw[vInd_b + 1];
                    nz = seg_a_raw[vInd_a + 2] + seg_b_raw[vInd_b + 2];

                    q = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            } else {
                for (let k = 0; k < s_gs; k++) {
                    let vInd_a = (i_a * s_gs + k) * 3,
                        vInd_b = (i_b * s_gs + k) * 3;

                    nx = seg_a_raw[vInd_a] + seg_b_raw[vInd_b];
                    ny = seg_a_raw[vInd_a + 1] + seg_b_raw[vInd_b + 1];
                    nz = seg_a_raw[vInd_a + 2] + seg_b_raw[vInd_b + 2];

                    q = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx * q;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny * q;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz * q;
                }
            }

            if (!b._inTheQueue && b._appliedNeighborsZoom[OPSIDE[side]] !== s.tileZoom) {
                b._appliedNeighborsZoom[OPSIDE[side]] = s.tileZoom;
                s.planet._normalMapCreator.queue(b);
            }

        } else {

        }
    }
};

Segment.prototype.applyTerrain = function (elevations) {
    if (elevations) {
        this.elevationsExists(elevations);
    } else {
        this.elevationsNotExists();
    }
};

/**
 * Delete segment gl buffers.
 */
Segment.prototype.deleteBuffers = function () {
    var gl = this.handler.gl;
    gl.deleteBuffer(this.vertexNormalBuffer);
    gl.deleteBuffer(this.vertexPositionBuffer);
    gl.deleteBuffer(this.vertexPositionBufferHigh);
    gl.deleteBuffer(this.vertexPositionBufferLow);
    gl.deleteBuffer(this.vertexTextureCoordBuffer);

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexPositionBufferHigh = null;
    this.vertexPositionBufferLow = null;
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
    this.normalMapVerticesHigh = null;
    this.normalMapVerticesLow = null;

    this.normalMapNormals = null;
    this.normalMapNormalsRaw = null;

    this.tempVertices = null;
    this.tempVerticesHigh = null;
    this.tempVerticesLow = null;

    this.terrainVertices = null;
    this.terrainVerticesHigh = null;
    this.terrainVerticesLow = null;

    this.plainVertices = null;
    this.plainVerticesHigh = null;
    this.plainVerticesLow = null;

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
    this.plainReady = false;
    this.initialized = false;
    this.deleteBuffers();
    this.deleteMaterials();
    this.deleteElevations();
};

/**
 * Removes cache records.
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

    // this.plainIndexes = null;
    this.plainVertices = null;
    this.plainVerticesHigh = null;
    this.plainVerticesLow = null;
    this.plainNormals = null;

    this.terrainVertices = null;
    this.terrainVerticesHigh = null;
    this.terrainVerticesLow = null;

    this.tempVertices = null;
    this.tempVerticesHigh = null;
    this.tempVerticesLow = null;

    this.normalMapTexture = null;
    this.normalMapTextureBias = null;
    this.normalMapVertices = null;
    this.normalMapVerticesHigh = null;
    this.normalMapVerticesLow = null;
    this.normalMapNormals = null;
    this.normalMapNormalsRaw = null;

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexPositionBufferHigh = null;
    this.vertexPositionBufferLow = null;
    this.vertexTextureCoordBuffer = null;

    this._tileOffsetArr = null;
    this._visibleExtentOffsetArr = null;

    this._projection = null;
    this._appliedNeighborsZoom = null;

    this._globalTextureCoordinates = null;
};

Segment.prototype._setExtentLonLat = function () {
    this._extentLonLat = this._extent.inverseMercator();
};

/**
 * Creates bound volumes by segment geographical extent.
 */
Segment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this._extentLonLat;

    var coord_sw = ellipsoid.geodeticToCartesian(extent.southWest.lon, extent.southWest.lat);
    var coord_ne = ellipsoid.geodeticToCartesian(extent.northEast.lon, extent.northEast.lat);

    // check for zoom
    if (this.tileZoom < MAX_NORMAL_ZOOM) {

        var coord_nw = ellipsoid.geodeticToCartesian(extent.southWest.lon, extent.northEast.lat);
        var coord_se = ellipsoid.geodeticToCartesian(extent.northEast.lon, extent.southWest.lat);

        this._swNorm = coord_sw.normal();
        this._nwNorm = coord_nw.normal();
        this._neNorm = coord_ne.normal();
        this._seNorm = coord_se.normal();
    }

    this.setBoundingSphere(
        coord_sw.x + (coord_ne.x - coord_sw.x) * 0.5,
        coord_sw.y + (coord_ne.y - coord_sw.y) * 0.5,
        coord_sw.z + (coord_ne.z - coord_sw.z) * 0.5,
        coord_ne
    );
};

Segment.prototype.setBoundingSphere = function (x, y, z, v) {
    this.bsphere.center.x = x;
    this.bsphere.center.y = y;
    this.bsphere.center.z = z;
    this.bsphere.radius = this.bsphere.center.distance(v);
};

/**
 * @todo: remake it
 */
Segment.prototype.createTerrainFromChildNodes = function () {

    const node = this.node;
    const nodes = node.nodes;
    const terrain = this.planet.terrain;

    if (node.ready &&
        this.tileZoom >= terrain.minZoom &&
        this.tileZoom < terrain.maxZoom &&
        nodes[0].segment.terrainReady && nodes[1].segment.terrainReady &&
        nodes[2].segment.terrainReady && nodes[3].segment.terrainReady
    ) {
        let xmin = math.MAX, xmax = math.MIN, ymin = math.MAX,
            ymax = math.MIN, zmin = math.MAX, zmax = math.MIN;

        this.gridSize = terrain.gridSizeByZoom[this.tileZoom];

        let fgs = terrain.fileGridSize;

        let dg = Math.max(fgs / this.gridSize, 1),
            gs = Math.max(fgs, this.gridSize) + 1;
        let ind = 0,
            nmInd = 0;

        let gs3 = gs * gs * 3,
            sgs3 = (this.gridSize + 1) * (this.gridSize + 1) * 3;

        let hgsOne = 0.5 * gs + 0.5;

        this.terrainVertices = new Float64Array(sgs3);
        this.terrainVerticesHigh = new Float32Array(sgs3);
        this.terrainVerticesLow = new Float32Array(sgs3);

        this.normalMapVertices = new Float64Array(gs3);
        this.normalMapVerticesHigh = new Float32Array(gs3);
        this.normalMapVerticesLow = new Float32Array(gs3);

        this.normalMapNormals = new Float32Array(gs3);
        this.normalMapNormalsRaw = new Float32Array(gs3);

        let verts = this.terrainVertices,
            vertsHigh = this.terrainVerticesHigh,
            vertsLow = this.terrainVerticesLow,

            nmVerts = this.normalMapVertices,
            nmVertsHigh = this.normalMapVerticesHigh,
            nmVertsLow = this.normalMapVerticesLow,

            nmNorms = this.normalMapNormals;

        for (let i = 0; i < gs; i++) {

            let ni = Math.floor(i / hgsOne),
                ii = i % hgsOne + ni;

            for (let j = 0; j < gs; j++) {

                let nj = Math.floor(j / hgsOne);
                let n = nodes[(ni << 1) + nj];

                let nii = ii << 1,
                    njj = (j % hgsOne + nj) << 1;

                let n_index = 3 * (nii * gs + njj);

                let n_nmVerts = n.segment.normalMapVertices,
                    n_nmVertsHigh = n.segment.normalMapVerticesHigh,
                    n_nmVertsLow = n.segment.normalMapVerticesLow,
                    n_nmNormsRaw = n.segment.normalMapNormalsRaw;

                let x = n_nmVerts[n_index],
                    y = n_nmVerts[n_index + 1],
                    z = n_nmVerts[n_index + 2],

                    xHigh = n_nmVertsHigh[n_index],
                    yHigh = n_nmVertsHigh[n_index + 1],
                    zHigh = n_nmVertsHigh[n_index + 2],

                    xLow = n_nmVertsLow[n_index],
                    yLow = n_nmVertsLow[n_index + 1],
                    zLow = n_nmVertsLow[n_index + 2];

                nmVerts[nmInd] = x;
                nmVertsHigh[nmInd] = xHigh;
                nmVertsLow[nmInd] = xLow;
                nmNorms[nmInd++] = n_nmNormsRaw[n_index];

                nmVerts[nmInd] = y;
                nmVertsHigh[nmInd] = yHigh;
                nmVertsLow[nmInd] = yLow;
                nmNorms[nmInd++] = n_nmNormsRaw[n_index + 1];

                nmVerts[nmInd] = z;
                nmVertsHigh[nmInd] = zHigh;
                nmVertsLow[nmInd] = zLow;
                nmNorms[nmInd++] = n_nmNormsRaw[n_index + 2];

                if (i % dg === 0 && j % dg === 0) {

                    vertsHigh[ind] = xHigh;
                    vertsLow[ind] = xLow;
                    verts[ind++] = x;

                    vertsHigh[ind] = yHigh;
                    vertsLow[ind] = yLow;
                    verts[ind++] = y;

                    vertsHigh[ind] = zHigh;
                    vertsLow[ind] = zLow;
                    verts[ind++] = z;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;
                }
            }
        }

        this.normalMapNormalsRaw.set(nmNorms);

        this.readyToEngage = true;

        this.setBoundingSphere(
            xmin + (xmax - xmin) * 0.5,
            ymin + (ymax - ymin) * 0.5,
            zmin + (zmax - zmin) * 0.5,
            new Vec3(xmin, ymin, zmin)
        );

        this.appliedTerrainNodeId = this.nodeId;
        this.terrainReady = true;
        this.terrainExists = true;
        this.terrainIsLoading = false;

        if (this.planet.lightEnabled) {
            this.planet._normalMapCreator.drawSingle(this);
        }

        let e = this._extent;
        this._globalTextureCoordinates[0] = (e.southWest.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[1] = (mercator.POLE - e.northEast.lat) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[2] = (e.northEast.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[3] = (mercator.POLE - e.southWest.lat) * mercator.ONE_BY_POLE_DOUBLE;

        return false;
    }

    return true;
};

Segment.prototype.createCoordsBuffers = function (verticesHigh, verticesLow, gridSize) {

    var gsgs = (gridSize + 1) * (gridSize + 1);
    var h = this.handler;

    h.gl.deleteBuffer(this.vertexPositionBufferHigh);
    h.gl.deleteBuffer(this.vertexPositionBufferLow);
    h.gl.deleteBuffer(this.vertexTextureCoordBuffer);

    this.vertexTextureCoordBuffer = h.createArrayBuffer(textureCoordsTable[gridSize], 2, gsgs);
    this.vertexPositionBufferHigh = h.createArrayBuffer(verticesHigh, 3, gsgs);
    this.vertexPositionBufferLow = h.createArrayBuffer(verticesLow, 3, gsgs);
};

Segment.prototype._addViewExtent = function () {

    var ext = this._extentLonLat;

    if (!this.planet._viewExtent) {
        this.planet._viewExtent = new Extent(
            new LonLat(ext.southWest.lon, ext.southWest.lat),
            new LonLat(ext.northEast.lon, ext.northEast.lat));
        return;
    }

    var viewExt = this.planet._viewExtent;

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
    this._tileGroup = 0;
    var tileZoom = this.tileZoom;
    var extent = this._extent;
    var pole = mercator.POLE;
    this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
    this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
    var p2 = Math.pow(2, tileZoom);
    this.tileXE = (this.tileX + 1) % p2;
    this.tileXW = (p2 + this.tileX - 1) % p2;

    // this.tileYN = (p2 + this.tileY - 1) % p2;
    // this.tileYS = (this.tileY + 1) % p2;
    this.tileYN = this.tileY - 1;
    this.tileYS = this.tileY + 1;

    this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, tileZoom);
    this.planet._quadTreeNodesCacheMerc[this.tileIndex] = this.node;
};

Segment.prototype.initialize = function () {

    var p = this.planet;
    var n = this.node;

    n.sideSize[0] = n.sideSize[1] = n.sideSize[2] = n.sideSize[3] =
        this.gridSize = p.terrain.gridSizeByZoom[this.tileZoom];

    if (this.tileZoom <= p.terrain.maxZoom) {
        var nmc = this.planet._normalMapCreator;
        this.normalMapTexturePtr = p.renderer.handler.createEmptyTexture_l(nmc._width, nmc._height);
    }

    this.normalMapTexture = this.planet.transparentTexture;

    this._assignGlobalTextureCoordinates();

    this.initialized = true;
};

Segment.prototype._assignGlobalTextureCoordinates = function () {
    var e = this._extent;
    this._globalTextureCoordinates[0] = (e.southWest.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[1] = (mercator.POLE - e.northEast.lat) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[2] = (e.northEast.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
    this._globalTextureCoordinates[3] = (mercator.POLE - e.southWest.lat) * mercator.ONE_BY_POLE_DOUBLE;
};

Segment.prototype.createPlainSegmentAsync = function () {

    let p = this.planet,
        t = p.terrain;

    if (t.isReady() && this.tileZoom <= t.maxZoom && !this.plainReady) {
        this.plainProcessing = true;
        p._plainSegmentWorker.make(this);
    }
};

Segment.prototype.createPlainSegment = function () {
    this.initialize();
    this._createPlainVertices();
    this.readyToEngage = true;
};

Segment.prototype._createPlainVertices = function () {
    var gridSize = this.planet.terrain.gridSizeByZoom[this.tileZoom];

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
    const gsgs = gs * gs;

    var gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

    this.plainNormals = new Float32Array(gridSize3);
    this.plainVertices = new Float64Array(gridSize3);
    this.plainVerticesHigh = new Float32Array(gridSize3);
    this.plainVerticesLow = new Float32Array(gridSize3);

    this.normalMapNormals = new Float32Array(gsgs * 3);
    this.normalMapVertices = new Float64Array(gsgs * 3);
    this.normalMapVerticesHigh = new Float32Array(gsgs * 3);
    this.normalMapVerticesLow = new Float32Array(gsgs * 3);

    var verts = this.plainVertices,
        vertsHigh = this.plainVerticesHigh,
        vertsLow = this.plainVerticesLow,
        norms = this.plainNormals,
        nmVerts = this.normalMapVertices,
        nmVertsHigh = this.normalMapVerticesHigh,
        nmVertsLow = this.normalMapVerticesLow,
        nmNorms = this.normalMapNormals;

    for (var k = 0; k < gsgs; k++) {

        var j = k % gs,
            i = ~~(k / gs);

        var v = this.planet.ellipsoid.lonLatToCartesian(LonLat.inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep));
        var nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
        var l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        var nxl = nx * l, nyl = ny * l, nzl = nz * l;

        Vec3.doubleToTwoFloats(v, _tempHigh, _tempLow);

        nmVerts[nmInd] = v.x;
        nmVertsHigh[nmInd] = _tempHigh.x;
        nmVertsLow[nmInd] = _tempLow.x;
        nmNorms[nmInd++] = nxl;

        nmVerts[nmInd] = v.y;
        nmVertsHigh[nmInd] = _tempHigh.y;
        nmVertsLow[nmInd] = _tempLow.y;
        nmNorms[nmInd++] = nyl;

        nmVerts[nmInd] = v.z;
        nmVertsHigh[nmInd] = _tempHigh.z;
        nmVertsLow[nmInd] = _tempLow.z;
        nmNorms[nmInd++] = nzl;

        if (i % dg === 0 && j % dg === 0) {

            verts[ind] = v.x;
            vertsHigh[ind] = _tempHigh.x;
            vertsLow[ind] = _tempLow.x;
            norms[ind++] = nxl;

            verts[ind] = v.y;
            vertsHigh[ind] = _tempHigh.y;
            vertsLow[ind] = _tempLow.y;
            norms[ind++] = nyl;

            verts[ind] = v.z;
            vertsHigh[ind] = _tempHigh.z;
            vertsLow[ind] = _tempLow.z;
            norms[ind++] = nzl;
        }
    }

    this.terrainVertices = verts;
    this.terrainVerticesHigh = vertsHigh;
    this.terrainVerticesLow = vertsLow;

    // store raw normals
    this.normalMapNormalsRaw = new Float32Array(nmNorms.length);
    this.normalMapNormalsRaw.set(nmNorms);

    this.plainReady = true;
};

/**
 * Gets specific layer material.
 * @public
 * @param {og.Layer} layer - Layer object.
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

Segment.prototype.screenRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {
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

    // First always draw whole planet base layer segment with solid texture.
    gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 2);
    gl.bindTexture(gl.TEXTURE_2D, defaultTexture || this.getDefaultTexture());
    gl.uniform1i(shu.defaultTexture, p.SLICE_SIZE + 2);

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
        if (this.layerOverlap(li) && ((li._fading && (li._fadingOpacity > 0.0)) ||
            ((li.minZoom >= p.minCurrZoom || li.maxZoom >= p.minCurrZoom) && (li.minZoom <= p.maxCurrZoom || li.maxZoom <= p.maxCurrZoom)))
        ) {

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

        gl.uniform1i(shu.samplerCount, n);
        gl.uniform1f(shu.height, currHeight);
        gl.uniform1iv(shu.samplerArr, p._samplerArr);
        gl.uniform4fv(shu.tileOffsetArr, slice.tileOffsetArr);
        gl.uniform4fv(shu.visibleExtentOffsetArr, slice.visibleExtentOffsetArr);
        gl.uniform4fv(shu.transparentColorArr, slice.transparentColorArr);

        // bind normalmap texture
        if (p.lightEnabled) {
            gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 3);
            gl.bindTexture(gl.TEXTURE_2D, this.normalMapTexture || p.transparentTexture);
            gl.uniform1i(shu.uNormalMap, p.SLICE_SIZE + 3);

            gl.uniform3fv(shu.uNormalMapBias, this.normalMapTextureBias);

            // bind segment specular and night material texture coordinates
            gl.uniform4fv(shu.uGlobalTextureCoord, this._globalTextureCoordinates);

            gl.uniform3fv(shu.diffuseMaterial, p._diffuseMaterialArr);
            gl.uniform3fv(shu.ambientMaterial, p._ambientMaterialArr);
            gl.uniform4fv(shu.specularMaterial, p._specularMaterialArr);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh);
        gl.vertexAttribPointer(sha.aVertexPositionHigh, this.vertexPositionBufferHigh.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow);
        gl.vertexAttribPointer(sha.aVertexPositionLow, this.vertexPositionBufferLow.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(sha.aTextureCoord, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

};

Segment.prototype.colorPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {

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
        var n4 = n * 4;

        p._pickingColorArr[n4] = li._pickingColor.x / 255.0;
        p._pickingColorArr[n4 + 1] = li._pickingColor.y / 255.0;
        p._pickingColorArr[n4 + 2] = li._pickingColor.z / 255.0;
        p._pickingColorArr[n4 + 3] = li._pickingEnabled;

        p._samplerArr[n] = n;
        gl.activeTexture(gl.TEXTURE0 + n);
        gl.bindTexture(gl.TEXTURE_2D, pm[li._id].texture || this.planet.transparentTexture);

        p._pickingMaskArr[n] = n + p.SLICE_SIZE;
        gl.activeTexture(gl.TEXTURE0 + n + p.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, pm[li._id].pickingMask || this.planet.transparentTexture);
    }

    if (notEmpty || !isOverlay) {

        gl.uniform1i(shu.samplerCount, n);
        gl.uniform1f(shu.height, currHeight);
        gl.uniform1iv(shu.samplerArr, p._samplerArr);
        gl.uniform1iv(shu.pickingMaskArr, p._pickingMaskArr);
        gl.uniform4fv(shu.tileOffsetArr, slice.tileOffsetArr);
        gl.uniform4fv(shu.visibleExtentOffsetArr, slice.visibleExtentOffsetArr);
        gl.uniform4fv(shu.transparentColorArr, slice.transparentColorArr);
        gl.uniform4fv(shu.pickingColorArr, p._pickingColorArr);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh);
        gl.vertexAttribPointer(sha.aVertexPositionHigh, this.vertexPositionBufferHigh.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow);
        gl.vertexAttribPointer(sha.aVertexPositionLow, this.vertexPositionBufferLow.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(sha.aTextureCoord, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
};

Segment.prototype.heightPickingRendering = function (sh, layerSlice, sliceIndex, defaultTexture, isOverlay) {

    var gl = this.handler.gl;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var pm = this.materials,
        p = this.planet;

    // First always draw whole planet base layer segment with solid texture.
    gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE);
    gl.bindTexture(gl.TEXTURE_2D, defaultTexture || p.solidTextureOne);
    gl.uniform1i(shu.defaultTexture, p.SLICE_SIZE);

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

        gl.uniform1i(shu.samplerCount, n);
        gl.uniform1f(shu.height, currHeight);
        gl.uniform1iv(shu.samplerArr, p._samplerArr);
        gl.uniform4fv(shu.tileOffsetArr, slice.tileOffsetArr);
        gl.uniform4fv(shu.visibleExtentOffsetArr, slice.visibleExtentOffsetArr);
        gl.uniform4fv(shu.transparentColorArr, slice.transparentColorArr);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh);
        gl.vertexAttribPointer(sha.aVertexPositionHigh, this.vertexPositionBufferHigh.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow);
        gl.vertexAttribPointer(sha.aVertexPositionLow, this.vertexPositionBufferLow.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(sha.aTextureCoord, 2, gl.UNSIGNED_SHORT, true, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.drawElements(p.drawMode, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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

Segment.prototype._collectVisibleNodes = function () {
    this.planet._visibleNodes[this.node.nodeId] = this.node;
};

Segment.prototype.layerOverlap = function (layer) {
    return this._extent.overlaps(layer._extentMerc);
};

Segment.prototype.getDefaultTexture = function () {
    return this.planet.solidTextureOne;
};

Segment.prototype.getExtentLonLat = function () {
    return this._extentLonLat;
};

Segment.prototype.getExtentMerc = function () {
    return this._extent;
};

Segment.prototype.getExtent = function () {
    return this._extent;
};

Segment.prototype.getNodeState = function () {
    var vn = this.planet._visibleNodes[this.node.nodeId];
    return (vn && vn.state) || NOTRENDERING;
};

Segment.prototype.getNeighborSide = function (b) {
    if (this._tileGroup === b._tileGroup) {
        if (this.tileY === b.tileY) {
            if (this.tileX === b.tileXE) {
                return W;
            } else if (this.tileX === b.tileXW) {
                return E;
            }
        } else if (this.tileX === b.tileX) {
            if (this.tileY === b.tileYS) {
                return N;
            } else if (this.tileY === b.tileYN) {
                return S;
            }
        }
    }

    return -1;
};

export { Segment };
