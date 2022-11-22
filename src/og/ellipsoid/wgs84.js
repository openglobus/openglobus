/**
 * @module og/ellipsoid/wgs84
 */

"use strict";

import { Ellipsoid } from "./Ellipsoid.js";

/**
 * WGS84 ellipsoid object.
 * @type {Ellipsoid}
 */
export const wgs84 = new Ellipsoid(6378137.0, 6356752.3142451793); // Equitorial Radius (m), Polar Radius (m)
