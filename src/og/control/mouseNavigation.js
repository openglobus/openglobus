goog.provide('og.control.MouseNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.math.Quaternion');
goog.require('og.bv.Sphere');
goog.require('og.math.Ray');

og.control.MouseNavigation = function (options) {
    og.inheritance.base(this, options);
    this.grabbedPoint = new og.math.Vector3();
    this.pointOnEarth = new og.math.Vector3();
    this.earthUp = new og.math.Vector3();
    this.distDiff = 0.2;
    this.inertia = 0.007;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet;
    this.qRot = new og.math.Quaternion();
    this.scaleRot = 0;
};

og.inheritance.extend(og.control.MouseNavigation, og.control.Control);

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {
    this.stopRotation();
    var a = this.planet.getCartesianFromPixelTerrain(this.renderer.events.mouseState);
    if (a) {
        var cam = this.renderer.activeCamera;
        var dir = this.renderer.events.mouseState.direction;
        var d = this.distDiff * cam.eye.distance(a);

        if (event.wheelDelta > 0) {
            d = -d;
        }

        if (cam.lonLat.height > 9000) {
            this.grabbedSpheroid.radius = a.length();
            cam.eye.add(cam.n.scaleTo(d));
            var b = new og.math.Ray(cam.eye, dir).hitSphere(this.grabbedSpheroid);
            if (b) {
                var rot = new og.math.Matrix4().rotateBetweenVectors(a.normal(), b.normal());
                cam.eye = rot.mulVec3(cam.eye);
                cam.v = rot.mulVec3(cam.v);
                cam.u = rot.mulVec3(cam.u);
                cam.n = rot.mulVec3(cam.n);
            } else {
                cam.eye.add(cam.n.scaleTo(d));
            }
        } else {
            cam.eye.add(dir.scaleTo(-d));
        }
        cam.update();
    }
};

og.control.MouseNavigation.prototype.init = function () {
    this.renderer.events.on("onmousewheel", this, this.onMouseWheel);
    this.renderer.events.on("onmouselbuttonhold", this, this.onMouseLeftButtonDown);
    this.renderer.events.on("onmouserbuttonhold", this, this.onMouseRightButtonDown);
    this.renderer.events.on("onmouselbuttondown", this, this.onMouseLeftButtonClick);
    this.renderer.events.on("onmouserbuttondown", this, this.onMouseRightButtonClick);
    this.renderer.events.on("onmouselbuttondoubleclick", this, this.onMouseLeftButtonDoubleClick);
    this.renderer.events.on("onmouseclick", this, this.onMouseClick);
    this.renderer.events.on("ondraw", this, this.onDraw);
    this.planet = this.renderer.renderNodes.Earth;
};

og.control.MouseNavigation.prototype.onMouseClick = function () {
    // console.log("click");
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDoubleClick = function () {
    //  console.log("doubleclick");
};

og.control.MouseNavigation.prototype.onMouseLeftButtonClick = function (e) {
    this.grabbedPoint = this.planet.getCartesianFromPixelTerrain(e);
    if (this.grabbedPoint) {
        this.grabbedSpheroid.radius = this.grabbedPoint.length();
        this.stopRotation();
    }
};

og.control.MouseNavigation.prototype.stopRotation = function () {
    this.qRot.clear();
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function (e) {
    if (!this.grabbedPoint)
        return;

    if (this.renderer.events.mouseState.moving) {
        var cam = this.renderer.activeCamera;
        var targetPoint = new og.math.Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);

        if (targetPoint) {
            this.scaleRot = 1;
            this.qRot = og.math.Quaternion.getRotationBetweenVectors(this.grabbedPoint.normal(), targetPoint.normal());
            var rot = this.qRot.getMatrix4();
            cam.eye = rot.mulVec3(cam.eye);
            cam.v = rot.mulVec3(cam.v);
            cam.u = rot.mulVec3(cam.u);
            cam.n = rot.mulVec3(cam.n);
            cam.update();
        }
    } else {
        this.scaleRot = 0;
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function (e) {
    this.stopRotation();
    this.pointOnEarth = this.planet.getCartesianFromPixelTerrain({ x: e.x, y: e.y });
    this.earthUp = this.pointOnEarth.normal();
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function (e) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.mouseState.moving) {
        var l = 0.5 / cam.eye.distance(this.pointOnEarth) * cam.lonLat.height * og.math.RADIANS;
        if (l > 0.007) l = 0.007;
        cam.rotateHorizontal(l * (e.x - e.prev_x), false, this.pointOnEarth, this.earthUp);
        cam.rotateVertical(l * (e.y - e.prev_y), this.pointOnEarth);
    }
};

og.control.MouseNavigation.prototype.onDraw = function (e) {
    var r = this.renderer;
    r.controlsBag.scaleRot = this.scaleRot;

    var cam = r.activeCamera;
    if (r.events.mouseState.leftButtonDown)
        return;

    var rot = this.qRot.scaleTo(Math.pow(this.scaleRot, 3)).getMatrix4();

    cam.eye = rot.mulVec3(cam.eye);
    cam.v = rot.mulVec3(cam.v);
    cam.u = rot.mulVec3(cam.u);
    cam.n = rot.mulVec3(cam.n);
    cam.update();

    this.scaleRot -= this.inertia;
    if (this.scaleRot <= 0)
        this.scaleRot = 0;
};