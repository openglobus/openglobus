goog.provide('og.shaderProgram.shape');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.shape = function () {
    return new og.shaderProgram.ShaderProgram("shape", {
        uniforms: {
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uTRSMatrix: { type: og.shaderProgram.types.MAT4 },
            uNMatrix: { type: og.shaderProgram.types.MAT4 },

            uAmbientColor: { type: og.shaderProgram.types.VEC3 },
            uPointLightingLocation: { type: og.shaderProgram.types.VEC3 },
            uPointLightingSpecularColor: { type: og.shaderProgram.types.VEC3 },
            uPointLightingDiffuseColor: { type: og.shaderProgram.types.VEC3 },
            uMaterialShininess: { type: og.shaderProgram.types.FLOAT },

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