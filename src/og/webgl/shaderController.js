goog.provide('og.webgl.ShaderController');

/**
 * This is shader program controller that used by hadler object to access the shader 
 * program capabilities, like switching program during the rendering.
 * Get access to the program from ...handler.shaderPrograms.<program name> etc.
 * @class
 * @param {og.webgl.Handler} handler - Handler.
 * @param {og.shaderProgram.ShaderProgram} shaderProgram - Shader program.
 */
og.webgl.ShaderController = function (handler, shaderProgram) {

    /**
     * Shader program.
     * @private
     * @type {og.shaderProgram.ShaderProgram}
     */
    this._program = shaderProgram;

    /**
     * Handler.
     * @private
     * @type {og.webgl.Handler}
     */
    this._handler = handler;

    /**
     * Program current frame activation flag.
     * @private
     * @type {boolean}
     */
    this._activated = false;
};

/**
 * Lazy create program call.
 * @public
 */
og.webgl.ShaderController.prototype.initialize = function () {
    this._program.createProgram(this._handler.gl);
};

/**
 * Returns controller's shader program.
 * @public
 * @return {og.shaderProgram.ShaderProgram}
 */
og.webgl.ShaderController.prototype.getProgram = function () {
    return this._program;
};

/**
 * Activates current shader program.
 * @public
 */
og.webgl.ShaderController.prototype.activate = function () {
    if (!this._activated) {
        this._handler.activeShaderProgram.deactivate();
        this._handler.activeShaderProgram = this;
        var p = this._program;
        this._activated = true;
        p.enableAttribArrays();
        p.use();
    }
};

/**
 * Remove program from handler
 * @public
 */
og.webgl.ShaderController.prototype.remove = function () {
    var p = this._handler.shaderPrograms;
    if (p[this._program.name]) {
        if (this._activated) {
            this.deactivate();
        }
        this._program.delete();
        p[this._program.name] = null;
        delete p[this._program.name];
    }
};

/**
 * Deactivate shader program. This is not necessary while activae function used.
 * @public
 */
og.webgl.ShaderController.prototype.deactivate = function () {
    this._program.disableAttribArrays();
    this._activated = false;
};

/**
 * Returns program activity.
 * @public
 * @return {boolean}
 */
og.webgl.ShaderController.prototype.isActive = function () {
    return this._activated;
};

/**
 * Sets program uniforms and attributes values.
 * @public
 * @param {Object} - Object with variable name and value like { value: 12, someArray:[1,2,3], uSampler: texture,... }
 */
og.webgl.ShaderController.prototype.set = function (params) {
    this._program.set(params);
};

/**
 * Draw index buffer with this program
 * @public
 * @param {number} mode - Gl draw mode
 * @param {}
 */
og.webgl.ShaderController.prototype.drawIndexBuffer = function (mode, buffer) {
    this._program.drawIndexBuffer(mode, buffer);
};

/**
 * Calls Gl drawArray function.
 * @param {number} - Gl draw mode.
 * @param {number} - draw items count.
 */
og.webgl.ShaderController.prototype.drawArray = function (mode, numItems) {
    this._program.drawArray(mode, numItems);
};