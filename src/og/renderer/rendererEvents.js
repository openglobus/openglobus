goog.provide('og.RendererEvents');

goog.require('og.input');
goog.require('og.input.MouseHandler');
goog.require('og.input.KeyboardHandler');
goog.require('og.Events');
goog.require('og.inheritance');

og.RendererEvents = function (canvas) {
    og.inheritance.base(this);

    this.mouseHandler = new og.input.MouseHandler(canvas);
    this.keyboardHandler = new og.input.KeyboardHandler();

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
        leftButtonDoubleClick: false,
        click: false,
        moving: false,
        justStopped: false,
        doubleClickDelay: 300,
        _dblClkBegins: 0,
        clickX: 0,
        clickY: 0
    };

    this._mousestopThread = null;
};

og.inheritance.extend(og.RendererEvents, og.Events);

og.RendererEvents.prototype.handleEvents = function () {
    this.keyboardHandler.handleEvents();
    this.handleMouseEvents();
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
        "onmousewheel"
    ]);

    this.mouseHandler.setEvent("onmouseup", this, this.onMouseUp);
    this.mouseHandler.setEvent("onmousemove", this, this.onMouseMove);
    this.mouseHandler.setEvent("onmousedown", this, this.onMouseDown);
    this.mouseHandler.setEvent("onmousewheel", this, this.onMouseWheel);
};

og.RendererEvents.prototype.onMouseWheel = function (event) {
    this.dispatch(this.onmousewheel, event);
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
        this.mouseState.clickX = event.clientX;
        this.mouseState.clickY = event.clientY;
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

        if (ms._dblClkBegins) {
            var deltatime = new Date().getTime() - ms._dblClkBegins;
            if (deltatime <= ms.doubleClickDelay) {
                ms.leftButtonDoubleClick = true;
            }
            ms._dblClkBegins = 0;
        } else {
            ms._dblClkBegins = new Date().getTime();
        }

        if (ms.clickX == event.clientX && ms.clickY == event.clientY) {
            ms.click = true;
        }

    } else {
        ms.rightButtonDown = false;
        ms.rightButtonHold = false;
        ms.rightButtonUp = true;
    }
};

og.RendererEvents.prototype.handleMouseEvents = function () {
    var ms = this.mouseState,
        e = this,
        ce = this.dispatch;

    if (ms.click) {
        ce(e.onmouseclick, ms);
        ms.click = false;
    }

    if (ms.leftButtonDown) {
        if (ms.leftButtonHold) {
            ce(e.onmouselbuttonhold, ms);
        } else {
            ms.leftButtonHold = true;
            ce(e.onmouselbuttondown, ms);
        }
    }

    if (ms.rightButtonDown) {
        if (ms.rightButtonHold) {
            ce(e.onmouserbuttonhold, ms);
        } else {
            ms.rightButtonHold = true;
            ce(e.onmouserbuttondown, ms);
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

    if (ms.leftButtonDoubleClick) {
        ce(e.onmouselbuttondoubleclick, ms);
        ms.leftButtonDoubleClick = false;
    }

    if (ms.moving) {
        ce(e.onmousemove, ms);
        ms._dblClkBegins = 0;
    }

    if (ms.justStopped) {
        ce(e.onmousestop, ms);
        ms.justStopped = false;
    }
};
