/**
 * @module og/entity/Polyline
 */

'use strict';

import * as utils from '../utils/shared.js';
import { Extent } from '../Extent.js';
import { LonLat } from '../LonLat.js';
import { Vec3 } from '../math/Vec3.js';
import { Vec4 } from '../math/Vec4.js';

const VERTICES_BUFFER = 0;
const INDEX_BUFFER = 1;

/**
 * Polyline object.
 * @class
 * @param {Object} [options] - Polyline options:
 * @param {number} [options.thickness] - Thickness in screen pixels 1.5 is default.
 * @param {og.Vec4} [options.color] - RGBA color.
 * @param {Boolean} [options.opacity] - Line opacity.
 * @param {Boolean} [options.visibility] - Polyline visibility. True default.
 * @param {Boolean} [options.isClosed] - Closed geometry type identificator.
 * @param {Array.<Array.<number,number,number>>} [options.pathLonLat] - Polyline geodetic coordinates array.
 * @param {Array.<Array.<number,number,number>>} [options.path3v] - LinesString cartesian coordinates array. Like path:[[0,0,0], [1,1,1],...]
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

        this.altitude = 0.0;

        /**
         * Polyline thickness in screen pixels.
         * @public
         * @type {number}
         */
        this.thickness = options.thickness || 1.5;

        /**
         * Polyline RGBA color.
         * @public
         * @type {og.Vec4}
         */
        this.color = utils.createColorRGBA(options.color, new Vec4(1.0, 1.0, 1.0, 1.0));

        this.color.w = options.opacity != undefined ? options.opacity : this.color.w;

        /**
         * Polyline visibility.
         * @public
         * @type {boolean}
         */
        this.visibility = (options.visibility != undefined ? options.visibility : true);

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

        /**
         * Polyline geodetic extent.
         * @protected
         * @type {og.Extent}
         */
        this._extent = new Extent();

        this._vertices = [];
        this._orders = [];
        this._indexes = [];

        this._verticesBuffer = null;
        this._ordersBuffer = null;
        this._indexesBuffer = null;

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

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        //create path
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
     * @param {og.Extent} outExtent - Geodetic line extent.
     * @static
     */
    static appendLineData3v(path3v, isClosed, outVertices, outOrders, outIndexes,
        ellipsoid, outTransformedPathLonLat, outPath3v, outTransformedPathMerc, outExtent) {

        var index = 0;

        if (outExtent) {
            outExtent.southWest.set(180, 90);
            outExtent.northEast.set(-180, -90);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        for (var j = 0; j < path3v.length; j++) {
            var path = path3v[j];

            if (path.length === 0) {
                continue;
            }

            outTransformedPathLonLat[j] = [];
            outTransformedPathMerc[j] = [];
            outPath3v[j] = [];

            var startIndex = index;

            var last;
            if (isClosed) {
                last = path[path.length - 1];
                if (last.constructor === Array) {
                    last = new Vec3(last[0], last[1], last[2]);
                }
            } else {
                var p0 = path[0],
                    p1 = path[1] || p0;
                if (p0.constructor === Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1.constructor === Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }
                last = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            outVertices.push(last.x, last.y, last.z, last.x, last.y, last.z, last.x, last.y, last.z, last.x, last.y, last.z);
            outOrders.push(1, -1, 2, -2);

            for (var i = 0; i < path.length; i++) {
                var cur = path[i];
                if (cur.constructor === Array) {
                    cur = new Vec3(cur[0], cur[1], cur[2]);
                }

                outPath3v[j].push(cur);

                if (ellipsoid) {
                    var lonLat = ellipsoid.cartesianToLonLat(cur);
                    outTransformedPathLonLat[j].push(lonLat);
                    outTransformedPathMerc[j].push(lonLat.forwardMercator());

                    if (lonLat.lon < outExtent.southWest.lon)
                        outExtent.southWest.lon = lonLat.lon;
                    if (lonLat.lat < outExtent.southWest.lat)
                        outExtent.southWest.lat = lonLat.lat;
                    if (lonLat.lon > outExtent.northEast.lon)
                        outExtent.northEast.lon = lonLat.lon;
                    if (lonLat.lat > outExtent.northEast.lat)
                        outExtent.northEast.lat = lonLat.lat;
                }
                outVertices.push(cur.x, cur.y, cur.z, cur.x, cur.y, cur.z, cur.x, cur.y, cur.z, cur.x, cur.y, cur.z);
                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);
            }

            var first;
            if (isClosed) {
                first = path[0];
                if (first.constructor === Array) {
                    first = new Vec3(first[0], first[1], first[2]);
                }
                outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
            } else {
                let p0 = path[path.length - 1],
                    p1 = path[path.length - 2] || p0;
                if (p0.constructor === Array) {
                    p0 = new Vec3(p0[0], p0[1], p0[2]);
                }
                if (p1.constructor === Array) {
                    p1 = new Vec3(p1[0], p1[1], p1[2]);
                }
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
                outIndexes.push(index - 1, index - 1, index - 1, index - 1);
            }

            outVertices.push(first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z);
            outOrders.push(1, -1, 2, -2);

            if (j < path3v.length - 1) {
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
     * @param {og.Extent} outExtent - Geodetic line extent.
     * @static
     */
    static appendPoint3v(path3v, point3v, isClosed, outVertices, outOrders, outIndexes,
        ellipsoid, outTransformedPathLonLat, outTransformedPathMerc, outExtent) {

        var ii = outIndexes.length - 4,
            index = outIndexes[ii - 1] + 1;

        var path = path3v[path3v.length - 1];

        path.push(point3v);

        var startIndex = index;

        if (ellipsoid) {

            var transformedPathLonLat = outTransformedPathLonLat[outTransformedPathLonLat.length - 1],
                transformedPathMerc = outTransformedPathMerc[outTransformedPathMerc.length - 1];

            let lonLat = ellipsoid.cartesianToLonLat(point3v);
            transformedPathLonLat.push(lonLat);
            transformedPathMerc.push(lonLat.forwardMercator());

            if (lonLat.lon < outExtent.southWest.lon)
                outExtent.southWest.lon = lonLat.lon;
            if (lonLat.lat < outExtent.southWest.lat)
                outExtent.southWest.lat = lonLat.lat;
            if (lonLat.lon > outExtent.northEast.lon)
                outExtent.northEast.lon = lonLat.lon;
            if (lonLat.lat > outExtent.northEast.lat)
                outExtent.northEast.lat = lonLat.lat;
        }

        let vi = outVertices.length - 12;

        outVertices[vi] = point3v.x;
        outVertices[vi + 1] = point3v.y;
        outVertices[vi + 2] = point3v.z;
        outVertices[vi + 3] = point3v.x;
        outVertices[vi + 4] = point3v.y;
        outVertices[vi + 5] = point3v.z;
        outVertices[vi + 6] = point3v.x;
        outVertices[vi + 7] = point3v.y;
        outVertices[vi + 8] = point3v.z;
        outVertices[vi + 9] = point3v.x;
        outVertices[vi + 10] = point3v.y;
        outVertices[vi + 11] = point3v.z;

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

        outVertices.push(first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z);
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
    static appendLineDataLonLat(pathLonLat, isClosed, outVertices, outOrders, outIndexes,
        ellipsoid, outTransformedPathCartesian, outPathLonLat, outTransformedPathMerc, outExtent) {
        var index = 0;
        if (outExtent) {
            outExtent.southWest.set(180, 90);
            outExtent.northEast.set(-180, -90);
        }

        if (outIndexes.length > 0) {
            index = outIndexes[outIndexes.length - 5] + 9;
            outIndexes.push(index, index);
        } else {
            outIndexes.push(0, 0);
        }

        for (var j = 0; j < pathLonLat.length; j++) {
            var path = pathLonLat[j];

            if (path.length === 0) {
                continue;
            }

            var startIndex = index;

            outTransformedPathCartesian[j] = [];
            outTransformedPathMerc[j] = [];
            outPathLonLat[j] = [];

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

            outVertices.push(last.x, last.y, last.z, last.x, last.y, last.z, last.x, last.y, last.z, last.x, last.y, last.z);
            outOrders.push(1, -1, 2, -2);

            for (var i = 0; i < path.length; i++) {
                var cur = path[i];
                if (cur instanceof Array) {
                    cur = new LonLat(cur[0], cur[1], cur[2]);
                }

                var cartesian = ellipsoid.lonLatToCartesian(cur);
                outTransformedPathCartesian[j].push(cartesian);
                outPathLonLat[j].push(cur);
                outTransformedPathMerc[j].push(cur.forwardMercator());

                outVertices.push(cartesian.x, cartesian.y, cartesian.z, cartesian.x, cartesian.y, cartesian.z,
                    cartesian.x, cartesian.y, cartesian.z, cartesian.x, cartesian.y, cartesian.z);
                outOrders.push(1, -1, 2, -2);
                outIndexes.push(index++, index++, index++, index++);

                if (cur.lon < outExtent.southWest.lon)
                    outExtent.southWest.lon = cur.lon;
                if (cur.lat < outExtent.southWest.lat)
                    outExtent.southWest.lat = cur.lat;
                if (cur.lon > outExtent.northEast.lon)
                    outExtent.northEast.lon = cur.lon;
                if (cur.lat > outExtent.northEast.lat)
                    outExtent.northEast.lat = cur.lat;
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

            outVertices.push(first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z, first.x, first.y, first.z);
            outOrders.push(1, -1, 2, -2);

            if (j < pathLonLat.length - 1) {
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

        var v = this._vertices,
            l = this._pathLonLat,
            m = this._pathLonLatMerc,
            k = 0;

        var ellipsoid = this._renderNode.ellipsoid;

        for (var j = 0; j < path3v.length; j++) {
            var path = path3v[j];

            var last;
            if (this._closedLine) {
                last = path[path.length - 1]
            } else {
                last = new Vec3(path[0].x + path[0].x - path[1].x, path[0].y + path[0].y - path[1].y, path[0].z + path[0].z - path[1].z);
            }

            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;

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

                    if (lonLat.lon < extent.southWest.lon)
                        extent.southWest.lon = lonLat.lon;
                    if (lonLat.lat < extent.southWest.lat)
                        extent.southWest.lat = lonLat.lat;
                    if (lonLat.lon > extent.northEast.lon)
                        extent.northEast.lon = lonLat.lon;
                    if (lonLat.lat > extent.northEast.lat)
                        extent.northEast.lat = lonLat.lat;
                }
                v[k++] = cur.x;
                v[k++] = cur.y;
                v[k++] = cur.z;
                v[k++] = cur.x;
                v[k++] = cur.y;
                v[k++] = cur.z;
                v[k++] = cur.x;
                v[k++] = cur.y;
                v[k++] = cur.z;
                v[k++] = cur.x;
                v[k++] = cur.y;
                v[k++] = cur.z;
            }

            var first;
            if (this._closedLine) {
                first = path[0];
            } else {
                var l1 = path.length - 1;
                first = new Vec3(path[l1].x + path[l1].x - path[l1 - 1].x, path[l1].y + path[l1].y - path[l1 - 1].y,
                    path[l1].z + path[l1].z - path[l1 - 1].z);
            }

            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
        }
    };

    /**
     * Sets polyline with geodetic coordinates. 
     * @protected
     * @param {og.LonLat[]} pathLonLat - Geodetic polyline path coordinates.
     */
    _setEqualPathLonLat(pathLonLat) {

        var extent = this._extent;
        extent.southWest.set(180.0, 90.0);
        extent.northEast.set(-180.0, -90.0);

        var v = this._vertices,
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

            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;
            v[k++] = last.x;
            v[k++] = last.y;
            v[k++] = last.z;

            for (var i = 0; i < path.length; i++) {
                var cur = path[i];
                var cartesian = ellipsoid.lonLatToCartesian(cur);
                c[j][i] = cartesian;
                m[j][i] = cur.forwardMercator();
                l[j][i] = cur;
                v[k++] = cartesian.x;
                v[k++] = cartesian.y;
                v[k++] = cartesian.z;
                v[k++] = cartesian.x;
                v[k++] = cartesian.y;
                v[k++] = cartesian.z;
                v[k++] = cartesian.x;
                v[k++] = cartesian.y;
                v[k++] = cartesian.z;
                v[k++] = cartesian.x;
                v[k++] = cartesian.y;
                v[k++] = cartesian.z;

                if (cur.lon < extent.southWest.lon)
                    extent.southWest.lon = cur.lon;
                if (cur.lat < extent.southWest.lat)
                    extent.southWest.lat = cur.lat;
                if (cur.lon > extent.northEast.lon)
                    extent.northEast.lon = cur.lon;
                if (cur.lat > extent.northEast.lat)
                    extent.northEast.lat = cur.lat;
            }

            var first;
            if (this._closedLine) {
                first = ellipsoid.lonLatToCartesian(path[0]);
            } else {
                let p0 = ellipsoid.lonLatToCartesian(path[path.length - 1]),
                    p1 = ellipsoid.lonLatToCartesian(path[path.length - 2]);
                first = new Vec3(p0.x + p0.x - p1.x, p0.y + p0.y - p1.y, p0.z + p0.z - p1.z);
            }

            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
            v[k++] = first.x;
            v[k++] = first.y;
            v[k++] = first.z;
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
                    if (lon > extent.northEast.lon)
                        extent.northEast.lon = lon;
                    if (lat > extent.northEast.lat)
                        extent.northEast.lat = lat;
                    if (lon < extent.southWest.lon)
                        extent.southWest.lon = lon;
                    if (lat < extent.southWest.lat)
                        extent.southWest.lat = lat;
                }
            }

            this.setPoint3v(
                this._renderNode.ellipsoid.lonLatToCartesian(lonlat),
                index, segmentIndex, true);

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
            var v = this._vertices,
                l = this._pathLonLat,
                m = this._pathLonLatMerc,
                k = 0, kk = 0;

            for (var i = 0; i < segmentIndex; i++) {
                kk += this._path3v[i].length * 12 + 24;
            }

            let path = this._path3v[segmentIndex];

            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;

            if (path.length === 1) return;

            if (index === 0 || index === 1) {
                var last;
                if (this._closedLine) {
                    last = path[path.length - 1]
                } else {
                    last = new Vec3(path[0].x + path[0].x - path[1].x, path[0].y + path[0].y - path[1].y, path[0].z + path[0].z - path[1].z);
                }

                k = kk;

                v[k] = last.x;
                v[k + 1] = last.y;
                v[k + 2] = last.z;
                v[k + 3] = last.x;
                v[k + 4] = last.y;
                v[k + 5] = last.z;
                v[k + 6] = last.x;
                v[k + 7] = last.y;
                v[k + 8] = last.z;
                v[k + 9] = last.x;
                v[k + 10] = last.y;
                v[k + 11] = last.z;
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
                for (var i = 0; i < l.length; i++) {
                    var pi = l[i];
                    for (var j = 0; j < pi.length; j++) {
                        var lon = pi[j].lon,
                            lat = pi[j].lat;
                        if (lon > extent.northEast.lon)
                            extent.northEast.lon = lon;
                        if (lat > extent.northEast.lat)
                            extent.northEast.lat = lat;
                        if (lon < extent.southWest.lon)
                            extent.southWest.lon = lon;
                        if (lat < extent.southWest.lat)
                            extent.southWest.lat = lat;
                    }
                }
            }

            k = kk + index * 12 + 12;

            v[k] = coordinates.x;
            v[k + 1] = coordinates.y;
            v[k + 2] = coordinates.z;
            v[k + 3] = coordinates.x;
            v[k + 4] = coordinates.y;
            v[k + 5] = coordinates.z;
            v[k + 6] = coordinates.x;
            v[k + 7] = coordinates.y;
            v[k + 8] = coordinates.z;
            v[k + 9] = coordinates.x;
            v[k + 10] = coordinates.y;
            v[k + 11] = coordinates.z;

            if (index === path.length - 1 || index === path.length - 2) {
                var first;
                if (this._closedLine) {
                    first = path[0];
                } else {
                    var l1 = path.length - 1;
                    first = new Vec3(path[l1].x + path[l1].x - path[l1 - 1].x, path[l1].y + path[l1].y - path[l1 - 1].y,
                        path[l1].z + path[l1].z - path[l1 - 1].z);
                }

                k = kk + path.length * 12 + 12;

                v[k] = first.x;
                v[k + 1] = first.y;
                v[k + 2] = first.z;
                v[k + 3] = first.x;
                v[k + 4] = first.y;
                v[k + 5] = first.z;
                v[k + 6] = first.x;
                v[k + 7] = first.y;
                v[k + 8] = first.z;
                v[k + 9] = first.x;
                v[k + 10] = first.y;
                v[k + 11] = first.z;
            }

            this._changedBuffers[VERTICES_BUFFER] = true;
        } else {
            let path = this._path3v[segmentIndex];
            path[index].x = coordinates.x;
            path[index].y = coordinates.y;
            path[index].z = coordinates.z;
        }
    }

    removePoint(index, multiLineIndex) {
        //
        //TODO: could be optimized. Partially see appendPoint3v.
        //
        multiLineIndex = multiLineIndex || 0;
        this._path3v[multiLineIndex].splice(index, 1);
        this.setPath3v([].concat(this._path3v));
    }

    /**
     * Adds a new cartesian point in the end of the path in a last line segment.
     * @public
     * @param {og.Vec3} point3v - New coordinate.
     */
    appendPoint3v(point3v) {
        Polyline.appendPoint3v(this._path3v, point3v, this._closedLine, this._vertices, this._orders, this._indexes,
            this._renderNode.ellipsoid, this._pathLonLat, this._pathLonLatMerc, this._extent);

        this._changedBuffers[VERTICES_BUFFER] = true;
        this._changedBuffers[INDEX_BUFFER] = true;
    }

    /**
     * Adds a new cartesian point in the end of the path.
     * @public
     * @param {og.Vec3} point3v - New coordinate.
     * @param {number} [multiLineIndex=0] - Path part index, first by default.
     */
    addPoint3v(point3v, multiLineIndex) {
        //
        //TODO: could be optimized
        //
        multiLineIndex = multiLineIndex || 0;
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
    addPointLonLat(lonLat, multiLineIndex) {
        //
        //TODO: could be optimized
        //
        multiLineIndex = multiLineIndex || 0;
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
        this._vertices.length = 0;
        this._orders.length = 0;
        this._indexes.length = 0;
        this._vertices = [];
        this._orders = [];
        this._indexes = [];

        this._deleteBuffers();
    }

    /**
     * Sets Polyline color.
     * @public
     * @param {String} htmlColor - HTML color.
     * @param {number} opacity - Opacity.
     */
    setColorHTML(htmlColor, opacity) {
        this.color = utils.htmlColorToRgba(htmlColor);
        opacity && (this.color.w = opacity);
    }

    /**
     * Sets Polyline RGBA color.
     * @public
     * @param {number} r - Red color.
     * @param {number} g - Green color.
     * @param {number} b - Blue color.
     * @param {number} [a] - Opacity.
     */
    setColor(r, g, b, a) {
        this.color.x = r;
        this.color.y = g;
        this.color.z = b;
        a && (this.color.w = a);
    }

    /**
     * Sets Polyline RGB color.
     * @public
     * @param {og.Vec3} color - RGB color.
     */
    setColor3v(color) {
        this.color.x = color.x;
        this.color.y = color.y;
        this.color.z = color.z;
    }

    /**
     * Sets Polyline RGBA color.
     * @public
     * @param {og.Vec4} color - RGBA color.
     */
    setColor4v(color) {
        this.color.x = color.x;
        this.color.y = color.y;
        this.color.z = color.z;
        this.color.w = color.w;
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
        this._renderNode = renderNode;
        if (this._pathLonLat.length) {
            this._createDataLonLat([].concat(this._pathLonLat));
        } else {
            this._createData3v([].concat(this._path3v));
        }
    }

    /**
     * @protected
     */
    _clearData() {
        this._vertices.length = 0;
        this._orders.length = 0;
        this._indexes.length = 0;

        this._vertices = [];
        this._orders = [];
        this._indexes = [];

        this._path3v.length = 0;
        this._pathLonLat.length = 0;
        this._pathLonLatMerc.length = 0;

        this._path3v = [];
        this._pathLonLat = [];
        this._pathLonLatMerc = [];
    }

    _createData3v(path3v) {
        this._clearData();
        Polyline.appendLineData3v(path3v, this._closedLine, this._vertices, this._orders, this._indexes,
            this._renderNode.ellipsoid, this._pathLonLat, this._path3v, this._pathLonLatMerc, this._extent);
    }

    _createDataLonLat(pathLonlat) {
        this._clearData();
        Polyline.appendLineDataLonLat(pathLonlat, this._closedLine, this._vertices, this._orders, this._indexes,
            this._renderNode.ellipsoid, this._path3v, this._pathLonLat, this._pathLonLatMerc, this._extent);
    }

    /**
     * Removes from an entity.
     * @public
     */
    remove() {
        this._entity = null;
        this.clear();
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
            } else {
                this._createDataLonLat(pathLonLat);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
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
    setPath3v(path3v, forceEqual) {
        if (this._renderNode) {
            if (forceEqual) {
                this._setEqualPath3v(path3v);
                this._changedBuffers[VERTICES_BUFFER] = true;
            } else {
                this._createData3v(path3v);
                this._changedBuffers[VERTICES_BUFFER] = true;
                this._changedBuffers[INDEX_BUFFER] = true;
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
            var sh = r.handler.programs.polyline;
            var p = sh._program;
            var gl = r.handler.gl,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.polygonOffset(this._handler._entityCollection.polygonOffsetFactor, this._handler._entityCollection.polygonOffsetUnits);

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera._projectionMatrix._m);
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera._viewMatrix._m);

            if (gl.type === "webgl2") {
                gl.uniform3fv(shu.pickingColor, [this._pickingColor[0], this._pickingColor[1], this._pickingColor[2]]);
            }

            gl.uniform4fv(shu.color, [this.color.x, this.color.y, this.color.z, this.color.w * this._handler._entityCollection._fadingOpacity]);
            gl.uniform3fv(shu.uCamPos, r.activeCamera.eye.toVec());
            gl.uniform2fv(shu.uFloatParams, [rn._planetRadius2 || 0.0, r.activeCamera._tanViewAngle_hradOneByHeight]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas.width, r.handler.canvas.height]);
            gl.uniform1f(shu.thickness, this.thickness * 0.5);

            var v = this._verticesBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prev, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.current, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.next, v.itemSize, gl.FLOAT, false, 12, 96);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._ordersBuffer);
            gl.vertexAttribPointer(sha.order, this._ordersBuffer.itemSize, gl.FLOAT, false, 4, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP, this._indexesBuffer.numItems, gl.UNSIGNED_INT, 0);
        }
    }

    drawPicking() {
        if (this.visibility && this._path3v.length) {

            this._update();

            var rn = this._renderNode;
            var r = rn.renderer;
            var sh = r.handler.programs.polyline;
            var p = sh._program;
            var gl = r.handler.gl,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.polygonOffset(this._handler._entityCollection.polygonOffsetFactor, this._handler._entityCollection.polygonOffsetUnits);

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.proj, false, r.activeCamera._projectionMatrix._m);
            gl.uniformMatrix4fv(shu.view, false, r.activeCamera._viewMatrix._m);

            gl.uniform4fv(shu.color, [this._pickingColor[0], this._pickingColor[1], this._pickingColor[2], 1.0]);
            gl.uniform3fv(shu.uCamPos, r.activeCamera.eye.toVec());
            gl.uniform2fv(shu.uFloatParams, [rn._planetRadius2 || 0.0, r.activeCamera._tanViewAngle_hradOneByHeight]);
            gl.uniform2fv(shu.viewport, [r.handler.canvas.width, r.handler.canvas.height]);
            gl.uniform1f(shu.thickness, this.thickness * 0.5);

            var v = this._verticesBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, v);
            gl.vertexAttribPointer(sha.prev, v.itemSize, gl.FLOAT, false, 12, 0);
            gl.vertexAttribPointer(sha.current, v.itemSize, gl.FLOAT, false, 12, 48);
            gl.vertexAttribPointer(sha.next, v.itemSize, gl.FLOAT, false, 12, 96);

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

            gl.deleteBuffer(this._verticesBuffer);
            gl.deleteBuffer(this._ordersBuffer);
            gl.deleteBuffer(this._indexesBuffer);

            this._verticesBuffer = null;
            this._ordersBuffer = null;
            this._indexesBuffer = null;
        }
    }

    /**
     * Creates gl main data buffer.
     * @protected
     */
    _createVerticesBuffer() {
        var h = this._renderNode.renderer.handler;
        h.gl.deleteBuffer(this._verticesBuffer);
        this._verticesBuffer = h.createArrayBuffer(new Float32Array(this._vertices), 3, this._vertices.length / 3);
    }

    /**
     * Creates gl index and order buffer.
     * @protected
     */
    _createIndexBuffer() {
        var h = this._renderNode.renderer.handler;
        h.gl.deleteBuffer(this._ordersBuffer);
        h.gl.deleteBuffer(this._indexesBuffer);
        this._ordersBuffer = h.createArrayBuffer(new Float32Array(this._orders), 1, this._orders.length / 2);
        this._indexesBuffer = h.createElementArrayBuffer(new Uint32Array(this._indexes), 1, this._indexes.length);
    }
}

export { Polyline };