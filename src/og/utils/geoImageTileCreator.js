goog.provide('og.utils.GeoImageTileCreator');

og.utils.GeoImageTileCreator = function (width, height) {
    this._width = width || 256;
    this._height = height || 256;
    this._handler = null;
    this._init();
};

og.utils.GeoImageTileCreator.prototype._init = function () {
    var geoImage = new og.shaderProgram.ShaderProgram("geoImage", {
        uniforms: {
            u_sourceImage: { type: og.shaderProgram.types.SAMPLER2D },
            u_extentParams: { type: og.shaderProgram.types.VEC4 }
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
        fragmentShader: 'precision mediump float; \
                        uniform sampler2D uSourceImage; \
                        varying vec2 v_texCoords; \
                        void main () {  \
                            gl_FragColor = texture2D(uSourceImage, v_texCoords); \
                        }'
    });

    //initialize hidden handler
    this._handler = new og.webgl.Handler(null, {
        width: this._width, height: this._height,
        context: { alpha: true, depth: false }
    });
    this._handler.addShaderProgram(geoImage);
    this._handler.init();
    this._handler.deactivateFaceCulling();
    this._handler.deactivateDepthTest();

    var _texCoordsBuffer = this._handler.createArrayBuffer(new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0]), 2, 4);
    this._handler.gl.bindBuffer(this._handler.gl.ARRAY_BUFFER, _texCoordsBuffer);
    this._handler.gl.vertexAttribPointer(geoImage.attributes.a_texCoord._pName, _texCoordsBuffer.itemSize, this._handler.gl.FLOAT, false, 0, 0);
};

og.utils.GeoImageTileCreator.prototype.drawTile = function (planetSegment) {
    var h = this._handler;
    var sh = h.shaderPrograms.geoImage._program;
    var sha = sh.attributes,
        shu = sh.uniforms;
    var gl = h.gl;

    gl.clearColor(1.0, 1.0, 1.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var geoImagesArray = planetSegment.planet.geoImagesArray;

    var i = geoImagesArray.length;
    while (i--) {
        var gi = geoImagesArray[i];
        if (gi.visibility && gi.ready && gi.extent.intersects(planetSegment.wgs84extent)) {
            gl.bindBuffer(gl.ARRAY_BUFFER, gi._cornersBuffer);
            gl.vertexAttribPointer(sha.a_corner._pName, gi._cornersBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.uniform4fv(shu.u_extentParams._pName, planetSegment.extentParams);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, gi._sourceTexture);
            gl.uniform1i(shu.u_sourceImage._pName, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }
    return planetSegment.planet.renderer.handler.createTexture_af(this._handler.canvas);
};