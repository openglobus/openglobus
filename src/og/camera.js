goog.provide('og.Camera');

goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.Frustum');

og.Camera = function (options) {
    this.eye = new og.math.Vector3(0, 0, 0);
    this.u = new og.math.Vector3(0, 1, 0); //up x n
    this.v = new og.math.Vector3(1, 0, 0); //n x u
    this.n = new og.math.Vector3(0, 0, 1); //eye - look
    this.aspect = 0;
    this.nearDist = 0;
    this.farDist = 0;
    this.viewAngle = 0;
    this.renderer = null;
    this.pMatrix = new og.math.Matrix4();
    this.mvMatrix = new og.math.Matrix4();
    this.pmvMatrix = new og.math.Matrix4();
    this.ipmvMatrix = new og.math.Matrix4();
    this.frustum = new og.Frustum();
    this.altitude = 0;
};

og.Camera.clone = function (cam) {
    var newcam = new og.Camera();
    newcam.eye.copy(cam.eye);
    newcam.u.copy(cam.u);
    newcam.v.copy(cam.v);
    newcam.n.copy(cam.n);
    newcam.renderer = cam.renderer;
    newcam.pMatrix.copy(cam.pMatrix);
    newcam.mvMatrix.copy(cam.mvMatrix);
    newcam.pmvMatrix.copy(cam.pmvMatrix);
    newcam.ipmvMatrix.copy(cam.ipmvMatrix);
    newcam.frustum.setFrustum(newcam.pmvMatrix);
    newcam.altitude = cam.altitude;
    return newcam;
};

og.Camera.defaultOptions = {
    viewAngle: 35,
    nearDist: 100,
    farDist: 15000.0,
    eye: new og.math.Vector3(0, 0, 0),
    look: new og.math.Vector3(0, 0, 0),
    up: new og.math.Vector3(0, 1, 0)
};

og.Camera.prototype.init = function (renderer, options) {
    this.renderer = renderer;
    if (options) {
        this.setProjectionMatrix(
            options.viewAngle ? options.viewAngle : og.Camera.defaultOptions.viewAngle,
            this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight,
            options.nearDist ? options.nearDist : og.Camera.defaultOptions.nearDist,
            options.farDist ? options.farDist : og.Camera.defaultOptions.farDist);
        this.set(
            options.eye ? options.eye : og.math.Vector3.clone(og.Camera.defaultOptions.eye),
            options.look ? options.look : og.math.Vector3.clone(og.Camera.defaultOptions.look),
            options.up ? options.up : og.math.Vector3.clone(og.Camera.defaultOptions.up));
    } else {
        this.initDefaults();
    }
    this.update();
};

og.Camera.prototype.initDefaults = function () {
    this.setProjectionMatrix(
        og.Camera.defaultOptions.viewAngle,
        this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight,
        og.Camera.defaultOptions.nearDist,
        og.Camera.defaultOptions.farDist);
    this.set(
        og.math.Vector3.clone(Camera.defaultOptions.eye),
        og.math.Vector3.clone(Camera.defaultOptions.look),
        og.math.Vector3.clone(Camera.defaultOptions.up));
};

og.Camera.prototype.update = function () {
    this.setModelViewMatrix();
    this.pmvMatrix = this.pMatrix.mul(this.mvMatrix);
    this.ipmvMatrix = this.pmvMatrix.inverse();
    this.frustum.setFrustum(this.pmvMatrix._m);
};

og.Camera.prototype.setModelViewMatrix = function () {
    this.mvMatrix.set([this.u.x, this.v.x, this.n.x, 0,
                       this.u.y, this.v.y, this.n.y, 0,
                       this.u.z, this.v.z, this.n.z, 0,
                       -this.eye.dot(this.u), -this.eye.dot(this.v), -this.eye.dot(this.n), 1.0]);
};

og.Camera.prototype.refresh = function () {
    this.setProjectionMatrix(this.viewAngle, this.renderer.ctx.gl._viewportWidth / this.renderer.ctx.gl._viewportHeight, this.nearDist, this.farDist);
    this.update();
};

og.Camera.prototype.setFarVisibilityDistance = function (distance) {
    this.farDist = distance;
    this.refresh();
};

og.Camera.prototype.setNearVisibilityDistance = function (distance) {
    this.nearDist = distance;
    this.refresh();
};

og.Camera.prototype.setNearPointVisibility = function (near, distance) {
    this.nearDist = near;
    if (distance) {
        this.farDist = near + distance;
    } else {
        this.farDist = near + this.farDist - this.nearDist;
    }
    this.refresh();
};


og.Camera.prototype.setProjectionMatrix = function (angle, aspect, near, far) {
    this.viewAngle = angle;
    this.aspect = aspect;
    this.nearDist = near;
    this.farDist = far;
    this.pMatrix.setPerspective(angle, aspect, near, far);
};

og.Camera.prototype.setViewAngle = function (angle) {
    this.setProjectionMatrix(angle, this.aspect, this.nearDist, this.farDist);
};

og.Camera.prototype.set = function (Eye, look, up) {
    this.eye.copy(Eye);
    this.n.set(Eye.x - look.x, Eye.y - look.y, Eye.z - look.z);
    this.u.copy(up.cross(this.n));
    this.n.normalize(); this.u.normalize();
    this.v.copy(this.n.cross(this.u));
    this.update();
};

og.Camera.prototype.look = function (look, up) {
    this.n.set(this.eye.x - look.x, this.eye.y - look.y, this.eye.z - look.z);
    this.u.copy((up ? up : this.v).cross(this.n));
    this.n.normalize(); this.u.normalize();
    this.v.copy(this.n.cross(this.u));
    this.update();
};

og.Camera.prototype.slide = function (du, dv, dn) {
    this.eye.x += du * this.u.x + dv * this.v.x + dn * this.n.x;
    this.eye.y += du * this.u.y + dv * this.v.y + dn * this.n.y;
    this.eye.z += du * this.u.z + dv * this.v.z + dn * this.n.z;
    this.update();
};

og.Camera.prototype.roll = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = og.math.Vector3.clone(this.u);
    this.u.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.pitch = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = og.math.Vector3.clone(this.n);
    this.n.set(cs * t.x - sn * this.v.x, cs * t.y - sn * this.v.y, cs * t.z - sn * this.v.z);
    this.v.set(sn * t.x + cs * this.v.x, sn * t.y + cs * this.v.y, sn * t.z + cs * this.v.z);
    this.update();
};

og.Camera.prototype.yaw = function (angle) {
    var cs = Math.cos(Math.PI / 180 * angle);
    var sn = Math.sin(Math.PI / 180 * angle);
    var t = og.math.Vector3.clone(this.u);
    this.u.set(cs * t.x - sn * this.n.x, cs * t.y - sn * this.n.y, cs * t.z - sn * this.n.z);
    this.n.set(sn * t.x + cs * this.n.x, sn * t.y + cs * this.n.y, sn * t.z + cs * this.n.z);
    this.update();
};

og.Camera.prototype.unproject = function (x, y) {
    var px = (x - this.renderer.ctx.gl._viewportWidth / 2) / (this.renderer.ctx.gl._viewportWidth / 2),
        py = -(y - this.renderer.ctx.gl._viewportHeight / 2) / (this.renderer.ctx.gl._viewportHeight / 2);

    var world1 = this.ipmvMatrix.mulVec4(new og.math.Vector4(px, py, -1, 1)).affinity(),
        world2 = this.ipmvMatrix.mulVec4(new og.math.Vector4(px, py, 0, 1)).affinity();

    return world2.sub(world1).toVector3().normalize();
};

og.Camera.prototype.project = function (v) {
    var r = this.pmvMatrix.mulVec4(v.toVector4());
    return [(1 + r.x / r.w) * this.gl._viewportWidth / 2, (1 - r.y / r.w) * this.gl._viewportHeight / 2];
};

og.Camera.prototype.setgp = function (ellipsoid, lat, lon, alt) {
    var v = ellipsoid.LatLon2ECEF(lat, lon, (alt ? this.altitude = alt : this.altitude));
    this.eye.set(v[Y], v[Z], v[X]);
    this.update();
};

og.Camera.prototype.projectedSize = function (p) {
    return this.eye.distance(p) * Math.tan(og.math.DEG2RAD(this.viewAngle) * 0.5);
};