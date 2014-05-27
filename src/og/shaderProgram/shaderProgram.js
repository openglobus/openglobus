goog.provide('og.shaderProgram');
goog.provide('og.shaderProgram.ShaderProgram');

goog.require('og.shaderProgram.callbacks');

//og.shaderProgram.SHADERS_URL = "http://www.openglobus.org/shaders/";
og.shaderProgram.SHADERS_URL = "../../src/og/shaders/";

og.shaderProgram.ShaderProgram = function (name, material) {
    this.name = name;
    this.attributes = material.attributes;
    this.uniforms = material.uniforms;
    this._variables = {};
    this.vertexShader = material.vertexShader;
    this.fragmentShader = material.fragmentShader;
    this.gl = null;
    this._p = null;
    this._textureID = 0;
    this._attribArrays = [];
};

og.shaderProgram.ShaderProgram.prototype.use = function () {
    this.gl.useProgram(this._p);
};

og.shaderProgram.ShaderProgram.prototype.set = function (material) {
    this._textureID = 0;
    for (var i in material) {
        this._variables[i].value = material[i];
        this._variables[i]._callback(this, this._variables[i]);
    }
};

og.shaderProgram.ShaderProgram.prototype.apply = function () {
    this._textureID = 0;
    var v = this._variables;
    for (var i in v) {
        v[i]._callback(this, v[i]);
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

og.shaderProgram.ShaderProgram.prototype.disableAttribArrays = function () {
    var gl = this.gl;
    var a = this._attribArrays;
    var i = a.length;
    while (i--) {
        gl.disableVertexAttribArray(a[i]);
    }
};

og.shaderProgram.ShaderProgram.prototype.enableAttribArrays = function () {
    var gl = this.gl;
    var a = this._attribArrays;
    var i = a.length;
    while (i--) {
        gl.enableVertexAttribArray(a[i]);
    }
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

    this.use();

    for (var a in this.attributes) {
        this.attributes[a]._name = a;
        this._variables[a] = this.attributes[a];

        if (this.attributes[a].enableArray)
            this.attributes[a]._callback = og.shaderProgram.bindBuffer;
        else
            this.attributes[a]._callback = og.shaderProgram.callbacks.a[this.attributes[a].type];

        this._p[a] = gl.getAttribLocation(this._p, a);

        if (!this._p[u]) {
            //alert("error: Shader program: attribute " + a + " is not exists.");
        }

        if (this.attributes[a].enableArray) {
            this._attribArrays.push(this._p[a]);
            gl.enableVertexAttribArray(this._p[a]);
        }

        this.attributes[a]._pName = this._p[a];
    }

    for (var u in this.uniforms) {
        this.uniforms[u]._name = u;
        this.uniforms[u]._callback = og.shaderProgram.callbacks.u[this.uniforms[u].type];
        this._variables[u] = this.uniforms[u];
        this._p[u] = gl.getUniformLocation(this._p, u);

        if (!this._p[u]) {
            //alert("error: Shader program: uniform " + u + " is not exists.");
        }

        this.uniforms[u]._pName = this._p[u];
    }
};