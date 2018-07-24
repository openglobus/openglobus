/**
 * @module og/proj/Proj
 */

'use strict';

/**
 * Projection units: 'degrees', 'ft', 'm' or 'km'.
 * @enum {string}
 * @api
 */
export const Units = {
    "DEGREES": "degrees",
    "FEET": "ft",
    "METERS": "m",
    "KILOMETERS": "km"
};

/**
 * Meters per unit lookup table.
 * @const
 * @type {Object.<og.proj.Units, number>}
 */
export const METERS_PER_UNIT = {};
METERS_PER_UNIT[Units.FEET] = 0.3048;
METERS_PER_UNIT[Units.METERS] = 1;
METERS_PER_UNIT[Units.KILOMETERS] = 1000;

const Proj = function (options) {

    /**
     * @public
     * @type {string}
     */
    this.code = options.code;

    /**
     * @public
     * @type {og.proj.Units}
     */
    this.units = /** @type {Units} */ (options.units);

    /**
     * Projection identifier, especially usefull for comparison.
     * @const
     * @type {integer}
     */
    this.id = Proj._counter++;
};

/**
 * Compare projections.
 * @public
 * @param {og.Proj} proj - Projetion object.
 * @returns {boolean}
 */
Proj.prototype.equal = function (proj) {
    return proj.id === this.id;
};

Proj._counter = 0;

export { Proj };