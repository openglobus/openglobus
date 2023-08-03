'use strict';

import { LonLat } from '../LonLat';
import * as utils from '../utils/shared';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { Program } from '../webgl/Program.js';
import { doubleToTwoFloats2 } from "../math/coder.js";

export class GeoImageCreator {

    constructor(planet, maxFrames) {
        this._gridSize = 64;
        this._planet = planet;
        this._framebuffer = null;
        this._texCoordsBuffer = null;
        this._indexBuffer = null;
        this.MAX_FRAMES = maxFrames || 5;
        this._currentFrame = 0;
        this._queue = [];
        this._animate = [];
    }

    init() {
        this._initShaders();
        this._initBuffers();
    }

    /**
     * Creates geoImage corners coordinates grid buffer.
     * @public
     * @param{Array.<LonLat>} c - GeoImage corners coordinates.
     * @return{WebGLBuffer} Grid coordinates buffer.
     */
    createGridBuffer(c, toMerc) {
        let gs = this._gridSize;

        let v03 = new LonLat((c[3].lon - c[0].lon) / gs, (c[3].lat - c[0].lat) / gs),
            v12 = new LonLat((c[2].lon - c[1].lon) / gs, (c[2].lat - c[1].lat) / gs),
            v01 = new LonLat((c[1].lon - c[0].lon) / gs, (c[1].lat - c[0].lat) / gs),
            v32 = new LonLat((c[2].lon - c[3].lon) / gs, (c[2].lat - c[3].lat) / gs);

        const size = (gs + 1) * (gs + 1) * 2,
            halfSize = size / 2;

        let gridHigh = new Float32Array(size),
            gridLow = new Float32Array(size);

        let lonLatArr = new Array(halfSize);

        let kh = 0,
            kl = 0,
            k = 0;

        let tempArr = new Float32Array(2);

        for (let i = 0; i <= gs; i++) {

            let P03i = new LonLat(c[0].lon + i * v03.lon, c[0].lat + i * v03.lat),
                P12i = new LonLat(c[1].lon + i * v12.lon, c[1].lat + i * v12.lat);

            for (let j = 0; j <= gs; j++) {
                let P01j = new LonLat(c[0].lon + j * v01.lon, c[0].lat + j * v01.lat),
                    P32j = new LonLat(c[3].lon + j * v32.lon, c[3].lat + j * v32.lat);
                let xx = utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j);
                doubleToTwoFloats2(xx.lon, tempArr);
                gridHigh[kh++] = tempArr[0];
                gridLow[kl++] = tempArr[1];
                doubleToTwoFloats2(xx.lat, tempArr);
                gridHigh[kh++] = tempArr[0];
                gridLow[kl++] = tempArr[1];

                lonLatArr[k++] = xx;
            }
        }

        if (toMerc) {
            for (let i = 0; i < halfSize; i++) {
                let c = lonLatArr[i].forwardMercator();
                doubleToTwoFloats2(c.lon, tempArr);
                gridHigh[i * 2] = tempArr[0];
                gridLow[i * 2] = tempArr[1];

                doubleToTwoFloats2(c.lat, tempArr);
                gridHigh[i * 2 + 1] = tempArr[0];
                gridLow[i * 2 + 1] = tempArr[1];

                //grid[i] = c.lon;
                //grid[i + 1] = c.lat;
            }
        }

        return [
            this._planet.renderer.handler.createArrayBuffer(gridHigh, 2, halfSize),
            this._planet.renderer.handler.createArrayBuffer(gridLow, 2, halfSize)
        ];
    }

    frame() {
        var i = this.MAX_FRAMES;
        while (i-- && this._queue.length) {
            var q = this._queue.shift();
            q._isRendering = false;
            q.rendering();
            q.events.dispatch(q.events.loadend);
        }

        i = this._animate.length;
        while (i--) {
            this._animate[i].rendering();
        }
    }

    add(geoImage) {
        if (!geoImage._isRendering) {
            geoImage._isRendering = true;
            if (geoImage._animate) {
                this._animate.push(geoImage);
            } else {
                this._queue.push(geoImage);
            }
        }
    }

    remove(geoImage) {
        if (geoImage._isRendering) {
            geoImage._creationProceeding = false;
            geoImage._isRendering = false;
            var arr;
            if (geoImage._animate) {
                arr = this._animate;
            } else {
                arr = this._queue;
            }
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].isEqual(geoImage)) {
                    arr.splice(i, 1);
                    return;
                }
            }
        }
    }

    _initBuffers() {

        let h = this._planet.renderer.handler;

        this._framebuffer = new Framebuffer(h, { width: 2, height: 2, useDepth: false });
        this._framebuffer.init();

        this._framebufferMercProj = new Framebuffer(h, { width: 2, height: 2, useDepth: false });
        this._framebufferMercProj.init();

        let gs = Math.log2(this._gridSize);

        this._texCoordsBuffer = this._planet._textureCoordsBufferCache[gs];

        this._indexBuffer = this._planet._indexesCache[gs][gs][gs][gs][gs].buffer;

        this._quadTexCoordsBuffer = h.createArrayBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2, 4);
        this._quadVertexBuffer = h.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);
    }

    _initShaders() {

        this._planet.renderer.handler.addProgram(new Program("geoImageTransform", {
            uniforms: {
                sourceTexture: "sampler2d",
                extentParamsHigh: "vec4",
                extentParamsLow: "vec4",
                isFullExtent: "bool"
            },
            attributes: {
                cornersHigh: "vec2",
                cornersLow: "vec2",
                texCoords: "vec2"
            },
            vertexShader:
                `attribute vec2 cornersHigh; 
                     attribute vec2 cornersLow;
                      attribute vec2 texCoords; 
                      uniform vec4 extentParamsHigh; 
                      uniform vec4 extentParamsLow; 
                      varying vec2 v_texCoords;
                      void main() {                                                             
                          v_texCoords = texCoords; 
                          vec2 highDiff = cornersHigh - extentParamsHigh.xy;
                          vec2 lowDiff = cornersLow - extentParamsLow.xy;                                        
                          gl_Position = vec4((-1.0 + (highDiff + lowDiff) * extentParamsHigh.zw) * vec2(1.0, -1.0), 0.0, 1.0); 
                      }`,
            fragmentShader:
                `precision highp float;
                        uniform sampler2D sourceTexture;
                        uniform bool isFullExtent;
                        varying vec2 v_texCoords;
                        void main () {
                            if(!isFullExtent && (v_texCoords.x <= 0.001 || v_texCoords.x >= 0.999 ||
                                v_texCoords.y <= 0.001 || v_texCoords.y >= 0.999)) {
                                discard;
                            }
                            gl_FragColor = texture2D(sourceTexture, v_texCoords);
                        }`
        }));
    }
}