goog.provide('og.node.Node3D');

goog.require('og.node.Node');
goog.require('og.webgl');
goog.require('og._class_');


og.node.Node3D = function(name) {
    og.node.Node3D.superclass.constructor.call(this, name);
    this.renderer = null;
    this.drawMode;
    this.show = true;
    this._isActive = true;
    this._zIndex = 1000;
};

og._class_.extend(og.node.Node3D, og.node.Node);

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

    if(this.show)
        if (this.frame) {
            this.frame();
        }
};

og.node.Node3D.prototype.assignRenderer = function (renderer) {
    this.renderer = renderer;
};