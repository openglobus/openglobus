goog.provide('og.shaderProgram.shape');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.shape = function () {
    return new og.shaderProgram.ShaderProgram("shape", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uTRSMatrix: { type: og.shaderProgram.types.MAT4 },
            uColor: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            aVertexNormal: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "shape_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "shape_fs.txt")
    });
};