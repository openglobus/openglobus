/**
 * @module og/webgl/ShaderController
 */

'use strict';

/**
 * This is shader program controller that used by hadler object to access the shader 
 * program capabilities, like switching program during the rendering.
 * Get access to the program from ...handler.shaderPrograms.<program name> etc.
 * @class
 * @param {og.webgl.Handler} handler - Handler.
 * @param {og.shaderProgram.ShaderProgram} shaderProgram - Shader program.
 */
const ShaderController = function (handler, shaderProgram) {

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
ShaderController.prototype.initialize = function () {
    this._program.createProgram(this._handler.gl);
}

/**
 * Returns controller's shader program.
 * @public
 * @return {og.shaderProgram.ShaderProgram}
 */
ShaderController.prototype.getProgram = function () {
    return this._program;
}

/**
 * Activates current shader program.
 * @public
 */
ShaderController.prototype.activate = function () {
    if (!this._activated) {
        this._handler.activeShaderProgram.deactivate();
        this._handler.activeShaderProgram = this;
        var p = this._program;
        this._activated = true;
        p.enableAttribArrays();
        p.use();
    }
    return this;
}

/**
 * Remove program from handler
 * @public
 */
ShaderController.prototype.remove = function () {
    var p = this._handler.shaderPrograms;
    if (p[this._program.name]) {
        if (this._activated) {
            this.deactivate();
        }
        this._program.delete();
        p[this._program.name] = null;
        delete p[this._program.name];
    }
}

/**
 * Deactivate shader program. This is not necessary while activae function used.
 * @public
 */
ShaderController.prototype.deactivate = function () {
    this._program.disableAttribArrays();
    this._activated = false;
}

/**
 * Returns program activity.
 * @public
 * @return {boolean}
 */
ShaderController.prototype.isActive = function () {
    return this._activated;
}

/**
 * Sets program uniforms and attributes values and return controller instance.
 * @public
 * @param {Object} - Object with variable name and value like { value: 12, someArray:[1,2,3], uSampler: texture,... }
 * @return {og.webgl.ShaderController}
 */
ShaderController.prototype.set = function (params) {
    this.activate();
    this._program.set(params);
    return this;
}

/**
 * Draw index buffer with this program.
 * @public
 * @param {number} mode - Gl draw mode
 * @param {}
 * @return {og.webgl.ShaderController} Returns current shader controller instance.
 */
ShaderController.prototype.drawIndexBuffer = function (mode, buffer) {
    this._program.drawIndexBuffer(mode, buffer);
    return this;
}

/**
 * Calls Gl drawArray function.
 * @param {number} - Gl draw mode.
 * @param {number} - draw items count.
 * @return {og.webgl.ShaderController} Returns current shader controller instance.
 */
ShaderController.prototype.drawArray = function (mode, numItems) {
    this._program.drawArray(mode, numItems);
    return this;
}

export { ShaderController };