/*> var program = new og.webgl.ShaderProgram("shader name", {
 *>      uniforms : {
 *>          uMVMatrix:{ type: og.webgl.shaderTypes.MAT4, value: [] },
 *>          uPMatrix:{ type: og.webgl.shaderTypes.MAT4, value: [] },
 *>          texOffset:{ type: og.webgl.shaderTypes.VEC2, value: [] },
 *>          texScale:{ type: og.webgl.shaderTypes.FLOAT, value: 1.0 },
 *>          uSampler: { type: og.webgl.shaderTypes.SAMPLER2D, value: null }
 *>          },
 *>      attributes : {
 *>          aVertexPosition:{ type: og.webgl.shaderTypes.VEC3, enableArray: true },
 *>          aTextureCoord:{ type: og.webgl.shaderTypes.VEC2, enableArray: true }
 *>      },
 *>      vertexShader : og.utils.readFile("../../shaders/default_vs.txt");
 *>      fragmentShader: og.utils.readFile("../../shaders/default_vs.txt");
 *>  });
 *
 *
 *
 *
 *
 *
 */

goog.provide('og.webgl.ShaderProgram');

goog.require('og.webgl.shaderTypes');


og.webgl.ShaderProgram.uniformCallbacksArray = [];
og.webgl.ShaderProgram.attributeCallbacksArray = [];

og.webgl.ShaderProgram.uniformCallbacksArray[og.webgl.shaderTypes.MAT4] = function (ctx, program, name, value) {
    ctx.uniformMatrix4fv(program[name], false, value);
};

og.webgl.ShaderProgram.uniformCallbacksArray[og.webgl.shaderTypes.FLOAT] = function (ctx, program, name, value) {
    ctx.uniform1f(program[name], value);
};

og.webgl.ShaderProgram.uniformCallbacksArray[og.webgl.shaderTypes.VEC2] = function (ctx, program, name, value) {
    ctx.uniform2f(program[name], value[0], value[1]);
};

og.webgl.ShaderProgram.uniformCallbacksArray[og.webgl.shaderTypes.SAMPLER2D] = function (ctx, program, name, value) {
    ctx.activeTexture(ctx.TEXTURE0);
    ctx.bindTexture(ctx.TEXTURE_2D, value);
    ctx.uniform1i(program[name], 0);
};

og.webgl.ShaderProgram.attributeCallbacksArray[og.webgl.shaderTypes.MAT4] = function (ctx, program, name, value) {
    ctx.uniformMatrix4fv(program[name], false, value);
};

og.webgl.ShaderProgram = function (name, material) {
    this.name = name;
    this.attributes = material.attributes;
    this.uniforms = material.uniforms;
    this.vertexShader = material.vertexShader;
    this.fragmentShader = material.fragmentShader;
    this.ctx = null;
    this._p = null;
};

og.webgl.ShaderProgram.prototype.apply = function () {
    for (var a in this.attributes) {
        og.webgl.ShaderProgram.attributeCallbacksArray[this.attributes[a].type](this.ctx, this._p[a], a, this.attributes.value);
    }
    for (var u in this.uniforms) {
        og.webgl.ShaderProgram.uniformCallbacksArray[this.attributes[a].type](this.ctx, this._p[a], a, this.uniforms.value);
    }
};

og.webgl.ShaderProgram.prototype.getShaderCompileStatus = function (shader, src) {
    this.ctx.shaderSource(shader, src);
    this.ctx.compileShader(shader);
    if (!this.ctx.getShaderParameter(shader, this.ctx.COMPILE_STATUS)) {
        alert(this.ctx.getShaderInfoLog(shader));
        return false;
    }
    return true;
}

og.webgl.ShaderProgram.prototype.createVertexShader = function (src) {
    var shader = this.ctx.createShader(this.ctx.VERTEX_SHADER);
    if (!this.getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};

og.webgl.ShaderProgram.prototype.createFragmentShader = function (src) {
    var shader = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
    if (!this.getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};


og.webgl.ShaderProgram.prototype.createProgram = function (ctx) {
    this.ctx = ctx;
    this._p = this.ctx.createProgram();

    ctx.attachShader(this._p, this.createFragmentShader(this.fragmentShader));
    ctx.attachShader(this._p, this.createVertexShader(this.vertexShader));
    ctx.linkProgram(this._p);

    if (!ctx.getProgramParameter(this._p, ctx.LINK_STATUS)) {
        alert("Could not initialise shaders.");
    }

    ctx.useProgram(this._p);

    for (var a in this.attributes) {
        this._p[a] = ctx.getAttribLocation(this._p, a);
        if (this.attributes[a].enableArray)
            ctx.enableVertexAttribArray(this._p[a]);
    }

    for (var u in this.uniforms) {
        this._p[u] = ctx.getUniformLocation(this._p, u);
    }
};