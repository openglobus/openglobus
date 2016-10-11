goog.provide('og.utils.GeoImageCreator');

goog.require('og.webgl.Framebuffer');
goog.require('og.PlanetSegmentHelper');
goog.require('og.math');

og.utils.GeoImageCreator = function (handler, maxFrames) {
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

og.utils.GeoImageCreator.prototype._initialize = function () {
    this._initShaders();
    this._initBuffers();
};

/**
 * Creates geoImage corners coordinates grid buffer.
 * @public
 * @param{Array.<og.LonLat>} c - GeoImage corners coordinates.
 * @return{WebGLBuffer} Grid coordinates buffer.
 */
og.utils.GeoImageCreator.prototype.createGridBuffer = function (c, toMerc) {
    var gs = this._gridSize;

    var v03 = new og.LonLat((c[3].lon - c[0].lon) / gs, (c[3].lat - c[0].lat) / gs),
        v12 = new og.LonLat((c[2].lon - c[1].lon) / gs, (c[2].lat - c[1].lat) / gs),
        v01 = new og.LonLat((c[1].lon - c[0].lon) / gs, (c[1].lat - c[0].lat) / gs),
        v32 = new og.LonLat((c[2].lon - c[3].lon) / gs, (c[2].lat - c[3].lat) / gs);

    var grid = new Float32Array((gs + 1) * (gs + 1) * 2);
    var k = 0;
    for (var i = 0; i <= gs; i++) {
        var P03i = og.lonLat(c[0].lon + i * v03.lon, c[0].lat + i * v03.lat),
            P12i = og.lonLat(c[1].lon + i * v12.lon, c[1].lat + i * v12.lat);
        for (var j = 0; j <= gs; j++) {
            var P01j = og.lonLat(c[0].lon + j * v01.lon, c[0].lat + j * v01.lat),
                P32j = og.lonLat(c[3].lon + j * v32.lon, c[3].lat + j * v32.lat);
            var xx = og.utils.getLinesIntersectionLonLat(P03i, P12i, P01j, P32j);
            grid[k++] = xx.lon;
            grid[k++] = xx.lat;
        }
    }

    if (toMerc) {
        for (var i = 0; i < grid.length; i += 2) {
            var c = og.lonLat(grid[i], grid[i + 1]).forwardMercator();
            grid[i] = c.lon;
            grid[i + 1] = c.lat;
        }
    }
    return this._handler.createArrayBuffer(grid, 2, grid.length / 2);
};

og.utils.GeoImageCreator.prototype.frame = function () {
    var i = this.MAX_FRAMES;
    while (i-- && this._queue.length) {
        var q = this._queue.shift();
        q._isRendering = false;
        //this.process(q);
        q.rendering();
    }

    i = this._animate.length;
    while (i--) {
        this._animate[i].rendering();
    }
};

og.utils.GeoImageCreator.prototype.add = function (geoImage) {
    if (!geoImage._isRendering) {
        geoImage._isRendering = true;
        if (geoImage._animate) {
            this._animate.push(geoImage);
        } else {
            this._queue.push(geoImage);
        }
    }
};

og.utils.GeoImageCreator.prototype.remove = function (geoImage) {
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

og.utils.GeoImageCreator.prototype._initBuffers = function () {
    og.PlanetSegmentHelper.initIndexesTables(3);

    this._framebuffer = new og.webgl.Framebuffer(this._handler, { width: 2, height: 2, useDepth: false });
    this._framebufferMercProj = new og.webgl.Framebuffer(this._handler, { width: 2, height: 2, useDepth: false });

    var gs = this._gridSize;
    var gs1 = this._gridSize + 1;
    this._texCoordsBuffer = this._handler.createArrayBuffer(og.PlanetSegmentHelper.textureCoordsTable[gs], 2, gs1 * gs1);

    var indexes = og.PlanetSegmentHelper.createSegmentIndexes(gs, [gs, gs, gs, gs]);
    this._indexBuffer = this._handler.createElementArrayBuffer(indexes, 1, indexes.length);

    this._quadTexCoordsBuffer = this._handler.createArrayBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2, 4);
    this._quadVertexBuffer = this._handler.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);
};

og.utils.GeoImageCreator.prototype._initShaders = function () {
    this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("geoImageTransform", {
        uniforms: {
            sourceTexture: { type: og.shaderProgram.types.SAMPLER2D },
            extentParams: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            corners: { type: og.shaderProgram.types.VEC2, enableArray: true },
            texCoords: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 corners; \
                      attribute vec2 texCoords; \
                      varying vec2 v_texCoords; \
                      uniform vec4 extentParams; \
                      void main() { \
                          v_texCoords = texCoords; \
                          gl_Position = vec4((-1.0 + (corners - extentParams.xy) * extentParams.zw) * vec2(1.0, -1.0), 0.0, 1.0); \
                      }',
        fragmentShader: 'precision highp float; \
                        uniform sampler2D sourceTexture; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            gl_FragColor = texture2D(sourceTexture, v_texCoords); \
                        }'
    }));

    //this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("geoImageMercProj", {
    //    uniforms: {
    //        u_sampler: { type: og.shaderProgram.types.SAMPLER2D },
    //        u_extent: { type: og.shaderProgram.types.VEC4 },
    //        u_mercExtent: { type: og.shaderProgram.types.VEC4 }
    //    },
    //    attributes: {
    //        a_vertex: { type: og.shaderProgram.types.VEC2, enableArray: true },
    //        a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
    //    },
    //    vertexShader: 'attribute vec2 a_vertex; \
    //                        attribute vec2 a_texCoord; \
    //                        varying vec2 v_texCoords; \
    //                        void main() { \
    //                            v_texCoords = a_texCoord; \
    //                            gl_Position = vec4(a_vertex, 0, 1); \
    //                        }',
    //    fragmentShader: 'precision highp float; \n\
    //                    uniform sampler2D u_sampler; \n\
    //                    uniform vec4 u_extent; \n\
    //                    uniform vec4 u_mercExtent; \n\
    //                    varying vec2 v_texCoords; \n\
    //                    const float POLE=20037508.34; \n\
    //                    const float PI=3.141592653589793; \n\
    //                    const float RAD2DEG = 180.0 / PI;\n\
    //                    const float PI_BY_2 = PI / 2.0;\n\
    //                    \n\
    //                    vec2 inverse(vec2 lonLat){\n\
    //                        return vec2(180.0 * lonLat.x / POLE, RAD2DEG * (2.0 * atan(exp(PI * lonLat.y / POLE)) - PI_BY_2));\n\
    //                    }\n\
    //                    \n\
    //                    void main () {\n\
    //                        vec2 d = (inverse(u_mercExtent.xy + u_mercExtent.zw * vec2(v_texCoords.x, v_texCoords.y)) - u_extent.xy) * u_extent.zw;\n\
    //                        gl_FragColor = texture2D(u_sampler, d);\n\
    //        }'
    //}));
};