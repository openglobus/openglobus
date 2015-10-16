goog.provide('my.SDF');

goog.require('og.node.RenderNode');
goog.require('og.inheritance');
goog.require('og.webgl.Framebuffer');

my.SDF = function (name) {
    og.inheritance.base(this, name);

    this.texture = null;
    this.width = 0;
    this.height = 0;

    this.framebuffer = null;

};

og.inheritance.extend(my.SDF, og.node.RenderNode);


my.SDF.prototype.initialization = function () {

    var h = this.renderer.handler;

    this._vertexBuffer = h.createArrayBuffer(new Float32Array([
         -1, -1,
         -1, 1,
          1, -1,
          1, 1]), 2, 4);

    var img = new Image();
    that = this;
    img.onload = function () {
        that.texture = h.createTexture_n(this);
        that.width = this.width;
        that.height = this.height;
        that.framebuffer = new og.webgl.Framebuffer(h.gl, this._width, this._height);
        that.framebuffer.initialize();
    };
    img.src = "test.png";

    var vfield = new og.shaderProgram.ShaderProgram("vfield", {
        uniforms: {
            uTexSize: { type: og.shaderProgram.types.VEC2 },
            uTex1: { type: og.shaderProgram.types.SAMPLER2D },
            uHPass: { type: og.shaderProgram.types.BOOL },
            uMod16: { type: og.shaderProgram.types.FLOAT },
            uOrd: { type: og.shaderProgram.types.VEC2 }
        },
        attributes: {
            aPos: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("vfield_vs.txt"),
        fragmentShader: og.utils.readTextFile("vfield_fs.txt")
    });

    h.addShaderProgram(vfield);
};

my.SDF.prototype.frame = function () {
    this.framebuffer && this.makeDF();
}

my.SDF.prototype.makeDF = function () {
    var r = this.renderer;
    var h = r.handler;
    h.shaderPrograms.vfield.activate();
    var sh = h.shaderPrograms.vfield._program;
    var sha = sh.attributes,
        shu = sh.uniforms;

    var gl = h.gl;

    gl.disable(gl.CULL_FACE);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shu.uTex1._pName, 0);

    gl.uniform2fv(shu.uTexSize._pName, [this.width, this.height]);
    gl.uniform2fv(shu.uOrd._pName, [1, 1]);
    gl.uniform1f(shu.uMod16._pName, 0);
    gl.uniform1f(shu.uHPass._pName, false);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(sha.aPos._pName, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this.framebuffer.activate();
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffer.deactivate();

    gl.uniform1f(shu.uHPass._pName, true);
    gl.uniform2fv(shu.uOrd._pName, [1.0, -1.0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffer.texture);
    gl.uniform1i(shu.uTex1._pName, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

