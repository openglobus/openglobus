import * as utils from '../utils/shared';
import {BaseGeoImage} from "../layer/BaseGeoImage";
import {Framebuffer} from '../webgl/Framebuffer';
import {LonLat} from '../LonLat';
import {Program} from '../webgl/Program';
import {Planet} from "../scene/Planet";
import {doubleToTwoFloats2} from "../math/coder";
import {WebGLBufferExt, WebGLTextureExt} from "../webgl/Handler";

export class GeoImageCreator {

    public MAX_FRAMES: number;

    protected _gridSize: number;
    protected _planet: Planet;
    public _framebuffer: Framebuffer | null;
    protected _framebufferMercProj: Framebuffer | null;
    public _texCoordsBuffer: WebGLBufferExt | null;
    public _indexBuffer: WebGLBufferExt | null;
    protected _currentFrame: number;
    protected _queue: BaseGeoImage[];
    protected _animate: BaseGeoImage[];
    protected _quadTexCoordsBuffer: WebGLBufferExt | null;
    protected _quadVertexBuffer: WebGLTextureExt | null;

    constructor(planet: Planet, maxFrames: number = 5) {
        this.MAX_FRAMES = maxFrames;
        this._gridSize = 64;
        this._planet = planet;
        this._framebuffer = null;
        this._framebufferMercProj = null;
        this._texCoordsBuffer = null;
        this._indexBuffer = null;
        this._currentFrame = 0;
        this._queue = [];
        this._animate = [];
        this._quadTexCoordsBuffer = null;
        this._quadVertexBuffer = null;
    }

    public init() {
        this._initShaders();
        this._initBuffers();
    }

    /**
     * Creates geoImage corners coordinates grid buffer.
     * @public
     * @param{Array.<LonLat>} c - GeoImage corners coordinates.
     * @param{boolean} [toMerc=false] - Transform to web mercator.
     * @return{WebGLBuffer} Grid coordinates buffer.
     */
    public createGridBuffer(c: LonLat[], toMerc: boolean = false): [WebGLBufferExt, WebGLBufferExt] {
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
                let xx = utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j)!;
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
            }
        }

        return [
            this._planet.renderer!.handler.createArrayBuffer(gridHigh, 2, halfSize),
            this._planet.renderer!.handler.createArrayBuffer(gridLow, 2, halfSize)
        ];
    }

    public frame() {
        let i = this.MAX_FRAMES;
        while (i-- && this._queue.length) {
            const q = this._queue.shift()!;
            q._isRendering = false;
            q.rendering();
            q.events.dispatch(q.events.loadend);
        }

        i = this._animate.length;
        while (i--) {
            this._animate[i].rendering();
        }
    }

    public add(geoImage: BaseGeoImage) {
        if (!geoImage._isRendering) {
            geoImage._isRendering = true;
            if (geoImage._animate) {
                this._animate.push(geoImage);
            } else {
                this._queue.push(geoImage);
            }
        }
    }

    public remove(geoImage: BaseGeoImage) {
        if (geoImage._isRendering) {
            geoImage._creationProceeding = false;
            geoImage._isRendering = false;
            let arr: BaseGeoImage[];
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

    protected _initBuffers() {

        let h = this._planet.renderer!.handler!;

        this._framebuffer = new Framebuffer(h, {width: 2, height: 2, useDepth: false});
        this._framebuffer.init();

        this._framebufferMercProj = new Framebuffer(h, {width: 2, height: 2, useDepth: false});
        this._framebufferMercProj.init();

        let gs = Math.log2(this._gridSize);

        this._texCoordsBuffer = this._planet._textureCoordsBufferCache[gs];

        this._indexBuffer = this._planet._indexesCache[gs][gs][gs][gs][gs].buffer;

        this._quadTexCoordsBuffer = h.createArrayBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2, 4);
        this._quadVertexBuffer = h.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);
    }

    protected _initShaders() {

        this._planet.renderer!.handler.addProgram(new Program("geoImageTransform", {
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