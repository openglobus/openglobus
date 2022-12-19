/**
 * @module og/renderer/RendererEvents
 */

"use strict";

import { Events } from "../Events.js";
import { input } from "../input/input.js";
import { KeyboardHandler } from "../input/KeyboardHandler.js";
import { MouseHandler } from "../input/MouseHandler.js";
import { TouchHandler } from "../input/TouchHandler.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";

const LB_M = 0b0001;
const RB_M = 0b0010;
const MB_M = 0b0100;

/**
 * Renderer events handler.
 * @class
 * @param {Renderer} renderer - Renderer object, events that works for.
 */
class RendererEvents extends Events {
    constructor(renderer) {
        super(EVENT_NAMES);

        /**
         * Assigned renderer.
         * @public
         * @type {Renderer}
         */
        this.renderer = renderer;

        /**
         * Low level touch events handler.
         * @private
         * @type {input.TouchHandler}
         */
        this._touchHandler = new TouchHandler(renderer.handler.canvas);

        /**
         * Low level mouse events handler.
         * @private
         * @type {input.MouseHandler}
         */
        this._mouseHandler = new MouseHandler(renderer.handler.canvas);

        /**
         * Low level keyboard events handler.
         * @private
         * @type {input.KeyboardHandler}
         */
        this._keyboardHandler = new KeyboardHandler();

        this._active = true;

        this.clickRadius = 15;

        /**
         * Current mouse state.
         * @public
         * @enum {Object}
         */
        this.mouseState = {
            /** Current screen mouse X position. */
            clientX: 0,
            /** Current screen mouse Y position. */
            clientY: 0,
            /** Current viewport mouse X position. */
            x: 0,
            /** Current viewport mouse Y position. */
            y: 0,
            /** Current mouse X position from 0 to 1 */
            nx: 0,
            /** Current mouse Y position from 0 to 1 */
            ny: 0,
            /** Previous mouse X position. */
            prev_x: 0,
            /** Previous mouse Y position. */
            prev_y: 0,
            /** Screen mouse position world direction. */
            direction: new Vec3(),
            /** Left mouse button has stopped pushing down right now.*/
            leftButtonUp: false,
            /** Right mouse button has stopped pushing down right now.*/
            rightButtonUp: false,
            /** Middle mouse button has stopped pushing down right now.*/
            middleButtonUp: false,
            /** Left mouse button has pushed now.*/
            leftButtonDown: false,
            /** Right mouse button has pushed now.*/
            rightButtonDown: false,
            /** Middle mouse button has pushed now.*/
            middleButtonDown: false,
            /** Left mouse button is pushing.*/
            leftButtonHold: false,
            /** Right mouse button is pushing.*/
            rightButtonHold: false,
            /** Middle mouse button is pushing.*/
            middleButtonHold: false,
            /** Left mouse button has clicked twice now.*/
            leftButtonDoubleClick: false,
            /** Right mouse button has clicked twice now.*/
            rightButtonDoubleClick: false,
            /** Middle mouse button has clicked twice now.*/
            middleButtonDoubleClick: false,
            /** Left mouse button has clicked now. */
            leftButtonClick: false,
            /** Right mouse button has clicked now. */
            rightButtonClick: false,
            /** Middle mouse button has clicked now. */
            middleButtonClick: false,
            /** Mouse is moving now. */
            moving: false,
            /** Mouse has just stopped now. */
            justStopped: false,
            /** Mose double click delay response time.*/
            doubleClickDelay: 500,
            /** Mose click delay response time.*/
            clickDelay: 200,
            /** Mouse wheel. */
            wheelDelta: 0,
            /** JavaScript mouse system event message. */
            sys: null,
            /** Current picking object. */
            pickingObject: null,
            /** Renderer instanve. */
            renderer: renderer
        };

        /**
         * Current touch state.
         * @public
         * @enum {Object}
         */
        this.touchState = {
            /** Touching is moving now. */
            moving: false,
            /** Touch has ended right now.*/
            touchEnd: false,
            /** Touch has started right now.*/
            touchStart: false,
            /** Touch canceled.*/
            touchCancel: false,
            /** Touched twice.*/
            doubleTouch: false,
            /** Double touching responce delay.*/
            doubleTouchDelay: 550,
            /** Double touching responce radius in screen pixels.*/
            doubleTouchRadius: 10,
            /** Current touch X - coordinate. */
            x: 0,
            /** Current touch Y - coordinate. */
            y: 0,
            /** Current touch X - coordinate from 0 to 1 */
            nx: 0,
            /** Current touch Y - coordinate from 0 to 1 */
            ny: 0,
            /** Previous touch X coordinate. */
            prev_x: 0,
            /** Previous touch Y coordinate. */
            prev_y: 0,
            /** Screen touch position world direction. */
            direction: new Vec3(),
            /** JavaScript touching system event message. */
            sys: null,
            /** Current touched(picking) object. */
            pickingObject: null,
            /** Renderer instanve. */
            renderer: renderer
        };

        this._dblTchCoords = new Vec2();
        this._oneTouchStart = false;
        this._dblTchBegins = 0;
        /**
         * @type {number}
         */
        this._mousestopThread = null;
        this._ldblClkBegins = 0;
        this._rdblClkBegins = 0;
        this._mdblClkBegins = 0;
        this._lClkBegins = 0;
        this._rClkBegins = 0;
        this._mClkBegins = 0;
        this._lclickX = 0;
        this._lclickY = 0;
        this._rclickX = 0;
        this._rclickY = 0;
        this._mclickX = 0;
        this._mclickY = 0;
    }

    pointerEvent() {
        let ms = this.mouseState,
            ts = this.touchState;
        return (
            ms.moving ||
            ms.justStopped ||
            ms.wheelDelta ||
            ts.moving ||
            ts.touchStart ||
            ts.touchEnd
        )
    }

    get active() {
        return this._active;
    }

    set active(act) {
        this._active = act;
        this._keyboardHandler.setActivity(act);
    }

    /**
     * Used in render node frame.
     * @public
     */
    handleEvents() {
        if (this._active) {
            this.mouseState.direction = this.renderer.activeCamera.unproject(
                this.mouseState.x,
                this.mouseState.y
            );
            //
            // TODO: Replace in some other place with a thought that we do            
            // not need to make unproject when we do not make touching
            this.touchState.direction = this.renderer.activeCamera.unproject(
                this.touchState.x,
                this.touchState.y
            );
            this.entityPickingEvents();
            this._keyboardHandler.handleEvents();
            this.handleMouseEvents();
            this.handleTouchEvents();
        }
    }

    /**
     * Set render event callback.
     * @public
     * @param {string} name - Event name
     * @param {eventCallback} callback - Callback function
     * @param {number} [key] - Key code from og.input
     * @param {*} sender - Callback context
     * @param {number} [priority] - Event callback priority
     */
    on(name, p0, p1, p2, p3) {
        if (name === "keypress" || name === "charkeypress" || name === "keyfree") {
            this._keyboardHandler.addEvent(name, p2, p1, p0, p3);
        } else {
            super.on(name, p0, p1, p2);
        }
    }

    /**
     * TODO: DOESNT WORK!!!
     * @param {any} name
     * @param {any} callback
     */
    off(name, callback) {
        if (name === "keypress" || name === "charkeypress" || name === "keyfree") {
            this._keyboardHandler.removeEvent(name, callback);
        } else {
            super.off(name, callback);
        }
    }

    /**
     * Check key is pressed.
     * @public
     * @param {number} keyCode - Key code
     * @return {boolean}
     */
    isKeyPressed(keyCode) {
        return this._keyboardHandler.isKeyPressed(keyCode);
    }

    releaseKeys() {
        this._keyboardHandler.releaseKeys();
    }

    /**
     * Renderer events initialization.
     * @public
     */
    initialize() {
        this._mouseHandler.setEvent("mouseup", this, this.onMouseUp);
        this._mouseHandler.setEvent("mousemove", this, this.onMouseMove);
        this._mouseHandler.setEvent("mousedown", this, this.onMouseDown);
        this._mouseHandler.setEvent("mousewheel", this, this.onMouseWheel);
        this._mouseHandler.setEvent("mouseleave", this, this.onMouseLeave);
        this._mouseHandler.setEvent("mouseenter", this, this.onMouseEnter);

        this._touchHandler.setEvent("touchstart", this, this.onTouchStart);
        this._touchHandler.setEvent("touchend", this, this.onTouchEnd);
        this._touchHandler.setEvent("touchcancel", this, this.onTouchCancel);
        this._touchHandler.setEvent("touchmove", this, this.onTouchMove);
    }

    /**
     * @private
     */
    onMouseWheel(event) {
        this.mouseState.wheelDelta = event.wheelDelta;
    }

    /**
     * @protected
     */
    updateButtonsStates(buttons) {
        var ms = this.mouseState;
        if (buttons & LB_M) {
            ms.leftButtonDown = true;
        } else {
            ms.leftButtonHold = false;
            ms.leftButtonDown = false;
        }

        if (buttons & RB_M) {
            ms.rightButtonDown = true;
        } else {
            ms.rightButtonHold = false;
            ms.rightButtonDown = false;
        }

        if (buttons & MB_M) {
            ms.middleButtonDown = true;
        } else {
            ms.middleButtonHold = false;
            ms.middleButtonDown = false;
        }
    }

    /**
     * @private
     */
    onMouseMove(event, sys) {
        var ms = this.mouseState;
        this.updateButtonsStates(sys.buttons);
        ms.sys = event;

        let ex = event.clientX,
            ey = event.clientY,
            r = this.clickRadius;

        if (Math.abs(this._lclickX - ex) >= r && Math.abs(this._lclickY - ey) >= r) {
            this._ldblClkBegins = 0;
            this._lClkBegins = 0;
        }

        if (Math.abs(this._rclickX - ex) >= r && Math.abs(this._rclickY - ey) >= r) {
            this._rdblClkBegins = 0;
            this._rClkBegins = 0;
        }

        if (Math.abs(this._mclickX - ex) >= r && Math.abs(this._mclickY - ey) >= r) {
            this._mdblClkBegins = 0;
            this._mClkBegins = 0;
        }

        if (ms.clientX === event.clientX && ms.clientY === event.clientY) {
            return;
        }

        ms.clientX = event.clientX;
        ms.clientY = event.clientY;

        let h = this.renderer.handler;

        ms.x = event.clientX * h.pixelRatio;
        ms.y = event.clientY * h.pixelRatio;

        ms.nx = ms.x / h.canvas.width;
        ms.ny = ms.y / h.canvas.height;

        ms.moving = true;

        //dispatch stop mouse event
        clearTimeout(this._mousestopThread);
        this._mousestopThread = setTimeout(function () {
            ms.justStopped = true;
        }, 100);
    }

    onMouseLeave(event) {
        this.dispatch(this.mouseleave, event);
    }

    onMouseEnter(event) {
        this.dispatch(this.mouseenter, event);
    }

    /**
     * @private
     */
    onMouseDown(event) {
        if (event.button === input.MB_LEFT) {
            this._lClkBegins = window.performance.now();
            this._lclickX = event.clientX;
            this._lclickY = event.clientY;
            this.mouseState.sys = event;
            this.mouseState.leftButtonDown = true;
        } else if (event.button === input.MB_RIGHT) {
            this._rClkBegins = window.performance.now();
            this._rclickX = event.clientX;
            this._rclickY = event.clientY;
            this.mouseState.sys = event;
            this.mouseState.rightButtonDown = true;
        } else if (event.button === input.MB_MIDDLE) {
            this._mClkBegins = window.performance.now();
            this._mclickX = event.clientX;
            this._mclickY = event.clientY;
            this.mouseState.sys = event;
            this.mouseState.middleButtonDown = true;
        }
    }

    /**
     * @private
     */
    onMouseUp(event) {
        var ms = this.mouseState;
        ms.sys = event;
        var t = window.performance.now();

        if (event.button === input.MB_LEFT) {
            ms.leftButtonDown = false;
            ms.leftButtonUp = true;

            if (
                Math.abs(this._lclickX - event.clientX) < this.clickRadius &&
                Math.abs(this._lclickY - event.clientY) < this.clickRadius &&
                t - this._lClkBegins <= ms.clickDelay
            ) {
                if (this._ldblClkBegins) {
                    let deltatime = window.performance.now() - this._ldblClkBegins;
                    if (deltatime <= ms.doubleClickDelay) {
                        ms.leftButtonDoubleClick = true;
                    }
                    this._ldblClkBegins = 0;
                } else {
                    this._ldblClkBegins = window.performance.now();
                }

                ms.leftButtonClick = true;
                this._lClkBegins = 0;
            }
        } else if (event.button === input.MB_RIGHT) {
            ms.rightButtonDown = false;
            ms.rightButtonUp = true;

            if (
                Math.abs(this._rclickX - event.clientX) < this.clickRadius &&
                Math.abs(this._rclickY - event.clientY) < this.clickRadius &&
                t - this._rClkBegins <= ms.clickDelay
            ) {
                if (this._rdblClkBegins) {
                    let deltatime = window.performance.now() - this._rdblClkBegins;
                    if (deltatime <= ms.doubleClickDelay) {
                        ms.rightButtonDoubleClick = true;
                    }
                    this._rdblClkBegins = 0;
                } else {
                    this._rdblClkBegins = window.performance.now();
                }

                ms.rightButtonClick = true;
                this._rClkBegins = 0;
            }
        } else if (event.button === input.MB_MIDDLE) {
            ms.middleButtonDown = false;
            ms.middleButtonUp = true;

            if (
                Math.abs(this._mclickX - event.clientX) < this.clickRadius &&
                Math.abs(this._mclickY - event.clientY) < this.clickRadius &&
                t - this._mClkBegins <= ms.clickDelay
            ) {
                if (this._mdblClkBegins) {
                    var deltatime = window.performance.now() - this._mdblClkBegins;
                    if (deltatime <= ms.doubleClickDelay) {
                        ms.middleButtonDoubleClick = true;
                    }
                    this._mdblClkBegins = 0;
                } else {
                    this._mdblClkBegins = window.performance.now();
                }

                ms.middleButtonClick = true;
                this._mClkBegins = 0;
            }
        }
    }

    /**
     * @private
     */
    onTouchStart(event) {
        var ts = this.touchState;
        ts.sys = event;

        ts.clientX = event.touches.item(0).clientX - event.offsetLeft;
        ts.clientY = event.touches.item(0).clientY - event.offsetTop;

        let h = this.renderer.handler;

        ts.x = ts.clientX * h.pixelRatio;
        ts.y = ts.clientY * h.pixelRatio;

        ts.nx = ts.x / h.canvas.width;
        ts.ny = ts.y / h.canvas.height;
        ts.prev_x = ts.x;
        ts.prev_y = ts.y;
        ts.touchStart = true;

        if (event.touches.length === 1) {
            this._dblTchCoords.x = ts.x;
            this._dblTchCoords.y = ts.y;
            this._oneTouchStart = true;
        } else {
            this._oneTouchStart = false;
        }
    }

    /**
     * @private
     */
    onTouchEnd(event) {
        var ts = this.touchState;
        ts.sys = event;
        ts.touchEnd = true;

        if (event.touches.length === 0) {
            ts.prev_x = ts.x;
            ts.prev_y = ts.y;

            if (this._oneTouchStart) {
                if (this._dblTchBegins) {
                    var deltatime = window.performance.now() - this._dblTchBegins;
                    if (deltatime <= ts.doubleTouchDelay) {
                        ts.doubleTouch = true;
                    }
                    this._dblTchBegins = 0;
                }
                this._dblTchBegins = window.performance.now();
                this._oneTouchStart = false;
            }
        }
    }

    /**
     * @private
     */
    onTouchCancel(event) {
        var ts = this.touchState;
        ts.sys = event;
        ts.touchCancel = true;
    }

    /**
     * @private
     */
    onTouchMove(event) {
        var ts = this.touchState;
        ts.clientX = event.touches.item(0).clientX - event.offsetLeft;
        ts.clientY = event.touches.item(0).clientY - event.offsetTop;

        var h = this.renderer.handler;

        ts.x = ts.clientX * h.pixelRatio;
        ts.y = ts.clientY * h.pixelRatio;

        ts.nx = ts.x / h.canvas.width;
        ts.ny = ts.y / h.canvas.height;

        ts.sys = event;
        ts.moving = true;

        var dX = ts.x - ts.prev_x
        var dY = ts.y - ts.prev_y
        if (Math.abs(dX) > 9 || Math.abs(dY) > 9) {
            this._dblTchBegins = 0;
            this._oneTouchStart = false;
        }
    }

    /**
     * @private
     */
    entityPickingEvents() {
        var ts = this.touchState,
            ms = this.mouseState;

        if (!(ms.leftButtonHold || ms.rightButtonHold || ms.middleButtonHold)) {
            var r = this.renderer;

            var o = r.colorObjects;

            var c = r._currPickingColor,
                p = r._prevPickingColor;

            ms.pickingObject = null;
            ts.pickingObject = null;

            var co = o && o[c[0] + "_" + c[1] + "_" + c[2]];

            ms.pickingObject = co;
            ts.pickingObject = co;

            //object changed
            if (c[0] != p[0] || c[1] != p[1] || c[2] != p[2]) {
                //current black
                if (!(c[0] || c[1] || c[2])) {
                    let po = o[p[0] + "_" + p[1] + "_" + p[2]];
                    if (po) {
                        let pe = po.rendererEvents;
                        ms.pickingObject = po;
                        pe && pe.dispatch(pe.mouseleave, ms);
                        ts.pickingObject = po;
                        pe && pe.dispatch(pe.touchleave, ts);
                    }
                } else {
                    //current not black

                    //previous not black
                    if (p[0] || p[1] || p[2]) {
                        let po = o[p[0] + "_" + p[1] + "_" + p[2]];
                        if (po) {
                            let pe = po.rendererEvents;
                            ms.pickingObject = po;
                            pe && pe.dispatch(pe.mouseleave, ms);
                            ts.pickingObject = po;
                            pe && pe.dispatch(pe.touchleave, ts);
                        }
                    }

                    if (co) {
                        var ce = co.rendererEvents;
                        ms.pickingObject = co;
                        ce && ce.dispatch(ce.mouseenter, ms);
                        ts.pickingObject = co;
                        ce && ce.dispatch(ce.touchenter, ts);
                    }
                }
            }
        }
    }

    /**
     * @private
     */
    handleMouseEvents() {
        let ms = this.mouseState;
        let po = ms.pickingObject,
            pe = null;

        if (ms.leftButtonClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.lclick, ms);
            }
            this.dispatch(this.lclick, ms);
            ms.leftButtonClick = false;
        }

        if (ms.rightButtonClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.rclick, ms);
            }
            this.dispatch(this.rclick, ms);
            ms.rightButtonClick = false;
        }

        if (ms.middleButtonClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.mclick, ms);
            }
            this.dispatch(this.mclick, ms);
            ms.middleButtonClick = false;
        }

        if (ms.leftButtonDown) {
            if (ms.leftButtonHold) {
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.lhold, ms);
                }
                this.dispatch(this.lhold, ms);
            } else {
                ms.leftButtonHold = true;
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.ldown, ms);
                }
                this.dispatch(this.ldown, ms);
            }
        }

        if (ms.rightButtonDown) {
            if (ms.rightButtonHold) {
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.rhold, ms);
                }
                this.dispatch(this.rhold, ms);
            } else {
                ms.rightButtonHold = true;
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.rdown, ms);
                }
                this.dispatch(this.rdown, ms);
            }
        }

        if (ms.middleButtonDown) {
            if (ms.middleButtonHold) {
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.mhold, ms);
                }
                this.dispatch(this.mhold, ms);
            } else {
                ms.middleButtonHold = true;
                if (po) {
                    pe = po.rendererEvents;
                    pe && pe.dispatch(pe.mdown, ms);
                }
                this.dispatch(this.mdown, ms);
            }
        }

        if (ms.leftButtonUp) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.lup, ms);
            }
            this.dispatch(this.lup, ms);
            ms.leftButtonUp = false;
            ms.leftButtonHold = false;
        }

        if (ms.rightButtonUp) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.rup, ms);
            }
            this.dispatch(this.rup, ms);
            ms.rightButtonUp = false;
            ms.rightButtonHold = false;
        }

        if (ms.middleButtonUp) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.mup, ms);
            }
            this.dispatch(this.mup, ms);
            ms.middleButtonUp = false;
            ms.middleButtonHold = false;
        }

        if (ms.leftButtonDoubleClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.ldblclick, ms);
            }
            this.dispatch(this.ldblclick, ms);
            ms.leftButtonDoubleClick = false;
        }

        if (ms.rightButtonDoubleClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.rdblclick, ms);
            }
            this.dispatch(this.rdblclick, ms);
            ms.rightButtonDoubleClick = false;
        }

        if (ms.middleButtonDoubleClick) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.mdblclick, ms);
            }
            this.dispatch(this.mdblclick, ms);
            ms.middleButtonDoubleClick = false;
        }

        if (ms.wheelDelta) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.mousewheel, ms);
            }
            this.dispatch(this.mousewheel, ms);
        }

        if (ms.moving) {
            if (po) {
                pe = po.rendererEvents;
                pe && pe.dispatch(pe.mousemove, ms);
            }
            this.dispatch(this.mousemove, ms);
            ms.prev_x = ms.x;
            ms.prev_y = ms.y;
        }

        if (ms.justStopped) {
            this.dispatch(this.mousestop, ms);
        }
    }

    /**
     * @private
     */
    handleTouchEvents() {
        var ts = this.touchState;

        var tpo = ts.pickingObject,
            tpe = null;

        if (ts.touchCancel) {
            this.dispatch(this.touchcancel, ts);
            ts.touchCancel = false;
        }

        if (ts.touchStart) {
            var r = this.renderer;

            r.pickingFramebuffer.activate();
            r.pickingFramebuffer.readPixels(r._currPickingColor, ts.nx, 1.0 - ts.ny, 1);
            r.pickingFramebuffer.deactivate();

            var o = r.colorObjects;
            var c = r._currPickingColor;
            var co = o[c[0] + "_" + c[1] + "_" + c[2]];
            tpo = ts.pickingObject = co;
            if (tpo) {
                tpe = tpo.rendererEvents;
                tpe && tpe.dispatch(tpe.touchstart, ts);
            }
            this.dispatch(this.touchstart, ts);
            ts.touchStart = false;
        }

        if (ts.doubleTouch) {
            if (tpo) {
                tpe = tpo.rendererEvents;
                tpe && tpe.dispatch(tpe.doubletouch, ts);
            }
            this.dispatch(this.doubletouch, ts);
            ts.doubleTouch = false;
        }

        if (ts.touchEnd) {
            if (tpo) {
                tpe = tpo.rendererEvents;
                tpe && tpe.dispatch(tpe.touchend, ts);
            }
            this.dispatch(this.touchend, ts);
            ts.x = 0;
            ts.y = 0;
            ts.touchEnd = false;
        }

        if (ts.moving) {
            if (tpo) {
                tpe = tpo.rendererEvents;
                tpe && tpe.dispatch(tpe.touchmove, ts);
            }
            this.dispatch(this.touchmove, ts);
            ts.prev_x = ts.x;
            ts.prev_y = ts.y;
        }
    }
}

const EVENT_NAMES = [
    /**
     * Triggered before scene frame is rendered(before render nodes).
     * @event og.RendererEvents#draw
     */
    "draw",

    /**
     * Triggered after scene frame is rendered(after render nodes).
     * @event og.RendererEvents#postdraw
     */
    "postdraw",

    /**
     * Triggered when screen is resized.
     * @event og.RendererEvents#resize
     */
    "resize",

    /**
     * Triggered when screen is resized.
     * @event og.RendererEvents#resizeend
     */
    "resizeend",

    /**
     * Mouse enters the work screen
     * @event og.RendererEvents#mouseenter
     */
    "mouseenter",

    /**
     * Mouse leaves the work screen
     * @event og.RendererEvents#mouseleave
     */
    "mouseleave",

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
     * @event og.RendererEvents#lclick
     */
    "lclick",

    /**
     * Mouse right button clicked.
     * @event og.RendererEvents#rclick
     */
    "rclick",

    /**
     * Mouse middle button clicked.
     * @event og.RendererEvents#mclick
     */
    "mclick",

    /**
     * Mouse left button double click.
     * @event og.RendererEvents#ldblclick
     */
    "ldblclick",

    /**
     * Mouse right button double click.
     * @event og.RendererEvents#rdblclick
     */
    "rdblclick",

    /**
     * Mouse middle button double click.
     * @event og.RendererEvents#mdblclick
     */
    "mdblclick",

    /**
     * Mouse left button up(stop pressing).
     * @event og.RendererEvents#lup
     */
    "lup",

    /**
     * Mouse right button up(stop pressing).
     * @event og.RendererEvents#rup
     */
    "rup",

    /**
     * Mouse middle button up(stop pressing).
     * @event og.RendererEvents#mup
     */
    "mup",

    /**
     * Mouse left button is just pressed down(start pressing).
     * @event og.RendererEvents#ldown
     */
    "ldown",

    /**
     * Mouse right button is just pressed down(start pressing).
     * @event og.RendererEvents#rdown
     */
    "rdown",

    /**
     * Mouse middle button is just pressed down(start pressing).
     * @event og.RendererEvents#mdown
     */
    "mdown",

    /**
     * Mouse left button is pressing.
     * @event og.RendererEvents#lhold
     */
    "lhold",

    /**
     * Mouse right button is pressing.
     * @event og.RendererEvents#rhold
     */
    "rhold",

    /**
     * Mouse middle button is pressing.
     * @event og.RendererEvents#mhold
     */
    "mhold",

    /**
     * Mouse wheel is rotated.
     * @event og.RendererEvents#mousewheel
     */
    "mousewheel",

    /**
     * Triggered when touching starts.
     * @event og.RendererEvents#touchstart
     */
    "touchstart",

    /**
     * Triggered when touching ends.
     * @event og.RendererEvents#touchend
     */
    "touchend",

    /**
     * Triggered when touching cancel.
     * @event og.RendererEvents#touchcancel
     */
    "touchcancel",

    /**
     * Triggered when touch is move.
     * @event og.RendererEvents#touchmove
     */
    "touchmove",

    /**
     * Triggered when double touch.
     * @event og.RendererEvents#doubletouch
     */
    "doubletouch",

    /**
     * Triggered when touch leaves picked object.
     * @event og.RendererEvents#touchleave
     */
    "touchleave",

    /**
     * Triggered when touch enter picking object.
     * @event og.RendererEvents#touchenter
     */
    "touchenter"
];

export { RendererEvents };
