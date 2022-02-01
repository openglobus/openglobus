'use strict';

import { Program } from '../../src/og/webgl/Program.js';
import { RenderNode } from '../../src/og/scene/RenderNode.js';
import { Vec3 } from '../../src/og/math/Vec3.js';
import { Line3 } from '../../src/og/math/Line3.js';

class Strip extends RenderNode {
    constructor(options) {

        options = options || {};

        super("strip-node-" + Strip._staticCounter++);

        this._renderNode = null;

        this._verticesBuffer = null;
        this._indexesBuffer = [];
        this._vertices = [];
        this._indexes = [];
        this._path = [];

        this._gridSize = 16;

        this.color = new Float32Array([1.0, 1.0, 1.0, 0.5]);

        if (options.color) {
            this.setColor(options.color[0], options.color[1], options.color[2], options.color[3]);
        }

        if (options.opacity) {
            this.setOpacity(options.opacity);
        }
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

    setColor(r, g, b, a) {
        a = a || this.color[3];
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
        this.color[3] = a;
    }

    setOpacity(opacity = 0) {
        this.color[3] = opacity;
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

    }

    _createBuffers() {
        this._verticesBuffer = this.renderer.handler.createArrayBuffer(new Float32Array(this._vertices), 3, this._vertices.length / 3);
        this._indexBuffer = this.renderer.handler.createElementArrayBuffer(new Uint16Array(this._indexes), 1, this._indexes.length);
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

            let last = this._vertices.length / 3,
                ind = last;

            for (let i = 0; i < gs1; i++) {
                for (let j = 0; j < gs1; j++) {

                    let di = i / gs,
                        dj = j / gs;

                    let p02 = p0.lerp(p2, di),
                        p13 = p1.lerp(p3, di),
                        p01 = p0.lerp(p1, dj),
                        p23 = p2.lerp(p3, dj);

                    (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                    ind = last + i * gs1 + j;

                    v[ind * 3] = p.x;
                    v[ind * 3 + 1] = p.y;
                    v[ind * 3 + 2] = p.z;

                    if (i < gs) {
                        this._indexes.push(ind, ind + gs1);
                    }
                }

                if (i < gs) {
                    this._indexes.push(ind + gs1, ind + 1);
                }
            }

            this._createBuffers();
        }
    }

    setEdge(p2, p3, index) {

        if (index === this._path.length) {
            this.addEdge(p2, p3);
            return;
        }

        this._path[index][0] = p2;
        this._path[index][1] = p3;

        if (this._path.length > 1) {

            let gs = this._gridSize,
                gs1 = gs + 1;

            let vSize = gs1 * gs1;

            let p = new Vec3(),
                v = this._vertices;

            if (index === this._path.length - 1) {

                let p0 = this._path[index - 1][0],
                    p1 = this._path[index - 1][1];

                let prev = this._vertices.length / 3 - vSize,
                    ind = prev;

                for (let i = 0; i < gs1; i++) {
                    for (let j = 0; j < gs1; j++) {

                        let di = i / gs,
                            dj = j / gs;

                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di),
                            p01 = p0.lerp(p1, dj),
                            p23 = p2.lerp(p3, dj);

                        (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                        ind = prev + i * gs1 + j;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;
                    }
                }

            } else if (index === 0) {

                let ind = 0;

                let p0 = p2,
                    p1 = p3;

                p2 = this._path[1][0];
                p3 = this._path[1][1];

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
                    }
                }
            } else if (index > 0 && index < this._path.length) {

                let p0 = this._path[index - 1][0],
                    p1 = this._path[index - 1][1];

                let p4 = this._path[index + 1][0],
                    p5 = this._path[index + 1][1];

                let next = index * vSize,
                    prev = (index - 1) * vSize,
                    ind = prev;

                for (let i = 0; i < gs1; i++) {
                    for (let j = 0; j < gs1; j++) {

                        let di = i / gs,
                            dj = j / gs;

                        //prev
                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di),
                            p01 = p0.lerp(p1, dj),
                            p23 = p2.lerp(p3, dj);

                        (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                        let ij = i * gs1 + j;

                        ind = prev + ij;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;

                        //next
                        let p24 = p2.lerp(p4, di),
                            p35 = p3.lerp(p5, di),
                            p45 = p4.lerp(p5, dj);
                        p23 = p2.lerp(p3, dj);

                        (new Line3(p24, p35)).intersects(new Line3(p23, p45), p);

                        ind = next + ij;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;
                    }
                }
            }

            this._createBuffers();
        }
    }

    removeEdge(index) {
        this._path.splice(index, 1);
        this.setPath([].concat(this._path));
    }

    setGridSize(gridSize) {
        this._gridSize = gridSize;
        this.setPath([].concat(this._path));
    }

    setPath(path) {
        this._vertices = [];
        this._indexes = [];
        this._path = [];
        for (let i = 0; i < path.length; i++) {
            this.addEdge(path[i][0], path[i][1]);
        }
    }

    onremove() {
        this.renderer.handler.gl.deleteBuffer(this._indexBuffer);
        this.renderer.handler.gl.deleteBuffer(this._verticesBuffer);
        this._verticesBuffer = null;
        this._indexBuffer = null;
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
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            sh.activate();
            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);
            gl.uniform4fv(shu.uColor, this.color);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            gl.enable(gl.CULL_FACE);
        }
    }
}

export { Strip };