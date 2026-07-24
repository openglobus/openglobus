import { cons } from "../cons";
import type { ProgramVariable } from "./variableHandlers";
import { variableHandlers } from "./variableHandlers";
import { types, typeStr } from "./types";
import type { Handler, WebGLBufferExt } from "./Handler";

const itemTypes: string[] = ["BYTE", "SHORT", "UNSIGNED_BYTE", "UNSIGNED_SHORT", "FLOAT", "HALF_FLOAT"];

type WebGLProgramExt = WebGLProgram & { [id: string]: WebGLUniformLocation | number | null };
type ProgramBinding = WebGLUniformLocation | number;

type ProgramMaterial = {
    attributes: Record<string, any>;
    uniforms: Record<string, any>;
    vertexShader: string;
    fragmentShader: string;
};

function injectWebGL2Define(src: string, isWebGL2: boolean): string {
    if (!isWebGL2) return src;

    const lines = src.split("\n");
    const versionIndex = lines.findIndex((line) => line.startsWith("#version"));

    if (versionIndex !== -1) {
        lines.splice(versionIndex + 1, 0, "#define WEBGL2");
        return lines.join("\n");
    } else {
        return src;
    }
}

/**
 * Represents more comfortable using WebGL shader program.
 * @class
 * @param {string} name - ShaderProgram name.
 * @param {ProgramMaterial} material - Object stores uniforms, attributes and program codes:
 * @param {Record<string, any>} material.uniforms - Uniforms definition section.
 * @param {Record<string, any>} material.attributes - Attributes definition section.
 * @param {string} material.vertexShader - Vertex glsl code.
 * @param {string} material.fragmentShader - Fragment glsl code.
 */
class ShaderProgram {
    [id: string]: any;
    /**
     * Shader program name.
     * @public
     * @type {string}
     */
    public name: string;

    protected _handler: Handler | null;

    public _activated: boolean;

    public attributes: { [id: string]: number };
    public uniforms: { [id: string]: WebGLUniformLocation };

    protected _attributes: Record<string, ProgramVariable>;
    protected _uniforms: Record<string, ProgramVariable>;

    public vertexShader: string;
    public fragmentShader: string;

    public drawElementsInstanced: Function | null;
    public vertexAttribDivisor: Function | null;

    /**
     * Webgl context.
     * @public
     * @type {WebGL2RenderingContext | null}
     */
    public gl: WebGL2RenderingContext | null;

    /**
     * All program variables.
     * @protected
     * @type {Record<string, ProgramVariable>}
     */
    protected _variables: Record<string, ProgramVariable>;

    /**
     * ShaderProgram pointer.
     * @protected
     * @type {WebGLProgramExt | null}
     */
    protected _p: WebGLProgramExt | null;

    /**
     * Texture counter.
     * @public
     * @type {number}
     */
    public _textureID: number;

    /**
     * ShaderProgram attributes array.
     * @protected
     * @type {number[]}
     */
    protected _attribArrays: number[];

    /**
     * ShaderProgram attributes divisors.
     * @protected
     * @type {number[]}
     */
    protected _attribDivisor: number[];

    protected _bindings: Record<string, ProgramBinding>;

    protected _dynamicBindingNames: Set<string>;

    constructor(name: string, material: ProgramMaterial) {
        this.name = name;

        this._handler = null;
        this._activated = false;

        this._attributes = {};
        for (let t in material.attributes) {
            if (typeof material.attributes[t] === "string" || typeof material.attributes[t] === "number") {
                this._attributes[t] = { type: material.attributes[t] } as ProgramVariable;
            } else {
                this._attributes[t] = material.attributes[t];
            }
        }

        this._uniforms = {};
        for (let t in material.uniforms) {
            if (typeof material.uniforms[t] === "string" || typeof material.uniforms[t] === "number") {
                this._uniforms[t] = { type: material.uniforms[t] } as ProgramVariable;
            } else {
                this._uniforms[t] = material.uniforms[t];
            }
        }

        this.vertexShader = material.vertexShader;

        this.fragmentShader = material.fragmentShader;

        this.gl = null;

        this._variables = {};

        this._p = null;

        this._textureID = 0;

        this._attribArrays = [];

        this._attribDivisor = [];

        this.attributes = {};

        this.uniforms = {};

        this.vertexAttribDivisor = null;
        this.drawElementsInstanced = null;

        this._bindings = {};
        this._dynamicBindingNames = new Set();
    }

    /**
     * Attaches this shader program to a handler.
     * @param {Handler} handler - WebGL handler.
     * @returns {ShaderProgram}
     */
    public attach(handler: Handler): this {
        this._handler = handler;
        return this;
    }

    /**
     * Initializes this shader program using handler WebGL context.
     * @returns {ShaderProgram}
     */
    public initialize(): this {
        if (this._handler?.gl) {
            this.createProgram(this._handler.gl);
        }
        return this;
    }

    protected _bindVariable(name: string, location: ProgramBinding) {
        const hasBinding = Object.prototype.hasOwnProperty.call(this._bindings, name);
        if (hasBinding && this._bindings[name] !== location) {
            cons.logWrn(`Shader program "${this.name}": duplicate variable '${name}' found.`);
        }

        this._bindings[name] = location;

        if (this._dynamicBindingNames.has(name)) {
            (this as any)[name] = location;
            return;
        }

        if (name in this) {
            cons.logWrn(
                `Shader program "${this.name}": variable '${name}' conflicts with ShaderProgram property and is available via maps only.`
            );
            return;
        }

        this._dynamicBindingNames.add(name);

        Object.defineProperty(this, name, {
            get: () => this._bindings[name],
            set: (value: ProgramBinding) => {
                this._bindings[name] = value;
            },
            enumerable: true,
            configurable: true
        });
    }

    /**
     * Binds attribute buffer and sets its pointer.
     * @param {ShaderProgram} program - Shader program instance.
     * @param {ProgramVariable} variable - Attribute variable descriptor.
     */
    static bindBuffer(program: ShaderProgram, variable: ProgramVariable) {
        let gl = program.gl;
        if (gl) {
            gl.bindBuffer(gl.ARRAY_BUFFER, variable.value);
            gl.vertexAttribPointer(
                variable._pName as number,
                (variable.value as WebGLBufferExt).itemSize,
                variable.itemType as number,
                variable.normalized,
                0,
                0
            );
        }
    }

    /**
     * Makes this shader program current in WebGL context.
     */
    public use() {
        this.gl && this.gl.useProgram(this._p!);
    }

    /**
     * Activates this shader program and disables previously active one.
     * @returns {ShaderProgram}
     */
    public activate(): this {
        if (!this._activated) {
            const activeProgram = this._handler?.activeProgram;
            if (activeProgram && activeProgram !== this) {
                activeProgram.deactivate();
            }
            if (this._handler) {
                this._handler.activeProgram = this;
            }
            this._activated = true;
            this.enableAttribArrays();
            this.use();
        }
        return this;
    }

    /**
     * Deactivates this shader program.
     * @returns {ShaderProgram}
     */
    public deactivate(): this {
        this.disableAttribArrays();
        this._activated = false;
        return this;
    }

    /**
     * Returns `true` if this shader program is active.
     * @returns {boolean}
     */
    public isActive(): boolean {
        return this._activated;
    }

    /**
     * Removes this shader program from its handler and releases WebGL program.
     */
    public remove() {
        const handler = this._handler;
        if (!handler) return;

        if (handler.programs[this.name]) {
            const isActiveProgram = handler.activeProgram === this;
            if (this._activated) {
                this.deactivate();
            }
            this.delete();
            delete handler.programs[this.name];
            if (isActiveProgram) {
                handler.activeProgram = null;
            }
        }
    }

    /**
     * Sets provided shader variables and applies them.
     * Automatically activates this shader program.
     * @param {Record<string, any>} material - Variable values by variable name.
     * @returns {ShaderProgram}
     */
    public set(material: Record<string, any>): this {
        this.activate();
        this._textureID = 0;
        for (let i in material) {
            this._variables[i].value = material[i];
            this._variables[i].func(this, this._variables[i]);
        }
        return this;
    }

    /**
     * Applies currently stored shader variable values.
     */
    public apply() {
        this._textureID = 0;
        let v = this._variables;
        for (let i in v) {
            v[i].func(this, v[i]);
        }
    }

    /**
     * Draws indexed geometry from provided index buffer.
     * @param {number} mode - WebGL draw mode.
     * @param {WebGLBufferExt} buffer - Index buffer.
     * @returns {ShaderProgram}
     */
    public drawIndexBuffer(mode: number, buffer: WebGLBufferExt): this {
        let gl = this.gl!;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.drawElements(mode, buffer.numItems, gl.UNSIGNED_SHORT, 0);
        return this;
    }

    /**
     * Draws non-indexed geometry.
     * @param {number} mode - WebGL draw mode.
     * @param {number} numItems - Vertex count to draw.
     * @returns {ShaderProgram}
     */
    public drawArrays(mode: number, numItems: number): this {
        this.gl!.drawArrays(mode, 0, numItems);
        return this;
    }

    /**
     * Check and log for a shader compile errors and warnings. Returns True - if no errors otherwise returns False.
     * @private
     * @param {WebGLShader} shader - WebGl shader program.
     * @param {string} src - Shader program source.
     * @returns {boolean} -
     */
    protected _getShaderCompileStatus(shader: WebGLShader, src: string): boolean {
        if (!this.gl) return false;

        const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
        this.gl.shaderSource(shader, injectWebGL2Define(src, isWebGL2));
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            cons.logErr(`Shader program "${this.name}":${this.gl.getShaderInfoLog(shader)}.`);
            return false;
        }
        return true;
    }

    /**
     * Returns compiled vertex shader program pointer.
     * @private
     * @param {string} src - Vertex shader source code.
     * @returns {Object} -
     */
    protected _createVertexShader(src: string): WebGLShader | undefined {
        if (!this.gl) return;
        let shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (shader && this._getShaderCompileStatus(shader, src)) {
            return shader;
        }
    }

    /**
     * Returns compiled fragment shader program pointer.
     * @private
     * @param {string} src - Vertex shader source code.
     * @returns {Object} -
     */
    protected _createFragmentShader(src: string): WebGLShader | undefined {
        if (!this.gl) return;
        let shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (shader && this._getShaderCompileStatus(shader, src)) {
            return shader;
        }
    }

    /**
     * Disables all attribute arrays used by this shader program.
     */
    public disableAttribArrays() {
        let gl = this.gl!;
        let a = this._attribArrays;
        for (let i = 0, len = a.length; i < len; i++) {
            gl.disableVertexAttribArray(a[i]);
            this.vertexAttribDivisor!(a[i], 0);
        }
    }

    /**
     * Enables all attribute arrays used by this shader program.
     */
    public enableAttribArrays() {
        let gl = this.gl!;
        let a = this._attribArrays;
        let d = this._attribDivisor;
        for (let i = 0, len = a.length; i < len; i++) {
            gl.enableVertexAttribArray(a[i]);
            this.vertexAttribDivisor!(a[i], d[i]);
        }
    }

    // public vertexAttribDivisor(index: number, divisor: number) {
    //     const gl = this.gl!;
    //     gl.vertexAttribDivisor ?
    //         gl.vertexAttribDivisor(index, divisor) :
    //         gl.getExtension('ANGLE_instanced_arrays').vertexAttribDivisorANGLE(index, divisor);
    // }

    /**
     * Deletes underlying WebGL program.
     */
    public delete() {
        this.gl && this.gl.deleteProgram(this._p!);
    }

    /**
     * Compiles shaders, links WebGL program and resolves variable locations.
     * @param {WebGL2RenderingContext} gl - WebGL context.
     */
    public createProgram(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this._variables = {};
        this._attribArrays = [];
        this._attribDivisor = [];
        this.attributes = {};
        this.uniforms = {};
        this._bindings = {};

        this._p = this.gl.createProgram() as WebGLProgramExt;

        if (!this._p) return;

        let fs = this._createFragmentShader(this.fragmentShader);
        let vs = this._createVertexShader(this.vertexShader);

        if (!fs || !vs) return;

        gl.attachShader(this._p, fs);
        gl.attachShader(this._p, vs);

        gl.linkProgram(this._p);

        if (!this.drawElementsInstanced) {
            if (gl.drawElementsInstanced) {
                this.drawElementsInstanced = gl.drawElementsInstanced.bind(gl);
            } else {
                let ext = gl.getExtension("ANGLE_instanced_arrays");
                if (ext) {
                    this.drawElementsInstanced = ext.drawElementsInstancedANGLE.bind(ext);
                }
            }
        }

        if (!this.vertexAttribDivisor) {
            if (gl.vertexAttribDivisor) {
                this.vertexAttribDivisor = gl.vertexAttribDivisor.bind(gl);
            } else {
                let ext = gl.getExtension("ANGLE_instanced_arrays");
                if (ext) {
                    this.vertexAttribDivisor = ext.vertexAttribDivisorANGLE.bind(ext);
                }
            }
        }

        if (!gl.getProgramParameter(this._p, gl.LINK_STATUS)) {
            cons.logErr(`Shader program "${this.name}": initialization failed. ${gl.getProgramInfoLog(this._p)}.`);
            gl.deleteProgram(this._p);
            return;
        }

        this.use();

        for (let a in this._attributes) {
            //this.attributes[a]._name = a;
            this._variables[a] = this._attributes[a];
            this._attributes[a].func = ShaderProgram.bindBuffer;

            let t = this._attributes[a].itemType as string;
            let itemTypeStr: string = t ? t.trim().toUpperCase() : "FLOAT";

            if (itemTypes.indexOf(itemTypeStr) == -1) {
                cons.logErr(
                    `Shader program "${this.name}": attribute '${a}', item type '${this._attributes[a].itemType}' not exists.`
                );
                this._attributes[a].itemType = gl.FLOAT;
            } else {
                this._attributes[a].itemType = (gl as any)[itemTypeStr];
            }

            this._attributes[a].normalized = this._attributes[a].normalized || false;
            this._attributes[a].divisor = this._attributes[a].divisor || 0;

            this._p[a] = gl.getAttribLocation(this._p, a);

            if (this._p[a] == undefined) {
                cons.logErr(`Shader program "${this.name}":  attribute '${a}' not exists.`);
                gl.deleteProgram(this._p);
                return;
            }

            let type: string | number = this._attributes[a].type;
            if (typeof type === "string") {
                type = typeStr[type.trim().toLowerCase()];
            }

            let d = this._attributes[a].divisor;
            if (type === types.MAT4) {
                let loc = this._p[a] as number;
                this._attribArrays.push(loc, loc + 1, loc + 2, loc + 3);
                this._attribDivisor.push(d, d, d, d);
            } else {
                this._attribArrays.push(this._p[a] as number);
                this._attribDivisor.push(d);
            }

            gl.enableVertexAttribArray(this._p[a] as number);

            this._attributes[a]._pName = this._p[a];
            this.attributes[a] = this._p[a] as number;
            this._bindVariable(a, this.attributes[a]);
        }

        for (let u in this._uniforms) {
            if (typeof this._uniforms[u].type === "string") {
                let t: string = this._uniforms[u].type as string;
                this._uniforms[u].func = variableHandlers.u[typeStr[t.trim().toLowerCase()]];
            } else {
                this._uniforms[u].func = variableHandlers.u[this._uniforms[u].type as number];
            }

            this._variables[u] = this._uniforms[u];
            this._p[u] = gl.getUniformLocation(this._p, u)!;

            if (this._p[u] == undefined) {
                cons.logWrn(`Shader program "${this.name}": uniform '${u}' is inactive (optimized out by driver).`);
                continue;
            }

            this._uniforms[u]._pName = this._p[u];
            this.uniforms[u] = this._p[u] as WebGLUniformLocation;
            this._bindVariable(u, this.uniforms[u]);
        }

        gl.detachShader(this._p as WebGLProgram, fs);
        gl.detachShader(this._p as WebGLProgram, vs);

        gl.deleteShader(fs);
        gl.deleteShader(vs);
    }
}

export { ShaderProgram };
