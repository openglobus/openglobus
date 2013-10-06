goog.provide('og.shaderProgram.callbacks');

goog.require('og.shaderProgram.types');

og.shaderProgram.bindBuffer = function (program, variable) {
    var gl = program.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, variable.value);
    gl.vertexAttribPointer(program._p[variable._name], variable.value.itemSize, gl.FLOAT, false, 0, 0);
};

og.shaderProgram.callbacks = [];

og.shaderProgram.callbacks[og.shaderProgram.types.MAT4] = function (program, variable) {
    program.gl.uniformMatrix4fv(program._p[variable._name], false, variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.FLOAT] = function (program, variable) {
    program.gl.uniform1f(program._p[variable._name], variable.value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC2] = function (program, variable) {
    if (variable.enableArray) {
        og.shaderProgram.bindBuffer(program, variable);
    } else {
        program.gl.uniform2fv(program._p[variable._name], variable.value);
    }
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC3] = function (program, variable) {
    if (variable.enableArray) {
        og.shaderProgram.bindBuffer(program, variable);
    } else {
        program.gl.uniform3fv(program._p[variable._name], variable.value);
    }
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC4] = function (program, variable) {
    if (variable.enableArray) {
        og.shaderProgram.bindBuffer(program, variable);
    } else {
        program.gl.uniform4fv(program._p[variable._name], variable.value);
    }
};

og.shaderProgram.callbacks[og.shaderProgram.types.SAMPLER2D] = function (program, variable) {
    var pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0);
    pgl.bindTexture(pgl.TEXTURE_2D, variable.value);
    pgl.uniform1i(program._p[variable._name], 0);
};