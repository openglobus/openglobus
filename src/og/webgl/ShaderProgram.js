/**
 * @module og/webgl/ShaderProgram
 */

'use strict';

import { callbacks } from './callbacks.js';
import { _cons } from '../console.js';

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
class ShaderProgram {
    constructor(name, material) {
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
    }

    /**
     * Sets the current program frame.
     * @public
     */
    use() {
        this.gl.useProgram(this._p);
    }

    /**
     * Sets program variables.
     * @public
     * @param {Object} material - Variables and values object.
     */
    set(material) {
        this._textureID = 0;
        for (var i in material) {
            this._variables[i].value = material[i];
            this._variables[i]._callback(this, this._variables[i]);
        }
    }

    /**
     * Apply current variables.
     * @public
     */
    apply() {
        this._textureID = 0;
        var v = this._variables;
        for (var i in v) {
            v[i]._callback(this, v[i]);
        }
    }

    /**
     * Calls drawElements index buffer function.
     * @public
     * @param {number} mode - Draw mode(GL_TRIANGLES, GL_LINESTRING etc.).
     * @param {Object} buffer - Index buffer.
     */
    drawIndexBuffer(mode, buffer) {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.drawElements(mode, buffer.numItems, this.gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Calls drawArrays function.
     * @public
     * @param {number} mode - Draw mode(GL_TRIANGLES, GL_LINESTRING etc.).
     * @param {number} numItems - Curent binded buffer drawing items count.
     */
    drawArray(mode, numItems) {
        this.gl.drawArrays(mode, 0, numItems);
    }

    /**
     * Check and log for an shader compile errors and warnings. Returns True - if no errors otherwise returns False.
     * @private
     * @param {Object} shader - WebGl shader program.
     * @param {string} src - Shader program source.
     * @returns {boolean}
     */
    _getShaderCompileStatus(shader, src) {
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            _cons.logErr("og/shaderProgram/ShaderProgram:" + this.name + " - " + this.gl.getShaderInfoLog(shader) + ".");
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
    _createVertexShader(src) {
        var shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (!this._getShaderCompileStatus(shader, src)) {
            return null;
        }
        return shader;
    }

    /**
     * Returns compiled fragment shader program pointer.
     * @private
     * @param {string} src - Vertex shader source code.
     * @returns {Object}
     */
    _createFragmentShader(src) {
        var shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (!this._getShaderCompileStatus(shader, src)) {
            return null;
        }
        return shader;
    }

    /**
     * Disable current program vertexAttribArrays.
     * @public
     */
    disableAttribArrays() {
        var gl = this.gl;
        var a = this._attribArrays;
        var i = a.length;
        while (i--) {
            gl.disableVertexAttribArray(a[i]);
        }
    }

    /**
     * Enable current program vertexAttribArrays.
     * @public
     */
    enableAttribArrays() {
        var gl = this.gl;
        var a = this._attribArrays;
        var i = a.length;
        while (i--) {
            gl.enableVertexAttribArray(a[i]);
        }
    }

    /**
     * Delete program.
     * @public
     */
    delete() {
        this.gl.deleteProgram(this._p);
    }

    /**
     * Creates program.
     * @public
     * @param {Object} gl - WebGl context.
     */
    createProgram(gl) {
        this.gl = gl;
        this._p = this.gl.createProgram();

        var fs = this._createFragmentShader(this.fragmentShader);
        var vs = this._createVertexShader(this.vertexShader);
        gl.attachShader(this._p, fs);
        gl.attachShader(this._p, vs);
        gl.linkProgram(this._p);

        if (!gl.getProgramParameter(this._p, gl.LINK_STATUS)) {
            _cons.logErr("og/shaderProgram/ShaderProgram:" + this.name + " - couldn't initialise shaders. " + gl.getProgramInfoLog(this._p) + ".");
            gl.deleteProgram(this._p);
            return;
        }

        this.use();

        for (var a in this.attributes) {
            this.attributes[a]._name = a;
            this._variables[a] = this.attributes[a];

            //Maybe, it will be better to remove enableArray option...
            this.attributes[a].enableArray = (this.attributes[a].enableArray != undefined ? this.attributes[a].enableArray : true);
            if (this.attributes[a].enableArray)
                this.attributes[a]._callback = ShaderProgram.bindBuffer;
            else
                this.attributes[a]._callback = callbacks.a[this.attributes[a].type];

            this._p[a] = gl.getAttribLocation(this._p, a);

            if (this._p[a] == undefined) {
                _cons.logErr("og/shaderProgram/ShaderProgram:" + this.name + " - attribute '" + a + "' is not exists.");
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
            this.uniforms[u]._callback = callbacks.u[this.uniforms[u].type];
            this._variables[u] = this.uniforms[u];
            this._p[u] = gl.getUniformLocation(this._p, u);

            if (this._p[u] == undefined) {
                _cons.logErr("og/shaderProgram/ShaderProgram:" + this.name + " - uniform '" + u + "' is not exists.");
                gl.deleteProgram(this._p);
                return;
            }

            this.uniforms[u]._pName = this._p[u];
        }

        //Maybe it will be better to deleteProgram...
        gl.detachShader(this._p, fs);
        gl.detachShader(this._p, vs);
    }

    /**
     * Bind program buffer.
     * @function
     * @param {og.shaderProgram.ShaderProgram} program - Used program.
     * @param {Object} variable - Variable represents buffer data.
     */
    static bindBuffer(program, variable) {
        var gl = program.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, variable.value);
        gl.vertexAttribPointer(variable._pName, variable.value.itemSize, gl.FLOAT, false, 0, 0);
    }
};

export { ShaderProgram };