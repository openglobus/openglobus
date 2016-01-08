goog.provide('og.Ellipsoid');

goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.LonLat');

og.Ellipsoid = function (equatorialSize, polarSize) {
    var a = this._a = equatorialSize;
    var b = this._b = polarSize;
    this.flattening = a / b;
    this.a2 = a * a;
    this.b2 = b * b;
    this._e = Math.sqrt(this.a2 - this.b2) / a;
    this._e2 = this._e * this._e;
    this._e22 = this._e2 * this._e2;
    this._k = Math.sqrt(this.a2 - this.b2) / b;
    this._k2 = this._k * this._k;
    this._radii = new og.math.Vector3(equatorialSize, polarSize, equatorialSize);
    this._radii2 = new og.math.Vector3(equatorialSize * equatorialSize, polarSize * polarSize, equatorialSize * equatorialSize);
    this._invRadii = new og.math.Vector3(1 / equatorialSize, 1 / polarSize, 1 / equatorialSize);
    this._invRadii2 = new og.math.Vector3(1 / (equatorialSize * equatorialSize), 1 / (polarSize * polarSize), 1 / (equatorialSize * equatorialSize));
};

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

og.Ellipsoid.prototype.cartesianToLonLat = function (cartesian) {
    var x = cartesian.z, y = cartesian.x, z = cartesian.y;
    var ecc2 = this._e2;
    var ecc22 = this._e22;
    var r2 = x * x + y * y;
    var r = Math.sqrt(r2);
    var e2 = this.a2 - this.b2;
    var z2 = z * z;
    var f = 54.0 * this.b2 * z2;
    var g = r2 + (1 - ecc2) * z2 + ecc2 * e2;
    var g2 = g * g;
    var c = ecc22 * f * r2 / (g2 * g);
    var s = Math.pow((1 + c + Math.sqrt(c * (c + 2))), 1 / 3);
    var p = f / (3 * Math.pow((s + 1 / s + 1), 2) * g2);
    var q = Math.sqrt(1 + 2 * ecc22 * p);
    var r0 = -(p * ecc2 * r) / 1 + q + Math.sqrt(0.5 * this.a2 * (1 + 1 / q) - p * (1 - ecc2) * z2 / (q * (1 + q)) - 0.5 * p * r2);
    var recc2r0 = r - ecc2 * r0;
    var recc2r02 = recc2r0 * recc2r0;
    var u = Math.sqrt(recc2r02 + z2);
    var v = Math.sqrt(recc2r02 + (1 - ecc2) * z2);
    var z0 = this.b2 * z / (this._a * v);
    var h = u * (1 - this.b2 / (this._a * v));
    var phi = Math.atan((z + this._k2 * z0) / r);
    var lambda = Math.atan2(y, x);
    var lat = phi * og.math.DEGREES;
    var lon = lambda * og.math.DEGREES;
    return new og.LonLat(lon, lat, h);
};

og.Ellipsoid.prototype.getSurfaceNormal = function (x, y, z) {
    var r2 = this._invRadii2;
    var nx = x * r2.x, ny = y * r2.y, nz = z * r2.z;
    var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    return new og.math.Vector3(nx * l, ny * l, nz * l);
};

og.Ellipsoid.prototype.getCartesianHeight = function (x, y, z, h) {
    var r2 = this._invRadii2;
    var nx = x * r2.x, ny = y * r2.y, nz = z * r2.z;
    var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    return new og.math.Vector3(x + h * nx * l, y + h * ny * l, z + h * nz * l);
};
