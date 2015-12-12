goog.provide('og.RendererEvents');

goog.require('og.input');
goog.require('og.input.MouseHandler');
goog.require('og.input.KeyboardHandler');
goog.require('og.input.TouchHandler');
goog.require('og.Events');
goog.require('og.inheritance');

/*
 * Renderer events here
 * @class
 * @param {og.Renderer} renderer - Renderer object, events that works for.
 */
og.RendererEvents = function (renderer) {

    og.inheritance.base(this);

    /**
     * @public
     */
    this.renderer = renderer;

    /**
     * Low level touch events handler.
     * @private
     * @type {og.input.TouchHandler}
     */
    this._touchHandler = new og.input.TouchHandler(renderer.handler.gl.canvas);

    /**
     * Low level mouse events handler.
     * @private
     * @type {og.input.MouseHandler}
     */
    this._mouseHandler = new og.input.MouseHandler(renderer.handler.gl.canvas);

    /**
     * Low level keyboard events handler.
     * @private
     * @type {og.input.KeyboardHandler}
     */
    this._keyboardHandler = new og.input.KeyboardHandler();

    /**
     * Store mouse per frame state.
     * @public
     * @enum {*}
     */
    this.mouseState = {
        x: 0,
        y: 0,
        prev_x: 0,
        prev_y: 0,
        direction: new og.math.Vector3(),
        leftButtonUp: false,
        rightButtonUp: false,
        middleButtonUp: false,
        leftButtonDown: false,
        rightButtonDown: false,
        middleButtonDown: false,
        leftButtonHold: false,
        rightButtonHold: false,
        middleButtonHold: false,
        leftButtonDoubleClick: false,
        rightButtonDoubleClick: false,
        middleButtonDoubleClick: false,
        leftButtonClick: false,
        rightButtonClick: false,
        middleButtonClick: false,
        moving: false,
        justStopped: false,
        doubleClickDelay: 300,
        wheelDelta: 0,
        sys: null,
        pickingObject: null
    };

    /**
     * Stores touch state.
     * @public
     * @enum {*}
     */
    this.touchState = {
        moving: false,
        touchEnd: false,
        touchStart: false,
        touchCancel: false,
        sys: null,
        pickingObject: null
    };

    this._mousestopThread = null;
    this._ldblClkBegins = 0;
    this._rdblClkBegins = 0;
    this._mdblClkBegins = 0;
    this._lclickX = 0;
    this._lclickY = 0;
    this._rclickX = 0;
    this._rclickY = 0;
    this._mclickX = 0;
    this._mclickY = 0;
};

og.inheritance.extend(og.RendererEvents, og.Events);

/**
 * Renderer events names
 * @type {Array.<string>}
 * @const
 */
og.RendererEvents.EVENT_NAMES = [
        /**
         * Triggered before scene frame is rendered(before render nodes).
         * @event og.RendererEvents#draw
         */
        "draw",

        /**
         * Triggered when screen is resized.
         * @event og.RendererEvents#resize
         */
        "resize",

        /**
         * Mouse is moving.
         * @event og.RendererEvents#mousemove
         */
        "mousemove",

        /**
         * Mouse is just stopped.
         * @event og.RendererEvents#mousestop
         */
        "mousestop",

        /**
         * Mouse left button clicked.
         * @event og.RendererEvents#mouselbuttonclick
         */
        "mouselbuttonclick",

        /**
         * Mouse right button clicked.
         * @event og.RendererEvents#mouserbuttonclick
         */
        "mouserbuttonclick",

        /**
         * Mouse middle button clicked.
         * @event og.RendererEvents#mousembuttonclick
         */
        "mousembuttonclick",

        /**
         * Mouse left button double click.
         * @event og.RendererEvents#mouselbuttondoubleclick
         */
        "mouselbuttondoubleclick",

        /**
         * Mouse right button double click.
         * @event og.RendererEvents#mouserbuttondoubleclick
         */
        "mouserbuttondoubleclick",

        /**
         * Mouse middle button double click.
         * @event og.RendererEvents#mousembuttondoubleclick
         */
        "mousembuttondoubleclick",

        /**
         * Mouse left button up(stop pressing).
         * @event og.RendererEvents#mouselbuttonup
         */
        "mouselbuttonup",

        /**
         * Mouse right button up(stop pressing).
         * @event og.RendererEvents#mouserbuttonup
         */
        "mouserbuttonup",

        /**
         * Mouse middle button up(stop pressing).
         * @event og.RendererEvents#mousembuttonup
         */
        "mousembuttonup",

        /**
         * Mouse left button is just pressed down(start pressing).
         * @event og.RendererEvents#mouselbuttondown
         */
        "mouselbuttondown",

        /**
         * Mouse right button is just pressed down(start pressing).
         * @event og.RendererEvents#mouserbuttondown
         */
        "mouserbuttondown",

        /**
         * Mouse middle button is just pressed down(start pressing).
         * @event og.RendererEvents#mousembuttondown
         */
        "mousembuttondown",

        /**
         * Mouse left button is pressing.
         * @event og.RendererEvents#mouselbuttonhold
         */
        "mouselbuttonhold",

        /**
         * Mouse right button is pressing.
         * @event og.RendererEvents#mouserbuttonhold
         */
        "mouserbuttonhold",

        /**
         * Mouse middle button is pressing.
         * @event og.RendererEvents#mousembuttonhold
         */
        "mousembuttonhold",

        /**
         * Mouse wheel is rotated.
         * @event og.RendererEvents#mousewheel
         */
        "mousewheel",

        "touchstart",
        "touchend",
        "touchcancel",
        "touchmove"
];

/**
 * Used in render node frame.
 * @public
 */
og.RendererEvents.prototype.handleEvents = function () {
    this.mouseState.direction = this.renderer.activeCamera.unproject(this.mouseState.x, this.mouseState.y);
    this.entityPickingEvents();
    this._keyboardHandler.handleEvents();
    this.handleMouseAndTouchEvents();
};

/**
 * Set render event callback.
 * @public
 * @param {string} name - Event name
 * @param {*} sender - Callback context
 * @param {eventCallback} callback - Callback function
 * @param {number} [key] - Key code from og.input
 * @param {number} [priority] - Event callback priority
 */
og.RendererEvents.prototype.on = function (name, sender, callback, key, priority) {
    if (!this[name]) {
        this._keyboardHandler.addEvent(name, sender, callback, key, priority);
    } else {
        this.constructor.superclass.on.call(this, name, sender, callback);
    }
};

/**
 * Check key is pressed.
 * @public
 * @param {number} keyCode - Key code
 * @return {boolean}
 */
og.RendererEvents.prototype.isKeyPressed = function (keyCode) {
    return this._keyboardHandler.isKeyPressed(keyCode);
};

og.RendererEvents.prototype.initialize = function () {

    this.registerNames(og.RendererEvents.EVENT_NAMES);

    this._mouseHandler.setEvent("mouseup", this, this.onMouseUp);
    this._mouseHandler.setEvent("mousemove", this, this.onMouseMove);
    this._mouseHandler.setEvent("mousedown", this, this.onMouseDown);
    this._mouseHandler.setEvent("mousewheel", this, this.onMouseWheel);

    this._touchHandler.setEvent("touchstart", this, this.onTouchStart);
    this._touchHandler.setEvent("touchend", this, this.onTouchEnd);
    this._touchHandler.setEvent("touchcancel", this, this.onTouchCancel);
    this._touchHandler.setEvent("touchmove", this, this.onTouchMove);
};

og.RendererEvents.prototype.onMouseWheel = function (event) {
    this.mouseState.wheelDelta = event.wheelDelta;
};

og.RendererEvents.prototype.onMouseMove = function (event) {
    var ms = this.mouseState;
    ms.sys = event;

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
        this._lclickX = event.clientX;
        this._lclickY = event.clientY;
        this.mouseState.sys = event;
        this.mouseState.leftButtonDown = true;
    } else if (event.button === og.input.MB_RIGHT) {
        this._rclickX = event.clientX;
        this._rclickY = event.clientY;
        this.mouseState.sys = event;
        this.mouseState.rightButtonDown = true;
    } else if (event.button === og.input.MB_MIDDLE) {
        this._mclickX = event.clientX;
        this._mclickY = event.clientY;
        this.mouseState.sys = event;
        this.mouseState.middleButtonDown = true;
    }
};

og.RendererEvents.prototype.onMouseUp = function (event) {
    var ms = this.mouseState;
    ms.sys = event;
    if (event.button === og.input.MB_LEFT) {
        ms.leftButtonDown = false;
        ms.leftButtonUp = true;

        if (this._ldblClkBegins) {
            var deltatime = new Date().getTime() - this._ldblClkBegins;
            if (deltatime <= ms.doubleClickDelay) {
                ms.leftButtonDoubleClick = true;
            }
            this._ldblClkBegins = 0;
        } else {
            this._ldblClkBegins = new Date().getTime();
        }

        if (this._lclickX == event.clientX &&
            this._lclickY == event.clientY) {
            ms.leftButtonClick = true;
        }

    } else if (event.button === og.input.MB_RIGHT) {
        ms.rightButtonDown = false;
        ms.rightButtonUp = true;

        if (this._rdblClkBegins) {
            var deltatime = new Date().getTime() - this._rdblClkBegins;
            if (deltatime <= ms.doubleClickDelay) {
                ms.rightButtonDoubleClick = true;
            }
            this._rdblClkBegins = 0;
        } else {
            this._rdblClkBegins = new Date().getTime();
        }

        if (this._rclickX == event.clientX &&
            this._rclickY == event.clientY) {
            ms.rightButtonClick = true;
        }
    } else if (event.button === og.input.MB_MIDDLE) {
        ms.middleButtonDown = false;
        ms.middleButtonUp = true;

        if (this._mdblClkBegins) {
            var deltatime = new Date().getTime() - this._mdblClkBegins;
            if (deltatime <= ms.doubleClickDelay) {
                ms.middleButtonDoubleClick = true;
            }
            this._mdblClkBegins = 0;
        } else {
            this._mdblClkBegins = new Date().getTime();
        }

        if (this._mclickX == event.clientX &&
            this._mclickY == event.clientY) {
            ms.middleButtonClick = true;
        }
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
    var ts = this.touchState,
        ms = this.mouseState;

    if (!(ms.leftButtonHold || ms.rightButtonHold || ms.middleButtonHold)) {

        var r = this.renderer;

        var o = r.colorObjects;

        var c = r._currPickingColor,
            p = r._prevPickingColor;

        ms.pickingObject = null;
        ts.pickingObject = null;

        var co = o[c[0] + "_" + c[1] + "_" + c[2]];

        ms.pickingObject = co;
        ts.pickingObject = co;

        //object changed
        if (c[0] != p[0] || c[1] != p[1] || c[2] != p[2]) {
            //current black
            if (!(c[0] || c[1] || c[2])) {
                var po = o[p[0] + "_" + p[1] + "_" + p[2]];
                var pe = po._entityCollection.events;
                ms.pickingObject = po;
                pe.dispatch(pe.mouseleave, ms);
            } else {
                //current not black

                //previous not black
                if (p[0] || p[1] || p[2]) {
                    var po = o[p[0] + "_" + p[1] + "_" + p[2]];
                    var pe = po._entityCollection.events;
                    ms.pickingObject = po;
                    pe.dispatch(pe.mouseleave, ms);
                }

                var ce = co._entityCollection.events;
                ms.pickingObject = co;
                ce.dispatch(ce.mouseenter, ms);
            }
        }
    }
};

og.RendererEvents.prototype.handleMouseAndTouchEvents = function () {
    var ms = this.mouseState,
        ts = this.touchState,
        ce = this.dispatch;
    var po = ms.pickingObject || ts.pickingObject;

    if (ms.leftButtonClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouselbuttonclick, ms);
        ce(this.mouselbuttonclick, ms);
        ms.leftButtonClick = false;
    }

    if (ms.rightButtonClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouserbuttonclick, ms);
        ce(this.mouserbuttonclick, ms);
        ms.rightButtonClick = false;
    }

    if (ms.middleButtonClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mousembuttonclick, ms);
        ce(this.mousembuttonclick, ms);
        ms.middleButtonClick = false;
    }

    if (ms.leftButtonDown) {
        if (ms.leftButtonHold) {
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mouselbuttonhold, ms);
            ce(this.mouselbuttonhold, ms);
        } else {
            ms.leftButtonHold = true;
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mouselbuttondown, ms);
            ce(this.mouselbuttondown, ms);
        }
    }

    if (ms.rightButtonDown) {
        if (ms.rightButtonHold) {
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mouserbuttonhold, ms);
            ce(this.mouserbuttonhold, ms);
        } else {
            ms.rightButtonHold = true;
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mouserbuttondown, ms);
            ce(this.mouserbuttondown, ms);
        }
    }

    if (ms.middleButtonDown) {
        if (ms.middleButtonHold) {
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mousembuttonhold, ms);
            ce(this.mousembuttonhold, ms);
        } else {
            ms.middleButtonHold = true;
            po && po._entityCollection.events.dispatch(po._entityCollection.events.mousembuttondown, ms);
            ce(this.mousembuttondown, ms);
        }
    }

    if (ms.leftButtonUp) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouselbuttonup, ms);
        ce(this.mouselbuttonup, ms);
        ms.leftButtonUp = false;
        ms.leftButtonHold = false;
    }

    if (ms.rightButtonUp) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouserbuttonup, ms);
        ce(this.mouserbuttonup, ms);
        ms.rightButtonUp = false;
        ms.rightButtonHold = false;
    }

    if (ms.middleButtonUp) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mousembuttonup, ms);
        ce(this.mousembuttonup, ms);
        ms.middleButtonUp = false;
        ms.middleButtonHold = false;
    }

    if (ms.leftButtonDoubleClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouselbuttondoubleclick, ms);
        ce(this.mouselbuttondoubleclick, ms);
        ms.leftButtonDoubleClick = false;
    }

    if (ms.rightButtonDoubleClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mouserbuttondoubleclick, ms);
        ce(this.mouserbuttondoubleclick, ms);
        ms.rightButtonDoubleClick = false;
    }

    if (ms.middleButtonDoubleClick) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mousembuttondoubleclick, ms);
        ce(this.mousembuttondoubleclick, ms);
        ms.middleButtonDoubleClick = false;
    }

    if (ms.wheelDelta) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mousewheel, ms);
        ce(this.mousewheel, ms);
        ms.wheelDelta = 0;
    }

    if (ms.moving) {
        po && po._entityCollection.events.dispatch(po._entityCollection.events.mousemove, ms);
        ce(this.mousemove, ms);
        ms.prev_x = ms.x;
        ms.prev_y = ms.y;
        this._ldblClkBegins = 0;
        this._rdblClkBegins = 0;
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