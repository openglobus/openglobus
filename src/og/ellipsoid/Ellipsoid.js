"use strict";

import { LonLat } from "../LonLat.js";
import { DEGREES, EPS1, EPS12, EPS15, RADIANS, zeroTwoPI } from "../math.js";
import { Vec3 } from "../math/Vec3.js";

/**
 * Class represents a plant ellipsoid.
 * @class
 * @param {number} equatorialSize - Equatorial ellipsoid size.
 * @param {number} polarSize - Polar ellipsoid size.
 */
class Ellipsoid {
    /**
     * @param {number} equatorialSize - Equatorial ellipsoid size.
     * @param {number} polarSize - Polar ellipsoid size.
     */
    constructor(equatorialSize, polarSize) {
        this._a = equatorialSize;
        this._b = polarSize;
        this._flattening = (equatorialSize - polarSize) / equatorialSize;
        this._f = 1 / this._flattening;

        this._a2 = equatorialSize * equatorialSize;
        this._b2 = polarSize * polarSize;

        var qa2b2 = Math.sqrt(this._a2 - this._b2);

        this._e = qa2b2 / equatorialSize;
        this._e2 = this._e * this._e;
        this._e22 = this._e2 * this._e2;

        this._k = qa2b2 / polarSize;
        this._k2 = this._k * this._k;

        this._radii = new Vec3(equatorialSize, equatorialSize, polarSize);
        this._radii2 = new Vec3(this._a2, this._a2, this._b2);
        this._invRadii = new Vec3(1.0 / equatorialSize, 1.0 / equatorialSize, 1.0 / polarSize);
        this._invRadii2 = new Vec3(1.0 / this._a2, 1.0 / this._a2, 1.0 / this._b2);
    }

    /**
     * Returns the distance travelling from ‘this’ point to destination point along a rhumb line.
     * @param   {LonLat} start coordinates.
     * @param   {LonLat} end coordinates
     * @returns {number} Distance in m between this point and destination point (same units as radius).
     */
    rhumbDistanceTo(startLonLat, endLonLat) {
        const f1 = startLonLat.lat * RADIANS;
        const f2 = endLonLat.lat * RADIANS;
        const df = f2 - f1;
        let d = Math.abs(endLonLat.lon - startLonLat.lon) * RADIANS;
        if (Math.abs(d) > Math.PI) d = d > 0 ? -(2 * Math.PI - d) : (2 * Math.PI + d);
        const dd = Math.log(Math.tan(f2 / 2 + Math.PI / 4) / Math.tan(f1 / 2 + Math.PI / 4));
        const q = Math.abs(dd) > 10e-12 ? df / dd : Math.cos(f1);
        const t = Math.sqrt(df * df + q * q * d * d); // angular distance in radians
        return t * this._a;
    }

    /**
     * Returns the point at given fraction between two points on the great circle.
     * @param   {LonLat} lonLat1 - Longitude/Latitude of source point.
     * @param   {LonLat} lonLat2 - Longitude/Latitude of destination point.
     * @param   {number} fraction - Fraction between the two points (0 = source point, 1 = destination point).
     * @returns {LonLat} Intermediate point between points.
     */
    getIntermediatePointOnGreatCircle(lonLat1, lonLat2, fraction) {

        if (fraction == 0) return lonLat1.clone();
        if (fraction == 1) return lonLat2.clone();

        const inverse = this.inverse(lonLat1, lonLat2);
        const dist = inverse.distance;
        const azimuth = inverse.initialAzimuth;
        return isNaN(azimuth) ? lonLat1 : this.getGreatCircleDestination(lonLat1, azimuth, dist * fraction);
    }

    /**
     * REMOVE ASAP after
     * @param lonLat1
     * @param lonLat2
     * @returns {number}
     */
    static getBearing(lonLat1, lonLat2) {
        var f1 = lonLat1.lat * RADIANS,
            l1 = lonLat1.lon * RADIANS;
        var f2 = lonLat2.lat * RADIANS,
            l2 = lonLat2.lon * RADIANS;
        var y = Math.sin(l2 - l1) * Math.cos(f2);
        var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(l2 - l1);
        return Math.atan2(y, x) * DEGREES;
    }

    getFlattening() {
        return this._flattening;
    }

    /**
     * Gets ellipsoid equatorial size.
     * @public
     * @returns {number} -
     */
    getEquatorialSize() {
        return this._a;
    }

    /**
     * Gets ellipsoid polar size.
     * @public
     * @returns {number} -
     */
    getPolarSize() {
        return this._b;
    }

    /**
     * Calculate cartesian coordinates by its ECEF geodetic coordinates.
     * @public
     * @param {LonLat} lonlat - Geodetic coordinates.
     * @returns {Vec3} -
     */
    lonLatToCartesian(lonlat) {
        return this.geodeticToCartesian(lonlat.lon, lonlat.lat, lonlat.height);
    }

    /**
     * Calculate cartesian coordinates by its ECEF geodetic coordinates.
     * @public
     * @param {LonLat} lonlat - Geodetic coordinates.
     * @param {Vec3} res - Output variable reference.
     * @returns {Vec3} -
     */
    lonLatToCartesianRes(lonlat, res) {
        return this.geodeticToCartesian(lonlat.lon, lonlat.lat, lonlat.height, res);
    }

    /**
     * Gets cartesian ECEF from Wgs84 geodetic coordinates.
     * @public
     * @param {Number} lon - Longitude.
     * @param {Number} lat - Latitude.
     * @param {Number} height - Height.
     * @returns {Vec3} -
     */
    geodeticToCartesian(lon, lat, height = 0, res) {
        res = res || new Vec3();

        let latrad = RADIANS * lat,
            lonrad = RADIANS * lon;

        let slt = Math.sin(latrad);

        let N = this._a / Math.sqrt(1 - this._e2 * slt * slt);
        let nc = (N + height) * Math.cos(latrad);

        // return new Vec3(
        //     nc * Math.sin(lonrad),
        //     (N * (1 - this._e2) + height) * slt,
        //     nc * Math.cos(lonrad)
        // );

        res.x = nc * Math.cos(lonrad);
        res.y = nc * Math.sin(lonrad);
        res.z = (N * (1 - this._e2) + height) * slt;

        return res;
    }

    /**
     * Gets Wgs84 geodetic coordinates from cartesian ECEF.
     * @public
     * @param {Vec3} p - Cartesian coordinates.
     * @returns {LonLat} -
     */
    projToSurface(p) {

        let pX = p.x || 0.0,
            pY = p.y || 0.0,
            pZ = p.z || 0.0;

        let length = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

        let invRadii2X = this._invRadii2.x,
            invRadii2Y = this._invRadii2.y,
            invRadii2Z = this._invRadii2.z;

        let x2 = pX * pX * invRadii2X,
            y2 = pY * pY * invRadii2Y,
            z2 = pZ * pZ * invRadii2Z;

        let norm = x2 + y2 + z2;
        let ratio = Math.sqrt(1.0 / norm);
        let first = p.scaleTo(ratio);

        if (norm < EPS1) {
            return !Number.isFinite(ratio) ? new Vec3() : first
        }

        let lambda = ((1.0 - ratio) * length) / first.mulA(this._invRadii2).length();

        let m_X = 0.0, m_Y = 0.0, m_Z = 0.0;

        do {
            m_X = 1.0 / (1.0 + lambda * invRadii2X);
            m_Y = 1.0 / (1.0 + lambda * invRadii2Y);
            m_Z = 1.0 / (1.0 + lambda * invRadii2Z);

            let m_X2 = m_X * m_X,
                m_Y2 = m_Y * m_Y,
                m_Z2 = m_Z * m_Z;

            let func = x2 * m_X2 + y2 * m_Y2 + z2 * m_Z2 - 1.0;

            if (Math.abs(func) < EPS12) {
                break;
            }

            let m_X3 = m_X2 * m_X,
                m_Y3 = m_Y2 * m_Y,
                m_Z3 = m_Z2 * m_Z;

            lambda += 0.5 * func / (x2 * m_X3 * invRadii2X + y2 * m_Y3 * invRadii2Y + z2 * m_Z3 * invRadii2Z);

        } while (true); // eslint-disable-line

        return new Vec3(pX * m_X, pY * m_Y, pZ * m_Z);
    }

    /**
     * Converts 3d cartesian coordinates to geodetic
     * @param {Vec3} cart - Cartesian coordinates
     * @returns {LonLat} - Geodetic coordinates
     */
    cartesianToLonLat(cart) {
        return this.cartesianToLonLatRes(cart);
    }

    /**
     * Converts 3d cartesian coordinates to geodetic
     * @param {Vec3} cart - Cartesian coordinates
     * @param {LonLat} res - Link geodetic coordinates variable
     * @returns {LonLat} - Geodetic coordinates
     */
    cartesianToLonLatRes(cart, res) {
        res = res || new LonLat();
        let p = this.projToSurface(cart);
        let n = this.getSurfaceNormal3v(p),
            h = cart.sub(p);
        // res.lon = Math.atan2(n.x, n.z) * DEGREES;
        // res.lat = Math.asin(n.y) * DEGREES;

        res.lon = Math.atan2(n.y, n.x) * DEGREES;
        res.lat = Math.asin(n.z) * DEGREES;

        res.height = Math.sign(h.dot(cart)) * h.length();
        return res;
    }

    /**
     * Gets ellipsoid surface normal.
     * @public
     * @param {Vec3} coord - Spatial coordinates.
     * @return {Vec3} -
     */
    getSurfaceNormal3v(coord) {
        let r2 = this._invRadii2;
        let nx = coord.x * r2.x,
            ny = coord.y * r2.y,
            nz = coord.z * r2.z;
        let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        return new Vec3(nx * l, ny * l, nz * l);
    }

    getGreatCircleDistance(lonLat1, lonLat2) {
        return this.inverse(lonLat1, lonLat2).distance;
    }

    /**
     * Calculates the destination point given start point lat / lon, azimuth(deg) and distance (m).
     * Source: http://movable-type.co.uk/scripts/latlong-vincenty-direct.html and optimized / cleaned up by Mathias Bynens <http://mathiasbynens.be/>
     * Based on the Vincenty direct formula by T. Vincenty, “Direct and Inverse Solutions of Geodesics on the Ellipsoid with application of nested equations”, Survey Review, vol XXII no 176, 1975 <http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf>
     * @param {LonLat} lonLat - Origin coordinates
     * @param {number} azimuth - View azimuth in degrees
     * @param {number} dist - Distance to the destination point coordinates in meters
     * @returns {LonLat} - Destination point coordinates
     */
    getGreatCircleDestination(lonLat, azimuth, dist) {
        return this.direct(lonLat, azimuth, dist).destination;
    }

    inverse(lonLat1, lonLat2) {

        let a = this._a, b = this._b, f = this._flattening;

        const fi1 = lonLat1.lat * RADIANS, lambda1 = lonLat1.lon * RADIANS;
        const fi2 = lonLat2.lat * RADIANS, lambda2 = lonLat2.lon * RADIANS;

        const L = lambda2 - lambda1; // L = difference in longitude, U = reduced latitude, defined by tan U = (1-f)·tanφ.
        const tanU1 = (1 - f) * Math.tan(fi1), cosU1 = 1 / Math.sqrt((1 + tanU1 * tanU1)), sinU1 = tanU1 * cosU1;
        const tanU2 = (1 - f) * Math.tan(fi2), cosU2 = 1 / Math.sqrt((1 + tanU2 * tanU2)), sinU2 = tanU2 * cosU2;

        const antipodal = Math.abs(L) > Math.PI / 2 || Math.abs(fi2 - fi1) > Math.PI / 2;

        let lmb = L, sinLmb = null, cosLmb = null; // lmb - difference in longitude on an auxiliary sphere
        let s = antipodal ? Math.PI : 0, sin_s = 0, cos_s = antipodal ? -1 : 1, sinSqs = null; // s - angular distance lonLat1 lonLat2 on the sphere
        let cos2sm = 1;                      // sm - angular distance on the sphere from the equator to the midpoint of the line
        let cosSqa = 1;                      // a - azimuth of the geodesic at the equator

        let lmb_ = null, iterations = 0;
        do {
            sinLmb = Math.sin(lmb);
            cosLmb = Math.cos(lmb);
            sinSqs = (cosU2 * sinLmb) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLmb) ** 2;
            if (Math.abs(sinSqs) < 1e-24) break;  // co-incident/antipodal points (σ < ≈0.006mm)
            sin_s = Math.sqrt(sinSqs);
            cos_s = sinU1 * sinU2 + cosU1 * cosU2 * cosLmb;
            s = Math.atan2(sin_s, cos_s);
            const sin_a = cosU1 * cosU2 * sinLmb / sin_s;
            cosSqa = 1 - sin_a * sin_a;
            cos2sm = (cosSqa != 0) ? (cos_s - 2 * sinU1 * sinU2 / cosSqa) : 0; // on equatorial line cos²α = 0 (§6)
            const C = f / 16 * cosSqa * (4 + f * (4 - 3 * cosSqa));
            lmb_ = lmb;
            lmb = L + (1 - C) * f * sin_a * (s + C * sin_s * (cos2sm + C * cos_s * (-1 + 2 * cos2sm * cos2sm)));
        } while (Math.abs(lmb - lmb_) > EPS12 && ++iterations < 1000);

        const uSq = cosSqa * (a * a - b * b) / (b * b);
        const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
        const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
        const ds = B * sin_s * (cos2sm + B / 4 * (cos_s * (-1 + 2 * cos2sm * cos2sm) - B / 6 * cos2sm * (-3 + 4 * sin_s * sin_s) * (-3 + 4 * cos2sm * cos2sm)));

        const dist = b * A * (s - ds); // s = length of the geodesic

        // note special handling of exactly antipodal points where sin²σ = 0 (due to discontinuity
        // atan2(0, 0) = 0 but atan2(ε, 0) = π/2 / 90°) - in which case bearing is always meridional,
        // due north (or due south!)
        // α = azimuths of the geodesic; α2 the direction P₁ P₂ produced
        const a1 = Math.abs(sinSqs) < Number.EPSILON ? 0 : Math.atan2(cosU2 * sinLmb, cosU1 * sinU2 - sinU1 * cosU2 * cosLmb);
        const a2 = Math.abs(sinSqs) < Number.EPSILON ? Math.PI : Math.atan2(cosU1 * sinLmb, -sinU1 * cosU2 + cosU1 * sinU2 * cosLmb);

        return {
            distance: dist,
            initialAzimuth: Math.abs(dist) < Number.EPSILON ? NaN : zeroTwoPI(a1) * DEGREES,
            finalAzimuth: Math.abs(dist) < Number.EPSILON ? NaN : zeroTwoPI(a2) * DEGREES
        };
    }

    /**
     * Calculates the destination point given start point lat / lon, azimuth(deg) and distance (m).
     * Source: http://movable-type.co.uk/scripts/latlong-vincenty-direct.html and optimized / cleaned up by Mathias Bynens <http://mathiasbynens.be/>
     * Based on the Vincenty direct formula by T. Vincenty, “Direct and Inverse Solutions of Geodesics on the Ellipsoid with application of nested equations”, Survey Review, vol XXII no 176, 1975 <http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf>
     * @param {LonLat} lonLat - Origin coordinates
     * @param {number} azimuth - View azimuth in degrees
     * @param {number} dist - Distance to the destination point coordinates in meters
     * @returns {LonLat} - Destination point coordinates
     */
    direct(lonLat, azimuth, dist) {
        let lon1 = lonLat.lon,
            lat1 = lonLat.lat;
        let a = this._a,
            b = this._b,
            f = this._flattening,
            s = dist,
            alpha1 = azimuth * RADIANS,
            sinAlpha1 = Math.sin(alpha1),
            cosAlpha1 = Math.cos(alpha1),
            tanU1 = (1 - f) * Math.tan(lat1 * RADIANS),
            cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
            sinU1 = tanU1 * cosU1,
            sigma1 = Math.atan2(tanU1, cosAlpha1),
            sinAlpha = cosU1 * sinAlpha1,
            cosSqAlpha = 1 - sinAlpha * sinAlpha,
            uSq = (cosSqAlpha * (a * a - b * b)) / (b * b),
            A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))),
            B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq))),
            sigma = s / (b * A),
            sigmaP = 2 * Math.PI;
        while (Math.abs(sigma - sigmaP) > 1e-12) {
            var cos2SigmaM = Math.cos(2 * sigma1 + sigma),
                sinSigma = Math.sin(sigma),
                cosSigma = Math.cos(sigma),
                deltaSigma = B * sinSigma *
                    (cos2SigmaM + (B / 4) *
                        (
                            cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
                            (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)
                        ));
            sigmaP = sigma;
            sigma = s / (b * A) + deltaSigma;
        }
        let tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1,
            lat2 = Math.atan2(
                sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
                (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
            ),
            lambda = Math.atan2(
                sinSigma * sinAlpha1,
                cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
            ),
            C = (f / 16.0) * cosSqAlpha * (4.0 + f * (4.0 - 3.0 * cosSqAlpha)),
            L = lambda - (1.0 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM))),
            revAz = Math.atan2(sinAlpha, -tmp);

        return {
            destination: new LonLat(lon1 + L * DEGREES, lat2 * DEGREES),
            finalAzimuth: revAz * DEGREES
        };
    }


    /**
     * Returns cartesian coordinates of the intersection of a ray and an ellipsoid.
     * If the ray doesn't hit ellipsoid returns null.
     * @public
     * @param {Vec3} origin - Ray origin point.
     * @param {Vec3} direction - Ray direction.
     * @returns {Vec3} -
     */
    hitRay(origin, direction) {
        var q = this._invRadii.mul(origin);
        var w = this._invRadii.mul(direction);

        var q2 = q.dot(q);
        var qw = q.dot(w);

        var difference, w2, product, discriminant, temp;

        if (q2 > 1.0) {
            // Outside ellipsoid.
            if (qw >= 0.0) {
                // Looking outward or tangent (0 intersections).
                return null;
            }

            // qw < 0.0.
            var qw2 = qw * qw;
            difference = q2 - 1.0; // Positively valued.
            w2 = w.dot(w);
            product = w2 * difference;

            let eps = Math.abs(qw2 - product);

            if (eps > EPS15 && qw2 < product) {
                // Imaginary roots (0 intersections).
                return null;
            } else if (qw2 > product) {
                // Distinct roots (2 intersections).
                discriminant = qw * qw - product;
                temp = -qw + Math.sqrt(discriminant); // Avoid cancellation.
                var root0 = temp / w2;
                var root1 = difference / temp;
                if (root0 < root1) {
                    return origin.add(direction.scaleTo(root0));
                }
                return origin.add(direction.scaleTo(root1));
            } else {
                // qw2 == product.  Repeated roots (2 intersections).
                var root = Math.sqrt(difference / w2);
                return origin.add(direction.scaleTo(root));
            }
        } else if (q2 < 1.0) {
            // Inside ellipsoid (2 intersections).
            difference = q2 - 1.0; // Negatively valued.
            w2 = w.dot(w);
            product = w2 * difference; // Negatively valued.
            discriminant = qw * qw - product;
            temp = -qw + Math.sqrt(discriminant); // Positively valued.
            return origin.add(direction.scaleTo(temp / w2));
        } else {
            // q2 == 1.0. On ellipsoid.
            if (qw < 0.0) {
                // Looking inward.
                w2 = w.dot(w);
                return origin.add(direction.scaleTo(-qw / w2));
            }
            // qw >= 0.0.  Looking outward or tangent.
            // return undefined
        }
    }

    /**
     * @todo this is not precise function, needs to be replaced or removed
     * @param lonLat1
     * @param bearing
     * @param distance
     * @returns {LonLat}
     */
    getBearingDestination(lonLat1, bearing = 0.0, distance = 0) {
        bearing = bearing * RADIANS;
        var nlon = ((lonLat1.lon + 540) % 360) - 180;
        var f1 = lonLat1.lat * RADIANS,
            l1 = nlon * RADIANS;
        var dR = distance / this._a;
        var f2 = Math.asin(
            Math.sin(f1) * Math.cos(dR) + Math.cos(f1) * Math.sin(dR) * Math.cos(bearing)
        );
        return new LonLat(
            (l1 +
                Math.atan2(
                    Math.sin(bearing) * Math.sin(dR) * Math.cos(f1),
                    Math.cos(dR) - Math.sin(f1) * Math.sin(f2)
                )) *
            DEGREES,
            f2 * DEGREES
        );
    }

    /**
     * Returns the point at given fraction between two points on the great circle.
     * @param   {LonLat} lonLat1 - Longitude/Latitude of source point.
     * @param   {LonLat} lonLat2 - Longitude/Latitude of destination point.
     * @param   {number} fraction - Fraction between the two points (0 = source point, 1 = destination point).
     * @returns {LonLat} Intermediate point between points.
     */
    static getIntermediatePointOnGreatCircle(lonLat1, lonLat2, fraction) {
        var f1 = lonLat1.lat * RADIANS,
            l1 = lonLat1.lon * RADIANS;
        var f2 = lonLat2.lat * RADIANS,
            l2 = lonLat2.lon * RADIANS;

        var sinf1 = Math.sin(f1),
            cosf1 = Math.cos(f1),
            sinl1 = Math.sin(l1),
            cosl1 = Math.cos(l1);
        var sinf2 = Math.sin(f2),
            cosf2 = Math.cos(f2),
            sinl2 = Math.sin(l2),
            cosl2 = Math.cos(l2);

        var df = f2 - f1,
            dl = l2 - l1;
        var a =
            Math.sin(df / 2) * Math.sin(df / 2) +
            Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        var d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var A = Math.sin((1 - fraction) * d) / Math.sin(d);
        var B = Math.sin(fraction * d) / Math.sin(d);

        var x = A * cosf1 * cosl1 + B * cosf2 * cosl2;
        var y = A * cosf1 * sinl1 + B * cosf2 * sinl2;
        var z = A * sinf1 + B * sinf2;

        var f3 = Math.atan2(z, Math.sqrt(x * x + y * y));
        var l3 = Math.atan2(y, x);

        return new LonLat(((l3 * DEGREES + 540) % 360) - 180, f3 * DEGREES);
    }

    static getRhumbBearing(lonLat1, lonLat2) {
        var dLon = (lonLat2.lon - lonLat1.lon) * RADIANS;
        var dPhi = Math.log(
            Math.tan((lonLat2.lat * RADIANS) / 2 + Math.PI / 4) /
            Math.tan((lonLat1.lat * RADIANS) / 2 + Math.PI / 4)
        );
        if (Math.abs(dLon) > Math.PI) {
            if (dLon > 0) {
                dLon = (2 * Math.PI - dLon) * -1;
            } else {
                dLon = 2 * Math.PI + dLon;
            }
        }
        return (Math.atan2(dLon, dPhi) * DEGREES + 360) % 360;
    }
}

export { Ellipsoid };
