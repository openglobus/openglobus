og.control.MouseNavigation = function (options) {
    og.control.MouseNavigation.superclass.constructor.call(this, options);
    this.mouseIsMoving = false;
    this.mouseDown = false;
    this.mouseLook = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseCoordsLonLat;
    this.currMousePointOnEarth = new og.math.Vector3();
    this.hitMousePointOnEarth = new og.math.Vector3();
    this.mouseVec;
    this.hold = false;
    this.distDiff = 0.09;
};

og._class_.extend(og.control.MouseNavigation, og.control.Control);

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {
    if (this.currMousePointOnEarth) {
        var cam = this.renderer.activeCamera;
        var d = this.distDiff * cam.eye.distance(this.currMousePointOnEarth);
        var dv = new og.math.Vector3(this.mouseVec.x * d, this.mouseVec.y * d, this.mouseVec.z * d);
        if (event.wheelDelta > 0) {
            cam.eye.add(dv);
        }
        else {
            cam.eye.sub(dv);
        }
        cam.update();
    }
};

og.control.MouseNavigation.prototype.onMouseMove = function (event) {
    this.mouseIsMoving = true;
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
};

og.control.MouseNavigation.prototype.onMouseDown = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseDown = true;
    } else {
        this.mouseLook = true;
    }
};

og.control.MouseNavigation.prototype.onMouseUp = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseDown = false;
    } else {
        this.mouseLook = false;
    }
    this.hold = false;
};

og.control.MouseNavigation.prototype.init = function () {
    this.renderer.input.setEvent("onmouseup", this, canvas, this.onMouseUp);
    this.renderer.input.setEvent("onmousemove", this, canvas, this.onMouseMove);
    this.renderer.input.setEvent("onmousedown", this, canvas, this.onMouseDown);
    this.renderer.input.setEvent("onmousewheel", this, canvas, this.onMouseWheel);
};

og.control.MouseNavigation.prototype.draw = function () {
    if (this.mouseIsMoving) {
        this.mouseIsMoving = false;
        var cam = this.renderer.activeCamera;
        this.mouseVec = cam.unproject(this.mouseX, this.mouseY);
        this.currMousePointOnEarth = this.renderer.renderNodes[0].getRayEllipsoidIntersection(cam.eye, this.mouseVec);

        if (this.currMousePointOnEarth) {
            this.mouseCoordsLonLat = this.renderer.renderNodes[0].ellipsoid.ECEF2LatLon(this.currMousePointOnEarth.z, this.currMousePointOnEarth.x, this.currMousePointOnEarth.y);
            print2d("lbLatLon", this.mouseCoordsLonLat[0].toFixed(5) + " " + this.mouseCoordsLonLat[1].toFixed(5), this.renderer.ctx.gl._viewportWidth - 180, this.renderer.ctx.gl._viewportHeight - 35);
        } else
            print2d("lbLatLon", "__._____ __._____", this.renderer.ctx.gl._viewportWidth - 180, this.renderer.ctx.gl._viewportHeight - 35);

        if (this.mouseDown && this.currMousePointOnEarth) {
            if (!this.hold) {
                this.hold = true;
                this.hitMousePointOnEarth.copy(this.currMousePointOnEarth);
            }

            var p0 = og.math.Vector3.add(this.hitMousePointOnEarth.normal().scaleTo(cam.altitude), this.hitMousePointOnEarth);
            var p1 = og.math.Vector3.add(this.currMousePointOnEarth.normal().scaleTo(cam.altitude), this.currMousePointOnEarth);

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
        } else if (this.mouseLook) {
            if (!this.hold && this.currMousePointOnEarth) {
                this.hold = true;
                this.mouseX0 = this.mouseX;
                this.mouseY0 = this.mouseY;
                this.camAngleX = 0;
                this.camAngleY = 0;
                this.screenCenterOnEarth = this.renderer.renderNodes[0].getRayEllipsoidIntersection(cam.eye, cam.n.getNegate());
                this.earthUp = this.screenCenterOnEarth.normal();
                this.lockPoint = this.currMousePointOnEarth;
            }

            this.camAngleX = og.math.DEG2RAD((this.mouseX - this.mouseX0) * 0.4);
            this.camAngleY = og.math.DEG2RAD((this.mouseY - this.mouseY0) * 0.4);
            this.mouseX0 = this.mouseX;
            this.mouseY0 = this.mouseY;

            var rot = new og.math.Matrix4();

            var rx = rot.rotate(this.earthUp, this.camAngleX).mulVec3(og.math.Vector3.sub(cam.eye, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);
            var ry = rot.rotate(cam.u, this.camAngleY).mulVec3(og.math.Vector3.sub(rx, this.screenCenterOnEarth)).add(this.screenCenterOnEarth);

            if (og.math.RAD2DEG(this.earthUp.angle(cam.n)) > 1) {
            }

            cam.set(ry, this.screenCenterOnEarth, this.earthUp);
        }
    }
};
