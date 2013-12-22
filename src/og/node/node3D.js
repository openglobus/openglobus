goog.provide('og.node.Node3D');

goog.require('og.node.Node');
goog.require('og.webgl');
goog.require('og._class_');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');

og.node.Node3D = function (name) {
    og.node.Node3D.superclass.constructor.call(this, name);
    this.renderer = null;
    this.drawMode;
    this.show = true;
    this._isActive = true;
    this._zIndex = 1000;

    this.mxScale = new og.math.Matrix4().setIdentity();
    this.mxRotation = new og.math.Matrix4().setIdentity();
    this.mxTranslation = new og.math.Matrix4().setIdentity();
    this.mxTransformation = new og.math.Matrix4().setIdentity();
    this.imxTransformation = new og.math.Matrix4().setIdentity();
};

og._class_.extend(og.node.Node3D, og.node.Node);

og.node.Node3D.prototype.setScale = function (xyz) {
    this.mxScale.scale(xyz);
};

og.node.Node3D.prototype.setOrigin = function (origin) {
    this.mxTranslation.translate(origin);
};

og.node.Node3D.prototype.setAngles = function (ax, ay, az) {
    this.mxRotation.eulerToMatrix(ax, ay, az);
};

og.node.Node3D.prototype.updateMatrices = function () {
    this.mxTransformation = this.mxTranslation.mul(this.mxRotation).mul(this.mxScale);
    this.imxTransformation = this.mxTransformation.inverse();
};

og.node.Node3D.prototype.drawNode = function () {
    if (this._isActive) {
        this.drawNodes();
    }
};

og.node.Node3D.prototype.setZIndex = function (zindex) {
    this._zIndex = zindex;
};

og.node.Node3D.prototype.getZIndex = function () {
    return this._zIndex;
};

og.node.Node3D.prototype.isActive = function () {
    return this._isActive;
};

og.node.Node3D.prototype.setActive = function (isActive) {
    this._isActive = isActive;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setActive(isActive);
    }
};

og.node.Node3D.prototype.setDrawMode = function (mode) {
    this.drawMode = mode;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setDrawMode(mode);
    }
};

og.node.Node3D.prototype.drawNodes = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        if (this.childNodes[i]._isActive)
            this.childNodes[i].drawNodes();
    }

    if (this.show)
        if (this.frame) {
            this.frame();
        }
};

og.node.Node3D.prototype.assignRenderer = function (renderer) {
    this.renderer = renderer;
};