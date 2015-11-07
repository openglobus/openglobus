goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.RendererEvents');
goog.require('og.Camera');
goog.require('og.math.Pixel');
goog.require('og.utils');

og.Renderer = function (handler) {
    this.div = null;
    this.handler = handler;
    this._renderNodesArr = [];
    this.renderNodes = {};
    this.cameras = [];
    this.activeCamera = null;
    this.events = new og.RendererEvents(handler.gl.canvas);
    this.controls = [];
    this.controlsBag = {};
    this._colorObjects = { "0_0_0": { emptyObject: true } };
};

og.Renderer.prototype.pickObject_a = function (color) {
    return this._colorObjects[color[0] + "_" + color[1] + "_" + color[2]];
};

og.Renderer.prototype.pickObject_v = function (color) {
    return this._colorObjects[color.x + "_" + color.y + "_" + color.z];
};

og.Renderer.prototype.assignPickingColor = function (obj) {
    var r = 0, g = 0, b = 0;
    var str = "0_0_0";
    while (this._colorObjects[str]) {
        r = og.math.randomi(1, 255);
        g = og.math.randomi(1, 255);
        b = og.math.randomi(1, 255);
        str = r + "_" + g + "_" + b;
    }
    obj._pickingColor.x = r;
    obj._pickingColor.y = g;
    obj._pickingColor.z = b;
    this._colorObjects[str] = obj;
};

og.Renderer.prototype.clearPickingColor = function (obj) {
    var c = obj._pickingColor;
    if (!c.isZero()) {
        delete this._colorObjects[c.x + "_" + c.y + "_" + c.z];
        c.x = c.y = c.z = 0;
    }
};

/**
 * Returns client width
 */
og.Renderer.prototype.getWidth = function () {
    return this.handler.gl.canvas.width;
};

/**
 * Returns client height
 */
og.Renderer.prototype.getHeight = function () {
    return this.handler.gl.canvas.height;
};

og.Renderer.prototype.getCenter = function () {
    var cnv = this.handler.gl.canvas;
    return new og.math.Pixel(Math.round(cnv.width * 0.5), Math.round(cnv.height * 0.5));
};

/**
 * Add the given control to the renderer.
 * @param {og.control.Control} control Control.
 */
og.Renderer.prototype.addControl = function (control) {
    control.setRenderer(this);
    this.controls.push(control);
};

/**
 * Add the given controls array to the planet node.
 * @param {og.control.Control} control Control.
 */
og.Renderer.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        cArr[i].setRenderer(this);
        this.controls.push(cArr[i]);
    }
};

/**
 * Remove the given control from the renderer.
 * @param {og.control.Control} control Control.
 * @return {og.control.Control|undefined} The removed control of undefined
 *     if the control was not found.
 */
og.Renderer.prototype.removeControl = function (control) {
    for (var i = 0; i < this.controls.length; i++) {
        if (this.controls[i] == control) {
            this.controls.splice(i, 1);
            control.deactivate();
            return control;
        }
    }
    return undefined;
};

og.Renderer.prototype.init = function () {
    var that = this;
    this.handler.drawback = function () {
        that.draw();
    }

    this.activeCamera = new og.Camera(this, { eye: new og.math.Vector3(0, 0, 12000000), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });

    this.events.initialize();

    this.handler.onCanvasResize = function (obj) {
        that.activeCamera.refresh();
        that.events.dispatch(that.events.onresize, obj);
    }
};

og.Renderer.prototype.addRenderNode = function (renderNode) {
    if (!this.renderNodes[renderNode.name]) {
        renderNode.assignRenderer(this);
        renderNode.initialization();
        this._renderNodesArr.push(renderNode);
        this.renderNodes[renderNode.name] = renderNode;
    } else {
        alert("Node name: " + renderNode.name + " allready exists.");
    }
};

og.Renderer.prototype.addRenderNodes = function (nodesArr) {
    for (var i = 0; i < nodesArr; i++) {
        this.addRenderNode(nodesArr[i]);
    }
};

og.Renderer.prototype.draw = function () {

    this.events.mouseState.direction = this.activeCamera.unproject(this.events.mouseState.x, this.events.mouseState.y);
    this.events.handleEvents();

    this.events.dispatch(this.events.ondraw, this);

    for (var i = 0; i < this._renderNodesArr.length; i++) {
        this._renderNodesArr[i].drawNode();
    }

    this.events.mouseState.moving = false;
    this.events.touchState.moving = false;
};

og.Renderer.prototype.start = function () {
    this.handler.start();
};