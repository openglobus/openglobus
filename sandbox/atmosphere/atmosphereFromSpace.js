goog.provide('og.shaderProgram.atmosphereSpace');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.atmosphereSpace = function () {
    return new og.shaderProgram.ShaderProgram("atmosphereSpace", {
        uniforms: {
            iResolution: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("atmosphereSpace_vs.txt"),
        fragmentShader: og.utils.readTextFile("atmosphereSpace_fs.txt")
    });
};