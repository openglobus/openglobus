/**
 * @module og/webgl/callbacks
 */

"use strict";

import { types } from "./types.js";

/*=========================
   Uniforms callbacks
 =========================*/
export const callbacks = {
    u: [],
    a: []
};

callbacks.u[types.MAT4] = function (program, variable) {
    program.gl.uniformMatrix4fv(variable._pName, false, variable.value);
};

callbacks.u[types.MAT3] = function (program, variable) {
    program.gl.uniformMatrix3fv(variable._pName, false, variable.value);
};

callbacks.u[types.FLOAT] = function (program, variable) {
    program.gl.uniform1f(variable._pName, variable.value);
};

callbacks.u[types.INT] = function (program, variable) {
    program.gl.uniform1i(variable._pName, variable.value);
};

callbacks.u[types.VEC2] = function (program, variable) {
    program.gl.uniform2fv(variable._pName, variable.value);
};

callbacks.u[types.VEC3] = function (program, variable) {
    program.gl.uniform3fv(variable._pName, variable.value);
};

callbacks.u[types.VEC4] = function (program, variable) {
    program.gl.uniform4fv(variable._pName, variable.value);
};

callbacks.u[types.SAMPLER2D] = function (program, variable) {
    let pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0 + program._textureID);
    pgl.bindTexture(pgl.TEXTURE_2D, variable.value);
    pgl.uniform1i(variable._pName, program._textureID);
    program._textureID++;
};

callbacks.u[types.SAMPLERCUBE] = function (program, variable) {
    let pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0 + program._textureID);
    pgl.bindTexture(pgl.TEXTURE_CUBE_MAP, variable.value);
    pgl.uniform1i(variable._pName, program._textureID);
    program._textureID++;
};

callbacks.u[types.SAMPLER2DARRAY] = function (program, variable) {
    let pgl = program.gl,
        size = variable.value.length;
    let samplerArr = new Int32Array(size);
    for (let i = 0; i < size; i++) {
        pgl.activeTexture(pgl.TEXTURE0 + program._textureID + i);
        pgl.bindTexture(pgl.TEXTURE_2D, variable.value[i]);
        samplerArr[i] = i;
    }
    pgl.uniform1iv(variable._pName, samplerArr);
};

callbacks.u[types.INTXX] = function (program, variable) {
    program.gl.uniform1iv(variable._pName, variable.value);
};

callbacks.u[types.FLOATXX] = function (program, variable) {
    program.gl.uniform1fv(variable._pName, variable.value);
};

///*========================
//   Attributes callbacks
// ========================*/
//callbacks.a[types.FLOAT] = function (program, variable) {
//    program.gl.vertexAttrib1f(variable._pName, variable.value);
//};

//callbacks.a[types.VEC2] = function (program, variable) {
//    program.gl.vertexAttrib2fv(variable._pName, variable.value);
//};

//callbacks.a[types.VEC3] = function (program, variable) {
//    program.gl.vertexAttrib3fv(variable._pName, variable.value);
//};

//callbacks.a[types.VEC4] = function (program, variable) {
//    program.gl.vertexAttrib4fv(variable._pName, variable.value);
//};
