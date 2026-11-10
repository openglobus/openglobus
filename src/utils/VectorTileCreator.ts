import { doubleToTwoFloats2 } from "../math/doubleToTwoFloats";
import { Framebuffer } from "../webgl/Framebuffer";
import { Handler } from "../webgl/Handler";
import { Material } from "../layer/Material";
import { ShaderProgram } from "../webgl/ShaderProgram";
import { Planet } from "../scene/Planet";
import { NOTRENDERING } from "../quadTree/quadTree";
import { Vector } from "../layer/Vector";
import { CUBE_FACES, CubeProj, isCubeProj } from "../proj/cube";
import type { Segment } from "../segment/Segment";

//
//@todo: single pass vector rendering
//

let tempArr = new Float32Array(2);

const MAX_FRAME_TIME = 50.0;

// The tile is a rectangle of longitudes and latitudes taken in the Web Mercator coordinates, as the vertices are: the
// Mercator tiles, the polar caps of the Earth and the tiles of the EPSG4326, Equi and Wgs84 strategies
const EXTENT_PROJ = `uniform vec4 extentParamsHigh;
                uniform vec4 extentParamsLow;

                vec2 proj(vec2 coordHigh, vec2 coordLow, out float w) {
                    w = 1.0;
                    vec2 highDiff = coordHigh - extentParamsHigh.xy;
                    vec2 lowDiff = coordLow - extentParamsLow.xy;
                    return vec2(-1.0 + (highDiff * step(1.0, length(highDiff)) + lowDiff) * extentParamsHigh.zw) * vec2(1.0, -1.0);
                }`;

// The tile is a rectangle on a plane and the vertices are directions from the planet center. The offset q from the
// direction of the tile center is small, so floats keep the precision. An equiangular tile is a rectangle of angles.
// w is the distance to the plane, a triangle with a vertex behind the plane is clipped by it as a camera does, the
// vertex behind goes by its plane coordinates, so the clipped part goes away from the tile.
const PLANE_PROJ = `uniform vec3 centerHigh;
                uniform vec3 centerLow;
                uniform vec3 axisU;
                uniform vec3 axisV;
                uniform vec3 axisC;
                uniform vec2 center;
                uniform vec2 scale;
                uniform float equiangular;

                vec2 proj(vec3 coordHigh, vec3 coordLow, out float w) {
                    if (dot(coordHigh, coordHigh) == 0.0) {
                        w = -1.0;
                        return vec2(0.0);
                    }
                    vec3 q = (coordHigh - centerHigh) + (coordLow - centerLow);
                    float qc = dot(q, axisC);
                    float pc = dot(centerHigh, axisC) + dot(centerLow, axisC) + qc;
                    if (abs(pc) < 1e-7) {
                        pc = -1e-7;
                    }
                    w = pc;
                    vec2 d = vec2(dot(q, axisU) - center.x * qc, dot(q, axisV) - center.y * qc) / pc;
                    if (equiangular > 0.5 && pc > 0.0) {
                        d = vec2(atan(d.x, 1.0 + center.x * (center.x + d.x)), atan(d.y, 1.0 + center.y * (center.y + d.y)));
                    }
                    return d * scale * vec2(1.0, -1.0);
                }`;

const EXTENT_UNIFORMS = {
    extentParamsHigh: "vec4",
    extentParamsLow: "vec4"
};

const PLANE_UNIFORMS = {
    centerHigh: "vec3",
    centerLow: "vec3",
    axisU: "vec3",
    axisV: "vec3",
    axisC: "vec3",
    center: "vec2",
    scale: "vec2",
    equiangular: "float"
};

const lineVertexShader = (coord: string, proj: string) => `attribute ${coord} prevHigh;
                attribute ${coord} currentHigh;
                attribute ${coord} nextHigh;

                attribute ${coord} prevLow;
                attribute ${coord} currentLow;
                attribute ${coord} nextLow;

                attribute float order;
                attribute float thickness;
                attribute vec4 color;
                uniform float thicknessOutline;
                uniform vec2 viewport;
                varying vec4 vColor;
${proj}

                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2, float eps) {
                    vec2 dir = end2 - start2;
                    vec2 perp = vec2(-dir.y, dir.x);
                    float d2 = dot(perp, start2);
                    float seg = dot(perp, start1) - d2;
                    float prl = seg - dot(perp, end1) + d2;
                    if (prl > -eps && prl < eps) {
                        return start1;
                    }
                    float u = seg / prl;
                    return start1 + u * (end1 - start1);
                }

                vec2 safeNormalize(vec2 v, vec2 fallback, float eps) {
                    float len2 = dot(v, v);
                    if (len2 > eps * eps) {
                        return v * inversesqrt(len2);
                    }
                    return fallback;
                }

                void main(){
                    vColor = color;
                    float eps = 2.0 / max(viewport.x, viewport.y);

                    float w, wNext, wPrev;
                    vec2 vNext = proj(nextHigh, nextLow, wNext),
                         vCurrent = proj(currentHigh, currentLow, w),
                         vPrev = proj(prevHigh, prevLow, wPrev);

                    vec2 _next = vNext;
                    vec2 _prev = vPrev;
                    vec2 _current = vCurrent;

                    if(distance(_prev, _current) < eps){
                        if(distance(_next, _current) < eps){
                            _next = _current + vec2(1.0, 0.0);
                            _prev = _current - vec2(1.0, 0.0);
                        }else{
                            _prev = _current + safeNormalize(_current - _next, vec2(1.0, 0.0), eps);
                        }
                    }

                    if(distance(_next, _current) < eps){
                        _next = _current + safeNormalize(_current - _prev, vec2(-1.0, 0.0), eps);
                    }

                    vec2 sNext = _next;
                    vec2 sCurrent = _current;
                    vec2 sPrev = _prev;

                    vec2 dirNext = safeNormalize(sNext - sCurrent, vec2(1.0, 0.0), eps);
                    vec2 dirPrev = safeNormalize(sPrev - sCurrent, -dirNext, eps);
                    float dotNP = clamp(dot(dirNext, dirPrev), -1.0, 1.0);

                    vec2 normalNext = safeNormalize(vec2(-dirNext.y, dirNext.x), vec2(0.0, 1.0), eps);
                    vec2 normalPrev = safeNormalize(vec2(dirPrev.y, -dirPrev.x), vec2(0.0, 1.0), eps);
                    vec2 sideNormal = abs(order) == 1.0 ? normalPrev : normalNext;
                    float side = sign(order);
                    vec2 d = (thickness + thicknessOutline) * 0.5 * side / viewport;

                    vec2 m;
                    float lenNext = distance(sCurrent, sNext);
                    float lenPrev = distance(sCurrent, sPrev);
                    if(lenNext < eps || lenPrev < eps){
                        m = sCurrent + sideNormal * d;
                    }else if(dotNP >= 0.99991){
                        m = sCurrent - normalPrev * d;
                    }else{
                        m = getIntersection(sCurrent + normalPrev * d, sPrev + normalPrev * d,
                                            sCurrent + normalNext * d, sNext + normalNext * d, eps);

                        if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){
                            float occw = order * sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);
                            if(occw == -1.0){
                                m = sCurrent + normalPrev * d;
                            }else if(occw == 1.0){
                                m = sCurrent + normalNext * d;
                            }else if(occw == -2.0){
                                m = sCurrent + normalNext * d;
                            }else if(occw == 2.0){
                                m = sCurrent + normalPrev * d;
                            }
                        }else if(distance(sCurrent, m) > min(distance(sCurrent, sNext), distance(sCurrent, sPrev))){
                            m = sCurrent + sideNormal * d;
                        }
                    }
                    float sameSide = dot(m - sCurrent, sideNormal) * side;
                    float wrongSide = 1.0 - step(0.0, sameSide);
                    m = mix(m, sCurrent + sideNormal * d, wrongSide);
                    gl_Position = vec4(m * w, 0.0, w);
                }`;

const LINE_FRAGMENT_SHADER = `precision highp float;
                uniform float alpha;
                varying vec4 vColor;
                void main() {
                    gl_FragColor = vec4(vColor.rgb, alpha * vColor.a);
                }`;

const polygonVertexShader = (coord: string, proj: string) => `attribute ${coord} coordinatesHigh;
                attribute ${coord} coordinatesLow;
                attribute vec4 colors;
                varying vec4 color;
${proj}

                void main() {
                    color = colors;
                    float w;
                    vec2 p = proj(coordinatesHigh, coordinatesLow, w);
                    gl_Position = vec4(p * w, 0.0, w);
                }`;

const POLYGON_FRAGMENT_SHADER = `precision highp float;
                varying vec4 color;
                void main () {
                    gl_FragColor = color;
                }`;

function lineProgram(name: string, coord: string, proj: string, uniforms: Record<string, string>) {
    return new ShaderProgram(name, {
        uniforms: {
            viewport: "vec2",
            thicknessOutline: "float",
            alpha: "float",
            ...uniforms
        },
        attributes: {
            prevHigh: coord,
            currentHigh: coord,
            nextHigh: coord,

            prevLow: coord,
            currentLow: coord,
            nextLow: coord,

            order: "float",
            color: "vec4",
            thickness: "float"
        },
        vertexShader: lineVertexShader(coord, proj),
        fragmentShader: LINE_FRAGMENT_SHADER
    });
}

function polygonProgram(name: string, coord: string, proj: string, uniforms: Record<string, string>) {
    return new ShaderProgram(name, {
        uniforms,
        attributes: {
            coordinatesHigh: coord,
            coordinatesLow: coord,
            colors: "vec4"
        },
        vertexShader: polygonVertexShader(coord, proj),
        fragmentShader: POLYGON_FRAGMENT_SHADER
    });
}

// The plane of the tile
const _plane = {
    centerHigh: new Float32Array(3),
    centerLow: new Float32Array(3),
    axisU: new Float32Array(3),
    axisV: new Float32Array(3),
    axisC: new Float32Array(3),
    center: new Float32Array(2),
    scale: new Float32Array(2),
    equiangular: 0
};

export class VectorTileCreator {
    protected _width: number;
    protected _height: number;
    protected _planet: Planet;
    protected _framebuffer: Framebuffer | null;
    protected _queue: Material[];
    protected _handler: Handler | null;

    constructor(planet: Planet, width: number = 256, height: number = 256) {
        this._width = width;
        this._height = height;
        this._planet = planet;
        this._framebuffer = null;
        this._queue = [];
        this._handler = null;
    }

    public init() {
        this._handler = this._planet.renderer!.handler;

        const programs: [string, () => ShaderProgram][] = [
            [
                "vectorTileLineRasterization",
                () => lineProgram("vectorTileLineRasterization", "vec2", EXTENT_PROJ, EXTENT_UNIFORMS)
            ],
            [
                "vectorTilePolygonRasterization",
                () => polygonProgram("vectorTilePolygonRasterization", "vec2", EXTENT_PROJ, EXTENT_UNIFORMS)
            ],
            [
                "vectorTileLineRasterizationPlane",
                () => lineProgram("vectorTileLineRasterizationPlane", "vec3", PLANE_PROJ, PLANE_UNIFORMS)
            ],
            [
                "vectorTilePolygonRasterizationPlane",
                () => polygonProgram("vectorTilePolygonRasterizationPlane", "vec3", PLANE_PROJ, PLANE_UNIFORMS)
            ]
        ];

        for (const [name, create] of programs) {
            if (!this._handler.programs[name]) {
                this._handler.addProgram(create());
            }
        }

        this._framebuffer = new Framebuffer(this._handler, {
            width: this._width,
            height: this._height,
            useDepth: false
        });

        this._framebuffer.init();
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
        if (this._planet.layerLock.isFree() && this._queue.length) {
            let h = this._handler!,
                gl = h.gl!;

            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);

            let hLine = h.programs.vectorTileLineRasterization,
                hPoly = h.programs.vectorTilePolygonRasterization;

            let _w = this._width,
                _h = this._height,
                width = _w,
                height = _h,
                _w2 = width << 1,
                _h2 = height << 1;

            // var prevLayerId = -1;

            let extentParamsHigh = new Float32Array(4);
            let extentParamsLow = new Float32Array(4);

            let f = this._framebuffer!.activate();

            let deltaTime = 0,
                startTime = window.performance.now();

            while (this._queue.length && deltaTime < MAX_FRAME_TIME) {
                let material = this._queue.shift()!;
                const node = material.segment.node;
                if (material.isLoading && (node.getState() !== NOTRENDERING || node.isInFadingTransition())) {
                    let pickingEnabled = material.layer._pickingEnabled;

                    if (material.segment.tileZoom < 4) {
                        width = _w2;
                        height = _h2;
                    } else {
                        width = _w;
                        height = _h;
                    }

                    let texture = material._updateTexture || h.createEmptyTexture_l(width, height);
                    let pickingMask = pickingEnabled
                        ? material._updatePickingMask || h.createEmptyTexture_n(width, height)
                        : null;

                    material.applyTexture(texture, pickingMask);

                    f.setSize(width, height);

                    f.bindOutputTexture(texture!);

                    gl.clearColor(0.0, 0.0, 0.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    let extent = material.segment.getExtentMerc();

                    doubleToTwoFloats2(extent.southWest.lon, tempArr);
                    extentParamsHigh[0] = tempArr[0];
                    extentParamsLow[0] = tempArr[1];

                    doubleToTwoFloats2(extent.southWest.lat, tempArr);
                    extentParamsHigh[1] = tempArr[0];
                    extentParamsLow[1] = tempArr[1];

                    extentParamsHigh[2] = 2.0 / extent.getWidth();
                    extentParamsHigh[3] = 2.0 / extent.getHeight();

                    let geomHandler = (material.layer as Vector)._geometryHandler;

                    // A cube tile draws the directions of the vertices on its plane
                    const plane = geomHandler._isCube ? this._getTilePlane(material.segment) : null;

                    let sh = plane ? h.programs.vectorTilePolygonRasterizationPlane : hPoly;
                    sh.activate();
                    let sha = sh.attributes,
                        shu = sh.uniforms;

                    //=========================================
                    //Polygon rendering
                    //=========================================
                    if (plane) {
                        this._applyTilePlane(gl, shu, plane);
                    } else {
                        gl.uniform4fv(shu.extentParamsHigh, extentParamsHigh);
                        gl.uniform4fv(shu.extentParamsLow, extentParamsLow);
                    }

                    const polyHigh = plane
                            ? geomHandler._polyDirectionsHighBuffer!
                            : geomHandler._polyVerticesHighBufferMerc!,
                        polyLow = plane
                            ? geomHandler._polyDirectionsLowBuffer!
                            : geomHandler._polyVerticesLowBufferMerc!;

                    gl.bindBuffer(gl.ARRAY_BUFFER, polyHigh);
                    gl.vertexAttribPointer(sha.coordinatesHigh, polyHigh.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, polyLow);
                    gl.vertexAttribPointer(sha.coordinatesLow, polyLow.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyColorsBuffer!);
                    gl.vertexAttribPointer(sha.colors, geomHandler._polyColorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._polyIndexesBuffer!);

                    gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

                    //Polygon picking PASS
                    if (pickingEnabled) {
                        f.bindOutputTexture(pickingMask!);

                        gl.clearColor(0.0, 0.0, 0.0, 0.0);
                        gl.clear(gl.COLOR_BUFFER_BIT);

                        gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyPickingColorsBuffer!);
                        gl.vertexAttribPointer(
                            sha.colors,
                            geomHandler._polyPickingColorsBuffer!.itemSize,
                            gl.FLOAT,
                            false,
                            0,
                            0
                        );

                        gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);
                    }

                    //=========================================
                    //Strokes and linestrings rendering
                    //=========================================
                    f.bindOutputTexture(texture!);

                    sh = plane ? h.programs.vectorTileLineRasterizationPlane : hLine;
                    sh.activate();
                    sha = sh.attributes;
                    shu = sh.uniforms;

                    gl.uniform2fv(shu.viewport, [width, height]);

                    if (plane) {
                        this._applyTilePlane(gl, shu, plane);
                    } else {
                        gl.uniform4fv(shu.extentParamsHigh, extentParamsHigh);
                        gl.uniform4fv(shu.extentParamsLow, extentParamsLow);
                    }

                    //vertex, a point goes four times, so the previous and the next ones are four vertices away
                    let mb = plane ? geomHandler._lineDirectionsHighBuffer! : geomHandler._lineVerticesHighBufferMerc!;
                    const stride = mb.itemSize * 4;
                    gl.bindBuffer(gl.ARRAY_BUFFER, mb);

                    gl.vertexAttribPointer(sha.prevHigh, mb.itemSize, gl.FLOAT, false, stride, 0);
                    gl.vertexAttribPointer(sha.currentHigh, mb.itemSize, gl.FLOAT, false, stride, stride * 4);
                    gl.vertexAttribPointer(sha.nextHigh, mb.itemSize, gl.FLOAT, false, stride, stride * 8);

                    mb = plane ? geomHandler._lineDirectionsLowBuffer! : geomHandler._lineVerticesLowBufferMerc!;
                    gl.bindBuffer(gl.ARRAY_BUFFER, mb);

                    gl.vertexAttribPointer(sha.prevLow, mb.itemSize, gl.FLOAT, false, stride, 0);
                    gl.vertexAttribPointer(sha.currentLow, mb.itemSize, gl.FLOAT, false, stride, stride * 4);
                    gl.vertexAttribPointer(sha.nextLow, mb.itemSize, gl.FLOAT, false, stride, stride * 8);

                    //order
                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineOrdersBuffer!);
                    gl.vertexAttribPointer(sha.order, geomHandler._lineOrdersBuffer!.itemSize, gl.FLOAT, false, 4, 0);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._lineIndexesBuffer!);

                    //PASS - stroke
                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokesBuffer!);
                    gl.vertexAttribPointer(
                        sha.thickness,
                        geomHandler._lineStrokesBuffer!.itemSize,
                        gl.FLOAT,
                        false,
                        0,
                        0
                    );

                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokeColorsBuffer!);
                    gl.vertexAttribPointer(
                        sha.color,
                        geomHandler._lineStrokeColorsBuffer!.itemSize,
                        gl.FLOAT,
                        false,
                        0,
                        0
                    );

                    //Antialias pass
                    gl.uniform1f(shu.thicknessOutline, 2);
                    gl.uniform1f(shu.alpha, 0.54);
                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);
                    //
                    //Aliased pass
                    gl.uniform1f(shu.thicknessOutline, 1);
                    gl.uniform1f(shu.alpha, 1.0);
                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

                    //PASS - inside line
                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineThicknessBuffer!);
                    gl.vertexAttribPointer(
                        sha.thickness,
                        geomHandler._lineThicknessBuffer!.itemSize,
                        gl.FLOAT,
                        false,
                        0,
                        0
                    );

                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineColorsBuffer!);
                    gl.vertexAttribPointer(sha.color, geomHandler._lineColorsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

                    //Antialias pass
                    gl.uniform1f(shu.thicknessOutline, 2);
                    gl.uniform1f(shu.alpha, 0.54);
                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);
                    //
                    //Aliased pass
                    gl.uniform1f(shu.thicknessOutline, 1);
                    gl.uniform1f(shu.alpha, 1.0);
                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer!.numItems, gl.UNSIGNED_INT, 0);

                    if (pickingEnabled) {
                        f.bindOutputTexture(pickingMask!);
                        gl.uniform1f(shu.thicknessOutline, 8);
                        gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._linePickingColorsBuffer!);
                        gl.vertexAttribPointer(
                            sha.color,
                            geomHandler._linePickingColorsBuffer!.itemSize,
                            gl.FLOAT,
                            false,
                            0,
                            0
                        );
                        gl.drawElements(
                            gl.TRIANGLE_STRIP,
                            geomHandler._lineIndexesBuffer!.numItems,
                            gl.UNSIGNED_INT,
                            0
                        );
                    }
                } else {
                    material.isLoading = false;
                }

                deltaTime = window.performance.now() - startTime;
            }

            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);

            f.deactivate();
        }
    }

    /**
     * Returns the plane of a cube tile: its face plane with the tile center on it, or null for a tile of another
     * projection.
     * @protected
     */
    protected _getTilePlane(segment: Segment): typeof _plane | null {
        if (!isCubeProj(segment._projection)) {
            return null;
        }

        const proj = segment._projection as CubeProj;

        const face = segment.tileGroup,
            f = CUBE_FACES[face],
            e = segment.getExtent(),
            s0 = e.southWest.lon - face,
            s1 = e.northEast.lon - face,
            t0 = e.southWest.lat,
            t1 = e.northEast.lat,
            u = proj.toPlane((s0 + s1) * 0.5),
            v = proj.toPlane((t0 + t1) * 0.5);

        const x = f[0] + u * f[3] + v * f[6],
            y = f[1] + u * f[4] + v * f[7],
            z = f[2] + u * f[5] + v * f[8],
            l = Math.sqrt(x * x + y * y + z * z),
            c = [x / l, y / l, z / l];

        for (let i = 0; i < 3; i++) {
            _plane.centerHigh[i] = c[i];
            _plane.centerLow[i] = c[i] - _plane.centerHigh[i];
            _plane.axisC[i] = f[i];
            _plane.axisU[i] = f[3 + i];
            _plane.axisV[i] = f[6 + i];
        }

        // Plane coordinates are twice the position for the common cube, the angles are a quarter of pi for it on
        // the equiangular one
        const k = proj.equiangular ? 4.0 / Math.PI : 1.0;

        _plane.center[0] = u;
        _plane.center[1] = v;
        _plane.scale[0] = k / (s1 - s0);
        _plane.scale[1] = k / (t1 - t0);
        _plane.equiangular = proj.equiangular ? 1 : 0;

        return _plane;
    }

    protected _applyTilePlane(gl: WebGL2RenderingContext, shu: Record<string, any>, plane: typeof _plane) {
        gl.uniform3fv(shu.centerHigh, plane.centerHigh);
        gl.uniform3fv(shu.centerLow, plane.centerLow);
        gl.uniform3fv(shu.axisU, plane.axisU);
        gl.uniform3fv(shu.axisV, plane.axisV);
        gl.uniform3fv(shu.axisC, plane.axisC);
        gl.uniform2fv(shu.center, plane.center);
        gl.uniform2fv(shu.scale, plane.scale);
        gl.uniform1f(shu.equiangular, plane.equiangular);
    }

    public add(material: Material) {
        this._queue.push(material);
    }

    public remove(material: Material) {
        //...
    }

    public get queueSize(): number {
        return this._queue.length;
    }
}
