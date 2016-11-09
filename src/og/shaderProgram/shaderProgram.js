goog.provide('og.shaderProgram');
goog.provide('og.shaderProgram.ShaderProgram');

goog.require('og');
goog.require('og.shaderProgram.callbacks');

/**
 * Represents more comfortable using WebGL shader program.
 * @class
 * @param {string} name - Shader program name identificator.
 * @param {object} material - Object stores uniforms, attributes and program codes:
 * @param {object} material.uniforms - Uniforms definition section.
 * @param {object} material.attributes - Attributes definition section.
 * @param {string} material.vertexShader - Vertex glsl code.
 * @param {string} material.fragmentShader - Fragment glsl code.
 */
og.shaderProgram.ShaderProgram = function (name, material) {
    /**
     * Shader progarm name.
     * @public
     * @type {string}
     */
    this.name = name;

    /**
     * Attributes.
     * @public
     * @type {Object}
     */
    this.attributes = material.attributes;

    /**
     * Uniforms.
     * @public
     * @type {Object}
     */
    this.uniforms = material.uniforms;

    /**
     * Vertex shader.
     * @public
     * @type {string}
     */
    this.vertexShader = material.vertexShader;

    /**
     * Fragment shader.
     * @public
     * @type {string}
     */
    this.fragmentShader = material.fragmentShader;

    /**
     * Webgl context.
     * @public
     * @type {Object}
     */
    this.gl = null;

    /**
     * All program variables.
     * @private
     * @type {Object}
     */
    this._variables = {};

    /**
     * Program pointer.
     * @private
     * @type {Object}
     */
    this._p = null;

    /**
     * Texture counter.
     * @prvate
     * @type {number}
     */
    this._textureID = 0;

    /**
     * Program attributes array.
     * @private
     * @type {Array.<Object>}
     */
    this._attribArrays = [];
};

/**
 * Sets the current program frame.
 * @public
 */
og.shaderProgram.ShaderProgram.prototype.use = function () {
    this.gl.useProgram(this._p);
};

/**
 * Sets program variables.
 * @public
 * @param {Object} material - Variables and values object.
 */
og.shaderProgram.ShaderProgram.prototype.set = function (material) {
    this._textureID = 0;
    for (var i in material) {
        this._variables[i].value = material[i];
        this._variables[i]._callback(this, this._variables[i]);
    }
};

/**
 * Apply current variables.
 * @public
 */
og.shaderProgram.ShaderProgram.prototype.apply = function () {
    this._textureID = 0;
    var v = this._variables;
    for (var i in v) {
        v[i]._callback(this, v[i]);
    }
};

/**
 * Calls drawElements index buffer function.
 * @public
 * @param {number} mode - Draw mode(GL_TRIANGLES, GL_LINESTRING etc.).
 * @param {Object} buffer - Index buffer.
 */
og.shaderProgram.ShaderProgram.prototype.drawIndexBuffer = function (mode, buffer) {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.drawElements(mode, buffer.numItems, this.gl.UNSIGNED_SHORT, 0);
};

/**
 * Calls drawArrays function.
 * @public
 * @param {number} mode - Draw mode(GL_TRIANGLES, GL_LINESTRING etc.).
 * @param {number} numItems - Curent binded buffer drawing items count.
 */
og.shaderProgram.ShaderProgram.prototype.drawArray = function (mode, numItems) {
    this.gl.drawArrays(mode, 0, numItems);
};

/**
 * Check and log for an shader compile errors and warnings. Returns True - if no errors otherwise returns False.
 * @private
 * @param {Object} shader - WebGl shader program.
 * @param {string} src - Shader program source.
 * @returns {boolean}
 */
og.shaderProgram.ShaderProgram.prototype._getShaderCompileStatus = function (shader, src) {
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        og.console.logErr("og.shaderProgram.ShaderProgram:" + this.name + " - " + this.gl.getShaderInfoLog(shader) + ".");
        return false;
    }
    return true;
}

/**
 * Returns compiled vertex shader program pointer.
 * @private
 * @param {string} src - Vertex shader source code.
 * @returns {Object}
 */
og.shaderProgram.ShaderProgram.prototype._createVertexShader = function (src) {
    var shader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!this._getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};

/**
 * Returns compiled fragment shader program pointer.
 * @private
 * @param {string} src - Vertex shader source code.
 * @returns {Object}
 */
og.shaderProgram.ShaderProgram.prototype._createFragmentShader = function (src) {
    var shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!this._getShaderCompileStatus(shader, src)) {
        return null;
    }
    return shader;
};

/**
 * Disable current program vertexAttribArrays.
 * @public
 */
og.shaderProgram.ShaderProgram.prototype.disableAttribArrays = function () {
    var gl = this.gl;
    var a = this._attribArrays;
    var i = a.length;
    while (i--) {
        gl.disableVertexAttribArray(a[i]);
    }
};

/**
 * Enable current program vertexAttribArrays.
 * @public
 */
og.shaderProgram.ShaderProgram.prototype.enableAttribArrays = function () {
    var gl = this.gl;
    var a = this._attribArrays;
    var i = a.length;
    while (i--) {
        gl.enableVertexAttribArray(a[i]);
    }
};

/**
 * Delete program.
 * @public
 */
og.shaderProgram.ShaderProgram.prototype.delete = function () {
    this.gl.deleteProgram(this._p);
};

/**
 * Creates program.
 * @public
 * @param {Object} gl - WebGl context.
 */
og.shaderProgram.ShaderProgram.prototype.createProgram = function (gl) {
    this.gl = gl;
    this._p = this.gl.createProgram();

    var fs = this._createFragmentShader(this.fragmentShader);
    var vs = this._createVertexShader(this.vertexShader);
    gl.attachShader(this._p, fs);
    gl.attachShader(this._p, vs);
    gl.linkProgram(this._p);

    if (!gl.getProgramParameter(this._p, gl.LINK_STATUS)) {
        og.console.logErr("og.shaderProgram.ShaderProgram:" + this.name + " - couldn't initialise shaders. " + gl.getProgramInfoLog(this._p) + ".");
        gl.deleteProgram(this._p);
        return;
    }

    this.use();

    gl.detachShader(this._p, fs);
    gl.detachShader(this._p, vs);

    for (var a in this.attributes) {
        this.attributes[a]._name = a;
        this._variables[a] = this.attributes[a];

        if (this.attributes[a].enableArray)
            this.attributes[a]._callback = og.shaderProgram.bindBuffer;
        else
            this.attributes[a]._callback = og.shaderProgram.callbacks.a[this.attributes[a].type];

        this._p[a] = gl.getAttribLocation(this._p, a);

        if (this._p[a] == undefined) {
            og.console.logErr("og.shaderProgram.ShaderProgram:" + this.name + " - attribute " + a + " is not exists.");
            gl.deleteProgram(this._p);
            return;
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

        if (this._p[u] == undefined) {
            og.console.logErr("og.shaderProgram.ShaderProgram:" + this.name + " - uniform " + u + " is not exists.");
            gl.deleteProgram(this._p);
            return;
        }

        this.uniforms[u]._pName = this._p[u];
    }
};