goog.provide('og.shaderProgram.label');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.label = function () {
    return new og.shaderProgram.ShaderProgram("label", {
        uniforms: {
            u_fontTextureArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uCamPos: { type: og.shaderProgram.types.VEC3 },
            uViewAngle: { type: og.shaderProgram.types.FLOAT },
            uXRatio: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC4, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_positions: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_size: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_offset: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_opacity: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_rotation: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_alignedAxis: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_fontIndex: { type: og.shaderProgram.types.INT, enableArray: true },
            a_letterOffset: { type: og.shaderProgram.types.FLOAT, enableArray: true }
    },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "billboard_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "billboard_fs.txt")
    });
};