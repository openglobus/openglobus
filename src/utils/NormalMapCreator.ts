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
import type { NormalsArray } from "./normalsArray";

interface INormalMapCreatorParams {
    width?: number;
    height?: number;
}

const MIN_NORMAL_MAP_SIZE = 128;

/**
 * The normals of a grid size as a texture, a texel a vertex.
 */
interface INormalsTexture {
    texture: WebGLTexture;
    half: boolean;
}

export class NormalMapCreator {
    protected _planet: Planet;
    protected _handler: Handler | null;
    protected _positionBuffer: WebGLBufferExt | null;
    protected _framebuffer: Framebuffer | null;
    protected _normalMapVerticesTexture: WebGLTextureExt | null;
    protected _normalsTextures: Record<number, INormalsTexture>;

    protected _width: number;
    protected _height: number;

    protected _queue: QueueArray<Segment>;

    protected _lock: Lock;

    /**
     * Grows with every normal map drawn, and when the queue is cleared.
     */
    public __version__: number;

    constructor(planet: Planet, options: INormalMapCreatorParams = {}) {
        this._planet = planet;
        this._handler = null;
        this._positionBuffer = null;
        this._framebuffer = null;
        this._normalMapVerticesTexture = null;
        this._normalsTextures = {};

        this._width = options.width || 128;
        this._height = options.height || 128;

        this._queue = new QueueArray(1024);

        this._lock = new Lock();

        this.__version__ = 0;
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public setGridSize(gridSize: number) {
        const size = Math.max(MIN_NORMAL_MAP_SIZE, 2 ** Math.ceil(Math.log2(gridSize)));

        if (size === this._width && size === this._height) {
            return;
        }

        this._width = this._height = size;

        // The segments make their textures again, see Segment._createNormalMapTexture
        if (this._handler) {
            this._framebuffer!.setSize(size, size);
            this._handler.gl!.deleteTexture(this._normalMapVerticesTexture!);
            this._normalMapVerticesTexture = this._handler.createEmptyTexture_l(size, size);
        }
    }

    public init() {
        this._handler = this._planet.renderer!.handler;

        let isWebkit = false; //('WebkitAppearance' in document.documentElement.style) && !/^((?!chrome).)*safari/i.test(navigator.userAgent);

        const normalMapBlur = new ShaderProgram("normalMapBlur", {
            attributes: {
                a_position: "vec2"
            },
            uniforms: {
                s_texture: "sampler2d",
                // A texel of the normal map, 1 / size
                u_texel: "vec2"
            },
            vertexShader: `#version 300 es
                        uniform vec2 u_texel;
                        in vec2 a_position;

                        out vec2 blurCoordinates[5];

                        void main() {
                            vec2 vt = a_position * 0.5 + 0.5;
                            ${isWebkit ? "vt.y = 1.0 - vt.y; " : " "}
                            gl_Position = vec4(a_position, 0.0, 1.0);
                            blurCoordinates[0] = vt;
                            blurCoordinates[1] = vt + vec2(u_texel.x * 1.407333, 0.0);
                            blurCoordinates[2] = vt - vec2(u_texel.x * 1.407333, 0.0);
                            blurCoordinates[3] = vt + vec2(0.0, u_texel.y * 3.294215);
                            blurCoordinates[4] = vt - vec2(0.0, u_texel.y * 3.294215);
                        }`,
            fragmentShader: `#version 300 es
                        precision highp float;
                        uniform sampler2D s_texture;
                        uniform vec2 u_texel;
                        in vec2 blurCoordinates[5];
                        out vec4 fragColor;

                        vec3 decodeNormal(vec3 c) {
                            return c * 2.0 - 1.0;
                        }

                        void main() {
                            vec2 uv = blurCoordinates[0];
                            vec4 center = texture(s_texture, uv);

                            // Keep border intact to avoid seams between adjacent tiles.
                            vec2 border = u_texel * 3.294215;
                            if(uv.x <= border.x || uv.x >= 1.0 - border.x ||
                               uv.y <= border.y || uv.y >= 1.0 - border.y) {
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
                a_position: "vec2"
            },
            uniforms: {
                u_normals: "sampler2d",
                u_gridSize: "float",
                u_size: "vec2"
            },
            vertexShader: `#version 300 es
                        in vec2 a_position;

                        void main() {
                            gl_Position = vec4(a_position, 0.0, 1.0);
                        }`,
            fragmentShader: `#version 300 es
                        precision highp float;
                        precision highp sampler2D;

                        // The normals of the (gridSize + 1)² grid vertices, the rows from the north
                        uniform sampler2D u_normals;
                        uniform float u_gridSize;

                        // The normal map size
                        uniform vec2 u_size;

                        out vec4 fragColor;

                        vec3 vertexNormal(ivec2 i) {
                            return normalize(texelFetch(u_normals, i, 0).xyz);
                        }

                        void main() {
                            // From the first grid vertex at the first texel center to the last one at the last
                            vec2 g = (gl_FragCoord.xy - 0.5) * u_gridSize / (u_size - 1.0);
                            ivec2 i = clamp(ivec2(floor(g)), ivec2(0), ivec2(int(u_gridSize) - 1));
                            vec2 f = g - vec2(i);
                            vec3 n = mix(
                                mix(vertexNormal(i), vertexNormal(i + ivec2(1, 0)), f.x),
                                mix(vertexNormal(i + ivec2(0, 1)), vertexNormal(i + ivec2(1, 1)), f.x),
                                f.y
                            );
                            fragColor = vec4(n * 0.5 + 0.5, 1.0);
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

        //create 2d screen square buffer
        const positions = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

        this._positionBuffer = this._handler.createArrayBuffer(positions, 2, positions.length / 2);
    }

    /**
     * Loads the normals into the texture of their grid size and binds it, the texture is made once for the size.
     */
    protected _bindNormals(normals: NormalsArray, gridSize: number) {
        const gl = this._handler!.gl!,
            size = gridSize + 1,
            half = normals.BYTES_PER_ELEMENT === 2,
            type = half ? gl.HALF_FLOAT : gl.FLOAT,
            data = half ? new Uint16Array(normals.buffer, normals.byteOffset, normals.length) : normals;

        let t = this._normalsTextures[gridSize];

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        if (t && t.half === half) {
            gl.bindTexture(gl.TEXTURE_2D, t.texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGB, type, data);
        } else {
            if (t) {
                gl.deleteTexture(t.texture);
            }
            const texture = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGB16F : gl.RGB32F, size, size, 0, gl.RGB, type, data);
            this._normalsTextures[gridSize] = { texture, half };
        }

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    }

    /**
     * Draws the normal map of the normals into the texture.
     */
    protected _drawNormals(normals: NormalsArray, outTexture: WebGLTextureExt) {
        const h = this._handler!,
            gl = h.gl!,
            gridSize = Math.sqrt(normals.length / 3) - 1,
            p = h.programs.normalMap;

        this._framebuffer!.bindOutputTexture(outTexture);

        p.activate();

        gl.activeTexture(gl.TEXTURE0);
        this._bindNormals(normals, gridSize);
        gl.uniform1i(p.uniforms.u_normals, 0);
        gl.uniform1f(p.uniforms.u_gridSize, gridSize);
        gl.uniform2f(p.uniforms.u_size, this._width, this._height);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer!);
        gl.vertexAttribPointer(p.attributes.a_position, this._positionBuffer!.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._positionBuffer!.numItems);
    }

    /**
     * Equalizes the normals with the neighbors and makes the texture of the normal map size.
     */
    protected _prepareSegment(segment: Segment) {
        if (segment.planet.terrain!.equalizeNormals) {
            segment._normalMapEdgeEqualize(quadTree.N);
            segment._normalMapEdgeEqualize(quadTree.S);
            segment._normalMapEdgeEqualize(quadTree.W);
            segment._normalMapEdgeEqualize(quadTree.E);
        }

        if (segment._normalMapTextureSize !== this._width) {
            segment._createNormalMapTexture();
        }
    }

    protected _drawNormalMapBlur(segment: Segment): boolean {
        let normals = segment.normalMapNormals;
        if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING && normals && normals.length) {
            this._prepareSegment(segment);

            const h = this._handler!;
            const gl = h.gl!;

            this._drawNormals(normals, this._normalMapVerticesTexture!);

            //
            // blur pass
            //
            this._framebuffer!.bindOutputTexture(segment.normalMapTexturePtr!);

            const p = h.programs.normalMapBlur;

            p.activate();
            gl.uniform2f(p.uniforms.u_texel, 1 / this._width, 1 / this._height);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer!);
            gl.vertexAttribPointer(p.attributes.a_position, this._positionBuffer!.itemSize, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._normalMapVerticesTexture!);
            gl.uniform1i(p.uniforms.s_texture, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._positionBuffer!.numItems);
            return true;
        }
        return false;
    }

    protected _drawNormalMapNoBlur(segment: Segment): boolean {
        let normals = segment.normalMapNormals;
        if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING && normals && normals.length) {
            this._prepareSegment(segment);
            this._drawNormals(normals, segment.normalMapTexturePtr!);
            return true;
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
            ++this.__version__;
            segment._normalMapDrawn();
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

    /**
     * Returns true when there is nothing left to rasterize.
     * @public
     * @returns {boolean}
     */
    public get isIdle(): boolean {
        return this._queue.length === 0;
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
                    ++this.__version__;
                    segment._normalMapDrawn();
                    segment.normalMapTextureBias[0] = 0;
                    segment.normalMapTextureBias[1] = 0;
                    segment.normalMapTextureBias[2] = 1;
                    this._planet.renderer!.requestRedraw();
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
        // The edges waiting in the queue are compared again
        this.__version__++;
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
