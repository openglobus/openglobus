goog.provide('og.Ellipsoid');

goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.LonLat');

/**
 * Class represents a plant ellipsoid.
 * @class
 * @param {number} equatorialSize - Equatorial ellipsoid size.
 * @param {number} polarSize - Polar ellipsoid size.
 */
og.Ellipsoid = function (equatorialSize, polarSize) {
    this._a = equatorialSize;
    this._b = polarSize;
    //this._flattening = equatorialSize / polarSize;

    this._a2 = equatorialSize * equatorialSize;
    this._b2 = polarSize * polarSize;

    var qa2b2 = Math.sqrt(this._a2 - this._b2);

    this._e = qa2b2 / equatorialSize;
    this._e2 = this._e * this._e;
    this._e22 = this._e2 * this._e2;

    this._k = qa2b2 / polarSize;
    this._k2 = this._k * this._k;

    this._radii = new og.math.Vector3(equatorialSize, polarSize, equatorialSize);
    this._radii2 = new og.math.Vector3(this._a2, this._b2, this._a2);
    this._invRadii = new og.math.Vector3(1 / equatorialSize, 1 / polarSize, 1 / equatorialSize);
    this._invRadii2 = new og.math.Vector3(1 / this._a2, 1 / this._b2, 1 / this._a2);
};

/**
 * Gets ellipsoid equatorial size.
 * @public
 * @retuens {number}
 */
og.Ellipsoid.prototype.getEquatorialSize = function () {
    return this._a;
};

/**
 * Gets ellipsoid polar size.
 * @public
 * @retuens {number}
 */
og.Ellipsoid.prototype.getPolarSize = function () {
    return this._b;
};

/**
 * Gets cartesian ECEF from Wgs84 geodetic coordiantes.
 * @public
 * @param {og.LonLat} lonlat - Degrees geodetic coordiantes.
 * @returns {og.math.Vector3}
 */
og.Ellipsoid.prototype.lonLatToCartesian = function (lonlat) {
    var latrad = og.math.RADIANS * lonlat.lat,
        lonrad = og.math.RADIANS * lonlat.lon;

    var slt = Math.sin(latrad);

    var N = this._a / Math.sqrt(1 - this._e2 * slt * slt);
    var nc = (N + lonlat.height) * Math.cos(latrad);

    return new og.math.Vector3(
        nc * Math.sin(lonrad),
        (N * (1 - this._e2) + lonlat.height) * slt,
        nc * Math.cos(lonrad));
};

/**
 * Gets Wgs84 geodetic coordiantes from cartesian ECEF.
 * @public
 * @param {og.math.Vector3} cartesian - Cartesian coordinates.
 * @returns {og.LonLat}
 */
og.Ellipsoid.prototype.cartesianToLonLat = function (cartesian) {
    var x = cartesian.z, y = cartesian.x, z = cartesian.y;
    var ecc2 = this._e2;
    var ecc22 = this._e22;
    var r2 = x * x + y * y;
    var r = Math.sqrt(r2);
    var e2 = this._a2 - this._b2;
    var z2 = z * z;
    var f = 54.0 * this._b2 * z2;
    var g = r2 + (1 - ecc2) * z2 + ecc2 * e2;
    var g2 = g * g;
    var c = ecc22 * f * r2 / (g2 * g);
    var s = Math.pow((1 + c + Math.sqrt(c * (c + 2))), 0.33333333333333333);
    var p = f / (3 * Math.pow((1 + s + 1 / s), 2) * g2);
    var q = Math.sqrt(1 + 2 * ecc22 * p);
    var r0 = -(p * ecc2 * r) / 1 + q + Math.sqrt(0.5 * this._a2 * (1 + 1 / q) - p * (1 - ecc2) * z2 / (q * (1 + q)) - 0.5 * p * r2);
    var recc2r0 = r - ecc2 * r0;
    var recc2r02 = recc2r0 * recc2r0;
    var u = Math.sqrt(recc2r02 + z2);
    var v = Math.sqrt(recc2r02 + (1 - ecc2) * z2);
    var z0 = this._b2 * z / (this._a * v);
    var h = u * (1 - this._b2 / (this._a * v));
    var phi = Math.atan((z + this._k2 * z0) / r);
    var lambda = Math.atan2(y, x);
    var lat = phi * og.math.DEGREES;
    var lon = lambda * og.math.DEGREES;
    return new og.LonLat(lon, lat, h);
};

/**
 * Gets ellipsoid surface normal.
 * @public
 * @param {og.math.Vector3} coord - Spatial coordiantes.
 * @returns {og.math.Vector3}
 */
og.Ellipsoid.prototype.getSurfaceNormal3v = function (coord) {
    var r2 = this._invRadii2;
    var nx = coord.x * r2.x, ny = coord.y * r2.y, nz = coord.z * r2.z;
    var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    return new og.math.Vector3(nx * l, ny * l, nz * l);
};

/**
 * Gets the cartesian point on the height over the ellipsoid surface.
 * @public
 * @param {og.math.Vector3} coord - Spatial ellipsoid coordiantes.
 * @param {number} h - Height this spatial coordinates.
 * @returns {og.math.Vector3}
 */
og.Ellipsoid.prototype.getSurfaceHeight3v = function (coord, h) {
    var r2 = this._invRadii2;
    var nx = coord.x * r2.x, ny = coord.y * r2.y, nz = coord.z * r2.z;
    var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    return new og.math.Vector3(coord.x + h * nx * l, coord.y + h * ny * l, coord.z + h * nz * l);
};
