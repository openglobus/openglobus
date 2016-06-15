goog.provide('og.shaderProgram.skysphere');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');


og.shaderProgram.skysphere = function () {
    return new og.shaderProgram.ShaderProgram("skysphere", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            eye: { type: og.shaderProgram.types.VEC3 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "skysphere_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "skysphere_fs.txt")
    });
};