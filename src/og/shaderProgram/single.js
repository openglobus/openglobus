goog.provide('og.shaderProgram.single_nl');
goog.provide('og.shaderProgram.single_wl');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.single_nl = function () {
    return new og.shaderProgram.ShaderProgram("single_nl", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            texBias: { type: og.shaderProgram.types.VEC3 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D },
            uGeoImage: { type: og.shaderProgram.types.SAMPLER2D },
            geoImageTexBias: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_nl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_nl_fs.txt")
    });
};

og.shaderProgram.single_wl = function () {
    return new og.shaderProgram.ShaderProgram("single_wl", {
        uniforms: {
            uPMatrix: { type: og.shaderProgram.types.MAT4 },
            uMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uNMatrix: { type: og.shaderProgram.types.MAT3 },
            texBias: { type: og.shaderProgram.types.VEC3 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMap: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMapBias: { type: og.shaderProgram.types.VEC3 },
            uGeoImage: { type: og.shaderProgram.types.SAMPLER2D },
            geoImageTexBias: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            uNightImage: { type: og.shaderProgram.types.SAMPLER2D },
            uSpecularImage: { type: og.shaderProgram.types.SAMPLER2D },

            pointLightsPositions: { type: og.shaderProgram.types.VEC3 },
            pointLightsParamsv: { type: og.shaderProgram.types.VEC3 },
            pointLightsParamsf: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_wl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_wl_fs.txt")
    });
};