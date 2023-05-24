'use strict';

import * as shaders from '../shaders/polyline.js';

class PolylineHandler {
    constructor(entityCollection) {

        this._entityCollection = entityCollection;

        this._renderer = null;

        this._polylines = [];

        this.__staticId = PolylineHandler._staticCounter++;

        this.pickingEnabled = true;
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
            if (!this._renderer.handler.programs.polyline_screen) {
                this._renderer.handler.addProgram(shaders.polyline_screen());
            }
            if (!this._renderer.handler.programs.polyline_picking) {
                this._renderer.handler.addProgram(shaders.polyline_picking());
            }
        }
    }

    setRenderNode(renderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (var i = 0; i < this._polylines.length; i++) {
            this._polylines[i].setRenderNode(renderNode);
        }
    }

    add(polyline) {
        if (polyline._handlerIndex === -1) {
            polyline._handler = this;
            polyline._handlerIndex = this._polylines.length;
            this._polylines.push(polyline);
            this._entityCollection && this._entityCollection.renderNode &&
                polyline.setRenderNode(this._entityCollection.renderNode);
        }
    }

    remove(polyline) {
        var index = polyline._handlerIndex;
        if (index !== -1) {
            polyline._deleteBuffers();
            polyline._handlerIndex = -1;
            polyline._handler = null;
            this._polylines.splice(index, 1);
            this.reindexPolylineArray(index);
        }
    }

    reindexPolylineArray(startIndex) {
        var ls = this._polylines;
        for (var i = startIndex; i < ls.length; i++) {
            ls[i]._handlerIndex = i;
        }
    }

    draw() {
        let i = this._polylines.length;
        while (i--) {
            this._polylines[i].draw();
        }
    }

    drawPicking() {
        if (this.pickingEnabled) {
            let i = this._polylines.length;
            while (i--) {
                this._polylines[i].drawPicking();
            }
        }
    }

    clear() {
        var i = this._polylines.length;
        while (i--) {
            this._polylines[i]._deleteBuffers();
            this._polylines[i]._handler = null;
            this._polylines[i]._handlerIndex = -1;
        }
        this._polylines.length = 0;
        this._polylines = [];
    }
}

export { PolylineHandler };