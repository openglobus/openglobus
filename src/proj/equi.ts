/**
 * @module og/proj/equi
 */

import { Proj, Units } from "./Proj";

/**
 * Any equrectangualr projection object.
 * @type {Proj}
 */
export const equi = new Proj({ code: "equi", units: Units.DEGREES });
