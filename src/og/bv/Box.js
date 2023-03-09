/**
 * @module og/bv/Box
 */

"use strict";

import { Vec3 } from "../math/Vec3.js";

/**
 * Bounding box class.
 * @class
 */
class Box {
    /**
     *
     * @param {*} boundsArr
     */
    constructor(boundsArr = [0, 0, 0, 0, 0, 0]) {
        /**
         * Vertices array.
         * @public
         * @type{Array.<Vec3>}
         */
        this.vertices = [
            new Vec3(),
            new Vec3(),
            new Vec3(),
            new Vec3(),
            new Vec3(),
            new Vec3(),
            new Vec3(),
            new Vec3()
        ];

        if (boundsArr) {
            this.setFromBoundsArr(boundsArr);
        }
    }

    copy(bbox) {
        for (let i = 0, len = this.vertices.length; i < len; i++) {
            this.vertices[i].copy(bbox.vertices[i]);
        }
    }

    /**
     * Sets bounding box coordinates by the bounds array.
     * @param {Array.<number>} bounds - Bounds is an array where [minX, minY, minZ, maxX, maxY, maxZ]
     */
    setFromBoundsArr(bounds) {
        var xmin = bounds[0],
            xmax = bounds[3],
            ymin = bounds[1],
            ymax = bounds[4],
            zmin = bounds[2],
            zmax = bounds[5];

        var v = this.vertices;

        v[0].set(xmin, ymin, zmin);
        v[1].set(xmax, ymin, zmin);
        v[2].set(xmax, ymin, zmax);
        v[3].set(xmin, ymin, zmax);
        v[4].set(xmin, ymax, zmin);
        v[5].set(xmax, ymax, zmin);
        v[6].set(xmax, ymax, zmax);
        v[7].set(xmin, ymax, zmax);
    }

    /**
     * Sets bounding box coordiantes by ellipsoid geodetic extend.
     * @param {Ellipsoid} ellipsoid - Ellipsoid.
     * @param {Extent} extent - Geodetic extent.
     */
    setFromExtent(ellipsoid, extent) {
        this.setFromBoundsArr(extent.getCartesianBounds(ellipsoid));
    }
}

export { Box };

