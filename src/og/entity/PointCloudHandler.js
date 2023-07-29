"use strict";

import * as shaders from "../shaders/pointCloud.js";

class PointCloudHandler {
    constructor(entityCollection) {
        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        /**
         * Parent collection
         * @private
         * @type {EntityCollection}
         */
        this._entityCollection = entityCollection;

        /**
         * Renderer
         * @private
         * @type {Renderer}
         */
        this._renderer = null;

        /**
         * Point cloud array
         * @private
         * @type {Array.<PointCloud>}
         */
        this._pointClouds = [];

        this.__staticId = PointCloudHandler._staticCounter++;
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
            if (!this._renderer.handler.programs.pointCloud) {
                this._renderer.handler.addProgram(shaders.pointCloud());
            }
        }
    }

    setRenderNode(renderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram();
        for (let i = 0; i < this._pointClouds.length; i++) {
            this._pointClouds[i].setRenderNode(renderNode);
        }
    }

    add(pointCloud) {
        if (pointCloud._handlerIndex === -1) {
            pointCloud._handler = this;
            pointCloud._handlerIndex = this._pointClouds.length;
            this._pointClouds.push(pointCloud);
            this._entityCollection &&
                this._entityCollection.renderNode &&
                pointCloud.setRenderNode(this._entityCollection.renderNode);
        }
    }

    remove(pointCloud) {
        var index = pointCloud._handlerIndex;
        if (index !== -1) {
            pointCloud._deleteBuffers();
            pointCloud._handlerIndex = -1;
            pointCloud._handler = null;
            this._pointClouds.splice(index, 1);
            this.reindexPointCloudArray(index);
        }
    }

    reindexPointCloudArray(startIndex) {
        var pc = this._pointClouds;
        for (let i = startIndex; i < pc.length; i++) {
            pc[i]._handlerIndex = i;
        }
    }

    draw() {
        var i = this._pointClouds.length;
        while (i--) {
            this._pointClouds[i].draw();
        }
    }

    drawPicking() {
        if (this.pickingEnabled) {
            var i = this._pointClouds.length;
            while (i--) {
                this._pointClouds[i].drawPicking();
            }
        }
    }

    clear() {
        var i = this._pointClouds.length;
        while (i--) {
            this._pointClouds[i]._deleteBuffers();
            this._pointClouds[i]._handler = null;
            this._pointClouds[i]._handlerIndex = -1;
        }
        this._pointClouds.length = 0;
        this._pointClouds = [];
    }
}

export { PointCloudHandler };
