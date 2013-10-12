goog.provide('og.shaderProgram.callbacks');

goog.require('og.shaderProgram.types');

og.shaderProgram.bindBuffer = function (program, variable) {
    var gl = program.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, variable.value);
    gl.vertexAttribPointer(variable._pName, variable.value.itemSize, gl.FLOAT, false, 0, 0);
};

og.shaderProgram.callbacks.u = [];
og.shaderProgram.callbacks.a = [];

/*
 * Uniforms callbacks
 *
 *
 *
 */

og.shaderProgram.callbacks.u[og.shaderProgram.types.MAT4] = function (program, variable) {
    program.gl.uniformMatrix4fv(variable._pName, false, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.FLOAT] = function (program, variable) {
    program.gl.uniform1f(variable._pName, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.INT] = function (program, variable) {
    program.gl.uniform1i(variable._pName, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.VEC2] = function (program, variable) {
    program.gl.uniform2fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.VEC3] = function (program, variable) {
    program.gl.uniform3fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.VEC4] = function (program, variable) {
    program.gl.uniform4fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.SAMPLER2D] = function (program, variable) {
    var pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0 + program._textureID);
    pgl.bindTexture(pgl.TEXTURE_2D, variable.value);
    pgl.uniform1i(variable._pName, program._textureID);
    program._textureID++;
};

og.shaderProgram.callbacks.u[og.shaderProgram.types.SAMPLER2DXX] = function (program, variable) {
    var pgl = program.gl,
        size = variable.value.length;
    var samplerArr = new Int32Array(size);
    for (var i = 0; i < size; i++) {
        pgl.activeTexture(pgl.TEXTURE0 + program._textureID + i);
        pgl.bindTexture(pgl.TEXTURE_2D, variable.value[i]);
        samplerArr[i] = i;
    }
    pgl.uniform1iv(variable._pName, samplerArr);
};

/*
 * Attributes callbacks
 *
 */

og.shaderProgram.callbacks.a[og.shaderProgram.types.FLOAT] = function (program, variable) {
    program.gl.vertexAttrib1f(variable._pName, variable.value);
};

og.shaderProgram.callbacks.a[og.shaderProgram.types.VEC2] = function (program, variable) {
    program.gl.vertexAttrib2fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks.a[og.shaderProgram.types.VEC3] = function (program, variable) {
    program.gl.vertexAttrib3fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks.a[og.shaderProgram.types.VEC4] = function (program, variable) {
    program.gl.vertexAttrib4fv(variable._pName, variable.value);
};