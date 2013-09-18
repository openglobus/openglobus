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
    if (this.renderer.mousePositionOnEarth) {
        var cam = this.renderer.activeCamera;
        var d = this.distDiff * cam.eye.distance(this.renderer.mousePositionOnEarth);
        var dv = new og.math.Vector3(this.renderer.mouseDirection.x * d, this.renderer.mouseDirection.y * d, this.renderer.mouseDirection.z * d);
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
};

og.control.MouseNavigation.prototype.onMouseLeftButtonClick = function (sender, object) {
    this.hitMousePositionOnEarth.copy(object.xyz);
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function (sender, object) {
    if (sender.mouseIsMoving) {
        var cam = sender.activeCamera;
        var p0 = og.math.Vector3.add(this.hitMousePositionOnEarth.normal().scaleTo(cam.altitude), this.hitMousePositionOnEarth);
        var p1 = og.math.Vector3.add(object.xyz.normal().scaleTo(cam.altitude), object.xyz);

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

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function (sender, object) {
    this.x0 = object.x;
    this.y0 = object.y;
    this.camAngleX = 0;
    this.camAngleY = 0;
    this.screenCenterOnEarth = sender.renderNodes[0].getRayEllipsoidIntersection(sender.activeCamera.eye, sender.activeCamera.n.getNegate());
    this.earthUp = this.screenCenterOnEarth.normal();
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function (sender, object) {
    if (sender.mouseIsMoving) {
        this.camAngleX = og.math.DEG2RAD((object.x - this.x0) * 0.4);
        this.camAngleY = og.math.DEG2RAD((object.y - this.y0) * 0.4);
        this.x0 = object.x;
        this.y0 = object.y;

        var rot = new og.math.Matrix4();
        var rx = rot.rotate(this.earthUp, this.camAngleX).mulVec3(og.math.Vector3.sub(sender.activeCamera.eye, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);
        var ry = rot.rotate(sender.activeCamera.u, this.camAngleY).mulVec3(og.math.Vector3.sub(rx, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);

        if (og.math.RAD2DEG(this.earthUp.angle(sender.activeCamera.n)) > 1) {
        }

        sender.activeCamera.set(ry, this.screenCenterOnEarth, this.earthUp);
    }
};