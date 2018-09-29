/**
 * @module og/gmx/GmxVectorTileCreator
 */

'use strict';

import { VectorTileCreator } from '../../utils/VectorTileCreator.js';
import { inherits } from '../../inherits.js';
import { RENDERING } from '../../quadTree/quadTree.js';
import { Program } from '../../webgl/Program.js';
import { types } from '../../webgl/types.js';
import { Framebuffer } from '../../webgl/Framebuffer.js';

const GmxVectorTileCreator = function (planet, maxFrames, width, height) {

    VectorTileCreator.call(this, planet, maxFrames, width, height);

    this._maskTexture = null;

    this._framebuffer = null;

    this._temporaryData_ = null;

    planet.events.on("draw", this.frame, this);
};

inherits(GmxVectorTileCreator, VectorTileCreator);

GmxVectorTileCreator.appendLineData = function (pathArr, isClosed, outVertices, outOrders, outIndexes) {
    var index = 0;

    if (outIndexes.length > 0) {
        index = outIndexes[outIndexes.length - 5] + 9;
        outIndexes.push(index, index);
    } else {
        outIndexes.push(0, 0);
    }

    for (var j = 0; j < pathArr.length; j++) {
        var path = pathArr[j];
        var startIndex = index;
        var last;
        if (isClosed) {
            last = path[path.length - 1];
        } else {
            let p0 = path[0],
                p1 = path[1];
            last = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
        }
        outVertices.push(last[0], last[1], last[0], last[1], last[0], last[1], last[0], last[1]);
        outOrders.push(1, -1, 2, -2);

        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            outVertices.push(cur[0], cur[1], cur[0], cur[1], cur[0], cur[1], cur[0], cur[1]);
            outOrders.push(1, -1, 2, -2);
            outIndexes.push(index++, index++, index++, index++);
        }

        var first;
        if (isClosed) {
            first = path[0];
            outIndexes.push(startIndex, startIndex + 1, startIndex + 1, startIndex + 1);
        } else {
            let p0 = path[path.length - 1],
                p1 = path[path.length - 2];
            first = [p0[0] + p0[0] - p1[0], p0[1] + p0[1] - p1[1]];
            outIndexes.push(index - 1, index - 1, index - 1, index - 1);
        }
        outVertices.push(first[0], first[1], first[0], first[1], first[0], first[1], first[0], first[1]);
        outOrders.push(1, -1, 2, -2);

        if (j < pathArr.length - 1) {
            index += 8;
            outIndexes.push(index, index);
        }
    }
};

GmxVectorTileCreator.prototype._initialize = function () {

    //Line
    if (!this._handler.programs.gmxVectorTileLineRasterization) {
        this._handler.addProgram(new Program("gmxVectorTileLineRasterization", {
            uniforms: {
                'viewport': { type: types.VEC2 },
                'thicknessOutline': { type: types.FLOAT },
                'alpha': { type: types.FLOAT },
                'extentParams': { type: types.VEC4 },
                'color': { type: types.VEC4 },
                'thickness': { type: types.FLOAT }
            },
            attributes: {
                'prev': { type: types.VEC2 },
                'current': { type: types.VEC2 },
                'next': { type: types.VEC2 },
                'order': { type: types.FLOAT }
            },
            vertexShader: `attribute vec2 prev;
                    attribute vec2 current;
                    attribute vec2 next;
                    attribute float order;
                    uniform float thickness;
                    uniform float thicknessOutline;
                    uniform vec2 viewport;
                    uniform vec4 extentParams;
                    
                    vec2 proj(vec2 coordinates){
                        return vec2(-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0);
                    }
                    
                    void main(){
                        vec2 _next = next;
                        vec2 _prev = prev;
                        if(prev == current){
                            if(next == current){
                                _next = current + vec2(1.0, 0.0);
                                _prev = current - next;
                            }else{
                                _prev = current + normalize(current - next);
                            }
                        }
                        if(next == current){
                            _next = current + normalize(current - _prev);
                        }
                        
                        vec2 sNext = proj(_next),
                             sCurrent = proj(current),
                             sPrev = proj(_prev);
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
                    uniform vec4 color;
                    void main() {
                        gl_FragColor = vec4(color.rgb, alpha * color.a);
                    }`
        }));
    }

    //Polygon
    if (!this._handler.programs.gmxVectorTilePolygonRasterization) {
        this._handler.addProgram(new Program("gmxVectorTilePolygonRasterization", {
            uniforms: {
                'extentParams': { type: types.VEC4 },
                'color': { type: types.VEC4 }
            },
            attributes: {
                'coordinates': { type: types.VEC2 }
            },
            vertexShader: `attribute vec2 coordinates;
                          uniform vec4 extentParams;
                          void main() {
                              gl_Position = vec4((-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0);
                          }`,
            fragmentShader: `precision highp float;
                            uniform vec4 color;
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

    this._temporaryData_ = new Uint8Array(4 * this._width * this._height);

    this._maskTexture = this._handler.createEmptyTexture_n(this._width, this._height);
};

GmxVectorTileCreator.prototype.add = function (data) {
    this._queue.push(data);
};

GmxVectorTileCreator.prototype.frame = function () {

    if (this._planet.layerLock.isFree() && this._queue.length) {

        const h = this._handler;
        const gl = h.gl;
        const p = this._planet;
        const hLine = h.programs.gmxVectorTileLineRasterization;
        const hPoly = h.programs.gmxVectorTilePolygonRasterization;

        const f = this._framebuffer.activate();

        const _w = this._width;
        const _h = this._height;
        const _w2 = _w << 1;
        const _h2 = _h << 1;

        let width = _w,
            height = _h;

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        let deltaTime = 0,
            startTime = window.performance.now();

        while (p.layerLock.isFree() && this._queue.length && deltaTime < 0.25) {

            let q = this._queue.shift(),
                fromTile = q.fromTile,
                material = q.material;

            if (material.isLoading && material.segment.node.getState() === RENDERING) {

                let layer = material.layer,
                    tItems = fromTile.tileItemArr,
                    materialZoom = material.segment.tileZoom,
                    zoomAvailable = materialZoom >= layer._gmxProperties.RCMinZoomForRasters,
                    extent = material.segment.getExtentMerc(),
                    extentParams = [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()];

                material.setTotalItems(tItems.length);

                //
                //TODO: sort optimization is needed PLEASE!!!! PLEASE!!!!
                tItems.sort(function (a, b) {
                    return layer.getItemStyle(a.item).zIndex - layer.getItemStyle(b.item).zIndex || a.item.id - b.item.id;
                });
                //


                if (materialZoom <= 3) {
                    width = _w2;
                    height = _h2;
                } else {
                    width = _w;
                    height = _h;
                }

                f.setSize(width, height);

                let texture = material.texture,
                    pickingMask = material.pickingMask;

                if (material._completedItems === 0) {
                    texture = material._updateTexture && material._updateTexture || h.createEmptyTexture_l(width, height);
                    if (layer._pickingEnabled && !material.pickingReady) {
                        if (material._updatePickingMask) {
                            pickingMask = material._updatePickingMask;
                        } else {
                            pickingMask = h.createEmptyTexture_n(width, height);
                        }
                    }

                    f.bindOutputTexture(texture);
                    gl.clearColor(1.0, 1.0, 1.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    f.bindOutputTexture(pickingMask);
                    gl.clearColor(0.0, 0.0, 0.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }

                let i = 0;
                while (i < 200 && material._completedItems < material._totalItems) {

                    let ti = tItems[material._completedItems];

                    if (layer.getItemVisibility(ti.item) && ti.extent.overlaps(extent)) {

                        let style = layer.getItemStyle(ti.item),
                            pickingColor = [ti.item._pickingColor.x / 255.0, ti.item._pickingColor.y / 255.0, ti.item._pickingColor.z / 255.0, 1.0];

                        hPoly.activate();

                        let sh = hPoly._program,
                            sha = sh.attributes,
                            shu = sh.uniforms;

                        //==============
                        //polygon
                        //==============
                        f.bindOutputTexture(texture);
                        gl.uniform4fv(shu.color, [style.fillColor.x, style.fillColor.y, style.fillColor.z, style.fillColor.w]);
                        gl.uniform4fv(shu.extentParams, extentParams);

                        gl.bindBuffer(gl.ARRAY_BUFFER, ti._polyVerticesBufferMerc);
                        gl.vertexAttribPointer(sha.coordinates, ti._polyVerticesBufferMerc.itemSize, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ti._polyIndexesBuffer);
                        gl.drawElements(gl.TRIANGLES, ti._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        //Polygon picking pass
                        //if (!material.pickingReady) {
                        f.bindOutputTexture(pickingMask);
                        gl.uniform4fv(shu.color, pickingColor);
                        gl.drawElements(gl.TRIANGLES, ti._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                        //} else {
                        //    pickingMask = material.pickingMask;
                        //}

                        //==============
                        //Outline
                        //==============
                        hLine.activate();
                        sh = hLine._program;
                        sha = sh.attributes;
                        shu = sh.uniforms;

                        f.bindOutputTexture(texture);

                        gl.uniform2fv(shu.viewport, [width, height]);
                        gl.uniform4fv(shu.extentParams, extentParams);

                        //vertex
                        var mb = ti._lineVerticesBufferMerc;
                        gl.bindBuffer(gl.ARRAY_BUFFER, mb);
                        gl.vertexAttribPointer(sha.prev, mb.itemSize, gl.FLOAT, false, 8, 0);
                        gl.vertexAttribPointer(sha.current, mb.itemSize, gl.FLOAT, false, 8, 32);
                        gl.vertexAttribPointer(sha.next, mb.itemSize, gl.FLOAT, false, 8, 64);

                        //order
                        gl.bindBuffer(gl.ARRAY_BUFFER, ti._lineOrdersBuffer);
                        gl.vertexAttribPointer(sha.order, ti._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ti._lineIndexesBuffer);

                        //PASS - stroke
                        gl.uniform1f(shu.thickness, style.strokeWidth);
                        gl.uniform4fv(shu.color, style.strokeColor.toArray());

                        //Antialias pass
                        gl.uniform1f(shu.thicknessOutline, 2);
                        gl.uniform1f(shu.alpha, 0.54);
                        gl.drawElements(gl.TRIANGLE_STRIP, ti._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                        //
                        //Aliased pass
                        gl.uniform1f(shu.thicknessOutline, 1);
                        gl.uniform1f(shu.alpha, 1.0);
                        gl.drawElements(gl.TRIANGLE_STRIP, ti._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        //PASS - inside line
                        gl.uniform1f(shu.thickness, style.lineWidth);
                        gl.uniform4fv(shu.color, style.lineColor.toArray());

                        //Antialias pass
                        gl.uniform1f(shu.thicknessOutline, 2);
                        gl.uniform1f(shu.alpha, 0.54);
                        gl.drawElements(gl.TRIANGLE_STRIP, ti._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                        //
                        //Aliased pass
                        gl.uniform1f(shu.thicknessOutline, 1);
                        gl.uniform1f(shu.alpha, 1.0);
                        gl.drawElements(gl.TRIANGLE_STRIP, ti._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                        //Outline picking pass
                        f.bindOutputTexture(pickingMask);
                        gl.uniform1f(shu.thicknessOutline, 8);
                        gl.uniform4fv(shu.color, pickingColor);
                        gl.drawElements(gl.TRIANGLE_STRIP, ti._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                    }

                    material._completedItems++;
                    i++;
                }

                material.applyTexture(texture, pickingMask);

                if (material.notComplete()) {
                    material.isLoading = true;
                    this.add(q);
                } else if (layer._gmxProperties.Temporal && zoomAvailable) {
                    //Suggested that material.pickingMask is applied already in the frame buffer
                    this._proceedImageryTiles(layer, material);
                }

            } else {
                material.isLoading = false;
            }

            deltaTime = window.performance.now() - startTime;
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        f.deactivate();
    }
};



GmxVectorTileCreator.prototype._proceedImageryTiles = function (layer, material) {

    const f = this._framebuffer;
    let data = this._temporaryData_;
    f.readAllPixels(data);

    var toLoad = 0;
    for (let i = data.length - 1; i >= 0; i -= 4) {
        let c = layer.planet.renderer.getPickingObjectByColor(data[i - 3], data[i - 2], data[i - 1]);
        if (c) {
            toLoad++;
            let sceneTextureOffset = layer.applySceneTexture(
                material.fromTile.tileItemsCache[c.id], material);
        }
    }
};

export { GmxVectorTileCreator };