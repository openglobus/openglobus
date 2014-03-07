goog.provide('og.Ellipsoid');

goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.LonLat');

og.Ellipsoid = function (equatorialSize, polarSize) {
    var a = this._a = equatorialSize / 1000;
    var b = this._b = polarSize / 1000;
    this.a2 = a * a;
    this.b2 = b * b;
    this._e = Math.sqrt(this.a2 - this.b2) / a;
    this._e2 = Math.pow(this._e, 2);
    this._k = Math.sqrt(this.a2 - this.b2) / b;
    this._k2 = Math.pow(this._k, 2);
};

og.Ellipsoid.prototype.N = function (phi) {
    var ss = Math.pow(Math.sin(phi), 2);
    var ss2 = this._e2 * ss;
    var ss3 = Math.sqrt(1 - ss2);
    return this._a / ss3;
};

og.Ellipsoid.prototype.LonLat2ECEF = function (lonlat) {
    var latrad = og.math.DEG2RAD(lonlat.lat),
        lonrad = og.math.DEG2RAD(lonlat.lon);
    var x = (this.N(latrad) + lonlat.height) * Math.cos(latrad) * Math.cos(lonrad);
    var y = (this.N(latrad) + lonlat.height) * Math.cos(latrad) * Math.sin(lonrad);
    var z = (this.N(latrad) * (1 - this._e2) + lonlat.height) * Math.sin(latrad);
    return new og.math.Vector3(y, z, x);
};

og.Ellipsoid.prototype.ECEF2LonLat = function (x, y, z) {
    var ecc2 = this._e2;
    var ecc22 = this._k2;
    var r2 = x * x + y * y;
    var r = Math.sqrt(r2);
    var e2 = this.a2 - this.b2;
    var z2 = z * z;
    var f = 54.0 * this.b2 * z2;
    var g = r2 + (1 - ecc2) * z2 + ecc2 * e2;
    var g2 = g * g;
    var c = ecc2 * ecc2 * f * r2 / (g2 * g);
    var s = Math.pow((1 + c + Math.sqrt(c * (c + 2))), 1 / 3);
    var p = f / (3 * Math.pow((s + 1 / s + 1), 2) * g2);
    var q = Math.sqrt(1 + 2 * ecc2 * ecc2 * p);
    var r0 = -(p * ecc2 * r) / 1 + q + Math.sqrt(0.5 * this.a2 * (1 + 1 / q) - p * (1 - ecc2) * z2 / (q * (1 + q)) - 0.5 * p * r2);
    var u = Math.sqrt(Math.pow((r - ecc2 * r0), 2) + z2);
    var v = Math.sqrt(Math.pow((r - ecc2 * r0), 2) + (1 - ecc2) * z2);
    var z0 = this.b2 * z / (this._a * v);
    var h = u * (1 - this.b2 / (this._a * v));
    var phi = Math.atan((z + ecc22 * z0) / r);
    var lambda = Math.atan2(y, x);
    var lat = phi / Math.PI * 180;
    var lon = lambda / Math.PI * 180;
    return new og.LonLat(lon, lat, h);
};

og.Ellipsoid.prototype.getSurfaceNormal = function (lonlat) {
    return this.LonLat2ECEF(lonlat).normalize();
};