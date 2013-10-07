goog.provide('og.shaderProgram.callbacks');

goog.require('og.shaderProgram.types');

og.shaderProgram.bindBuffer = function (program, variable) {
    var gl = program.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, variable.value);
    gl.vertexAttribPointer(variable._pName, variable.value.itemSize, gl.FLOAT, false, 0, 0);
};

og.shaderProgram.callbacks = [];

og.shaderProgram.callbacks[og.shaderProgram.types.MAT4] = function (program, variable) {
    program.gl.uniformMatrix4fv(variable._pName, false, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.FLOAT] = function (program, variable) {
    program.gl.uniform1f(variable._pName, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC2] = function (program, variable) {
    program.gl.uniform2fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC3] = function (program, variable) {
    program.gl.uniform3fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC4] = function (program, variable) {
    program.gl.uniform4fv(variable._pName, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.SAMPLER2D] = function (program, variable) {
    var pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0);
    pgl.bindTexture(pgl.TEXTURE_2D, variable.value);
    pgl.uniform1i(variable._pName, 0);
};