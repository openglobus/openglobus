goog.provide('og.node.RenderNode');


goog.require('og.inheritance');
goog.require('og.node.Node');
goog.require('og.webgl');
goog.require('og.math.Matrix4');
goog.require('og.math.Vector3');

og.node.RenderNode = function (name) {
    og.inheritance.base(this, name);
    this.renderer = null;
    this.drawMode;
    this.show = true;
    this._isActive = true;
    this._zIndex = 1000;

    this.scaleMatrix = new og.math.Matrix4().setIdentity();
    this.rotationMatrix = new og.math.Matrix4().setIdentity();
    this.translationMatrix = new og.math.Matrix4().setIdentity();
    this.transformationMatrix = new og.math.Matrix4().setIdentity();
    this.itransformationMatrix = new og.math.Matrix4().setIdentity();
};

og.inheritance.extend(og.node.RenderNode, og.node.Node);

og.node.RenderNode.prototype.setScale = function (xyz) {
    this.scaleMatrix.scale(xyz);
};

og.node.RenderNode.prototype.setOrigin = function (origin) {
    this.translationMatrix.translate(origin);
};

og.node.RenderNode.prototype.setAngles = function (ax, ay, az) {
    this.rotationMatrix.eulerToMatrix(ax, ay, az);
};

og.node.RenderNode.prototype.updateMatrices = function () {
    this.transformationMatrix = this.translationMatrix.mul(this.rotationMatrix).mul(this.scaleMatrix);
    this.itransformationMatrix = this.transformationMatrix.inverse();
};

og.node.RenderNode.prototype.drawNode = function () {
    if (this._isActive) {
        this.drawNodes();
    }
};

og.node.RenderNode.prototype.setZIndex = function (zindex) {
    this._zIndex = zindex;
};

og.node.RenderNode.prototype.getZIndex = function () {
    return this._zIndex;
};

og.node.RenderNode.prototype.isActive = function () {
    return this._isActive;
};

og.node.RenderNode.prototype.setActive = function (isActive) {
    this._isActive = isActive;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setActive(isActive);
    }
};

og.node.RenderNode.prototype.setDrawMode = function (mode) {
    this.drawMode = mode;
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].setDrawMode(mode);
    }
};

og.node.RenderNode.prototype.drawNodes = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        if (this.childNodes[i]._isActive)
            this.childNodes[i].drawNodes();
    }

    if (this.show)
        if (this.frame) {
            this.frame();
        }
};

og.node.RenderNode.prototype.assignRenderer = function (renderer) {
    this.renderer = renderer;
};