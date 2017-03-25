goog.provide('og.utils.VectorTileCreator');

goog.require('og.webgl.Framebuffer');
goog.require('og.PlanetSegmentHelper');
goog.require('og.math');

og.utils.VectorTileCreator = function (handler, maxFrames, width, height) {

    this._width = width || 256;
    this._height = height || 256;
    this._handler = handler;
    this._framebuffer = null;
    this.MAX_FRAMES = maxFrames || 5;
    this._currentFrame = 0;
    this._queue = [];
    this._initialize();
};

og.utils.VectorTileCreator.prototype._initialize = function () {

    //Line
    this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("vectorTileLineRasterization", {
        uniforms: {
            'viewport': {
                type: og.shaderProgram.types.VEC2
            },
            'thicknessOutline': {
                type: og.shaderProgram.types.FLOAT
            },
            'alpha': {
                type: og.shaderProgram.types.FLOAT
            },
            'extentParams': {
                type: og.shaderProgram.types.VEC4
            }
        },
        attributes: {
            'prev': {
                type: og.shaderProgram.types.VEC2
            },
            'current': {
                type: og.shaderProgram.types.VEC2
            },
            'next': {
                type: og.shaderProgram.types.VEC2
            },
            'order': {
                type: og.shaderProgram.types.FLOAT
            },
            'color': {
                type: og.shaderProgram.types.VEC4
            },
            'thickness': {
                type: og.shaderProgram.types.FLOAT
            }
        },
        vertexShader: 'attribute vec2 prev;\
                attribute vec2 current;\
                attribute vec2 next;\
                attribute float order;\
                attribute float thickness;\
                attribute vec4 color;\
                uniform float thicknessOutline;\
                uniform vec2 viewport;\
                uniform vec4 extentParams;\
                varying vec4 vColor;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    vec2 dir = end2 - start2;\
                    vec2 perp = vec2(-dir.y, dir.x);\
                    float d2 = dot(perp, start2);\
                    float seg = dot(perp, start1) - d2;\
                    float u = seg / (seg - dot(perp, end1) + d2);\
                    return start1 + u * (end1 - start1);\
                }\
                \
                vec2 proj(vec2 coordinates){\
                    return vec2(-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0);\
                }\
                \
                void main(){\
                    vColor = color;\
                    vec2 _next = next;\
                    vec2 _prev = prev;\
                    if(prev == current){\
                        if(next == current){\
                            _next = current + vec2(1.0, 0.0);\
                            _prev = current - next;\
                        }else{\
                            _prev = current + normalize(current - next);\
                        }\
                    }\
                    if(next == current){\
                        _next = current + normalize(current - _prev);\
                    }\
                    \
                    vec2 sNext = proj(_next),\
                         sCurrent = proj(current),\
                         sPrev = proj(_prev);\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    vec2 d = (thickness + thicknessOutline) * 0.5 * sign(order) / viewport;\
                    \
                    vec2 m;\
                    float dotNP = dot(dirNext, dirPrev);\
                    if(abs(dotNP) != 1.0){\
                        m = getIntersection( sCurrent + normalPrev * d, sPrev + normalPrev * d,\
                            sCurrent + normalNext * d, sNext + normalNext * d );\
                    }else{\
                        m = sCurrent + normalPrev * d;\
                    }\
                    \
                    if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){\
                        float ccw = sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);\
                        float occw = order * ccw;\
                        if(occw == -1.0){\
                            m = sCurrent + normalPrev * d;\
                        }else if(occw == 1.0){\
                            m = sCurrent + normalNext * d;\
                        }else if(occw == -2.0){\
                            m = sCurrent + normalNext * d;\
                        }else if(occw == 2.0){\
                            m = sCurrent + normalPrev * d;\
                        }\
                    }else{\
                        float maxDist = max(distance(sCurrent, sNext), distance(sCurrent, sPrev));\
                        if(distance(sCurrent, m) > maxDist){\
                            m = sCurrent + maxDist * normalize(m - sCurrent);\
                        }\
                    }\
                    gl_Position = vec4(m.x, m.y, 0.0, 1.0);\
                }',
        fragmentShader: 'precision highp float;\
                uniform float alpha;\
                varying vec4 vColor;\
                void main() {\
                    gl_FragColor = vec4(vColor.rgb, alpha * vColor.a);\
                }'
    }));

    //Polygon
    this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("vectorTilePolygonRasterization", {
        uniforms: {
            'extentParams': {
                type: og.shaderProgram.types.VEC4
            }
        },
        attributes: {
            'coordinates': {
                type: og.shaderProgram.types.VEC2
            },
            'colors': {
                type: og.shaderProgram.types.VEC4
            }
        },
        vertexShader: 'attribute vec2 coordinates; \
                      attribute vec4 colors; \
                      uniform vec4 extentParams; \
                      varying vec4 color;\
                      void main() { \
                          color = colors;\
                          gl_Position = vec4((-1.0 + (coordinates - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0); \
                      }',
        fragmentShader: 'precision highp float;\
                        varying vec4 color;\
                        void main () {  \
                            gl_FragColor = color; \
                        }'
    }));

    this._framebuffer = new og.webgl.Framebuffer(this._handler, {
        width: this._width,
        height: this._height,
        useDepth: false
    });
};

og.utils.VectorTileCreator.prototype.frame = function () {
    if (this._queue.length) {
        var h = this._handler,
            gl = h.gl;

        var f = this._framebuffer;
        f.activate();

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        var prevLayerId = -1;

        var startTime = window.performance.now(),
            deltaTime = 0;

        while (this._queue.length && deltaTime < 0.25) {

            var material = this._queue.shift();
            if (material.isLoading && material.segment.node.getState() === og.quadTree.RENDERING) {

                var geomHandler = material.layer._geometryHandler;

                var pickingMask;
                var texture;
                
                if (material._updateTexture) {
                    texture = material._updateTexture;
                } else {
                    texture = h.createEmptyTexture_l(this._width, this._height);
                }

                f.bindOutputTexture(texture);

                gl.clearColor(1.0, 1.0, 1.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                var extent = material.segment.getExtentMerc();

                h.shaderPrograms.vectorTilePolygonRasterization.activate();
                var sh = h.shaderPrograms.vectorTilePolygonRasterization._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;

                //=========================================
                //Polygon rendering
                //=========================================
                gl.uniform4fv(shu.extentParams._pName, [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()]);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyVerticesBufferMerc);
                gl.vertexAttribPointer(sha.coordinates._pName, geomHandler._polyVerticesBufferMerc.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyColorsBuffer);
                gl.vertexAttribPointer(sha.colors._pName, geomHandler._polyColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._polyIndexesBuffer);
                gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                //Polygon picking PASS
                if (!material.pickingReady) {
                    if (material._updatePickingMask) {
                        pickingMask = material._updatePickingMask;
                    } else {
                        pickingMask = h.createEmptyTexture_l(this._width, this._height);
                    }

                    f.bindOutputTexture(pickingMask);

                    gl.clearColor(0.0, 0.0, 0.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._polyPickingColorsBuffer);
                    gl.vertexAttribPointer(sha.colors._pName, geomHandler._polyPickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.drawElements(gl.TRIANGLES, geomHandler._polyIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                }else{
                    pickingMask = material.pickingMask;
                }

                //=========================================
                //Strokes and linestrings rendering
                //=========================================
                f.bindOutputTexture(texture);

                h.shaderPrograms.vectorTileLineRasterization.activate();
                sh = h.shaderPrograms.vectorTileLineRasterization._program;
                sha = sh.attributes;
                shu = sh.uniforms;

                gl.uniform2fv(shu.viewport._pName, [this._width, this._height]);

                gl.uniform4fv(shu.extentParams._pName, [extent.southWest.lon, extent.southWest.lat, 2.0 / extent.getWidth(), 2.0 / extent.getHeight()]);

                //color
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineColorsBuffer);
                gl.vertexAttribPointer(sha.color._pName, geomHandler._lineColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                //vertex
                var mb = geomHandler._lineVerticesBufferMerc;
                gl.bindBuffer(gl.ARRAY_BUFFER, mb);
                gl.vertexAttribPointer(sha.prev._pName, mb.itemSize, gl.FLOAT, false, 8, 0);
                gl.vertexAttribPointer(sha.current._pName, mb.itemSize, gl.FLOAT, false, 8, 32);
                gl.vertexAttribPointer(sha.next._pName, mb.itemSize, gl.FLOAT, false, 8, 64);

                //order
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineOrdersBuffer);
                gl.vertexAttribPointer(sha.order._pName, geomHandler._lineOrdersBuffer.itemSize, gl.FLOAT, false, 4, 0);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geomHandler._lineIndexesBuffer);

                gl.uniform1f(shu.thicknessOutline._pName, 1);
                gl.uniform1f(shu.alpha._pName, 1.0);

                //PASS - stroke
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokesBuffer);
                gl.vertexAttribPointer(sha.thickness._pName, geomHandler._lineStrokesBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineStrokeColorsBuffer);
                gl.vertexAttribPointer(sha.color._pName, geomHandler._lineStrokeColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                //Antialias pass
                gl.uniform1f(shu.thicknessOutline._pName, 2);
                gl.uniform1f(shu.alpha._pName, 0.54);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                //
                //Aliased pass
                gl.uniform1f(shu.thicknessOutline._pName, 1);
                gl.uniform1f(shu.alpha._pName, 1.0);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                //PASS - inside line
                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineThicknessBuffer);
                gl.vertexAttribPointer(sha.thickness._pName, geomHandler._lineThicknessBuffer.itemSize, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._lineColorsBuffer);
                gl.vertexAttribPointer(sha.color._pName, geomHandler._lineColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                //Antialias pass
                gl.uniform1f(shu.thicknessOutline._pName, 2);
                gl.uniform1f(shu.alpha._pName, 0.54);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                //Aliased pass
                gl.uniform1f(shu.thicknessOutline._pName, 1);
                gl.uniform1f(shu.alpha._pName, 1.0);
                gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);

                if (!material.pickingReady) {
                    f.bindOutputTexture(pickingMask);

                    gl.uniform1f(shu.thicknessOutline._pName, 8);

                    gl.bindBuffer(gl.ARRAY_BUFFER, geomHandler._linePickingColorsBuffer);
                    gl.vertexAttribPointer(sha.color._pName, geomHandler._linePickingColorsBuffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.drawElements(gl.TRIANGLE_STRIP, geomHandler._lineIndexesBuffer.numItems, gl.UNSIGNED_INT, 0);
                }

                material.applyTexture(texture, pickingMask);


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

og.utils.VectorTileCreator.prototype.add = function (material) {
    this._queue.push(material);
};

og.utils.VectorTileCreator.prototype.remove = function (material) {
    //...
};
