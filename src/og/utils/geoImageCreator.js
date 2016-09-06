goog.provide('og.utils.GeoImageCreator');

goog.require('og.webgl.Framebuffer');
goog.require('og.PlanetSegmentHelper');
goog.require('og.math');

og.utils.GeoImageCreator = function (handler, gridSize, maxFrames) {
    this._gridSize = gridSize || 8;
    this._handler = handler;
    this._framebuffer = null;
    this._texCoordsBuffer = null;
    this._indexBuffer = null;
    this.MAX_FRAMES = maxFrames || 5;
    this._currentFrame = 0;
    this._queue = [];
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
og.utils.GeoImageCreator.prototype.createGridBuffer = function (c) {
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
    return this._handler.createArrayBuffer(grid, 2, grid.length / 2);
};

og.utils.GeoImageCreator.prototype.process = function (geoImage) {
    var h = this._handler;

    //
    //geoImage preparings
    if (geoImage._image) {
        geoImage._sourceTexture = this._handler.createTexture_n(geoImage._image);
    }

    if (geoImage._refreshCorners) {
        geoImage._gridBuffer = this.createGridBuffer(geoImage._corners);
        geoImage._refreshCorners = false;
    }

    var width = geoImage._frameWidth,
        height = geoImage._frameHeight;
    if (!geoImage._frameCreated) {
        geoImage._materialTexture = h.createEmptyTexture_l(width, height);

        if (geoImage._isOverMerc) {
            geoImage._materialTextureMerc = h.createEmptyTexture_l(width, height);
        } else {
            geoImage._materialTextureMerc = geoImage._materialTexture;
        }

        if (geoImage._wgs84) {
            geoImage._intermediateTextureWgs84 = h.createEmptyTexture_l(width, height);
        }

        geoImage._frameCreated = true;
    }


    var f = this._framebuffer;
    f.setSize(width, height);
    f.activate();

    h.shaderPrograms.geoImageTransform.activate();
    var sh = h.shaderPrograms.geoImageTransform._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = h.gl;

    gl.disable(gl.CULL_FACE);

    if (geoImage._isOverMerc && geoImage._wgs84) {
        //PASS1
        f.bindOutputTexture(geoImage._materialTexture);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
        gl.vertexAttribPointer(sha.texCoords._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._gridBuffer);
        gl.vertexAttribPointer(sha.corners._pName, geoImage._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);

        //PASS2
        f.bindOutputTexture(geoImage._intermediateTextureWgs84);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentOverParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);
        f.deactivate();

        //PASS3
        f = this._framebufferMercProj;
        f.setSize(width, height);
        f.activate();
        h.shaderPrograms.geoImageMercProj.activate();
        sh = h.shaderPrograms.geoImageMercProj._program;
        sha = sh.attributes;
        shu = sh.uniforms;
        f.bindOutputTexture(geoImage._materialTextureMerc);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadTexCoordsBuffer);
        gl.vertexAttribPointer(sha.a_texCoord._pName, this._quadTexCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadVertexBuffer);
        gl.vertexAttribPointer(sha.a_vertex._pName, this._quadVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._intermediateTextureWgs84);
        gl.uniform1i(shu.u_sampler._pName, 0);
        gl.uniform4fv(shu.u_extent._pName, geoImage._wgs84MercParams);
        gl.uniform4fv(shu.u_mercExtent._pName, [geoImage._extentMerc.southWest.lon, geoImage._extentMerc.southWest.lat,
            geoImage._extentMerc.getWidth(), geoImage._extentMerc.getHeight()]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        f.deactivate();
    } else if (geoImage._isOverMerc) {
        //PASS1
        f.bindOutputTexture(geoImage._materialTexture);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
        gl.vertexAttribPointer(sha.texCoords._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._gridBuffer);
        gl.vertexAttribPointer(sha.corners._pName, geoImage._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);

        //PASS2
        f.bindOutputTexture(geoImage._materialTextureMerc);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentOverParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);
        f.deactivate();
    } else if (geoImage._wgs84) {
        //PASS1
        f.bindOutputTexture(geoImage._intermediateTextureWgs84);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
        gl.vertexAttribPointer(sha.texCoords._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._gridBuffer);
        gl.vertexAttribPointer(sha.corners._pName, geoImage._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);
        f.deactivate();

        //PASS2
        f = this._framebufferMercProj;
        f.setSize(width, height);
        f.activate();
        f.bindOutputTexture(geoImage._materialTextureMerc);
        h.shaderPrograms.geoImageMercProj.activate();
        sh = h.shaderPrograms.geoImageMercProj._program;
        sha = sh.attributes;
        shu = sh.uniforms;
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadTexCoordsBuffer);
        gl.vertexAttribPointer(sha.a_texCoord._pName, this._quadTexCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadVertexBuffer);
        gl.vertexAttribPointer(sha.a_vertex._pName, this._quadVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._intermediateTextureWgs84);
        gl.uniform1i(shu.u_sampler._pName, 0);
        gl.uniform4fv(shu.u_extent._pName, geoImage._wgs84MercParams);
        gl.uniform4fv(shu.u_mercExtent._pName, [geoImage._extentMerc.southWest.lon, geoImage._extentMerc.southWest.lat,
            geoImage._extentMerc.getWidth(), geoImage._extentMerc.getHeight()]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        f.deactivate();
    } else {
        //PASS1
        f.bindOutputTexture(geoImage._materialTexture);
        gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
        gl.vertexAttribPointer(sha.texCoords._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._gridBuffer);
        gl.vertexAttribPointer(sha.corners._pName, geoImage._gridBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(shu.extentParams._pName, geoImage._extentParams);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
        gl.uniform1i(shu.sourceTexture._pName, 0);
        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);
        f.deactivate();
    }

    ///////////////////////////////////////////////////////////////
    ////Creates mercator grid limited texture
    //if (geoImage._isOverMerc) {
    //    if (geoImage._wgs84) {
    //        f.bindOutputTexture(geoImage._intermediateTextureWgs84);
    //    } else {
    //        f.bindOutputTexture(geoImage._materialTextureMerc);
    //    }
    //    gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
    //    gl.clear(gl.COLOR_BUFFER_BIT);
    //    gl.uniform4fv(shu.extentParams._pName, geoImage._extentOverParams);
    //    gl.activeTexture(gl.TEXTURE0);
    //    gl.bindTexture(gl.TEXTURE_2D, geoImage._sourceTexture);
    //    gl.uniform1i(shu.sourceTexture._pName, 0);
    //    sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._indexBuffer);
    //}

    //f.deactivate();

    //if (geoImage._wgs84) {

    //    f = this._framebufferMercProj;

    //    f.setSize(width, height);
    //    f.activate();
    //    f.bindOutputTexture(geoImage._materialTextureMerc);

    //    h.shaderPrograms.geoImageMercProj.activate();
    //    sh = h.shaderPrograms.geoImageMercProj._program;
    //    sha = sh.attributes;
    //    shu = sh.uniforms;
    //    gl.clearColor(geoImage.transparentColor[0], geoImage.transparentColor[1], geoImage.transparentColor[2], 1.0);
    //    gl.clear(gl.COLOR_BUFFER_BIT);
    //    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadTexCoordsBuffer);
    //    gl.vertexAttribPointer(sha.a_texCoord._pName, this._quadTexCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    //    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadVertexBuffer);
    //    gl.vertexAttribPointer(sha.a_vertex._pName, this._quadVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    //    gl.activeTexture(gl.TEXTURE0);
    //    gl.bindTexture(gl.TEXTURE_2D, geoImage._intermediateTextureWgs84);
    //    gl.uniform1i(shu.u_sampler._pName, 0);

    //    gl.uniform4fv(shu.u_extent._pName, geoImage._wgs84MercParams);

    //    gl.uniform4fv(shu.u_mercExtent._pName, [geoImage._extentMerc.southWest.lon, geoImage._extentMerc.southWest.lat,
    //        geoImage._extentMerc.getWidth(), geoImage._extentMerc.getHeight()]);

    //    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    //    f.deactivate();
    //}

    gl.enable(gl.CULL_FACE);

    geoImage._ready = true;
    geoImage._creationProceeding = false;
};

og.utils.GeoImageCreator.prototype._initBuffers = function () {
    og.PlanetSegmentHelper.initIndexesTables(3);

    this._framebuffer = new og.webgl.Framebuffer(this._handler, 2, 2, { useDepth: false });
    this._framebufferMercProj = new og.webgl.Framebuffer(this._handler, 2, 2, { useDepth: false });

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
                          gl_Position = vec4((-1.0 + (corners - extentParams.xy) * extentParams.zw)*vec2(1.0,-1.0), 0.0, 1.0); \
                      }',
        fragmentShader: 'precision highp float; \
                        uniform sampler2D sourceTexture; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            gl_FragColor = texture2D(sourceTexture, v_texCoords); \
                        }'
    }));

    this._handler.addShaderProgram(new og.shaderProgram.ShaderProgram("geoImageMercProj", {
        uniforms: {
            u_sampler: { type: og.shaderProgram.types.SAMPLER2D },
            u_extent: { type: og.shaderProgram.types.VEC4 },
            u_mercExtent: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            a_vertex: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_vertex; \
                            attribute vec2 a_texCoord; \
                            varying vec2 v_texCoords; \
                            void main() { \
                                v_texCoords = a_texCoord; \
                                gl_Position = vec4(a_vertex, 0, 1); \
                            }',
        fragmentShader: 'precision highp float; \n\
                        uniform sampler2D u_sampler; \n\
                        uniform vec4 u_extent; \n\
                        uniform vec4 u_mercExtent; \n\
                        varying vec2 v_texCoords; \n\
                        const float POLE=20037508.34; \n\
                        const float PI=3.141592653589793; \n\
                        const float RAD2DEG = 180.0 / PI;\n\
                        const float PI_BY_2 = PI / 2.0;\n\
                        \n\
                        vec2 inverse(vec2 lonLat){\n\
                            return vec2(180.0 * lonLat.x / POLE, RAD2DEG * (2.0 * atan(exp(PI * lonLat.y / POLE)) - PI_BY_2));\n\
                        }\n\
                        \n\
                        void main () {\n\
                            vec2 d = (inverse(u_mercExtent.xy + u_mercExtent.zw * vec2(v_texCoords.x, v_texCoords.y)) - u_extent.xy) * u_extent.zw;\n\
                            gl_FragColor = texture2D(u_sampler, d);\n\
            }'
    }));
};

og.utils.GeoImageCreator.prototype.frame = function () {
    var i = this.MAX_FRAMES;
    while (i-- && this._queue.length) {
        this.process(this._queue.shift());
    }
};

og.utils.GeoImageCreator.prototype.queue = function (geoImage) {
    this._queue.push(geoImage);
};