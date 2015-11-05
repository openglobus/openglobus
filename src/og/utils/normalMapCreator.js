goog.provide('og.utils.NormalMapCreator');

goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.webgl.Handler');
goog.require('og.webgl.Framebuffer');

og.utils.NormalMapCreator = function (width, height) {
    this._handler = null;
    this._verticesBufferArray = [];
    this._indexBufferArray = [];
    this._positionBuffer = null;
    this._framebuffer = null;

    this._width = width || 128;
    this._height = height || 128;

    this._init();
};

og.utils.NormalMapCreator.prototype._init = function () {

    var isWebkit = false;//('WebkitAppearance' in document.documentElement.style) && !/^((?!chrome).)*safari/i.test(navigator.userAgent);

    /*==================================================================================
     * http://www.sunsetlakesoftware.com/2013/10/21/optimizing-gaussian-blurs-mobile-gpu
     *=================================================================================*/
    var normalMapBlur = new og.shaderProgram.ShaderProgram("normalMapBlur", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        uniforms: {
            s_texture: { type: og.shaderProgram.types.SAMPLER2D }
        },
        vertexShader: "attribute vec2 a_position; \
                       attribute vec2 a_texCoord; \
                      \
                      varying vec2 blurCoordinates[5]; \
                      \
                      void main() { \
                          vec2 vt = a_position * 0.5 + 0.5;" +
                          (!isWebkit ? "vt.y = 1.0 - vt.y; " : " ") +
                         "gl_Position = vec4(a_position, 0.0, 1.0); \
                          blurCoordinates[0] = vt; \
                          blurCoordinates[1] = vt + "  + (1.0 / this._width * 1.407333) + ";" +
                          "blurCoordinates[2] = vt - " + (1.0 / this._height * 1.407333) + ";" +
                          "blurCoordinates[3] = vt + " + (1.0 / this._width * 3.294215) + ";" +
                          "blurCoordinates[4] = vt - " + (1.0 / this._height * 3.294215) + ";" +
                     "}",
        fragmentShader: "uniform sampler2D s_texture; \
                        \
                        varying highp vec2 blurCoordinates[5]; \
                        \
                        void main() { \
                            lowp vec4 sum = vec4(0.0); \
                            sum += texture2D(s_texture, blurCoordinates[0]) * 0.204164; \
                            sum += texture2D(s_texture, blurCoordinates[1]) * 0.304005; \
                            sum += texture2D(s_texture, blurCoordinates[2]) * 0.304005; \
                            sum += texture2D(s_texture, blurCoordinates[3]) * 0.093913; \
                            sum += texture2D(s_texture, blurCoordinates[4]) * 0.093913; \
                            gl_FragColor = sum; \
                        }"
    });

    var normalMap = new og.shaderProgram.ShaderProgram("normalMap", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_normal: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: "attribute vec2 a_position; \
                      attribute vec3 a_normal; \
                      \
                      varying vec3 v_color; \
                      \
                      void main() { \
                          gl_PointSize = 1.0; \
                          gl_Position = vec4(a_position, 0, 1); \
                          v_color = normalize(a_normal) * 0.5 + 0.5; \
                      }",
        fragmentShader: "precision mediump float; \
                        \
                        varying vec3 v_color; \
                        \
                        void main () { \
                            gl_FragColor = vec4(v_color, 1.0); \
                        }"
    });

    //initialize hidden handler
    this._handler = new og.webgl.Handler(null, {
        width: this._width, height: this._height,
        context: { alpha: false, depth: false }
    });
    this._handler.addShaderProgram(normalMapBlur);
    this._handler.addShaderProgram(normalMap);
    this._handler.init();
    this._handler.deactivateFaceCulling();
    this._handler.deactivateDepthTest();

    //create hidden handler buffer
    this._framebuffer = new og.webgl.Framebuffer(this._handler);

    //creating vertices hached array for differents grid size segment
    for (var p = 1; p <= 6; p++) {
        var gs = Math.pow(2, p);
        var gs2 = (gs / 2);
        var vertices = [];

        for (var i = 0; i <= gs; i++) {
            for (var j = 0; j <= gs; j++) {
                vertices.push(-1 + j / gs2, -1 + i / gs2);
            }
        }

        this._verticesBufferArray[gs] = this._handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
        var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gs, [gs, gs, gs, gs]);
        this._indexBufferArray[gs] = this._handler.createElementArrayBuffer(indexes, 1, indexes.length);
    }

    //create 2d screen square buffer

    var positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0, 1.0,
         1.0, 1.0];

    this._positionBuffer = this._handler.createArrayBuffer(new Float32Array(positions), 2, positions.length / 2);
};

og.utils.NormalMapCreator.prototype._drawNormalMap = function (normals) {

    var size = normals.length / 3;
    var gridSize = Math.sqrt(size) - 1;

    var _normalsBuffer = this._handler.createArrayBuffer(new Float32Array(normals), 3, size);

    var f = this._framebuffer;
    var p = this._handler.shaderPrograms.normalMap;
    var gl = this._handler.gl;
    var sha = p._program.attributes;

    p.activate();

    f.activate();

    gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBufferArray[gridSize]);
    gl.vertexAttribPointer(sha.a_position._pName, this._verticesBufferArray[gridSize].itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, _normalsBuffer);
    gl.vertexAttribPointer(sha.a_normal._pName, _normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
    gl.drawElements(gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, gl.UNSIGNED_SHORT, 0);

    f.deactivate();
};

og.utils.NormalMapCreator.prototype._drawBlur = function () {

    var gl = this._handler.gl;
    var p = this._handler.shaderPrograms.normalMapBlur;
    var sha = p._program.attributes,
        shu = p._program.uniforms;

    p.activate();

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(sha.a_position._pName, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._framebuffer.texture);
    gl.uniform1i(shu.s_texture._pName, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._positionBuffer.numItems);
};

og.utils.NormalMapCreator.prototype.draw = function (normals) {
    this._drawNormalMap(normals);
    //return this._framebuffer.getImage();
    this._drawBlur();
    return this._handler.canvas;
};