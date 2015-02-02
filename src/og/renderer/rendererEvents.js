goog.provide('og.RendererEvents');

goog.require('og.input');
goog.require('og.input.MouseHandler');
goog.require('og.input.KeyboardHandler');
goog.require('og.input.TouchHandler');
goog.require('og.Events');
goog.require('og.inheritance');

og.RendererEvents = function (canvas) {
    og.inheritance.base(this);

    this.touchHandler = new og.input.TouchHandler(canvas);
    this.mouseHandler = new og.input.MouseHandler(canvas);
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
        "ondraw",
        "onmousemove",
        "onmousestop",
        "onmouselbuttondoubleclick",
        "onmouseclick",
        "onmouselbuttondown",
        "onmouselbuttonhold",
        "onmouserbuttondown",
        "onmouserbuttonhold",
        "onmouselbuttonup",
        "onmouserbuttonup",
        "onresize",
        "onmousewheel",
        "ontouchstart",
        "ontouchend",
        "ontouchcancel",
        "ontouchmove"
    ]);

    this.mouseHandler.setEvent("onmouseup", this, this.onMouseUp);
    this.mouseHandler.setEvent("onmousemove", this, this.onMouseMove);
    this.mouseHandler.setEvent("onmousedown", this, this.onMouseDown);
    this.mouseHandler.setEvent("onmousewheel", this, this.onMouseWheel);

    this.touchHandler.setEvent("ontouchstart", this, this.onTouchStart);
    this.touchHandler.setEvent("ontouchend", this, this.onTouchEnd);
    this.touchHandler.setEvent("ontouchcancel", this, this.onTouchCancel);
    this.touchHandler.setEvent("ontouchmove", this, this.onTouchMove);
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

og.RendererEvents.prototype.handleMouseAndTouchEvents = function () {
    var ms = this.mouseState,
        ts = this.touchState,
        ce = this.dispatch;

    if (ms.click) {
        ce(this.onmouseclick, ms);
        ms.click = false;
    }

    if (ms.leftButtonDown) {
        if (ms.leftButtonHold) {
            ce(this.onmouselbuttonhold, ms);
        } else {
            ms.leftButtonHold = true;
            ce(this.onmouselbuttondown, ms);
        }
    }

    if (ms.rightButtonDown) {
        if (ms.rightButtonHold) {
            ce(this.onmouserbuttonhold, ms);
        } else {
            ms.rightButtonHold = true;
            ce(this.onmouserbuttondown, ms);
        }
    }

    if (ms.leftButtonUp) {
        ms.leftButtonUp = false;
        ce(this.onmouselbuttonup, ms);
    }

    if (ms.rightButtonUp) {
        ms.rightButtonUp = false;
        ce(this.onmouserbuttonup, ms);
    }

    if (ms.leftButtonDoubleClick) {
        ce(this.onmouselbuttondoubleclick, ms);
        ms.leftButtonDoubleClick = false;
    }

    if (ms.wheelDelta) {
        ce(this.onmousewheel, ms);
        ms.wheelDelta = 0;
    }

    if (ms.moving) {
        ce(this.onmousemove, ms);
        ms.prev_x = ms.x;
        ms.prev_y = ms.y;
        this._dblClkBegins = 0;
    }

    if (ts.touchEnd) {
        ts.touchEnd = false;
        ce(this.ontouchend, ts);
    }

    if (ts.touchCancel) {
        ts.touchCancel = false;
        ce(this.ontouchcancel, ts);
    }

    if (ts.touchStart) {
        ts.touchStart = false;
        ce(this.ontouchstart, ts);
    }

    if (ts.moving) {
        ce(this.ontouchmove, ts);
    }

    if (ms.justStopped) {
        ce(this.onmousestop, ms);
        ms.justStopped = false;
    }
};