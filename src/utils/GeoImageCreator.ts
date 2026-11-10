import * as utils from "../utils/shared";
import { BaseGeoImage } from "../layer/BaseGeoImage";
import { Framebuffer } from "../webgl/Framebuffer";
import { LonLat } from "../LonLat";
import { ShaderProgram } from "../webgl/ShaderProgram";
import { Planet } from "../scene/Planet";
import { doubleToTwoFloats2 } from "../math/doubleToTwoFloats";
import type { WebGLBufferExt, WebGLTextureExt } from "../webgl/Handler";
import { RADIANS } from "../math";
import { CUBE_FACES } from "../proj/cube";
import type { CubeProj } from "../proj/cube";

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

    /**
     * Returns the points of the geoImage grid, row by row from the first corner, as createGridBuffer makes them.
     * @public
     * @param{Array.<LonLat>} c - GeoImage corners coordinates.
     * @return{Array.<LonLat>} -
     */
    public createGridLonLat(c: LonLat[]): LonLat[] {
        const gs = this._gridSize;

        const v03 = new LonLat((c[3].lon - c[0].lon) / gs, (c[3].lat - c[0].lat) / gs),
            v12 = new LonLat((c[2].lon - c[1].lon) / gs, (c[2].lat - c[1].lat) / gs),
            v01 = new LonLat((c[1].lon - c[0].lon) / gs, (c[1].lat - c[0].lat) / gs),
            v32 = new LonLat((c[2].lon - c[3].lon) / gs, (c[2].lat - c[3].lat) / gs);

        const points: LonLat[] = [];

        for (let i = 0; i <= gs; i++) {
            const P03i = new LonLat(c[0].lon + i * v03.lon, c[0].lat + i * v03.lat),
                P12i = new LonLat(c[1].lon + i * v12.lon, c[1].lat + i * v12.lat);

            for (let j = 0; j <= gs; j++) {
                const P01j = new LonLat(c[0].lon + j * v01.lon, c[0].lat + j * v01.lat),
                    P32j = new LonLat(c[3].lon + j * v32.lon, c[3].lat + j * v32.lat);
                points.push(utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j)!);
            }
        }

        return points;
    }

    /**
     * Creates the buffers of the grid point directions from the planet center, the surface normals in them, each
     * value in a float and the rest of it in another one.
     * @public
     * @param{Array.<LonLat>} points - Grid points.
     * @return{Array.<WebGLBuffer>} -
     */
    public createGridDirectionsBuffer(points: LonLat[]): [WebGLBufferExt, WebGLBufferExt] {
        const high = new Float32Array(points.length * 3),
            low = new Float32Array(points.length * 3);

        for (let i = 0; i < points.length; i++) {
            const lon = points[i].lon * RADIANS,
                lat = points[i].lat * RADIANS,
                d = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];

            for (let k = 0; k < 3; k++) {
                high[i * 3 + k] = d[k];
                low[i * 3 + k] = d[k] - high[i * 3 + k];
            }
        }

        const h = this._planet.renderer!.handler;

        return [h.createArrayBuffer(high, 3, points.length), h.createArrayBuffer(low, 3, points.length)];
    }

    /**
     * Sets the uniforms of the geoImageTransformPlane program for a rectangle of positions on a cube face: the face
     * plane with the rectangle center on it.
     * @public
     */
    public setCubePlaneUniforms(
        shu: Record<string, any>,
        proj: CubeProj,
        face: number,
        s0: number,
        s1: number,
        t0: number,
        t1: number
    ) {
        const gl = this._planet.renderer!.handler.gl!,
            f = CUBE_FACES[face],
            u = proj.toPlane((s0 + s1) * 0.5),
            v = proj.toPlane((t0 + t1) * 0.5),
            x = f[0] + u * f[3] + v * f[6],
            y = f[1] + u * f[4] + v * f[7],
            z = f[2] + u * f[5] + v * f[8],
            l = Math.sqrt(x * x + y * y + z * z),
            high = new Float32Array([x / l, y / l, z / l]),
            low = new Float32Array([x / l - high[0], y / l - high[1], z / l - high[2]]),
            k = proj.equiangular ? 4.0 / Math.PI : 1.0;

        gl.uniform3fv(shu.centerHigh, high);
        gl.uniform3fv(shu.centerLow, low);
        gl.uniform3fv(shu.axisC, [f[0], f[1], f[2]]);
        gl.uniform3fv(shu.axisU, [f[3], f[4], f[5]]);
        gl.uniform3fv(shu.axisV, [f[6], f[7], f[8]]);
        gl.uniform2fv(shu.center, [u, v]);
        gl.uniform2fv(shu.scale, [k / (s1 - s0), k / (t1 - t0)]);
        gl.uniform1f(shu.equiangular, proj.equiangular ? 1 : 0);
    }

    /**
     * Returns true when there is nothing left to rasterize and no animated
     * geo images(i.e. GeoVideo) are being played.
     * @public
     * @returns {boolean}
     */
    public get isIdle(): boolean {
        if (this._queue.length !== 0) {
            return false;
        }
        for (let i = 0; i < this._animate.length; i++) {
            if (this._animate[i].getVisibility()) {
                return false;
            }
        }
        return true;
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
            let ai = this._animate[i];
            if (ai.getVisibility()) {
                ai.rendering();
            }
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

            this._planet.renderer?.requestRedraw();
        }
    }

    public remove(geoImage: BaseGeoImage) {
        geoImage._creationProceeding = false;
        geoImage._isRendering = false;

        for (let i = 0; i < this._queue.length; i++) {
            if (this._queue[i].isEqual(geoImage)) {
                this._queue.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < this._animate.length; i++) {
            if (this._animate[i].isEqual(geoImage)) {
                this._animate.splice(i, 1);
                break;
            }
        }
    }

    protected _initBuffers() {
        let h = this._planet.renderer!.handler!;

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

    protected _initShaders() {
        this._planet.renderer!.handler.addProgram(
            new ShaderProgram("geoImageTransformPlane", {
                uniforms: {
                    sourceTexture: "sampler2d",
                    isFullExtent: "bool",
                    decodeSourceSRGB: "bool",
                    centerHigh: "vec3",
                    centerLow: "vec3",
                    axisU: "vec3",
                    axisV: "vec3",
                    axisC: "vec3",
                    center: "vec2",
                    scale: "vec2",
                    equiangular: "float"
                },
                attributes: {
                    cornersHigh: "vec3",
                    cornersLow: "vec3",
                    texCoords: "vec2"
                },
                vertexShader: `attribute vec3 cornersHigh;
                    attribute vec3 cornersLow;
                    attribute vec2 texCoords;
                    uniform vec3 centerHigh;
                    uniform vec3 centerLow;
                    uniform vec3 axisU;
                    uniform vec3 axisV;
                    uniform vec3 axisC;
                    uniform vec2 center;
                    uniform vec2 scale;
                    uniform float equiangular;
                    varying vec2 v_texCoords;
                    void main() {
                        v_texCoords = texCoords;
                        vec3 q = (cornersHigh - centerHigh) + (cornersLow - centerLow);
                        float qc = dot(q, axisC);
                        float w = dot(centerHigh, axisC) + dot(centerLow, axisC) + qc;
                        if (abs(w) < 1e-7) {
                            w = -1e-7;
                        }
                        vec2 d = vec2(dot(q, axisU) - center.x * qc, dot(q, axisV) - center.y * qc) / w;
                        if (equiangular > 0.5 && w > 0.0) {
                            d = vec2(atan(d.x, 1.0 + center.x * (center.x + d.x)), atan(d.y, 1.0 + center.y * (center.y + d.y)));
                        }
                        gl_Position = vec4(d * scale * vec2(1.0, -1.0) * w, 0.0, w);
                    }`,
                fragmentShader: `precision highp float;
                    uniform sampler2D sourceTexture;
                    uniform bool isFullExtent;
                    uniform bool decodeSourceSRGB;
                    varying vec2 v_texCoords;
                    void main () {
                        if(!isFullExtent && (v_texCoords.x <= 0.001 || v_texCoords.x >= 0.999 ||
                            v_texCoords.y <= 0.001 || v_texCoords.y >= 0.999)) {
                            discard;
                        }
                        vec4 color = texture2D(sourceTexture, v_texCoords);
                        if (decodeSourceSRGB) {
                            color.rgb = pow(color.rgb, vec3(2.2));
                        }
                        gl_FragColor = color;
                    }`
            })
        );

        this._planet.renderer!.handler.addProgram(
            new ShaderProgram("geoImageTransform", {
                uniforms: {
                    sourceTexture: "sampler2d",
                    extentParamsHigh: "vec4",
                    extentParamsLow: "vec4",
                    isFullExtent: "bool",
                    decodeSourceSRGB: "bool"
                },
                attributes: {
                    cornersHigh: "vec2",
                    cornersLow: "vec2",
                    texCoords: "vec2"
                },
                vertexShader: `attribute vec2 cornersHigh;
                     attribute vec2 cornersLow;
                      attribute vec2 texCoords;
                      uniform vec4 extentParamsHigh;
                      uniform vec4 extentParamsLow;
                      varying vec2 v_texCoords;
                      void main() {
                          v_texCoords = texCoords;
                          vec2 highDiff = cornersHigh - extentParamsHigh.xy;
                          vec2 lowDiff = cornersLow - extentParamsLow.xy;
                          gl_Position = vec4((-1.0 + (highDiff * step(1.0, length(highDiff)) + lowDiff) * extentParamsHigh.zw) * vec2(1.0, -1.0), 0.0, 1.0);
                      }`,
                fragmentShader: `precision highp float;
                        uniform sampler2D sourceTexture;
                        uniform bool isFullExtent;
                        uniform bool decodeSourceSRGB;
                        varying vec2 v_texCoords;
                        void main () {
                            if(!isFullExtent && (v_texCoords.x <= 0.001 || v_texCoords.x >= 0.999 ||
                                v_texCoords.y <= 0.001 || v_texCoords.y >= 0.999)) {
                                discard;
                            }
                            vec4 color = texture2D(sourceTexture, v_texCoords);
                            if (decodeSourceSRGB) {
                                color.rgb = pow(color.rgb, vec3(2.2));
                            }
                            gl_FragColor = color;
                        }`
            })
        );
    }
}
