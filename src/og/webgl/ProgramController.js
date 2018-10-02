'use strict';

/**
 * This is shader program controller that used by hadler object to access the shader 
 * program capabilities, like switching program during the rendering.
 * Get access to the program from ...handler.programs.<program name> etc.
 * @class
 * @param {og.webgl.Handler} handler - Handler.
 * @param {og.webgl.Program} program - Shader program.
 */
const ProgramController = function (handler, program) {

    /**
     * Shader program.
     * @private
     * @type {og.webgl.Program}
     */
    this._program = program;

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
ProgramController.prototype.initialize = function () {
    this._program.createProgram(this._handler.gl);
};

/**
 * Returns controller's shader program.
 * @public
 * @return {og.webgl.Program} -
 */
ProgramController.prototype.getProgram = function () {
    return this._program;
};

/**
 * Activates current shader program.
 * @public
 * @returns {ProgramController} -
 */
ProgramController.prototype.activate = function () {
    if (!this._activated) {
        this._handler.activeProgram.deactivate();
        this._handler.activeProgram = this;
        var p = this._program;
        this._activated = true;
        p.enableAttribArrays();
        p.use();
    }
    return this;
};

/**
 * Remove program from handler
 * @public
 */
ProgramController.prototype.remove = function () {
    var p = this._handler.programs;
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
ProgramController.prototype.deactivate = function () {
    this._program.disableAttribArrays();
    this._activated = false;
};

/**
 * Returns program activity.
 * @public
 * @return {boolean} -
 */
ProgramController.prototype.isActive = function () {
    return this._activated;
};

/**
 * Sets program uniforms and attributes values and return controller instance.
 * @public
 * @param {Object} params - Object with variable name and value like { value: 12, someArray:[1,2,3], uSampler: texture,... }
 * @return {og.webgl.ProgramController} -
 */
ProgramController.prototype.set = function (params) {
    this.activate();
    this._program.set(params);
    return this;
};

/**
 * Draw index buffer with this program.
 * @public
 * @param {number} mode - Gl draw mode
 * @param {WEBGLBuffer} buffer - Buffer to draw.
 * @return {og.webgl.ProgramController} Returns current shader controller instance.
 */
ProgramController.prototype.drawIndexBuffer = function (mode, buffer) {
    this._program.drawIndexBuffer(mode, buffer);
    return this;
};

/**
 * Calls Gl drawArray function.
 * @param {number} mode - Gl draw mode.
 * @param {number} numItems - draw items count.
 * @return {og.webgl.ProgramController} Returns current shader controller instance.
 */
ProgramController.prototype.drawArrays = function (mode, numItems) {
    this._program.drawArrays(mode, numItems);
    return this;
};

export { ProgramController };