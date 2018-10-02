/**
 * @module og/scene/Axes
 */

'use strict';

import { RenderNode } from './RenderNode.js';
import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';

class Axes extends RenderNode {
    constructor(size) {
        super("Axes");

        this.size = size || 100;
        this.axesBuffer = null;
        this.axesColorBuffer = null;
    }

    initialization() {
        this.createAxisBuffer(this.size);
        this.drawMode = this.renderer.handler.gl.LINES;
        this.renderer.handler.addProgram(new Program("axesShader", {
            uniforms: {
                projectionViewMatrix: 'mat4'
            },
            attributes: {
                aVertexPosition: 'vec3',
                aVertexColor: 'vec4'
            },
            vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec4 aVertexColor;\
            uniform mat4 projectionViewMatrix;\
            varying vec4 vColor;\
            void main(void) {\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition, 1.0);\
                vColor = aVertexColor;\
            }',
            fragmentShader:
            'precision highp float;\
            varying vec4 vColor;\
            void main(void) {\
                gl_FragColor = vColor;\
            }'
        }));
    }

    frame() {

        this.renderer.handler.programs.axesShader.activate().set({
            projectionViewMatrix: this.renderer.activeCamera._projectionViewMatrix._m,
            aVertexPosition: this.axisBuffer,
            aVertexColor: this.axisColorBuffer
        });

        this.renderer.handler.programs.axesShader.drawArrays(this.drawMode, this.axisBuffer.numItems);
    }

    createAxisBuffer(gridSize) {

        var vertices = [
            0.0, 0.0, 0.0, gridSize - 1, 0.0, 0.0, // x - R
            0.0, 0.0, 0.0, 0.0, gridSize - 1, 0.0, // y - B  
            0.0, 0.0, 0.0, 0.0, 0.0, gridSize - 1  // z - G
        ];

        var colors = [
            1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,   // x - R
            0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,   // y - B
            0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0    // z - G
        ];

        this.axisBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, 6);
        this.axisColorBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(colors), 4, 6);
    }
};

export { Axes };