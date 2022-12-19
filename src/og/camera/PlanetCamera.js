/**
 * @module og/camera/PlanetCamera
 */

"use strict";

import * as math from "../math.js";
import * as mercator from "../mercator.js";
import { Camera } from "./Camera.js";
import { Vec3 } from "../math/Vec3.js";
import { Key } from "../Lock.js";
import { LonLat } from "../LonLat.js";
import { Ray } from "../math/Ray.js";
import { Quat } from "../math/Quat.js";
import { Mat4 } from "../math/Mat4.js";

/**
 * Planet camera.
 * @class
 * @extends {Camera}
 * @param {RenderNode} planet - Planet render node.
 * @param {Object} [options] - Planet camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle] - Camera angle of view.
 * @param {number} [options.near] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far] - Camera far plane distance. Deafult is og.math.MAX
 * @param {number} [options.minAltitude] - Minimal altitude for the camera. Deafult is 5
 * @param {number} [options.maxAltitude] - Maximal altitude for the camera. Deafult is 20000000
 * @param {Vec3} [options.eye] - Camera eye position. Default (0,0,0)
 * @param {Vec3} [options.look] - Camera look position. Default (0,0,0)
 * @param {Vec3} [options.up] - Camera eye position. Default (0,1,0)
 */
class PlanetCamera extends Camera {
    /**
     * @param {RenderNode} planet - Planet render node.
     * @param {Object} [options] - Planet camera options:
     */
    constructor(planet, options) {
        super(planet.renderer, {
                frustums: [
                    [1, 100 + 0.075],
                    [100, 1000 + 0.075],
                    [1000, 1e6 + 10000],
                    [1e6, 1e9]
                ], //[[1, 1e3 + 100], [1e3, 1e6 + 10000], [1e6, 1e9]]*/
                ...options
            }
        );
        /**
         * Assigned camera's planet.
         * @public
         * @type {Planet}
         */
        this.planet = planet;

        /**
         * Minimal alltitude that camera can reach over the terrain.
         * @public
         * @type {number}
         */
        this.minAltitude = options.minAltitude || 5;

        /**
         * Maximal alltitude that camera can reach over the globe.
         * @public
         * @type {number}
         */
        this.maxAltitude = options.maxAltitude || 20000000;

        /**
         * Current geographical degree position.
         * @protected
         * @type {LonLat}
         */
        this._lonLat = this.planet.ellipsoid.cartesianToLonLat(this.eye);

        /**
         * Current geographical mercator position.
         * @protected
         * @type {LonLat}
         */
        this._lonLatMerc = this._lonLat.forwardMercator();

        /**
         * Current altitude.
         * @protected
         * @type {number}
         */
        this._terrainAltitude = this._lonLat.height;

        /**
         * Cartesian coordinates on the terrain.
         * @protected
         * @type {Vec3}
         */
        this._terrainPoint = new Vec3();

        /**
         * Quad node that camera flies over.
         * @protected
         * @type {quadTree.Node}
         */
        this._insideSegment = null;

        /**
         * Coordinates that depends on what segment class we are fling over.
         * It can be WGS84 or Mercator coordinates. Gets in og.quadTree.Node
         * @protected
         * @type {LonLat}
         */
        this._insideSegmentPosition = new LonLat();

        this.slope = 0;

        this._keyLock = new Key();

        // Camera's flying frames
        this._framesArr = [];
        this._framesCounter = 0;
        this._numFrames = 50;
        this._completeCallback = null;
        this._flying = false;
        this._checkTerrainCollision = true;
    }

    setTerrainCollisionActivity(isActive) {
        this._checkTerrainCollision = isActive;
    }

    /**
     * Updates camera view space.
     * @public
     * @virtual
     */
    update() {
        this.events.stopPropagation();

        let maxAlt = this.maxAltitude + this.planet.ellipsoid._a;

        if (this.eye.length() > maxAlt) {
            this.eye.copy(this.eye.normal().scale(maxAlt));
        }

        super.update();
        this.updateGeodeticPosition();
        this.eyeNorm = this.eye.normal();
        this.slope = this._b.dot(this.eyeNorm);
        this.events.dispatch(this.events.viewchange, this);
    }

    updateGeodeticPosition() {
        this._lonLat = this.planet.ellipsoid.cartesianToLonLat(this.eye);
        if (Math.abs(this._lonLat.lat) <= mercator.MAX_LAT) {
            this._lonLatMerc = this._lonLat.forwardMercator();
        }
    }

    /**
     * Sets altitude over the terrain.
     * @public
     * @param {number} alt - Altitude over the terrain.
     */
    setAltitude(alt) {
        var n = this.eye.normal();
        var t = this._terrainPoint;
        this.eye.x = n.x * alt + t.x;
        this.eye.y = n.y * alt + t.y;
        this.eye.z = n.z * alt + t.z;
        this._terrainAltitude = alt;
    }

    /**
     * Gets altitude over the terrain.
     * @public
     */
    getAltitude() {
        return this._terrainAltitude;
    }

    /**
     * Places camera to view to the geographical point.
     * @public
     * @param {LonLat} lonlat - New camera and camera view position.
     * @param {LonLat} [lookLonLat] - Look up coordinates.
     * @param {Vec3} [up] - Camera UP vector. Default (0,1,0)
     */
    setLonLat(lonlat, lookLonLat, up) {
        this.stopFlying();
        this._lonLat.set(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
        var el = this.planet.ellipsoid;
        var newEye = el.lonLatToCartesian(this._lonLat);
        var newLook = lookLonLat ? el.lonLatToCartesian(lookLonLat) : Vec3.ZERO;
        this.set(newEye, newLook, up || Vec3.UP);
        this.update();
    }

    /**
     * Returns camera geographical position.
     * @public
     * @returns {LonLat}
     */
    getLonLat() {
        return this._lonLat;
    }

    /**
     * Returns camera height.
     * @public
     * @returns {number}
     */
    getHeight() {
        return this._lonLat.height;
    }

    /**
     * Gets position by viewable extent.
     * @public
     * @param {Extent} extent - Viewable extent.
     * @param {Number} height - Camera height
     * @returns {Vec3}
     */
    getExtentPosition(extent, height) {
        var north = extent.getNorth();
        var south = extent.getSouth();
        var east = extent.getEast();
        var west = extent.getWest();

        if (west > east) {
            east += 360;
        }

        var e = this.planet.ellipsoid;

        var cart = new LonLat(east, north);
        var northEast = e.lonLatToCartesian(cart);
        cart.lat = south;
        var southEast = e.lonLatToCartesian(cart);
        cart.lon = west;
        var southWest = e.lonLatToCartesian(cart);
        cart.lat = north;
        var northWest = e.lonLatToCartesian(cart);

        var center = Vec3.sub(northEast, southWest).scale(0.5).addA(southWest);

        var mag = center.length();
        if (mag < 0.000001) {
            cart.lon = (east + west) * 0.5;
            cart.lat = (north + south) * 0.5;
            center = e.lonLatToCartesian(cart);
        }

        northWest.subA(center);
        southEast.subA(center);
        northEast.subA(center);
        southWest.subA(center);

        var direction = center.normal(); // ellipsoid.getSurfaceNormal(center).negate().normalize();
        var right = direction.cross(Vec3.UP).normalize();
        var up = right.cross(direction).normalize();

        var _h = Math.max(
            Math.abs(up.dot(northWest)),
            Math.abs(up.dot(southEast)),
            Math.abs(up.dot(northEast)),
            Math.abs(up.dot(southWest))
        );

        var _w = Math.max(
            Math.abs(right.dot(northWest)),
            Math.abs(right.dot(southEast)),
            Math.abs(right.dot(northEast)),
            Math.abs(right.dot(southWest))
        );

        var tanPhi = Math.tan(this._viewAngle * math.RADIANS * 0.5);
        var tanTheta = this._aspect * tanPhi;
        var d = Math.max(_w / tanTheta, _h / tanPhi);

        center.normalize();
        center.scale(mag + d + (height || 0));

        return center;
    }

    /**
     * View current extent.
     * @public
     * @param {Extent} extent - Current extent.
     */
    viewExtent(extent, height) {
        this.stopFlying();
        this.set(this.getExtentPosition(extent, height), Vec3.ZERO, Vec3.UP);
        this.update();
    }

    /**
     * Flies to the current extent.
     * @public
     * @param {Extent} extent - Current extent.
     * @param {Vec3} [up] - Camera UP in the end of flying. Default - (0,1,0)
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
     * @param [frameCallback]
     */
    flyExtent(extent, height, up, ampl, completeCallback, startCallback, frameCallback) {
        this.flyCartesian(
            this.getExtentPosition(extent, height),
            Vec3.ZERO,
            up,
            ampl,
            completeCallback,
            startCallback,
            frameCallback
        );
    }

    viewDistance(cartesian, distance = 10000.0) {
        let p0 = this.eye.add(this.getForward().scaleTo(distance));
        let _rot = Quat.getRotationBetweenVectors(p0.normal(), cartesian.normal());
        if (_rot.isZero()) {
            let newPos = cartesian.add(this.getBackward().scaleTo(distance));
            this.set(newPos, cartesian);
        } else {
            let newPos = cartesian.add(_rot.mulVec3(this.getBackward()).scale(distance)),
                newUp = _rot.mulVec3(this.getUp());
            this.set(newPos, cartesian, newUp);
        }
        this.update();
    }

    flyDistance(
        cartesian,
        distance = 10000.0,
        ampl = 0.0,
        completeCallback,
        startCallback,
        frameCallback
    ) {
        let p0 = this.eye.add(this.getForward().scaleTo(distance));
        let _rot = Quat.getRotationBetweenVectors(p0.normal(), cartesian.normal());
        if (_rot.isZero()) {
            let newPos = cartesian.add(this.getBackward().scaleTo(distance));
            this.set(newPos, cartesian);
        } else {
            let newPos = cartesian.add(_rot.mulVec3(this.getBackward()).scale(distance)),
                newUp = _rot.mulVec3(this.getUp());
            this.flyCartesian(
                newPos,
                cartesian,
                newUp,
                ampl,
                completeCallback,
                startCallback,
                frameCallback
            );
        }
    }

    /**
     * Flies to the cartesian coordinates.
     * @public
     * @param {Vec3} cartesian - Finish cartesian coordinates.
     * @param {Vec3} [look] - Camera LOOK in the end of flying. Default - (0,0,0)
     * @param {Vec3} [up] - Camera UP vector in the end of flying. Default - (0,1,0)
     * @param {Number} [ampl=1.0] - Altitude amplitude factor.
     * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
     * @param [frameCallback]
     */
    flyCartesian(cartesian, look = Vec3.ZERO, up = Vec3.UP, ampl = 1.0, completeCallback = () => {
    }, startCallback = () => {
    }, frameCallback = () => {
    }) {

        this.stopFlying();

        look = look || Vec3.ZERO;
        up = up || Vec3.UP;

        this._completeCallback = completeCallback;

        this._frameCallback = frameCallback;

        if (startCallback) {
            startCallback.call(this);
        }

        if (look instanceof LonLat) {
            look = this.planet.ellipsoid.lonLatToCartesian(look);
        }

        var ground_a = this.planet.ellipsoid.lonLatToCartesian(
            new LonLat(this._lonLat.lon, this._lonLat.lat)
        );
        var v_a = this._u,
            n_a = this._b;

        var lonlat_b = this.planet.ellipsoid.cartesianToLonLat(cartesian);
        var up_b = up;
        var ground_b = this.planet.ellipsoid.lonLatToCartesian(
            new LonLat(lonlat_b.lon, lonlat_b.lat, 0)
        );
        var eye_b = cartesian;
        var n_b = Vec3.sub(eye_b, look);
        var u_b = up_b.cross(n_b);
        n_b.normalize();
        u_b.normalize();
        var v_b = n_b.cross(u_b);

        var an = ground_a.normal();
        var bn = ground_b.normal();
        var anbn = 1.0 - an.dot(bn);
        var hM_a = ampl * math.SQRT_HALF * Math.sqrt(anbn > 0.0 ? anbn : 0.0);

        var maxHeight = 6639613;
        var currMaxHeight = Math.max(this._lonLat.height, lonlat_b.height);
        if (currMaxHeight > maxHeight) {
            maxHeight = currMaxHeight;
        }
        var max_h = currMaxHeight + 2.5 * hM_a * (maxHeight - currMaxHeight);
        var zero = Vec3.ZERO;

        // camera path and orientations calculation
        for (var i = 0; i <= this._numFrames; i++) {
            var d = 1 - i / this._numFrames;
            d = d * d * (3 - 2 * d);
            d *= d;

            // Error here
            var g_i = ground_a.smerp(ground_b, d).normalize();
            var ground_i = this.planet.getRayIntersectionEllipsoid(new Ray(zero, g_i));
            var t = 1 - d;
            var height_i =
                this._lonLat.height * d * d * d +
                max_h * 3 * d * d * t +
                max_h * 3 * d * t * t +
                lonlat_b.height * t * t * t;

            var eye_i = ground_i.addA(g_i.scale(height_i));
            var up_i = v_a.smerp(v_b, d);
            var look_i = Vec3.add(eye_i, n_a.smerp(n_b, d).negateTo());

            var n = new Vec3(eye_i.x - look_i.x, eye_i.y - look_i.y, eye_i.z - look_i.z);
            var u = up_i.cross(n);
            n.normalize();
            u.normalize();

            var v = n.cross(u);
            this._framesArr[i] = {
                eye: eye_i,
                n: n,
                u: u,
                v: v
            };
        }

        this._framesCounter = this._numFrames;
        this._flying = true;
    }

    /**
     * Flies to the geo coordiantes.
     * @public
     * @param {LonLat} lonlat - Finish coordinates.
     * @param {Vec3} [look] - Camera LOOK in the end of flying. Default - (0,0,0)
     * @param {Vec3} [up] - Camera UP vector in the end of flying. Default - (0,1,0)
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {cameraCallback} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {cameraCallback} [startCallback] - Callback that calls befor the flying begins.
     */
    flyLonLat(lonlat, look, up, ampl, completeCallback, startCallback) {
        var _lonlat = new LonLat(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
        this.flyCartesian(
            this.planet.ellipsoid.lonLatToCartesian(_lonlat),
            look,
            up,
            ampl,
            completeCallback,
            startCallback
        );
    }

    /**
     * Breaks the flight.
     * @public
     */
    stopFlying() {
        this.planet.layerLock.free(this._keyLock);
        this.planet.terrainLock.free(this._keyLock);
        this.planet._normalMapCreator.free(this._keyLock);

        this._flying = false;
        this._framesArr.length = 0;
        this._framesArr = [];
        this._framesCounter = -1;
        this._frameCallback = null;
    }

    /**
     * Returns camera is flying.
     * @public
     * @returns {boolean}
     */
    isFlying() {
        return this._flying;
    }

    /**
     * Rotates around planet to the left.
     * @public
     * @param {number} angle - Rotation angle.
     * @param {boolean} [spin] - If its true rotates around globe spin.
     */
    rotateLeft(angle, spin) {
        this.rotateHorizontal(angle * math.RADIANS, spin ^ true, Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the right.
     * @public
     * @param {number} angle - Rotation angle.
     * @param {boolean} [spin] - If its true rotates around globe spin.
     */
    rotateRight(angle, spin) {
        this.rotateHorizontal(-angle * math.RADIANS, spin ^ true, Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the north pole.
     * @public
     * @param {number} angle - Rotation angle.
     */
    rotateUp(angle) {
        this.rotateVertical(angle * math.RADIANS, Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the south pole.
     * @public
     * @param {number} angle - Rotation angle.
     */
    rotateDown(angle) {
        this.rotateVertical(-angle * math.RADIANS, Vec3.ZERO);
        this.update();
    }

    rotateVertical(angle, center, minSlope = 0) {
        var rot = new Mat4().setRotation(this._r, angle);
        var tr = new Mat4().setIdentity().translate(center);
        var ntr = new Mat4().setIdentity().translate(center.negateTo());
        var trm = tr.mul(rot).mul(ntr);

        let eye = trm.mulVec3(this.eye);
        let u = rot.mulVec3(this._u).normalize();
        let r = rot.mulVec3(this._r).normalize();
        let b = rot.mulVec3(this._b).normalize();

        let eyeNorm = eye.normal();
        let slope = b.dot(eyeNorm);

        if (minSlope) {
            let dSlope = slope - this.slope;

            if (slope < minSlope && dSlope < 0) return;

            if (
                (slope > 0.1 && u.dot(eyeNorm) > 0) ||
                this.slope <= 0.1 ||
                this._u.dot(this.eye.normal()) <= 0.0
            ) {
                this.eye = eye;
                this._u = u;
                this._r = r;
                this._b = b;
            }
        } else {
            this.eye = eye;
            this._u = u;
            this._r = r;
            this._b = b;
        }
    }

    /**
     * Prepare camera to the frame. Used in render node frame function.
     * @public
     */
    checkFly() {
        if (this._flying) {
            var c = this._numFrames - this._framesCounter;

            this.planet.layerLock.lock(this._keyLock);
            this.planet.terrainLock.lock(this._keyLock);
            this.planet._normalMapCreator.lock(this._keyLock);

            this.eye = this._framesArr[c].eye;
            this._r = this._framesArr[c].u;
            this._u = this._framesArr[c].v;
            this._b = this._framesArr[c].n;

            if (this._frameCallback) {
                this._frameCallback();
            }

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
    }

    checkTerrainCollision() {
        this._terrainAltitude = this._lonLat.height;
        if (this._insideSegment && this._insideSegment.planet) {
            this._terrainAltitude = this._insideSegment.getTerrainPoint(
                this.eye,
                this._insideSegmentPosition,
                this._terrainPoint
            );
            if (this._terrainAltitude < this.minAltitude && this._checkTerrainCollision) {
                this.setAltitude(this.minAltitude);
            }
        }
    }

    getSurfaceVisibleDistance(d) {
        let R = this.planet.ellipsoid._a;
        return R * Math.acos(R / (R + this._lonLat.height + d));
    }

    getHeading() {
        let u = this.eye.normal();
        let f = Vec3.proj_b_to_plane(
                this.slope >= 0.97 ? this.getUp() : this.getForward(),
                u
            ).normalize(),
            n = Vec3.proj_b_to_plane(Vec3.UP, u).normalize();
        let res = Math.sign(u.dot(f.cross(n))) * Math.acos(f.dot(n)) * math.DEGREES;
        if (res < 0.0) {
            return 360.0 + res;
        }
        return res;
    }

    isVisible(poi) {
        let e = this.eye.length();
        return this.eye.distance(poi) < Math.sqrt(e * e - this.planet.ellipsoid._a2);
    }
}

export { PlanetCamera };
