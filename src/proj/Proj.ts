interface IProjParams {
    units: string;
    code: string;
}

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
 * @type {Record<string, number>}
 */
export const METERS_PER_UNIT: Record<string, number> = {};
METERS_PER_UNIT[Units.FEET] = 0.3048;
METERS_PER_UNIT[Units.METERS] = 1;
METERS_PER_UNIT[Units.KILOMETERS] = 1000;

let _counter = 0;

class Proj {

    public id: number;

    /**
     * @public
     * @type {string}
     */
    public code: string;

    /**
     * @public
     * @type {Units}
     */
    public units: string;

    constructor(options: IProjParams) {
        this.id = _counter++;
        this.code = options.code;
        this.units = options.units;
    }

    /**
     * Compare projections.
     * @public
     * @param {Proj} proj - Projection object.
     * @returns {boolean}
     */
    public equal(proj: Proj): boolean {
        return proj.id === this.id;
    }
}

export {Proj};