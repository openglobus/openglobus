goog.provide('og.shaderProgram.skybox');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.skybox = function () {
    return new og.shaderProgram.ShaderProgram("skybox", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uSampler: { type: og.shaderProgram.types.SAMPLERCUBE },
            pos: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "skybox_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "skybox_fs.txt")
    });
};