/**
 * @module og/utils/NormalMapCreator
 */

'use strict';

import * as quadTree from '../quadTree/quadTree.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { Lock } from '../Lock.js';
import { ShaderProgram } from '../webgl/ShaderProgram.js';
import { types } from '../webgl/types.js';
import { QueueArray } from '../QueueArray.js';

const NormalMapCreator = function (planet, options) {
    
    options = options || {};

    this._planet = planet;
    this._handler = planet.renderer.handler;
    this._verticesBufferArray = [];
    this._indexBufferArray = [];
    this._positionBuffer = null;
    this._framebuffer = null;
    this._normalMapVerticesTexture = null;

    this._width = options.width || 128;
    this._height = options.height || 128;

    this.MAX_FRAMES = options.maxFrames || 5;
    this._currentFrame = 0;
    this._queue = new QueueArray(1024);

    this._lock = new Lock();

    this._blur = options.blur != undefined ? options.blur : true;

    this._drawNormalMap = this._blur  ? this._drawNormalMapBlur : this._drawNormalMapNotBlur;

    this._init();
};

NormalMapCreator.prototype.setBlur = function (isBlur) {
    this._blur = blur;
    this._drawNormalMap = isBlur ? this._drawNormalMapBlur : this._drawNormalMapNotBlur;
};

NormalMapCreator.prototype._init = function () {

    var isWebkit = false;//('WebkitAppearance' in document.documentElement.style) && !/^((?!chrome).)*safari/i.test(navigator.userAgent);

    /*==================================================================================
     * http://www.sunsetlakesoftware.com/2013/10/21/optimizing-gaussian-blurs-mobile-gpu
     *=================================================================================*/
    var normalMapBlur = new ShaderProgram("normalMapBlur", {
        attributes: {
            a_position: { type: types.VEC2, enableArray: true }
        },
        uniforms: {
            s_texture: { type: types.SAMPLER2D }
        },
        vertexShader: "attribute vec2 a_position; \n\
                       attribute vec2 a_texCoord; \n\
                      \n\
                      varying vec2 blurCoordinates[5]; \n\
                      \n\
                      void main() { \n\
                          vec2 vt = a_position * 0.5 + 0.5;" +
            (isWebkit ? "vt.y = 1.0 - vt.y; " : " ") +
            "gl_Position = vec4(a_position, 0.0, 1.0); \n\
                          blurCoordinates[0] = vt; \n\
                          blurCoordinates[1] = vt + "  + (1.0 / this._width * 1.407333) + ";" +
            "blurCoordinates[2] = vt - " + (1.0 / this._height * 1.407333) + ";" +
            "blurCoordinates[3] = vt + " + (1.0 / this._width * 3.294215) + ";" +
            "blurCoordinates[4] = vt - " + (1.0 / this._height * 3.294215) + ";" +
            "}",
        fragmentShader:
            "precision highp float;\n\
                        uniform sampler2D s_texture; \n\
                        \n\
                        varying vec2 blurCoordinates[5]; \n\
                        \n\
                        void main() { \n\
                            lowp vec4 sum = vec4(0.0); \n\
                            if(blurCoordinates[0].x <= 0.01 || blurCoordinates[0].x >= 0.99 ||\n\
                                blurCoordinates[0].y <= 0.01 || blurCoordinates[0].y >= 0.99){\n\
                                sum = texture2D(s_texture, blurCoordinates[0]);\n\
                            } else {\n\
                                sum += texture2D(s_texture, blurCoordinates[0]) * 0.204164; \n\
                                sum += texture2D(s_texture, blurCoordinates[1]) * 0.304005; \n\
                                sum += texture2D(s_texture, blurCoordinates[2]) * 0.304005; \n\
                                sum += texture2D(s_texture, blurCoordinates[3]) * 0.093913; \n\
                                sum += texture2D(s_texture, blurCoordinates[4]) * 0.093913; \n\
                            }\n\
                            gl_FragColor = sum; \n\
                        }"
    });

    var normalMap = new ShaderProgram("normalMap", {
        attributes: {
            a_position: { type: types.VEC2, enableArray: true },
            a_normal: { type: types.VEC3, enableArray: true }
        },
        vertexShader: "attribute vec2 a_position; \
                      attribute vec3 a_normal; \
                      \
                      varying vec3 v_color; \
                      \
                      void main() { \
                          gl_PointSize = 1.0; \
                          gl_Position = vec4(a_position, 0, 1); \
                          v_color = normalize(a_normal) * 0.5 + 0.5; \
                      }",
        fragmentShader:
            "precision highp float;\n\
                        \
                        varying vec3 v_color; \
                        \
                        void main () { \
                            gl_FragColor = vec4(v_color, 1.0); \
                        }"
    });

    this._handler.addShaderProgram(normalMapBlur);
    this._handler.addShaderProgram(normalMap);

    //create hidden handler buffer
    this._framebuffer = new Framebuffer(this._handler, {
        width: this._width,
        height: this._height,
        useDepth: false
    });

    this._framebuffer.init();

    this._normalMapVerticesTexture = this._handler.createEmptyTexture_l(this._width, this._height);

    //create vertices hasharray for different grid size segments
    for (var p = 1; p <= 7; p++) {
        var gs = Math.pow(2, p);
        var gs2 = (gs / 2);
        var vertices = [];

        for (var i = 0; i <= gs; i++) {
            for (var j = 0; j <= gs; j++) {
                vertices.push(-1 + j / gs2, -1 + i / gs2);
            }
        }

        this._verticesBufferArray[gs] = this._handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
        this._indexBufferArray[gs] = this._planet._indexesCache[gs][gs][gs][gs][gs].buffer;
    }

    //create 2d screen square buffer
    var positions = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0]);

    this._positionBuffer = this._handler.createArrayBuffer(positions, 2, positions.length / 2);
};

NormalMapCreator.prototype._drawNormalMapBlur = function (segment) {
    var normals = segment.normalMapNormals;
    if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING
        && normals && normals.length) {

        segment._normalMapEdgeEqualize(quadTree.N);
        segment._normalMapEdgeEqualize(quadTree.S);
        segment._normalMapEdgeEqualize(quadTree.W);
        segment._normalMapEdgeEqualize(quadTree.E);

        var outTexture = segment.normalMapTexturePtr;
        var size = normals.length / 3;
        var gridSize = Math.sqrt(size) - 1;

        var h = this._handler;
        var gl = h.gl;

        var _normalsBuffer = h.createArrayBuffer(normals, 3, size, gl.DYNAMIC_DRAW);

        var f = this._framebuffer;
        var p = h.shaderPrograms.normalMap;
        var sha = p._program.attributes;

        f.bindOutputTexture(this._normalMapVerticesTexture);

        p.activate();

        gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBufferArray[gridSize]);
        gl.vertexAttribPointer(sha.a_position, this._verticesBufferArray[gridSize].itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, _normalsBuffer);
        gl.vertexAttribPointer(sha.a_normal, _normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
        gl.drawElements(gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, gl.UNSIGNED_SHORT, 0);

        gl.deleteBuffer(_normalsBuffer);

        //
        // blur pass
        //
        f.bindOutputTexture(outTexture);

        p = h.shaderPrograms.normalMapBlur;

        p.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
        gl.vertexAttribPointer(p._program.attributes.a_position, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._normalMapVerticesTexture);
        gl.uniform1i(p._program.uniforms.s_texture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._positionBuffer.numItems);
        return true;
    }
    return false;
};


NormalMapCreator.prototype._drawNormalMapNotBlur = function (segment) {
    var normals = segment.normalMapNormals;
    if (segment.node && segment.node.getState() !== quadTree.NOTRENDERING
        && normals && normals.length) {

        segment._normalMapEdgeEqualize(quadTree.N);
        segment._normalMapEdgeEqualize(quadTree.S);
        segment._normalMapEdgeEqualize(quadTree.W);
        segment._normalMapEdgeEqualize(quadTree.E);

        var outTexture = segment.normalMapTexturePtr;
        var size = normals.length / 3;
        var gridSize = Math.sqrt(size) - 1;

        var h = this._handler;
        var gl = h.gl;

        var _normalsBuffer = h.createArrayBuffer(normals, 3, size, gl.DYNAMIC_DRAW);

        var f = this._framebuffer;
        var p = h.shaderPrograms.normalMap;
        var sha = p._program.attributes;

        f.bindOutputTexture(outTexture);

        p.activate();

        gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBufferArray[gridSize]);
        gl.vertexAttribPointer(sha.a_position, this._verticesBufferArray[gridSize].itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, _normalsBuffer);
        gl.vertexAttribPointer(sha.a_normal, _normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
        gl.drawElements(gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, gl.UNSIGNED_SHORT, 0);

        gl.deleteBuffer(_normalsBuffer);

        return true;
    }
    return false;
};

NormalMapCreator.prototype.drawSingle = function (segment) {
    var h = this._handler,
        gl = h.gl;

    this._framebuffer.activate();

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);

    if (segment.terrainReady && this._drawNormalMap(segment)) {
        segment.normalMapReady = true;
        segment.normalMapTexture = segment.normalMapTexturePtr;
        segment.normalMapTextureBias[0] = 0;
        segment.normalMapTextureBias[1] = 0;
        segment.normalMapTextureBias[2] = 1;
    }
    segment._inTheQueue = false;

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    this._framebuffer.deactivate();
};

NormalMapCreator.prototype.frame = function () {

    if (this._queue.length) {
        var h = this._handler,
            gl = h.gl;

        this._framebuffer.activate();

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);

        var deltaTime = 0,
            startTime = window.performance.now();

        var width = this._width,
            height = this._height;

        while (this._lock.isFree() && this._queue.length && deltaTime < 0.25) {
            var segment = this._queue.shift();
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

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this._framebuffer.deactivate();
    }
};

NormalMapCreator.prototype.queue = function (segment) {
    segment._inTheQueue = true;
    this._queue.push(segment);
};

NormalMapCreator.prototype.unshift = function (segment) {
    segment._inTheQueue = true;
    this._queue.unshift(segment);
};

NormalMapCreator.prototype.remove = function (segment) {
    //...
};

NormalMapCreator.prototype.clear = function () {
    while (this._queue.length) {
        var s = this._queue.pop();
        s._inTheQueue = false;
    }
};

/**
 * Set activity off
 * @public
 */
NormalMapCreator.prototype.lock = function (key) {
    this._lock.lock(key);
};

/**
 * Set activity on
 * @public
 */
NormalMapCreator.prototype.free = function (key) {
    this._lock.free(key);
};

export { NormalMapCreator };