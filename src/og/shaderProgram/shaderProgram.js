goog.provide('og.shaderProgram.ShaderProgram');

goog.require('og.shaderProgram.callbacks');

og.shaderProgram.ShaderProgram = function (name, material) {
    this.name = name;
    this.attributes = material.attributes;
    this.uniforms = material.uniforms;
    this.vertexShader = material.vertexShader;
    this.fragmentShader = material.fragmentShader;
    this.gl = null;
    this._p = null;
};

og.shaderProgram.ShaderProgram.prototype.apply = function () {

    for (var n in this.uniforms) {
        og.shaderProgram.callbacks[this.uniforms[n].type](this, n, this.uniforms);
    }

    for (var n in this.attributes) {
        var an = this.attributes[n];
        if (an.enableArray) {
            var gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, an.buffer);
            gl.vertexAttribPointer(this._p[n], an.buffer.itemSize, gl.FLOAT, false, 0, 0);
        } else {
            og.shaderProgram.callbacks[an.type](this, n, this.attributes);
        }
    }
};

og.shaderProgram.ShaderProgram.prototype.getShaderCompileStatus = function (shader, src) {
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        alert(this.gl.getShaderInfoLog(shader));
        return false;
    }
    return true;
}

og.shaderProgram.ShaderProgram.prototype.createVertexShader = function (src) {
    var shader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!this.getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};

og.shaderProgram.ShaderProgram.prototype.createFragmentShader = function (src) {
    var shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!this.getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};


og.shaderProgram.ShaderProgram.prototype.createProgram = function (gl) {
    this.gl = gl;
    this._p = this.gl.createProgram();

    gl.attachShader(this._p, this.createFragmentShader(this.fragmentShader));
    gl.attachShader(this._p, this.createVertexShader(this.vertexShader));
    gl.linkProgram(this._p);

    if (!gl.getProgramParameter(this._p, gl.LINK_STATUS)) {
        alert("Could not initialise shaders.");
    }

    gl.useProgram(this._p);

    for (var a in this.attributes) {
        this._p[a] = gl.getAttribLocation(this._p, a);
        if (this.attributes[a].enableArray)
            gl.enableVertexAttribArray(this._p[a]);
    }

    for (var u in this.uniforms) {
        this._p[u] = gl.getUniformLocation(this._p, u);
    }
};