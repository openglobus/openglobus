goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.RendererEvents');
goog.require('og.Camera');
goog.require('og.math.Pixel');
goog.require('og.utils');

/**
 * Represents high level WebGL context interface that starts WebGL handler works real time.
 *
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler context.
 * @fires og.RendererEvents#draw
 * @fires og.RendererEvents#resize
 * @fires og.RendererEvents#mousemove
 * @fires og.RendererEvents#mousestop
 * @fires og.RendererEvents#mouselbuttonclick
 * @fires og.RendererEvents#mouserbuttonclick
 * @fires og.RendererEvents#mousembuttonclick
 * @fires og.RendererEvents#mouselbuttondoubleclick
 * @fires og.RendererEvents#mouserbuttondoubleclick
 * @fires og.RendererEvents#mousembuttondoubleclick
 * @fires og.RendererEvents#mouselbuttonup
 * @fires og.RendererEvents#mouserbuttonup
 * @fires og.RendererEvents#mousembuttonup
 * @fires og.RendererEvents#mouselbuttondown
 * @fires og.RendererEvents#mouserbuttondown
 * @fires og.RendererEvents#mousembuttondown
 * @fires og.RendererEvents#mouselbuttonhold
 * @fires og.RendererEvents#mouserbuttonhold
 * @fires og.RendererEvents#mousembuttonhold
 * @fires og.RendererEvents#mousewheel
 * @fires og.RendererEvents#touchstart
 * @fires og.RendererEvents#touchend
 * @fires og.RendererEvents#touchcancel
 * @fires og.RendererEvents#touchmove
 */
og.Renderer = function (handler) {

    /**
     * Div element with WebGL canvas.
     * @public
     * @type {object}
     */
    this.div = null;

    /**
     * WebGL handler context.
     * @public
     * @type {og.webgl.Handler}
     */
    this.handler = handler;

    /**
     * Render nodes drawing queue.
     * @private
     * @type {Array.<og.node.RenderNode>}
     */
    this._renderNodesArr = [];

    /**
     * Render nodes store for the comfortable access by the node name.
     * @public
     * @type {Object.<og.node.RenderNode>}
     */
    this.renderNodes = {};

    /**
     * Cameras array.
     * @public
     * @type {Array.<og.Camera>}
     */
    this.cameras = [];

    /**
     * Current active camera.
     * @public
     * @type {og.Camera}
     */
    this.activeCamera = null;

    /**
     * Renderer events. Represents interface for setting events like mousemove, draw, keypress etc.
     * @public
     * @type {og.RendererEvents}
     */
    this.events = new og.RendererEvents(this);

    /**
     * OpenGlobus controls array.
     * @public
     * @type {Array.<og.control.Control>}
     */
    this.controls = [];

    /**
     * Provide exchange between controls.
     * @public
     * @type {Object.<*>}
     */
    this.controlsBag = {};

    /**
     * Hash table for drawing objects.
     * @public
     * @type {Object.<*>}
     */
    this.colorObjects = {};

    /**
     * Color picking objects rendering queue.
     * @private
     * @callback colorPickingCallback
     * @type {Array.<colorPickingCallback>}
     */
    this._pickingCallbacks = [];

    this._pickingFramebuffer = null;

    /**
     * Stores current picking color by mouse position
     */
    this._currPickingColor = [0, 0, 0];
    this._prevPickingColor = [0, 0, 0];
};

/**
 * Adds picking rendering callback function.
 * @param {object} sender - Callback context.
 * @param {colorPickingCallback} callback - Rendering callback.
 */
og.Renderer.prototype.addPickingCallback = function (sender, callback) {
    this._pickingCallbacks.push({ "callback": callback, "sender": sender });
};

/**
 * Assign picking color to the object.
 * @param {Object} obj - Object that pressuming to be picked.
 */
og.Renderer.prototype.assignPickingColor = function (obj) {
    var r = 0, g = 0, b = 0;
    var str = "0_0_0";
    while (!(r || g || b) || this.colorObjects[str]) {
        r = og.math.randomi(1, 255);
        g = og.math.randomi(1, 255);
        b = og.math.randomi(1, 255);
        str = r + "_" + g + "_" + b;
    }

    if (!obj._pickingColor)
        obj._pickingColor = new og.math.Vector3(r, g, b);
    else
        obj._pickingColor.set(r, g, b);

    this.colorObjects[str] = obj;
};

og.Renderer.prototype.clearPickingColor = function (obj) {
    var c = obj._pickingColor;
    if (!c.isZero()) {
        delete this.colorObjects[c.x + "_" + c.y + "_" + c.z];
        c.x = c.y = c.z = 0;
    }
};

/**
 * Get the client width
 */
og.Renderer.prototype.getWidth = function () {
    return this.handler.gl.canvas.width;
};

/**
 * Get the client height
 */
og.Renderer.prototype.getHeight = function () {
    return this.handler.gl.canvas.height;
};

/**
 * Get center of the screen
 */
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
 * @return {og.control.Control|undefined} The removed control of undefined if the control was not found.
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

    this.handler.setFrameCallback(function () {
        that.draw();
    });

    this.activeCamera = new og.Camera(this, { eye: new og.math.Vector3(0, 0, 12000000), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });

    this.events.initialize();

    this.handler.onCanvasResize = function (obj) {
        that.activeCamera.setAspectRatio(obj.clientWidth / obj.clientHeight);
        that._pickingFramebuffer.setSize(obj.clientWidth, obj.clientHeight);
        that.events.dispatch(that.events.resize, obj);
    }

    this._pickingFramebuffer = new og.webgl.Framebuffer(this.handler);
};

/**
 * Adds render node to the renderer.
 * @public
 * @param {og.node.RenderNode} renderNode - Render node.
 */
og.Renderer.prototype.addRenderNode = function (renderNode) {
    if (!this.renderNodes[renderNode.name]) {
        renderNode.assignRenderer(this);
        renderNode.initialization();
        this._renderNodesArr.unshift(renderNode);
        this.renderNodes[renderNode.name] = renderNode;
    } else {
        alert("Node name: " + renderNode.name + " allready exists.");
    }
};

/**
 * Adds render nodes array to the renderer.
 * @public
 * @param {Array.<og.node.RenderNode>} nodesArr - Render nodes array.
 */
og.Renderer.prototype.addRenderNodes = function (nodesArr) {
    for (var i = 0; i < nodesArr; i++) {
        this.addRenderNode(nodesArr[i]);
    }
};

og.Renderer.prototype.draw = function () {

    this.handler.clearFrame();

    this.events.handleEvents();

    this.events.dispatch(this.events.draw, this);

    var rn = this._renderNodesArr;
    var i = rn.length;
    while (i--) {
        //renderNodes frame call
        rn[i].drawNode();
    }

    this._drawPickingBuffer();

    this.events.mouseState.moving = false;
    this.events.touchState.moving = false;
};

/**
 * Get an picking object by screen coordinates
 * @params {number} x - X position
 * @params {number} y - Y position
 * @return {Object} Object
 */
og.Renderer.prototype.getPickingObject = function (x, y) {
    var c = this._pickingFramebuffer.readPixel(x, this._pickingFramebuffer.height - y);
    return this.colorObjects[c[0] + "_" + c[1] + "_" + c[2]];
};

og.Renderer.prototype._drawPickingBuffer = function () {
    this._pickingFramebuffer.activate();

    var h = this.handler;
    var gl = h.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(h.gl.BLEND);

    var dp = this._pickingCallbacks;
    var i = dp.length;
    while (i--) {
        dp[i].callback.call(dp[i].sender);
    }

    this._pickingFramebuffer.deactivate();

    var ms = this.events.mouseState;
    var ts = this.events.touchState;

    if (!(ms.leftButtonHold || ms.rightButtonHold || ms.middleButtonHold)) {
        this._prevPickingColor[0] = this._currPickingColor[0];
        this._prevPickingColor[1] = this._currPickingColor[1];
        this._prevPickingColor[2] = this._currPickingColor[2];

        if (ts.x || ts.y) {
            this._currPickingColor = this._pickingFramebuffer.readPixel(ts.x, this._pickingFramebuffer.height - ts.y);
        } else {
            this._currPickingColor = this._pickingFramebuffer.readPixel(ms.x, this._pickingFramebuffer.height - ms.y);
        }
    }
};

/**
 * Function starts rendering
 */
og.Renderer.prototype.start = function () {
    this.handler.start();
};