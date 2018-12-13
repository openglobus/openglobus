'use strict';

import { Program } from '../../src/og/webgl/Program.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Line3 } from '../../src/og/math/Line3.js';

class Strip extends RenderNode {
    constructor(options) {

        super("strip-node-" + Strip._staticCounter++);

        //this._positionData = [];
        //this._positionBuffer = null;
        this._renderNode = null;

        this._verticesBuffer = null;
        this._indexesBuffer = [];
        this._vertices = [];
        this._indexes = [];
        this._path = [];

        this._gridSize = 4;

        this.color = new Float32Array([1.0, 1.0, 1.0, 0.5]);
    }

    static get _staticCounter() {
        if (!this.__counter__ && this.__counter__ !== 0) {
            this.__counter__ = 0;
        }
        return this.__counter__;
    }

    static set _staticCounter(n) {
        this.__counter__ = n;
    }

    setVisibility(visibility) {
        this.setActive(visibility);
    }

    init() {

        !this.renderer.handler.programs.strip &&
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

        //this._createBuffers();
    }

    _createBuffers() {

        //var h = this.renderer.handler;
        //var gl = h.gl;

        //gl.deleteBuffer(this._positionBuffer);

        //if (this._positionData.length) {
        //    this._positionBuffer = h.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
        //}
    }

    addEdge(p2, p3) {
        let length = this._path.length;

        if (length === 0) {

            this._path.push([p2, p3]);

        } else {

            let p0 = this._path[length - 1][0],
                p1 = this._path[length - 1][1];

            this._path.push([p2, p3]);

            let v = this._vertices;

            let gs = this._gridSize,
                gs1 = gs + 1;

            let p = new Vec3();

            let ind = 0;

            for (let i = 0; i < gs1; i++) {
                for (let j = 0; j < gs1; j++) {

                    let di = i / gs,
                        dj = j / gs;

                    let p02 = p0.lerp(p2, di),
                        p13 = p1.lerp(p3, di),
                        p01 = p0.lerp(p1, dj),
                        p23 = p2.lerp(p3, dj);

                    (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                    ind = i * gs1 + j;

                    v[ind * 3] = p.x;
                    v[ind * 3 + 1] = p.y;
                    v[ind * 3 + 2] = p.z;

                    if (i < gs) {
                        this._indexes.push(ind, ind + gs1);
                    }
                }

                if (i < gs) {
                    this._indexes.push(ind + gs1, ind + gs1, ind + 1, ind + 1);
                }
            }

            this._verticesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(this._vertices), 3, this._vertices.length / 3);
            this._indexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(this._indexes), 1, this._indexes.length);
        }
    }

    setEdgeCoordinates3v(p0, p1, index) {
        //let ind0 = index * 3 * 2,
        //    a = this._positionData;

        //a[ind0] = p0.x;
        //a[ind0 + 1] = p0.y;
        //a[ind0 + 2] = p0.z;

        //a[ind0 + 3] = p1.x;
        //a[ind0 + 4] = p1.y;
        //a[ind0 + 5] = p1.z;

        //this._createBuffers();
    }

    removeEdge(index) {
        //let ind0 = index * 3 * 2;
        //this._positionData.splice(ind0, 6);
        //this._createBuffers();
    }

    setCoordinates(vertArr) {
        //this._positionData = vertArr;
        //this._createBuffers();
    }

    onremove() {
        //this.renderer.handler.gl.deleteBuffer(this._positionBuffer);
        //this._positionBuffer = null;
    }

    frame() {
        if (this._verticesBuffer) {
            var r = this.renderer;

            var gl = r.handler.gl;

            var sh = r.handler.programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            gl.disable(gl.CULL_FACE);
            gl.enable(gl.BLEND);

            sh.activate();

            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);

            gl.uniform4fv(shu.uColor, this.color);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            //gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            gl.drawElements(r.handler.gl.LINE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

            gl.enable(gl.CULL_FACE);
        }
    }
}

export { Strip };