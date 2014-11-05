goog.provide('NormalMapHelper');

goog.require('og.webgl.Framebuffer');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.webgl.Handler');
goog.require('og.planetSegment.PlanetSegmentHelper');

NormalMapHelper = function (gridSize, width, height) {
    this._handler = null;
    this._verticesBuffer;
    this._width = width || 128;
    this._height = height || 128;
    this._gridSize = gridSize || 33;

    this._counter = 0;
    this._pendingsQueue = [];
};

NormalMapHelper.prototype.initialize = function () {

    var normalMap = new og.shaderProgram.ShaderProgram("normalMap", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_normal: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("nm_vs.txt"),
        fragmentShader: og.utils.readTextFile("nm_fs.txt")
    });

    var blur = new og.shaderProgram.ShaderProgram("blur", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            resolution: { type: og.shaderProgram.types.FLOAT },
            radius: { type: og.shaderProgram.types.FLOAT },
            dir: { type: og.shaderProgram.types.VEC2 }
        },
        vertexShader: og.utils.readTextFile("blur_vs.txt"),
        fragmentShader: og.utils.readTextFile("blur_fs.txt")
    });

    this._handler = new og.webgl.Handler(null, {
        width: 128, height: 128,
        context: { alpha: false, depth: false }
    });
    this._handler.addShaderProgram(blur);
    this._handler.addShaderProgram(normalMap);
    this._handler.init();
    this._handler.deactivateFaceCulling();

    var vertices = [];
    var gs = this._gridSize - 1;
    var gs2 = (gs / 2);
    for (var i = 0; i < this._gridSize; i++) {
        for (var j = 0; j < this._gridSize; j++) {
            vertices.push(-1 + j / gs2, -1 + i / gs2);
        }
    }

    this._verticesBuffer = this._handler.createArrayBuffer(new Float32Array(vertices), 2, vertices.length / 2);
    var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gs, [gs, gs, gs, gs]);
    this._indexBuffer = this._handler.createElementArrayBuffer(indexes, 1, indexes.length);

    var positions = [
     -1.0, -1.0,
      1.0, -1.0,
     -1.0, 1.0,
      1.0, 1.0];

    this._positionBuffer = this._handler.createArrayBuffer(new Float32Array(positions), 2, positions.length / 2);

    this.framebuffer = new og.webgl.Framebuffer(this._handler.gl, this._width, this._height);
    this.framebuffer.initialize();
};

NormalMapHelper.prototype.drawNormalMap = function (normals) {

    this._normalsBuffer = this._handler.createArrayBuffer(new Float32Array(normals), 3, normals.length / 3);

    this.framebuffer.activate();
    this.framebuffer.clear();

    this._handler.shaderPrograms.normalMap.activate();

    this._handler.shaderPrograms.normalMap.set({
        a_position: this._verticesBuffer,
        a_normal: this._normalsBuffer
    });

    this._handler.gl.bindBuffer(this._handler.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    this._handler.gl.drawElements(this._handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, this._handler.gl.UNSIGNED_SHORT, 0);

    this.framebuffer.deactivate();
};

NormalMapHelper.prototype.drawBlur = function (texture, dir, size, radius) {

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

NormalMapHelper.prototype.createNormalMap = function (normals, success) {
    var obj = { normals: normals, callback: success };
    if (this._counter >= 1) {
        this._pendingsQueue.push(obj);
    } else {
        this._exec(obj);
    }
};

NormalMapHelper.prototype._exec = function (obj) {
    this._counter++;
    var that = this;
    setTimeout(function () {
        that.drawNormalMap(obj.normals);
        that.drawBlur(that.framebuffer.texture, [1.0, 0.0], that._width, 1);
        that.drawBlur(that._handler.createTexture(that._handler.canvas), [0.0, 1.0], that._height, 1);
        obj.callback(that._handler.canvas);
        that.dequeueRequest();
    }, 0);
};


NormalMapHelper.prototype.dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length) {
        if (this._counter < 1) {
            var req;
            if (req = this.whilePendings())
                this._exec(req);
        }
    }
};

NormalMapHelper.prototype.whilePendings = function () {
    while (this._pendingsQueue.length) {
        var req = this._pendingsQueue.pop();
        if (req) {
            return req;
        }
    }
    return null;
};