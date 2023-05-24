/**
 * @module og/proj/EPSG3857
 */

"use strict";

import { Proj, Units } from "./Proj.js";

/**
 * EPSG:3857 projection object.
 * @type {Proj}
 */
export const EPSG3857 = new Proj({ code: "epsg:3857", units: Units.METERS });
