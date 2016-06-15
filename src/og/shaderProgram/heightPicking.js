goog.provide('og.shaderProgram.heightPicking');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.heightPicking = function () {
    return new og.shaderProgram.ShaderProgram("heightPicking", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            camPos: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "heightPicking_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "heightPicking_fs.txt")
    });
};