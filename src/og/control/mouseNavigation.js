goog.provide('og.control.MouseNavigation');

goog.require('og.control.Control');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og._class_');

og.control.MouseNavigation = function (options) {
    og.control.MouseNavigation.superclass.constructor.call(this, options);
    this.hitMousePositionOnEarth = new og.math.Vector3();
    this.x0 = 0;
    this.y0 = 0;
    this.camAngleX = 0;
    this.camAngleY = 0;
    this.screenCenterOnEarth = new og.math.Vector3();
    this.earthUp = new og.math.Vector3();
    this.distDiff = 0.09;
};

og._class_.extend(og.control.MouseNavigation, og.control.Control);

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {
    var planetNode = this.renderer.renderNodes[0];
    if (planetNode.mousePositionOnEarth) {
        var cam = this.renderer.activeCamera;
        var d = this.distDiff * cam.eye.distance(planetNode.mousePositionOnEarth);
        var dv = new og.math.Vector3(this.renderer.mouseState.mouseDirection.x * d, this.renderer.mouseState.mouseDirection.y * d, this.renderer.mouseState.mouseDirection.z * d);
        if (event.wheelDelta > 0) {
            cam.eye.add(dv);
        }
        else {
            cam.eye.sub(dv);
        }
        cam.update();
    }
};

og.control.MouseNavigation.prototype.init = function () {
    this.renderer.input.setEvent("onmousewheel", this, canvas, this.onMouseWheel);
    this.renderer.addEvent("onmouselbuttondown", this, this.onMouseLeftButtonDown);
    this.renderer.addEvent("onmouserbuttondown", this, this.onMouseRightButtonDown);
    this.renderer.addEvent("onmouselbuttonclick", this, this.onMouseLeftButtonClick);
    this.renderer.addEvent("onmouserbuttonclick", this, this.onMouseRightButtonClick);
};

og.control.MouseNavigation.prototype.onMouseLeftButtonClick = function () {
    this.hitMousePositionOnEarth.copy(this.renderer.renderNodes[0].mousePositionOnEarth);
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function () {
    if (this.renderer.mouseIsMoving) {
        var planetNode = this.renderer.renderNodes[0];
        var cam = this.renderer.activeCamera;
        var p0 = og.math.Vector3.add(this.hitMousePositionOnEarth.normal().scaleTo(cam.altitude), this.hitMousePositionOnEarth);
        var p1 = og.math.Vector3.add(planetNode.mousePositionOnEarth.normal().scaleTo(cam.altitude), planetNode.mousePositionOnEarth);

        var d = og.math.Vector3.sub(p0, p1);
        cam.eye.add(d);

        var look, up;
        if (cam.altitude < 500) {
            look = og.math.Vector3.sub(cam.eye, cam.n);
            up = cam.v;
        } else {
            look = og.math.Vector3.ZERO;
            up = new og.math.Vector3(0, 1, 0)
        }
        cam.set(cam.eye, look, up);
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function () {
    this.x0 = this.renderer.mouseState.x;
    this.y0 = this.renderer.mouseState.y;
    this.camAngleX = 0;
    this.camAngleY = 0;
    this.screenCenterOnEarth = this.renderer.renderNodes[0].getRayEllipsoidIntersection(this.renderer.activeCamera.eye, this.renderer.activeCamera.n.getNegate());
    this.earthUp = this.screenCenterOnEarth.normal();
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function () {
    if (this.renderer.mouseIsMoving) {
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