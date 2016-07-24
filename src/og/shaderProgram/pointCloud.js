goog.provide('og.shaderProgram.pointCloud');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

//Picking is the same
og.shaderProgram.lineString = function () {
    return new og.shaderProgram.ShaderProgram("pointCloud", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            opacity: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            coordinates: { type: og.shaderProgram.types.VEC3, enableArray: true },
            colors: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "pointCloud_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "pointCloud_fs.txt")
    });
};