/**
 * @module og/entity/Polyline
 */

"use strict";

import {
    makeArrayTyped,
    makeArray,
    htmlColorToFloat32Array,
    htmlColorToRgba,
    cloneArray
} from "../utils/shared.js";
import { Extent } from "../Extent.js";
import { LonLat } from "../LonLat.js";
import { Vec3 } from "../math/Vec3.js";

const VERTICES_BUFFER = 0;
const INDEX_BUFFER = 1;
const COLORS_BUFFER = 2;

const DEFAULT_COLOR = "#0000FF";

const R = 0;
const G = 1;
const B = 2;
const A = 3;

/**
 * Polyline object.
 * @class
 * @param {Object} [options] - Polyline options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {Number} [options.altitude] - Relative to ground layers altitude value.
 * @param {og.Vec4} [options.color] - RGBA color.
 * @param {Boolean} [options.opacity] - Line opacity.
 * @param {Boolean} [options.visibility] - Polyline visibility. True default.
 * @param {Boolean} [options.isClosed] - Closed geometry type identificator.
 * @param {Array.<Array.<number,number,number>>} [options.pathLonLat] - Polyline geodetic coordinates array.
 * @param {Array.<Array.<number,number,number>>} [options.path3v] - LinesString cartesian coordinates array. [[0,0,0], [1,1,1],...]
 * @param {Array.<Array.<number,number,number, number>>} [options.pathColors] - Coordinates color. [[1,0,0,1], [0,1,0,1],...] for right and green colors.
 */
class Polyline {
    constructor(options) {
        options = options || {};

        /**
         * Object unic identifier.
         * @public
         * @readonly
         * @type {number}
         */
        this.id = Polyline._staticCounter++;

        this.altitude = options.altitude || 0.0;

        /**
         * Polyline thickness in screen pixels.
         * @public
         * @type {number}
         */
        this.thickness = options.thickness || 1.5;

        /**
         * Polyline RGBA color.
         * @public
         * @type {Array<Number,Number,Number,Number>}
         */
        this._defaultColor = htmlColorToFloat32Array(
            options.color || DEFAULT_COLOR,
            options.opacity
        ); // utils.createColorRGBA(options.color, new Vec4(1.0, 1.0, 1.0, 1.0));

        /**
         * Polyline visibility.
         * @public
         * @type {boolean}
         */
        this.visibility = options.visibility != undefined ? options.visibility : true;

        /**
         * Polyline geometry ring type identificator.
         * @protected
         * @type {Boolean}
         */
        this._closedLine = options.isClosed || false;

        /**
         * Polyline cartesian coordinates.
         * @private
         * @type {Array.<og.Vec3>}
         */
        this._path3v = [];

        this._pathLengths = [];

        /**
         * Polyline geodetic degrees coordiantes.
         * @private
         * @type {Array.<og.LonLat>}
         */
        this._pathLonLat = [];

        /**
         * Polyline geodetic mercator coordinates.
         * @private
         * @type {Array.<og.LonLat>}
         */
        this._pathLonLatMerc = [];

        this._pathColors = options.pathColors ? cloneArray(options.pathColors) : [];

        /**
         * Polyline geodetic extent.
         * @protected
         * @type {og.Extent}
         */
        this._extent = new Extent();

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];

        this._verticesHighBuffer = null;
        this._verticesLowBuffer = null;
        this._ordersBuffer = null;
        this._indexesBuffer = null;
        this._colorsBuffer = null;

        this._pickingColor = [0, 0, 0];

        this._renderNode = null;

        /**
         * Entity instance that holds this Polyline.
         * @private
         * @type {og.Entity}
         */
        this._entity = null;

        /**
         * Handler that stores and renders this Polyline object.
         * @private
         * @type {og.PolylineHandler}
         */
        this._handler = null;
        this._handlerIndex = -1;

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[VERTICES_BUFFER] = this._createVerticesBuffer;
        this._buffersUpdateCallbacks[INDEX_BUFFER] = this._createIndexBuffer;
        this._buffersUpdateCallbacks[COLORS_BUFFER] = this._createColorsBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        // create path
        if (options.pathLonLat) {
            this.setPathLonLat(options.pathLonLat);
        } else if (options.path3v) {
            this.setPath3v(options.path3v);
        }

        this._refresh();
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    /**
     * Appends to the line array new cartesian coordinates line data.
     * @param {Array.<Array.<number, number, number>>} path3v - Line coordinates path array.
     * @param {Boolean} isClosed - Identificator for the closed line data creation.
     * @param {Number[]} outVertices - Out vertices data array.
     * @param {Number[]} outOrders - Out vertices orders data array.
     * @param {Number[]} outIndexes - Out vertices indexes data array.
     * @param {og.Ellipsoid} [ellipsoid] - Ellipsoid to coordinates transformation.
     * @param {Array.<Array.<og.LonLat>>} [outTransformedPathLonLat] - Geodetic coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} [outPath3v] - Cartesian coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} [outTransformedPathMerc] - Mercator coordinates out array.
     * @param {og.Extent} [outExtent] - Geodetic line extent.
     * @param {Array} [outColors] - Geodetic line extent.
     * @static
     */
    static appendLineData3v(
        path3v,
        pathColors,
        defaultColor,
        isClosed,
        outVerticesHigh,
        outVerticesLow,
        outOrders,
        outIndexes,
        ellipsoid,
        outTransformedPathLonLat,
        outPath3v,
        outTransformedPathMerc,
        outExtent,
        outColors
    ) {
        var index = 0;

        var v_high = new Vec3(),
            v_low = new Vec3();

        if (outExtent) {
            outExtent.southWest.set(180.0, 90.0);
            outExtent.northEast.set(-180.0, -90.0);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        for (var j = 0, len = path3v.length; j < len; j++) {
            var path = path3v[j],
                pathColors_j = pathColors[j];

            outTransformedPathLonLat[j] = [];
            outTransformedPathMerc[j] = [];
            outPath3v[j] = [];

            if (path.length === 0) {
                continue;
            }

            var startIndex = index;

            var last;

            if (isClosed) {
                last = path[path.length - 1];
                if (last instanceof Array) {
                    last = new Vec3(last[0], last[1], last[2]);
                }
            } else {
                var p0 = path[0],
                    p1 = path[1] || p0;
                if (p0 instanceof Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1 instanceof Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            let color = defaultColor;

            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            Vec3.doubleToTwoFloats(last, v_high, v_low);
            outVerticesHigh.push(
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z
            );
            outVerticesLow.push(
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z
            );

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            outOrders.push(1, -1, 2, -2);

            for (let i = 0, len = path.length; i < len; i++) {
                var cur = path[i];

                if (cur instanceof Array) {
                    cur = new Vec3(cur[0], cur[1], cur[2]);
                }

                outPath3v[j].push(cur);

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur);
                    outTransformedPathLonLat[j].push(lonLat);
                    outTransformedPathMerc[j].push(lonLat.forwardMercator());

                    if (lonLat.lon < outExtent.southWest.lon) {
                        outExtent.southWest.lon = lonLat.lon;
                    }
                    if (lonLat.lat < outExtent.southWest.lat) {
                        outExtent.southWest.lat = lonLat.lat;
                    }
                    if (lonLat.lon > outExtent.northEast.lon) {
                        outExtent.northEast.lon = lonLat.lon;
                    }
                    if (lonLat.lat > outExtent.northEast.lat) {
                        outExtent.northEast.lat = lonLat.lat;
                    }
                }

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;

                Vec3.doubleToTwoFloats(cur, v_high, v_low);
                outVerticesHigh.push(
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z
                );
                outVerticesLow.push(
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z
                );

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);

                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);
            }

            var first;
            if (isClosed) {
                first = path[0];
                if (first instanceof Array) {
                    first = new Vec3(first[0], first[1], first[2]);
                }
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0 = path[path.length - 1],
                    p1 = path[path.length - 2] || p0;
                if (p0 instanceof Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1 instanceof Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            Vec3.doubleToTwoFloats(first, v_high, v_low);
            outVerticesHigh.push(
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z
            );
            outVerticesLow.push(
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z
            );

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);

            outOrders.push(1, -1, 2, -2);

            if (j < path3v.length - 1 && path3v[j + 1].length !== 0) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    /**
     * Appends to the line new cartesian coordinates point data.
     * @param {Array.<Array.<number, number, number>>} path3v - Line coordinates path array.
     * @param {Boolean} isClosed - Identificator for the closed line data creation.
     * @param {Number[]} outVertices - Out vertices data array.
     * @param {Number[]} outOrders - Out vertices orders data array.
     * @param {Number[]} outIndexes - Out vertices indexes data array.
     * @param {og.Ellipsoid} [ellipsoid] - Ellipsoid to coordinates transformation.
     * @param {Array.<Array.<og.LonLat>>} [outTransformedPathLonLat] - Geodetic coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} [outPath3v] - Cartesian coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} [outTransformedPathMerc] - Mercator coordinates out array.
     * @param {og.Extent} [outExtent] - Geodetic line extent.
     * @static
     */
    static appendPoint3v(
        path3v,
        point3v,
        pathColors,
        color,
        isClosed,
        outVerticesHigh,
        outVerticesLow,
        outColors,
        outOrders,
        outIndexes,
        ellipsoid,
        outTransformedPathLonLat,
        outTransformedPathMerc,
        outExtent
    ) {
        var v_high = new Vec3(),
            v_low = new Vec3();

        var ii = outIndexes.length - 4,
            index = outIndexes[ii - 1] + 1;

        if (path3v.length === 0) {
            path3v.push([]);
            if (!pathColors[0]) {
                pathColors[0] = [];
            }
        } else if (!pathColors[path3v.length - 1]) {
            pathColors[path3v.length - 1] = [];
        }

        var path = path3v[path3v.length - 1],
            len = path.length;

        path.push(point3v);

        let r = color[R],
            g = color[G],
            b = color[B],
            a = color[A] != undefined ? color[A] : 1.0,
            pathColors_last = pathColors[path3v.length - 1];

        if (pathColors_last[len]) {
            pathColors_last[len][R] = r;
            pathColors_last[len][G] = g;
            pathColors_last[len][B] = b;
            pathColors_last[len][A] = a;
        } else {
            pathColors_last.push(color);
        }

        if (len === 1) {
            var last;
            if (isClosed) {
                last = path[len - 1];
                if (last instanceof Array) {
                    last = new Vec3(last[0], last[1], last[2]);
                }
            } else {
                var p0 = path[0],
                    p1 = path[1] || p0;
                if (p0 instanceof Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1 instanceof Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            Vec3.doubleToTwoFloats(last, v_high, v_low);

            let vi = outVerticesHigh.length - 3 * 12;

            outVerticesHigh[vi] = v_high.x;
            outVerticesHigh[vi + 1] = v_high.y;
            outVerticesHigh[vi + 2] = v_high.z;
            outVerticesHigh[vi + 3] = v_high.x;
            outVerticesHigh[vi + 4] = v_high.y;
            outVerticesHigh[vi + 5] = v_high.z;
            outVerticesHigh[vi + 6] = v_high.x;
            outVerticesHigh[vi + 7] = v_high.y;
            outVerticesHigh[vi + 8] = v_high.z;
            outVerticesHigh[vi + 9] = v_high.x;
            outVerticesHigh[vi + 10] = v_high.y;
            outVerticesHigh[vi + 11] = v_high.z;

            outVerticesLow[vi] = v_low.x;
            outVerticesLow[vi + 1] = v_low.y;
            outVerticesLow[vi + 2] = v_low.z;
            outVerticesLow[vi + 3] = v_low.x;
            outVerticesLow[vi + 4] = v_low.y;
            outVerticesLow[vi + 5] = v_low.z;
            outVerticesLow[vi + 6] = v_low.x;
            outVerticesLow[vi + 7] = v_low.y;
            outVerticesLow[vi + 8] = v_low.z;
            outVerticesLow[vi + 9] = v_low.x;
            outVerticesLow[vi + 10] = v_low.y;
            outVerticesLow[vi + 11] = v_low.z;
        }

        var startIndex = index;

        if (ellipsoid) {
            if (outTransformedPathLonLat.length === 0) {
                outTransformedPathLonLat.push([]);
            }

            if (outTransformedPathMerc.length === 0) {
                outTransformedPathMerc.push([]);
            }

            var transformedPathLonLat =
                    outTransformedPathLonLat[outTransformedPathLonLat.length - 1],
                transformedPathMerc = outTransformedPathMerc[outTransformedPathMerc.length - 1];

            let lonLat = ellipsoid.cartesianToLonLat(point3v);
            transformedPathLonLat.push(lonLat);
            transformedPathMerc.push(lonLat.forwardMercator());

            if (lonLat.lon < outExtent.southWest.lon) {
                outExtent.southWest.lon = lonLat.lon;
            }
            if (lonLat.lat < outExtent.southWest.lat) {
                outExtent.southWest.lat = lonLat.lat;
            }
            if (lonLat.lon > outExtent.northEast.lon) {
                outExtent.northEast.lon = lonLat.lon;
            }
            if (lonLat.lat > outExtent.northEast.lat) {
                outExtent.northEast.lat = lonLat.lat;
            }
        }

        Vec3.doubleToTwoFloats(point3v, v_high, v_low);

        let vi = outVerticesHigh.length - 12;

        outVerticesHigh[vi] = v_high.x;
        outVerticesHigh[vi + 1] = v_high.y;
        outVerticesHigh[vi + 2] = v_high.z;
        outVerticesHigh[vi + 3] = v_high.x;
        outVerticesHigh[vi + 4] = v_high.y;
        outVerticesHigh[vi + 5] = v_high.z;
        outVerticesHigh[vi + 6] = v_high.x;
        outVerticesHigh[vi + 7] = v_high.y;
        outVerticesHigh[vi + 8] = v_high.z;
        outVerticesHigh[vi + 9] = v_high.x;
        outVerticesHigh[vi + 10] = v_high.y;
        outVerticesHigh[vi + 11] = v_high.z;

        outVerticesLow[vi] = v_low.x;
        outVerticesLow[vi + 1] = v_low.y;
        outVerticesLow[vi + 2] = v_low.z;
        outVerticesLow[vi + 3] = v_low.x;
        outVerticesLow[vi + 4] = v_low.y;
        outVerticesLow[vi + 5] = v_low.z;
        outVerticesLow[vi + 6] = v_low.x;
        outVerticesLow[vi + 7] = v_low.y;
        outVerticesLow[vi + 8] = v_low.z;
        outVerticesLow[vi + 9] = v_low.x;
        outVerticesLow[vi + 10] = v_low.y;
        outVerticesLow[vi + 11] = v_low.z;

        let ci = outColors.length - 16;

        outColors[ci] = r;
        outColors[ci + 1] = g;
        outColors[ci + 2] = b;
        outColors[ci + 3] = a;
        outColors[ci + 4] = r;
        outColors[ci + 5] = g;
        outColors[ci + 6] = b;
        outColors[ci + 7] = a;
        outColors[ci + 8] = r;
        outColors[ci + 9] = g;
        outColors[ci + 10] = b;
        outColors[ci + 11] = a;
        outColors[ci + 12] = r;
        outColors[ci + 13] = g;
        outColors[ci + 14] = b;
        outColors[ci + 15] = a;

        outIndexes[ii] = index++;
        outIndexes[ii + 1] = index++;
        outIndexes[ii + 2] = index++;
        outIndexes[ii + 3] = index++;

        //
        // Close path
        //
        var first;
        if (isClosed) {
            first = path[0];
            outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
        } else {
            let p0 = path[path.length - 1],
                p1 = path[path.length - 2] || p0;

            first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            outIndexes.push(index - 1, index - 1, index - 1, index - 1);
        }

        Vec3.doubleToTwoFloats(first, v_high, v_low);
        outVerticesHigh.push(
            v_high.x,
            v_high.y,
            v_high.z,
            v_high.x,
            v_high.y,
            v_high.z,
            v_high.x,
            v_high.y,
            v_high.z,
            v_high.x,
            v_high.y,
            v_high.z
        );
        outVerticesLow.push(
            v_low.x,
            v_low.y,
            v_low.z,
            v_low.x,
            v_low.y,
            v_low.z,
            v_low.x,
            v_low.y,
            v_low.z,
            v_low.x,
            v_low.y,
            v_low.z
        );

        outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);

        outOrders.push(1, -1, 2, -2);
    }

    /**
     * Appends to the line array new geodetic coordinates line data.
     * @param {Array.<Array.<number, number, number>>} pathLonLat - Line geodetic coordinates path array.
     * @param {Boolean} isClosed - Identificator for the closed line data creation.
     * @param {Number[]} outVertices - Out vertices data array.
     * @param {Number[]} outOrders - Out vertices orders data array.
     * @param {Number[]} outIndexes - Out indexes data array.
     * @param {og.Ellipsoid} ellipsoid - Ellipsoid to coordinates transformation.
     * @param {Array.<Array.<Number, Number, Number>>} outTransformedPathCartesian - Cartesian coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} outPathLonLat - Geographic coordinates out array.
     * @param {Array.<Array.<og.LonLat>>} outTransformedPathMerc - Mercator coordinates out array.
     * @param {og.Extent} outExtent - Geodetic line extent.
     * @static
     */
    static appendLineDataLonLat(
        pathLonLat,
        pathColors,
        defaultColor,
        isClosed,
        outVerticesHigh,
        outVerticesLow,
        outOrders,
        outIndexes,
        ellipsoid,
        outTransformedPathCartesian,
        outPathLonLat,
        outTransformedPathMerc,
        outExtent,
        outColors
    ) {
        var index = 0;

        var v_high = new Vec3(),
            v_low = new Vec3();

        if (outExtent) {
            outExtent.southWest.set(180.0, 90.0);
            outExtent.northEast.set(-180.0, -90.0);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        for (var j = 0, len = pathLonLat.length; j < len; j++) {
            var path = pathLonLat[j],
                pathColors_j = pathColors[j];

            outTransformedPathCartesian[j] = [];
            outTransformedPathMerc[j] = [];
            outPathLonLat[j] = [];

            if (path.length === 0) {
                continue;
            }

            var startIndex = index;

            var last;

            if (isClosed) {
                let pp = path[path.length - 1];
                if (pp instanceof Array) {
                    last = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    last = ellipsoid.lonLatToCartesian(pp);
                }
            } else {
                let p0, p1;
                let pp = path[0];
                if (pp instanceof Array) {
                    p0 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p0 = ellipsoid.lonLatToCartesian(pp);
                }

                pp = path[1];

                if (!pp) {
                    pp = path[0];
                }

                if (pp instanceof Array) {
                    p1 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p1 = ellipsoid.lonLatToCartesian(pp);
                }

                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            let color = defaultColor;

            if (pathColors_j && pathColors_j[0]) {
                color = pathColors_j[0];
            }

            Vec3.doubleToTwoFloats(last, v_high, v_low);
            outVerticesHigh.push(
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z
            );
            outVerticesLow.push(
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z
            );

            let r = color[R],
                g = color[G],
                b = color[B],
                a = color[A] != undefined ? color[A] : 1.0;

            if (j > 0) {
                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);
            }

            outOrders.push(1, -1, 2, -2);

            for (let i = 0, len = path.length; i < len; i++) {
                var cur = path[i];

                if (cur instanceof Array) {
                    cur = new LonLat(cur[0], cur[1], cur[2]);
                }

                if (pathColors_j && pathColors_j[i]) {
                    color = pathColors_j[i];
                }

                r = color[R];
                g = color[G];
                b = color[B];
                a = color[A] != undefined ? color[A] : 1.0;

                var cartesian = ellipsoid.lonLatToCartesian(cur);
                outTransformedPathCartesian[j].push(cartesian);
                outPathLonLat[j].push(cur);
                outTransformedPathMerc[j].push(cur.forwardMercator());

                Vec3.doubleToTwoFloats(cartesian, v_high, v_low);
                outVerticesHigh.push(
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z,
                    v_high.x,
                    v_high.y,
                    v_high.z
                );
                outVerticesLow.push(
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z,
                    v_low.x,
                    v_low.y,
                    v_low.z
                );

                outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);

                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);

                if (cur.lon < outExtent.southWest.lon) {
                    outExtent.southWest.lon = cur.lon;
                }
                if (cur.lat < outExtent.southWest.lat) {
                    outExtent.southWest.lat = cur.lat;
                }
                if (cur.lon > outExtent.northEast.lon) {
                    outExtent.northEast.lon = cur.lon;
                }
                if (cur.lat > outExtent.northEast.lat) {
                    outExtent.northEast.lat = cur.lat;
                }
            }

            var first;
            if (isClosed) {
                let pp = path[0];
                if (pp instanceof Array) {
                    first = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    first = ellipsoid.lonLatToCartesian(pp);
                }
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0, p1;
                let pp = path[path.length - 1];
                if (pp instanceof Array) {
                    p0 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p0 = ellipsoid.lonLatToCartesian(pp);
                }

                pp = path[path.length - 2];

                if (!pp) {
                    pp = path[0];
                }

                if (pp instanceof Array) {
                    p1 = ellipsoid.lonLatToCartesian(new LonLat(pp[0], pp[1], pp[2]));
                } else {
                    p1 = ellipsoid.lonLatToCartesian(pp);
                }
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            if (pathColors_j && pathColors_j[path.length - 1]) {
                color = pathColors_j[path.length - 1];
            }

            r = color[R];
            g = color[G];
            b = color[B];
            a = color[A] != undefined ? color[A] : 1.0;

            Vec3.doubleToTwoFloats(first, v_high, v_low);
            outVerticesHigh.push(
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z,
                v_high.x,
                v_high.y,
                v_high.z
            );
            outVerticesLow.push(
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z,
                v_low.x,
                v_low.y,
                v_low.z
            );

            outColors.push(r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a);

            outOrders.push(1, -1, 2, -2);

            if (j < pathLonLat.length - 1 && pathLonLat[j + 1].length !== 0) {
                index += 8;
                outIndexes.push(index, index);
            }
        }
    }

    /**
     * Sets polyline path with cartesian coordinates.
     * @protected
     * @param {pg.math.Vector3[]} path3v - Cartesian coordinates.
     */
    _setEqualPath3v(path3v) {
        var extent = this._extent;
        extent.southWest.set(180, 90);
        extent.northEast.set(-180, -90);

        var v_high = new Vec3(),
            v_low = new Vec3();

        var vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            k = 0;

        var ellipsoid = this._renderNode.ellipsoid;

        for (var j = 0; j < path3v.length; j++) {
            var path = path3v[j];

            var last;
            if (this._closedLine) {
                last = path[path.length - 1];
            } else {
                last = new Vec3(
                    path[0].x + path[0].x - path[1].x,
                    path[0].y + path[0].y - path[1].y,
                    path[0].z + path[0].z - path[1].z
                );
            }

            Vec3.doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            for (var i = 0; i < path.length; i++) {
                var cur = path[i],
                    pji = this._path3v[j][i];

                pji.x = cur.x;
                pji.y = cur.y;
                pji.z = cur.z;

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur);

                    this._pathLonLat[j][i] = lonLat;

                    l[j][i] = lonLat;
                    m[j][i] = lonLat.forwardMercator();

                    if (lonLat.lon < extent.southWest.lon) {
                        extent.southWest.lon = lonLat.lon;
                    }
                    if (lonLat.lat < extent.southWest.lat) {
                        extent.southWest.lat = lonLat.lat;
                    }
                    if (lonLat.lon > extent.northEast.lon) {
                        extent.northEast.lon = lonLat.lon;
                    }
                    if (lonLat.lat > extent.northEast.lat) {
                        extent.northEast.lat = lonLat.lat;
                    }
                }

                Vec3.doubleToTwoFloats(cur, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
            }

            var first;
            if (this._closedLine) {
                first = path[0];
            } else {
                var l1 = path.length - 1;
                first = new Vec3(
                    path[l1].x + path[l1].x - path[l1 - 1].x,
                    path[l1].y + path[l1].y - path[l1 - 1].y,
                    path[l1].z + path[l1].z - path[l1 - 1].z
                );
            }

            Vec3.doubleToTwoFloats(first, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }
    }

    /**
     * Sets polyline with geodetic coordinates.
     * @protected
     * @param {og.LonLat[]} pathLonLat - Geodetic polyline path coordinates.
     */
    _setEqualPathLonLat(pathLonLat) {
        var extent = this._extent;
        extent.southWest.set(180.0, 90.0);
        extent.northEast.set(-180.0, -90.0);

        var v_high = new Vec3(),
            v_low = new Vec3();

        var vh = this._verticesHigh,
            vl = this._verticesLow,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            c = this._path3v,
            k = 0;

        var ellipsoid = this._renderNode.ellipsoid;

        for (var j = 0; j < pathLonLat.length; j++) {
            var path = pathLonLat[j];

            var last;
            if (this._closedLine) {
                last = ellipsoid.lonLatToCartesian(path[path.length - 1]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[0]),
                    p1 = ellipsoid.lonLatToCartesian(path[1]);
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            Vec3.doubleToTwoFloats(last, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;

            for (var i = 0; i < path.length; i++) {
                var cur = path[i];
                var cartesian = ellipsoid.lonLatToCartesian(cur);
                c[j][i] = cartesian;
                m[j][i] = cur.forwardMercator();
                l[j][i] = cur;

                Vec3.doubleToTwoFloats(cartesian, v_high, v_low);

                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;
                vh[k] = v_high.x;
                vl[k++] = v_low.x;
                vh[k] = v_high.y;
                vl[k++] = v_low.y;
                vh[k] = v_high.z;
                vl[k++] = v_low.z;

                if (cur.lon < extent.southWest.lon) {
                    extent.southWest.lon = cur.lon;
                }
                if (cur.lat < extent.southWest.lat) {
                    extent.southWest.lat = cur.lat;
                }
                if (cur.lon > extent.northEast.lon) {
                    extent.northEast.lon = cur.lon;
                }
                if (cur.lat > extent.northEast.lat) {
                    extent.northEast.lat = cur.lat;
                }
            }

            var first;
            if (this._closedLine) {
                first = ellipsoid.lonLatToCartesian(path[0]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[path.length - 1]),
                    p1 = ellipsoid.lonLatToCartesian(path[path.length - 2]);
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            Vec3.doubleToTwoFloats(first, v_high, v_low);

            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
            vh[k] = v_high.x;
            vl[k++] = v_low.x;
            vh[k] = v_high.y;
            vl[k++] = v_low.y;
            vh[k] = v_high.z;
            vl[k++] = v_low.z;
        }
    }

    setPointLonLat(lonlat, index, segmentIndex) {
        if (this._renderNode && this._renderNode.ellipsoid) {
            let l = this._pathLonLat,
                m = this._pathLonLatMerc;

            l[segmentIndex][index] = lonlat;
            m[segmentIndex][index] = lonlat.forwardMercator();

            //
            // Apply new extent(TODO: think about optimization)
            //
            var extent = this._extent;
            extent.southWest.set(180.0, 90.0);
            extent.northEast.set(-180.0, -90.0);
            for (var i = 0; i < l.length; i++) {
                var pi = l[i];
                for (var j = 0; j < pi.length; j++) {
                    var lon = pi[j].lon,
                        lat = pi[j].lat;
                    if (lon > extent.northEast.lon) {
                        extent.northEast.lon = lon;
                    }
                    if (lat > extent.northEast.lat) {
                        extent.northEast.lat = lat;
                    }
                    if (lon < extent.southWest.lon) {
                        extent.southWest.lon = lon;
                    }
                    if (lat < extent.southWest.lat) {
                        extent.southWest.lat = lat;
                    }
                }
            }

            this.setPoint3v(
                this._renderNode.ellipsoid.lonLatToCartesian(lonlat),
                index,
                segmentIndex,
                true
            );
        } else {
            let path = this._pathLonLat[segmentIndex];
            path[index].lon = lonlat.lon;
            path[index].lat = lonlat.lat;
            path[index].height = lonlat.height;
        }
    }

    setPoint3v(coordinates, index, segmentIndex, skipLonLat) {
        segmentIndex = segmentIndex || 0;

        if (this._renderNode) {
            var v_high = new Vec3(),
                v_low = new Vec3();

            var vh = this._verticesHigh,
                vl = this._verticesLow,
                l = this._pathLonLat,
                m = this._pathLonLatMerc,
                k = 0,
                kk = 0;

            //for (var i = 0; i < segmentIndex; i++) {
            //    kk += this._path3v[i].length * 12 + 24;
            //}
            kk = this._pathLengths[segmentIndex] * 12 + 24 * segmentIndex;

            let path = this._path3v[segmentIndex];

            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;

            let _closedLine = this._closedLine || path.length === 1;

            if (index === 0 || index === 1) {
                var last;
                if (_closedLine) {
                    last = path[path.length - 1];
                } else {
                    last = new Vec3(
                        path[0].x + path[0].x - path[1].x,
                        path[0].y + path[0].y - path[1].y,
                        path[0].z + path[0].z - path[1].z
                    );
                }

                k = kk;

                Vec3.doubleToTwoFloats(last, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            if (!skipLonLat && this._renderNode.ellipsoid) {
                var lonLat = this._renderNode.ellipsoid.cartesianToLonLat(coordinates);
                l[segmentIndex][index] = lonLat;
                m[segmentIndex][index] = lonLat.forwardMercator();

                //
                // Apply new extent(TODO: think about optimization)
                //
                var extent = this._extent;
                extent.southWest.set(180.0, 90.0);
                extent.northEast.set(-180.0, -90.0);
                for (let i = 0; i < l.length; i++) {
                    var pi = l[i];
                    for (var j = 0; j < pi.length; j++) {
                        var lon = pi[j].lon,
                            lat = pi[j].lat;
                        if (lon > extent.northEast.lon) {
                            extent.northEast.lon = lon;
                        }
                        if (lat > extent.northEast.lat) {
                            extent.northEast.lat = lat;
                        }
                        if (lon < extent.southWest.lon) {
                            extent.southWest.lon = lon;
                        }
                        if (lat < extent.southWest.lat) {
                            extent.southWest.lat = lat;
                        }
                    }
                }
            }

            k = kk + index * 12 + 12;

            Vec3.doubleToTwoFloats(coordinates, v_high, v_low);

            vh[k] = v_high.x;
            vh[k + 1] = v_high.y;
            vh[k + 2] = v_high.z;
            vh[k + 3] = v_high.x;
            vh[k + 4] = v_high.y;
            vh[k + 5] = v_high.z;
            vh[k + 6] = v_high.x;
            vh[k + 7] = v_high.y;
            vh[k + 8] = v_high.z;
            vh[k + 9] = v_high.x;
            vh[k + 10] = v_high.y;
            vh[k + 11] = v_high.z;

            vl[k] = v_low.x;
            vl[k + 1] = v_low.y;
            vl[k + 2] = v_low.z;
            vl[k + 3] = v_low.x;
            vl[k + 4] = v_low.y;
            vl[k + 5] = v_low.z;
            vl[k + 6] = v_low.x;
            vl[k + 7] = v_low.y;
            vl[k + 8] = v_low.z;
            vl[k + 9] = v_low.x;
            vl[k + 10] = v_low.y;
            vl[k + 11] = v_low.z;

            if (index === path.length - 1 || index === path.length - 2) {
                var first;
                if (_closedLine) {
                    first = path[0];
                } else {
                    var l1 = path.length - 1;
                    first = new Vec3(
                        path[l1].x + path[l1].x - path[l1 - 1].x,
                        path[l1].y + path[l1].y - path[l1 - 1].y,
                        path[l1].z + path[l1].z - path[l1 - 1].z
                    );
                }

                k = kk + path.length * 12 + 12;

                Vec3.doubleToTwoFloats(first, v_high, v_low);

                vh[k] = v_high.x;
                vh[k + 1] = v_high.y;
                vh[k + 2] = v_high.z;
                vh[k + 3] = v_high.x;
                vh[k + 4] = v_high.y;
                vh[k + 5] = v_high.z;
                vh[k + 6] = v_high.x;
                vh[k + 7] = v_high.y;
                vh[k + 8] = v_high.z;
                vh[k + 9] = v_high.x;
                vh[k + 10] = v_high.y;
                vh[k + 11] = v_high.z;

                vl[k] = v_low.x;
                vl[k + 1] = v_low.y;
                vl[k + 2] = v_low.z;
                vl[k + 3] = v_low.x;
                vl[k + 4] = v_low.y;
                vl[k + 5] = v_low.z;
                vl[k + 6] = v_low.x;
                vl[k + 7] = v_low.y;
                vl[k + 8] = v_low.z;
                vl[k + 9] = v_low.x;
                vl[k + 10] = v_low.y;
                vl[k + 11] = v_low.z;
            }

            this._changedBuffers[VERTICES_BUFFER] = true;
        } else {
            let path = this._path3v[segmentIndex];
            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;
        }
    }

    _resizePathLengths(index = 0) {
        this._pathLengths[0] = 0;
        for (let i = index + 1, len = this._path3v.length; i <= len; i++) {
            this._pathLengths[i] = this._pathLengths[i - 1] + this._path3v[i - 1].length;
        }
    }

    removeSegment(index) {
        this._path3v.splice(index, 1);
        this.setPath3v([].concat(this._path3v));
    }

    removePoint(index, multiLineIndex = 0) {
        this._path3v[multiLineIndex].splice(index, 1);
        if (this._path3v[multiLineIndex].length === 0) {
            this._path3v.splice(multiLineIndex, 1);
        }
        this.setPath3v([].concat(this._path3v));
    }

    insertPoint3v(point3v, index = 0, color, multilineIndex = 0) {
        let p = [].concat(this._path3v),
            pp = p[multilineIndex];
        if (pp) {
            let c = [].concat(this._pathColors);

            pp.splice(index, 0, point3v);

            if (color) {
                let cc = c[multilineIndex];
                if (!cc) {
                    cc = new Array(pp.length);
                }
                cc.splice(index, 0, color);
            }

            this.setPath3v(p, c);
        } else {
            this.addPoint3v(point3v, multilineIndex);
        }
    }

    /**
     * Adds a new cartesian point in the end of the path in a last line segment.
     * @public
     * @param {og.Vec3} point3v - New coordinate.
     */
    appendPoint3v(point3v, color, skipEllipsoid) {
        if (this._path3v.length === 0) {
            this._pathColors.push([color || this._defaultColor]);
            this.addPoint3v(point3v);
        } else {
            //
            // Making typedArrays suitable for appendPoint function
            //
            this._verticesHigh = makeArray(this._verticesHigh);
            this._verticesLow = makeArray(this._verticesLow);
            this._colors = makeArray(this._colors);
            this._orders = makeArray(this._orders);
            this._indexes = makeArray(this._indexes);

            Polyline.appendPoint3v(
                this._path3v,
                point3v,
                this._pathColors,
                color || this._defaultColor,
                this._closedLine,
                this._verticesHigh,
                this._verticesLow,
                this._colors,
                this._orders,
                this._indexes,
                !skipEllipsoid && this._renderNode.ellipsoid,
                this._pathLonLat,
                this._pathLonLatMerc,
                this._extent
            );

            this._pathLengths[this._path3v.length] += 1;

            this._changedBuffers[VERTICES_BUFFER] = true;
            this._changedBuffers[COLORS_BUFFER] = true;
            this._changedBuffers[INDEX_BUFFER] = true;
        }
    }

    /**
     * Adds a new cartesian point in the end of the path.
     * @public
     * @param {og.Vec3} point3v - New coordinate.
     * @param {number} [multiLineIndex=0] - Path part index, first by default.
     */
    addPoint3v(point3v, multiLineIndex = 0) {
        //
        // TODO: could be optimized
        //
        if (multiLineIndex >= this._path3v.length) {
            this._path3v.push([]);
        }
        this._path3v[multiLineIndex].push(point3v);
        this.setPath3v([].concat(this._path3v));
    }

    /**
     * Adds a new geodetic point in the end of the path.
     * @public
     * @param {og.LonLat} lonLat - New coordinate.
     * @param {number} [multiLineIndex=0] - Path part index, first by default.
     */
    addPointLonLat(lonLat, multiLineIndex = 0) {
        //
        // TODO: could be optimized
        //
        if (multiLineIndex >= this._pathLonLat.length) {
            this._pathLonLat.push([]);
        }
        this._pathLonLat[multiLineIndex].push(lonLat);
        this.setPathLonLat([].concat(this._pathLonLat));
    }

    /**
     * Clear Polyline object data.
     * @public
     */
    clear() {
        this._clearData();
    }

    setPointColor(color, index = 0, segmentIndex = 0) {
        if (this._renderNode && index < this._path3v[segmentIndex].length) {
            let colors = this._pathColors[segmentIndex];

            if (!colors) {
                if (this._path3v[segmentIndex] && index < this._path3v[segmentIndex].length) {
                    this._pathColors[segmentIndex] = new Array(this._path3v[segmentIndex].length);
                } else {
                    return;
                }
            }

            if (!colors[index]) {
                colors[index] = [color[R], color[G], color[B], color[A] || 1.0];
            } else {
                colors[index][R] = color[R];
                colors[index][G] = color[G];
                colors[index][B] = color[B];
                colors[index][A] = color[A] || 1.0;
            }

            let c = this._colors;

            //optimized with this._pathLengths
            //for (var i = 0; i < segmentIndex; i++) {
            //    kk += this._path3v[i].length * 16 + 32;
            //}

            let k = index * 16 + this._pathLengths[segmentIndex] * 16 + 32 * segmentIndex;

            c[k] = c[k + 4] = c[k + 8] = c[k + 12] = color[R];
            c[k + 1] = c[k + 5] = c[k + 9] = c[k + 13] = color[G];
            c[k + 2] = c[k + 6] = c[k + 10] = c[k + 14] = color[B];
            c[k + 3] = c[k + 7] = c[k + 11] = c[k + 15] = color[A] || 1.0;

            this._changedBuffers[COLORS_BUFFER] = true;
        } else {
            let pathColors = this._pathColors[segmentIndex];
            pathColors[index] = color;
        }
    }

    /**
     * Sets Polyline opacity.
     * @public
     * @param {number} opacity - Opacity.
     */
    setOpacity(opacity) {
        this.color.w = opacity;
    }

    /**
     * Sets Polyline thickness in screen pixels.
     * @public
     * @param {number} thickness - Thickness.
     */
    setThickness(thickness) {
        this.thickness = thickness;
    }

    /**
     * Returns thickness.
     * @public
     * @return {number} Thickness in screen pixels.
     */
    getThickness() {
        return this.thickness;
    }

    /**
     * Sets visibility.
     * @public
     * @param {boolean} visibility - Polyline visibility.
     */
    setVisibility(visibility) {
        this.visibility = visibility;
    }

    /**
     * Gets Polyline visibility.
     * @public
     * @return {boolean} Polyline visibility.
     */
    getVisibility() {
        return this.visibility;
    }

    /**
     * Assign with render node.
     * @public
     * @param {og.scene.RenderNode} renderNode -
     */
    setRenderNode(renderNode) {
        if (renderNode) {
            this._renderNode = renderNode;
            if (this._pathLonLat.length) {
                this._createDataLonLat([].concat(this._pathLonLat));
            } else {
                this._createData3v([].concat(this._path3v));
            }
            this._refresh();
            this._update();
        }
    }

    /**
     * @protected
     */
    _clearData() {
        this._verticesHigh = null;
        this._verticesLow = null;
        this._orders = null;
        this._indexes = null;
        this._colors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];

        this._path3v.length = 0;
        this._pathLonLat.length = 0;
        this._pathLonLatMerc.length = 0;

        this._path3v = [];
        this._pathLonLat = [];
        this._pathLonLatMerc = [];
    }

    _createData3v(path3v) {
        this._clearData();
        Polyline.appendLineData3v(
            path3v,
            this._pathColors,
            this._defaultColor,
            this._closedLine,
            this._verticesHigh,
            this._verticesLow,
            this._orders,
            this._indexes,
            this._renderNode.ellipsoid,
            this._pathLonLat,
            this._path3v,
            this._pathLonLatMerc,
            this._extent,
            this._colors
        );
        this._resizePathLengths(0);
    }

    _createDataLonLat(pathLonlat) {
        this._clearData();
        Polyline.appendLineDataLonLat(
            pathLonlat,
            this._pathColors,
            this._defaultColor,
            this._closedLine,
            this._verticesHigh,
            this._verticesLow,
            this._orders,
            this._indexes,
            this._renderNode.ellipsoid,
            this._path3v,
            this._pathLonLat,
            this._pathLonLatMerc,
            this._extent,
            this._colors
        );
        this._resizePathLengths(0);
    }

    /**
     * Removes from an entity.
     * @public
     */
    remove() {
        this._entity = null;

        this._pathColors.length = 0;
        this._pathColors = [];

        this._verticesHigh = null;
        this._verticesLow = null;
        this._orders = null;
        this._indexes = null;
        this._colors = null;

        this._verticesHigh = [];
        this._verticesLow = [];
        this._orders = [];
        this._indexes = [];
        this._colors = [];

        this._deleteBuffers();

        this._handler && this._handler.remove(this);
    }

    setPickingColor3v(color) {
        this._pickingColor[0] = color.x / 255.0;
        this._pickingColor[1] = color.y / 255.0;
        this._pickingColor[2] = color.z / 255.0;
    }

    /**
     * Returns polyline geodetic extent.
     * @public
     * @returns {og.Extent} - Geodetic extent
     */
    getExtent() {
        return this._extent.clone();
    }

    /**
     * Returns path cartesian coordinates.
     * @return {Array.<og.Vec3>} Polyline path.
     */
    getPath3v() {
        return this._path3v;
    }

    /**
     * Returns geodetic path coordinates.
     * @return {Array.<og.LonLat>} Polyline path.
     */
    getPathLonLat() {
        return this._pathLonLat;
    }

    getPathColors() {
        return this._pathColors;
    }

    setPathColors(pathColors) {
        if (this._renderNode) {
            // ...
        }
    }

    setColorHTML(htmlColor) {
        this._defaultColor = htmlColorToFloat32Array(htmlColor);

        let color = htmlColorToRgba(htmlColor),
            p = this._pathColors;

        for (let i = 0, len = p.length; i < len; i++) {
            let s = p[i];
            for (let j = 0, slen = s.length; j < slen; j++) {
                s[j][0] = color.x;
                s[j][1] = color.y;
                s[j][2] = color.z;
                s[j][3] = color.w;
            }
        }

        let c = this._colors;
        for (let i = 0, len = c.length; i < len; i += 4) {
            c[i] = color.x;
            c[i + 1] = color.y;
            c[i + 2] = color.z;
            c[i + 3] = color.w;
        }

        this._changedBuffers[COLORS_BUFFER] = true;
    }

    /**
     * Sets geodetic coordinates.
     * @public
     * @param {Array.<Array.<number,number,number>>} pathLonLat - Polyline path cartesian coordinates.
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    setPathLonLat(pathLonLat, forceEqual) {
        if (this._renderNode && this._renderNode.ellipsoid) {
            if (forceEqual) {
                this._setEqualPathLonLat(pathLonLat);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
            } else {
                this._createDataLonLat(pathLonLat);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
            }
        } else {
            this._pathLonLat = [].concat(pathLonLat);
        }
    }

    /**
     * Sets Polyline cartesian coordinates.
     * @public
     * @param {Array.<Array.<number,number,number>>} path3v - Polyline path cartesian coordinates.
     * @param {Boolean} [forceEqual=false] - Makes assigning faster for size equal coordinates array.
     */
    setPath3v(path3v, pathColors, forceEqual) {
        if (pathColors) {
            this._pathColors = [].concat(pathColors);
        }

        if (this._renderNode) {
            if (forceEqual) {
                this._setEqualPath3v(path3v);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
            } else {
                this._createData3v(path3v);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
                this._changedBuffers[COLORS_BUFFER] = true;
            }
        } else {
            this._path3v = [].concat(path3v);
        }
    }

    draw() {
        if (this.visibility && this._path3v.length) {
            this._update();

            var rn = this._renderNode;
            var r = rn.renderer;
            var sh = r.handler.programs.polyline_screen;
            var p = sh._program;
            var gl = r.handler.gl,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.polygonOffset(
                this._handler._entityCollection.polygonOffsetFactor,
                this._handler._entityCollection.polygonOffsetUnits
            );

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(
                gl.SRC_ALPHA,
                gl.ONE_MINUS_SRC_ALPHA,
                gl.ONE,
                gl.ONE_MINUS_SRC_ALPHA
            );
            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera.getViewMatrix());

            // gl.uniform4fv(shu.color, [this.color.x, this.color.y, this.color.z, this.color.w * this._handler._entityCollection._fadingOpacity]);

            gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);

            gl.uniform2fv(shu.uFloatParams, [
                rn._planetRadius2 || 0.0,
                r.activeCamera._tanViewAngle_hradOneByHeight
            ]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas.width, r.handler.canvas.height]);
            gl.uniform1f(shu.thickness, this.thickness * 0.5);
            gl.uniform1f(shu.opacity, this._handler._entityCollection._fadingOpacity);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._colorsBuffer);
            gl.vertexAttribPointer(sha.color, this._colorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

            var v = this._verticesHighBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer.numItems, gl.UNSIGNED_INT, 0);
        }
    }

    drawPicking() {
        if (this.visibility && this._path3v.length) {
            var rn = this._renderNode;
            var r = rn.renderer;
            var sh = r.handler.programs.polyline_picking;
            var p = sh._program;
            var gl = r.handler.gl,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.polygonOffset(
                this._handler._entityCollection.polygonOffsetFactor,
                this._handler._entityCollection.polygonOffsetUnits
            );

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(
                gl.SRC_ALPHA,
                gl.ONE_MINUS_SRC_ALPHA,
                gl.ONE,
                gl.ONE_MINUS_SRC_ALPHA
            );
            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera.getProjectionMatrix());
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera.getViewMatrix());

            gl.uniform4fv(shu.color, [
                this._pickingColor[0],
                this._pickingColor[1],
                this._pickingColor[2],
                1.0
            ]);

            gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);

            gl.uniform2fv(shu.uFloatParams, [
                rn._planetRadius2 || 0.0,
                r.activeCamera._tanViewAngle_hradOneByHeight
            ]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas.width, r.handler.canvas.height]);
            gl.uniform1f(shu.thickness, this.thickness * 0.5);

            var v = this._verticesHighBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevHigh, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentHigh, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextHigh, v.itemSize, gl.FLOAT, false, 12, 96);

            v = this._verticesLowBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prevLow, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.currentLow, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.nextLow, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer.numItems, gl.UNSIGNED_INT, 0);
        }
    }

    /**
     * Refresh buffers.
     * @protected
     */
    _refresh() {
        var i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    /**
     * Updates render buffers.
     * @protected
     */
    _update() {
        if (this._renderNode) {
            var i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    /**
     * Clear GL buffers.
     * @protected
     */
    _deleteBuffers() {
        if (this._renderNode) {
            var r = this._renderNode.renderer,
                gl = r.handler.gl;

            gl.deleteBuffer(this._verticesHighBuffer);
            gl.deleteBuffer(this._verticesLowBuffer);
            gl.deleteBuffer(this._ordersBuffer);
            gl.deleteBuffer(this._indexesBuffer);
            gl.deleteBuffer(this._colorsBuffer);

            this._verticesHighBuffer = null;
            this._verticesLowBuffer = null;
            this._ordersBuffer = null;
            this._indexesBuffer = null;
            this._colorsBuffer = null;
        }
    }

    /**
     * Creates gl main data buffer.
     * @protected
     */
    _createVerticesBuffer() {
        var h = this._renderNode.renderer.handler;

        let numItems = this._verticesHigh.length / 3;

        if (!this._verticesHighBuffer || this._verticesHighBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._verticesHighBuffer);
            h.gl.deleteBuffer(this._verticesLowBuffer);
            this._verticesHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._verticesLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._verticesHigh = makeArrayTyped(this._verticesHigh);
        this._verticesLow = makeArrayTyped(this._verticesLow);

        h.setStreamArrayBuffer(this._verticesHighBuffer, this._verticesHigh);
        h.setStreamArrayBuffer(this._verticesLowBuffer, this._verticesLow);
    }

    /**
     * Creates gl index and order buffer.
     * @protected
     */
    _createIndexBuffer() {
        var h = this._renderNode.renderer.handler;
        h.gl.deleteBuffer(this._ordersBuffer);
        h.gl.deleteBuffer(this._indexesBuffer);

        this._orders = makeArrayTyped(this._orders);

        this._ordersBuffer = h.createArrayBuffer(this._orders, 1, this._orders.length / 2);

        this._indexes = makeArrayTyped(this._indexes, Uint32Array);

        this._indexesBuffer = h.createElementArrayBuffer(this._indexes, 1, this._indexes.length);
    }

    _createColorsBuffer() {
        var h = this._renderNode.renderer.handler;
        h.gl.deleteBuffer(this._colorsBuffer);

        this._colors = makeArrayTyped(this._colors);

        this._colorsBuffer = h.createArrayBuffer(
            new Float32Array(this._colors),
            4,
            this._colors.length / 4
        );
    }
}

export { Polyline };
