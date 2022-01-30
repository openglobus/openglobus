/**
 * @module og/entity/ShapeHandler
 */

'use strict';

import * as shaders from '../shaders/shape.js';

class ShapeHandler {
    constructor(entityCollection) {

        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._shapes = [];

        this.__staticId = ShapeHandler._staticCounter++;
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    _initProgram() {
        if (this._renderer.handler) {
            if (!this._renderer.handler.programs.shape_nl) {
                this._renderer.handler.addProgram(shaders.shape_nl());
            }
            if (!this._renderer.handler.programs.shape_wl) {
                this._renderer.handler.addProgram(shaders.shape_wl());
            }
            if (!this._renderer.handler.programs.shape_picking) {
                this._renderer.handler.addProgram(shaders.shape_picking());
            }
        }
    }

    setRenderNode(renderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (var i = 0; i < this._shapes.length; i++) {
            this._shapes[i].setRenderNode(renderNode);
        }
    }

    add(shape) {
        if (shape._handlerIndex == -1) {
            shape._handler = this;
            shape._handlerIndex = this._shapes.length;
            this._shapes.push(shape);
            this._entityCollection && this._entityCollection.renderNode && shape.setRenderNode(this._entityCollection.renderNode);
        }
    }

    remove(shape) {
        // TODO
    }

    draw() {
        var i = this._shapes.length;
        while (i--) {
            this._shapes[i].draw();
        }
    }

    drawPicking() {
        var i = this._shapes.length;
        while (i--) {
            this._shapes[i].drawPicking();
        }
    }

    clear() {
        for (let i = 0, len = this._shapes.length; i < len; i++) {
            var ri = this._shapes[i];
            ri._handlerIndex = -1;
            ri._handler = null;
        }
        this._shapes.length = 0;
        this._shapes = [];
    }
}

export { ShapeHandler };