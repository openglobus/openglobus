goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.RendererEvents');
goog.require('og.Camera');
goog.require('og.math.Pixel');
goog.require('og.utils');

/**
 * Represents high level WebGL context interface that starts WebGL handler works real time.
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
 * @fires og.RendererEvents#doubletouch
 * @fires og.RendererEvents#touchleave
 * @fires og.RendererEvents#touchenter
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
     * @type {Object}
     */
    this.controlsBag = {};

    /**
     * Hash table for drawing objects.
     * @public
     * @type {Object}
     */
    this.colorObjects = {};

    /**
     * Color picking objects rendering queue.
     * @type {Array.<og.Renderer~pickingCallback>}
     */
    this._pickingCallbacks = [];

    /**
     * Picking objects framebuffer.
     * @private
     * @type {og.webgl.Framebuffer}
     */
    this._pickingFramebuffer = null;

    /**
     * Stores current picking rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._currPickingColor = [0, 0, 0];

    /**
     * Stores previous picked rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._prevPickingColor = [0, 0, 0];
};

/**
 * Adds picking rendering callback function.
 * @param {object} sender - Callback context.
 * @param {og.Renderer~pickingCallback} callback - Rendering callback.
 */
og.Renderer.prototype.addPickingCallback = function (sender, callback) {
    this._pickingCallbacks.push({ "callback": callback, "sender": sender });
};

/**
 * Assign picking color to the object.
 * @public
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

/**
 * Removes picking color from object.
 * @public
 * @param {Object} obj - Object to remove picking color from.
 */
og.Renderer.prototype.clearPickingColor = function (obj) {
    var c = obj._pickingColor;
    if (!c.isZero()) {
        delete this.colorObjects[c.x + "_" + c.y + "_" + c.z];
        c.x = c.y = c.z = 0;
    }
};

/**
 * Get the client width.
 * @public
 * @returns {number}
 */
og.Renderer.prototype.getWidth = function () {
    return this.handler.gl.canvas.width;
};

/**
 * Get the client height.
 * @public
 * @returns {number}
 */
og.Renderer.prototype.getHeight = function () {
    return this.handler.gl.canvas.height;
};

/**
 * Get center of the screen
 * @public
 * @returns {og.math.Pixel}
 */
og.Renderer.prototype.getCenter = function () {
    var cnv = this.handler.gl.canvas;
    return new og.math.Pixel(Math.round(cnv.width * 0.5), Math.round(cnv.height * 0.5));
};

/**
 * Add the given control to the renderer.
 * @param {og.control.BaseControl} control - Control.
 */
og.Renderer.prototype.addControl = function (control) {
    control.addTo(this);
};

/**
 * Add the given controls array to the planet node.
 * @param {Array.<og.control.BaseControl>} cArr - Control array.
 */
og.Renderer.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        cArr[i].addTo(this);
    }
};

/**
 * Remove the given control from the renderer.
 * @param {og.control.BaseControl} control  - Control.
 * @return {og.control.BaseControl|undefined}
 */
og.Renderer.prototype.removeControl = function (control) {
    for (var i = 0; i < this.controls.length; i++) {
        if (this.controls[i] == control) {
            this.controls.splice(i, 1);
            control.remove();
            return control;
        }
    }
    return undefined;
};

/**
 * Renderer initialization.
 * @public
 */
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
        this._renderNodesArr.unshift(renderNode);
        this.renderNodes[renderNode.name] = renderNode;
    } else {
        og.console.logWrn("og.Renderer 259 - node name: " + renderNode.name + " allready exists.");
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

/**
 * Draw nodes.
 * @public
 */
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

/**
 * Draw picking objects framebuffer.
 * @private
 */
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
        /**
         * This callback renders picking frame.
         * @callback og.Renderer~pickingCallback
         */
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
 * Function starts rendering.
 * @public
 */
og.Renderer.prototype.start = function () {
    this.handler.start();
};