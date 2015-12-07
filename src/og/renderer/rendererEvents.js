goog.provide('og.RendererEvents');

goog.require('og.input');
goog.require('og.input.MouseHandler');
goog.require('og.input.KeyboardHandler');
goog.require('og.input.TouchHandler');
goog.require('og.Events');
goog.require('og.inheritance');

og.RendererEvents = function (renderer) {
    
    og.inheritance.base(this);

    this.renderer = renderer;

    this.touchHandler = new og.input.TouchHandler(renderer.handler.gl.canvas);
    this.mouseHandler = new og.input.MouseHandler(renderer.handler.gl.canvas);
    this.keyboardHandler = new og.input.KeyboardHandler();

    this.mouseState = {
        x: 0,
        y: 0,
        prev_x: 0,
        prev_y: 0,
        direction: new og.math.Vector3(),
        leftButtonUp: false,
        rightButtonUp: false,
        leftButtonDown: false,
        rightButtonDown: false,
        leftButtonHold: false,
        rightButtonHold: false,
        leftButtonDoubleClick: false,
        click: false,
        moving: false,
        justStopped: false,
        doubleClickDelay: 300,
        wheelDelta: 0
    };

    this.touchState = {
        moving: false,
        touchEnd: false,
        touchStart: false,
        touchCancel: false,
        sys: null
    };

    this._mousestopThread = null;
    this._dblClkBegins = 0;
    this._clickX = 0;
    this._clickY = 0;
};

og.inheritance.extend(og.RendererEvents, og.Events);

og.RendererEvents.prototype.handleEvents = function () {
    this.mouseState.direction = this.renderer.activeCamera.unproject(this.mouseState.x, this.mouseState.y);
    this.entityPickingEvents();
    this.keyboardHandler.handleEvents();
    this.handleMouseAndTouchEvents();
};

og.RendererEvents.prototype.on = function (name, sender, callback, key, priority) {
    if (!this[name]) {
        this.keyboardHandler.addEvent(name, sender, callback, key, priority);
    } else {
        this.constructor.superclass.on.call(this, name, sender, callback);
    }
};

og.RendererEvents.prototype.isKeyPressed = function (keyCode) {
    return this.keyboardHandler.isKeyPressed(keyCode);
};

og.RendererEvents.prototype.initialize = function () {

    this.registerNames([
        "draw",
        "mousemove",
        "mousestop",
        "mouselbuttondoubleclick",
        "mouseclick",
        "mouselbuttondown",
        "mouselbuttonhold",
        "mouserbuttondown",
        "mouserbuttonhold",
        "mouselbuttonup",
        "mouserbuttonup",
        "resize",
        "mousewheel",
        "touchstart",
        "touchend",
        "touchcancel",
        "touchmove"
    ]);

    this.mouseHandler.setEvent("mouseup", this, this.onMouseUp);
    this.mouseHandler.setEvent("mousemove", this, this.onMouseMove);
    this.mouseHandler.setEvent("mousedown", this, this.onMouseDown);
    this.mouseHandler.setEvent("mousewheel", this, this.onMouseWheel);

    this.touchHandler.setEvent("touchstart", this, this.onTouchStart);
    this.touchHandler.setEvent("touchend", this, this.onTouchEnd);
    this.touchHandler.setEvent("touchcancel", this, this.onTouchCancel);
    this.touchHandler.setEvent("touchmove", this, this.onTouchMove);
};

og.RendererEvents.prototype.onMouseWheel = function (event) {
    this.mouseState.wheelDelta = event.wheelDelta;
};

og.RendererEvents.prototype.onMouseMove = function (event) {
    var ms = this.mouseState;

    if (ms.x == event.clientX && ms.y == event.clientY) {
        return;
    }

    ms.x = event.clientX;
    ms.y = event.clientY;

    ms.moving = true;

    //dispatch stop mouse event
    clearTimeout(this._mousestopThread);
    var that = this;
    this._mousestopThread = setTimeout(function () {
        ms.justStopped = true;
    }, 100);
};

og.RendererEvents.prototype.onMouseDown = function (event) {
    if (event.button === og.input.MB_LEFT) {
        this._clickX = event.clientX;
        this._clickY = event.clientY;
        this.mouseState.leftButtonDown = true;
    } else {
        this.mouseState.rightButtonDown = true;
    }
};

og.RendererEvents.prototype.onMouseUp = function (event) {
    var ms = this.mouseState;
    if (event.button === og.input.MB_LEFT) {
        ms.leftButtonDown = false;
        ms.leftButtonHold = false;
        ms.leftButtonUp = true;

        if (this._dblClkBegins) {
            var deltatime = new Date().getTime() - this._dblClkBegins;
            if (deltatime <= ms.doubleClickDelay) {
                ms.leftButtonDoubleClick = true;
            }
            this._dblClkBegins = 0;
        } else {
            this._dblClkBegins = new Date().getTime();
        }

        if (this._clickX == event.clientX &&
            this._clickY == event.clientY) {
            ms.click = true;
        }

    } else {
        ms.rightButtonDown = false;
        ms.rightButtonHold = false;
        ms.rightButtonUp = true;
    }
};

og.RendererEvents.prototype.onTouchStart = function (event) {
    var ts = this.touchState;
    ts.sys = event;
    ts.x = event.clientX;
    ts.y = event.clientY;
    ts.touchStart = true;
};

og.RendererEvents.prototype.onTouchEnd = function (event) {
    var ts = this.touchState;
    ts.sys = event;
    ts.touchEnd = true;
};

og.RendererEvents.prototype.onTouchCancel = function (event) {
    var ts = this.touchState;
    ts.sys = event;
    ts.touchCancel = true;
};

og.RendererEvents.prototype.onTouchMove = function (event) {
    var ts = this.touchState;
    ts.sys = event;
    ts.moving = true;
};

og.RendererEvents.prototype.entityPickingEvents = function () {
    var r = this.renderer;

    var o = r._colorObjects;

    var c = r._currPickingColor,
        p = r._prevPickingColor;

    var ts = this.touchState,
        ms = this.mouseState;

    //same object
    if (c[0] == p[0] && c[1] == p[1] && c[2] == p[2]) {
        //not black
        if (c[0] || c[1] || c[2]) {
            if (ms.moving) {
                var po = o[p[0] + "_" + p[1] + "_" + p[2]];
                var pe = po._entityCollection.events;
                pe.dispatch(pe.mousemove, po);
            }
        }
    } else {
        //object changed

        //current black
        if (!(c[0] || c[1] || c[2])) {
            var po = o[p[0] + "_" + p[1] + "_" + p[2]];
            var pe = po._entityCollection.events;
            pe.dispatch(pe.mouseout, po);
        } else {
            //current not black

            //previous not black
            if (p[0] || p[1] || p[2]) {
                var po = o[p[0] + "_" + p[1] + "_" + p[2]];
                var pe = po._entityCollection.events;
                pe.dispatch(pe.mouseout, po);
            }

            var co = o[c[0] + "_" + c[1] + "_" + c[2]];
            var ce = co._entityCollection.events;
            ce.dispatch(ce.mousein, co);
        }
    }
};

og.RendererEvents.prototype.handleMouseAndTouchEvents = function () {
    var ms = this.mouseState,
        ts = this.touchState,
        ce = this.dispatch;

    if (ms.click) {
        ce(this.mouseclick, ms);
        ms.click = false;
    }

    if (ms.leftButtonDown) {
        if (ms.leftButtonHold) {
            ce(this.mouselbuttonhold, ms);
        } else {
            ms.leftButtonHold = true;
            ce(this.mouselbuttondown, ms);
        }
    }

    if (ms.rightButtonDown) {
        if (ms.rightButtonHold) {
            ce(this.mouserbuttonhold, ms);
        } else {
            ms.rightButtonHold = true;
            ce(this.mouserbuttondown, ms);
        }
    }

    if (ms.leftButtonUp) {
        ms.leftButtonUp = false;
        ce(this.mouselbuttonup, ms);
    }

    if (ms.rightButtonUp) {
        ms.rightButtonUp = false;
        ce(this.mouserbuttonup, ms);
    }

    if (ms.leftButtonDoubleClick) {
        ce(this.mouselbuttondoubleclick, ms);
        ms.leftButtonDoubleClick = false;
    }

    if (ms.wheelDelta) {
        ce(this.mousewheel, ms);
        ms.wheelDelta = 0;
    }

    if (ms.moving) {
        ce(this.mousemove, ms);
        ms.prev_x = ms.x;
        ms.prev_y = ms.y;
        this._dblClkBegins = 0;
    }

    if (ts.touchEnd) {
        ts.touchEnd = false;
        ce(this.touchend, ts);
    }

    if (ts.touchCancel) {
        ts.touchCancel = false;
        ce(this.touchcancel, ts);
    }

    if (ts.touchStart) {
        ts.touchStart = false;
        ce(this.touchstart, ts);
    }

    if (ts.moving) {
        ce(this.touchmove, ts);
    }

    if (ms.justStopped) {
        ce(this.mousestop, ms);
        ms.justStopped = false;
    }
};