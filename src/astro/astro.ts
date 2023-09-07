import {JulianDate, ONE_BY_SECONDS_PER_DAY, J2000} from "./jd";

/**
 * Angle between J2000 mean equator and the ecliptic plane.
 * 23 deg 26' 21".448 (Seidelmann, _Explanatory Supplement to the
 * Astronomical Almanac_ (1992), eqn 3.222-1.
 * @const
 * @type{number}
 */
export const J2000_OBLIQUITY = 23.4392911;

/**
 * IAU 1976 value
 * @const
 * @type{number}
 */
export const AU_TO_METERS = 1.4959787e11;

/**
 * Terrestrial and atomic time difference.
 * @const
 * @type{number}
 */
export const TDT_TAI = 32.184;

/**
 * Earth gravitational parameter product of gravitational constant G and the mass M of the Earth.
 * @const
 * @type{number}
 */
export const EARTH_GRAVITATIONAL_PARAMETER = 3.98600435e14;

/**
 * Sun gravitational parameter product of gravitational constant G and the mass M of the Sun.
 * @const
 * @type{number}
 */
export const SUN_GRAVITATIONAL_PARAMETER = 1.32712440018e20;

/**
 * Converts atomic time to barycentric dynamical time.
 * @param {JulianDate} tai - Atomic time.
 * @returns {JulianDate} - returns barycentric dynamical time.
 */
export function TAItoTDB(tai: JulianDate): JulianDate {
    tai += TDT_TAI * ONE_BY_SECONDS_PER_DAY;
    const g = 6.239996 + 0.0172019696544 * (tai - J2000);
    return tai + 0.001658 * Math.sin(g + 1.671e-2 * Math.sin(g)) * ONE_BY_SECONDS_PER_DAY;
}
