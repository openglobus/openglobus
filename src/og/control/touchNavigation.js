goog.provide('og.control.TouchNavigation');

goog.require('og.inheritance');
goog.require('og.control.BaseControl');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.math.Quaternion');
goog.require('og.bv.Sphere');
goog.require('og.math.Ray');
goog.require('og.math.Pixel');

/**
 * Touch pad planet camera dragging control.
 * @class
 * @extends {og.control.BaseControl}
 * @param {Object} [options] - Control options.
 */
og.control.TouchNavigation = function (options) {
    og.inheritance.base(this, options);

    this.grabbedPoint = new og.math.Vector3();
    this.inertia = 0.007;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet = null;
    this.qRot = new og.math.Quaternion();
    this.scaleRot = 0;
    this.rot = 1;
    this._eye0 = new og.math.Vector3();

    this.distDiff = 0.57;
    this.stepsCount = 5;
    this.stepsForward = null;
    this.stepIndex = 0;

    var Touch = function () {
        this.x = 0;
        this.y = 0;
        this.prev_x = 0;
        this.prev_y = 0;
        this.grabbedPoint = new og.math.Vector3();
        this.grabbedSpheroid = new og.bv.Sphere();
        this.dX = function () { return this.x - this.prev_x; };
        this.dY = function () { return this.y - this.prev_y; };
    };

    this.pointOnEarth = null;
    this.earthUp = null;

    this.touches = [new Touch(), new Touch()];
};

og.inheritance.extend(og.control.TouchNavigation, og.control.BaseControl);

og.control.TouchNavigation.prototype.oninit = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("touchstart", this, this.onTouchStart);
    this.renderer.events.on("touchend", this, this.onTouchEnd);
    this.renderer.events.on("doubletouch", this, this.onDoubleTouch);
    this.renderer.events.on("touchcancel", this, this.onTouchCancel);
    this.renderer.events.on("touchmove", this, this.onTouchMove);
    this.renderer.events.on("draw", this, this.onDraw);
};

og.control.TouchNavigation.prototype.onTouchStart = function (e) {

    this._touching = true;

    if (e.sys.touches.length === 2) {

        var t0 = this.touches[0],
            t1 = this.touches[1];

        t0.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t0.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;
        t0.prev_x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t0.prev_y = e.sys.touches.item(0).pageY - e.sys.offsetTop;
        t0.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t0, true);

        t1.x = e.sys.touches.item(1).pageX - e.sys.offsetLeft;
        t1.y = e.sys.touches.item(1).pageY - e.sys.offsetTop;
        t1.prev_x = e.sys.touches.item(1).pageX - e.sys.offsetLeft;
        t1.prev_y = e.sys.touches.item(1).pageY - e.sys.offsetTop;
        t1.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t1, true);

        //this.planet._viewChanged = true;
        this.pointOnEarth = this.planet.getCartesianFromPixelTerrain(this.renderer.handler.getCenter(), true);

        if (this.pointOnEarth) {
            this.earthUp = this.pointOnEarth.normal();
        }

        if (t0.grabbedPoint && t1.grabbedPoint) {
            t0.grabbedSpheroid.radius = t0.grabbedPoint.length();
            t1.grabbedSpheroid.radius = t1.grabbedPoint.length();
            this.stopRotation();
        }

    } else if (e.sys.touches.length === 1) {
        this._startTouchOne(e);
    }
};

og.control.TouchNavigation.prototype._startTouchOne = function (e) {
    var t = this.touches[0];

    t.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
    t.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;
    t.prev_x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
    t.prev_y = e.sys.touches.item(0).pageY - e.sys.offsetTop;

    t.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t, true);
    this._eye0.copy(this.renderer.activeCamera.eye);

    if (t.grabbedPoint) {
        t.grabbedSpheroid.radius = t.grabbedPoint.length();
        this.stopRotation();
    }
};

og.control.TouchNavigation.prototype.stopRotation = function () {
    this.qRot.clear();
};

og.control.TouchNavigation.prototype.onDoubleTouch = function (e) {
    if (this.stepIndex)
        return;

    this.planet.stopFlying();

    this.stopRotation();

    var dir = this.renderer.activeCamera.unproject(e.x, e.y);
    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff, e, true, dir);
};

og.control.TouchNavigation.prototype.onTouchEnd = function (e) {

    if (e.sys.touches.length === 0)
        this._touching = false;

    if (e.sys.touches.length === 1) {
        this._startTouchOne(e);
    }

    if (Math.abs(this.touches[0].x - this.touches[0].prev_x) < 3 &&
        Math.abs(this.touches[0].y - this.touches[0].prev_y) < 3)
        this.scaleRot = 0;
};

og.control.TouchNavigation.prototype.onTouchCancel = function (e) {
};

og.control.TouchNavigation.prototype.onTouchMove = function (e) {

    var cam = this.renderer.activeCamera;

    if (e.sys.touches.length === 2) {

        this.renderer.controlsBag.scaleRot = 1;

        var t0 = this.touches[0],
            t1 = this.touches[1];

        if (!t0.grabbedPoint || !t1.grabbedPoint)
            return;

        this.planet.stopFlying();

        t0.prev_x = t0.x;
        t0.prev_y = t0.y;
        t0.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t0.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;

        t1.prev_x = t1.x;
        t1.prev_y = t1.y;
        t1.x = e.sys.touches.item(1).pageX - e.sys.offsetLeft;
        t1.y = e.sys.touches.item(1).pageY - e.sys.offsetTop;

        //var center_x = Math.round(t0.x + (t1.x - t0.x) * 0.5);
        //var center_y = Math.round(t0.y + (t1.y - t0.y) * 0.5);

        //var dirC = cam.unproject(center_x, center_y);
        //var targetPointC = this.planet.getCartesianFromPixelTerrain(new og.math.Pixel(center_x, center_y));

        //var dir0 = cam.unproject(t0.x, t0.y);
        //var targetPoint0 = new og.math.Ray(cam.eye, dir0).hitSphere(t0.grabbedSpheroid);

        //var dir1 = cam.unproject(t1.x, t1.y);
        //var targetPoint1 = new og.math.Ray(cam.eye, dir1).hitSphere(t1.grabbedSpheroid);

        //print2d("t1", center_x + "," + center_y, 100, 100);
        //print2d("t2", targetPointC.x + "," + targetPointC.y + "," + targetPointC.z, 100, 120);

        if (t0.dY() > 0 && t1.dY() > 0 || t0.dY() < 0 && t1.dY() < 0 ||
            t0.dX() > 0 && t1.dX() > 0 || t0.dX() < 0 && t1.dX() < 0) {
            var l = 0.5 / cam.eye.distance(this.pointOnEarth) * cam._lonLat.height * og.math.RADIANS;
            if (l > 0.007) l = 0.007;
            cam.rotateHorizontal(l * t0.dX(), false, this.pointOnEarth, this.earthUp);
            cam.rotateVertical(l * t0.dY(), this.pointOnEarth);
            cam.update();
        }

        this.scaleRot = 0;

    } else if (e.sys.touches.length === 1) {

        var t = this.touches[0];

        t.prev_x = t.x;
        t.prev_y = t.y;
        t.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;

        if (!t.grabbedPoint)
            return;

        this.planet.stopFlying();

        var direction = cam.unproject(t.x, t.y);
        var targetPoint = new og.math.Ray(cam.eye, direction).hitSphere(t.grabbedSpheroid);

        if (targetPoint) {
            if (cam._n.dot(cam.eye.normal()) > 0.15) {
                this.qRot = og.math.Quaternion.getRotationBetweenVectors(targetPoint.normal(), t.grabbedPoint.normal());
                var rot = this.qRot;
                cam.eye = rot.mulVec3(cam.eye);
                cam._v = rot.mulVec3(cam._v);
                cam._u = rot.mulVec3(cam._u);
                cam._n = rot.mulVec3(cam._n);
                cam.update();
                this.scaleRot = 1;
            } else {
                var p0 = t.grabbedPoint,
                    p1 = og.math.Vector3.add(p0, cam._u),
                    p2 = og.math.Vector3.add(p0, p0.normal());
                var dir = cam.unproject(t.x, t.y);
                var px = new og.math.Vector3();
                if (new og.math.Ray(cam.eye, dir).hitPlane(p0, p1, p2, px) === og.math.Ray.INSIDE) {
                    cam.eye = this._eye0.addA(px.subA(p0).negate());
                    cam.update();
                    this.scaleRot = 0;
                }
            }
        }
    }
};

og.control.TouchNavigation.prototype.onDraw = function (e) {

    this.renderer.controlsBag.scaleRot = this.scaleRot;

    if (this._touching)
        return;

    var r = this.renderer;

    if (this.stepIndex) {
        r.controlsBag.scaleRot = 1;
        var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
        var cam = this.renderer.activeCamera;
        cam.eye = sf.eye;
        cam._v = sf.v;
        cam._u = sf.u;
        cam._n = sf.n;
        cam.update();
    }

    if (r.events.mouseState.leftButtonDown || !this.scaleRot)
        return;

    this.scaleRot -= this.inertia;
    if (this.scaleRot <= 0)
        this.scaleRot = 0;
    else {
        r.controlsBag.scaleRot = this.scaleRot;
        var cam = r.activeCamera;
        var rot = this.qRot.slerp(og.math.Quaternion.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot).normalize();
        if (!(rot.x || rot.y || rot.z)) {
            this.scaleRot = 0;
        }
        cam.eye = rot.mulVec3(cam.eye);
        cam._v = rot.mulVec3(cam._v);
        cam._u = rot.mulVec3(cam._u);
        cam._n = rot.mulVec3(cam._n);
        cam.update();
    }
};