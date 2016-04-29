goog.provide('og.utils.GeoImageTileCreator');

goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.webgl.Framebuffer');
goog.require('og.webgl.Handler');

og.utils.GeoImageTileCreator = function (width, height) {
    this._width = width || 256;
    this._height = height || 256;
    this._handler = null;
    this._framebufferPASS_ONE = null;
    this._texCoordsBuffer = null;
    this._vertexBuffer = null;
    this._init();
};

og.utils.GeoImageTileCreator.prototype._init = function () {
    var geoImageShader = new og.shaderProgram.ShaderProgram("geoImage", {
        uniforms: {
            u_sourceImage: { type: og.shaderProgram.types.SAMPLER2D },
            u_extentParams: { type: og.shaderProgram.types.VEC4 },
            u_opacity: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_corner: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 'attribute vec2 a_corner; \
                      attribute vec2 a_texCoord; \
                      varying vec2 v_texCoords; \
                      uniform vec4 u_extentParams; \
                      void main() { \
                          v_texCoords = a_texCoord; \
                          gl_Position = vec4(-1.0 + (a_corner - u_extentParams.xy) * u_extentParams.zw, 0, 1); \
                      }',
        fragmentShader: 'precision highp float; \
                        uniform sampler2D u_sourceImage; \
                        uniform float u_opacity; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            vec4 color = texture2D(u_sourceImage, v_texCoords); \
                            if(color.a == 0.0) discard; \
                            gl_FragColor = vec4(color.rgb, u_opacity * color.a); \
                        }'
    });

    var geoImageMercProjShader = new og.shaderProgram.ShaderProgram("geoImageMercProj", {
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
                            vec2 d = (inverse(u_mercExtent.xy + u_mercExtent.zw * vec2(v_texCoords.x, 1.0 - v_texCoords.y)) - u_extent.xy) * u_extent.zw;\n\
                            gl_FragColor = texture2D(u_sampler, d);\n\
            }'
    });

    //initialize hidden handler
    this._handler = new og.webgl.Handler(null, {
        width: this._width, height: this._height,
        context: { alpha: true, depth: false }
    });
    this._handler.addShaderProgram(geoImageShader);
    this._handler.addShaderProgram(geoImageMercProjShader);
    this._handler.init();
    this._handler.deactivateFaceCulling();
    this._handler.deactivateDepthTest();

    this._framebufferPASS_ONE = new og.webgl.Framebuffer(this._handler);

    this._texCoordsBuffer = this._handler.createArrayBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2, 4);
    this._vertexBuffer = this._handler.createArrayBuffer(new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), 2, 4);
};

//this function must be synchronous callee for _handler
og.utils.GeoImageTileCreator.prototype.createMercatorSamplerPASS = function (geoImage) {

    this._handler.setSize(geoImage.image.width, geoImage.image.height);

    this._framebufferPASS_ONE.setSize(geoImage.image.width, geoImage.image.height);
    geoImage._mercFramebuffer.setSize(geoImage.image.width, geoImage.image.height);

    var h = this._handler;
    var gl = h.gl;

    //wgs84 image extent making for web mercator reprojection
    this._framebufferPASS_ONE.activate();
    h.shaderPrograms.geoImage.activate();
    var sh = h.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    gl.clearColor(1.0, 1.0, 1.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(shu.u_opacity._pName, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, geoImage._wgs84CornersBuffer);
    gl.vertexAttribPointer(sha.a_corner._pName, geoImage._wgs84CornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
    var extParams = [geoImage._wgs84MercExtent.southWest.lon, geoImage._wgs84MercExtent.southWest.lat,
        2.0 / geoImage._wgs84MercExtent.getWidth(), 2.0 / geoImage._wgs84MercExtent.getHeight()];
    gl.uniform4fv(shu.u_extentParams._pName, extParams);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, geoImage._wgs84SourceTexture);
    gl.uniform1i(shu.u_sourceImage._pName, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._framebufferPASS_ONE.deactivate();

    //mercator projection
    geoImage._mercFramebuffer.activate();
    h.shaderPrograms.geoImageMercProj.activate();
    sh = h.shaderPrograms.geoImageMercProj._program;
    sha = sh.attributes;
    shu = sh.uniforms;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordsBuffer);
    gl.vertexAttribPointer(sha.a_texCoord._pName, this._texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.a_vertex._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebufferPASS_ONE.texture);
    gl.uniform1i(shu.u_sampler._pName, 0);

    gl.uniform4fv(shu.u_extent._pName,
        [geoImage._wgs84MercExtent.southWest.lon, geoImage._wgs84MercExtent.southWest.lat,
        1.0 / geoImage._wgs84MercExtent.getWidth(), 1.0 / geoImage._wgs84MercExtent.getHeight()]);

    gl.uniform4fv(shu.u_mercExtent._pName,
        [geoImage._mercExtent.southWest.lon, geoImage._mercExtent.southWest.lat,
        geoImage._mercExtent.getWidth(), geoImage._mercExtent.getHeight()]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    geoImage._mercFramebuffer.deactivate();

    geoImage._mercSamplerReady = true;

    this._handler.setSize(this._width, this._height);
};

og.utils.GeoImageTileCreator.prototype.draw = function (planetSegment) {
    var h = this._handler;
    var sh = h.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = h.gl;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

    var geoImagesArray = planetSegment.planet.geoImagesArray;

    var i = geoImagesArray.length;
    var empty = false;
    while (i--) {
        var gi = geoImagesArray[i];
        if (gi.opacity == 1.0) {
            gl.disable(gl.BLEND);
        } else {
            gl.enable(gl.BLEND);
        }
        empty |= planetSegment.drawGeoImage(gi);
    }

    gl.disable(gl.BLEND);

    if (!empty) {
        return null;
    }

    return this._handler.canvas;
};