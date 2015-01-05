goog.provide('og.PlanetCamera');

goog.require('og.Camera');
goog.require('og.inheritance');
goog.require('og.math.Vector3');

og.PlanetCamera = function (renderer, ellipsoid, options) {
    this._ellipsoid = ellipsoid;
    og.inheritance.base(this, renderer, options);

    this.lonLat = new og.LonLat();
    this.altitude;
    this.minAlt = options.minAltitude || 50;
    this.earthPoint = { "distance": 0, "earth": new og.math.Vector3() };
    this.bindEllipsoid(this._ellipsoid);
};

og.inheritance.extend(og.PlanetCamera, og.Camera);

og.PlanetCamera.prototype.bindEllipsoid = function (ellipsoid) {
    this._ellipsoid = ellipsoid;
    this.lonLat = ellipsoid.ECEF2LonLat(this.eye);
};

og.PlanetCamera.prototype.update = function () {
    this.setModelViewMatrix();
    this.pmvMatrix = this.pMatrix.mul(this.mvMatrix);
    this.frustum.setFrustum(this.pmvMatrix._m);

    var pmvMatrixPrecise = this.pMatrixPrecise.mul(this.mvMatrix);
    this.ipmvMatrix = pmvMatrixPrecise.inverse();

    this.nMatrix = this.mvMatrix.toInverseMatrix3().transpose();

    this.lonLat = this._ellipsoid.ECEF2LonLat(this.eye);

    this.events.dispatch(this.events.onviewchanged, this);
};

og.PlanetCamera.prototype.setLonLat = function (lonlat) {
    this.lonLat.set(lonlat.lon, lonlat.lat, lonlat.height ? lonlat.height : this.lonLat.height);
    var newEye = this._ellipsoid.LonLat2ECEF(this.lonLat);
    var rot = new og.math.Matrix4().rotateBetweenVectors(newEye.normal(), this.eye.normal());
    this.eye = newEye;

    //what about altitude where camera rotates like arc ball?
    this.v = rot.mulVec3(this.v);
    this.u = rot.mulVec3(this.u);
    this.n = rot.mulVec3(this.n);
};

og.PlanetCamera.prototype.viewLonLat = function (lonlat, up) {
    this.lonLat.set(lonlat.lon, lonlat.lat, lonlat.height ? lonlat.height : this.lonLat.height);
    var newEye = this._ellipsoid.LonLat2ECEF(this.lonLat);
    var newLook = this._ellipsoid.LonLat2ECEF(new og.LonLat(this.lonLat.lon, this.lonLat.lat, 0));
    this.set(newEye, newLook, up || og.math.Vector3.UP);
};

og.PlanetCamera.prototype.getExtentPosition = function (extent) {

    var north = extent.getNorth();
    var south = extent.getSouth();
    var east = extent.getEast();
    var west = extent.getWest();

    if (west > east) {
        east += 360;
    }

    var cart = new og.LonLat(east, north);
    var northEast = this._ellipsoid.LonLat2ECEF(cart);
    cart.lat = south;
    var southEast = this._ellipsoid.LonLat2ECEF(cart);
    cart.lon = west;
    var southWest = this._ellipsoid.LonLat2ECEF(cart);
    cart.lat = north;
    var northWest = this._ellipsoid.LonLat2ECEF(cart);

    var center = og.math.Vector3.sub(northEast, southWest).scale(0.5).add(southWest);

    var mag = center.length();
    if (mag < 0.000001) {
        cart.lon = (east + west) * 0.5;
        cart.lat = (north + south) * 0.5;
        center = this._ellipsoid.LonLat2ECEF(cart);
    }

    northWest.sub(center);
    southEast.sub(center);
    northEast.sub(center);
    southWest.sub(center);

    var direction = center.normal();//ellipsoid.getSurfaceNormal(center).negate().normalize();
    var right = direction.cross(og.math.Vector3.UP).normalize();
    var up = right.cross(direction).normalize();

    var height = Math.max(
      Math.abs(up.dot(northWest)),
      Math.abs(up.dot(southEast)),
      Math.abs(up.dot(northEast)),
      Math.abs(up.dot(southWest))
    );

    var width = Math.max(
      Math.abs(right.dot(northWest)),
      Math.abs(right.dot(southEast)),
      Math.abs(right.dot(northEast)),
      Math.abs(right.dot(southWest))
    );

    var tanPhi = Math.tan(this.viewAngle * og.math.RADIANS * 0.5);
    var tanTheta = this.aspect * tanPhi;
    var d = Math.max(width / tanTheta, height / tanPhi);

    center.normalize();
    center.scale(mag + d);
    return center;
};