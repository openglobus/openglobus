import {cons} from "../cons";
import {ProgramVariable, variableHandlers} from "./variableHandlers";
import {types, typeStr} from "./types";
import {WebGLBufferExt} from "./Handler";

const itemTypes: string[] = ["BYTE", "SHORT", "UNSIGNED_BYTE", "UNSIGNED_SHORT", "FLOAT", "HALF_FLOAT"];

type WebGLProgramExt = WebGLProgram & { [id: string]: WebGLUniformLocation };

type ProgramMaterial = {
    attributes: Record<string, any>;
    uniforms: Record<string, any>,
    vertexShader: string;
    fragmentShader: string
};

/**
 * Represents more comfortable using WebGL shader program.
 * @class
 * @param {string} name - Program name.
 * @param {ProgramMaterial} material - Object stores uniforms, attributes and program codes:
 * @param {Record<string, any>} material.uniforms - Uniforms definition section.
 * @param {Record<string, any>} material.attributes - Attributes definition section.
 * @param {string} material.vertexShader - Vertex glsl code.
 * @param {string} material.fragmentShader - Fragment glsl code.
 */
class Program {
    /**
     * Shader program name.
     * @public
     * @type {string}
     */
    public name: string;

    public attributes: { [id: string]: number };

    public uniforms: { [id: string]: WebGLUniformLocation };

    public _attributes: Record<string, ProgramVariable>;

    public _uniforms: Record<string, ProgramVariable>;

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
     * @private
     * @type {Record<string, ProgramVariable>}
     */
    protected _variables: Record<string, ProgramVariable>;

    /**
     * Program pointer.
     * @private
     * @type {WebGLProgramExt | null}
     */
    public _p: WebGLProgramExt | null;

    /**
     * Texture counter.
     * @protected
     * @type {number}
     */
    public _textureID: number;

    /**
     * Program attributes array.
     * @private
     * @type {number[]}
     */
    protected _attribArrays: number[];

    /**
     * Program attributes divisors.
     * @protected
     * @type {number[]}
     */
    protected _attribDivisor: number[];

    constructor(name: string, material: ProgramMaterial) {

        this.name = name;

        this._attributes = {};
        for (let t in material.attributes) {
            if (
                typeof material.attributes[t] === "string" ||
                typeof material.attributes[t] === "number"
            ) {
                this._attributes[t] = {type: material.attributes[t]} as ProgramVariable;
            } else {
                this._attributes[t] = material.attributes[t];
            }
        }

        this._uniforms = {};
        for (let t in material.uniforms) {
            if (
                typeof material.uniforms[t] === "string" ||
                typeof material.uniforms[t] === "number"
            ) {
                this._uniforms[t] = {type: material.uniforms[t]} as ProgramVariable;
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
    }

    /**
     * Bind program buffer.
     * @function
     * @param {Program} program - Used program.
     * @param {Object} variable - Variable represents buffer data.
     */
    static bindBuffer(program: Program, variable: ProgramVariable) {
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
     * Sets the current program frame.
     * @public
     */
    public use() {
        this.gl && this.gl.useProgram(this._p!);
    }

    /**
     * Sets program variables.
     * @public
     * @param {Object} material - Variables and values object.
     */
    public set(material: Record<string, any>) {
        this._textureID = 0;
        for (let i in material) {
            this._variables[i].value = material[i];
            this._variables[i].func(this, this._variables[i]);
        }
    }

    /**
     * Apply current variables.
     * @public
     */
    public apply() {
        this._textureID = 0;
        let v = this._variables;
        for (let i in v) {
            v[i].func(this, v[i]);
        }
    }

    /**
     * Calls drawElements index buffer function.
     * @public
     * @param {number} mode - Draw mode(GL_TRIANGLES, GL_LINESTRING etc.).
     * @param {Object} buffer - Index buffer.
     */
    public drawIndexBuffer(mode: number, buffer: WebGLBufferExt) {
        let gl = this.gl!;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.drawElements(mode, buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Calls drawArrays function.
     * @public
     * @param {number} mode - Draw mode GL_TRIANGLES, GL_LINESTRING, etc.
     * @param {number} numItems - Items to draw
     */
    public drawArrays(mode: number, numItems: number) {
        this.gl!.drawArrays(mode, 0, numItems);
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

        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            cons.logErr(
                `Shader program "${this.name}":${this.gl.getShaderInfoLog(shader)}.`
            );
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
     * Disable current program vertexAttribArrays.
     * @public
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
     * Enable current program vertexAttribArrays.
     * @public
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
     * Delete program.
     * @public
     */
    public delete() {
        this.gl && this.gl.deleteProgram(this._p!);
    }

    /**
     * Creates program.
     * @public
     * @param {Object} gl - WebGl context.
     */
    public createProgram(gl: WebGL2RenderingContext) {
        this.gl = gl;

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
                let ext = gl.getExtension('ANGLE_instanced_arrays');
                if (ext) {
                    this.drawElementsInstanced = ext.drawElementsInstancedANGLE.bind(ext);
                }
            }
        }

        if (!this.vertexAttribDivisor) {
            if (gl.vertexAttribDivisor) {
                this.vertexAttribDivisor = gl.vertexAttribDivisor.bind(gl);
            } else {
                let ext = gl.getExtension('ANGLE_instanced_arrays');
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
            this._attributes[a].func = Program.bindBuffer;

            let t = this._attributes[a].itemType as string;
            let itemTypeStr: string = t ? t.trim().toUpperCase() : "FLOAT";

            if (itemTypes.indexOf(itemTypeStr) == -1) {
                cons.logErr(`Shader program "${this.name}": attribute '${a}', item type '${this._attributes[a].itemType}' not exists.`);
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
                cons.logErr(`Shader program "${this.name}": uniform '${u}' not exists.`);
                gl.deleteProgram(this._p);
                return;
            }

            this._uniforms[u]._pName = this._p[u];
            this.uniforms[u] = this._p[u];
        }

        gl.detachShader(this._p as WebGLProgram, fs);
        gl.detachShader(this._p as WebGLProgram, vs);

        gl.deleteShader(fs);
        gl.deleteShader(vs);
    }
}

export {Program};
