'use strict';

import { Program } from '../../src/og/webgl/Program.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';

class Strip extends RenderNode {
    constructor(options) {

        super("Strip");

        this._positionData = [];
        this._positionBuffer = null;
        this._renderNode = null;

        this.color = new Float32Array([1.0, 1.0, 1.0, 0.5]);
    }

    initialization() {

        this.renderer.handler.addProgram(new Program("strip", {
            uniforms: {
                projectionViewMatrix: { type: 'mat4' },
                uColor: { type: 'vec4' }
            },
            attributes: {
                aVertexPosition: { type: 'vec3' }
            },
            vertexShader:
                'attribute vec3 aVertexPosition;\n\
                uniform mat4 projectionViewMatrix;\n\
                const float C = 0.1;\n\
                const float far = 149.6e+9;\n\
                float logc = 2.0 / log( C * far + 1.0 );\n\
                void main(void) {\n\
                    gl_Position = projectionViewMatrix  * vec4(aVertexPosition, 1.0);\n\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\n\
                }',
            fragmentShader:
                'precision highp float;\n\
                uniform vec4 uColor;\n\
                void main(void) {\n\
                    gl_FragColor = vec4(uColor);\n\
                }'
        }));

        this._createBuffers();
    }

    _createBuffers() {
        var h = this.renderer.handler;
        var gl = h.gl;
        gl.deleteBuffer(this._positionBuffer);
        this._positionBuffer = h.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
    }

    setCoordinates(vertArr) {
        this._positionData = vertArr;
        this._createBuffers();
    }

    frame() {
        if (this._positionBuffer.numItems > 0) {

            var r = this.renderer;

            var gl = r.handler.gl;

            var sh = r.handler.Programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            gl.disable(gl.CULL_FACE);
            gl.enable(gl.BLEND);

            sh.activate();

            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);

            gl.uniform4fv(shu.uColor, this.color);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.drawArrays(r.handler.gl.TRIANGLE_STRIP, 0, this._positionBuffer.numItems);

            gl.enable(gl.CULL_FACE);
        }
    }
}

export { Strip };