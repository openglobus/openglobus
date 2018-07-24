/**
 * @module og/bv/Sphere
 */

'use strict';

import { Vec3 } from '../math/Vec3.js';

/**
 * Bounding sphere class.
 * @class
 * @param {Number} [radius] - Bounding sphere radius.
 * @param {og.Vec3} [center] - Bounding sphere coordiantes.
 */
class Sphere {
    constructor(radius, center) {

        /**
         * Sphere radius.
         * @public
         * @type {Number}
         */
        this.radius = radius || 0;

        /**
         * Sphere coordiantes.
         * @public
         * @type {og.Vec3}
         */
        this.center = center ? center.clone() : new Vec3();
    }

    /**
     * Sets bounding sphere coordinates by the bounds array.
     * @param {Array.<number>} bounds - Bounds is an array where [minX, maxX, minY, maxY, minZ, maxZ]
     */
    setFromBounds(bounds) {
        this.center.set(bounds[0] + (bounds[1] - bounds[0]) / 2, bounds[2] + (bounds[3] - bounds[2]) / 2, bounds[4] + (bounds[5] - bounds[4]) / 2);
        this.radius = this.center.distance(new Vec3(bounds[0], bounds[2], bounds[4]));
    }

    /**
     * Sets bounding sphere coordiantes by ellipsoid geodetic extend.
     * @param {og.Ellipsoid} ellipsoid - Ellipsoid.
     * @param {og.Extent} extent - Geodetic extent.
     */
    setFromExtent(ellipsoid, extent) {
        this.setFromBounds(extent.getCartesianBounds(ellipsoid));
    }
};

export { Sphere };
