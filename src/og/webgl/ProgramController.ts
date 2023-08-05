"use strict";

import {Handler, WebGLBufferExt} from "./Handler";
import {Program} from "./Program";

/**
 * This is shader program controller that used by handler object to access the shader
 * program capabilities, like switching program during the rendering.
 * Get access to the program from ...handler.programs.<program name> etc.
 * @class
 * @param {Handler} handler - Handler.
 * @param {Program} program - Shader program.
 */
export class ProgramController {

    /**
     * Handler.
     * @private
     * @type {Handler}
     */
    protected _handler: Handler;

    /**
     * Shader program.
     * @private
     * @type {Program}
     */
    public _program: Program;

    /**
     * Program current frame activation flag.
     * @private
     * @type {boolean}
     */
    public _activated: boolean;

    constructor(handler: Handler, program: Program) {

        this._program = program;

        this._handler = handler;

        this._activated = false;
    }

    /**
     * Lazy create program call.
     * @public
     */
    public initialize() {
        if (this._handler.gl) {
            this._program.createProgram(this._handler.gl);
        }
    }

    /**
     * Returns controller's shader program.
     * @public
     * @return {Program} -
     */
    public getProgram(): Program {
        return this._program;
    }

    /**
     * Activates current shader program.
     * @public
     * @returns {ProgramController} -
     */
    public activate() {
        if (!this._activated) {
            this._handler.activeProgram!.deactivate();
            this._handler.activeProgram = this;
            let p = this._program;
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
    public remove() {
        let p = this._handler.programs;
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
     * Deactivate shader program. This is not necessary while activate function used.
     * @public
     */
    public deactivate() {
        this._program.disableAttribArrays();
        this._activated = false;
    }

    /**
     * Returns program activity.
     * @public
     * @return {boolean} -
     */
    public isActive(): boolean {
        return this._activated;
    }

    /**
     * Sets program uniforms and attributes values and return controller instance.
     * @public
     * @param {Object} params - Object with variable name and value like { value: 12, someArray:[1,2,3], uSampler: texture,... }
     * @return {ProgramController} -
     */
    public set(params: any) {
        this.activate();
        this._program.set(params);
        return this;
    }

    /**
     * Draw index buffer with this program.
     * @public
     * @param {number} mode - Gl draw mode
     * @param {WebGLBuffer} buffer - Buffer to draw.
     * @return {ProgramController} Returns current shader controller instance.
     */
    public drawIndexBuffer(mode: number, buffer: WebGLBufferExt): ProgramController {
        this._program.drawIndexBuffer(mode, buffer);
        return this;
    }

    /**
     * Calls Gl drawArray function.
     * @param {number} mode - Gl draw mode.
     * @param {number} numItems - draw items count.
     * @return {ProgramController} Returns current shader controller instance.
     */
    public drawArrays(mode: number, numItems: number): ProgramController {
        this._program.drawArrays(mode, numItems);
        return this;
    }
}
