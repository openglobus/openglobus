/**
 * @module og/shape/BaseShape
 */

'use strict';

import { BaseShape } from './BaseShape.js';

/**
 * @class
 * @extends {BaseShape}
 * @param {Object} options - Icosphere parameters:
 * @param {og.Vec3} [options.position] - Icosphere position.
 * @param {og.Quat} [options.orientation] - Icosphere orientation(rotation).
 * @param {og.Vec3} [options.scale] - Scale vector.
 * @param {Array.<number>} [options.color] - Icosphere RGBA color. (exactly 4 entries)
 * @param {string} [options.src] - Texture image url source.
 * @param {boolean} [options.visibility] - Icosphere visibility.
 * @param {number} [options.size] - Icosphere radius.
 * @param {number} [options.level] - Icosphere complexity level.
 */
class Icosphere extends BaseShape {
    constructor(options) {
        super(options);
        /**
         * Icosphere radius.
         * @protected
         * @type {number}
         */
        this._size = options.size || 1.0;

        /**
         * Icosphere recursion level.
         * @protected
         * @type {number}
         */
        this._level = options.level || 0;

        this._index = 0;
        this._middlePointIndexCache = {};

        this._createData();
    }

    // add vertex to mesh, fix position to be on unit sphere, return index
    _addVertex(p) {
        var length = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
        this._positionData.push(this._size * p[0] / length, this._size * p[1] / length, this._size * p[2] / length);
        return this._index++;
    }

    // return index of point in the middle of p1 and p2
    _getMiddlePoint(p1, p2) {
        // first check if we have it already
        var firstIsSmaller = p1 < p2;
        var smallerIndex = firstIsSmaller ? p1 : p2;
        var greaterIndex = firstIsSmaller ? p2 : p1;

        var key = smallerIndex + "_" + greaterIndex;

        var ret = this._middlePointIndexCache[key];
        if (ret) {
            return ret;
        }

        var point1 = [this._positionData[p1 * 3], this._positionData[p1 * 3 + 1], this._positionData[p1 * 3 + 2]];
        var point2 = [this._positionData[p2 * 3], this._positionData[p2 * 3 + 1], this._positionData[p2 * 3 + 2]];
        var middle = [(point1[0] + point2[0]) / 2.0, (point1[1] + point2[1]) / 2.0, (point1[2] + point2[2]) / 2.0];

        // add vertex makes sure point is on unit sphere
        var i = this._addVertex(middle);
        this._middlePointIndexCache[key] = i;
        return i;
    }

    /**
     * Create specific shape vertices data.
     * @protected
     * @virtual
     */
    _createData() {

        this._positionData = [];
        this._indexData = [];
        this._index = 0;
        this._middlePointIndexCache = {};

        // create 12 vertices of a icosahedron
        var t = (1.0 + Math.sqrt(5.0)) / 2.0;

        this._addVertex([-1, t, 0]);
        this._addVertex([1, t, 0]);
        this._addVertex([-1, -t, 0]);
        this._addVertex([1, -t, 0]);

        this._addVertex([0, -1, t]);
        this._addVertex([0, 1, t]);
        this._addVertex([0, -1, -t]);
        this._addVertex([0, 1, -t]);

        this._addVertex([t, 0, -1]);
        this._addVertex([t, 0, 1]);
        this._addVertex([-t, 0, -1]);
        this._addVertex([-t, 0, 1]);

        // create 20 triangles of the icosahedron
        var faces = [];

        // 5 faces around point 0
        faces.push([0, 11, 5]);
        faces.push([0, 5, 1]);
        faces.push([0, 1, 7]);
        faces.push([0, 7, 10]);
        faces.push([0, 10, 11]);

        // 5 adjacent faces 
        faces.push([1, 5, 9]);
        faces.push([5, 11, 4]);
        faces.push([11, 10, 2]);
        faces.push([10, 7, 6]);
        faces.push([7, 1, 8]);

        // 5 faces around point 3
        faces.push([3, 9, 4]);
        faces.push([3, 4, 2]);
        faces.push([3, 2, 6]);
        faces.push([3, 6, 8]);
        faces.push([3, 8, 9]);

        // 5 adjacent faces 
        faces.push([4, 9, 5]);
        faces.push([2, 4, 11]);
        faces.push([6, 2, 10]);
        faces.push([8, 6, 7]);
        faces.push([9, 8, 1]);

        // refine triangles
        for (let i = 0; i < this._level; i++) {
            var faces2 = [];
            for (let j = 0; j < faces.length; j++) {
                let tri = faces[j];
                // replace triangle by 4 triangles
                var a = this._getMiddlePoint(tri[0], tri[1]);
                var b = this._getMiddlePoint(tri[1], tri[2]);
                var c = this._getMiddlePoint(tri[2], tri[0]);

                faces2.push([tri[0], a, c]);
                faces2.push([tri[1], b, a]);
                faces2.push([tri[2], c, b]);
                faces2.push([a, b, c]);
            }
            faces = faces2;
        }

        for (let i = 0; i < faces.length; i++) {
            let tri = faces[i];
            this._indexData.push(tri[0]);
            this._indexData.push(tri[1]);
            this._indexData.push(tri[2]);
        }
    }
}

export { Icosphere };