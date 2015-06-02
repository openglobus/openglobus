goog.provide('og.PlanetCamera');

goog.require('og.Camera');
goog.require('og.inheritance');
goog.require('og.math.Vector3');

og.PlanetCamera = function (planet, options) {
    this.planet = planet;
    this._ellipsoid = planet.ellipsoid;
    og.inheritance.base(this, planet.renderer, options);

    this.lonLat = new og.LonLat();
    this.altitude;
    this.minAlt = options.minAltitude || 50;
    this.earthPoint = { "distance": 0, "earth": new og.math.Vector3() };
    this.bindEllipsoid(this._ellipsoid);

    //camera's flying frames
    this._framesArr = [];
    this._framesCounter = 0;
    this._numFrames = 150;
    this._completeCallback = null;
    this._flying = false;

    this._nodeCameraPosition = null;
    this.cameraInsideNode = null;
};

og.inheritance.extend(og.PlanetCamera, og.Camera);

og.PlanetCamera.prototype.bindEllipsoid = function (ellipsoid) {
    this._ellipsoid = ellipsoid;
    this.lonLat = ellipsoid.ECEF2LonLat(this.eye);
};

og.PlanetCamera.prototype.update = function () {
    this.setModelViewMatrix();
    this.pmvMatrix = this.pMatrix.mul(this.mvMatrix);
    this.frustum.setFrustum(this.pmvMatrix._m);

    var pmvMatrixPrecise = this.pMatrixPrecise.mul(this.mvMatrix);
    this.ipmvMatrix = pmvMatrixPrecise.inverse();

    this.nMatrix = this.mvMatrix.toInverseMatrix3().transpose();

    this.lonLat = this._ellipsoid.ECEF2LonLat(this.eye);

    this.events.dispatch(this.events.onviewchanged, this);
};

og.PlanetCamera.prototype.setAltitude = function (alt) {
    var n = this.eye.normal();
    this.eye = this.earthPoint.earth.add(n.scale(alt));
    this.altitude = alt;
};

og.PlanetCamera.prototype.setLonLat = function (lonlat) {
    this.lonLat.set(lonlat.lon, lonlat.lat, lonlat.height ? lonlat.height : this.lonLat.height);
    var newEye = this._ellipsoid.LonLat2ECEF(this.lonLat);
    var rot = new og.math.Matrix4().rotateBetweenVectors(newEye.normal(), this.eye.normal());
    this.eye = newEye;

    //what about altitude where camera rotates like arc ball?
    this.v = rot.mulVec3(this.v);
    this.u = rot.mulVec3(this.u);
    this.n = rot.mulVec3(this.n);
};

og.PlanetCamera.prototype.viewLonLat = function (lonlat, up) {
    this.lonLat.set(lonlat.lon, lonlat.lat, lonlat.height ? lonlat.height : this.lonLat.height);
    var newEye = this._ellipsoid.LonLat2ECEF(this.lonLat);
    var newLook = this._ellipsoid.LonLat2ECEF(new og.LonLat(this.lonLat.lon, this.lonLat.lat, 0));
    this.set(newEye, newLook, up || og.math.Vector3.UP);
};

og.PlanetCamera.prototype.getExtentPosition = function (extent) {

    var north = extent.getNorth();
    var south = extent.getSouth();
    var east = extent.getEast();
    var west = extent.getWest();

    if (west > east) {
        east += 360;
    }

    var cart = new og.LonLat(east, north);
    var northEast = this._ellipsoid.LonLat2ECEF(cart);
    cart.lat = south;
    var southEast = this._ellipsoid.LonLat2ECEF(cart);
    cart.lon = west;
    var southWest = this._ellipsoid.LonLat2ECEF(cart);
    cart.lat = north;
    var northWest = this._ellipsoid.LonLat2ECEF(cart);

    var center = og.math.Vector3.sub(northEast, southWest).scale(0.5).add(southWest);

    var mag = center.length();
    if (mag < 0.000001) {
        cart.lon = (east + west) * 0.5;
        cart.lat = (north + south) * 0.5;
        center = this._ellipsoid.LonLat2ECEF(cart);
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

    var tanPhi = Math.tan(this.viewAngle * og.math.RADIANS * 0.5);
    var tanTheta = this.aspect * tanPhi;
    var d = Math.max(width / tanTheta, height / tanPhi);

    center.normalize();
    center.scale(mag + d);
    return center;
};

og.PlanetCamera.prototype.viewExtent = function (extent) {
    this.stopFlying();
    this.set(this.getExtentPosition(extent, this._ellipsoid),
        og.math.Vector3.ZERO, og.math.Vector3.UP);
};

og.PlanetCamera.prototype.viewLonLat = function (lonlat, up) {
    this.stopFlying();
    this.viewLonLat(lonlat, up);
};

og.PlanetCamera.prototype.flyExtent = function (extent, up, completeCallback, startCallback) {
    var pos = this.getExtentPosition(extent, this._ellipsoid);
    this.flyCartesian(pos, og.math.Vector3.ZERO, up, completeCallback, startCallback);
};

og.PlanetCamera.prototype.flyGeoImage = function (geoImage, completeCallback, startCallback) {
    //
    //TODO:...
    //
};

og.PlanetCamera.prototype.flyCartesian = function (cartesian, look, up, completeCallback, startCallback) {

    this.stopFlying();

    this._completeCallback = completeCallback;

    if (startCallback) {
        startCallback.call(this);
    }

    var _look = look || og.math.Vector3.ZERO;
    if (look instanceof og.LonLat) {
        _look = this._ellipsoid.LonLat2ECEF(look);
    }

    var ground_a = this._ellipsoid.LonLat2ECEF(new og.LonLat(this.lonLat.lon, this.lonLat.lat));
    var v_a = this.v,
        n_a = this.n;

    var lonlat_b = this._ellipsoid.ECEF2LonLat(cartesian);
    var up_b = up || og.math.Vector3.UP;
    var ground_b = this._ellipsoid.LonLat2ECEF(new og.LonLat(lonlat_b.lon, lonlat_b.lat, 0));
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
    var currMaxHeight = Math.max(this.lonLat.height, lonlat_b.height);
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
        var height_i = this.lonLat.height * d * d * d + max_h * 3 * d * d * t + max_h * 3 * d * t * t + lonlat_b.height * t * t * t;

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

og.PlanetCamera.prototype.flyLonLat = function (lonlat, look, up, completeCallback, startCallback) {
    var _lonlat = new og.LonLat(lonlat.lon, lonlat.lat, lonlat.height || this.lonLat.height);
    this.flyCartesian(this._ellipsoid.LonLat2ECEF(_lonlat), look, up, completeCallback, startCallback);
};

og.PlanetCamera.prototype.stopFlying = function () {
    this._flying = false;
    this._framesArr.length = 0;
    this._framesArr = [];
    this._framesCounter = -1;
};

og.PlanetCamera.prototype.flyFrame = function () {
    if (this._flying) {
        var c = this._numFrames - this._framesCounter;
        this.planet.normalMapCreator.active = false;
        if (c % 20) {
            this.planet.terrainProvider.active = false;
        } else {
            this.planet.terrainProvider.active = true;
        }
        this.eye = this._framesArr[c].eye;
        this.u = this._framesArr[c].u;
        this.v = this._framesArr[c].v;
        this.n = this._framesArr[c].n;
        this.update();
        this._framesCounter--;

        if (this._framesCounter < 0) {
            this._flying = false;
            this.planet.normalMapCreator.active = true;
            this.planet.terrainProvider.active = true;

            if (this._completeCallback) {
                this._completeCallback();
                this._completeCallback = null;
            }
        }
    }
};

og.PlanetCamera.prototype.checkCollision = function () {
    if (this.lonLat.height < 1000000) {
        //getting from activeCamera
        var seg = this.cameraInsideNode.planetSegment;
        if (seg._projection.id == og.proj.EPSG4326.id) {
            this.earthPoint.earth = this.planet.hitRayEllipsoid(cam.eye, cam.eye.getNegate().normalize());
            this.earthPoint.distance = this.altitude = this.lonLat.height;
        } else {
            this.earthPoint = seg.getEarthPoint(this._nodeCameraPosition, this);
            this.altitude = this.earthPoint.distance;
        }
        if (this.altitude < this.minAlt) {
            this.setAltitude(this.minAlt);
        }
    } else {
        this.altitude = this.lonLat.height;
    }
};

og.PlanetCamera.prototype.isInsideSegment = function (planetSegment) {
    if (planetSegment._projection.id == og.proj.EPSG4326.id) {
        this._nodeCameraPosition = this.lonLat;
    } else {
        this._nodeCameraPosition = this.lonLat.forwardMercator();
    }
    if (planetSegment.node.parentNode.cameraInside &&
        planetSegment.extent.isInside(this._nodeCameraPosition)) {
        this.cameraInsideNode = planetSegment.node;
        return true;
    }
    return false;
};