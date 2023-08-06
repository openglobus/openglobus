"use strict";

import {Vec3} from "../math/Vec3";
import {Ellipsoid} from "../ellipsoid";
import {Extent} from "../Extent";

export type NumberArray6 = [number, number, number, number, number, number];

/**
 * Bounding sphere class.
 * @class
 * @param {Number} [radius] - Bounding sphere radius.
 * @param {Vec3} [center] - Bounding sphere coordinates.
 */
class Sphere {
    /**
     * Sphere radius.
     * @public
     * @type {Number}
     */
    public radius: number;

    /**
     * Sphere coordinates.
     * @public
     * @type {Vec3}
     */
    public center: Vec3;

    constructor(radius: number = 0, center?: Vec3) {

        this.radius = radius;

        this.center = center ? center.clone() : new Vec3();
    }

    /**
     * Sets bounding sphere coordinates by the bounds array.
     * @param {Array.<number>} bounds - Bounds is an array where [minX, minY, minZ, maxX, maxY, maxZ]
     */
    public setFromBounds(bounds: NumberArray6) {
        let m = new Vec3(bounds[0], bounds[1], bounds[2]);
        this.center.set(
            m.x + (bounds[3] - m.x) * 0.5,
            m.y + (bounds[3] - m.y) * 0.5,
            m.z + (bounds[5] - m.z) * 0.5
        );
        this.radius = this.center.distance(m);
    }

    /**
     * Sets bounding sphere coordinates by ellipsoid geodetic extend.
     * @param {Ellipsoid} ellipsoid - Ellipsoid.
     * @param {Extent} extent - Geodetic extent.
     */
    public setFromExtent(ellipsoid: Ellipsoid, extent: Extent) {
        this.setFromBounds(extent.getCartesianBounds(ellipsoid));
    }
}

export {Sphere};
