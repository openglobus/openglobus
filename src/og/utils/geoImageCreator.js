/**
 * @module og/utils/GeoImageCreator
 */

'use sctrict';

import * as utils from '../utils/shared.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { LonLat } from '../LonLat.js';
import { PlanetSegmentHelper } from '../planetSegment/planetSegmentHelper.js';
import { ShaderProgram } from '../webgl/ShaderProgram.js';
import { types } from '../webgl/types.js';

const GeoImageCreator = function (handler, maxFrames) {
    this._gridSize = 64;
    this._handler = handler;
    this._framebuffer = null;
    this._texCoordsBuffer = null;
    this._indexBuffer = null;
    this.MAX_FRAMES = maxFrames || 5;
    this._currentFrame = 0;
    this._queue = [];
    this._animate = [];
    this._initialize();
};

GeoImageCreator.prototype._initialize = function () {
    this._initShaders();
    this._initBuffers();
};

/**
 * Creates geoImage corners coordinates grid buffer.
 * @public
 * @param{Array.<og.LonLat>} c - GeoImage corners coordinates.
 * @return{WebGLBuffer} Grid coordinates buffer.
 */
GeoImageCreator.prototype.createGridBuffer = function (c, toMerc) {
    var gs = this._gridSize;

    var v03 = new LonLat((c[3].lon - c[0].lon) / gs, (c[3].lat - c[0].lat) / gs),
        v12 = new LonLat((c[2].lon - c[1].lon) / gs, (c[2].lat - c[1].lat) / gs),
        v01 = new LonLat((c[1].lon - c[0].lon) / gs, (c[1].lat - c[0].lat) / gs),
        v32 = new LonLat((c[2].lon - c[3].lon) / gs, (c[2].lat - c[3].lat) / gs);

    var grid = new Float32Array((gs + 1) * (gs + 1) * 2);
    var k = 0;
    for (var i = 0; i <= gs; i++) {
        var P03i = new LonLat(c[0].lon + i * v03.lon, c[0].lat + i * v03.lat),
            P12i = new LonLat(c[1].lon + i * v12.lon, c[1].lat + i * v12.lat);
        for (var j = 0; j <= gs; j++) {
            var P01j = new LonLat(c[0].lon + j * v01.lon, c[0].lat + j * v01.lat),
                P32j = new LonLat(c[3].lon + j * v32.lon, c[3].lat + j * v32.lat);
            var xx = utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j);
            grid[k++] = xx.lon;
            grid[k++] = xx.lat;
        }
    }

    if (toMerc) {
        for (var i = 0; i < grid.length; i += 2) {
            var c = new LonLat(grid[i], grid[i + 1]).forwardMercator();
            grid[i] = c.lon;
            grid[i + 1] = c.lat;
        }
    }
    return this._handler.createArrayBuffer(grid, 2, grid.length / 2);
};

GeoImageCreator.prototype.frame = function () {
    var i = this.MAX_FRAMES;
    while (i-- && this._queue.length) {
        var q = this._queue.shift();
        q._isRendering = false;
        q.rendering();
    }

    i = this._animate.length;
    while (i--) {
        this._animate[i].rendering();
    }
};

GeoImageCreator.prototype.add = function (geoImage) {
    if (!geoImage._isRendering) {
        geoImage._isRendering = true;
        if (geoImage._animate) {
            this._animate.push(geoImage);
        } else {
            this._queue.push(geoImage);
        }
    }
};

GeoImageCreator.prototype.remove = function (geoImage) {
    if (geoImage._isRendering) {
        geoImage._creationProceeding = false;
        geoImage._isRendering = false;
        var arr;
        if (geoImage._animate) {
            arr = this._animate;
        } else {
            arr = this._queue;
        }
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].isEqual(geoImage)) {
                arr.splice(i, 1);
                return;
            }
        }
    }
};

GeoImageCreator.prototype._initBuffers = function () {
    PlanetSegmentHelper.initIndexesTables(3);

    this._framebuffer = new Framebuffer(this._handler, { width: 2, height: 2, useDepth: false });
    this._framebufferMercProj = new Framebuffer(this._handler, { width: 2, height: 2, useDepth: false });

    var gs = this._gridSize;
    var gs1 = this._gridSize + 1;
    this._texCoordsBuffer = this._handler.createArrayBuffer(PlanetSegmentHelper.textureCoordsTable[gs], 2, gs1 * gs1);

    var indexes = PlanetSegmentHelper.createSegmentIndexes(gs, [gs, gs, gs, gs]);
    this._indexBuffer = this._handler.createElementArrayBuffer(indexes, 1, indexes.length);

    this._quadTexCoordsBuffer = this._handler.createArrayBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2, 4);
    this._quadVertexBuffer = this._handler.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);
};

GeoImageCreator.prototype._initShaders = function () {
    this._handler.addShaderProgram(new ShaderProgram("geoImageTransform", {
        uniforms: {
            sourceTexture: { type: types.SAMPLER2D },
            extentParams: { type: types.VEC4 }
        },
        attributes: {
            corners: { type: types.VEC2, enableArray: true },
            texCoords: { type: types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 corners; \
                      attribute vec2 texCoords; \
                      varying vec2 v_texCoords; \
                      uniform vec4 extentParams; \
                      void main() { \
                          v_texCoords = texCoords; \
                          gl_Position = vec4((-1.0 + (corners - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0); \
                      }',
        fragmentShader:
        'precision highp float;\n\
                        uniform sampler2D sourceTexture; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            gl_FragColor = texture2D(sourceTexture, v_texCoords); \
                        }'
    }));
};

export { GeoImageCreator };
