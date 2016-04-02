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
    this._eye0 = new og.math.Vector3();
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

og.inheritance.extend(og.control.MouseNavigation, og.control.Control);


og.control.MouseNavigation.getMovePointsFromPixelTerrain = function (cam, planet, stepsCount, delta, point, forward, dir) {

    var steps = []

    var eye = cam.eye.clone(),
        n = cam._n.clone(),
        u = cam._u.clone(),
        v = cam._v.clone();

    var a = planet.getCartesianFromPixelTerrain(point, true);

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

    if (a && cam._lonLat.height > 9000 && n.dot(eye.normal()) > 0.6) {
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

    this.planet.stopFlying();

    this.stopRotation();

    this._deactivate = true;

    this.planet.layersActivity = false;
    this.planet.terrainProvider.active = false;
    this.planet.normalMapCreator.active = false;
    this.planet.geoImageTileCreator.active = false;

    var ms = this.renderer.events.mouseState;
    this.stepIndex = this.stepsCount;
    this.stepsForward = og.control.MouseNavigation.getMovePointsFromPixelTerrain(this.renderer.activeCamera,
        this.planet, this.stepsCount, this.distDiff, ms, event.wheelDelta > 0, ms.direction);
};

og.control.MouseNavigation.prototype.init = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("mousewheel", this, this.onMouseWheel);
    this.renderer.events.on("mouselbuttonhold", this, this.onMouseLeftButtonDown);
    this.renderer.events.on("mouserbuttonhold", this, this.onMouseRightButtonDown);
    this.renderer.events.on("mouselbuttondown", this, this.onMouseLeftButtonClick);
    this.renderer.events.on("mouselbuttonup", this, this.onMouseLeftButtonUp);
    this.renderer.events.on("mouserbuttondown", this, this.onMouseRightButtonClick);
    this.renderer.events.on("mouselbuttondoubleclick", this, this.onMouseLeftButtonDoubleClick);
    this.renderer.events.on("draw", this, this.onDraw);
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
    this.grabbedPoint = this.planet.getCartesianFromMouseTerrain(true);
    if (this.grabbedPoint) {
        this._eye0.copy(this.renderer.activeCamera.eye);
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

    this.planet.stopFlying();

    if (this.renderer.events.mouseState.moving) {

        var cam = this.renderer.activeCamera;

        if (cam._n.dot(cam.eye.normal()) > 0.15) {
            var targetPoint = new og.math.Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);
            if (targetPoint) {
                this.scaleRot = 1;
                this.qRot = og.math.Quaternion.getRotationBetweenVectors(targetPoint.normal(), this.grabbedPoint.normal());
                var rot = this.qRot;
                cam.eye = rot.mulVec3(cam.eye);
                cam._v = rot.mulVec3(cam._v);
                cam._u = rot.mulVec3(cam._u);
                cam._n = rot.mulVec3(cam._n);
                cam.update();
            }
        } else {
            var p0 = this.grabbedPoint,
                p1 = og.math.Vector3.add(p0, cam._u),
                p2 = og.math.Vector3.add(p0, p0.normal());

            var px = new og.math.Ray(cam.eye, e.direction).hitPlane(p0, p1, p2);
            cam.eye = this._eye0.add(px.sub(p0).negate());
            cam.update();
        }
    } else {
        this.scaleRot = 0;
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonClick = function (e) {
    this.stopRotation();
    this.planet.stopFlying();
    this.pointOnEarth = this.planet.getCartesianFromPixelTerrain({ x: e.x, y: e.y }, true);
    if (this.pointOnEarth) {
        this.earthUp = this.pointOnEarth.normal();
    }
};

og.control.MouseNavigation.prototype.onMouseRightButtonDown = function (e) {
    var cam = this.renderer.activeCamera;
    if (this.renderer.events.mouseState.moving) {
        this.renderer.controlsBag.scaleRot = 1;
        var l = 0.5 / cam.eye.distance(this.pointOnEarth) * cam._lonLat.height * og.math.RADIANS;
        if (l > 0.007) l = 0.007;
        cam.rotateHorizontal(l * (e.x - e.prev_x), false, this.pointOnEarth, this.earthUp);
        cam.rotateVertical(l * (e.y - e.prev_y), this.pointOnEarth);
        cam.update();
    }
};

og.control.MouseNavigation.prototype.onDraw = function (e) {

    var r = this.renderer;
    var cam = r.activeCamera;
    var prevEye = cam.eye.clone();

    if (this.stepIndex) {
        r.controlsBag.scaleRot = 1;
        var sf = this.stepsForward[this.stepsCount - this.stepIndex--];
        cam.eye = sf.eye;
        cam._v = sf.v;
        cam._u = sf.u;
        cam._n = sf.n;
        cam.update();
    } else {
        if (this._deactivate) {
            this._deactivate = false;
            this.planet.layersActivity = true;
            this.planet.terrainProvider.active = true;
            this.planet.normalMapCreator.active = true;
            this.planet.geoImageTileCreator.active = true;
        }
    }

    if (r.events.mouseState.leftButtonDown || !this.scaleRot)
        return;

    this.scaleRot -= this.inertia;
    if (this.scaleRot <= 0) {
        this.scaleRot = 0;
    } else {
        r.controlsBag.scaleRot = this.scaleRot;
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

    if (cam.eye.distance(prevEye) / cam._terrainAltitude > 0.01) {
        this.planet.layersActivity = false;
        this.planet.terrainProvider.active = false;
        this.planet.normalMapCreator.active = false;
        this.planet.geoImageTileCreator.active = false;
    } else {
        this.planet.layersActivity = true;
        this.planet.terrainProvider.active = true;
        this.planet.normalMapCreator.active = true;
        this.planet.geoImageTileCreator.active = true;
    }

};