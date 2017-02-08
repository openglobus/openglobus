goog.provide('EarthNavigation');

goog.require('og.inheritance');
goog.require('og.control.Control');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.math.Quaternion');
goog.require('og.bv.Sphere');
goog.require('og.math.Ray');
goog.require('og.Events');

EarthNavigation = function (options) {
    og.inheritance.base(this, options);
    this.grabbedPoint = new og.math.Vector3();
    this.inertia = 0.007;
    this.grabbedSpheroid = new og.bv.Sphere();
    this.planet = null;
    this._vRot = new og.math.Quaternion();
    this._hRot = new og.math.Quaternion();
    this._a = 0.0;
    this.scaleRot = 0;
    this.currState = 0;
    this.positionState = [
        { "h": 17119745.303455353, "max": 0.8, "min": -0.8 },
        { "h": 6866011.336431573, "max": 0.8, "min": -0.8 }];

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

    this.events = new og.Events();
    this.events.registerNames(["zoomin", "zoomout"]);

    this.touches = [new Touch(), new Touch()];
};

og.inheritance.extend(EarthNavigation, og.control.Control);

EarthNavigation.prototype.switchZoomState = function (wheelDelta) {

    this.stopRotation();

    if (!wheelDelta) {
        if (this.currState === 0) {
            this.events.dispatch(this.events.zoomin, this);
            this.planet.stopFlying();
            this.currState = 1;
            var ll = globus.planet.camera._lonLat;
            globus.planet.flyLonLat(new og.LonLat(ll.lon, ll.lat, this.positionState[1].h));
        } else {
            this.events.dispatch(this.events.zoomout, this);
            this.planet.stopFlying();
            this.currState = 0;
            var ll = this.renderer.activeCamera._lonLat;
            globus.planet.flyLonLat(new og.LonLat(ll.lon, ll.lat, this.positionState[0].h));
        }
    } else if (wheelDelta > 0) {
        if (this.currState === 0) {
            this.events.dispatch(this.events.zoomin, this);
            this.planet.stopFlying();
            this.currState = 1;
            var ll = globus.planet.camera._lonLat;
            globus.planet.flyLonLat(new og.LonLat(ll.lon, ll.lat, this.positionState[1].h));
        }
    } else {
        if (this.currState === 1) {
            this.events.dispatch(this.events.zoomout, this);
            this.planet.stopFlying();
            this.currState = 0;
            var ll = this.renderer.activeCamera._lonLat;
            globus.planet.flyLonLat(new og.LonLat(ll.lon, ll.lat, this.positionState[0].h));
        }
    }
};

EarthNavigation.prototype.onMouseWheel = function (event) {

    this.switchZoomState(event.wheelDelta);
};

EarthNavigation.prototype.init = function () {
    this.planet = this.renderer.renderNodes.Earth;
    this.renderer.events.on("mousewheel", this.onMouseWheel);
    this.renderer.events.on("mouselbuttonhold", this.onMouseLeftButtonDown);
    this.renderer.events.on("mouselbuttondown", this.onMouseLeftButtonClick);
    this.renderer.events.on("mouselbuttonup", this.onMouseLeftButtonUp);

    this.renderer.events.on("touchstart", this.onTouchStart);
    this.renderer.events.on("touchend", this.onTouchEnd);
    this.renderer.events.on("touchmove", this.onTouchMove);

    this.renderer.events.on("draw", this.onDraw);
};

EarthNavigation.prototype.onTouchStart = function (e) {

    if (e.sys.touches.length == 1) {
        var t = this.touches[0];

        t.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;
        t.prev_x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t.prev_y = e.sys.touches.item(0).pageY - e.sys.offsetTop;

        t.grabbedPoint = this.planet.getCartesianFromPixelTerrain(t, true);

        if (t.grabbedPoint) {
            t.grabbedSpheroid.radius = t.grabbedPoint.length();
            this.stopRotation();
        }
    }
};


EarthNavigation.prototype.onTouchEnd = function (e) {
    if (e.sys.touches.length == 0) {
        this.scaleRot = 1;

        if (Math.abs(this.touches[0].x - this.touches[0].prev_x) < 3 &&
            Math.abs(this.touches[0].y - this.touches[0].prev_y) < 3)
            this.stopRotation();
    }
};

EarthNavigation.prototype.onTouchMove = function (e) {

    this.scaleRot = 0;
    if (e.sys.touches.length == 1) {
        var cam = this.renderer.activeCamera;

        var t = this.touches[0];

        t.prev_x = t.x;
        t.prev_y = t.y;
        t.x = e.sys.touches.item(0).pageX - e.sys.offsetLeft;
        t.y = e.sys.touches.item(0).pageY - e.sys.offsetTop;

        if (!t.grabbedPoint)
            return;

        var direction = cam.unproject(t.x, t.y);
        var targetPoint = new og.math.Ray(cam.eye, direction).hitSphere(t.grabbedSpheroid);

        if (targetPoint) {
            this._a = Math.acos(t.grabbedPoint.y / t.grabbedSpheroid.radius) - Math.acos(targetPoint.y / t.grabbedSpheroid.radius);
            this._vRot = og.math.Quaternion.axisAngleToQuat(cam._u, this._a);
            this._hRot = og.math.Quaternion.getRotationBetweenVectors(
                (new og.math.Vector3(targetPoint.x, 0.0, targetPoint.z)).normal(),
                (new og.math.Vector3(t.grabbedPoint.x, 0.0, t.grabbedPoint.z)).normal());
            var rot = this._hRot.mul(this._vRot);

            var state = this.positionState[this.currState];
            var lim = rot.mulVec3(cam.eye).normal().dot(og.math.Vector3.UP);
            if (lim > state.max || lim < state.min) {
                rot = og.math.Quaternion.yRotation(rot.getYaw());
            }

            cam.set(rot.mulVec3(cam.eye), og.math.Vector3.ZERO, og.math.Vector3.UP);
            cam.update();
        }
    }
};


EarthNavigation.prototype.onMouseLeftButtonClick = function () {
    this.renderer.handler.gl.canvas.classList.add("ogGrabbingPoiner");
    this.grabbedPoint = this.planet.getCartesianFromMouseTerrain(true);
    if (this.grabbedPoint) {
        this.grabbedSpheroid.radius = this.grabbedPoint.length();
        this.stopRotation();
    }
};

EarthNavigation.prototype.stopRotation = function () {
    this.scaleRot = 0.0;
    this._a = 0.0;
    this._vRot.clear();
    this._hRot.clear();
};

EarthNavigation.prototype.onMouseLeftButtonUp = function (e) {
    this.scaleRot = 1;
    this.renderer.handler.gl.canvas.classList.remove("ogGrabbingPoiner");

    if (Math.abs(e.x - e.prev_x) < 3 &&
        Math.abs(e.y - e.prev_y) < 3)
        this.stopRotation();
};

EarthNavigation.prototype.onMouseLeftButtonDown = function (e) {
    this.scaleRot = 0;

    var cam = this.renderer.activeCamera;

    if (!this.grabbedPoint || cam.isFlying())
        return;

    if (this.renderer.events.mouseState.moving) {

        var targetPoint = new og.math.Ray(cam.eye, e.direction).hitSphere(this.grabbedSpheroid);
        if (targetPoint) {
            this._a = Math.acos(this.grabbedPoint.y / this.grabbedSpheroid.radius) - Math.acos(targetPoint.y / this.grabbedSpheroid.radius);
            this._vRot = og.math.Quaternion.axisAngleToQuat(cam._u, this._a);
            this._hRot = og.math.Quaternion.getRotationBetweenVectors(
                (new og.math.Vector3(targetPoint.x, 0.0, targetPoint.z)).normal(),
                (new og.math.Vector3(this.grabbedPoint.x, 0.0, this.grabbedPoint.z)).normal());
            var rot = this._hRot.mul(this._vRot);

            var state = this.positionState[this.currState];
            var lim = rot.mulVec3(cam.eye).normal().dot(og.math.Vector3.UP);
            if (lim > state.max || lim < state.min) {
                rot = og.math.Quaternion.yRotation(rot.getYaw());
            }
            cam.set(rot.mulVec3(cam.eye), og.math.Vector3.ZERO, og.math.Vector3.UP);
            cam.update();
        }
    }
};

EarthNavigation.prototype.onDraw = function (e) {

    var r = this.renderer;
    var cam = r.activeCamera;

    if (r.events.mouseState.leftButtonDown || !this.scaleRot || cam.isFlying())
        return;

    this.scaleRot -= this.inertia;
    if (this.scaleRot <= 0) {
        this.scaleRot = 0;
    } else {

        this._vRot = og.math.Quaternion.axisAngleToQuat(cam._u, this._a);
        var rot = this._vRot.mul(this._hRot);

        var lim = rot.mulVec3(cam.eye).normal().dot(og.math.Vector3.UP);

        var state = this.positionState[this.currState];

        if (lim > state.max || lim < state.min) {
            rot = og.math.Quaternion.yRotation(rot.getYaw());
        }

        r.controlsBag.scaleRot = this.scaleRot;
        rot = rot.slerp(og.math.Quaternion.IDENTITY, 1 - this.scaleRot * this.scaleRot * this.scaleRot).normalize();
        if (!(rot.x || rot.y || rot.z)) {
            this.scaleRot = 0;
        }

        cam.set(rot.mulVec3(cam.eye), og.math.Vector3.ZERO, og.math.Vector3.UP);
        cam.update();
    }
};