goog.provide('og.utils.NormalMapCreator');

goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.blur');
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

    var blur = og.shaderProgram.blur();

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
                          v_color = a_normal * 0.5 + 0.5; \
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
    this._handler.addShaderProgram(blur);
    this._handler.addShaderProgram(normalMap);
    this._handler.init();
    this._handler.deactivateFaceCulling();

    //create hidden handler buffer
    this._framebuffer = new og.webgl.Framebuffer(this._handler.gl, this._width, this._height);
    this._framebuffer.initialize();

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

    this._framebuffer.activate();
    this._framebuffer.clear();

    this._handler.shaderPrograms.normalMap.activate();

    this._handler.shaderPrograms.normalMap.set({
        a_position: this._verticesBufferArray[gridSize],
        a_normal: _normalsBuffer
    });

    this._handler.gl.bindBuffer(this._handler.gl.ELEMENT_ARRAY_BUFFER, this._indexBufferArray[gridSize]);
    this._handler.gl.drawElements(this._handler.gl.TRIANGLE_STRIP, this._indexBufferArray[gridSize].numItems, this._handler.gl.UNSIGNED_SHORT, 0);

    this._framebuffer.deactivate();
};

og.utils.NormalMapCreator.prototype._drawBlur = function (texture, dir, size, radius) {

    this._handler.clearFrame();

    this._handler.shaderPrograms.blur.activate();

    this._handler.shaderPrograms.blur.set({
        a_position: this._positionBuffer,
        u_texture: texture,
        resolution: size,
        radius: radius,
        dir: dir
    });

    this._handler.shaderPrograms.blur.drawArray(this._handler.gl.TRIANGLE_STRIP, this._positionBuffer.numItems);
};

og.utils.NormalMapCreator.prototype.draw = function (normals) {
    if (normals.length) {
        this._drawNormalMap(normals);
        //return this._framebuffer.getImage();
        this._drawBlur(this._framebuffer.texture, [1.0, 0.0], this._width-1, 1);
        this._drawBlur(this._handler.createTexture(this._handler.canvas), [0.0, 1.0], this._height-1, 1);
        return this._handler.canvas;
    } else {
        return null;
    }
};