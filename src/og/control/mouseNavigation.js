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
    this.hasGrabbedPoint = false;
    this.x0 = 0;
    this.y0 = 0;
    this.camAngleX = 0;
    this.camAngleY = 0;
    this.screenCenterOnEarth = new og.math.Vector3();
    this.earthUp = new og.math.Vector3();
    this.distDiff = 0.09;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet;
};

og.inheritance.extend(og.control.MouseNavigation, og.control.Control);

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {
    var pos = this.planet.getCartesianFromPixelTerrain(this.renderer.mouseState);
    if (pos) {
        var cam = this.renderer.activeCamera;
        var d = this.distDiff * cam.eye.distance(pos);
        var dv = new og.math.Vector3(this.renderer.mouseState.direction.x * d, this.renderer.mouseState.direction.y * d, this.renderer.mouseState.direction.z * d);
        if (event.wheelDelta > 0) {
            if (cam.altitude > 0.5)
                cam.eye.add(dv);
        }
        else {
            if (cam.altitude < 6000)
                cam.eye.sub(dv);
        }
        cam.update();
    }
};

og.control.MouseNavigation.prototype.init = function () {
    this.renderer.mouseHandler.setEvent("onmousewheel", this, this.onMouseWheel);
    this.renderer.events.on("onmouselbuttondown", this, this.onMouseLeftButtonDown);
    this.renderer.events.on("onmouserbuttondown", this, this.onMouseRightButtonDown);
    this.renderer.events.on("onmouselbuttonclick", this, this.onMouseLeftButtonClick);
    this.renderer.events.on("onmouserbuttonclick", this, this.onMouseRightButtonClick);
    this.planet = this.renderer.renderNodes.Earth;
};

og.control.MouseNavigation.prototype.onMouseLeftButtonClick = function () {
    this.grabbedPoint = this.planet.getCartesianFromPixelTerrain(this.renderer.mouseState);
    this.grabbedSpheroid.radius = this.grabbedPoint.length();
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function () {
    if (this.renderer.mouseState.moving) {
        if (this.grabbedPoint) {
            var cam = this.renderer.activeCamera;
            var targetPoint = new og.math.Ray(cam.eye, this.renderer.mouseState.direction).hitSphere(this.grabbedSpheroid);
            var look, up;
            if (cam.altitude < 500) {
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
        } else {
            //TODO: Have to continue rotation
        }
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function () {
    this.x0 = this.renderer.mouseState.x;
    this.y0 = this.renderer.mouseState.y;
    this.camAngleX = 0;
    this.camAngleY = 0;
    this.screenCenterOnEarth = this.planet.getCartesianFromPixelTerrain({ x: this.renderer.handler.gl.canvas.width / 2, y: this.renderer.handler.gl.canvas.height / 2 });
    this.earthUp = this.screenCenterOnEarth.normal();
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function () {
    if (this.renderer.mouseState.moving) {
        this.camAngleX = og.math.DEG2RAD((this.renderer.mouseState.x - this.x0) * 0.4);
        this.camAngleY = og.math.DEG2RAD((this.renderer.mouseState.y - this.y0) * 0.4);
        this.x0 = this.renderer.mouseState.x;
        this.y0 = this.renderer.mouseState.y;

        var rot = new og.math.Matrix4();
        var rx = rot.rotate(this.earthUp, this.camAngleX).mulVec3(og.math.Vector3.sub(this.renderer.activeCamera.eye, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);
        var ry = rot.rotate(this.renderer.activeCamera.u, this.camAngleY).mulVec3(og.math.Vector3.sub(rx, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);

        if (og.math.RAD2DEG(this.earthUp.angle(this.renderer.activeCamera.n)) > 1) {
        }

        this.renderer.activeCamera.set(ry, this.screenCenterOnEarth, this.earthUp);
    }
};