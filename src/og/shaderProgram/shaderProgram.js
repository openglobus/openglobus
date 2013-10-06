goog.provide('og.shaderProgram.ShaderProgram');

goog.require('og.shaderProgram.callbacks');

og.shaderProgram.ShaderProgram = function (name, material) {
    this.name = name;
    this.attributes = material.attributes;
    this.uniforms = material.uniforms;
    this._variables = {};
    this.vertexShader = material.vertexShader;
    this.fragmentShader = material.fragmentShader;
    this.gl = null;
    this._p = null;
};
og.shaderProgram.ShaderProgram.prototype.activate = function () {
    this.gl.useProgram(this._p);
};

og.shaderProgram.ShaderProgram.prototype.set = function (material) {
    for (var i in material) {
        this._variables[i].value = material[i];
        og.shaderProgram.callbacks[this._variables[i].type](this, this._variables[i]);
    }
};

og.shaderProgram.ShaderProgram.prototype.drawIndexBuffer = function (mode, buffer) {    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.drawElements(mode, buffer.numItems, this.gl.UNSIGNED_SHORT, 0);
};

og.shaderProgram.ShaderProgram.prototype.drawArray = function (mode, numItems) {
    this.gl.drawArrays(mode, 0, numItems);
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

    this.activate();

    for (var a in this.attributes) {
        this.attributes[a]._name = a;
        this._variables[a] = this.attributes[a];
        this._p[a] = gl.getAttribLocation(this._p, a);
        if (this.attributes[a].enableArray)
            gl.enableVertexAttribArray(this._p[a]);
    }

    for (var u in this.uniforms) {
        this.uniforms[u]._name = u;
        this._variables[u] = this.uniforms[u];
        this._p[u] = gl.getUniformLocation(this._p, u);
    }
};