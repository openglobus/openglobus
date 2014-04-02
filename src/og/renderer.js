goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.input');
goog.require('og.input.MouseHandler');
goog.require('og.input.KeyboardHandler');
goog.require('og.Camera');
goog.require('og.Events');

og.Renderer = function (handler) {
    this.div = null;
    this.handler = handler;
    this._renderNodesArr = [];
    this.renderNodes = {};
    this.cameras = [];
    this.activeCamera;

    this.mouseHandler = new og.input.MouseHandler(handler.gl.canvas);
    this.keyboardHandler = new og.input.KeyboardHandler(handler.gl.canvas);
    this.controls = [];

    this.events = new og.Events();

    this.mouseState = {
        x: 0,
        y: 0,
        direction: new og.math.Vector3(),
        leftButtonUp: false,
        rightButtonUp: false,
        leftButtonDown: false,
        rightButtonDown: false,
        leftButtonHold: false,
        rightButtonHold: false,
        moving: false,
        justStopped: false
    };
    this._mousestopThread = null;
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

};


og.Renderer.prototype.init = function () {
    var that = this;
    this.handler.drawback = function () {
        that.draw();
    }

    var camera = new og.Camera();
    camera.init(this, { eye: new og.math.Vector3(0, 0, 12000), look: new og.math.Vector3(0, 0, 0), up: new og.math.Vector3(0, 1, 0) });
    this.activeCamera = camera;

    this.handler.onCanvasResize = function (obj) {
        that.handleResizeEvents.call(that, obj);
    }

    this.initMouseHandler();

    this.events.registerNames([
        "ondraw",
        "onmousemove",
        "onmousestop",
        "onmouselbuttonclick",
        "onmouselbuttondown",
        "onmouserbuttonclick",
        "onmouserbuttondown",
        "onmouselbuttonup",
        "onmouserbuttonup",
        "onresize"
    ]);
};

og.Renderer.prototype.initMouseHandler = function () {
    this.mouseHandler.setEvent("onmouseup", this, this.onMouseUp);
    this.mouseHandler.setEvent("onmousemove", this, this.onMouseMove);
    this.mouseHandler.setEvent("onmousedown", this, this.onMouseDown);
};

og.Renderer.prototype.onMouseMove = function (event) {
    var ms = this.mouseState;
    ms.moving = true;
    ms.x = event.clientX;
    ms.y = event.clientY;

    //dispatch stop mouse event
    clearTimeout(this._mousestopThread);
    var that = this;
    this._mousestopThread = setTimeout(function () {
        ms.justStopped = true;
    }, 100);
};

og.Renderer.prototype.onMouseDown = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseState.leftButtonDown = true;
    } else {
        this.mouseState.rightButtonDown = true;
    }
};

og.Renderer.prototype.onMouseUp = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this.mouseState.leftButtonDown = false;
        this.mouseState.leftButtonHold = false;
        this.mouseState.leftButtonUp = true;
    } else {
        this.mouseState.rightButtonDown = false;
        this.mouseState.rightButtonHold = false;
        this.mouseState.rightButtonUp = true;
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

    this.keyboardHandler.handleEvents();
    this.handleMouseEvents();

    var ms = this.mouseState;
    ms.direction = this.activeCamera.unproject(ms.x, ms.y);

    for (var i = 0; i < this._renderNodesArr.length; i++) {
        this._renderNodesArr[i].drawNode();
    }

    this.events.dispatch(this.events.ondraw, this);

    this.mouseState.moving = false;
};

og.Renderer.prototype.handleResizeEvents = function (obj) {
    this.activeCamera.refresh();
    this.events.dispatch(this.events.onresize, obj);
};

og.Renderer.prototype.handleMouseEvents = function () {
    var ms = this.mouseState,
        e = this.events,
        ce = this.events.dispatch;

    if (ms.leftButtonDown) {
        if (ms.leftButtonHold) {
            ce(e.onmouselbuttondown, ms);
        } else {
            ms.leftButtonHold = true;
            ce(e.onmouselbuttonclick, ms);
        }
    }

    if (ms.rightButtonDown) {
        if (ms.rightButtonHold) {
            ce(e.onmouserbuttondown, ms);
        } else {
            ms.rightButtonHold = true;
            ce(e.onmouserbuttonclick, ms);
        }
    }

    if (ms.leftButtonUp) {
        ms.leftButtonUp = false;
        ce(e.onmouselbuttonup, ms);
    }

    if (ms.rightButtonUp) {
        ms.rightButtonUp = false;
        ce(e.onmouserbuttonup, ms);
    }

    if (ms.moving) {
        ce(e.onmousemove, ms);
    }

    if (ms.justStopped) {
        ce(e.onmousestop, ms);
        ms.justStopped = false;
    }
};

og.Renderer.prototype.start = function () {
    this.handler.start();
};