goog.provide('og.shaderProgram.lineString');
goog.provide('og.shaderProgram.lineStringPicking');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

//Picking the same
og.shaderProgram.lineString = function () {
    return new og.shaderProgram.ShaderProgram("lineString", {
        uniforms: {
            proj: { type: og.shaderProgram.types.MAT4 },
            view: { type: og.shaderProgram.types.MAT4 },
            viewport: { type: og.shaderProgram.types.VEC2 },
            thickness: { type: og.shaderProgram.types.FLOAT },
            color: { type: og.shaderProgram.types.VEC4 },
            uCamPos: { type: og.shaderProgram.types.VEC3 },
            uFloatParams: { type: og.shaderProgram.types.VEC2 }
        },
        attributes: {
            prev: { type: og.shaderProgram.types.VEC3, enableArray: true },
            current: { type: og.shaderProgram.types.VEC3, enableArray: true },
            next: { type: og.shaderProgram.types.VEC3, enableArray: true },
            order: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "lineString_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "lineString_fs.txt")
    });
};