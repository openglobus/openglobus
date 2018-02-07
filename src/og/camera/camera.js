goog.provide('og.Camera');

goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.math.Matrix4');
goog.require('og.Frustum');
goog.require('og.math.Pixel');
goog.require('og.Events');

/**
 * Camera class.
 * @class
 * @param {og.Renderer} [renderer] - Renderer uses the camera instance.
 * @param {Object} [options] - Camera options:
 * @param {Object} [options.name] - Camera name.
 * @param {number} [options.viewAngle=30] - Camera angle of view. Default is 30.0
 * @param {number} [options.near=1] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far=og.math.MAX] - Camera far plane distance. Deafult is og.math.MAX
 * @param {og.math.Vector3} [options.eye=[0,0,0]] - Camera eye position. Default (0,0,0)
 * @param {og.math.Vector3} [options.look=[0,0,0]] - Camera look position. Default (0,0,0)
 * @param {og.math.Vector3} [options.up=[0,1,0]] - Camera eye position. Default (0,1,0)
 *
 * @fires og.Camera#viewchange
 */
og.Camera = function (renderer, options) {

    /**
     * Assigned renderer.
     * @public
     * @type {og.Renderer}
     */
    this.renderer = null;

    /**
     * Camera events handler.
     * @public
     * @type {og.Events}
     */
    this.events = new og.Events();
    this.events.registerNames(og.Camera.EVENT_NAMES);

    /**
     * Camera position.
     * @public
     * @type {og.math.Vector3}
     */
    this.eye = new og.math.Vector3();

    /**
     * Camera frustum. 
     * @public
     * @type {og.Frustum}
     */
    this.frustum = new og.Frustum();

    /**
     * Aspect ratio.
     * @protected
     * @type {Number}
     */
    this._aspect = options.aspect || 0;

    /**
     * Camera near distance.
     * @protected
     * @type {Number}
     */
    this._nearDist = 0;

    /**
     * Camera far distance.
     * @protected
     * @type {Number}
     */
    this._farDist = 0;

    /**
     * Camera view angle in degrees.
     * @protected
     * @type {Number}
     */
    this._viewAngle = 0;

    /**
     * Camera normal matrix.
     * @protected
     * @type {og.math.Matrix3}
     */
    this._normalMatrix = new og.math.Matrix3();

    /**
     * Camera projection matrix.
     * @protected
     * @type {og.math.Matrix4}
     */
    this._projectionMatrix = new og.math.Matrix4();

    /**
     * Camera view matrix.
     * @protected
     * @type {og.math.Matrix4}
     */
    this._viewMatrix = new og.math.Matrix4();

    /**
     * Product of projection and view matrices.
     * @protected
     * @type {og.math.Matrix4}
     */
    this._projectionViewMatrix = new og.math.Matrix4();

    /**
     * Inverse projectionView Matrix.
     * @protected
     * @type {og.math.Matrix4}
     */
    this._inverseProjectionViewMatrix = new og.math.Matrix4();

    /**
     * Camera projection matrix for small near and far distances.
     * @protected
     * @type {og.math.Matrix4}
     */
    this._projectionMatrixPrecise = new og.math.Matrix4();

    /**
     * Camera right vector.
     * @protected
     * @type {og.math.Vector3}
     */
    this._u = new og.math.Vector3(0, 1, 0); //up x n

    /**
     * Camera up vector.
     * @protected
     * @type {og.math.Vector3}
     */
    this._v = new og.math.Vector3(1, 0, 0); //n x u - UP

    this.slope = 0;

    /**
     * Camera forward vector.
     * @protected
     * @type {og.math.Vector3}
     */
    this._n = new og.math.Vector3(0, 0, 1); //eye - look - FORWARD

    this._pu = this._u;
    this._pv = this._v;
    this._pn = this._n;
    this._peye = this.eye;
    this._moved = false;

    this._tanViewAngle_hrad = 0;
    this._tanViewAngle_hradOneByHeight = 0;

    renderer && this.initialize(renderer, options);
};

og.Camera.EVENT_NAMES = [
    /**
     * When camera has been updated.
     * @event og.Camera#viewchange
     */
    "viewchange",

    /**
     * Camera is stopped.
     * @event og.Camera#moveend
     */
    "moveend"
];

og.Camera.defaultOptions = {
    viewAngle: 30,
    near: 1,
    far: og.math.MAX,
    eye: new og.math.Vector3(0, 0, 0),
    look: new og.math.Vector3(0, 0, 0),
    up: new og.math.Vector3(0, 1, 0)
};

/**
 * Updates model view matrix.
 * @protected
 */
og.Camera.prototype._setViewMatrix = function () {
    var u = this._u,
        v = this._v,
        n = this._n,
        eye = this.eye;

    this._viewMatrix.set([u.x, v.x, n.x, 0,
    u.y, v.y, n.y, 0,
    u.z, v.z, n.z, 0,
    -eye.dot(u), -eye.dot(v), -eye.dot(n), 1.0]);
};

og.Camera.prototype.checkMoveEnd = function () {
    var u = this._u,
        v = this._v,
        n = this._n,
        eye = this.eye;

    if (this.events.moveend.handlers.length) {
        if (this._peye.equal(eye) &&
            this._pu.equal(u) &&
            this._pv.equal(v) &&
            this._pn.equal(n)) {
            if (this._moved) {
                this.events.dispatch(this.events.moveend, this);
            }
            this._moved = false;
        } else {
            this._moved = true;
        }
    }

    this._pu = u;
    this._pv = v;
    this._pn = n;
    this._peye = eye;
};

/**
 * Camera initialization.
 * @public
 * @param {og.Renderer} renderer - OpenGlobus renderer object.
 * @param {Object} [options] - Camera options:
 * @param {number} [options.viewAngle] - Camera angle of view. Default is 30.0
 * @param {number} [options.near] - Camera near plane distance. Default is 1.0
 * @param {number} [options.far] - Camera far plane distance. Deafult is og.math.MAX
 * @param {og.math.Vector3} [options.eye] - Camera eye position. Default (0,0,0)
 * @param {og.math.Vector3} [options.look] - Camera look position. Default (0,0,0)
 * @param {og.math.Vector3} [options.up] - Camera eye position. Default (0,1,0)
 */
og.Camera.prototype.initialize = function (renderer, options) {

    this.renderer = renderer;

    var d = og.Camera.defaultOptions;

    this.setProjectionMatrix(options.viewAngle || d.viewAngle, this._aspect || renderer.handler.getClientAspect(),
        options.near || d.near, options.far || d.far);

    this.set(options.eye || d.eye.clone(), options.look || d.look.clone(),
        options.up || d.up.clone());

    this.update();
};

og.Camera.prototype.getUp = function () {
    return this._v;
};

og.Camera.prototype.getDown = function () {
    return this._v.negateTo();
};

og.Camera.prototype.getRight = function () {
    return this._u;
};

og.Camera.prototype.getLeft = function () {
    return this._u.negateTo();
};

og.Camera.prototype.getForward = function () {
    return this._n;
};

og.Camera.prototype.getBackward = function () {
    return this._n.negateTo();
};

/**
 * Clone camera instance to another one.
 * @public
 * @virtual
 * @returns {og.Camera} - Cloned camera instance.
 */
og.Camera.prototype.clone = function () {
    var newcam = new og.Camera();
    newcam.eye.copy(cam.eye);
    newcam._u.copy(cam._u);
    newcam._v.copy(cam._v);
    newcam._n.copy(cam._n);
    newcam.renderer = cam.renderer;
    newcam._projectionMatrix.copy(cam._projectionMatrix);
    newcam._viewMatrix.copy(cam._viewMatrix);
    newcam._projectionViewMatrix.copy(cam._projectionViewMatrix);
    newcam._inverseProjectionViewMatrix.copy(cam._inverseProjectionViewMatrix);
    newcam.frustum.setFrustum(newcam._projectionViewMatrix);
    return newcam;
};

/**
 * Updates camera view space.
 * @public
 * @virtual
 */
og.Camera.prototype.update = function () {

    this._setViewMatrix();

    this._projectionViewMatrix = this._projectionMatrix.mul(this._viewMatrix);
    this.frustum.setFrustum(this._projectionViewMatrix._m);
    this._inverseProjectionViewMatrix = this._projectionViewMatrix.inverseTo();
    this._normalMatrix = this._viewMatrix.toMatrix3();//this._viewMatrix.toInverseMatrix3().transposeTo();

    this.events.dispatch(this.events.viewchange, this);
};

/**
 * Refresh camera matrices.
 * @public
 */
og.Camera.prototype.refresh = function () {
    this.setProjectionMatrix(this._viewAngle, this._aspect, this._nearDist, this._farDist);
    this.update();
};

/**
 * Sets aspect ratio.
 * @public
 * @param {Number} aspect - Camera aspect ratio.
 */
og.Camera.prototype.setAspectRatio = function (aspect) {
    this._aspect = aspect;
    this.refresh();
};

/**
 * Returns aspect ratio.
 * @public
 * @returns {number} - Aspect ratio.
 */
og.Camera.prototype.getAspectRatio = function () {
    return this._aspect;
};

/**
 * Sets far camera distance.
 * @public
 * @param {number} distance - Far distance.
 */
og.Camera.prototype.setFar = function (distance) {
    this._farDist = distance;
    this.refresh();
};

/**
 * Gets far distance.
 * @public
 * @returns {number} - Far plane distance.
 */
og.Camera.prototype.getFar = function () {
    return this._farDist;
};

/**
 * Sets camera's near distance.
 * @public
 * @param {number} distance - Near distance.
 */
og.Camera.prototype.setNear = function (distance) {
    this._nearDist = distance;
    this.refresh();
};

/**
 * Gets near distance.
 * @public
 * @returns {number} - Near plane distance.
 */
og.Camera.prototype.getNear = function () {
    return this._nearDist;
};

/**
 * Sets up camera projection matrix.
 * @public
 * @param {nnumber} angle - Camera's view angle.
 * @param {number} aspect - Screen aspect ration.
 * @param {number} near - Near camera distance.
 * @param {number} far - Far camera distance.
 */
og.Camera.prototype.setProjectionMatrix = function (angle, aspect, near, far) {
    this._viewAngle = angle;
    this._aspect = aspect;
    this._nearDist = near;
    this._farDist = far;

    this._tanViewAngle_hrad = Math.tan(angle * og.math.RADIANS_HALF);
    this._tanViewAngle_hradOneByHeight = this._tanViewAngle_hrad * this.renderer.handler._oneByHeight;

    var c = this.renderer.handler.gl.canvas;
    this._projSizeConst = Math.min(c.clientWidth, c.clientHeight) / (this._viewAngle * og.math.RADIANS);

    this._projectionMatrix.setPerspective(angle, aspect, near, far);
    this._projectionMatrixPrecise.setPerspective(angle, aspect, 0.1, 10);
};

/**
 * Sets camera view angle in degrees.
 * @public
 * @param {number} angle - View angle.
 */
og.Camera.prototype.setViewAngle = function (angle) {
    this._viewAngle = angle;
    this.refresh();
};

/**
 * Sets camera to eye position.
 * @public
 * @param {og.math.Vector3} eye - Camera position.
 * @param {og.math.Vector3} look - Look point.
 * @param {og.math.Vector3} up - Camera up vector.
 * @returns {og.Camera} - This camera.
 */
og.Camera.prototype.set = function (eye, look, up) {
    this.eye.x = eye.x;
    this.eye.y = eye.y;
    this.eye.z = eye.z;
    look = look || this._n;
    up = up || this._v;
    this._n.x = eye.x - look.x;
    this._n.y = eye.y - look.y;
    this._n.z = eye.z - look.z;
    this._u.copy(up.cross(this._n));
    this._n.normalize();
    this._u.normalize();
    this._v.copy(this._n.cross(this._u));
    return this;
};

/**
 * Sets camera look point.
 * @public
 * @param {og.math.Vector3} look - Look point.
 * @param {og.math.Vector3} [up] - Camera up vector otherwise camera current up vector(this._v)
 */
og.Camera.prototype.look = function (look, up) {
    this._n.set(this.eye.x - look.x, this.eye.y - look.y, this.eye.z - look.z);
    this._u.copy((up || this._v).cross(this._n));
    this._n.normalize();
    this._u.normalize();
    this._v.copy(this._n.cross(this._u));
};

/**
 * Slides camera to vector d - (du, dv, dn).
 * @public
 * @param {number} du - delta X.
 * @param {number} dv - delta Y.
 * @param {number} dn - delta Z.
 */
og.Camera.prototype.slide = function (du, dv, dn) {
    this.eye.x += du * this._u.x + dv * this._v.x + dn * this._n.x;
    this.eye.y += du * this._u.y + dv * this._v.y + dn * this._n.y;
    this.eye.z += du * this._u.z + dv * this._v.z + dn * this._n.z;
};

/**
 * Roll the camera to the angle in degrees.
 * @public
 * @param {number} angle - Delta roll angle in degrees.
 */
og.Camera.prototype.roll = function (angle) {
    var cs = Math.cos(og.math.RADIANS * angle);
    var sn = Math.sin(og.math.RADIANS * angle);
    var t = this._u.clone();
    this._u.set(cs * t.x - sn * this._v.x, cs * t.y - sn * this._v.y, cs * t.z - sn * this._v.z);
    this._v.set(sn * t.x + cs * this._v.x, sn * t.y + cs * this._v.y, sn * t.z + cs * this._v.z);
};

/**
 * Pitch the camera to the angle in degrees.
 * @public
 * @param {number} angle - Delta pitch angle in degrees.
 */
og.Camera.prototype.pitch = function (angle) {
    var cs = Math.cos(og.math.RADIANS * angle);
    var sn = Math.sin(og.math.RADIANS * angle);
    var t = this._n.clone();
    this._n.set(cs * t.x - sn * this._v.x, cs * t.y - sn * this._v.y, cs * t.z - sn * this._v.z);
    this._v.set(sn * t.x + cs * this._v.x, sn * t.y + cs * this._v.y, sn * t.z + cs * this._v.z);
};

/**
 * Yaw the camera to the angle in degrees.
 * @public
 * @param {number} angle - Delta yaw angle in degrees.
 */
og.Camera.prototype.yaw = function (angle) {
    var cs = Math.cos(og.math.RADIANS * angle);
    var sn = Math.sin(og.math.RADIANS * angle);
    var t = this._u.clone();
    this._u.set(cs * t.x - sn * this._n.x, cs * t.y - sn * this._n.y, cs * t.z - sn * this._n.z);
    this._n.set(sn * t.x + cs * this._n.x, sn * t.y + cs * this._n.y, sn * t.z + cs * this._n.z);
};

/**
 * Returns normal vector direction to to the unprojected screen point from camera eye.
 * @public
 * @param {number} x - Scren X coordinate.
 * @param {number} y - Scren Y coordinate.
 * @returns {og.math.Vector3} - Direction vector.
 */
og.Camera.prototype.unproject = function (x, y) {
    var c = this.renderer.handler.gl.canvas,
        w = c.width * 0.5,
        h = c.height * 0.5;

    var px = (x - w) / w,
        py = -(y - h) / h;

    var world1 = this._inverseProjectionViewMatrix.mulVec4(new og.math.Vector4(px, py, -1, 1)).affinity(),
        world2 = this._inverseProjectionViewMatrix.mulVec4(new og.math.Vector4(px, py, 0, 1)).affinity();

    return world2.subA(world1).toVector3().normalize();
};

/**
 * Gets projected 3d point to the 2d screen coordiantes.
 * @public
 * @param {og.math.Vector3} v - Cartesian 3d coordiantes.
 * @returns {og.math.Vector2} - Screen point coordinates.
 */
og.Camera.prototype.project = function (v) {
    var r = this._projectionViewMatrix.mulVec4(v.toVector4()),
        c = this.renderer.handler.gl.canvas;
    return new og.math.Vector2((1 + r.x / r.w) * c.width * 0.5, (1 - r.y / r.w) * c.height * 0.5);
};

/**
 * Rotates camera around center point.
 * @public
 * @param {number} angle - Rotation angle in radians.
 * @param {boolaen} isArc - If true camera up vector gets from current up vector every frame,
 * otherwise up is always input parameter.
 * @param {og.math.Vector3} center - Point that the camera rotates around.
 * @param {og.math.Vecto3} [up] - Camera up vector.
 */
og.Camera.prototype.rotateAround = function (angle, isArc, center, up) {
    center = center || og.math.Vector3.ZERO;
    up = up || og.math.Vector3.UP;

    var rot = new og.math.Matrix4().setRotation(isArc ? this._v : up, angle);
    var tr = new og.math.Matrix4().setIdentity().translate(center);
    var ntr = new og.math.Matrix4().setIdentity().translate(center.negateTo());

    var trm = tr.mul(rot).mul(ntr);

    this.eye = trm.mulVec3(this.eye);
    this._v = rot.mulVec3(this._v).normalize();
    this._u = rot.mulVec3(this._u).normalize();
    this._n = rot.mulVec3(this._n).normalize();
};

/**
 * Rotates camera around center point by horizontal.
 * @public
 * @param {number} angle - Rotation angle in radians.
 * @param {boolaen} isArc - If true camera up vector gets from current up vector every frame,
 * otherwise up is always input parameter.
 * @param {og.math.Vector3} center - Point that the camera rotates around.
 * @param {og.math.Vecto3} [up] - Camera up vector.
 */
og.Camera.prototype.rotateHorizontal = function (angle, isArc, center, up) {
    this.rotateAround(angle, isArc, center, up);
};

/**
 * Rotates camera around center point by vecrtical.
 * @param {number} angle - Rotation angle in radians.
 * @param {og.math.Vector3} center - Point that the camera rotates around.
 */
og.Camera.prototype.rotateVertical = function (angle, center) {
    this.rotateAround(angle, false, center, this._u);
};

/**
 * Gets 3d size factor. Uses in LOD distance calculation.
 * @public
 * @param {og.math.Vector3} p - Far point.
 * @param {og.math.Vector3} r - Far point.
 * @returns {number} - Size factor.
 */
og.Camera.prototype.projectedSize = function (p, r) {
    return Math.atan(r / this.eye.distance(p)) * this._projSizeConst;
};

/**
 * Returns normal matrix.
 * @public
 * @returns {og.math.Matrix3} - Normal matrix.
 */
og.Camera.prototype.getNormalMatrix = function () {
    return this._normalMatrix;
};

/**
 * Returns projection matrix.
 * @public
 * @returns {og.math.Matrix4} - Projection matrix.
 */
og.Camera.prototype.getProjectionMatrix = function () {
    return this._projectionMatrix;
};

/**
 * Returns model matrix.
 * @public
 * @returns {og.math.Matrix4} - View matrix.
 */
og.Camera.prototype.getViewMatrix = function () {
    return this._viewMatrix;
};

/**
 * Returns projection and model matrix product.
 * @public
 * @return {og.math.Matrix4} - Projection-view matrix.
 */
og.Camera.prototype.getProjectionViewMatrix = function () {
    return this._projectionViewMatrix;
};

/**
 * Returns inverse projection and model matrix product.
 * @public
 * @returns {og.math.Matrix4} - Inversed projection-view matrix.
 */
og.Camera.prototype.getInverseProjecttionViewMatrix = function () {
    return this._inverseProjectionViewMatrix;
};
