'use strict';

import * as math from '../../src/og/math.js';
import { Handler } from '../../src/og/webgl/Handler.js';
import { Renderer } from '../../src/og/renderer/Renderer.js';
import { SimpleNavigation } from '../../src/og/control/SimpleNavigation.js';
import { Axes } from '../../src/og/scene/Axes.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Program } from '../../src/og/webgl/Program.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Mat4 } from '../../src/og/math/Mat4.js';


class Airplane extends RenderNode {
    constructor() {
        super("airplane");

        this._grad = 0;

        this.vericesBuffer = null;
        this.indicesBuffer = null;
    }

    initialization() {

        //Initialize shader program
        this.renderer.handler.addProgram(new Program("AirplaneShader", {
            uniforms: {
                uMVMatrix: 'mat4',
                uPMatrix: 'mat4'
            },
            attributes: {
                aVertexPosition: 'vec3'
            },
            vertexShader:
                'attribute vec3 aVertexPosition;\
                \
                uniform mat4 uMVMatrix;\
                uniform mat4 uPMatrix;\
                \
                void main(void) {\
                    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
                }'
            ,
            fragmentShader:
                'precision mediump float;\
                \
                void main(void) {\
                    gl_FragColor = vec4(1.0);\
                }'
        }));

        //Create buffers
        var vertices = [
            -1.0, 0.0, -0.5,
            0.0, 0.0, 0.5,
            1.0, 0.0, -0.5
        ];

        this.vericesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(vertices), 3, vertices.length / 3);

        var cubeVertexIndices = [
            0, 1, 2,
            0, 2, 1
        ];

        this.indicesBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(cubeVertexIndices), 1, cubeVertexIndices.length);

    }

    frame() {

        var r = this.renderer;
        var sh = r.handler.programs.AirplaneShader;
        var p = sh._program;
        var gl = r.handler.gl;

        sh.activate();

        //Cube rotation
        var gradRad = this._grad * math.RADIANS;
        var rotate = Mat4.identity()
            .rotate(new Vec3(0, 1, 0), gradRad)
            .rotate(new Vec3(1, 0, 0), gradRad);
        this._grad++;

        var modelViewMat = r.activeCamera._viewMatrix.mul(rotate);

        gl.uniformMatrix4fv(p.uniforms.uMVMatrix, false, modelViewMat._m);
        gl.uniformMatrix4fv(p.uniforms.uPMatrix, false, r.activeCamera._projectionMatrix._m);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vericesBuffer);
        gl.vertexAttribPointer(p.attributes.aVertexPosition, this.vericesBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
        gl.drawElements(gl.TRIANGLES, this.indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

let handler = new Handler("frame");

let renderer = new Renderer(handler, {
    'controls': [new SimpleNavigation()]
});

let airplane = new Airplane();

renderer.addRenderNodes([airplane, new Axes()]);

window.renderer = renderer;
window.airplane = airplane;
