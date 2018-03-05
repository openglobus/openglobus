/**
 * @module og/ellipsoid/wgs84
 */

import { Ellipsoid } from './Ellipsoid.js';

/**
 * WGS84 ellipsoid object.
 * @type {og.Ellipsoid}
 */
export const wgs84 = new Ellipsoid(6378137.000, 6356752.3142);