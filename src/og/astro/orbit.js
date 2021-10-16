/**
 * @module og/astro/orbit
 */

'use strict';

import * as math from '../math.js';
import { Mat3 } from '../math/Mat3.js';

export function getEccentricAnomaly(M, ecc) {
    if (ecc == 0.0) {
        // Circular orbit
        return M;
    } else if (ecc < 0.2) {
        // Low eccentricity, so use the standard iteration technique
        return math.solve_iteration_fixed(solveKeplerFunc1(ecc, M), M, 5);
    } else if (ecc < 0.9) {
        // Higher eccentricity elliptical orbit; use a more complex but
        // much faster converging iteration.
        return math.solve_iteration_fixed(solveKeplerFunc2(ecc, M), M, 6);
    } else if (ecc < 1.0) {
        // Extremely stable Laguerre-Conway method for solving Kepler's
        // equation.  Only use this for high-eccentricity orbits, as it
        // requires more calcuation.
        let E = M + 0.85 * ecc * sign(sin(M));
        return math.solve_iteration_fixed(solveKeplerLaguerreConway(ecc, M), E, 8);
    } else if (ecc == 1.0) {
        // TODO: Parabolic orbit
        return M;
    } else {
        // Laguerre-Conway method for hyperbolic (ecc > 1) orbits.
        let E = log(2 * M / ecc + 1.85);
        return math.solve_iteration_fixed(solveKeplerLaguerreConwayHyp(ecc, M), E, 30);
    }
}

// Standard iteration for solving Kepler's Equation
function solveKeplerFunc1(ecc, M) {
    return function (x) {
        return M + ecc * Math.sin(x);
    };
}

// Faster converging iteration for Kepler's Equation; more efficient
// than above for orbits with eccentricities greater than 0.3.  This
// is from Jean Meeus's _Astronomical Algorithms_ (2nd ed), p. 199
function solveKeplerFunc2(ecc, M) {
    return function (x) {
        return x + (M + ecc * Math.sin(x) - x) / (1 - ecc * Math.cos(x));
    };
}

function solveKeplerLaguerreConway(ecc, M) {
    return function (x) {
        var s = ecc * Math.sin(x);
        var c = ecc * Math.cos(x);
        var f = x - s - M;
        var f1 = 1 - c;
        var f2 = s;
        x += -5 * f / (f1 + Math.sign(f1) * Math.sqrt(abs(16 * f1 * f1 - 20 * f * f2)));
        return x;
    };
}

function solveKeplerLaguerreConwayHyp(ecc, M) {
    return function (x) {
        var s = ecc * Math.sinh(x);
        var c = ecc * Math.cosh(x);
        var f = s - x - M;
        var f1 = c - 1;
        var f2 = s;
        x += -5 * f / (f1 + Math.sign(f1) * Math.sqrt(Math.abs(16 * f1 * f1 - 20 * f * f2)));
        return x;
    };
}

export function getEllipticalEccentricAnomaly(meanAnomaly, eccentricity) {
    var tol = 0.00000001745;
    var iterations = 20;
    var e = meanAnomaly - 2.0 * Math.PI * (meanAnomaly / (2.0 * Math.PI) | 0);
    var err = 1;
    while (Math.abs(err) > tol && iterations > 0) {
        err = e - eccentricity * Math.sin(e) - meanAnomaly;
        var delta = err / (1 - eccentricity * Math.cos(e));
        e -= delta;
        iterations--;
    }
    return e;
}

export function getTrueAnomaly(eccentricAnomaly, eccentricity) {
    var revs = Math.floor(eccentricAnomaly / math.TWO_PI);
    eccentricAnomaly -= revs * math.TWO_PI;
    var trueAnomaly = Math.atan2(Math.sin(eccentricAnomaly) * Math.sqrt(1 - eccentricity * eccentricity),
        Math.cos(eccentricAnomaly) - eccentricity);
    trueAnomaly = math.zeroTwoPI(trueAnomaly);
    if (eccentricAnomaly < 0) {
        trueAnomaly -= math.TWO_PI;
    }
    return trueAnomaly + revs * math.TWO_PI;
}

export function getPerifocalToCartesianMatrix(argumentOfPeriapsis, inclination, rightAscension) {
    var res = new Mat3();
    var cosap = Math.cos(argumentOfPeriapsis),
        sinap = Math.sin(argumentOfPeriapsis),
        cosi = Math.cos(inclination),
        sini = Math.sin(inclination),
        cosraan = Math.cos(rightAscension),
        sinraan = Math.sin(rightAscension);
    res._m[0] = cosraan * cosap - sinraan * sinap * cosi;
    res._m[1] = sinraan * cosap + cosraan * sinap * cosi;
    res._m[2] = sinap * sini;
    res._m[3] = -cosraan * sinap - sinraan * cosap * cosi;
    res._m[4] = -sinraan * sinap + cosraan * cosap * cosi;
    res._m[5] = cosap * sini;
    res._m[6] = sinraan * sini;
    res._m[7] = -cosraan * sini;
    res._m[8] = cosi;
    return res;
}