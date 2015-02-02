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
    this.inertia = 0.007;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet;
    this.qRot = new og.math.Quaternion();
    this.scaleRot = 0;

    this.distDiff = 0.33;
    this.stepsCount = 5;
    this.stepsForward = null;
    this.stepIndex = 0;
};

og.inheritance.extend(og.control.MouseNavigation, og.control.Control);


og.control.MouseNavigation.getMovePointsFromPixelTerrain = function (cam, planet, stepsCount, delta, point, forward, dir) {

    var steps = []

    var eye = cam.eye.clone(),
        n = cam.n.clone(),
        u = cam.u.clone(),
        v = cam.v.clone();

    var a = planet.getCartesianFromPixelTerrain(point);

    if (!dir) {
        dir = og.math.Vector3.sub(a, cam.eye).normalize();
    }

    var d = a ? delta * cam.eye.distance(a) / stepsCount : 1000;

    if (forward) {
        d = -d;
    } else {
        d *= 2;
    }

    var scaled_n = n.scaleTo(d);

    if (a && cam.lonLat.height > 9000 && n.dot(eye.normal()) > 0.6) {
        var grabbedSpheroid = new og.bv.Sphere();
        grabbedSpheroid.radius = a.length();

        var rotArr = [],
            eyeArr = []

        var breaked = false;
        for (var i = 0; i < stepsCount; i++) {
            eye.add(scaled_n);
            var b = new og.math.Ray(eye, dir).hitSphere(grabbedSpheroid);
            eyeArr[i] = eye.clone();
            if (b) {
                rotArr[i] = new og.math.Matrix4().rotateBetweenVectors(a.normal(), b.normal());
            } else {
                breaked = true;
                break;
            }
        }

        if (!breaked) {
            for (var i = 0; i < stepsCount; i++) {
                var rot = rotArr[i];
                steps[i] = {};
                steps[i].eye = rot.mulVec3(eyeArr[i]);
                steps[i].v = rot.mulVec3(v);
                steps[i].u = rot.mulVec3(u);
                steps[i].n = rot.mulVec3(n);
            }
        } else {
            eye = cam.eye.clone();
            for (var i = 0; i < stepsCount; i++) {
                steps[i] = {};
                steps[i].eye = eye.add(scaled_n).clone();
                steps[i].v = v;
                steps[i].u = u;
                steps[i].n = n;
            }
        }
    } else {
        for (var i = 0; i < stepsCount; i++) {
            steps[i] = {};
            steps[i].eye = eye.add(dir.scaleTo(-d)).clone();
            steps[i].v = v;
            steps[i].u = u;
            steps[i].n = n;
        }
    }

    return steps;
};

og.control.MouseNavigation.prototype.onMouseWheel = function (event) {

    if (this.stepIndex)
        return;

    this.stopRotation();

    var ms = this.renderer.events.mouseState;
    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff, ms, event.wheelDelta > 0, ms.direction);
};

og.control.MouseNavigation.prototype.init = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("onmousewheel", this, this.onMouseWheel);
    this.renderer.events.on("onmouselbuttonhold", this, this.onMouseLeftButtonDown);
    this.renderer.events.on("onmouserbuttonhold", this, this.onMouseRightButtonDown);
    this.renderer.events.on("onmouselbuttondown", this, this.onMouseLeftButtonClick);
    this.renderer.events.on("onmouselbuttonup", this, this.onMouseLeftButtonUp);
    this.renderer.events.on("onmouserbuttondown", this, this.onMouseRightButtonClick);
    this.renderer.events.on("onmouselbuttondoubleclick", this, this.onMouseLeftButtonDoubleClick);
    this.renderer.events.on("onmouseclick", this, this.onMouseClick);
    this.renderer.events.on("ondraw", this, this.onDraw);
};

og.control.MouseNavigation.prototype.onMouseClick = function () {
    // console.log("click");
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDoubleClick = function () {
    var ms = this.renderer.events.mouseState;
    this.stepIndex = this.stepsCount;
    if (this.renderer.events.isKeyPressed(og.input.KEY_SHIFT)) {
        this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
            this.planet, this.stepsCount, this.distDiff * 2, ms, false, ms.direction);
    } else {
        this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
            this.planet, this.stepsCount, this.distDiff * 1.7, ms, true, ms.direction);
    }
};

og.control.MouseNavigation.prototype.onMouseLeftButtonClick = function () {
    this.renderer.handler.gl.canvas.classList.add("ogGrabbingPoiner");
    this.grabbedPoint = this.planet.getCartesianFromMouseTerrain();
    if (this.grabbedPoint) {
        this.grabbedSpheroid.radius = this.grabbedPoint.length();
        this.stopRotation();
    }
};

og.control.MouseNavigation.prototype.stopRotation = function () {
    this.qRot.clear();
};

og.control.MouseNavigation.prototype.onMouseLeftButtonUp = function (e) {
    this.renderer.handler.gl.canvas.classList.remove("ogGrabbingPoiner");
};

og.control.MouseNavigation.prototype.onMouseLeftButtonDown = function (e) {
    if (!this.grabbedPoint)
        return;

    if (this.renderer.events.mouseState.moving) {

        var cam = this.renderer.activeCamera;
        var targetPoint = new og.math.Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);

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
    } else {
        this.scaleRot = 0;
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function (e) {
    this.stopRotation();
    this.pointOnEarth = this.planet.getCartesianFromPixelTerrain({ x: e.x, y: e.y });
    if (this.pointOnEarth) {
        this.earthUp = this.pointOnEarth.normal();
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function (e) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.mouseState.moving) {
        var l = 0.5 / cam.eye.distance(this.pointOnEarth) * cam.lonLat.height * og.math.RADIANS;
        if (l > 0.007) l = 0.007;
        cam.rotateHorizontal(l * (e.x - e.prev_x), false, this.pointOnEarth, this.earthUp);
        cam.rotateVertical(l * (e.y - e.prev_y), this.pointOnEarth);
        cam.update();
    }
};

og.control.MouseNavigation.prototype.onDraw = function (e) {

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
        var rot = this.qRot.slerp(og.math.Quaternion.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot * r.handler.delta * 30).normalize();
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