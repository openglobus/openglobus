goog.provide('og.astro');

goog.require('og.jd');
goog.require('og.math');

/**
 * Angle between J2000 mean equator and the ecliptic plane.
 * 23 deg 26' 21".448 (Seidelmann, _Explanatory Supplement to the
 * Astronomical Almanac_ (1992), eqn 3.222-1.
 * @const
 * @type{Number}
 */
og.astro.J2000_OBLIQUITY = 23.4392911;

/**
 * IAU 1976 value
 * @const
 * @type{Number}
 */
og.astro.AU_TO_METERS = 1.49597870e+11;

/**
 * Terestrial and atomic time difference.
 * @const
 * @type{Number}
 */
og.astro.TDT_TAI = 32.184;

/**
 * Earth gravitational parameter product of gravitational constant G and the mass M of the Earth.
 * @const
 * @type{Number}
 */
og.astro.EARTH_GRAVITATIONAL_PARAMETER = 3.98600435e14;

/**
 * Sun gravitational parameter product of gravitational constant G and the mass M of the Sun.
 * @const
 * @type{Number}
 */
og.astro.SUN_GRAVITATIONAL_PARAMETER = 1.32712440018e20;

/**
 * Converts atomic time to barycentric dynamical time.
 * @param {Number} tai - Atomic time.
 * @returns {Number} - returns barycentric dynamical time.
 */
og.astro.TAItoTDB = function (tai) {
    tai += og.astro.TDT_TAI * og.jd.ONE_BY_SECONDS_PER_DAY;
    var g = 6.239996 + 0.0172019696544 * (tai - og.jd.J2000);
    return tai + 0.001658 * Math.sin(g + 1.671e-2 * Math.sin(g)) * og.jd.ONE_BY_SECONDS_PER_DAY;
};