/**
 * @module og/proj/Proj
 */

"use strict";

/**
 * Projection units: 'degrees', 'ft', 'm' or 'km'.
 * @enum {string}
 * @api
 */
export const Units = {
    DEGREES: "degrees",
    FEET: "ft",
    METERS: "m",
    KILOMETERS: "km"
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

let _counter = 0;
class Proj {
    constructor(options) {
        /**
         * @public
         * @type {string}
         */
        this.code = options.code;

        /**
         * @public
         * @type {proj.Units}
         */
        this.units = /** @type {Units} */ (options.units);

        /**
         * Projection identifier, especially usefull for comparison.
         * @const
         * @type {integer}
         */
        this.id = _counter++;
    }

    /**
     * Compare projections.
     * @public
     * @param {Proj} proj - Projetion object.
     * @returns {boolean}
     */
    equal(proj) {
        return proj.id === this.id;
    }
}

export { Proj };
