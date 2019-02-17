'use strict';

import { Program } from '../webgl/Program.js';

class StripHandler {
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
         * @type {og.EntityCollection}
         */
        this._entityCollection = entityCollection;

        /**
         * Renderer
         * @private
         * @type {og.Renderer}
         */
        this._renderer = null;

        /**
         * Point cloud array
         * @private
         * @type {Array.<og.Strip>}
         */
        this._strips = [];

        this.__staticId = StripHandler._staticCounter++;
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
            !this._renderer.handler.programs.strip &&
                this._renderer.handler.addProgram(new Program("strip", {
                    uniforms: {
                        projectionViewMatrix: { type: 'mat4' },
                        uColor: { type: 'vec4' }
                    },
                    attributes: {
                        aVertexPosition: { type: 'vec3' }
                    },
                    vertexShader:
                        `attribute vec3 aVertexPosition;
                        uniform mat4 projectionViewMatrix;
                        const float C = 0.1;
                        const float far = 149.6e+9;
                        float logc = 2.0 / log( C * far + 1.0 );
                        void main(void) {
                            gl_Position = projectionViewMatrix  * vec4(aVertexPosition, 1.0);
                            gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                        }`,
                    fragmentShader:
                        `precision highp float;
                        uniform vec4 uColor;
                        void main(void) {
                            gl_FragColor = vec4(uColor);
                        }`
                }));
        }
    }

    setRenderNode(renderNode) {
        this._renderer = renderNode.renderer;
        this._initProgram()
        for (var i = 0; i < this._strips.length; i++) {
            this._strips[i].setRenderNode(renderNode);
        }
    }

    add(strip) {
        if (strip._handlerIndex === -1) {
            strip._handler = this;
            strip._handlerIndex = this._strips.length;
            this._strips.push(strip);
            this._entityCollection && this._entityCollection.renderNode &&
                strip.setRenderNode(this._entityCollection.renderNode);
        }
    }

    remove(strip) {
        var index = strip._handlerIndex;
        if (index !== -1) {
            strip._deleteBuffers();
            strip._handlerIndex = -1;
            strip._handler = null;
            this._strips.splice(index, 1);
            this.reindexStripArray(index);
        }
    }

    reindexStripArray(startIndex) {
        var pc = this._strips;
        for (var i = startIndex; i < pc.length; i++) {
            pc[i]._handlerIndex = i;
        }
    }

    draw() {
        var i = this._strips.length;
        while (i--) {
            this._strips[i].draw();
        }
    }

    drawPicking() {
        if (this.pickingEnabled) {
            var i = this._strips.length;
            while (i--) {
                this._strips[i].drawPicking();
            }
        }
    }

    clear() {
        var i = this._strips.length;
        while (i--) {
            this._strips[i]._deleteBuffers();
            this._strips[i]._handler = null;
            this._strips[i]._handlerIndex = -1;
        }
        this._strips.length = 0;
        this._strips = [];
    }
};

export { StripHandler };