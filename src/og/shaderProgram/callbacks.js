goog.provide('og.shaderProgram.callbacks');

goog.require('og.shaderProgram.types');

og.shaderProgram.callbacks = [];

og.shaderProgram.callbacks[og.shaderProgram.types.MAT4] = function (program, name, obj) {
    program.gl.uniformMatrix4fv(program._p[name], false, obj[name].value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.FLOAT] = function (program, name, obj) {
    program.gl.uniform1f(program._p[name], obj[name].value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC2] = function (program, name, obj) {
    program.gl.uniform2f(program._p[name], obj[name].value[0], obj[name].value[1]);
};

og.shaderProgram.callbacks[og.shaderProgram.types.VEC3] = function (program, name, obj) {
    program.gl.uniform3fv(program._p[name], obj[name].value);
};

og.shaderProgram.callbacks[og.shaderProgram.types.SAMPLER2D] = function (program, name, obj) {
    var pgl = program.gl;
    pgl.activeTexture(pgl.TEXTURE0);
    pgl.bindTexture(pgl.TEXTURE_2D, obj[name].texture);
    pgl.uniform1i(program._p[name], 0);
};