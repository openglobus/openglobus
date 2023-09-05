/**
 * @module og/webgl/callbacks
 */

import {types} from "./types";
import {Program} from "./Program";
import {WebGLBufferExt} from "./Handler";

export type VariableHandler = {
    u: { [id: number]: Function },
    a: { [id: number]: Function }
};

export type ProgramVariable = {
    type: string | number,
    func: Function,
    _pName: WebGLUniformLocation | number,
    value: number | Float32Array | Int32Array | WebGLBufferExt,
    itemType: string | number,
    normalized: boolean,
    divisor: number
};

/*=========================
   Uniforms callbacks
 =========================*/
export const variableHandlers: VariableHandler = {
    u: [],
    a: []
};

variableHandlers.u[types.MAT4] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniformMatrix4fv(variable._pName, false, variable.value as Float32Array);
};

variableHandlers.u[types.MAT3] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniformMatrix3fv(variable._pName, false, variable.value as Float32Array);
};

variableHandlers.u[types.FLOAT] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform1f(variable._pName, variable.value as number);
};

variableHandlers.u[types.INT] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform1i(variable._pName, variable.value as number);
};

variableHandlers.u[types.VEC2] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform2fv(variable._pName, variable.value as Float32Array);
};

variableHandlers.u[types.VEC3] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform3fv(variable._pName, variable.value as Float32Array);
};

variableHandlers.u[types.VEC4] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform4fv(variable._pName, variable.value as Float32Array);
};

variableHandlers.u[types.SAMPLER2D] = function (program: Program, variable: ProgramVariable) {
    let pgl = program.gl!;
    pgl.activeTexture(pgl.TEXTURE0 + program._textureID);
    pgl.bindTexture(pgl.TEXTURE_2D, variable.value);
    pgl.uniform1i(variable._pName, program._textureID);
    program._textureID++;
};

variableHandlers.u[types.SAMPLERCUBE] = function (program: Program, variable: ProgramVariable) {
    let pgl = program.gl!;
    pgl.activeTexture(pgl.TEXTURE0 + program._textureID);
    pgl.bindTexture(pgl.TEXTURE_CUBE_MAP, variable.value);
    pgl.uniform1i(variable._pName, program._textureID);
    program._textureID++;
};

variableHandlers.u[types.SAMPLER2DARRAY] = function (program: Program, variable: ProgramVariable) {
    let value = variable.value as Int32Array;
    let pgl = program.gl!,
        size = value.length;
    let samplerArr = new Int32Array(size);
    for (let i = 0; i < size; i++) {
        pgl.activeTexture(pgl.TEXTURE0 + program._textureID + i);
        pgl.bindTexture(pgl.TEXTURE_2D, value[i]);
        samplerArr[i] = i;
    }
    pgl.uniform1iv(variable._pName, samplerArr);
};

variableHandlers.u[types.INTXX] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform1iv(variable._pName, variable.value as Int32Array);
};

variableHandlers.u[types.FLOATXX] = function (program: Program, variable: ProgramVariable) {
    program.gl!.uniform1fv(variable._pName, variable.value as Float32Array);
};

/*========================
   Attributes callbacks
 ========================*/
variableHandlers.a[types.FLOAT] = function (program: Program, variable: ProgramVariable) {
    program.gl!.vertexAttrib1f(variable._pName as number, variable.value as number);
};

variableHandlers.a[types.VEC2] = function (program: Program, variable: ProgramVariable) {
    program.gl!.vertexAttrib2fv(variable._pName as number, variable.value as Float32Array);
};

variableHandlers.a[types.VEC3] = function (program: Program, variable: ProgramVariable) {
    program.gl!.vertexAttrib3fv(variable._pName as number, variable.value as Float32Array);
};

//VariableHandlers.a[types.VEC4] = function (program, variable) {
//    program.gl.vertexAttrib4fv(variable._pName, variable.value);
//};
