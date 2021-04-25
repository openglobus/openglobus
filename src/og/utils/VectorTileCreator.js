/**
 * @module og/utils/VectorTileCreator
 */

'use strict';

import * as quadTree from '../quadTree/quadTree.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { Program } from '../webgl/Program.js';
import { types } from '../webgl/types.js';
import { doubleToTwoFloats2 } from '../math/coder.js';

let tempArr = new Float32Array(2);

const VectorTileCreator = function (planet, maxFrames, width, height) {

    this._width = width || 256;
    this._height = height || 256;
    this._handler = planet.renderer.handler;
    this._planet = planet;
    this._framebuffer = null;
    this.MAX_FRAMES = maxFrames || 5;
    this._currentFrame = 0;
    this._queue = [];
    this._initialize();
};

VectorTileCreator.prototype._initialize = function () {

    //Line
    if (!this._handler.programs.vectorTileLineRasterization) {
        this._handler.addProgram(new Program("vectorTileLineRasterization", {
            uniforms: {
                'viewport': { type: types.VEC2 },
                'thicknessOutline': { type: types.FLOAT },
                'alpha': { type: types.FLOAT },
                'extentParamsHigh': "vec4",
                'extentParamsLow': "vec4"
            },
            attributes: {
                'prevHigh': { type: types.VEC2 },
                'currentHigh': { type: types.VEC2 },
                'nextHigh': { type: types.VEC2 },

                'prevLow': { type: types.VEC2 },
                'currentLow': { type: types.VEC2 },
                'nextLow': { type: types.VEC2 },

                'order': { type: types.FLOAT },
                'color': { type: types.VEC4 },
                'thickness': { type: types.FLOAT }
            },
            vertexShader:
                `attribute vec2 prevHigh;
                attribute vec2 currentHigh;
                attribute vec2 nextHigh;

                attribute vec2 prevLow;
                attribute vec2 currentLow;
                attribute vec2 nextLow;

                attribute float order;
                attribute float thickness;
                attribute vec4 color;
                uniform float thicknessOutline;
                uniform vec2 viewport;
                uniform vec4 extentParamsHigh;
                uniform vec4 extentParamsLow;
                varying vec4 vColor;
                
                vec2 proj(vec2 coordHigh, vec2 coordLow) {

                    //vec2 coordinates = coordHigh + coordLow;
                    //vec4 extentParams = extentParamsHigh + extentParamsLow;
                    //return vec2(-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0);

                    vec2 highDiff = coordHigh - extentParamsHigh.xy;
                    vec2 lowDiff = coordLow - extentParamsLow.xy;

                    return vec2(-1.0 + (highDiff + lowDiff) * (extentParamsHigh.zw + extentParamsLow.zw)) * vec2(1.0, -1.0);
                }
                
                void main(){
                    vColor = color;

                    //vec2 prev = prevHigh + prevLow;
                    //vec2 current = currentHigh + currentLow;
                    //vec2 next = nextHigh + nextLow;

                    vec2 vNext = proj(nextHigh, nextLow),
                         vCurrent = proj(currentHigh, currentLow),
                         vPrev = proj(prevHigh, prevLow);

                    vec2 _next = vNext;
                    vec2 _prev = vPrev;
                    vec2 _current = vCurrent;

                    if(_prev == _current){
                        if(_next == _current){
                            _next = _current + vec2(1.0, 0.0);
                            _prev = _current - _next;
                        }else{
                            _prev = _current + normalize(_current - _next);
                        }
                    }

                    if(_next == _current){
                        _next = _current + normalize(_current - _prev);
                    }

                    vec2 sNext = _next;
                    vec2 sCurrent = _current;
                    vec2 sPrev = _prev;
                    
                    vec2 dirNext = normalize(sNext - sCurrent);
                    vec2 dirPrev = normalize(sPrev - sCurrent);
                    float dotNP = dot(dirNext, dirPrev);
                    
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));
                    vec2 d = (thickness + thicknessOutline) * 0.5 * sign(order) / viewport;
                    
                    vec2 m;
                    if(dotNP >= 0.99991){
                        m = sCurrent - normalPrev * d;
                    }else{
                        vec2 dir = normalPrev + normalNext;
                        m = sCurrent + dir * d / (dirNext.x * dir.y - dirNext.y * dir.x);
                        
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
                            m = sCurrent + normalNext * d;
                        }
                    }
                    gl_Position = vec4(m.x, m.y, 0.0, 1.0);
                }`,
            fragmentShader: `precision highp float;
                uniform float alpha;
                varying vec4 vColor;
                void main() {
                    gl_FragColor = vec4(vColor.rgb, alpha * vColor.a);
                }`
        }));
    }

    //Polygon
    if (!this._handler.programs.vectorTilePolygonRasterization) {
        this._handler.addProgram(new Program("vectorTilePolygonRasterization", {
            uniforms: {
                'extentParams': { type: types.VEC4 }
            },
            attributes: {
                'coordinatesHigh': { type: types.VEC2 },
                'coordinatesLow': { type: types.VEC2 },
                'colors': { type: types.VEC4 }
            },
            vertexShader: 
                     `attribute vec2 coordinatesHigh;
                      attribute vec2 coordinatesLow; 
                      attribute vec4 colors; 
                      uniform vec4 extentParams; 
                      varying vec4 color;
                      void main() { 
                          vec2 coordinates = coordinatesHigh + coordinatesLow;
                          color = colors;
                          gl_Position = vec4((-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0); 
                      }`,
            fragmentShader: `precision highp float;
                        varying vec4 color;
                        void main () {  
                            gl_FragColor = color; 
                        }`
        }));
    }

    this._framebuffer = new Framebuffer(this._handler, {
        width: this._width,
        height: this._height,
        useDepth: false
    });
    this._framebuffer.init();
};

VectorTileCreator.prototype.frame = function () {
    if (this._planet.layerLock.isFree() && this._queue.length) {
        var h = this._handler,
            gl = h.gl;

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        var hLine = h.programs.vectorTileLineRasterization,
            hPoly = h.programs.vectorTilePolygonRasterization;

        var _w = this._width,
            _h = this._height,
            width = _w,
            height = _h,
            _w2 = width << 1,
            _h2 = height << 1;

        var pickingMask = null,
            texture = null;

        // var prevLayerId = -1;

        var extentParams = new Float32Array(4);

        var extentParamsHigh = new Float32Array(4);
        var extentParamsLow = new Float32Array(4);

        var f = this._framebuffer.activate();

        var deltaTime = 0,
            startTime = window.performance.now();

        while (this._planet.layerLock.isFree() && this._queue.length && deltaTime < 0.25) {
            var material = this._queue.shift();
            if (material.isLoading && material.segment.node.getState() === quadTree.RENDERING) {

                if (material.segment.tileZoom <= 3) {
                    width = _w2;
                    height = _h2;
                } else {
                    width = _w;
                    height = _h;
                }

                texture = (material._updateTexture && material._updateTexture) || h.createEmptyTexture_l(width, height);

                f.setSize(width, height);

                f.bindOutputTexture(texture);

                gl.clearColor(1.0, 1.0, 1.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                var extent = material.segment.getExtentMerc();

                extentParams[0] = extent.southWest.lon;
                extentParams[1] = extent.southWest.lat;
                extentParams[2] = 2.0 / extent.getWidth();
                extentParams[3] = 2.0 / extent.getHeight();

                hPoly.activate();
                var sh = hPoly._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;

                var geomHandler = material.layer._geometryHandler;

                //=========================================
                //Polygon rendering
                //=========================================
                gl.uniform4fv(shu.extentParams, extentParams);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyVerticesHighBufferMerc);
                gl.vertexAttribPointer(sha.coordinatesHigh, geomHandler._polyVerticesHighBufferMerc.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyVerticesHighBufferMerc);
                gl.vertexAttribPointer(sha.coordinatesLow, geomHandler._polyVerticesHighBufferMerc.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyColorsBuffer);
                gl.vertexAttribPointer(sha.colors, geomHandler._polyColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._polyIndexesBuffer);

                gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                //Polygon picking PASS
                if (material.layer._pickingEnabled) {
                    if (!material.pickingReady) {
                        if (material._updatePickingMask) {
                            pickingMask = material._updatePickingMask;
                        } else {
                            pickingMask = h.createEmptyTexture_n(width, height);
                        }

                        f.bindOutputTexture(pickingMask);

                        gl.clearColor(0.0, 0.0, 0.0, 0.0);
                        gl.clear(gl.COLOR_BUFFER_BIT);

                        gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyPickingColorsBuffer);
                        gl.vertexAttribPointer(sha.colors, geomHandler._polyPickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                        gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                    } else {
                        pickingMask = material.pickingMask;
                    }
                }

                //=========================================
                //Strokes and linestrings rendering
                //=========================================
                f.bindOutputTexture(texture);

                hLine.activate();
                sh = hLine._program;
                sha = sh.attributes;
                shu = sh.uniforms;

                gl.uniform2fv(shu.viewport, [width, height]);

                doubleToTwoFloats2(extent.southWest.lon, tempArr);
                extentParamsHigh[0] = tempArr[0];
                extentParamsLow[0] = tempArr[1];

                doubleToTwoFloats2(extent.southWest.lat, tempArr);
                extentParamsHigh[1] = tempArr[0];
                extentParamsLow[1] = tempArr[1];

                doubleToTwoFloats2(2.0 / extent.getWidth(), tempArr);
                extentParamsHigh[2] = tempArr[0];
                extentParamsLow[2] = tempArr[1];

                doubleToTwoFloats2(2.0 / extent.getHeight(), tempArr);
                extentParamsHigh[3] = tempArr[0];
                extentParamsLow[3] = tempArr[1];

                gl.uniform4fv(shu.extentParamsHigh, extentParamsHigh);
                gl.uniform4fv(shu.extentParamsLow, extentParamsLow);

                //vertex
                var mb = geomHandler._lineVerticesHighBufferMerc;
                gl.bindBuffer(gl.ARRAY_BUFFER, mb);

                gl.vertexAttribPointer(sha.prevHigh, mb.itemSize, gl.FLOAT, false, 8, 0);
                gl.vertexAttribPointer(sha.currentHigh, mb.itemSize, gl.FLOAT, false, 8, 32);
                gl.vertexAttribPointer(sha.nextHigh, mb.itemSize, gl.FLOAT, false, 8, 64);

                mb = geomHandler._lineVerticesLowBufferMerc;
                gl.bindBuffer(gl.ARRAY_BUFFER, mb);

                gl.vertexAttribPointer(sha.prevLow, mb.itemSize, gl.FLOAT, false, 8, 0);
                gl.vertexAttribPointer(sha.currentLow, mb.itemSize, gl.FLOAT, false, 8, 32);
                gl.vertexAttribPointer(sha.nextLow, mb.itemSize, gl.FLOAT, false, 8, 64);

                //order
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineOrdersBuffer);
                gl.vertexAttribPointer(sha.order, geomHandler._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._lineIndexesBuffer);

                //PASS - stroke
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokesBuffer);
                gl.vertexAttribPointer(sha.thickness, geomHandler._lineStrokesBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokeColorsBuffer);
                gl.vertexAttribPointer(sha.color, geomHandler._lineStrokeColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                //Antialias pass
                gl.uniform1f(shu.thicknessOutline, 2);
                gl.uniform1f(shu.alpha, 0.54);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                //
                //Aliased pass
                gl.uniform1f(shu.thicknessOutline, 1);
                gl.uniform1f(shu.alpha, 1.0);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                //PASS - inside line
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineThicknessBuffer);
                gl.vertexAttribPointer(sha.thickness, geomHandler._lineThicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineColorsBuffer);
                gl.vertexAttribPointer(sha.color, geomHandler._lineColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                //Antialias pass
                gl.uniform1f(shu.thicknessOutline, 2);
                gl.uniform1f(shu.alpha, 0.54);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                //
                //Aliased pass
                gl.uniform1f(shu.thicknessOutline, 1);
                gl.uniform1f(shu.alpha, 1.0);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                if (material.layer._pickingEnabled && !material.pickingReady) {
                    f.bindOutputTexture(pickingMask);
                    gl.uniform1f(shu.thicknessOutline, 8);
                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._linePickingColorsBuffer);
                    gl.vertexAttribPointer(sha.color, geomHandler._linePickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);
                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                }

                material.applyTexture(texture, pickingMask);

            } else {
                material.isLoading = false;
            }

            deltaTime = window.performance.now() - startTime;
            // prevLayerId = material.layer._id;
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        f.deactivate();
    }
};

VectorTileCreator.prototype.add = function (material) {
    this._queue.push(material);
};

VectorTileCreator.prototype.remove = function (material) {
    //...
};

export { VectorTileCreator };
