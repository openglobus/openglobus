import * as mercator from "../mercator";
import * as segmentHelper from "../segment/segmentHelper";
import { Box } from "../bv/Box";
import { Extent } from "../Extent";
import { Entity } from "../entity/Entity";
import { EPSG3857 } from "../proj/EPSG3857";
import { CORNERSIDE, E, N, NOPSORD, NW, OPSIDE, S, SE, SIDEFLIP, W } from "../quadTree/quadTree";
import { getMatrixSubArray64 } from "../utils/shared";
import type { TypedArray } from "../utils/shared";
import { Handler } from "../webgl/Handler";
import type { WebGLBufferExt, WebGLTextureExt } from "../webgl/Handler";
import type { ITerrainWorkerData } from "../utils/TerrainWorker";
import { Layer } from "../layer/Layer";
import { LonLat } from "../LonLat";
import { Material } from "../layer/Material";
import { Node } from "../quadTree/Node";
import { Planet } from "../scene/Planet";
import { PlanetCamera } from "../camera/PlanetCamera";
import type { Camera } from "../camera/Camera";
import { ShaderProgram } from "../webgl/ShaderProgram";
import { Proj } from "../proj/Proj";
import { Sphere } from "../bv/Sphere";
import type { NumberArray6 } from "../bv/Sphere";
import { Slice } from "./Slice";
import { Ray } from "../math/Ray";
import { Vec3 } from "../math/Vec3";
import type { IPlainSegmentWorkerData } from "../utils/PlainSegmentWorker";
import { MAX_LAT } from "../mercator";
import { QuadTreeStrategy } from "../quadTree";

export function getTileCellIndex(coordinate: number, tileSize: number, worldEdge: number): number {
    return Math.floor(Math.abs(worldEdge - coordinate) / tileSize);
}

export function getTileCellExtent(x: number, y: number, z: number, worldExtent: Extent): Extent {
    let pz = 1.0 / (1 << z);

    let worldWidth = worldExtent.getWidth(),
        worldHeight = worldExtent.getHeight();

    let w = worldWidth * pz,
        h = worldHeight * pz;

    let sw_lon = worldExtent.southWest.lon + x * w,
        ne_lat = worldExtent.northEast.lat - y * h;

    return new Extent(new LonLat(sw_lon, ne_lat - h), new LonLat(sw_lon + w, ne_lat));
}

export const TILEGROUP_COMMON = 0;
export const TILEGROUP_NORTH = 20;
export const TILEGROUP_SOUTH = 300;

const SKIRT_SIZE = 50000.0;

export function getTileGroupByLat(lat: number, maxLat: number = MAX_LAT): number {
    if (lat > maxLat) {
        return TILEGROUP_NORTH;
    } else if (lat < -maxLat) {
        return TILEGROUP_SOUTH;
    }
    return TILEGROUP_COMMON;
}

let _tempHigh = new Vec3();
const _lonLat = new LonLat();
let _tempLow = new Vec3();

let _v0 = new Vec3(),
    _v1 = new Vec3(),
    _v2 = new Vec3();

/**
 * How far the grid position (x, y) is inside the triangle of grid vertices a, b and c, in barycentric
 * coordinates: the smallest of the three, negative outside of the triangle.
 */
function gridMargin(a: number, b: number, c: number, d: number, x: number, y: number): number {
    const ay = (a / d) | 0,
        by = (b / d) | 0,
        cy = (c / d) | 0,
        ax = a - ay * d,
        bx = b - by * d,
        cx = c - cy * d,
        det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy),
        l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det,
        l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    return Math.min(l1, l2, 1 - l1 - l2);
}

/**
 * Whether the triangle _v0, _v1, _v2 has an area: twice the area is at least a millionth of the longest edge squared.
 */
function hasArea(): boolean {
    const ux = _v1.x - _v0.x,
        uy = _v1.y - _v0.y,
        uz = _v1.z - _v0.z,
        vx = _v2.x - _v0.x,
        vy = _v2.y - _v0.y,
        vz = _v2.z - _v0.z,
        nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx,
        wx = vx - ux,
        wy = vy - uy,
        wz = vz - uz,
        longest = Math.max(ux * ux + uy * uy + uz * uz, vx * vx + vy * vy + vz * vz, wx * wx + wy * wy + wz * wz);
    return nx * nx + ny * ny + nz * nz >= 1e-12 * longest * longest;
}

let _xyzRtc = new Vec3(),
    _resRtc = new Vec3(),
    _vrtRtc = new Vec3();

let _ray = new Ray(),
    _rayEx = new Ray();

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

/**
 * Grows when a normal map side changes, the finer normal maps that took the side compare it.
 */
let __normalMapEdgeVersion__ = 0;

const _normal = new Float32Array(3);

const NORMAL_EPSILON = 1e-5;

function isSameNormal(arr: Float32Array, i: number, x: number, y: number, z: number): boolean {
    return (
        Math.abs(arr[i] - x) < NORMAL_EPSILON &&
        Math.abs(arr[i + 1] - y) < NORMAL_EPSILON &&
        Math.abs(arr[i + 2] - z) < NORMAL_EPSILON
    );
}

/**
 * Bilinear normal at a fractional row and column of a normal grid, normalized.
 */
function sampleNormal(src: Float32Array, gs: number, row: number, col: number, dst: Float32Array) {
    row = Math.min(Math.max(row, 0), gs);
    col = Math.min(Math.max(col, 0), gs);

    const r0 = Math.min(Math.floor(row), gs - 1),
        c0 = Math.min(Math.floor(col), gs - 1),
        fr = row - r0,
        fc = col - c0;

    let x = 0,
        y = 0,
        z = 0;

    for (let q = 0; q < 4; q++) {
        const w = (q & 2 ? fr : 1 - fr) * (q & 1 ? fc : 1 - fc);
        if (w > 0) {
            const si = ((r0 + (q >> 1)) * (gs + 1) + c0 + (q & 1)) * 3,
                l = w / Math.sqrt(src[si] * src[si] + src[si + 1] * src[si + 1] + src[si + 2] * src[si + 2]);
            x += src[si] * l;
            y += src[si + 1] * l;
            z += src[si + 2] * l;
        }
    }

    const l = 1.0 / Math.sqrt(x * x + y * y + z * z);
    dst[0] = x * l;
    dst[1] = y * l;
    dst[2] = z * l;
}

/**
 * Planet segment Web Mercator tile class that stored and rendered with a quad-tree.
 * @class
 * @param {Node} node - Segment node.
 * @param {Planet} planet - Planet scene.
 * @param {number} tileZoom - Zoom index.
 * @param {Extent} extent - Segment extent.
 */
class Segment {
    public _isNorth?: boolean;

    public isPole: boolean;

    /**
     * Tile group, tiles of different groups can have the same indexes. On a cube it is the face index.
     * @type {number}
     */
    public tileGroup: number;

    /**
     * The side of the neighbors that faces the N, E, S and W side of the segment.
     * @type {number[]}
     */
    public opside: number[];

    public _projection: Proj;

    public elevationData: TypedArray | null;

    /**
     * Quad tree node of the segment.
     * @type {Node}
     */
    public node: Node;

    /**
     * Planet pointer.
     * @type {Planet}
     */
    public planet: Planet;

    /**
     * WebGl handler pointer.
     * @type {Handler}
     */
    public handler: Handler;

    /**
     * Segment bounding sphere
     * @type {Sphere}
     */
    public bsphere: Sphere;

    /**
     * Geocentric distance range of the geometry.
     * @public
     * @type {number}
     */
    public minTerrainRadius: number;
    public maxTerrainRadius: number;

    public _plainRadius: number;

    /**
     * Center of the plain segment box raised by the median terrain height, the LOD tests measure the
     * camera distance from it. Bounding volumes are for the frustum only, terrain spikes inflate them.
     * @type {Vec3}
     */
    public lodCenter: Vec3;

    public _plainCenter: Vec3;

    public _plainSurfaceRadius: number;

    /**
     * Segment bounding box.
     * @type {Box}
     */
    public bbox: Box;

    public _sw: Vec3;
    public _nw: Vec3;
    public _se: Vec3;
    public _ne: Vec3;

    public centerNormal: Vec3;

    /**
     * Geographical extent.
     * @type {Extent}
     */
    public _extent: Extent;

    public _extentMerc: Extent;

    public _extentLonLat: Extent;

    /**
     * Vertices grid size.
     * @type {number}
     */
    public gridSize: number;

    public fileGridSize: number;

    /**
     * Tile zoom index.
     * @type {number}
     */
    public tileZoom: number;

    /**
     * Equals to pow(2, tileZoom).
     * @type {number}
     */
    public powTileZoom: number;

    /**
     * Horizontal tile index.
     * @type {number}
     */
    public tileX: number;

    public tileXE: number;

    public tileXW: number;

    public tileYN: number;

    public tileYS: number;

    /**
     * Vertical tile index.
     * @type {number}
     */
    public tileY: number;

    public tileIndex: string;

    /**
     * Texture materials array.
     * @type {Array.<Material>}
     *
     * @toso: Check it should be Map<number, Material> instead of array
     *
     */
    public materials: Material[];

    /**
     * Plain segment vertices was created.
     * @type {boolean}
     */
    public plainReady: boolean;

    /**
     * Segment is ready to create plain vertices.
     * @type {boolean}
     */
    public initialized: boolean;

    /**
     * Normal map is already made.
     * @type {boolean}
     */
    public normalMapReady: boolean;

    /**
     * Terrain is already applied flag.
     * @type {boolean}
     */
    public terrainReady: boolean;

    /**
     * Terrain is loading now flag.
     * @type {boolean}
     */
    public terrainIsLoading: boolean;

    /**
     * Terrain existing flag.
     * @type {boolean}
     */
    public terrainExists: boolean;

    /**
     * Means that tree passage reaches the segment, and the segment terrain is ready.
     * @type {boolean}
     */
    public passReady: boolean;

    public plainVertices: Float64Array | null;
    public plainVerticesHigh: Float32Array | null;
    public plainVerticesLow: Float32Array | null;

    public plainNormals: Float32Array | null;

    public terrainVertices: Float64Array | null;
    public terrainVerticesHigh: Float32Array | null;
    public terrainVerticesLow: Float32Array | null;

    public renderVertices: Float64Array | null;
    public renderVerticesHigh: Float32Array | null;
    public renderVerticesLow: Float32Array | null;

    public normalMapTexture: WebGLTextureExt | null;
    public normalMapTextureBias: Float32Array;
    public normalMapVertices: Float64Array | null;
    public normalMapNormals: Float32Array | null;

    public vertexNormalBuffer: WebGLBufferExt | null;
    public vertexPositionBuffer: WebGLBufferExt | null;
    public vertexPositionBufferHigh: WebGLBufferExt | null;
    public vertexPositionBufferLow: WebGLBufferExt | null;
    public vertexTextureCoordBuffer: WebGLBufferExt | null;

    public skirtVertexPositionBufferHigh: WebGLBufferExt | null;
    public skirtVertexPositionBufferLow: WebGLBufferExt | null;
    public skirtIndexBuffer: WebGLBufferExt | null;

    public _globalTextureCoordinates: Float32Array;
    public _inTheQueue: boolean;
    public _appliedNeighborsZoom: [number, number, number, number];
    public _appliedNeighborsZoomNodeId: [number, number, number, number];
    public _appliedNeighborsVersion: [number, number, number, number];
    public _normalMapEdgeSource: (Segment | null)[];
    public _normalMapSource: Segment | null;
    public _appliedNeighborsInside: [boolean, boolean, boolean, boolean];
    public _normalMapSideVersion: [number, number, number, number];
    public _normalMapArraysVersion: number;
    public _normalMapDrawnNormals: Float32Array | null;

    public _slices: Slice[];

    public _indexBuffer: WebGLBufferExt | null;

    public readyToEngage: boolean;

    public plainProcessing: boolean;

    public normalMapTexturePtr: WebGLTextureExt | null;

    public _transitionOpacity: number;

    public _transitionTimestamp: number;

    public quadTreeStrategy: QuadTreeStrategy;

    public _relativeCenter: Vec3;
    public _rtcEyePositionHigh: Float32Array;
    public _rtcEyePositionLow: Float32Array;

    public __doubleToTwoFloats: (pos: Vec3, highPos: Vec3, lowPos: Vec3) => void;

    constructor(node: Node, quadTreeStrategy: QuadTreeStrategy, tileZoom: number, extent: Extent) {
        this.isPole = false;

        this.tileGroup = TILEGROUP_COMMON;

        this._projection = EPSG3857;

        this.node = node;

        this.quadTreeStrategy = quadTreeStrategy;

        this.planet = quadTreeStrategy.planet;

        this.handler = quadTreeStrategy.planet.renderer!.handler;

        this.bsphere = new Sphere();

        this.minTerrainRadius = 0;
        this.maxTerrainRadius = 0;

        this._plainRadius = 0;

        this.lodCenter = new Vec3();
        this._plainCenter = new Vec3();
        this._plainSurfaceRadius = 0;

        this.bbox = new Box();

        this._sw = new Vec3();
        this._nw = new Vec3();
        this._se = new Vec3();
        this._ne = new Vec3();

        this.centerNormal = new Vec3();

        this._extent = this._extentMerc = extent;

        this._extentLonLat = new Extent();

        this.gridSize = this.planet.terrain!.gridSizeByZoom[tileZoom];

        this.fileGridSize = 0;

        this.tileZoom = tileZoom;

        this.powTileZoom = 1 << tileZoom; //Math.pow(2, tileZoom);

        this.tileX = 0;

        this.tileXE = 0;

        this.tileXW = 0;

        this.tileYN = 0;

        this.tileYS = 0;

        this.tileY = 0;

        this.tileIndex = "";

        this.elevationData = null;

        this.opside = OPSIDE;

        this._assignTileIndexes();

        /**
         * @toso: Check it should be Map<number, Material> instead of array
         */
        this.materials = [];

        this.plainReady = false;

        this.initialized = false;

        this.normalMapReady = false;

        this.terrainReady = false;

        this.terrainIsLoading = false;

        this.terrainExists = false;

        this.passReady = false;

        this.plainVertices = null;
        this.plainVerticesHigh = null;
        this.plainVerticesLow = null;

        this.plainNormals = null;

        this.terrainVertices = null;
        this.terrainVerticesHigh = null;
        this.terrainVerticesLow = null;

        this.renderVertices = null;
        this.renderVerticesHigh = null;
        this.renderVerticesLow = null;

        this.normalMapTexture = null;
        this.normalMapTextureBias = new Float32Array(3);
        this.normalMapVertices = null;
        this.normalMapNormals = null;

        this.vertexNormalBuffer = null;
        this.vertexPositionBuffer = null;
        this.vertexPositionBufferHigh = null;
        this.vertexPositionBufferLow = null;
        this.vertexTextureCoordBuffer = null;

        this.skirtVertexPositionBufferHigh = null;
        this.skirtVertexPositionBufferLow = null;
        this.skirtIndexBuffer = null;

        this._globalTextureCoordinates = new Float32Array(4);
        this._inTheQueue = false;
        this._appliedNeighborsZoom = [0, 0, 0, 0];
        this._appliedNeighborsZoomNodeId = [-1, -1, -1, -1];
        this._appliedNeighborsVersion = [-1, -1, -1, -1];
        this._normalMapEdgeSource = [null, null, null, null];
        this._normalMapSource = null;
        this._appliedNeighborsInside = [false, false, false, false];
        this._normalMapSideVersion = [0, 0, 0, 0];
        this._normalMapArraysVersion = 0;
        this._normalMapDrawnNormals = null;

        this._slices = [];

        this._indexBuffer = null;

        this.readyToEngage = false;

        this.plainProcessing = false;

        this.normalMapTexturePtr = null;

        this._transitionOpacity = 1.0;

        this._transitionTimestamp = 0;

        this._relativeCenter = new Vec3();
        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);
        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);
        this.__doubleToTwoFloats = this.getRTCPosition.bind(this);
    }

    public getRTCPosition(pos: Vec3, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        let rtcPosition = pos.sub(this._relativeCenter);
        Vec3.doubleToTwoFloats(rtcPosition, rtcPositionHigh, rtcPositionLow);
    }

    static recalcRTCVertices = (
        relativeCenter: Vec3,
        vertices: Float64Array,
        verticesHigh: Float32Array,
        verticesLow: Float32Array
    ) => {
        let cx = relativeCenter.x;
        let cy = relativeCenter.y;
        let cz = relativeCenter.z;

        let vrt = new Vec3();
        let vrtHigh = new Vec3();
        let vrtLow = new Vec3();

        const len = vertices.length;
        const end = len - (len % 3);

        for (let i = 0; i < end; i += 3) {
            vrt.set(vertices[i] - cx, vertices[i + 1] - cy, vertices[i + 2] - cz);
            Vec3.doubleToTwoFloats(vrt, vrtHigh, vrtLow);

            verticesHigh[i] = vrtHigh.x;
            verticesLow[i] = vrtLow.x;

            verticesHigh[i + 1] = vrtHigh.y;
            verticesLow[i + 1] = vrtLow.y;

            verticesHigh[i + 2] = vrtHigh.z;
            verticesLow[i + 2] = vrtLow.z;
        }
    };

    public setRelativeCenter(c: Vec3) {
        // if (this._relativeCenter.equal(c)) {
        //     return;
        // }
        //
        // const prevRelativeCenter = this._relativeCenter.clone();
        // this._relativeCenter.copy(c);
        //
        // Segment.recalcRTCVertices(prevRelativeCenter, c, this.plainVertices!, this.plainVerticesHigh!, this.plainVerticesLow!);
        // Segment.recalcRTCVertices(prevRelativeCenter, c, this.terrainVertices!, this.terrainVerticesHigh!, this.terrainVerticesLow!);
        // Segment.recalcRTCVertices(prevRelativeCenter, c, this.renderVertices!, this.renderVerticesHigh!, this.renderVerticesLow!);
        //
        // if (this.vertexPositionBufferHigh && this.vertexPositionBufferLow && this.renderVerticesHigh && this.renderVerticesLow) {
        //     this.createCoordsBuffers(this.renderVerticesHigh, this.renderVerticesLow, this.gridSize);
        // }
    }

    public updateRTCEyePosition(camera: Camera) {
        let rtcEyePosition = camera.eye.sub(this._relativeCenter);
        Vec3.doubleToTwoFloat32Array(rtcEyePosition, this._rtcEyePositionHigh, this._rtcEyePositionLow);
    }

    protected _setRTCEyePositionUniforms(gl: WebGL2RenderingContext, shu: { [id: string]: WebGLUniformLocation }) {
        gl.uniform3fv(shu.rtcEyePositionHigh, this._rtcEyePositionHigh);
        gl.uniform3fv(shu.rtcEyePositionLow, this._rtcEyePositionLow);
    }

    public checkZoom(): boolean {
        return this.tileZoom < this.planet.terrain!._maxNodeZoom;
    }

    /**
     * Returns entity terrain point.
     * @public
     * @param {Entity} entity - Entity.
     * @param {Vec3} res - Point coordinates.
     * @returns {Vec3} -
     */
    public getEntityTerrainPoint(entity: Entity, res: Vec3): number {
        return this.getTerrainPoint(entity._cartesian, this.getInsideLonLat(entity), res);
    }

    public getInsideLonLat(obj: Entity | PlanetCamera): LonLat {
        return obj._lonLatMerc;
    }

    public isEntityInside(entity: Entity): boolean {
        return this.isLonLatInside(entity._lonLat);
    }

    /**
     * Returns true when the segment covers the point.
     * @public
     * @param {LonLat} lonLat - Geodetic coordinates.
     * @returns {boolean} -
     */
    public isLonLatInside(lonLat: LonLat): boolean {
        return this._extentLonLat.isInside(lonLat);
    }

    /**
     * Returns distance from object to terrain coordinates and terrain point that calculates out in the res parameter.
     * @public
     * @param {Vec3} xyz - Cartesian object position.
     * @param {LonLat} insideSegmentPosition - Geodetic object position.
     * @param {Vec3} [res] - Result cartesian coordinates on the terrain, on the ellipsoid when the segment has no
     * vertices yet.
     * @returns {number} - Distance along the ellipsoid normal, negative when the object is below the terrain.
     */
    public getTerrainPoint(xyz: Vec3, insideSegmentPosition: LonLat, res: Vec3): number {
        let verts = this.renderVertices;

        if (verts && verts.length) {
            let norm = this.planet.ellipsoid.getSurfaceNormal3v(xyz);
            _xyzRtc.set(xyz.x - this._relativeCenter.x, xyz.y - this._relativeCenter.y, xyz.z - this._relativeCenter.z);

            _ray.set(_xyzRtc, norm.negateTo());

            let ne = this._extent.northEast,
                sw = this._extent.southWest,
                size = Math.sqrt(verts.length / 3) - 1;

            let xmax = ne.lon,
                ymax = ne.lat,
                xmin = sw.lon,
                ymin = sw.lat,
                x = insideSegmentPosition.lon,
                y = insideSegmentPosition.lat;

            let sxn = xmax - xmin,
                syn = ymax - ymin;

            let qx = sxn / size,
                qy = syn / size;

            let xn = x - xmin,
                yn = y - ymin;

            // Position in the grid: columns from the west edge, rows from the north edge. A point on the edge of the
            // tile can come out a rounding error outside of it.
            let gx = Math.min(Math.max(xn / qx, 0), size),
                gy = Math.min(Math.max(size - yn / qy, 0), size);

            const cell = Math.min(Math.floor(gy), size - 1) * size + Math.min(Math.floor(gx), size - 1);

            // The triangles drawn in the cell, taken from the index buffer layout of the segment
            const cells = segmentHelper.getInstance().getCellTriangles(Math.log2(size), this.node.sideSizeLog2),
                tri = cells.vertices,
                first = cells.start[cell] * 3,
                last = cells.start[cell + 1] * 3;

            // A tile that reaches a pole has its pole row collapsed into one point. That gives triangles without
            // area, which draw nothing, but the ray test can report a hit on them by rounding.
            const pole = this._extentLonLat.northEast.lat >= 90 || this._extentLonLat.southWest.lat <= -90;

            // The triangle that contains the position in the grid is nearly always the one the ray hits,
            // so it is tested first and the others only when it is missed.
            let best = first,
                bestMargin = -Infinity;
            for (let i = first; i < last; i += 3) {
                const m = gridMargin(tri[i], tri[i + 1], tri[i + 2], size + 1, gx, gy);
                if (m > bestMargin) {
                    bestMargin = m;
                    best = i;
                    if (m >= 0) {
                        break;
                    }
                }
            }

            let sign = this._hitCellTriangle(tri, best, norm, pole);
            for (let i = first; sign === 0 && i < last; i += 3) {
                if (i !== best) {
                    sign = this._hitCellTriangle(tri, i, norm, pole);
                }
            }

            if (sign !== 0) {
                return this._terrainPointResult(res, sign);
            }

            // The ray follows the ellipsoid normal and can pass just outside of the triangles of the cell:
            // then the plane of the triangle that contains the position in the grid is used.
            if (pole) {
                bestMargin = -Infinity;
                for (let i = first; i < last; i += 3) {
                    this._setTriangle(tri, i);
                    if (!hasArea()) {
                        continue;
                    }
                    const m = gridMargin(tri[i], tri[i + 1], tri[i + 2], size + 1, gx, gy);
                    if (m > bestMargin) {
                        bestMargin = m;
                        best = i;
                    }
                }
            }

            this._setTriangle(tri, best);
            const d = _ray.hitTriangleRes(_v0, _v1, _v2, _resRtc);

            return this._terrainPointResult(res, d === Ray.AWAY ? -1 : 1);
        } else {
            // No terrain yet, the ground is the ellipsoid under the object
            const ellipsoid = this.planet.ellipsoid,
                lonLat = ellipsoid.cartesianToLonLatRes(xyz, _lonLat);
            ellipsoid.geodeticToCartesian(lonLat.lon, lonLat.lat, 0, res);
            return lonLat.height;
        }
    }

    /**
     * Ray test of the cell triangle at tri[i]: 1 when the point is above it, -1 when below it, 0 when missed.
     */
    protected _hitCellTriangle(tri: Uint32Array, i: number, norm: Vec3, pole: boolean): number {
        this._setTriangle(tri, i);
        const d = _ray.hitTriangleRes(_v0, _v1, _v2, _resRtc);
        if (d === Ray.INSIDE) {
            return !pole || hasArea() ? 1 : 0;
        }
        if (d === Ray.AWAY) {
            // The point is under the terrain
            _rayEx.set(_xyzRtc, norm);
            if (_rayEx.hitTriangleRes(_v0, _v1, _v2, _resRtc) === Ray.INSIDE && (!pole || hasArea())) {
                return -1;
            }
        }
        return 0;
    }

    protected _setTriangle(tri: Uint32Array, i: number) {
        const verts = this.renderVertices!,
            i0 = tri[i] * 3,
            i1 = tri[i + 1] * 3,
            i2 = tri[i + 2] * 3;
        _v0.set(verts[i0], verts[i0 + 1], verts[i0 + 2]);
        _v1.set(verts[i1], verts[i1 + 1], verts[i1 + 2]);
        _v2.set(verts[i2], verts[i2 + 1], verts[i2 + 2]);
    }

    protected _terrainPointResult(res: Vec3, sign: number): number {
        res.set(
            _resRtc.x + this._relativeCenter.x,
            _resRtc.y + this._relativeCenter.y,
            _resRtc.z + this._relativeCenter.z
        );
        return sign * _xyzRtc.distance(_resRtc);
    }

    /**
     * Project wgs86 to segment native projection.
     * @public
     * @param {LonLat} lonlat - Coordinates to project.
     * @returns {LonLat} -
     */
    public projectNative(lonlat: LonLat): LonLat {
        return lonlat.forwardMercator();
    }

    public loadTerrain(forceLoading: boolean = false) {
        if (this.tileZoom < this.planet.terrain!.minZoom || this.planet.terrain!.isEmpty) {
            this.terrainIsLoading = true;

            this.elevationsNotExists();

            if (!this._inTheQueue) {
                this.planet._normalMapCreator.queue(this);
            }
        } else {
            if (this.tileZoom > this.planet.terrain!.maxZoom) {
                this.elevationsNotExists();
            } else if (!this.terrainIsLoading && !this.terrainReady) {
                this.planet.terrain!.loadTerrain(this, forceLoading);
            }
            // if (!this.terrainIsLoading && !this.terrainReady) {
            //     this.planet.terrain.loadTerrain(this, forceLoading);
            // }
        }
    }

    /**
     * Terrain obtained from server.
     * @param {Float32Array} elevations - Elevation data.
     */
    public elevationsExists(elevations: number[] | TypedArray) {
        if (this.plainReady && this.terrainIsLoading) {
            let _elevations = new Float32Array(elevations.length);
            _elevations.set(elevations);

            this.elevationData = new Float32Array(elevations.length);
            this.elevationData.set(elevations);

            this.planet._terrainWorker.make({ segment: this, elevations: _elevations });

            this.plainVerticesHigh = null;
            this.plainVerticesLow = null;

            if (!this.planet.terrain!.equalizeVertices) {
                this.renderVerticesHigh = null;
                this.renderVerticesLow = null;
            }
        }
    }

    /**
     * Keep plain elevation segment for rendering
     *
     * 'this.tileZoom <= this.planet.terrain.maxZoom' it means, that the segment is plain
     *
     */
    public elevationsNotExists() {
        if (this.planet && this.tileZoom <= this.planet.terrain!.maxNativeZoom) {
            if (this.plainReady && this.terrainIsLoading) {
                this.terrainIsLoading = false;

                let n = this.node;
                n.appliedTerrainNodeId = this.node.nodeId;
                n.equalizedSideWithNodeId[N] =
                    n.equalizedSideWithNodeId[E] =
                    n.equalizedSideWithNodeId[S] =
                    n.equalizedSideWithNodeId[W] =
                        n.appliedTerrainNodeId;

                if (!this._inTheQueue) {
                    this.planet._normalMapCreator.queue(this);
                }

                this.readyToEngage = true;
            }

            // plain terrain only
            this.terrainVertices = this.plainVertices;
            this.terrainVerticesHigh = this.plainVerticesHigh;
            this.terrainVerticesLow = this.plainVerticesLow;

            this.renderVertices = this.terrainVertices;
            this.renderVerticesHigh = this.terrainVerticesHigh;
            this.renderVerticesLow = this.terrainVerticesLow;

            // Normals for the normal map in the elevation grid, as the neighbors with elevations have them.
            // A grid finer than the mesh comes from the plain segment worker.
            if (!this.normalMapNormals && this.plainNormals) {
                if (this.planet.terrain!.plainGridSize > Math.sqrt(this.plainNormals.length / 3) - 1) {
                    this.planet._plainSegmentWorker.make(this);
                } else {
                    this.normalMapNormals = this.plainNormals;
                }
            }

            this._deleteSkirtBuffers();

            this.lodCenter.copy(this._plainCenter);

            this.fileGridSize = Math.sqrt(this.terrainVertices!.length / 3) - 1;
            this.gridSize = this.fileGridSize;
            this.terrainReady = true;
            this.terrainExists = false;
        } else {
            if (this.plainReady && this.terrainIsLoading) {
                this.terrainIsLoading = false;

                let n = this.node;
                n.appliedTerrainNodeId = this.node.nodeId;
                n.equalizedSideWithNodeId[N] =
                    n.equalizedSideWithNodeId[E] =
                    n.equalizedSideWithNodeId[S] =
                    n.equalizedSideWithNodeId[W] =
                        n.appliedTerrainNodeId;

                this.readyToEngage = true;
                this.terrainReady = true;
                this.passReady = true;

                this.terrainExists = false;
            }
        }
    }

    /**
     * Normals of the plain surface in the elevation grid, made by the plain segment worker for a segment with
     * no elevations.
     */
    public _plainNormalsWorkerCallback(normals: Float32Array) {
        if (this.initialized && this.terrainReady && !this.terrainExists && !this.normalMapNormals) {
            this.normalMapNormals = normals;
            if (!this._inTheQueue) {
                this.planet._normalMapCreator.queue(this);
            }
            this.planet.renderer!.requestRedraw();
        }
    }

    protected _checkEqualization(neighborSide: number, neigborNode: Node): boolean {
        const ns = neigborNode && neigborNode.segment;

        if (!ns || this.tileZoom < ns.tileZoom) {
            return false;
        }

        const oppositeSide = this.opside[neighborSide],
            sideId = this.node.equalizedSideWithNodeId[neighborSide],
            neighborSideId = neigborNode.equalizedSideWithNodeId[oppositeSide];

        if (sideId === neighborSideId) {
            return false;
        }

        if (neigborNode._neighborFrame !== this.node._neighborFrame || !ns.renderVertices || !(ns.gridSize >= 1)) {
            return false;
        }

        if (this.tileZoom > ns.tileZoom) {
            return true;
        }

        const sideIsOwn = sideId === this.node.appliedTerrainNodeId,
            neighborSideIsOwn = neighborSideId === neigborNode.appliedTerrainNodeId;

        return neighborSideIsOwn || !sideIsOwn;
    }

    protected _equalizeSide(side: number): void {
        let n = this.node.neighbors[side][0];

        if (this._checkEqualization(side, n)) {
            let gs = this.gridSize;
            let gsOne = gs + 1;

            let offset = this.node.getOffsetOppositeNeighbourSide(n, side);

            let ns = n.segment;
            let nv = ns.renderVertices!;

            let n_gs = ns.gridSize,
                n_gsOne = n_gs + 1;

            let dxRtc = ns._relativeCenter.x - this._relativeCenter.x,
                dyRtc = ns._relativeCenter.y - this._relativeCenter.y,
                dzRtc = ns._relativeCenter.z - this._relativeCenter.z;

            let dz = 1 / (1 << (this.tileZoom - n.segment.tileZoom));

            const opcs = this.opside[side];

            let indexMul = 1,
                indexOffset = 0,
                nIndexMul = 1,
                nIndexOffset = 0;

            if (side === E) {
                indexMul = gsOne;
                indexOffset = gs;
            } else if (side === S) {
                indexOffset = gsOne * gs;
            } else if (side === W) {
                indexMul = gsOne;
            }

            if (opcs === E) {
                nIndexMul = n_gsOne;
                nIndexOffset = n_gs;
            } else if (opcs === S) {
                nIndexOffset = n_gsOne * n_gs;
            } else if (opcs === W) {
                nIndexMul = n_gsOne;
            }

            this.node.equalizedSideWithNodeId[side] = n.equalizedSideWithNodeId[opcs];
            this.readyToEngage = true;

            // The ends of the side are corners, see _equalizeCorner. A side inside one neighbor cell has no others.
            if (n_gs * dz >= 1) {
                let inc = Math.max(gs / (n_gs * dz), 1),
                    n_inc = Math.max((n_gs * dz) / gs, 1),
                    n_offset = offset * n_gs;

                if (SIDEFLIP[side][opcs]) {
                    n_offset = n_gs - n_offset;
                    n_inc = -n_inc;
                }

                for (let k = inc, nk = n_offset + n_inc; k < gs; k += inc, nk += n_inc) {
                    let n_index = (nIndexMul * nk + nIndexOffset) * 3;
                    this._setRenderVertex(
                        (indexMul * k + indexOffset) * 3,
                        nv[n_index] + dxRtc,
                        nv[n_index + 1] + dyRtc,
                        nv[n_index + 2] + dzRtc
                    );
                }
            }
        }
    }

    /**
     * Takes the corner vertex from the owner of the point: the segment of the lowest zoom among the ones that have
     * a corner there. The owner keeps its vertex, so the result doesn't depend on the order the segments go, and
     * the comparison makes the vertex follow the owner without any labels.
     * @protected
     * @param {number} corner - Corner index, NW, NE, SW or SE.
     */
    protected _equalizeCorner(corner: number) {
        const node = this.node,
            vSide = corner & 2 ? S : N,
            hSide = corner & 1 ? E : W,
            v = node.getCornerNeighbor(vSide, corner),
            h = node.getCornerNeighbor(hSide, corner);

        if (v === undefined) {
            this._equalizeCornerOnSide(vSide, corner);
            return;
        }

        if (h === undefined) {
            this._equalizeCornerOnSide(hSide, corner);
            return;
        }

        const vCorner = node.getNeighborCorner(vSide, corner),
            hCorner = node.getNeighborCorner(hSide, corner);

        let owner: Segment = this,
            ownerCorner = corner;

        if (v && v.segment._isCornerOwnerOver(owner)) {
            owner = v.segment;
            ownerCorner = vCorner;
        }

        if (h && h.segment._isCornerOwnerOver(owner)) {
            owner = h.segment;
            ownerCorner = hCorner;
        }

        // The tile across the point, round it by v or, when v gives none, by h. The corner of a cube has three
        // tiles, there it is the other neighbor.
        let d: Node | null | undefined = null,
            dCorner = 0;

        if (v) {
            const next = CORNERSIDE[this.opside[vSide]][vCorner];
            d = v.getCornerNeighbor(next, vCorner);
            if (d) {
                dCorner = v.getNeighborCorner(next, vCorner);
            }
        }

        if (!d && h) {
            const next = CORNERSIDE[this.opside[hSide]][hCorner];
            d = h.getCornerNeighbor(next, hCorner);
            if (d) {
                dCorner = h.getNeighborCorner(next, hCorner);
            }
        }

        if (d && d.segment._isCornerOwnerOver(owner)) {
            owner = d.segment;
            ownerCorner = dCorner;
        }

        if (owner !== this) {
            const ov = owner.renderVertices!,
                oi = owner._getCornerVertexIndex(ownerCorner);

            this._setCornerVertex(
                corner,
                ov[oi] + owner._relativeCenter.x - this._relativeCenter.x,
                ov[oi + 1] + owner._relativeCenter.y - this._relativeCenter.y,
                ov[oi + 2] + owner._relativeCenter.z - this._relativeCenter.z
            );
        }
    }

    /**
     * Puts the corner on the side of a neighbor of a lower zoom, when the point lies inside that side.
     */
    protected _equalizeCornerOnSide(side: number, corner: number) {
        const n = this.node.neighbors[side][0],
            ns = n.segment;

        if (ns.tileZoom >= this.tileZoom || !ns.renderVertices || !(ns.gridSize >= 1)) {
            return;
        }

        const opcs = this.opside[side],
            pos = ((side & 1 ? this.tileY : this.tileX) + NOPSORD[side][corner]) / (1 << (this.tileZoom - ns.tileZoom)),
            n_gs = ns.gridSize,
            n_gsOne = n_gs + 1,
            u = ((SIDEFLIP[side][opcs] ? ns.powTileZoom - pos : pos) - (opcs & 1 ? ns.tileY : ns.tileX)) * n_gs,
            nk = Math.floor(u),
            f = u - nk;

        let i0, step;

        if (opcs === S) {
            i0 = n_gsOne * n_gs + nk;
            step = 1;
        } else if (opcs === W) {
            i0 = n_gsOne * nk;
            step = n_gsOne;
        } else if (opcs === N) {
            i0 = nk;
            step = 1;
        } else {
            i0 = n_gsOne * nk + n_gs;
            step = n_gsOne;
        }

        i0 *= 3;

        const nv = ns.renderVertices,
            i1 = f > 0 ? i0 + step * 3 : i0;

        this._setCornerVertex(
            corner,
            nv[i0] + (nv[i1] - nv[i0]) * f + ns._relativeCenter.x - this._relativeCenter.x,
            nv[i0 + 1] + (nv[i1 + 1] - nv[i0 + 1]) * f + ns._relativeCenter.y - this._relativeCenter.y,
            nv[i0 + 2] + (nv[i1 + 2] - nv[i0 + 2]) * f + ns._relativeCenter.z - this._relativeCenter.z
        );
    }

    protected _setCornerVertex(corner: number, x: number, y: number, z: number) {
        const v = this.renderVertices!,
            i = this._getCornerVertexIndex(corner);

        // NaN is never equal to itself, the segment would be uploaded every frame
        if (Number.isFinite(x + y + z) && (v[i] !== x || v[i + 1] !== y || v[i + 2] !== z)) {
            this._setRenderVertex(i, x, y, z);
            this.readyToEngage = true;
            this.quadTreeStrategy._cornerMoved = true;
            this.planet.renderer!.requestRedraw();
        }
    }

    public _isCornerOwnerOver(segment: Segment): boolean {
        return (
            !!this.renderVertices &&
            Number.isFinite(this.gridSize) &&
            this.gridSize >= 1 &&
            (this.tileZoom < segment.tileZoom ||
                (this.tileZoom === segment.tileZoom && this.node.__id < segment.node.__id))
        );
    }

    public _getCornerVertexIndex(corner: number): number {
        const gs = this.gridSize;
        return ((corner & 2 ? gs * (gs + 1) : 0) + (corner & 1 ? gs : 0)) * 3;
    }

    protected _setRenderVertex(index: number, x: number, y: number, z: number) {
        let v = this.renderVertices!,
            vHigh = this.renderVerticesHigh!,
            vLow = this.renderVerticesLow!;

        v[index] = x;
        v[index + 1] = y;
        v[index + 2] = z;

        _v0.set(x, y, z);
        Vec3.doubleToTwoFloats(_v0, _tempHigh, _tempLow);

        vHigh[index] = _tempHigh.x;
        vHigh[index + 1] = _tempHigh.y;
        vHigh[index + 2] = _tempHigh.z;

        vLow[index] = _tempLow.x;
        vLow[index + 1] = _tempLow.y;
        vLow[index + 2] = _tempLow.z;
    }

    public equalize() {
        if (this.tileZoom < 2) {
            return;
        }

        const nn = this.node.neighbors;

        for (let side = N; side <= W; side++) {
            const n = nn[side][0];
            if (n && n.segment.tileZoom === this.tileZoom) {
                this._equalizeSide(side);
            }
        }

        for (let side = N; side <= W; side++) {
            const n = nn[side][0];
            if (n && n.segment.tileZoom < this.tileZoom) {
                this._equalizeSide(side);
            }
        }

        if (this.renderVertices && this.quadTreeStrategy._cornersChanged) {
            for (let corner = NW; corner <= SE; corner++) {
                this._equalizeCorner(corner);
            }
        }
    }

    public engage() {
        this.readyToEngage = false;
        this.createCoordsBuffers(this.renderVerticesHigh!, this.renderVerticesLow!, this.gridSize);
    }

    public _terrainWorkerCallback(data: ITerrainWorkerData) {
        if (this.plainReady) {
            let originalRelativeCenter = new Vec3(
                data.relativeCenter[0],
                data.relativeCenter[1],
                data.relativeCenter[2]
            );

            if (!this._relativeCenter.equal(originalRelativeCenter)) {
                console.warn("RECALCULATE TERRAIN VERTICES");
            }

            this.readyToEngage = true;

            this.normalMapNormals = null;

            this.normalMapVertices = null;

            this.terrainVertices = null;
            this.terrainVerticesHigh = null;
            this.terrainVerticesLow = null;

            this.renderVertices = null;
            this.renderVerticesHigh = null;
            this.renderVerticesLow = null;

            this.normalMapNormals = data.normalMapNormals;

            // Only a tile with a mesh too coarse to cut its children from gets the file grid vertices
            this.normalMapVertices = data.normalMapVertices;
            if (data.normalMapVertices) {
                this.fileGridSize = Math.sqrt(data.normalMapVertices.length / 3) - 1;
            }

            this.plainVertices = null;
            this.plainNormals = null;

            this.terrainVertices = data.terrainVertices;
            this.terrainVerticesHigh = data.terrainVerticesHigh;
            this.terrainVerticesLow = data.terrainVerticesLow;

            this.renderVertices = this.terrainVertices;
            this.renderVerticesHigh = this.terrainVerticesHigh;
            this.renderVerticesLow = this.terrainVerticesLow;

            this._deleteSkirtBuffers();

            this.setTerrainBoundingVolume(data.bounds);
            this.setTerrainRadiusRange(data.radiusRange);
            this.setLodRadius(data.lodRadius);

            this.gridSize = Math.sqrt(this.terrainVertices!.length / 3) - 1;

            let n = this.node;
            n.appliedTerrainNodeId = n.nodeId;
            n.equalizedSideWithNodeId[N] =
                n.equalizedSideWithNodeId[E] =
                n.equalizedSideWithNodeId[S] =
                n.equalizedSideWithNodeId[W] =
                    n.appliedTerrainNodeId;

            this.terrainReady = true;
            this.terrainIsLoading = false;
            this.terrainExists = true;

            if (!this.normalMapTexturePtr) {
                const nmc = this.planet._normalMapCreator;
                this.normalMapTexturePtr = this.planet.renderer!.handler.createEmptyTexture_l(nmc.width, nmc.height);
            }

            this.planet._normalMapCreator.queue(this);
        }
    }

    public _normalMapEdgeEqualize(side: number) {
        // The neighbors of a segment off the screen are left from the frame it was on it
        const linked = this.node._neighborFrame === this.quadTreeStrategy._neighborFrame;

        let nn = this.node.neighbors;
        let nns = nn[side];
        let n: Node | undefined = linked && nns ? nns[0] : undefined;
        let maxZ = this.planet.terrain!.maxZoom;

        if (this.tileZoom === maxZ) {
            if (nns && !(nn[0].length || nn[1].length || nn[2].length || nn[3].length)) {
                n = this.node.getEqualNeighbor(side);
            }
        }

        // The normal map a neighbor on the screen is drawn with, see _checkNormalMapEdges
        const es = this._normalMapEdgeSource[side];
        if (es) {
            this._normalMapEdgeSource[side] = null;
            if (es.normalMapNormals) {
                if (es.tileZoom < this.tileZoom) {
                    this._normalMapEdgeCopy(side, es);
                    return;
                }
                n = es.node;
            }
        } else if (linked && nns && nns.length === 1) {
            // A segment on the screen takes the side of a lower zoom neighbor at once, not in one more drawing
            const y = nns[0].segment,
                t = y._isNormalMapPending() ? null : y._getNormalMapSource();

            if (t && t.tileZoom < this.tileZoom && t.terrainExists && t.normalMapNormals) {
                if (!this._isNormalMapEdgeApplied(side, t)) {
                    this._normalMapEdgeCopy(side, t);
                }
                return;
            }
        }

        let b = n && n.segment,
            s = this;

        if (
            n &&
            b &&
            b.terrainReady &&
            b.terrainExists &&
            b.tileZoom <= maxZ &&
            (s._appliedNeighborsZoom[side] !== b.tileZoom || s._appliedNeighborsZoomNodeId[side] !== n.nodeId)
        ) {
            let seg_a = s.normalMapNormals,
                seg_b = b.normalMapNormals;

            if (!(seg_a && seg_b)) return;

            let seg_a_raw = s.normalMapNormals!,
                seg_b_raw = b.normalMapNormals!;

            let s_gs = Math.sqrt(seg_a.length / 3),
                s_gs1 = s_gs - 1;

            let nx, ny, nz, q;

            if (s.tileZoom === b.tileZoom) {
                const oppositeSide = s.opside[side],
                    step_a = _V[side] ? s_gs : 1,
                    start_a = _V[side] ? s_gs1 * _S[side] : s_gs1 * _S[side] * s_gs,
                    flip = SIDEFLIP[side][oppositeSide];

                let step_b = _V[oppositeSide] ? s_gs : 1,
                    start_b = _V[oppositeSide] ? s_gs1 * _S[oppositeSide] : s_gs1 * _S[oppositeSide] * s_gs;

                if (flip) {
                    start_b += s_gs1 * step_b;
                    step_b = -step_b;
                }

                let changed = false;

                for (let k = 0; k < s_gs; k++) {
                    let vInd_a = (start_a + k * step_a) * 3,
                        vInd_b = (start_b + k * step_b) * 3;

                    nx = seg_a_raw[vInd_a] + seg_b_raw[vInd_b];
                    ny = seg_a_raw[vInd_a + 1] + seg_b_raw[vInd_b + 1];
                    nz = seg_a_raw[vInd_a + 2] + seg_b_raw[vInd_b + 2];

                    q = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
                    nx *= q;
                    ny *= q;
                    nz *= q;

                    changed =
                        changed || !isSameNormal(seg_a, vInd_a, nx, ny, nz) || !isSameNormal(seg_b, vInd_b, nx, ny, nz);

                    seg_b[vInd_b] = seg_a[vInd_a] = nx;
                    seg_b[vInd_b + 1] = seg_a[vInd_a + 1] = ny;
                    seg_b[vInd_b + 2] = seg_a[vInd_a + 2] = nz;
                }

                s._appliedNeighborsZoom[side] = b.tileZoom;
                s._appliedNeighborsZoomNodeId[side] = n.nodeId;
                b._appliedNeighborsZoom[oppositeSide] = s.tileZoom;
                b._appliedNeighborsZoomNodeId[oppositeSide] = s.node.nodeId;

                if (changed) {
                    s._normalMapSideVersion[side] = b._normalMapSideVersion[oppositeSide] = ++__normalMapEdgeVersion__;
                    if (!b._inTheQueue) {
                        s.planet._normalMapCreator.queue(b);
                    }
                }
            }
        }
    }

    /**
     * The segment the normal map of this one comes from: itself, or the parent whose normal map.
     */
    public _getNormalMapSource(): Segment | null {
        if (this.normalMapReady) {
            return this;
        }
        const s = this._normalMapSource;
        return s && s.normalMapReady ? s : null;
    }

    public _isNormalMapPending(): boolean {
        return this.terrainIsLoading || !this.terrainReady || (this.terrainExists && !this.normalMapReady);
    }

    protected _isNormalMapEdgeApplied(side: number, t: Segment): boolean {
        return (
            this._appliedNeighborsZoom[side] === t.tileZoom &&
            this._appliedNeighborsZoomNodeId[side] === t.node.nodeId &&
            (t.tileZoom === this.tileZoom ||
                this._appliedNeighborsVersion[side] ===
                    (this._appliedNeighborsInside[side]
                        ? t._normalMapArraysVersion
                        : t._normalMapSideVersion[this.opside[side]]))
        );
    }

    public _checkNormalMapEdges() {
        const s = this._getNormalMapSource();

        if (!s || !s.normalMapNormals || this._isNormalMapPending()) {
            return;
        }

        const nn = this.node.neighbors;

        for (let side = N; side <= W; side++) {
            const ns = nn[side];
            for (let i = 0; i < ns.length; i++) {
                if (ns[i].segment._isNormalMapPending()) {
                    continue;
                }

                const t = ns[i].segment._getNormalMapSource();

                if (
                    !t ||
                    t === s ||
                    t.tileZoom > s.tileZoom ||
                    !t.terrainExists ||
                    !t.normalMapNormals ||
                    (t.tileZoom === s.tileZoom && t.normalMapNormals.length !== s.normalMapNormals.length)
                ) {
                    continue;
                }

                if (!s._isNormalMapEdgeApplied(side, t)) {
                    s._normalMapEdgeSource[side] = t;
                    if (!s._inTheQueue) {
                        s.planet._normalMapCreator.queue(s);
                    }
                }
            }
        }
    }

    protected _normalMapEdgeCopy(side: number, t: Segment) {
        const a = this.normalMapNormals!,
            b = t.normalMapNormals!,
            gs = Math.sqrt(a.length / 3) - 1,
            tgs = Math.sqrt(b.length / 3) - 1,
            size = tgs / (1 << (this.tileZoom - t.tileZoom)),
            x0 = this.node.getOffsetOppositeNeighbourSide(t.node, N) * tgs,
            y0 = this.node.getOffsetOppositeNeighbourSide(t.node, W) * tgs;

        let p: Node = this.node;
        while (p.parentNode && p.segment.tileZoom > t.tileZoom) {
            p = p.parentNode;
        }
        const inside = p === t.node;

        let r = y0,
            c = x0,
            dr = 0,
            dc = 0;

        if (inside) {
            if (side === N || side === S) {
                r = y0 + (side === S ? size : 0);
                dc = size / gs;
            } else {
                c = x0 + (side === E ? size : 0);
                dr = size / gs;
            }
        } else {
            // The side of the neighbor, on a cube it can go along the other axis or the other way
            const opcs = this.opside[side],
                flip = SIDEFLIP[side][opcs],
                along = side === N || side === S ? x0 : y0,
                start = flip ? tgs - along : along,
                d = (flip ? -size : size) / gs;

            if (opcs === N || opcs === S) {
                r = opcs === S ? tgs : 0;
                c = start;
                dc = d;
            } else {
                r = start;
                c = opcs === E ? tgs : 0;
                dr = d;
            }
        }

        let changed = false;

        for (let k = 0; k <= gs; k++) {
            const i = side === N ? 0 : side === S ? gs : k,
                j = side === W ? 0 : side === E ? gs : k;

            sampleNormal(b, tgs, r + dr * k, c + dc * k, _normal);

            const di = (i * (gs + 1) + j) * 3;

            changed = changed || !isSameNormal(a, di, _normal[0], _normal[1], _normal[2]);
            a[di] = _normal[0];
            a[di + 1] = _normal[1];
            a[di + 2] = _normal[2];
        }

        if (changed) {
            this._normalMapSideVersion[side] = ++__normalMapEdgeVersion__;
        }

        // Inside the lower zoom normal map only new normals change the side, on its edge the equalizing does as well
        this._appliedNeighborsZoom[side] = t.tileZoom;
        this._appliedNeighborsZoomNodeId[side] = t.node.nodeId;
        this._appliedNeighborsInside[side] = inside;
        this._appliedNeighborsVersion[side] = inside
            ? t._normalMapArraysVersion
            : t._normalMapSideVersion[this.opside[side]];
    }

    /**
     * Called when the normal map is drawn. New normals change all the sides for the finer normal maps that took them.
     */
    public _normalMapDrawn() {
        if (this._normalMapDrawnNormals !== this.normalMapNormals) {
            this._normalMapDrawnNormals = this.normalMapNormals;
            const v = ++__normalMapEdgeVersion__,
                sv = this._normalMapSideVersion;
            this._normalMapArraysVersion = sv[N] = sv[E] = sv[S] = sv[W] = v;
        }
    }

    public applyTerrain(elevations?: number[] | TypedArray | null) {
        if (elevations) {
            this.elevationsExists(elevations);
        } else {
            this.elevationsNotExists();
        }
    }

    public deleteBuffers() {
        const gl = this.handler.gl!;

        gl.deleteBuffer(this.vertexNormalBuffer!);
        gl.deleteBuffer(this.vertexPositionBuffer!);
        gl.deleteBuffer(this.vertexPositionBufferHigh!);
        gl.deleteBuffer(this.vertexPositionBufferLow!);

        this._deleteSkirtBuffers();

        this.vertexNormalBuffer = null;
        this.vertexPositionBuffer = null;
        this.vertexPositionBufferHigh = null;
        this.vertexPositionBufferLow = null;
        this.vertexTextureCoordBuffer = null;
    }

    protected _deleteSkirtBuffers() {
        const gl = this.handler.gl!;

        gl.deleteBuffer(this.skirtVertexPositionBufferHigh!);
        gl.deleteBuffer(this.skirtVertexPositionBufferLow!);
        gl.deleteBuffer(this.skirtIndexBuffer!);

        this.skirtVertexPositionBufferHigh = null;
        this.skirtVertexPositionBufferLow = null;
        this.skirtIndexBuffer = null;
    }

    public deleteMaterials() {
        let m = this.materials;
        for (let i = 0; i < m.length; i++) {
            let mi = m[i];
            if (mi) {
                mi.clear();
            }
        }
        this.materials.length = 0;
    }

    public deleteElevations() {
        this.terrainExists = false;
        this.terrainReady = false;
        this.terrainIsLoading = false;

        this.normalMapVertices = null;
        this.normalMapNormals = null;

        this.renderVertices = null;
        this.renderVerticesHigh = null;
        this.renderVerticesLow = null;

        this._deleteSkirtBuffers();

        this.terrainVertices = null;
        this.terrainVerticesHigh = null;
        this.terrainVerticesLow = null;

        this.plainVertices = null;
        this.plainVerticesHigh = null;
        this.plainVerticesLow = null;
        this.plainNormals = null;

        if (this.normalMapReady) {
            this.handler.gl!.deleteTexture(this.normalMapTexture!);
            this.normalMapReady = false;
        }

        this._appliedNeighborsZoom = [0, 0, 0, 0];
        this._appliedNeighborsZoomNodeId = [-1, -1, -1, -1];
        this._appliedNeighborsVersion = [-1, -1, -1, -1];
        this._normalMapEdgeSource = [null, null, null, null];
        this._normalMapSource = null;
        this._normalMapDrawnNormals = null;

        this.normalMapTextureBias[0] = 0;
        this.normalMapTextureBias[1] = 0;
        this.normalMapTextureBias[2] = 1;

        this._inTheQueue = false;
    }

    public clearSegment() {
        this.passReady = false;
        this.plainReady = false;
        this.initialized = false;
        this._slices.length = 0;
        this._slices = [];
        this.deleteBuffers();
        this.deleteMaterials();
        this.deleteElevations();
    }

    public childrenInitialized(): boolean {
        let n = this.node.nodes;
        return (
            n.length === 4 &&
            n[0].segment.initialized &&
            n[1].segment.initialized &&
            n[2].segment.initialized &&
            n[3].segment.initialized
        );
    }

    public destroySegment() {
        this.clearSegment();

        let i = this._slices.length;
        while (i--) {
            this._slices[i].clear();
        }

        //@ts-ignore
        this._slices = null;
        //@ts-ignore
        this.node = null;
        //@ts-ignore
        this.planet = null;
        //@ts-ignore
        this.handler = null;
        //@ts-ignore
        this.bbox = null;
        //@ts-ignore
        this.bsphere = null;
        //@ts-ignore
        this._extent = null;
        //@ts-ignore
        this.materials = null;

        this.plainVertices = null;
        this.plainVerticesHigh = null;
        this.plainVerticesLow = null;
        this.plainNormals = null;

        this.terrainVertices = null;
        this.terrainVerticesHigh = null;
        this.terrainVerticesLow = null;

        this.renderVertices = null;
        this.renderVerticesHigh = null;
        this.renderVerticesLow = null;

        //@ts-ignore
        this.normalMapTextureBias = null;
        this.normalMapTexture = null;
        this.normalMapVertices = null;
        this.normalMapNormals = null;

        this.vertexNormalBuffer = null;
        this.vertexPositionBuffer = null;
        this.vertexPositionBufferHigh = null;
        this.vertexPositionBufferLow = null;
        this.vertexTextureCoordBuffer = null;

        // @ts-ignore
        this._projection = null;
        // @ts-ignore
        this._appliedNeighborsZoom = null;
        // @ts-ignore
        this._appliedNeighborsZoomNodeId = null;
        // @ts-ignore
        this._appliedNeighborsVersion = null;
        // @ts-ignore
        this._normalMapEdgeSource = null;
        this._normalMapSource = null;
        this._normalMapDrawnNormals = null;
        // @ts-ignore
        this._globalTextureCoordinates = null;
    }

    /**
     * @todo: looks like it could be simplified in Segment contructor
     */
    public _setExtentLonLat() {
        this._extentLonLat = this._extent.inverseMercator();
    }

    /**
     * Returns the SW, NW, NE and SE corners of the segment on the ellipsoid.
     */
    protected _getExtentCorners(): [Vec3, Vec3, Vec3, Vec3] {
        const ellipsoid = this.planet.ellipsoid;
        const extent = this._extentLonLat;

        return [
            ellipsoid.geodeticToCartesian(extent.southWest.lon, extent.southWest.lat),
            ellipsoid.geodeticToCartesian(extent.southWest.lon, extent.northEast.lat),
            ellipsoid.geodeticToCartesian(extent.northEast.lon, extent.northEast.lat),
            ellipsoid.geodeticToCartesian(extent.northEast.lon, extent.southWest.lat)
        ];
    }

    protected _createExtentNormals() {
        const [sw, nw, ne, se] = this._getExtentCorners();

        this._sw.copy(sw);
        this._nw.copy(nw);
        this._ne.copy(ne);
        this._se.copy(se);
    }

    public createBoundsByExtent() {
        this._createExtentNormals();
        this.setBoundingVolume3v(this._sw, this._ne);
    }

    public createBoundsByParent() {
        let pn = this.node;

        while (pn.parentNode && !pn.segment.terrainReady) {
            pn = pn.parentNode;
        }

        let dZ2 = 1 << (this.tileZoom - pn.segment.tileZoom);

        let offsetX = this.tileX - pn.segment.tileX * dZ2,
            offsetY = this.tileY - pn.segment.tileY * dZ2;

        const pseg = pn.segment;

        this.minTerrainRadius = pseg.minTerrainRadius;
        this.maxTerrainRadius = pseg.maxTerrainRadius;

        const rtc_x = pseg._relativeCenter.x,
            rtc_y = pseg._relativeCenter.y,
            rtc_z = pseg._relativeCenter.z;

        if (pseg.terrainReady && pseg.tileZoom >= this.planet.terrain!.minZoom) {
            let gridSize = pseg.gridSize / dZ2;

            if (gridSize >= 1.0) {
                //
                // (*) Get parent whole bounding volume
                //
                this.bsphere.center.x = pseg.bsphere.center.x;
                this.bsphere.center.y = pseg.bsphere.center.y;
                this.bsphere.center.z = pseg.bsphere.center.z;
                this.bsphere.radius = pseg.bsphere.radius;

                let i0 = gridSize * offsetY;
                let j0 = gridSize * offsetX;

                let pnGsOne = pseg.gridSize + 1;

                let ind_sw = 3 * ((i0 + gridSize) * pnGsOne + j0),
                    ind_nw = 3 * (i0 * pnGsOne + j0),
                    ind_ne = 3 * (i0 * pnGsOne + j0 + gridSize),
                    ind_se = 3 * ((i0 + gridSize) * pnGsOne + j0 + gridSize);

                let pVerts = pseg.renderVertices!;

                let v_sw = new Vec3(pVerts[ind_sw] + rtc_x, pVerts[ind_sw + 1] + rtc_y, pVerts[ind_sw + 2] + rtc_z),
                    v_ne = new Vec3(pVerts[ind_ne] + rtc_x, pVerts[ind_ne + 1] + rtc_y, pVerts[ind_ne + 2] + rtc_z);

                // check for segment zoom
                let v_nw = new Vec3(pVerts[ind_nw] + rtc_x, pVerts[ind_nw + 1] + rtc_y, pVerts[ind_nw + 2] + rtc_z),
                    v_se = new Vec3(pVerts[ind_se] + rtc_x, pVerts[ind_se + 1] + rtc_y, pVerts[ind_se + 2] + rtc_z);

                this._sw.copy(v_sw);
                this._nw.copy(v_nw);
                this._ne.copy(v_ne);
                this._se.copy(v_se);
            } else {
                let i0 = Math.floor(gridSize * offsetY),
                    j0 = Math.floor(gridSize * offsetX);

                let insideSize = 1.0 / gridSize;

                let t_i0 = offsetY - insideSize * i0,
                    t_j0 = offsetX - insideSize * j0;

                let bigOne;
                if (pseg.gridSize === 1) {
                    bigOne = pseg.renderVertices!;
                } else {
                    bigOne = getMatrixSubArray64(pseg.renderVertices!, pseg.gridSize, i0, j0, 1);
                }

                let v_lt = new Vec3(bigOne[0] + rtc_x, bigOne[1] + rtc_y, bigOne[2] + rtc_z),
                    v_rb = new Vec3(bigOne[9] + rtc_x, bigOne[10] + rtc_y, bigOne[11] + rtc_z);

                let vn = new Vec3(bigOne[3] - bigOne[0], bigOne[4] - bigOne[1], bigOne[5] - bigOne[2]),
                    vw = new Vec3(bigOne[6] - bigOne[0], bigOne[7] - bigOne[1], bigOne[8] - bigOne[2]),
                    ve = new Vec3(bigOne[3] - bigOne[9], bigOne[4] - bigOne[10], bigOne[5] - bigOne[11]),
                    vs = new Vec3(bigOne[6] - bigOne[9], bigOne[7] - bigOne[10], bigOne[8] - bigOne[11]);

                let vi_y = t_i0,
                    vi_x = t_j0;

                let coords_lt, coords_rb;

                if (vi_y + vi_x < insideSize) {
                    coords_lt = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_lt = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(
                        v_rb
                    );
                }

                vi_y = t_i0 + 1;
                vi_x = t_j0 + 1;

                if (vi_y + vi_x < insideSize) {
                    coords_rb = Vec3.add(vn.scaleTo(vi_x / insideSize), vw.scaleTo(vi_y / insideSize)).addA(v_lt);
                } else {
                    coords_rb = Vec3.add(vs.scaleTo(1 - vi_x / insideSize), ve.scaleTo(1 - vi_y / insideSize)).addA(
                        v_rb
                    );
                }

                this._createExtentNormals();
                this.setBoundingVolume3v(coords_lt, coords_rb);
            }
        } else {
            this.createBoundsByExtent();
        }
    }

    public setBoundingSphere(x: number, y: number, z: number, v: Vec3) {
        this.bsphere.center.x = x;
        this.bsphere.center.y = y;
        this.bsphere.center.z = z;
        this.bsphere.radius = this.bsphere.center.distance(v);
    }

    public setBoundingVolume(xmin: number, ymin: number, zmin: number, xmax: number, ymax: number, zmax: number) {
        this.bbox.setFromBoundsArr([xmin, ymin, zmin, xmax, ymax, zmax]);

        let x = xmin + (xmax - xmin) * 0.5,
            y = ymin + (ymax - ymin) * 0.5,
            z = zmin + (zmax - zmin) * 0.5;

        this.bsphere.center.set(x, y, z);
        this.bsphere.radius = this.bsphere.center.distance(new Vec3(xmin, ymin, zmin));
    }

    public setBoundingVolume3v(vmin: Vec3, vmax: Vec3) {
        this.bbox.setFromBoundsArr([vmin.x, vmin.y, vmin.z, vmax.x, vmax.y, vmax.z]);

        let x = vmin.x + (vmax.x - vmin.x) * 0.5,
            y = vmin.y + (vmax.y - vmin.y) * 0.5,
            z = vmin.z + (vmax.z - vmin.z) * 0.5;

        this.bsphere.center.set(x, y, z);
        this.bsphere.radius = this.bsphere.center.distance(new Vec3(vmin.x, vmin.y, vmin.z));
    }

    public setTerrainRadiusRange(range?: number[] | null) {
        if (range && range[0] <= range[1] && isFinite(range[0]) && isFinite(range[1])) {
            this.minTerrainRadius = range[0];
            this.maxTerrainRadius = range[1];
        }
    }

    public setBoundingVolumeArr(bounds: NumberArray6) {
        this.bbox.setFromBoundsArr(bounds);

        let x = bounds[0] + (bounds[3] - bounds[0]) * 0.5,
            y = bounds[1] + (bounds[4] - bounds[1]) * 0.5,
            z = bounds[2] + (bounds[5] - bounds[2]) * 0.5;

        this.bsphere.center.set(x, y, z);
        this.bsphere.radius = this.bsphere.center.distance(new Vec3(bounds[0], bounds[1], bounds[2]));
    }

    /**
     * Sets the bounding volume of the terrain vertices, the plain segment volume when there are no
     * finite vertices.
     * @param {NumberArray6} bounds - [xmin, ymin, zmin, xmax, ymax, zmax].
     */
    public setTerrainBoundingVolume(bounds: NumberArray6) {
        if (bounds[0] <= bounds[3] && bounds[1] <= bounds[4] && bounds[2] <= bounds[5]) {
            this.setBoundingVolumeArr(bounds);
        } else {
            this.createBoundsByExtent();
        }
    }

    /**
     * Creates the plain segment box center and half diagonal, the LOD volume without terrain.
     */
    public _createPlainBounds() {
        // Coordinates are monotonic along the tile sides from zoom 2, so the corners span the plain box
        const [sw, nw, ne, se] = this._getExtentCorners();

        const xmin = Math.min(sw.x, nw.x, ne.x, se.x),
            ymin = Math.min(sw.y, nw.y, ne.y, se.y),
            zmin = Math.min(sw.z, nw.z, ne.z, se.z),
            dx = Math.max(sw.x, nw.x, ne.x, se.x) - xmin,
            dy = Math.max(sw.y, nw.y, ne.y, se.y) - ymin,
            dz = Math.max(sw.z, nw.z, ne.z, se.z) - zmin;

        this._plainCenter.set(xmin + dx * 0.5, ymin + dy * 0.5, zmin + dz * 0.5);
        this._plainRadius = 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz);

        // The corners are on the surface
        this._plainSurfaceRadius = (sw.length() + nw.length() + ne.length() + se.length()) * 0.25;

        this.lodCenter.copy(this._plainCenter);
    }

    /**
     * Raises the LOD center over the plain segment center by the height of the median vertex radius
     * over the surface.
     * @param {number} radius - Median geocentric radius of the segment vertices.
     */
    public setLodRadius(radius: number) {
        const c = this._plainCenter;
        const k = 1.0 + (radius - this._plainSurfaceRadius) / c.length();
        this.lodCenter.set(c.x * k, c.y * k, c.z * k);
    }

    public createCoordsBuffers(verticesHigh: Float32Array, verticesLow: Float32Array, gridSize: number) {
        const gsgs = (gridSize + 1) * (gridSize + 1);
        const h = this.handler;

        if (this.vertexPositionBufferHigh && this.vertexPositionBufferHigh.numItems === gsgs) {
            h.setStreamArrayBuffer(this.vertexPositionBufferHigh!, verticesHigh);
            h.setStreamArrayBuffer(this.vertexPositionBufferLow!, verticesLow);
        } else {
            h.gl!.deleteBuffer(this.vertexPositionBufferHigh!);
            h.gl!.deleteBuffer(this.vertexPositionBufferLow!);

            this.vertexTextureCoordBuffer = this.planet._textureCoordsBufferCache[Math.log2(gridSize)];

            // @todo use it!
            //this.vertexPositionBufferHigh = h.createStreamArrayBuffer(3, gsgs);
            //h.setStreamArrayBuffer(this.vertexPositionBufferHigh, verticesHigh);
            //this.vertexPositionBufferLow = h.createStreamArrayBuffer(3, gsgs);
            //h.setStreamArrayBuffer(this.vertexPositionBufferLow, verticesLow);

            // It works, but I'm not sure that it is correct and better use the comment above
            this.vertexPositionBufferHigh = h.createArrayBuffer(verticesHigh, 3, gsgs);
            this.vertexPositionBufferLow = h.createArrayBuffer(verticesLow, 3, gsgs);
        }
    }

    public _addViewExtent() {
        const ext = this._extentLonLat;

        let viewExt = this.quadTreeStrategy._viewExtent;

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
    }

    protected _assignTileIndexes() {
        this.tileGroup = TILEGROUP_COMMON;

        const tileZoom = this.tileZoom;
        const extent = this._extent;
        const pole = mercator.POLE;

        // this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
        // this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
        this.tileX = getTileCellIndex(extent.getCenter().lon, extent.getWidth(), -pole);
        this.tileY = getTileCellIndex(extent.getCenter().lat, extent.getHeight(), pole);

        const p2 = this.powTileZoom; //Math.pow(2, tileZoom);

        this.tileXE = (this.tileX + 1) % p2;
        this.tileXW = (p2 + this.tileX - 1) % p2;

        this.tileYN = this.tileY - 1;
        this.tileYS = this.tileY + 1;

        this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, tileZoom, this.tileGroup);
    }

    public initialize() {
        const p = this.planet;
        const n = this.node;

        this.gridSize = p.terrain!.gridSizeByZoom[this.tileZoom] || p.terrain!.plainGridSize;

        n.sideSizeLog2[0] = n.sideSizeLog2[1] = n.sideSizeLog2[2] = n.sideSizeLog2[3] = Math.log2(this.gridSize);

        if (this.tileZoom <= p.terrain!.maxZoom) {
            const nmc = this.planet._normalMapCreator;
            this.normalMapTexturePtr = p.renderer!.handler.createEmptyTexture_l(nmc.width, nmc.height);
        }

        this.normalMapTexture = this.planet.transparentTexture;

        this._assignGlobalTextureCoordinates();

        this.initialized = true;
    }

    protected _assignGlobalTextureCoordinates() {
        const e = this._extent;
        this._globalTextureCoordinates[0] = (e.southWest.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[1] = (mercator.POLE - e.northEast.lat) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[2] = (e.northEast.lon + mercator.POLE) * mercator.ONE_BY_POLE_DOUBLE;
        this._globalTextureCoordinates[3] = (mercator.POLE - e.southWest.lat) * mercator.ONE_BY_POLE_DOUBLE;
    }

    public createPlainSegmentAsync() {
        let p = this.planet,
            t = p.terrain!;

        if (t.isReady() && !this.plainReady && this.tileZoom <= t.maxZoom) {
            this.plainProcessing = true;
            p._plainSegmentWorker.make(this);
        }
    }

    public _plainSegmentWorkerCallback(data: IPlainSegmentWorkerData) {
        this.plainProcessing = false;

        if (this.initialized && !this.terrainReady) {
            //this._relativeCenter.set(data.relativeCenter[0], data.relativeCenter[1], data.relativeCenter[2]);

            this.plainReady = true;

            this.plainVertices = data.plainVertices;
            this.plainVerticesHigh = data.plainVerticesHigh;
            this.plainVerticesLow = data.plainVerticesLow;
            this.plainNormals = data.plainNormals;

            const t = this.planet.terrain!;
            this.fileGridSize = Math.max(t.plainGridSize, t.gridSizeByZoom[this.tileZoom]);
        }
    }

    public createPlainSegment() {
        this.initialize();
        this._createPlainVertices();
        this.readyToEngage = true;
    }

    /**
     * Returns the geodetic coordinates of the native point.
     * @public
     * @param {number} lon - Native longitude.
     * @param {number} lat - Native latitude.
     * @returns {LonLat} -
     */
    public getLonLat(lon: number, lat: number): LonLat {
        return LonLat.inverseMercator(lon, lat);
    }

    protected _createPlainVertices() {
        const gridSize = this.planet.terrain!.gridSizeByZoom[this.tileZoom];
        const currGridSize = gridSize;
        const e = this._extent;
        const lonSize = e.getWidth();
        const latSize = e.getHeight();
        const llStep = lonSize / currGridSize;
        const ltStep = latSize / currGridSize;
        const esw_lon = e.southWest.lon;
        const ene_lat = e.northEast.lat;
        const gs = currGridSize + 1;
        const r2 = this.planet.ellipsoid._invRadii2;
        const gsgs = gs * gs;
        const gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;
        const rcx = this._relativeCenter.x;
        const rcy = this._relativeCenter.y;
        const rcz = this._relativeCenter.z;

        let ind = 0;

        this.plainNormals = new Float32Array(gridSize3);
        this.plainVertices = new Float64Array(gridSize3);
        this.plainVerticesHigh = new Float32Array(gridSize3);
        this.plainVerticesLow = new Float32Array(gridSize3);

        let verts = this.plainVertices,
            vertsHigh = this.plainVerticesHigh,
            vertsLow = this.plainVerticesLow,
            norms = this.plainNormals;

        for (let k = 0; k < gsgs; k++) {
            let j = k % gs,
                i = ~~(k / gs);

            let v = this.planet.ellipsoid.lonLatToCartesian(this.getLonLat(esw_lon + j * llStep, ene_lat - i * ltStep));

            let nx = v.x * r2.x,
                ny = v.y * r2.y,
                nz = v.z * r2.z;

            let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

            let nxl = nx * l,
                nyl = ny * l,
                nzl = nz * l;

            _vrtRtc.set(v.x - rcx, v.y - rcy, v.z - rcz);

            Vec3.doubleToTwoFloats(_vrtRtc, _tempHigh, _tempLow);

            verts[ind] = _vrtRtc.x;
            vertsHigh[ind] = _tempHigh.x;
            vertsLow[ind] = _tempLow.x;
            norms[ind++] = nxl;

            verts[ind] = _vrtRtc.y;
            vertsHigh[ind] = _tempHigh.y;
            vertsLow[ind] = _tempLow.y;
            norms[ind++] = nyl;

            verts[ind] = _vrtRtc.z;
            vertsHigh[ind] = _tempHigh.z;
            vertsLow[ind] = _tempLow.z;
            norms[ind++] = nzl;
        }

        this.terrainVertices = verts;
        this.terrainVerticesHigh = vertsHigh;
        this.terrainVerticesLow = vertsLow;

        this.plainReady = true;
    }

    /**
     * Gets specific layer material.
     * @public
     * @param {Layer} layer - Layer object.
     * @returns {Material | undefined} - Segment material.
     */
    public getMaterialByLayer(layer: Layer): Material | undefined {
        return this.materials[layer.__id];
    }

    /**
     * Computes cyclic longitude shift for `sourceExtent` to align it with `targetExtent`
     * in wrapped horizontal coordinate space (for example, Web Mercator world copies).
     * @protected
     * @param {Extent} sourceExtent - Source extent to shift along longitude.
     * @param {Extent} targetExtent - Target extent used as alignment reference.
     * @param {number} worldWidth - Full world width in projection units.
     * @returns {number} Longitude shift to apply to `sourceExtent`.
     */
    protected _getCyclicLonShift(sourceExtent: Extent, targetExtent: Extent, worldWidth: number): number {
        const sourceCenter = (sourceExtent.southWest.lon + sourceExtent.northEast.lon) * 0.5;
        const targetCenter = (targetExtent.southWest.lon + targetExtent.northEast.lon) * 0.5;
        const sourceWidth = sourceExtent.northEast.lon - sourceExtent.southWest.lon;

        if (worldWidth <= 0.0 || sourceWidth >= worldWidth) {
            return 0.0;
        }

        const k0 = Math.round((targetCenter - sourceCenter) / worldWidth);
        let bestShift = k0 * worldWidth;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let dk = -1; dk <= 1; dk++) {
            const shift = (k0 + dk) * worldWidth;
            const shiftedSw = sourceExtent.southWest.lon + shift;
            const shiftedNe = sourceExtent.northEast.lon + shift;
            const shiftedCenter = (shiftedSw + shiftedNe) * 0.5;
            const overlapsX = targetExtent.southWest.lon <= shiftedNe && targetExtent.northEast.lon >= shiftedSw;
            const score = Math.abs(shiftedCenter - targetCenter) + (overlapsX ? 0.0 : worldWidth);

            if (score < bestScore) {
                bestScore = score;
                bestShift = shift;
            }
        }

        return bestShift;
    }

    // protected _getLayerExtentOffset(layer: Layer): [number, number, number, number] {
    //     const v0s = layer._extentMerc;
    //     const v0t = this._extent;
    //     const lonShift = this._getCyclicLonShift(v0s, v0t, mercator.POLE2);
    //     const sourceSwLon = v0s.southWest.lon + lonShift;
    //     const sourceNeLon = v0s.northEast.lon + lonShift;
    //     const sSize_x = sourceNeLon - sourceSwLon;
    //     const sSize_y = v0s.northEast.lat - v0s.southWest.lat;
    //     const dV0s_x = (v0t.southWest.lon - sourceSwLon) / sSize_x;
    //     const dV0s_y = (v0s.northEast.lat - v0t.northEast.lat) / sSize_y;
    //     const dSize_x = (v0t.northEast.lon - v0t.southWest.lon) / sSize_x;
    //     const dSize_y = (v0t.northEast.lat - v0t.southWest.lat) / sSize_y;
    //     return [dV0s_x, dV0s_y, dSize_x, dSize_y];
    // }

    public initSlice(sliceIndex: number): Slice {
        let slice = this._slices[sliceIndex];

        if (!slice) {
            slice = this._slices[sliceIndex] = new Slice(this);
        } else {
            //TODO: optimization!!!
            slice.layers = [];
        }

        return slice;
    }

    public screenRendering(
        sh: ShaderProgram,
        layerSlice: Layer[],
        sliceIndex: number,
        defaultTexture?: WebGLTextureExt | null,
        isOverlay: boolean = false,
        forcedOpacity?: number
    ) {
        const gl = this.handler.gl!;
        const sha = sh.attributes;
        const shu = sh.uniforms;

        const pm = this.materials;
        const p = this.planet;
        const qts = this.quadTreeStrategy;

        let currHeight, li;
        if (layerSlice && layerSlice.length) {
            li = layerSlice[0];
            currHeight = li._height;
        } else {
            currHeight = 0;
        }

        // First always draw whole planet base layer segment with solid texture.
        gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 2);
        gl.bindTexture(gl.TEXTURE_2D, (defaultTexture || this.getDefaultTexture())!);
        gl.uniform1i(shu.defaultTexture, p.SLICE_SIZE + 2);

        let n = 0,
            i = 0;

        let notEmpty = false;

        let slice = this.initSlice(sliceIndex);

        this.ensureIndexBuffer();

        // Reset all overlay sampler units for the current draw call to avoid stale
        // bindings from previous passes (including framebuffer attachments).
        for (let ti = 0; ti < p.SLICE_SIZE; ti++) {
            p._samplerArr[ti] = ti;
            gl.activeTexture(gl.TEXTURE0 + ti);
            gl.bindTexture(gl.TEXTURE_2D, p.transparentTexture!);
        }

        while (li) {
            if (
                this.layerOverlap(li) &&
                ((li._fading && li._fadingOpacity > 0.0) ||
                    ((li.minZoom >= qts.minCurrZoom || li.maxZoom >= qts.minCurrZoom) &&
                        (li.minZoom <= qts.maxCurrZoom || li.maxZoom <= qts.maxCurrZoom)))
            ) {
                notEmpty = true;

                let m = pm[li.__id];

                if (!m) {
                    m = pm[li.__id] = li.createMaterial(this);
                }

                if (!m.isReady) {
                    qts._renderCompleted = false;
                }

                slice.append(li, m);

                gl.activeTexture(gl.TEXTURE0 + n);
                gl.bindTexture(gl.TEXTURE_2D, (m.texture || p.transparentTexture)!);

                n++;
            }
            i++;
            li = layerSlice[i];
        }

        if (notEmpty || !isOverlay) {
            //
            // @todo: fix deferred pass consistency
            //
            this._setRTCEyePositionUniforms(gl, shu);
            gl.uniform1f(
                shu.transitionOpacity,
                forcedOpacity || this._transitionOpacity > 1.0 ? 1.0 : this._transitionOpacity
            );

            gl.uniform1i(shu.samplerCount, n);
            gl.uniform1f(shu.height, currHeight);
            gl.uniform1iv(shu.samplerArr, p._samplerArr);

            //slice.uniform(gl, shu);

            gl.uniform4fv(shu.tileOffsetArr, slice.tileOffsetArr);
            gl.uniform1fv(shu.layerOpacityArr, slice.layerOpacityArr);
            //gl.uniform4fv(shu.visibleExtentOffsetArr, slice.visibleExtentOffsetArr);

            gl.activeTexture(gl.TEXTURE0 + p.SLICE_SIZE + 3);
            gl.bindTexture(gl.TEXTURE_2D, (this.normalMapTexture || p.transparentTexture)!);
            gl.uniform1i(shu.uNormalMap, p.SLICE_SIZE + 3);

            gl.uniform3fv(shu.uNormalMapBias, this.normalMapTextureBias);

            // bind segment specular and night material texture coordinates
            gl.uniform4fv(shu.uGlobalTextureCoord, this._globalTextureCoordinates);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh!);
            gl.vertexAttribPointer(
                sha.aVertexPositionHigh,
                this.vertexPositionBufferHigh!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow!);
            gl.vertexAttribPointer(
                sha.aVertexPositionLow,
                this.vertexPositionBufferLow!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer!);
            gl.vertexAttribPointer(sha.aTextureCoord, 2, gl.UNSIGNED_SHORT, true, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(p.drawMode, this._indexBuffer!.numItems, this._indexBuffer!.type!, 0);
        }
    }

    public increaseTransitionOpacity() {
        //this._transitionOpacity += 0.01;
        this._transitionOpacity += (window.performance.now() - this._transitionTimestamp) / this.planet.transitionTime;
        this._transitionTimestamp = window.performance.now();
        if (this._transitionOpacity > 2.0) {
            this._transitionOpacity = 2.0;
        }

        if (this._transitionOpacity < 2.0) {
            this.planet.renderer!.requestRedraw();
        }

        let i = this.node._fadingNodes.length;
        while (i--) {
            let n = this.node._fadingNodes[i];
            if (n.segment) {
                if (n.segment._transitionOpacity > 0 && !this.quadTreeStrategy._fadingNodes.has(n.__id)) {
                    this.quadTreeStrategy._fadingNodes.set(n.__id, n);
                    n.segment._transitionOpacity = 2.0 - this._transitionOpacity;
                    if (n.segment._transitionOpacity === 0) {
                        this.node._fadingNodes.splice(i, 1);
                    }
                }
            } else {
                this._transitionOpacity = 1.0;
                break;
            }
        }
    }

    public fadingTransitionOpacity() {
        this._transitionOpacity -= 0.01;
        // this._transitionOpacity -= (window.performance.now() - this._transitionTimestamp) / this.planet.transitionTime;
        this._transitionTimestamp = window.performance.now();
        if (this._transitionOpacity < 0.0) {
            this._transitionOpacity = 0;
        }

        if (this._transitionOpacity > 0.0) {
            this.planet.renderer!.requestRedraw();
        }
    }

    public colorPickingRendering(
        sh: ShaderProgram,
        layerSlice: Layer[],
        sliceIndex: number,
        defaultTexture?: WebGLTextureExt | null,
        isOverlay: boolean = false
    ) {
        const gl = this.handler.gl!;
        const sha = sh.attributes;
        const shu = sh.uniforms;

        let pm = this.materials,
            p = this.planet;

        let currHeight;
        if (layerSlice && layerSlice.length) {
            currHeight = layerSlice[0]._height;
        } else {
            currHeight = 0;
        }

        let notEmpty = false;

        let slice = this._slices[sliceIndex] || this.initSlice(sliceIndex);

        let len = slice.layers.length;

        // Reset all samplers to safe textures first to avoid feedback loops when
        // some units are not overwritten in this draw call.
        for (let ti = 0; ti < p.SLICE_SIZE; ti++) {
            p._samplerArr[ti] = ti;
            gl.activeTexture(gl.TEXTURE0 + ti);
            gl.bindTexture(gl.TEXTURE_2D, this.planet.transparentTexture!);

            p._pickingMaskArr[ti] = ti + p.SLICE_SIZE;
            gl.activeTexture(gl.TEXTURE0 + ti + p.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, this.planet.transparentTexture!);
        }

        for (let n = 0; n < len; n++) {
            notEmpty = true;

            let li = slice.layers[n];
            let n4 = n * 4;

            p._pickingColorArr[n4] = li._pickingColor.x / 255.0;
            p._pickingColorArr[n4 + 1] = li._pickingColor.y / 255.0;
            p._pickingColorArr[n4 + 2] = li._pickingColor.z / 255.0;
            p._pickingColorArr[n4 + 3] = Number(li._pickingEnabled);

            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, (pm[li.__id].texture || this.planet.transparentTexture)!);

            gl.activeTexture(gl.TEXTURE0 + n + p.SLICE_SIZE);
            gl.bindTexture(gl.TEXTURE_2D, (pm[li.__id].pickingMask || this.planet.transparentTexture)!);
        }

        if (notEmpty || !isOverlay) {
            this._setRTCEyePositionUniforms(gl, shu);
            gl.uniform1i(shu.samplerCount, len);
            gl.uniform1f(shu.height, currHeight);
            gl.uniform1iv(shu.samplerArr, p._samplerArr);
            gl.uniform1iv(shu.pickingMaskArr, p._pickingMaskArr);
            gl.uniform4fv(shu.pickingColorArr, p._pickingColorArr);

            //slice.uniform(gl, shu);

            gl.uniform4fv(shu.tileOffsetArr, slice.tileOffsetArr);
            gl.uniform1fv(shu.layerOpacityArr, slice.layerOpacityArr);
            //gl.uniform4fv(shu.visibleExtentOffsetArr, slice.visibleExtentOffsetArr);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh!);
            gl.vertexAttribPointer(
                sha.aVertexPositionHigh,
                this.vertexPositionBufferHigh!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow!);
            gl.vertexAttribPointer(
                sha.aVertexPositionLow,
                this.vertexPositionBufferLow!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer!);
            gl.vertexAttribPointer(sha.aTextureCoord, 2, gl.UNSIGNED_SHORT, true, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer!);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexBuffer!.numItems, this._indexBuffer!.type!, 0);
        }
    }

    protected _appendSkirtVertexPair(
        vertices: Float64Array,
        verticesHigh: Float32Array,
        verticesLow: Float32Array,
        vertexIndex: number,
        out: number
    ): number {
        const rcx = this._relativeCenter.x;
        const rcy = this._relativeCenter.y;
        const rcz = this._relativeCenter.z;
        const i3 = vertexIndex * 3;
        const x = vertices[i3];
        const y = vertices[i3 + 1];
        const z = vertices[i3 + 2];
        const wx = x + rcx;
        const wy = y + rcy;
        const wz = z + rcz;
        const len = Math.sqrt(wx * wx + wy * wy + wz * wz);
        const invLen = len > 0 ? 1.0 / len : 0.0;
        const nx = wx * invLen;
        const ny = wy * invLen;
        const nz = wz * invLen;

        _v0.set(x, y, z);
        Vec3.doubleToTwoFloats(_v0, _tempHigh, _tempLow);

        verticesHigh[out] = _tempHigh.x;
        verticesLow[out++] = _tempLow.x;
        verticesHigh[out] = _tempHigh.y;
        verticesLow[out++] = _tempLow.y;
        verticesHigh[out] = _tempHigh.z;
        verticesLow[out++] = _tempLow.z;

        _v0.set(x - nx * SKIRT_SIZE, y - ny * SKIRT_SIZE, z - nz * SKIRT_SIZE);
        Vec3.doubleToTwoFloats(_v0, _tempHigh, _tempLow);

        verticesHigh[out] = _tempHigh.x;
        verticesLow[out++] = _tempLow.x;
        verticesHigh[out] = _tempHigh.y;
        verticesLow[out++] = _tempLow.y;
        verticesHigh[out] = _tempHigh.z;
        verticesLow[out++] = _tempLow.z;

        return out;
    }

    protected _ensureSkirtBuffers(): boolean {
        if (!this.renderVertices) {
            return false;
        }

        const gsOne = this.gridSize + 1;
        const sideVertexCount = gsOne * 2;
        const vertexCount = sideVertexCount * 4;
        const indexCount = vertexCount + 6;

        if (this.skirtIndexBuffer?.numItems === indexCount) {
            return true;
        }

        this._deleteSkirtBuffers();

        const vertices = this.renderVertices;
        const verticesHigh = new Float32Array(vertexCount * 3);
        const verticesLow = new Float32Array(vertexCount * 3);
        const indexes = segmentHelper.createIndexesArray(indexCount, vertexCount);

        let out = 0;

        for (let j = 0; j < gsOne; j++) {
            out = this._appendSkirtVertexPair(vertices, verticesHigh, verticesLow, j, out);
        }

        for (let i = 0; i < gsOne; i++) {
            out = this._appendSkirtVertexPair(vertices, verticesHigh, verticesLow, i * gsOne + this.gridSize, out);
        }

        for (let j = this.gridSize; j >= 0; j--) {
            out = this._appendSkirtVertexPair(vertices, verticesHigh, verticesLow, this.gridSize * gsOne + j, out);
        }

        for (let i = this.gridSize; i >= 0; i--) {
            out = this._appendSkirtVertexPair(vertices, verticesHigh, verticesLow, i * gsOne, out);
        }

        const h = this.handler;
        const gl = h.gl!;

        let indexOffset = 0;
        for (let side = 0; side < 4; side++) {
            const firstIndex = side * sideVertexCount;
            if (side > 0) {
                indexes[indexOffset++] = firstIndex - 1;
                indexes[indexOffset++] = firstIndex;
            }
            for (let i = 0; i < sideVertexCount; i++) {
                indexes[indexOffset++] = firstIndex + i;
            }
        }

        this.skirtVertexPositionBufferHigh = h.createArrayBuffer(verticesHigh, 3, vertexCount, gl.DYNAMIC_DRAW);
        this.skirtVertexPositionBufferLow = h.createArrayBuffer(verticesLow, 3, vertexCount, gl.DYNAMIC_DRAW);
        this.skirtIndexBuffer = h.createElementArrayBuffer(indexes, 1, indexCount, gl.DYNAMIC_DRAW);

        return true;
    }

    protected _drawSkirts(gl: WebGL2RenderingContext, sha: { [id: string]: number }) {
        if (!this._ensureSkirtBuffers()) return;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.skirtVertexPositionBufferHigh!);
        gl.vertexAttribPointer(
            sha.aVertexPositionHigh,
            this.skirtVertexPositionBufferHigh!.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this.skirtVertexPositionBufferLow!);
        gl.vertexAttribPointer(
            sha.aVertexPositionLow,
            this.skirtVertexPositionBufferLow!.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skirtIndexBuffer!);
        gl.drawElements(gl.TRIANGLE_STRIP, this.skirtIndexBuffer!.numItems, this.skirtIndexBuffer!.type!, 0);
    }

    public depthRendering(sh: ShaderProgram, layerSlice?: Layer[], renderSkirts: boolean = false) {
        const gl = this.handler.gl!;
        const sha = sh.attributes;
        const shu = sh.uniforms;

        var currHeight;
        if (layerSlice && layerSlice.length) {
            currHeight = layerSlice[0]._height;
        } else {
            currHeight = 0;
        }

        this._setRTCEyePositionUniforms(gl, shu);
        gl.uniform1f(shu.height, currHeight);

        if (renderSkirts) {
            this._drawSkirts(gl, sha);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferHigh!);
        gl.vertexAttribPointer(sha.aVertexPositionHigh, this.vertexPositionBufferHigh!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBufferLow!);
        gl.vertexAttribPointer(sha.aVertexPositionLow, this.vertexPositionBufferLow!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer!);
        gl.drawElements(gl.TRIANGLE_STRIP, this._indexBuffer!.numItems, this._indexBuffer!.type!, 0);
    }

    public ensureIndexBuffer() {
        this._indexBuffer = this._getIndexBuffer();
    }

    protected _getIndexBuffer(): WebGLBufferExt {
        const s = this.node.sideSizeLog2;
        let cache = this.planet._indexesCache[Math.log2(this.gridSize)][s[0]][s[1]][s[2]][s[3]];
        if (!cache.buffer) {
            let indexes = segmentHelper
                .getInstance()
                .createSegmentIndexes(Math.log2(this.gridSize), [s[0], s[1], s[2], s[3]]);
            cache.buffer = this.planet.renderer!.handler.createElementArrayBuffer(indexes, 1);
            this.planet._indexesCacheToRemoveCounter++;
        }
        return cache.buffer;
    }

    public layerOverlap(layer: Layer): boolean {
        if (this._extent.overlaps(layer._extentMerc)) {
            return true;
        }

        const segmentExtent = this._extent;
        const layerExtent = layer._extentMerc;

        if (
            segmentExtent.southWest.lat > layerExtent.northEast.lat ||
            segmentExtent.northEast.lat < layerExtent.southWest.lat
        ) {
            return false;
        }

        const lonShift = this._getCyclicLonShift(layerExtent, segmentExtent, mercator.POLE2);
        const shiftedSwLon = layerExtent.southWest.lon + lonShift;
        const shiftedNeLon = layerExtent.northEast.lon + lonShift;

        return segmentExtent.southWest.lon <= shiftedNeLon && segmentExtent.northEast.lon >= shiftedSwLon;
    }

    public getDefaultTexture(): WebGLTextureExt | null {
        return this.planet.solidTextureOne;
    }

    public getExtentLonLat(): Extent {
        return this._extentLonLat;
    }

    public getExtentMerc(): Extent {
        return this._extentMerc;
    }

    public getExtent(): Extent {
        return this._extent;
    }
}

export { Segment };
