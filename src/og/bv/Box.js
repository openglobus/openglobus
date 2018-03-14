/**
 * @module og/bv/Box
 */

'use strict';

import { Vec3 } from '../math/Vec3.js';

/**
 * Bounding box class.
 * @class
 */
class Box {
    constructor() {
        /**
         * Vertices array.
         * @public
         * @type{Array.<og.math.Vector3>}
         */
        this.vertices = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    }

    /**
     * Sets bounding box coordinates by the bounds array.
     * @param {Array.<number>} bounds - Bounds is an array where [minX, maxX, minY, maxY, minZ, maxZ]
     */
    setFromBounds(bounds) {
        var xmin = bounds[0], xmax = bounds[1],
            ymin = bounds[2], ymax = bounds[3],
            zmin = bounds[4], zmax = bounds[5];

        this.vertices[0].set(xmin, ymin, zmin);
        this.vertices[1].set(xmax, ymin, zmin);
        this.vertices[2].set(xmax, ymin, zmax);
        this.vertices[3].set(xmin, ymin, zmax);
        this.vertices[4].set(xmin, ymax, zmin);
        this.vertices[5].set(xmax, ymax, zmin);
        this.vertices[6].set(xmax, ymax, zmax);
        this.vertices[7].set(xmin, ymax, zmax);
    }

    /**
     * Sets bounding box coordiantes by ellipsoid geodetic extend.
     * @param {og.Ellipsoid} ellipsoid - Ellipsoid.
     * @param {og.Extent} extent - Geodetic extent.
     */
    setFromExtent(ellipsoid, extent) {
        this.setFromBounds(extent.getCartesianBounds(ellipsoid));
    }
};

export { Box };