"use strict";

import * as mercator from "../mercator";
import * as math from "../math";
import {Camera, ICameraParams} from "./Camera";
import {Key} from "../Lock.js";
import {LonLat} from "../LonLat";
import {Mat4} from "../math/Mat4";
import {Planet} from "../scene/Planet";
import {Quat} from "../math/Quat";
import {Ray} from "../math/Ray.js";
import {Vec3} from "../math/Vec3";
import {Extent} from "../Extent";
import {Segment} from "../segment/Segment";

interface IPlanetCameraParams extends ICameraParams {
    minAltitude?: number;
    maxAltitude?: number;
}

type CameraFrame = {
    eye: Vec3;
    n: Vec3;
    u: Vec3;
    v: Vec3;
}

/**
 * Planet camera.
 * @class
 * @extends {Camera}
 * @param {RenderNode} planet - Planet render node.
 * @param {Object} [options] - Planet camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle] - Camera angle of view.
 * @param {number} [options.near] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far] - Camera far plane distance. Default is og.math.MAX
 * @param {number} [options.minAltitude] - Minimal altitude for the camera. Default is 5
 * @param {number} [options.maxAltitude] - Maximal altitude for the camera. Default is 20000000
 * @param {Vec3} [options.eye] - Camera eye position. Default (0,0,0)
 * @param {Vec3} [options.look] - Camera look position. Default (0,0,0)
 * @param {Vec3} [options.up] - Camera eye position. Default (0,1,0)
 */
class PlanetCamera extends Camera {

    /**
     * Assigned camera's planet.
     * @public
     * @type {Planet}
     */
    public planet: Planet;

    /**
     * Minimal altitude that camera can reach over the terrain.
     * @public
     * @type {number}
     */
    public minAltitude: number;

    /**
     * Maximal altitude that camera can reach over the globe.
     * @public
     * @type {number}
     */
    public maxAltitude: number;

    /**
     * Current geographical degree position.
     * @protected
     * @type {LonLat}
     */
    protected _lonLat: LonLat;

    /**
     * Current geographical mercator position.
     * @protected
     * @type {LonLat}
     */
    protected _lonLatMerc: LonLat;

    /**
     * Current altitude.
     * @protected
     * @type {number}
     */
    protected _terrainAltitude: number;

    /**
     * Cartesian coordinates on the terrain.
     * @protected
     * @type {Vec3}
     */
    protected _terrainPoint: Vec3;

    /**
     * Quad node that camera flies over.
     * @protected
     * @type {Segment}
     */

    protected _insideSegment: Segment | null;

    public slope: number;

    protected _keyLock: Key;
    protected _framesArr: CameraFrame[];
    protected _framesCounter: number;
    protected _numFrames: number;
    protected _completeCallback: Function | null;
    protected _frameCallback: Function | null;

    protected _flying: boolean;
    protected _checkTerrainCollision: boolean;

    public eyeNorm: Vec3;

    constructor(planet: Planet, options: IPlanetCameraParams = {}) {
        super(planet.renderer, {
                ...options,
                frustums: options.frustums || [[1, 100 + 0.075], [100, 1000 + 0.075], [1000, 1e6 + 10000], [1e6, 1e9]],
            }
        );

        this.planet = planet;

        this.minAltitude = options.minAltitude || 1;

        this.maxAltitude = options.maxAltitude || 20000000;

        this._lonLat = this.planet.ellipsoid.cartesianToLonLat(this.eye);

        this._lonLatMerc = this._lonLat.forwardMercator();

        this._terrainAltitude = this._lonLat.height;

        this._terrainPoint = new Vec3();

        this._insideSegment = null;

        this.slope = 0;

        this._keyLock = new Key();

        this._framesArr = [];
        this._framesCounter = 0;
        this._numFrames = 50;
        this._completeCallback = null;
        this._flying = false;
        this._checkTerrainCollision = true;

        this.eyeNorm = this.eye.getNormal();
    }

    public setTerrainCollisionActivity(isActive: boolean) {
        this._checkTerrainCollision = isActive;
    }

    /**
     * Updates camera view space.
     * @public
     * @virtual
     */
    public override update() {
        this.events.stopPropagation();

        let maxAlt = this.maxAltitude + this.planet.ellipsoid.getEquatorialSize();

        if (this.eye.length() > maxAlt) {
            this.eye.copy(this.eye.getNormal().scale(maxAlt));
        }

        super.update();

        this.updateGeodeticPosition();

        this.eyeNorm = this.eye.getNormal();
        this.slope = this._b.dot(this.eyeNorm);

        this.events.dispatch(this.events.viewchange, this);
    }

    public updateGeodeticPosition() {
        this.planet.ellipsoid.cartesianToLonLatRes(this.eye, this._lonLat);
        if (Math.abs(this._lonLat.lat) <= mercator.MAX_LAT) {
            LonLat.forwardMercatorRes(this._lonLat, this._lonLatMerc);
        }
    }

    /**
     * Sets altitude over the terrain.
     * @public
     * @param {number} alt - Altitude over the terrain.
     */
    public setAltitude(alt: number) {

        let t = this._terrainPoint;
        let n = this.planet.ellipsoid.getSurfaceNormal3v(this.eye);

        this.eye.x = n.x * alt + t.x;
        this.eye.y = n.y * alt + t.y;
        this.eye.z = n.z * alt + t.z;

        this._terrainAltitude = alt;
    }

    /**
     * Gets altitude over the terrain.
     * @public
     */
    public getAltitude(): number {
        return this._terrainAltitude;
    }

    /**
     * Places camera to view to the geographical point.
     * @public
     * @param {LonLat} lonlat - New camera and camera view position.
     * @param {LonLat} [lookLonLat] - Look up coordinates.
     * @param {Vec3} [up] - Camera UP vector. Default (0,1,0)
     */
    public setLonLat(lonlat: LonLat, lookLonLat?: LonLat, up?: Vec3) {
        this.stopFlying();
        this._lonLat.set(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
        let el = this.planet.ellipsoid;
        let newEye = el.lonLatToCartesian(this._lonLat);
        let newLook = lookLonLat ? el.lonLatToCartesian(lookLonLat) : Vec3.ZERO;
        this.set(newEye, newLook, up || Vec3.NORTH);
        this.update();
    }

    /**
     * Returns camera geographical position.
     * @public
     * @returns {LonLat}
     */
    public getLonLat(): LonLat {
        return this._lonLat;
    }

    /**
     * Returns camera height.
     * @public
     * @returns {number}
     */
    public getHeight(): number {
        return this._lonLat.height;
    }

    /**
     * Gets position by viewable extent.
     * @public
     * @param {Extent} extent - Viewable extent.
     * @param {Number} height - Camera height
     * @returns {Vec3}
     */
    public getExtentPosition(extent: Extent, height: number = 0): Vec3 {
        let north = extent.getNorth();
        let south = extent.getSouth();
        let east = extent.getEast();
        let west = extent.getWest();

        if (west > east) {
            east += 360;
        }

        let e = this.planet.ellipsoid;

        let cart = new LonLat(east, north);
        let northEast = e.lonLatToCartesian(cart);
        cart.lat = south;
        let southEast = e.lonLatToCartesian(cart);
        cart.lon = west;
        let southWest = e.lonLatToCartesian(cart);
        cart.lat = north;
        let northWest = e.lonLatToCartesian(cart);

        let center = Vec3.sub(northEast, southWest).scale(0.5).addA(southWest);

        let mag = center.length();
        if (mag < 0.000001) {
            cart.lon = (east + west) * 0.5;
            cart.lat = (north + south) * 0.5;
            center = e.lonLatToCartesian(cart);
        }

        northWest.subA(center);
        southEast.subA(center);
        northEast.subA(center);
        southWest.subA(center);

        let direction = center.getNormal(); // ellipsoid.getSurfaceNormal(center).negate().normalize();
        let right = direction.cross(Vec3.NORTH).normalize();
        let up = right.cross(direction).normalize();

        let _h = Math.max(
            Math.abs(up.dot(northWest)),
            Math.abs(up.dot(southEast)),
            Math.abs(up.dot(northEast)),
            Math.abs(up.dot(southWest))
        );

        let _w = Math.max(
            Math.abs(right.dot(northWest)),
            Math.abs(right.dot(southEast)),
            Math.abs(right.dot(northEast)),
            Math.abs(right.dot(southWest))
        );

        let tanPhi = Math.tan(this._viewAngle * math.RADIANS * 0.5);
        let tanTheta = this._aspect * tanPhi;
        let d = Math.max(_w / tanTheta, _h / tanPhi);

        center.normalize();
        center.scale(mag + d + height);

        return center;
    }

    /**
     * View current extent.
     * @public
     * @param {Extent} extent - Current extent.
     * @param {number} [height]
     */
    public viewExtent(extent: Extent, height?: number) {
        this.stopFlying();
        this.set(this.getExtentPosition(extent, height), Vec3.ZERO, Vec3.NORTH);
        this.update();
    }

    /**
     * Flies to the current extent.
     * @public
     * @param {Extent} extent - Current extent.
     * @param {number} [height] - Destination height.
     * @param {Vec3} [up] - Camera UP in the end of flying. Default - (0,1,0)
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {Function} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {Function} [startCallback] - Callback that calls before the flying begins.
     * @param {Function} [frameCallback] - Each frame callback
     */
    public flyExtent(
        extent: Extent,
        height?: number,
        up?: Vec3,
        ampl?: number,
        completeCallback?: Function,
        startCallback?: Function,
        frameCallback?: Function) {
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

    public viewDistance(cartesian: Vec3, distance: number = 10000.0) {
        let p0 = this.eye.add(this.getForward().scaleTo(distance));
        let _rot = Quat.getRotationBetweenVectors(p0.getNormal(), cartesian.getNormal());
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

    public flyDistance(
        cartesian: Vec3,
        distance: number = 10000.0,
        ampl: number = 0.0,
        completeCallback?: Function,
        startCallback?: Function,
        frameCallback?: Function
    ) {
        let p0 = this.eye.add(this.getForward().scaleTo(distance));
        let _rot = Quat.getRotationBetweenVectors(p0.getNormal(), cartesian.getNormal());
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
     * @param {Function} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {Function} [startCallback] - Callback that calls before the flying begins.
     * @param {Function} [frameCallback] - Frame callback
     */
    flyCartesian(
        cartesian: Vec3,
        look: Vec3 | LonLat = Vec3.ZERO,
        up: Vec3 = Vec3.NORTH,
        ampl: number = 1.0,
        completeCallback: Function = () => {
        },
        startCallback: Function = () => {
        },
        frameCallback: Function = () => {
        }) {

        this.stopFlying();

        look = look || Vec3.ZERO;
        up = up || Vec3.NORTH;

        this._completeCallback = completeCallback;

        this._frameCallback = frameCallback;

        if (startCallback) {
            startCallback.call(this);
        }

        if (look instanceof LonLat) {
            look = this.planet.ellipsoid.lonLatToCartesian(look);
        }

        let ground_a = this.planet.ellipsoid.lonLatToCartesian(
            new LonLat(this._lonLat.lon, this._lonLat.lat)
        );

        let v_a = this._u,
            n_a = this._b;

        let lonlat_b = this.planet.ellipsoid.cartesianToLonLat(cartesian);
        let up_b = up;
        let ground_b = this.planet.ellipsoid.lonLatToCartesian(
            new LonLat(lonlat_b.lon, lonlat_b.lat, 0)
        );
        let n_b = Vec3.sub(cartesian, look);
        let u_b = up_b.cross(n_b);
        n_b.normalize();
        u_b.normalize();
        let v_b = n_b.cross(u_b);

        let an = ground_a.getNormal();
        let bn = ground_b.getNormal();
        let anbn = 1.0 - an.dot(bn);
        let hM_a = ampl * math.SQRT_HALF * Math.sqrt(anbn > 0.0 ? anbn : 0.0);

        let maxHeight = 6639613;
        let currMaxHeight = Math.max(this._lonLat.height, lonlat_b.height);
        if (currMaxHeight > maxHeight) {
            maxHeight = currMaxHeight;
        }
        let max_h = currMaxHeight + 2.5 * hM_a * (maxHeight - currMaxHeight);
        let zero = Vec3.ZERO;

        // camera path and orientations calculation
        for (let i = 0; i <= this._numFrames; i++) {
            let d = 1 - i / this._numFrames;
            d = d * d * (3 - 2 * d);
            d *= d;

            // Error here
            let g_i = ground_a.smerp(ground_b, d).normalize();
            let ground_i = this.planet.getRayIntersectionEllipsoid(new Ray(zero, g_i));
            let t = 1 - d;
            let height_i =
                this._lonLat.height * d * d * d +
                max_h * 3 * d * d * t +
                max_h * 3 * d * t * t +
                lonlat_b.height * t * t * t;

            let eye_i = ground_i.addA(g_i.scale(height_i));
            let up_i = v_a.smerp(v_b, d);
            let look_i = Vec3.add(eye_i, n_a.smerp(n_b, d).negateTo());

            let n = new Vec3(eye_i.x - look_i.x, eye_i.y - look_i.y, eye_i.z - look_i.z);
            let u = up_i.cross(n);
            n.normalize();
            u.normalize();

            let v = n.cross(u);
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
     * Flies to the geo coordinates.
     * @public
     * @param {LonLat} lonlat - Finish coordinates.
     * @param {Vec3} [look] - Camera LOOK in the end of flying. Default - (0,0,0)
     * @param {Vec3} [up] - Camera UP vector in the end of flying. Default - (0,1,0)
     * @param {Number} [ampl] - Altitude amplitude factor.
     * @param {Function} [completeCallback] - Callback that calls after flying when flying is finished.
     * @param {Function} [startCallback] - Callback that calls befor the flying begins.
     */
    flyLonLat(lonlat, look, up, ampl, completeCallback, startCallback) {
        let _lonLat = new LonLat(lonlat.lon, lonlat.lat, lonlat.height || this._lonLat.height);
        this.flyCartesian(
            this.planet.ellipsoid.lonLatToCartesian(_lonLat),
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
        this.planet.normalMapCreator.free(this._keyLock);

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
    public rotateLeft(angle: number, spin: boolean) {
        this.rotateHorizontal(angle * math.RADIANS, Boolean(spin ^ true), Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the right.
     * @public
     * @param {number} angle - Rotation angle.
     * @param {boolean} [spin] - If its true rotates around globe spin.
     */
    public rotateRight(angle: number, spin: boolean) {
        this.rotateHorizontal(-angle * math.RADIANS, Boolean(spin ^ true), Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the North Pole.
     * @public
     * @param {number} angle - Rotation angle.
     */
    public rotateUp(angle: number) {
        this.rotateVertical(angle * math.RADIANS, Vec3.ZERO);
        this.update();
    }

    /**
     * Rotates around planet to the South Pole.
     * @public
     * @param {number} angle - Rotation angle.
     */
    public rotateDown(angle: number) {
        this.rotateVertical(-angle * math.RADIANS, Vec3.ZERO);
        this.update();
    }

    public rotateVertical(angle: number, center: Vec3, minSlope: number = 0) {
        let rot = new Mat4().setRotation(this._r, angle);
        let tr = new Mat4().setIdentity().translate(center);
        let ntr = new Mat4().setIdentity().translate(center.negateTo());
        let trm = tr.mul(rot).mul(ntr);

        let eye = trm.mulVec3(this.eye);
        let u = rot.mulVec3(this._u).normalize();
        let r = rot.mulVec3(this._r).normalize();
        let b = rot.mulVec3(this._b).normalize();

        let eyeNorm = eye.getNormal();
        let slope = b.dot(eyeNorm);

        if (minSlope) {
            let dSlope = slope - this.slope;

            if (slope < minSlope && dSlope < 0) return;

            if (
                (slope > 0.1 && u.dot(eyeNorm) > 0) ||
                this.slope <= 0.1 ||
                this._u.dot(this.eye.getNormal()) <= 0.0
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
    public checkFly() {
        if (this._flying) {
            let c = this._numFrames - this._framesCounter;

            this.planet.layerLock.lock(this._keyLock);
            this.planet.terrainLock.lock(this._keyLock);
            this.planet.normalMapCreator.lock(this._keyLock);

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

    public checkTerrainCollision() {
        this._terrainAltitude = this._lonLat.height;
        if (this._insideSegment && this._insideSegment.planet) {
            this._terrainAltitude = this._insideSegment.getTerrainPoint(
                this.eye,
                this._insideSegment.getInsideLonLat(this),
                this._terrainPoint
            );
            if (this._terrainAltitude < this.minAltitude && this._checkTerrainCollision) {
                this.setAltitude(this.minAltitude);
            }
            return this._terrainPoint;
        }
    }

    public getSurfaceVisibleDistance(d: number): number {
        let R = this.planet.ellipsoid._a;
        return R * Math.acos(R / (R + this._lonLat.height + d));
    }

    public getHeading(): number {
        let u = this.eye.getNormal();
        let f = Vec3.proj_b_to_plane(
                this.slope >= 0.97 ? this.getUp() : this.getForward(),
                u
            ).normalize(),
            n = Vec3.proj_b_to_plane(Vec3.NORTH, u).normalize();
        let res = Math.sign(u.dot(f.cross(n))) * Math.acos(f.dot(n)) * math.DEGREES;
        if (res < 0.0) {
            return 360.0 + res;
        }
        return res;
    }

    public isVisible(poi: Vec3): boolean {
        let e = this.eye.length();
        return this.eye.distance(poi) < Math.sqrt(e * e - this.planet.ellipsoid._a2);
    }

    // _calcOrientation() {
    //     let qq = Quat.yRotation(this.yaw * RADIANS).mul(this._qNorthFrame).conjugate();
    //     this.orientation = qq.mulVec3(MODEL_FORWARD).normalize();
    //     this._uOrientation[0] = this.orientation.x;
    //     this._uOrientation[1] = this.orientation.y;
    //     this._uOrientation[2] = this.orientation.z;
    // }
    //
    // _updatePrediction(now) {
    //
    //     this._qNorthFrame = Planet.getBearingNorthRotationQuat(this.eye);
    //
    //     let dt = (now - this._positionTime) * 0.001;
    //     this._positionTime = now;
    //
    //     this._predMapPosCart = this.eye.add(this._velCartesian.scaleTo(dt));
    // }
}

export {PlanetCamera};
