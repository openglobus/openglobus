goog.provide('og.proj');
goog.provide('og.proj.Projection');
goog.provide('og.Units');
goog.provide('og.proj.METERS_PER_UNIT');

/**
 * Projection units: 'degrees', 'ft', 'm' or 'km'.
 * @enum {string}
 * @api
 */
og.proj.Units = {
    "DEGREES": "degrees",
    "FEET": "ft",
    "METERS": "m",
    "KILOMETERS": "km"
};

/**
 * Meters per unit lookup table.
 * @const
 * @type {Object.<og.proj.Units, number>}
 * @api
 */
og.proj.METERS_PER_UNIT = {};
og.proj.METERS_PER_UNIT[og.proj.Units.FEET] = 0.3048;
og.proj.METERS_PER_UNIT[og.proj.Units.METERS] = 1;
og.proj.METERS_PER_UNIT[og.proj.Units.KILOMETERS] = 1000;

og.proj.Projection = function (options) {

    /**
     * @public
     * @type {string}
     */
    this.code = options.code;

    /**
     * @public
     * @type {og.proj.Units}
     */
    this.units = /** @type {ol.proj.Units} */ (options.units);

    /**
     * Projection identifier, especially usefull for comparison.
     * @const
     * @type {integer}
     */
    this.id = og.proj.Projection._counter++;
};

og.proj.Projection._counter = 0;