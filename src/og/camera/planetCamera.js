goog.provide('og.PlanetCamera');

goog.require('og.Camera');
goog.require('og.inheritance');
goog.require('og.math.Vector3');

/**
 * Planet camera.
 * @class
 * @param {og.RenderNode} planet - Planet render node.
 * @param {Object} [options] - Planet camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle] - Camera angle of view. Default is 35.0
 * @param {number} [options.near] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far] - Camera far plane distance. Deafult is og.math.MAX
 * @param {number} [options.minAltitude] - Minimal altitude for the camera. Deafult is 50
 * @param {og.math.Vector3} [options.eye] - Camera eye position. Default (0,0,0)
 * @param {og.math.Vector3} [options.look] - Camera look position. Default (0,0,0)
 * @param {og.math.Vector3} [options.up] - Camera eye position. Default (0,1,0)
 */
og.PlanetCamera = function (planet, options) {

    this.planet = planet;

    og.inheritance.base(this, planet.renderer, options);

    /**
     * Minimal alltitude that camera can reach over the terrain.
     * @public
     * @type {number}
     */
    this.minAltitude = options.minAltitude || 50;

    /**
     * Current geographical position.
     * @private
     * @type {og.LonLat}
     */
    this._lonLat = this.planet.ellipsoid.cartesianToLonLat(this.eye);

    /**
     * Current altitude.
     * @private
     * @type {number}
     */
    this._altitude = this._lonLat.height;

    this._earthPoint = { "distance": 0, "earth": new og.math.Vector3() };

    /**
     * Quad node that camera flies over.
     * @private
     * @type {og.quadTree.QuadNode}
     */
    this._insideSegment = null;//this.planet.quadTree;
    this._insideSegmentPosition = null;

    /** Camera's flying frames */
    this._framesArr = [];
    this._framesCounter = 0;
    this._numFrames = 150;
    this._completeCallback = null;
    this._flying = false;
};

og.inheritance.extend(og.PlanetCamera, og.Camera);

/**
 * Clone planet camera instance to another one.
 * @public
 * @returns {og.PlanetCamera}
 */
og.PlanetCamera.prototype.clone = function () {
    var newcam = new og.PlanetCamera();
    newcam.eye.copy(cam.eye);
    newcam._u.copy(cam._u);
    newcam._v.copy(cam._v);
    newcam._n.copy(cam._n);
    newcam.renderer = cam.renderer;
    newcam._pMatrix.copy(cam._pMatrix);
    newcam._mvMatrix.copy(cam._mvMatrix);
    newcam._pmvMatrix.copy(cam._pmvMatrix);
    newcam._ipmvMatrix.copy(cam._ipmvMatrix);
    newcam.frustum.setFrustum(newcam._pmvMatrix);
    newcam.planet = cam.planet;
    newcam._lonLat = cam._lonLat.clone();
    return newcam;
};

/**
 * Updates camera view space.
 * @public
 */
og.PlanetCamera.prototype.update = function () {

    this._setModelViewMatrix();

    this._pmvMatrix = this._pMatrix.mul(this._mvMatrix);
    this.frustum.setFrustum(this._pmvMatrix._m);

    var pmvMatrixPrecise = this._pMatrixPrecise.mul(this._mvMatrix);
    this._ipmvMatrix = pmvMatrixPrecise.inverse();

    this._nMatrix = this._mvMatrix.toInverseMatrix3().transpose();

    this._lonLat = this.planet.ellipsoid.cartesianToLonLat(this.eye);

    this.events.dispatch(this.events.viewchange, this);
};

/**
 * Sets altitude over the terrain.
 * @public
 * @param {number} alt - Altitude over the terrain.
 */
og.PlanetCamera.prototype.setAltitude = function (alt) {
    var n = this.eye.normal();
    this.eye = this._earthPoint.earth.add(n.scale(alt));
    this._altitude = alt;
};

/**
 * Gets altitude over the terrain.
 * @public
 */
og.PlanetCamera.prototype.getAltitude = function () {
    return this._altitude;
};

/**
 * Moves camera to the geographical position.
 * @public
 * @param {og.LonLat} lonlat - Geographical position.
 */
og.PlanetCamera.prototype.setLonLat = function (lonlat, up) {
    this._lonLat.set(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
    var newEye = this.planet.ellipsoid.lonLatToCartesian(this._lonLat);
    var rot = new og.math.Matrix4().rotateBetweenVectors(newEye.normal(), this.eye.normal());
    this.eye = newEye;
    this._v = rot.mulVec3(this._v);
    this._u = rot.mulVec3(this._u);
    this._n = rot.mulVec3(this._n);
};

/**
 * Returns camera geographical position.
 * @public
 * @returns {og.LonLat}
 */
og.PlanetCamera.prototype.getLonLat = function () {
    return this._lonLat;
};

/**
 * Returns camera height.
 * @public
 * @returns {number}
 */
og.PlanetCamera.prototype.getHeight = function () {
    return this._lonLat.height;
};

/**
 * Places camera to view to the geographical point.
 * @public
 * @param {og.LonLat} lonlat - New camera and camera view position.
 * @param {og.math.Vector3} [up] - Camera UP vector. Default (0,1,0)
 */
og.PlanetCamera.prototype.viewLonLat = function (lonlat, up) {
    this._lonLat.set(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
    var el = this.planet.ellipsoid;
    var newEye = el.lonLatToCartesian(this._lonLat);
    var newLook = el.lonLatToCartesian(new og.LonLat(this._lonLat.lon, this._lonLat.lat, 0));
    this.set(newEye, newLook, up || og.math.Vector3.UP);
};

/**
 * Gets position by viewable extent.
 * @public
 * @param {og.Extent} extent - Viewable extent.
 * @returns {og.math.Vector3}
 */
og.PlanetCamera.prototype.getExtentPosition = function (extent) {

    var north = extent.getNorth();
    var south = extent.getSouth();
    var east = extent.getEast();
    var west = extent.getWest();

    if (west > east) {
        east += 360;
    }

    var f = this.planet.ellipsoid.lonLatToCartesian;

    var cart = new og.LonLat(east, north);
    var northEast = f(cart);
    cart.lat = south;
    var southEast = f(cart);
    cart.lon = west;
    var southWest = f(cart);
    cart.lat = north;
    var northWest = f(cart);

    var center = og.math.Vector3.sub(northEast, southWest).scale(0.5).add(southWest);

    var mag = center.length();
    if (mag < 0.000001) {
        cart.lon = (east + west) * 0.5;
        cart.lat = (north + south) * 0.5;
        center = f(cart);
    }

    northWest.sub(center);
    southEast.sub(center);
    northEast.sub(center);
    southWest.sub(center);

    var direction = center.normal();//ellipsoid.getSurfaceNormal(center).negate().normalize();
    var right = direction.cross(og.math.Vector3.UP).normalize();
    var up = right.cross(direction).normalize();

    var height = Math.max(
      Math.abs(up.dot(northWest)),
      Math.abs(up.dot(southEast)),
      Math.abs(up.dot(northEast)),
      Math.abs(up.dot(southWest))
    );

    var width = Math.max(
      Math.abs(right.dot(northWest)),
      Math.abs(right.dot(southEast)),
      Math.abs(right.dot(northEast)),
      Math.abs(right.dot(southWest))
    );

    var tanPhi = Math.tan(this._viewAngle * og.math.RADIANS * 0.5);
    var tanTheta = this._aspect * tanPhi;
    var d = Math.max(width / tanTheta, height / tanPhi);

    center.normalize();
    center.scale(mag + d);
    return center;
};

/**
 * View current extent.
 * @public
 * @param {og.Extent} extent - Current extent.
 */
og.PlanetCamera.prototype.viewExtent = function (extent) {
    this.stopFlying();
    this.set(this.getExtentPosition(extent, this.planet.ellipsoid),
        og.math.Vector3.ZERO, og.math.Vector3.UP);
};

/**
 * Flies to the current extent.
 * @public
 * @param {og.Extent} extent - Current extent.
 * @param {og.math.Vector3} [up] - Camera UP in the end of flying. Default - (0,1,0)
 * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
 * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
 */
og.PlanetCamera.prototype.flyExtent = function (extent, up, completeCallback, startCallback) {
    this.flyCartesian(this.getExtentPosition(extent, this.planet.ellipsoid), og.math.Vector3.ZERO,
        up, completeCallback, startCallback);
};

/**
 * Flies to the geo image.
 * @public
 * @param {og.GeoImage} geoImage - Vieable geo image instance.
 * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
 * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
 */
og.PlanetCamera.prototype.flyGeoImage = function (geoImage, completeCallback, startCallback) {
    var c = geoImage.getCorners();
    var el = this.planet.ellipsoid;
    this.flyExtent(geoImage.getExtent(),
        el.lonLatToCartesian(c[0]).sub(el.lonLatToCartesian(c[3])).add(el.lonLatToCartesian(c[1]).sub(el.lonLatToCartesian(c[2]))).normalize(),
        completeCallback, startCallback);
};

/**
 * Flies to the cartesian coordinates.
 * @public
 * @param {og.math.Vector3} cartesian - Finish cartesian coordinates.
 * @param {og.math.Vector3} [look] - Camera LOOK in the end of flying. Default - (0,0,0)
 * @param {og.math.Vector3} [up] - Camera UP vector in the end of flying. Default - (0,1,0)
 * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
 * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
 */
og.PlanetCamera.prototype.flyCartesian = function (cartesian, look, up, completeCallback, startCallback) {

    this.stopFlying();

    this._completeCallback = completeCallback;

    if (startCallback) {
        startCallback.call(this);
    }

    var _look = look || og.math.Vector3.ZERO;
    if (look instanceof og.LonLat) {
        _look = this.planet.ellipsoid.lonLatToCartesian(look);
    }

    var ground_a = this.planet.ellipsoid.lonLatToCartesian(new og.LonLat(this._lonLat.lon, this._lonLat.lat));
    var v_a = this._v,
        n_a = this._n;

    var lonlat_b = this.planet.ellipsoid.cartesianToLonLat(cartesian);
    var up_b = up || og.math.Vector3.UP;
    var ground_b = this.planet.ellipsoid.LonLatToCarte(new og.LonLat(lonlat_b.lon, lonlat_b.lat, 0));
    var eye_b = cartesian;
    var n_b = og.math.Vector3.sub(eye_b, _look);
    var u_b = up_b.cross(n_b);
    n_b.normalize();
    u_b.normalize();
    var v_b = n_b.cross(u_b);

    var an = ground_a.normal();
    var bn = ground_b.normal();
    var hM_a = og.math.SQRT_HALF * Math.sqrt(1 - an.dot(bn));

    var maxHeight = 6639613;
    var currMaxHeight = Math.max(this._lonLat.height, lonlat_b.height);
    if (currMaxHeight > maxHeight) {
        maxHeight = currMaxHeight;
    }
    var max_h = currMaxHeight + 2.5 * hM_a * (maxHeight - currMaxHeight);
    var zero = og.math.Vector3.ZERO;

    //camera path and orientations calculation
    for (var i = 0; i <= this._numFrames; i++) {
        var d = 1 - i / this._numFrames;
        d = d * d * (3 - 2 * d);
        d *= d;

        var g_i = ground_a.smerp(ground_b, d).normalize();
        var ground_i = this.planet.getRayIntersectionEllipsoid(new og.math.Ray(zero, g_i));

        var t = 1 - d;
        var height_i = this._lonLat.height * d * d * d + max_h * 3 * d * d * t + max_h * 3 * d * t * t + lonlat_b.height * t * t * t;

        var eye_i = ground_i.add(g_i.scale(height_i));
        var up_i = v_a.smerp(v_b, d);
        var look_i = og.math.Vector3.add(eye_i, n_a.smerp(n_b, d).getNegate());

        var n = new og.math.Vector3(eye_i.x - look_i.x, eye_i.y - look_i.y, eye_i.z - look_i.z);
        var u = up_i.cross(n);
        n.normalize();
        u.normalize();
        var v = n.cross(u);
        this._framesArr[i] = {
            "eye": eye_i,
            "n": n,
            "u": u,
            "v": v
        };
    }

    this._framesCounter = this._numFrames;
    this._flying = true;
};

/**
 * Flies to the geo coordiantes.
 * @public
 * @param {og.LonLat} lonlat - Finish coordinates.
 * @param {og.math.Vector3} [look] - Camera LOOK in the end of flying. Default - (0,0,0)
 * @param {og.math.Vector3} [up] - Camera UP vector in the end of flying. Default - (0,1,0)
 * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
 * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
 */
og.PlanetCamera.prototype.flyLonLat = function (lonlat, look, up, completeCallback, startCallback) {
    var _lonlat = new og.LonLat(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
    this.flyCartesian(this.planet.ellipsoid.lonLatToCartesian(_lonlat), look, up, completeCallback, startCallback);
};

/**
 * Breaks the flight.
 * @public
 */
og.PlanetCamera.prototype.stopFlying = function () {
    this.planet.normalMapCreator.active = true;
    this.planet.terrainProvider.active = true;
    this._flying = false;
    this._framesArr.length = 0;
    this._framesArr = [];
    this._framesCounter = -1;
};

/**
 * Returns camera is flying.
 * @public
 * @returns {boolean}
 */
og.PlanetCamera.prototype.isFlying = function () {
    return this._flying;
};

/**
 * Rotates around planet to the left.
 * @public
 * @param {number} angle - Rotation angle.
 * @param {boolean} [spin] - If its true rotates around globe spin.
 */
og.PlanetCamera.prototype.rotateLeft = function (angle, spin) {
    this.rotateHorizontal(angle * og.math.RADIANS, spin ^ true, og.math.Vector3.ZERO);
    this.update();
};

/**
 * Rotates around planet to the right.
 * @public
 * @param {number} angle - Rotation angle.
 * @param {boolean} [spin] - If its true rotates around globe spin.
 */
og.PlanetCamera.prototype.rotateRight = function (angle, spin) {
    this.rotateHorizontal(-angle * og.math.RADIANS, spin ^ true, og.math.Vector3.ZERO);
    this.update();
};

/**
 * Rotates around planet to the north pole.
 * @public
 * @param {number} angle - Rotation angle.
 */
og.PlanetCamera.prototype.rotateUp = function (angle) {
    this.rotateVertical(angle * og.math.RADIANS, og.math.Vector3.ZERO);
    this.update();
};

/**
 * Rotates around planet to the south pole.
 * @public
 * @param {number} angle - Rotation angle.
 */
og.PlanetCamera.prototype.rotateDown = function (angle) {
    this.rotateVertical(-angle * og.math.RADIANS, og.math.Vector3.ZERO);
    this.update();
};

/**
 * Prepare camera to the frame. Used in render node frame function.
 * @public
 */
og.PlanetCamera.prototype.prepareFrame = function () {
    this._flyFrame();
    this._checkCollision();
};

og.PlanetCamera.prototype._flyFrame = function () {
    if (this._flying) {
        var c = this._numFrames - this._framesCounter;
        this.planet.normalMapCreator.active = false;
        if (c % 20) {
            this.planet.terrainProvider.active = false;
        } else {
            this.planet.terrainProvider.active = true;
        }
        this.eye = this._framesArr[c].eye;
        this._u = this._framesArr[c].u;
        this._v = this._framesArr[c].v;
        this._n = this._framesArr[c].n;
        this.update();
        this._framesCounter--;

        if (this._framesCounter < 0) {
            this.stopFlying();
            if (this._completeCallback) {
                this._completeCallback();
                this._completeCallback = null;
            }
        }
    }
};

og.PlanetCamera.prototype._checkCollision = function () {
    if (this._lonLat.height < 1000000) {
        //getting from activeCamera
        var seg = this._insideSegment;
        if (seg._projection.id == og.proj.EPSG4326.id) {
            this._earthPoint.earth = this.planet.hitRayEllipsoid(this.eye, this.eye.getNegate().normalize());
            this._earthPoint.distance = this._altitude = this._lonLat.height;
        } else {
            this._earthPoint = seg.getCameraEarthPoint(this.eye, this._insideSegmentPosition);
            this._altitude = this._earthPoint.distance;
        }
        if (this._altitude < this.minAltitude) {
            this.setAltitude(this.minAltitude);
        }
    } else {
        this._altitude = this._lonLat.height;
    }
};
