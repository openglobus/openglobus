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
    this.distDiff = 0.12;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet;
};

og.inheritance.extend(og.control.MouseNavigation, og.control.Control);

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {
    var pos = this.planet.getCartesianFromPixelTerrain(this.renderer.events.mouseState);
    if (pos) {
        var cam = this.renderer.activeCamera;
        var d = this.distDiff * cam.eye.distance(pos);
        var dv = new og.math.Vector3(this.renderer.events.mouseState.direction.x * d, this.renderer.events.mouseState.direction.y * d, this.renderer.events.mouseState.direction.z * d);
        if (event.wheelDelta > 0) {
            cam.eye.add(dv);
        } else {
            cam.eye.sub(dv);
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
    this.grabbedSpheroid.radius = this.grabbedPoint.length();
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function (e) {
    if (this.renderer.events.mouseState.moving) {
        if (this.grabbedPoint) {
            var cam = this.renderer.activeCamera;
            var targetPoint = new og.math.Ray(cam.eye, this.renderer.events.mouseState.direction).hitSphere(this.grabbedSpheroid);
            var look, up;
            if (cam.lonLat.height < 500000) {
                cam.eye.add(og.math.Vector3.sub(this.grabbedPoint, targetPoint));
                up = cam.v;
                look = og.math.Vector3.sub(cam.eye, cam.n);
            } else {
                var rot = og.math.Quaternion.getRotationBetweenVectors(this.grabbedPoint.normal(), targetPoint.normal());
                cam.eye = rot.getMatrix4().mulVec3(cam.eye);
                look = og.math.Vector3.ZERO;
                up = og.math.Vector3.UP;
            }
            cam.set(cam.eye, look, up);
            //console.log((e.x - e.prev_x) + ", " + (e.y - e.prev_y));
        } else {
            //TODO: Have to continue rotation
        }
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function (e) {
    this.pointOnEarth = this.planet.getCartesianFromPixelTerrain({ x: e.x, y: e.y });
    this.earthUp = this.pointOnEarth.normal();
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function (e) {
    if (this.renderer.events.mouseState.moving) {
        this.renderer.activeCamera.rotateHorizontal((e.x - e.prev_x) * og.math.RADIANS, false, this.pointOnEarth, this.earthUp);
        this.renderer.activeCamera.rotateVertical((e.y - e.prev_y) * og.math.RADIANS, this.pointOnEarth);
    }
};