import { cons } from "../cons";
import type { ProgramVariable } from "./variableHandlers";
import { variableHandlers } from "./variableHandlers";
import { types, typeStr } from "./types";
import type { Handler, WebGLBufferExt } from "./Handler";

const itemTypes: string[] = ["BYTE", "SHORT", "UNSIGNED_BYTE", "UNSIGNED_SHORT", "FLOAT", "HALF_FLOAT"];

type WebGLProgramExt = WebGLProgram & { [id: string]: WebGLUniformLocation | number | null };
type ProgramBinding = WebGLUniformLocation | number;

/**
 * Shader defines. A boolean is a switch for ShaderProgram.variant, a number or string is a constant.
 * @example
 * defines: { USE_FOG: true, MAX_LIGHTS: 4 } // #define USE_FOG, #define MAX_LIGHTS 4
 */
export type ProgramDefines = Record<string, boolean | number | string>;

type ProgramMaterial = {
    defines?: ProgramDefines;
    attributes: Record<string, any>;
    uniforms: Record<string, any>;
    vertexShader: string;
    fragmentShader: string;
};

const MAX_VARIANT_BITS = 31;
const variantBits: Record<string, number> = {};
let variantBitCount = 0;

/**
 * Bit of a switch define, the same in every program.
 * @example
 * const USE_FOG = variantBit("USE_FOG");
 * program.variant(USE_FOG); // the program with #define USE_FOG
 * @param {string} name - Define name.
 * @returns {number}
 */
export function variantBit(name: string): number {
    let bit = variantBits[name];
    if (bit === undefined) {
        if (variantBitCount === MAX_VARIANT_BITS) {
            throw new Error(`ShaderProgram: more than ${MAX_VARIANT_BITS} switch defines, can't add "${name}".`);
        }
        bit = variantBits[name] = 1 << variantBitCount++;
    }
    return bit;
}

/**
 * Variant mask of the switches that are true in `flags`.
 * @param {Record<string, boolean>} flags - Switch values by define name.
 * @returns {number}
 */
export function variantMask(flags: Record<string, boolean>): number {
    let mask = 0;
    for (const name in flags) {
        if (flags[name]) {
            mask |= variantBit(name);
        }
    }
    return mask;
}

function defineHeader(defines: ProgramDefines): string {
    let header = "";
    for (const name in defines) {
        const value = defines[name];
        if (value === false) {
            continue;
        }
        header += value === true ? `#define ${name}\n` : `#define ${name} ${value}\n`;
    }
    return header;
}

// WEBGL2 marks GLSL ES 3.00 sources (segment/common.glsl); GLSL ES 1.00 ones without #version don't get it.
function injectDefines(src: string, header: string): string {
    if (!src.startsWith("#version")) {
        return header + src;
    }

    const i = src.indexOf("\n") + 1;

    return src.slice(0, i) + "#define WEBGL2\n" + header + src.slice(i);
}

/**
 * Represents more comfortable using WebGL shader program.
 * @class
 * @param {string} name - ShaderProgram name.
 * @param {ProgramMaterial} material - Object stores uniforms, attributes and program codes:
 * @param {Record<string, any>} material.uniforms - Uniforms definition section.
 * @param {Record<string, any>} material.attributes - Attributes definition section.
 * @param {ProgramDefines} [material.defines] - Preprocessor defines. Boolean ones are switches: such a
 * program compiles lazily, and variant() gives it built with other switch values.
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

    protected _material: ProgramMaterial;

    protected _defines: ProgramDefines;

    protected _defineHeader: string;

    /**
     * Switch defines of the program, their bits (variantBit) and the ones that are on.
     * @protected
     */
    protected _switches: string[];
    protected _switchMask: number;
    protected _variantMask: number;

    /**
     * The program a variant was built from, null for the program itself. The program owns its
     * variants: they are not in the handler's programs and are removed with it.
     * @protected
     */
    protected _base: ShaderProgram | null;
    protected _variants: Map<number, ShaderProgram>;

    constructor(name: string, material: ProgramMaterial) {
        this.name = name;

        this._handler = null;
        this._activated = false;

        // Declarations are copied: compiling writes into them, and variants share the material.
        this._attributes = {};
        for (let t in material.attributes) {
            if (typeof material.attributes[t] === "string" || typeof material.attributes[t] === "number") {
                this._attributes[t] = { type: material.attributes[t] } as ProgramVariable;
            } else {
                this._attributes[t] = { ...material.attributes[t] };
            }
        }

        this._uniforms = {};
        for (let t in material.uniforms) {
            if (typeof material.uniforms[t] === "string" || typeof material.uniforms[t] === "number") {
                this._uniforms[t] = { type: material.uniforms[t] } as ProgramVariable;
            } else {
                this._uniforms[t] = { ...material.uniforms[t] };
            }
        }

        this._material = material;
        this._defines = material.defines || {};
        this._defineHeader = defineHeader(this._defines);
        this._switches = [];
        this._switchMask = 0;
        this._variantMask = 0;

        for (const define in this._defines) {
            const value = this._defines[define];

            if (typeof value === "boolean") {
                const bit = variantBit(define);
                this._switches.push(define);
                this._switchMask |= bit;
                if (value) {
                    this._variantMask |= bit;
                }
            }
        }

        this._base = null;
        this._variants = new Map();

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
        this._variants.forEach((variant) => variant.attach(handler));
        return this;
    }

    /**
     * Initializes this shader program using handler WebGL context.
     * @returns {ShaderProgram}
     */
    public initialize(): this {
        // A program with switches compiles on first use, so a variant nobody draws with costs nothing.
        if (this._handler?.gl && !this._switchMask) {
            this.createProgram(this._handler.gl);
        }
        return this;
    }

    /**
     * Returns the program with the given switches on and the rest off. Unknown switches are ignored.
     * Each variant is compiled once, on first use, and cached.
     * @example
     * program.variant(USE_FOG);           // by bit mask
     * program.variant({ USE_FOG: true }); // by name, the same program
     * @param {number | Record<string, boolean>} switches - Bit mask or switch values by name.
     * @returns {ShaderProgram}
     */
    public variant(switches: number | Record<string, boolean>): ShaderProgram {
        const base = this._base || this;

        let mask = 0;
        if (typeof switches === "number") {
            mask = switches & base._switchMask;
        } else {
            for (let i = 0; i < base._switches.length; i++) {
                if (switches[base._switches[i]]) {
                    mask |= variantBit(base._switches[i]);
                }
            }
        }

        let program = mask === base._variantMask ? base : base._variants.get(mask);
        if (!program) {
            program = base._createVariant(mask);
        }
        program._compile();
        return program;
    }

    protected _createVariant(mask: number): ShaderProgram {
        const defines: ProgramDefines = { ...this._defines };

        for (let i = 0; i < this._switches.length; i++) {
            defines[this._switches[i]] = (mask & variantBit(this._switches[i])) !== 0;
        }

        // The name only tells variants apart in logs, they are not added to the handler's programs.
        const program = new ShaderProgram(`${this.name}#${mask}`, { ...this._material, defines });
        program._base = this;

        if (this._handler) {
            program.attach(this._handler);
        }

        this._variants.set(mask, program);

        return program;
    }

    protected _compile() {
        if (this._p || !this._handler?.gl) return;

        this.createProgram(this._handler.gl);

        const activeProgram = this._handler.activeProgram;
        if (activeProgram && activeProgram !== this) {
            this.deactivate();
            activeProgram.enableAttribArrays();
            activeProgram.use();
        }
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
            this._compile();

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

        this._variants.forEach((variant) => variant._release());
        this._variants.clear();

        if (handler.programs[this.name]) {
            this._release();
            delete handler.programs[this.name];
        }
    }

    protected _release() {
        if (this._activated) {
            this.deactivate();
        }

        this.delete();

        if (this._handler && this._handler.activeProgram === this) {
            this._handler.activeProgram = null;
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

        this.gl.shaderSource(shader, injectDefines(src, this._defineHeader));
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
                // With a switch off, the uniforms of its code are inactive by design.
                if (!this._switchMask) {
                    cons.logWrn(`Shader program "${this.name}": uniform '${u}' is inactive (optimized out by driver).`);
                }
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
