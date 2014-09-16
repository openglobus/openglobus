goog.provide('og.shaderProgram.overlays_nl');
goog.provide('og.shaderProgram.overlays_wl');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.overlays_nl = function () {
    return new og.shaderProgram.ShaderProgram("overlays_nl", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uSamplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            texBiasArr: { type: og.shaderProgram.types.VEC3 },
            tcolorArr: { type: og.shaderProgram.types.VEC4 },
            numTex: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "overlays_nl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "overlays_nl_fs.txt")
    });
};

og.shaderProgram.overlays_wl = function () {
    return new og.shaderProgram.ShaderProgram("overlays_wl", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uSamplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            texBiasArr: { type: og.shaderProgram.types.VEC3 },
            tcolorArr: { type: og.shaderProgram.types.VEC4 },
            numTex: { type: og.shaderProgram.types.INT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "overlays_wl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "overlays_wl_fs.txt")
    });
};