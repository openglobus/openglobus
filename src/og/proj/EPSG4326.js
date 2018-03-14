/**
 * @module og/proj/EPSG4326
 */

'use strict';

import { Units, Proj } from './Proj.js';

/**
 * EPSG:4326 projection object.
 * @type {og.proj.Proj}
 */
export const EPSG4326 = new Proj({ code: "epsg:4326", units: Units.DEGREES });