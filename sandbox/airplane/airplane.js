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
import { Quat } from '../../src/og/math/Quat.js';

class Airplane extends RenderNode {
    constructor(options) {
        super("airplane");

        options = options || {};

        this.position = options.position || new Vec3();
        this.orientation = options.orientation || new Quat(0.0, 0.0, 0.0, 1.0);
        this.scale = options.scale || new Vec3(1.0, 1.0, 1.0);
        this._mxScale = new Mat4().setIdentity();
        this._mxTranslation = new Mat4().setIdentity();
        this._mxModel = new Mat4().setIdentity();

        this.vericesBuffer = null;
        this.indicesBuffer = null;
    }

    refresh() {
        this._mxModel = this._mxTranslation.mul(this.orientation.getMatrix4().mul(this._mxScale));
    }

    setPosition3v(position) {
        this.position.copy(position);
        this._mxTranslation.translateToPosition(position);
        this.refresh();
    }

    translate3v(vec) {
        this.position.addA(vec);
        this._mxTranslation.translate(vec);
    }

    setScale3v(scale) {
        this.scale.copy(scale);
        this._mxScale.scale(scale);
    }

    initialization() {

        //Initialize shader program
        this.renderer.handler.addProgram(new Program("AirplaneShader", {
            uniforms: {
                projectionViewMatrix: { type: 'mat4' },
                modelMatrix: { type: 'mat4' }
            },
            attributes: {
                aVertexPosition: 'vec3'
            },
            vertexShader:
                'attribute vec3 aVertexPosition;\
                \
                uniform mat4 projectionViewMatrix;\
                uniform mat4 modelMatrix;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                void main(void) {\
                    gl_Position = projectionViewMatrix * (modelMatrix * vec4(aVertexPosition, 1.0));\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
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
            -1.0, 0.0, 0.5,
            0.0, 0.0, -0.5,
            1.0, 0.0, 0.5
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

        gl.uniformMatrix4fv(p.uniforms.modelMatrix, false, this._mxModel._m);

        gl.uniformMatrix4fv(p.uniforms.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);

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
