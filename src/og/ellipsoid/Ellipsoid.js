/**
 * @module og/ellipsoid/Ellipsoid
 */

"use strict";

import * as math from "../math.js";
import { Vec3 } from "../math/Vec3.js";
import { LonLat } from "../LonLat.js";

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

        this._radii = new Vec3(equatorialSize, polarSize, equatorialSize);
        this._radii2 = new Vec3(this._a2, this._b2, this._a2);
        this._invRadii = new Vec3(1.0 / equatorialSize, 1.0 / polarSize, 1.0 / equatorialSize);
        this._invRadii2 = new Vec3(1.0 / this._a2, 1.0 / this._b2, 1.0 / this._a2);
    }

    static getRelativeBearing(a, b) {
        let a_y = Math.cos(a),
            a_x = Math.sin(a),
            b_y = Math.cos(b),
            b_x = Math.sin(b);
        let c = a_y * b_x - b_y * a_x,
            d = a_x * b_x + a_y * b_y;
        if (c > 0.0) {
            return Math.acos(d);
        }
        return -Math.acos(d);
    }

    /**
     * Returns the midpoint between two points on the great circle.
     * @param   {LonLat} lonLat1 - Longitude/latitude of first point.
     * @param   {LonLat} lonLat2 - Longitude/latitude of second point.
     * @return {LonLat} Midpoint between points.
     */
    static getMiddlePointOnGreatCircle(lonLat1, lonLat2) {
        var f1 = lonLat1.lat * math.RADIANS,
            l1 = lonLat1.lon * math.RADIANS;
        var f2 = lonLat2.lat * math.RADIANS;
        var dl = (lonLat2.lon - lonLat1.lon) * math.RADIANS;

        var Bx = Math.cos(f2) * Math.cos(dl);
        var By = Math.cos(f2) * Math.sin(dl);

        var x = Math.sqrt((Math.cos(f1) + Bx) * (Math.cos(f1) + Bx) + By * By);
        var y = Math.sin(f1) + Math.sin(f2);
        var f3 = Math.atan2(y, x);

        var l3 = l1 + Math.atan2(By, Math.cos(f1) + Bx);

        return new LonLat(((l3 * math.DEGREES + 540) % 360) - 180, f3 * math.DEGREES);
    }

    /**
     * Returns the point at given fraction between two points on the great circle.
     * @param   {LonLat} lonLat1 - Longitude/Latitude of source point.
     * @param   {LonLat} lonLat2 - Longitude/Latitude of destination point.
     * @param   {number} fraction - Fraction between the two points (0 = source point, 1 = destination point).
     * @returns {LonLat} Intermediate point between points.
     */
    static getIntermediatePointOnGreatCircle(lonLat1, lonLat2, fraction) {
        var f1 = lonLat1.lat * math.RADIANS,
            l1 = lonLat1.lon * math.RADIANS;
        var f2 = lonLat2.lat * math.RADIANS,
            l2 = lonLat2.lon * math.RADIANS;

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

        return new LonLat(((l3 * math.DEGREES + 540) % 360) - 180, f3 * math.DEGREES);
    }

    static getRhumbBearing(lonLat1, lonLat2) {
        var dLon = (lonLat2.lon - lonLat1.lon) * math.RADIANS;
        var dPhi = Math.log(
            Math.tan((lonLat2.lat * math.RADIANS) / 2 + Math.PI / 4) /
                Math.tan((lonLat1.lat * math.RADIANS) / 2 + Math.PI / 4)
        );
        if (Math.abs(dLon) > Math.PI) {
            if (dLon > 0) {
                dLon = (2 * Math.PI - dLon) * -1;
            } else {
                dLon = 2 * Math.PI + dLon;
            }
        }
        return (Math.atan2(dLon, dPhi) * math.DEGREES + 360) % 360;
    }

    static getBearing(lonLat1, lonLat2) {
        var f1 = lonLat1.lat * math.RADIANS,
            l1 = lonLat1.lon * math.RADIANS;
        var f2 = lonLat2.lat * math.RADIANS,
            l2 = lonLat2.lon * math.RADIANS;
        var y = Math.sin(l2 - l1) * Math.cos(f2);
        var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(l2 - l1);
        return Math.atan2(y, x) * math.DEGREES;
    }

    /**
     * Returns the (initial) bearing from source to destination point on the great circle.
     * @param {LonLat} lonLat1 - Longitude/latitude of source point.
     * @param {LonLat} lonLat2 - Longitude/latitude of destination point.
     * @return {number} Initial bearing in degrees from north.
     */
    static getInitialBearing(lonLat1, lonLat2) {
        var f1 = lonLat1.lat * math.RADIANS,
            f2 = lonLat2.lat * math.RADIANS;
        var dl = (lonLat2.lon - lonLat1.lon) * math.RADIANS;
        var y = Math.sin(dl) * Math.cos(f2);
        var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
        var D = Math.atan2(y, x);
        return (D * math.DEGREES + 360) % 360;
    }

    /**
     * Returns the point of intersection of two paths defined by point and bearing.
     * @param   {LonLat} p1 - First point.
     * @param   {number} brng1 - Initial bearing from first point.
     * @param   {LonLat} p2 - Second point.
     * @param   {number} brng2 - Initial bearing from second point.
     * @return {LonLat|null} Destination point (null if no unique intersection defined).
     */
    static intersection(p1, brng1, p2, brng2) {
        var f1 = p1.lat * math.RADIANS,
            l1 = p1.lon * math.RADIANS;
        var f2 = p2.lat * math.RADIANS,
            l2 = p2.lon * math.RADIANS;
        var D13 = brng1 * math.RADIANS,
            D23 = brng2 * math.RADIANS;
        var df = f2 - f1,
            dl = l2 - l1;

        var d12 =
            2 *
            Math.asin(
                Math.sqrt(
                    Math.sin(df / 2) * Math.sin(df / 2) +
                        Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2)
                )
            );
        if (d12 == 0) return null;

        // initial/final bearings between points
        var Da = Math.acos(
            (Math.sin(f2) - Math.sin(f1) * Math.cos(d12)) / (Math.sin(d12) * Math.cos(f1))
        );
        if (isNaN(Da)) Da = 0; // protect against rounding
        var Db = Math.acos(
            (Math.sin(f1) - Math.sin(f2) * Math.cos(d12)) / (Math.sin(d12) * Math.cos(f2))
        );

        var D12 = Math.sin(l2 - l1) > 0 ? Da : 2 * Math.PI - Da;
        var D21 = Math.sin(l2 - l1) > 0 ? 2 * Math.PI - Db : Db;

        var a1 = ((D13 - D12 + Math.PI) % (2 * Math.PI)) - Math.PI;
        var a2 = ((D21 - D23 + Math.PI) % (2 * Math.PI)) - Math.PI;

        if (Math.sin(a1) == 0 && Math.sin(a2) == 0) return null; // infinite intersections
        if (Math.sin(a1) * Math.sin(a2) < 0) return null; // ambiguous intersection

        // a1 = Math.abs(a1);
        // a2 = Math.abs(a2);
        // ... Ed Williams takes abs of a1/a2, but seems to break calculation?

        var a3 = Math.acos(
            -Math.cos(a1) * Math.cos(a2) + Math.sin(a1) * Math.sin(a2) * Math.cos(d12)
        );
        var d13 = Math.atan2(
            Math.sin(d12) * Math.sin(a1) * Math.sin(a2),
            Math.cos(a2) + Math.cos(a1) * Math.cos(a3)
        );
        var f3 = Math.asin(
            Math.sin(f1) * Math.cos(d13) + Math.cos(f1) * Math.sin(d13) * Math.cos(D13)
        );
        var dl13 = Math.atan2(
            Math.sin(D13) * Math.sin(d13) * Math.cos(f1),
            Math.cos(d13) - Math.sin(f1) * Math.sin(f3)
        );
        var l3 = l1 + dl13;

        return new LonLat(((l3 * math.DEGREES + 540) % 360) - 180, f3 * math.DEGREES);
    }

    /**
     * Returns final bearing arriving at destination destination point from lonLat1 point; the final bearing
     * will differ from the initial bearing by varying degrees according to distance and latitude.
     * @param {LonLat} lonLat1 - Longitude/latitude of source point.
     * @param {LonLat} lonLat2 - Longitude/latitude of destination point.
     * @return {number} Final bearing in degrees from north.
     */
    static getFinalBearing(lonLat1, lonLat2) {
        // get initial bearing from destination lonLat2 to lonLat1 & reverse it by adding 180°
        return (Ellipsoid.getInitialBearing(lonLat2, lonLat1) + 180) % 360;
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
     * Gets cartesian ECEF from Wgs84 geodetic coordiantes.
     * @public
     * @param {LonLat} lonlat - Degrees geodetic coordiantes.
     * @returns {Vec3} -
     */
    lonLatToCartesian(lonlat) {
        var latrad = math.RADIANS * lonlat.lat,
            lonrad = math.RADIANS * lonlat.lon;

        var slt = Math.sin(latrad);

        var N = this._a / Math.sqrt(1.0 - this._e2 * slt * slt);
        var nc = (N + lonlat.height) * Math.cos(latrad);

        return new Vec3(
            nc * Math.sin(lonrad),
            (N * (1.0 - this._e2) + lonlat.height) * slt,
            nc * Math.cos(lonrad)
        );
    }

    /**
     * Gets cartesian ECEF from Wgs84 geodetic coordiantes.
     * @public
     * @param {LonLat} lonlat - Degrees geodetic coordiantes.
     * @param {Vec3} res - Output result.
     * @returns {Vec3} -
     */
    lonLatToCartesianRes(lonlat, res) {
        var latrad = math.RADIANS * lonlat.lat,
            lonrad = math.RADIANS * lonlat.lon;

        var slt = Math.sin(latrad);

        var N = this._a / Math.sqrt(1.0 - this._e2 * slt * slt);
        var nc = (N + lonlat.height) * Math.cos(latrad);

        res.x = nc * Math.sin(lonrad);
        res.y = (N * (1.0 - this._e2) + lonlat.height) * slt;
        res.z = nc * Math.cos(lonrad);

        return res;
    }

    /**
     * Gets cartesian ECEF from Wgs84 geodetic coordiantes.
     * @public
     * @param {Number} lon - Longitude.
     * @param {Number} lat - Latitude.
     * @param {Number} height - Height.
     * @returns {Vec3} -
     */
    geodeticToCartesian(lon, lat, height = 0) {
        var latrad = math.RADIANS * lat,
            lonrad = math.RADIANS * lon;

        var slt = Math.sin(latrad);

        var N = this._a / Math.sqrt(1 - this._e2 * slt * slt);
        var nc = (N + height) * Math.cos(latrad);

        return new Vec3(
            nc * Math.sin(lonrad),
            (N * (1 - this._e2) + height) * slt,
            nc * Math.cos(lonrad)
        );
    }

    /**
     * Gets Wgs84 geodetic coordiantes from cartesian ECEF.
     * @public
     * @param {Vec3} cartesian - Cartesian coordinates.
     * @returns {LonLat} -
     */
    cartesianToLonLat(cartesian) {
        var x = cartesian.z,
            y = cartesian.x,
            z = cartesian.y;
        var ecc2 = this._e2;
        var ecc22 = this._e22;
        var r2 = x * x + y * y;
        var r = Math.sqrt(r2);
        var z2 = z * z;
        var f = 54.0 * this._b2 * z2;
        var g = r2 + (1.0 - ecc2) * z2 + ecc2 * (this._a2 - this._b2);
        var g2 = g * g;
        var c = (ecc22 * f * r2) / (g2 * g);
        var s = Math.pow(1.0 + c + Math.sqrt(c * (c + 2.0)), 0.33333333333333333);
        var p = f / (3.0 * Math.pow(1.0 + s + 1.0 / s, 2.0) * g2);
        var q = Math.sqrt(1.0 + 2.0 * ecc22 * p);
        var recc2r0 =
            r -
            ecc2 *
                (-(p * ecc2 * r) / 1 +
                    q +
                    Math.sqrt(
                        0.5 * this._a2 * (1.0 + 1.0 / q) -
                            (p * (1.0 - ecc2) * z2) / (q * (1.0 + q)) -
                            0.5 * p * r2
                    ));
        var recc2r02 = recc2r0 * recc2r0;
        var v = Math.sqrt(recc2r02 + (1.0 - ecc2) * z2);
        var z0 = (this._b2 * z) / (this._a * v);
        var lat = Math.atan((z + this._k2 * z0) / r) * math.DEGREES;
        var lon = Math.atan2(y, x) * math.DEGREES;
        return new LonLat(
            lon,
            lat,
            cartesian.length() - this.geodeticToCartesian(lon, lat).length()
        );
    }

    /**
     * Gets ellipsoid surface normal.
     * @public
     * @param {Vec3} coord - Spatial coordiantes.
     * @return {Vec3} -
     */
    getSurfaceNormal3v(coord) {
        var r2 = this._invRadii2;
        var nx = coord.x * r2.x,
            ny = coord.y * r2.y,
            nz = coord.z * r2.z;
        var l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        return new Vec3(nx * l, ny * l, nz * l);
    }

    /**
     * 
     * @param {LonLat} lonLat1 
     * @param {number} [bearing] 
     * @param {number} [distance] 
     * @return {LonLat} -
     */
    getBearingDestination(lonLat1, bearing = 0.0, distance = 0) {
        bearing = bearing * math.RADIANS;
        var nlon = ((lonLat1.lon + 540) % 360) - 180;
        var f1 = lonLat1.lat * math.RADIANS,
            l1 = nlon * math.RADIANS;
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
                math.DEGREES,
            f2 * math.DEGREES
        );
    }

    /**
     * Returns the distance from one point to another(using haversine formula) on the great circle.
     * @param   {LonLat} lonLat1 - Longitude/latitude of source point.
     * @param   {LonLat} lonLat2 - Longitude/latitude of destination point.
     * @return {number} Distance between points.
     */
    getGreatCircleDistance(lonLat1, lonLat2) {
        var dLat = (lonLat2.lat - lonLat1.lat) * math.RADIANS;
        var dLon = (lonLat2.lon - lonLat1.lon) * math.RADIANS;
        var a =
            Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
            Math.sin(dLon / 2.0) *
                Math.sin(dLon / 2) *
                Math.cos(lonLat1.lat * math.RADIANS) *
                Math.cos(lonLat2.lat * math.RADIANS);
        return this._a * 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    }

    /**
     * Calculates the destination point given start point lat / lon, bearing(deg) and distance (m).
     *
     * Taken from http://movable-type.co.uk/scripts/latlong-vincenty-direct.html and optimized / cleaned up by Mathias Bynens <http://mathiasbynens.be/>
     * Based on the Vincenty direct formula by T. Vincenty, “Direct and Inverse Solutions of Geodesics on the Ellipsoid with application of nested equations”, Survey Review, vol XXII no 176, 1975 <http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf>
     */
    getGreatCircleDestination(lonLat, brng, dist) {
        var lon1 = lonLat.lon,
            lat1 = lonLat.lat;
        var a = this._a,
            b = this._b,
            f = 1.0 / this._f,
            s = dist,
            alpha1 = brng * math.RADIANS,
            sinAlpha1 = Math.sin(alpha1),
            cosAlpha1 = Math.cos(alpha1),
            tanU1 = (1 - f) * Math.tan(lat1 * math.RADIANS),
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
                deltaSigma =
                    B *
                    sinSigma *
                    (cos2SigmaM +
                        (B / 4) *
                            (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
                                (B / 6) *
                                    cos2SigmaM *
                                    (-3 + 4 * sinSigma * sinSigma) *
                                    (-3 + 4 * cos2SigmaM * cos2SigmaM)));
            sigmaP = sigma;
            sigma = s / (b * A) + deltaSigma;
        }
        var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1,
            lat2 = Math.atan2(
                sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
                (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
            ),
            lambda = Math.atan2(
                sinSigma * sinAlpha1,
                cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1
            ),
            C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha)),
            L =
                lambda -
                (1 - C) *
                    f *
                    sinAlpha *
                    (sigma +
                        C *
                            sinSigma *
                            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM))),
            revAz = Math.atan2(sinAlpha, -tmp); // final bearing
        return new LonLat(lon1 + L * math.DEGREES, lat2 * math.DEGREES);
    }

    /**
     * Returns ray vector hit ellipsoid coordinates.
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

            if (qw2 < product) {
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
            return null;
        }
    }
}

export { Ellipsoid };
