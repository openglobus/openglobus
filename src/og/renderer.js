goog.provide('og.Renderer');

goog.require('og.math.Vector3');
goog.require('og.input');
goog.require('og.input.Input');
goog.require('og.Camera');

og.Renderer = function (handler) {
    this.handler = handler;
    this._renderNodesArr = [];
    this.renderNodes = {};
    this.cameras = [];
    this.activeCamera;

    this.input = new og.input.Input();
    this.controls = [];

    this.events = {};

    this.mouseState = {
        x: 0,
        y: 0,
        direction: new og.math.Vector3(),
        leftButtonDown: false,
        rightButtonDown: false,
        leftButtonHold: false,
        rightButtonHold: false,
        moving: false
    };
};

og.Renderer.eventNames = [
    "ondraw",
    "onmousemove",
    "onmouselbuttonclick",
    "onmouselbuttondown",
    "onmouserbuttonclick",
    "onmouserbuttondown",
    "onresize"
];

og.Renderer.prototype.initEvents = function () {
    for (var i = 0; i < og.Renderer.eventNames.length; i++) {
        this.events[og.Renderer.eventNames[i]] = [];
    }
};

og.Renderer.prototype.addControl = function (control) {
    control.setRenderer(this);
    this.controls.push(control);
};

og.Renderer.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        cArr[i].setRenderer(this);
        this.controls.push(cArr[i]);
    }
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
    this.initEvents();
};

og.Renderer.prototype.initMouseHandler = function () {
    this.input.setEvent("onmouseup", this, canvas, this.onMouseUp);
    this.input.setEvent("onmousemove", this, canvas, this.onMouseMove);
    this.input.setEvent("onmousedown", this, canvas, this.onMouseDown);
};

og.Renderer.prototype.onMouseMove = function (event) {
    var ms = this.mouseState;
    ms.moving = true;
    ms.x = event.clientX;
    ms.y = event.clientY;
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
    } else {
        this.mouseState.rightButtonDown = false;
        this.mouseState.rightButtonHold = false;
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

    this.input.handleEvents();
    this.handleMouseEvents();

    var ms = this.mouseState;
    ms.direction = this.activeCamera.unproject(ms.x, ms.y);

    this._callEvents(this.events.ondraw, this);

    for (var i = 0; i < this._renderNodesArr.length; i++) {
        this._renderNodesArr[i].drawNode();
    }

};

og.Renderer.prototype.addEvent = function (name, sender, callback) {
    this.events[name].push({ sender: sender, callback: callback });
};

og.Renderer.prototype._callEvents = function (events, obj) {
    if (events) {
        var i = events.length;
        while (i--) {
            var e = events[i];
            e.callback.call(e.sender, obj);
        }
    }
};

og.Renderer.prototype.handleResizeEvents = function (obj) {
    this.activeCamera.refresh();
    this._callEvents(this.events.onresize, obj);
};

og.Renderer.prototype.handleMouseEvents = function () {
    var ms = this.mouseState,
        e = this.events,
        ce = this._callEvents;

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

    if (ms.moving) {
        ce(e.onmousemove, ms);
        ms.moving = false;
    }
};

og.Renderer.prototype.Start = function () {
    this.handler.Start();
};