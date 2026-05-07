/*
 * Copyright 2026 Michael Gevlich
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as quadTree from "../quadTree/quadTree";
import { Framebuffer } from "../webgl/Framebuffer";
import { Lock, Key } from "../Lock";
import { Planet } from "../scene/Planet";
import { ShaderProgram } from "../webgl/ShaderProgram";
import { QueueArray } from "../QueueArray";
import { Segment } from "../segment/Segment";
import { Handler } from "../webgl/Handler";
import type { WebGLBufferExt, WebGLTextureExt } from "../webgl/Handler";

interface INormalMapCreatorParams {
    minTableSize?: number;
    maxTableSize?: number;
    width?: number;
    height?: number;
}

export class NormalMapCreator {
    protected _minTabelSize: number;
    protected _maxTableSize: number;

    protected _planet: Planet;
    protected _handler: Handler | null;
    protected _verticesBufferArray: WebGLBufferExt[];
    protected _indexBufferArray: WebGLBufferExt[];
    protected _positionBuffer: WebGLBufferExt | null;
    protected _framebuffer: Framebuffer | null;
    protected _normalMapVerticesTexture: WebGLTextureExt | null;

    protected _width: number;
    protected _height: number;

    protected _queue: QueueArray<Segment>;

    protected _lock: Lock;

    constructor(planet: Planet, options: INormalMapCreatorParams = {}) {
        this._minTabelSize = options.minTableSize || 1;
        this._maxTableSize = options.maxTableSize || 8;

        this._planet = planet;
        this._handler = null;
        this._verticesBufferArray = [];
        this._indexBufferArray = [];
        this._positionBuffer = null;
        this._framebuffer = null;
        this._normalMapVerticesTexture = null;

        this._width = options.width || 128;
        this._height = options.height || 128;

        this._queue = new QueueArray(1024);

        this._lock = new Lock();
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public init() {
        this._maxTableSize = this._planet.maxGridSize || 8;

        this._handler = this._planet.renderer!.handler;

        let isWebkit = false; //('WebkitAppearance' in document.documentElement.style) && !/^((?!chrome).)*safari/i.test(navigator.userAgent);

        const normalMapBlur = new ShaderProgram("normalMapBlur", {
            attributes: {
                a_position: "vec2"
            },
            uniforms: {
                s_texture: "sampler2d"
            },
            vertexShader: `#version 300 es
                        in vec2 a_position;

                        out vec2 blurCoordinates[5];

                        void main() {
                            vec2 vt = a_position * 0.5 + 0.5;
                            ${isWebkit ? "vt.y = 1.0 - vt.y; " : " "}
                            gl_Position = vec4(a_position, 0.0, 1.0);
                            blurCoordinates[0] = vt;
                            blurCoordinates[1] = vt + vec2(${(1.0 / this._width) * 1.407333}, 0.0);
                            blurCoordinates[2] = vt - vec2(${(1.0 / this._width) * 1.407333}, 0.0);
                            blurCoordinates[3] = vt + vec2(0.0, ${(1.0 / this._height) * 3.294215});
                            blurCoordinates[4] = vt - vec2(0.0, ${(1.0 / this._height) * 3.294215});
                        }`,
            fragmentShader: `#version 300 es
                        precision highp float;
                        uniform sampler2D s_texture;
                        in vec2 blurCoordinates[5];
                        out vec4 fragColor;

                        vec3 decodeNormal(vec3 c) {
                            return c * 2.0 - 1.0;
                        }

                        void main() {
                            vec2 uv = blurCoordinates[0];
                            vec4 center = texture(s_texture, uv);

                            // Keep border intact to avoid seams between adjacent tiles.
                            if(uv.x <= ${3.294215 / this._width} || uv.x >= ${1.0 - 3.294215 / this._width} ||
                               uv.y <= ${3.294215 / this._height} || uv.y >= ${1.0 - 3.294215 / this._height}) {
                                fragColor = center;
                                return;
                            }

                            vec3 n = vec3(0.0);
                            n += decodeNormal(center.rgb) * 0.204164;
                            n += decodeNormal(texture(s_texture, blurCoordinates[1]).rgb) * 0.304005;
                            n += decodeNormal(texture(s_texture, blurCoordinates[2]).rgb) * 0.304005;
                            n += decodeNormal(texture(s_texture, blurCoordinates[3]).rgb) * 0.093913;
                            n += decodeNormal(texture(s_texture, blurCoordinates[4]).rgb) * 0.093913;

                            n = normalize(n);
                            fragColor = vec4(n * 0.5 + 0.5, center.a);
                        }`
        });

        const normalMap = new ShaderProgram("normalMap", {
            attributes: {
                a_position: "vec2",
                a_normal: "vec3"
            },
            uniforms: {},
            vertexShader: `#version 300 es
                        in vec2 a_position;
                        in vec3 a_normal;

                        out vec3 v_color;

                        void main() {
                            gl_Position = vec4(a_position, 0.0, 1.0);
                            v_color = normalize(a_normal) * 0.5 + 0.5;
                        }`,
            fragmentShader: `#version 300 es
                        precision highp float;

                        in vec3 v_color;
                        out vec4 fragColor;

                        void main () {
                            fragColor = vec4(v_color, 1.0);
                        }`
        });

        this._handler.addProgram(normalMapBlur);
        this._handler.addProgram(normalMap);

        //create hidden handler buffer
        this._framebuffer = new Framebuffer(this._handler, {
            width: this._width,
            height: this._height,
            useDepth: false
        });

        this._framebuffer.init();

        this._normalMapVerticesTexture = this._handler.createEmptyTexture_l(this._width, this._height);

        //create vertices hasharray for different grid size segments from 2^4(16) to 2^7(128)
        for (let p = this._minTabelSize; p <= this._maxTableSize; p++) {
            const gs = 1 << p; //Math.pow(2, p);
            const gs2 = gs / 2;

            let vertices = new Float32Array((gs + 1) * (gs + 1) * 2);

            for (let i = 0; i <= gs; i++) {
                for (let j = 0; j <= gs; j++) {
                    let ind = (i * (gs + 1) + j) * 2;
                    vertices[ind] = -1 + j / gs2;
                    vertices[ind + 1] = -1 + i / gs2;
                }
            }

            this._verticesBufferArray[gs] = this._handler.createArrayBuffer(vertices, 2, vertices.length / 2);

            this._indexBufferArray[gs] =
                this._planet._indexesCache[Math.log2(gs)][Math.log2(gs)][Math.log2(gs)][Math.log2(gs)][
                    Math.log2(gs)
                ].buffer!;
        }

        //create 2d screen square buffer
        const positions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

        this._positionBuffer = this._handler.createArrayBuffer(positions, 2, positions.length / 2);
    }

    protected _drawNormalMapBlur(segment: Segment): boolean {
        let normals = segment.normalMapNormals;
        if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING && normals && normals.length) {
            const size = normals.length / 3;
            const gridSize = Math.sqrt(size) - 1;

            let indBuf = this._verticesBufferArray[gridSize];

            if (indBuf) {
                if (segment.planet.terrain!.equalizeNormals) {
                    segment._normalMapEdgeEqualize(quadTree.N);
                    segment._normalMapEdgeEqualize(quadTree.S);
                    segment._normalMapEdgeEqualize(quadTree.W);
                    segment._normalMapEdgeEqualize(quadTree.E);
                }

                let outTexture = segment.normalMapTexturePtr;

                const h = this._handler!;
                const gl = h.gl!;

                let _normalsBuffer = h.createArrayBuffer(normals, 3, size, gl.DYNAMIC_DRAW);

                const f = this._framebuffer!;
                let p = h.programs.normalMap;
                let sha = p.attributes;

                f.bindOutputTexture(this._normalMapVerticesTexture!);

                p.activate();

                gl.bindBuffer(gl.ARRAY_BUFFER, indBuf);
                gl.vertexAttribPointer(sha.a_position, indBuf.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, _normalsBuffer);
                gl.vertexAttribPointer(sha.a_normal, _normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
                gl.drawElements(gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, gl.UNSIGNED_INT, 0);

                gl.deleteBuffer(_normalsBuffer);

                //
                // blur pass
                //
                f.bindOutputTexture(outTexture!);

                p = h.programs.normalMapBlur;

                p.activate();
                gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer!);
                gl.vertexAttribPointer(p.attributes.a_position, this._positionBuffer!.itemSize, gl.FLOAT, false, 0, 0);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this._normalMapVerticesTexture!);
                gl.uniform1i(p.uniforms.s_texture, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._positionBuffer!.numItems);
                return true;
            } else {
                return true;
            }
        }
        return false;
    }

    protected _drawNormalMapNoBlur(segment: Segment): boolean {
        let normals = segment.normalMapNormals;
        if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING && normals && normals.length) {
            const size = normals.length / 3;
            const gridSize = Math.sqrt(size) - 1;

            let indBuf = this._verticesBufferArray[gridSize];

            if (indBuf) {
                if (segment.planet.terrain!.equalizeNormals) {
                    segment._normalMapEdgeEqualize(quadTree.N);
                    segment._normalMapEdgeEqualize(quadTree.S);
                    segment._normalMapEdgeEqualize(quadTree.W);
                    segment._normalMapEdgeEqualize(quadTree.E);
                }

                let outTexture = segment.normalMapTexturePtr;

                const h = this._handler!;
                const gl = h.gl!;

                let _normalsBuffer = h.createArrayBuffer(normals, 3, size, gl.DYNAMIC_DRAW);

                const f = this._framebuffer!;
                const p = h.programs.normalMap;
                const sha = p.attributes;

                f.bindOutputTexture(outTexture!);

                p.activate();

                gl.bindBuffer(gl.ARRAY_BUFFER, indBuf);
                gl.vertexAttribPointer(sha.a_position, indBuf.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, _normalsBuffer);
                gl.vertexAttribPointer(sha.a_normal, _normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
                gl.drawElements(gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, gl.UNSIGNED_INT, 0);

                gl.deleteBuffer(_normalsBuffer);

                return true;
            } else {
                return true;
            }
        }
        return false;
    }

    protected _drawNormalMap(segment: Segment) {
        if (segment.planet.terrain!.isBlur(segment)) {
            return this._drawNormalMapBlur(segment);
        } else {
            return this._drawNormalMapNoBlur(segment);
        }
    }

    public drawSingle(segment: Segment) {
        const h = this._handler!;
        const gl = h.gl!;

        this._framebuffer!.activate();

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        if (segment.terrainReady && this._drawNormalMap(segment)) {
            segment.normalMapReady = true;
            segment.normalMapTexture = segment.normalMapTexturePtr;
            segment.normalMapTextureBias[0] = 0;
            segment.normalMapTextureBias[1] = 0;
            segment.normalMapTextureBias[2] = 1;
        }
        segment._inTheQueue = false;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.BLEND);

        this._framebuffer!.deactivate();
    }

    public frame() {
        if (this._queue.length) {
            const h = this._handler!;
            const gl = h.gl!;

            this._framebuffer!.activate();

            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);

            let deltaTime = 0,
                startTime = window.performance.now();

            while (this._lock.isFree() && this._queue.length && deltaTime < 0.25) {
                const segment = this._queue.shift()!;
                if (segment.terrainReady && this._drawNormalMap(segment)) {
                    segment.normalMapReady = true;
                    segment.normalMapTexture = segment.normalMapTexturePtr;
                    segment.normalMapTextureBias[0] = 0;
                    segment.normalMapTextureBias[1] = 0;
                    segment.normalMapTextureBias[2] = 1;
                }
                segment._inTheQueue = false;
                deltaTime = window.performance.now() - startTime;
            }

            gl.enable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);

            this._framebuffer!.deactivate();
        }
    }

    public get queueSize(): number {
        return this._queue.length;
    }

    public queue(segment: Segment) {
        segment._inTheQueue = true;
        this._queue.push(segment);
    }

    public unshift(segment: Segment) {
        segment._inTheQueue = true;
        this._queue.unshift(segment);
    }

    public remove(segment: Segment) {
        //...
    }

    public clear() {
        while (this._queue.length) {
            let s = this._queue.pop()!;
            s._inTheQueue = false;
        }
    }

    /**
     * Set activity off
     * @public
     */
    public lock(key: Key) {
        this._lock.lock(key);
    }

    /**
     * Set activity on
     * @public
     */
    public free(key: Key) {
        this._lock.free(key);
    }
}
