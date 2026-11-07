/**
 * @module og/proj/cube
 */

import { LonLat } from "../LonLat";
import { DEGREES, PI_TWO, RADIANS } from "../math";
import { E, N, OPSIDE, S, W } from "../quadTree/quadTree";
import { Proj, Units } from "./Proj";

export const CUBE_TOP = 0;
export const CUBE_FRONT = 1;
export const CUBE_RIGHT = 2;
export const CUBE_BACK = 3;
export const CUBE_LEFT = 4;
export const CUBE_BOTTOM = 5;

/**
 * Center, east and north directions of the cube faces. The faces from CUBE_FRONT to CUBE_LEFT lie on the equator at
 * longitudes 0, 90, 180 and -90.
 */
export const CUBE_FACES = [
    [0, 0, 1, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, -1, 0, 0, 0, 0, 1],
    [-1, 0, 0, 0, -1, 0, 0, 0, 1],
    [0, -1, 0, 1, 0, 0, 0, 0, 1],
    [0, 0, -1, 1, 0, 0, 0, -1, 0]
];

/**
 * The face and its side behind the N, E, S and W sides of each face.
 */
export const CUBE_FACE_LINKS: [number, number][][] = [
    // CUBE_TOP
    [
        [CUBE_RIGHT, N],
        [CUBE_FRONT, N],
        [CUBE_LEFT, N],
        [CUBE_BACK, N]
    ],
    // CUBE_FRONT
    [
        [CUBE_TOP, E],
        [CUBE_RIGHT, W],
        [CUBE_BOTTOM, E],
        [CUBE_LEFT, E]
    ],
    // CUBE_RIGHT
    [
        [CUBE_TOP, N],
        [CUBE_BACK, W],
        [CUBE_BOTTOM, S],
        [CUBE_FRONT, E]
    ],
    // CUBE_BACK
    [
        [CUBE_TOP, W],
        [CUBE_LEFT, W],
        [CUBE_BOTTOM, W],
        [CUBE_RIGHT, E]
    ],
    // CUBE_LEFT
    [
        [CUBE_TOP, S],
        [CUBE_FRONT, W],
        [CUBE_BOTTOM, N],
        [CUBE_BACK, E]
    ],
    // CUBE_BOTTOM
    [
        [CUBE_LEFT, S],
        [CUBE_FRONT, S],
        [CUBE_RIGHT, S],
        [CUBE_BACK, S]
    ]
];

/**
 * Sides of the neighbors of a tile, see Segment.opside. First index is the face, second is the mask of the tile sides
 * that lie on the edges of the face, a bit for each of {N,E,S,W}.
 */
export const CUBE_OPSIDE = CUBE_FACE_LINKS.map((links) =>
    Array.from({ length: 16 }, (_, edges) =>
        [N, E, S, W].map((side) => (edges & (1 << side) ? links[side][1] : OPSIDE[side]))
    )
);

const MAX_POSITION = 1.0 - Math.pow(2, -50);

// A position on a face, from 0 to 1, as a coordinate on the plane of the face, from -1 to 1, and back
const toEquiangularPlane = (position: number) => Math.tan(PI_TWO * (position - 0.5));
const fromEquiangularPlane = (coordinate: number) => Math.atan(coordinate) / PI_TWO + 0.5;
const toGnomonicPlane = (position: number) => 2.0 * position - 1.0;
const fromGnomonicPlane = (coordinate: number) => (coordinate + 1.0) * 0.5;

/**
 * Projection of a cube inflated to the ellipsoid. Native coordinates of a point: lon is the face index plus the
 * position from west to east, lat is the position from south to north, both positions are from 0 to 1.
 * @class
 * @extends {Proj}
 * @param {string} code - Projection code.
 * @param {boolean} equiangular - True when equal steps on a face are equal angles, false when they are equal
 * distances on the plane of the face, as in a common cube map.
 */
export class CubeProj extends Proj {
    public readonly equiangular: boolean;

    protected readonly _toPlane: (position: number) => number;
    protected readonly _fromPlane: (coordinate: number) => number;

    constructor(code: string, equiangular: boolean) {
        super({ code, units: Units.DEGREES });
        this.equiangular = equiangular;
        this._toPlane = equiangular ? toEquiangularPlane : toGnomonicPlane;
        this._fromPlane = equiangular ? fromEquiangularPlane : fromGnomonicPlane;
    }

    /**
     * Returns the geodetic coordinates of the point on the cube. The direction of the cube point is the surface
     * normal of the ellipsoid in it.
     * @public
     * @param {number} lon - Native longitude.
     * @param {number} lat - Native latitude.
     * @param {number} [face] - Face index, it is needed on the east edge of a face: the longitude is the next face
     * there.
     * @returns {LonLat} -
     */
    public toLonLat(lon: number, lat: number, face: number = Math.floor(lon)): LonLat {
        const f = CUBE_FACES[face],
            a = this._toPlane(lon - face),
            b = this._toPlane(lat),
            x = f[0] + a * f[3] + b * f[6],
            y = f[1] + a * f[4] + b * f[7],
            z = f[2] + a * f[5] + b * f[8];

        return new LonLat(Math.atan2(y, x) * DEGREES, Math.atan2(z, Math.sqrt(x * x + y * y)) * DEGREES);
    }

    /**
     * Returns the native coordinates of the geodetic point.
     * @public
     * @param {LonLat} lonLat - Geodetic coordinates.
     * @returns {LonLat} -
     */
    public fromLonLat(lonLat: LonLat): LonLat {
        const lon = lonLat.lon * RADIANS,
            lat = lonLat.lat * RADIANS,
            c = Math.cos(lat),
            x = c * Math.cos(lon),
            y = c * Math.sin(lon),
            z = Math.sin(lat),
            ax = Math.abs(x),
            ay = Math.abs(y),
            az = Math.abs(z);

        let face;
        if (az >= ax && az >= ay) {
            face = z > 0 ? CUBE_TOP : CUBE_BOTTOM;
        } else if (ax >= ay) {
            face = x > 0 ? CUBE_FRONT : CUBE_BACK;
        } else {
            face = y > 0 ? CUBE_RIGHT : CUBE_LEFT;
        }

        const f = CUBE_FACES[face],
            d = x * f[0] + y * f[1] + z * f[2],
            a = (x * f[3] + y * f[4] + z * f[5]) / d,
            b = (x * f[6] + y * f[7] + z * f[8]) / d;

        return new LonLat(face + Math.min(this._fromPlane(a), MAX_POSITION), this._fromPlane(b));
    }
}

/**
 * The cube of a common cube map: the planes of the faces are split evenly.
 * @type {CubeProj}
 */
export const cube = new CubeProj("cube", false);

/**
 * The cube with tiles of about the same size all over the planet.
 * @type {CubeProj}
 */
export const cubeEquiangular = new CubeProj("cubeEquiangular", true);
