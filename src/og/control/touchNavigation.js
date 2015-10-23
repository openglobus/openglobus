goog.provide('og.control.TouchNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.math.Quaternion');
goog.require('og.bv.Sphere');
goog.require('og.math.Ray');
goog.require('og.math.Pixel');

og.control.TouchNavigation = function (options) {
    og.inheritance.base(this, options);

    this.grabbedPoint = new og.math.Vector3();
    this.pointOnEarth = new og.math.Vector3();
    this.earthUp = new og.math.Vector3();
    this.inertia = 0.007;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet = null;
    this.qRot = new og.math.Quaternion();
    this.scaleRot = 0;

    this.distDiff = 0.33;
    this.stepsCount = 5;
    this.stepsForward = null;
    this.stepIndex = 0;
};

og.inheritance.extend(og.control.TouchNavigation, og.control.Control);

og.control.TouchNavigation.prototype.init = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("ontouchstart", this, this.onTouchStart);
    this.renderer.events.on("ontouchend", this, this.onTouchEnd);
    this.renderer.events.on("ontouchcancel", this, this.onTouchCancel);
    this.renderer.events.on("ontouchmove", this, this.onTouchMove);
    this.renderer.events.on("ondraw", this, this.onDraw);
};

og.control.TouchNavigation.prototype.onTouchStart = function (e) {
    if (e.sys.touches.item(0)) {
        var p = new og.math.Pixel(e.sys.touches.item(0).pageX, e.sys.touches.item(0).pageY);
        this.grabbedPoint = this.planet.getCartesianFromPixelTerrain(p);
        if (this.grabbedPoint) {
            this.grabbedSpheroid.radius = this.grabbedPoint.length();
            this.stopRotation();
        }
    }
};

og.control.TouchNavigation.prototype.stopRotation = function () {
    this.qRot.clear();
};

og.control.TouchNavigation.prototype.onTouchEnd = function (e) {
    this.scaleRot = 1;
};

og.control.TouchNavigation.prototype.onTouchCancel = function (e) {

};

og.control.TouchNavigation.prototype.onTouchMove = function (e) {
    if (e.sys.touches.item(0)) {

        if (!this.grabbedPoint)
            return;

        this.planet.stopFlying();

        var cam = this.renderer.activeCamera;
        var direction = cam.unproject(e.sys.touches.item(0).pageX, e.sys.touches.item(0).pageY);
        var targetPoint = new og.math.Ray(cam.eye, direction).hitSphere(this.grabbedSpheroid);

        if (targetPoint) {
            this.scaleRot = 1;
            this.qRot = og.math.Quaternion.getRotationBetweenVectors(targetPoint.normal(), this.grabbedPoint.normal());
            var rot = this.qRot;
            cam.eye = rot.mulVec3(cam.eye);
            cam.v = rot.mulVec3(cam.v);
            cam.u = rot.mulVec3(cam.u);
            cam.n = rot.mulVec3(cam.n);
            cam.update();
        }

        this.scaleRot = 0;
    }
};

og.control.TouchNavigation.prototype.onDraw = function (e) {
    if (this.stepIndex) {
        var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
        var cam = this.renderer.activeCamera;
        cam.eye = sf.eye;
        cam.v = sf.v;
        cam.u = sf.u;
        cam.n = sf.n;
        cam.update();
    }

    var r = this.renderer;
    r.controlsBag.scaleRot = this.scaleRot;
    if (r.events.mouseState.leftButtonDown || !this.scaleRot)
        return;

    this.scaleRot -= this.inertia;
    if (this.scaleRot <= 0)
        this.scaleRot = 0;
    else {
        var cam = r.activeCamera;
        var rot = this.qRot.slerp(og.math.Quaternion.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot).normalize();
        if (!(rot.x || rot.y || rot.z)) {
            this.scaleRot = 0;
        }
        cam.eye = rot.mulVec3(cam.eye);
        cam.v = rot.mulVec3(cam.v);
        cam.u = rot.mulVec3(cam.u);
        cam.n = rot.mulVec3(cam.n);
        cam.update();
    }
};