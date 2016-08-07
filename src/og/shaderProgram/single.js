goog.provide('og.shaderProgram.single_nl');
goog.provide('og.shaderProgram.single_wl');
goog.provide('og.shaderProgram.singleAtmosphere_wl');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.single_nl = function () {
    return new og.shaderProgram.ShaderProgram("single_nl", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
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
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            normalMatrix: { type: og.shaderProgram.types.MAT3 },
            texBias: { type: og.shaderProgram.types.VEC3 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMap: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMapBias: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            uNightImage: { type: og.shaderProgram.types.SAMPLER2D },
            uSpecularImage: { type: og.shaderProgram.types.SAMPLER2D },
            lightsPositions: { type: og.shaderProgram.types.VEC4 },
            lightsParamsv: { type: og.shaderProgram.types.VEC3 },
            lightsParamsf: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_wl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_wl_fs.txt")
    });
};

og.shaderProgram.singleAtmosphere_wl = function () {
    return new og.shaderProgram.ShaderProgram("singleAtmosphere_wl", {
        uniforms: {
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            normalMatrix: { type: og.shaderProgram.types.MAT3 },
            texBias: { type: og.shaderProgram.types.VEC3 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMap: { type: og.shaderProgram.types.SAMPLER2D },
            uNormalMapBias: { type: og.shaderProgram.types.VEC3 },
            uGlobalTextureCoord: { type: og.shaderProgram.types.VEC4 },
            uNightImage: { type: og.shaderProgram.types.SAMPLER2D },
            uSpecularImage: { type: og.shaderProgram.types.SAMPLER2D },

            cameraPosition: { type: og.shaderProgram.types.VEC3 },
            v3LightPosition: { type: og.shaderProgram.types.VEC3 },
            v3InvWavelength: { type: og.shaderProgram.types.VEC3 },
            fCameraHeight2: { type: og.shaderProgram.types.FLOAT },
            fOuterRadius: { type: og.shaderProgram.types.FLOAT },
            fOuterRadius2: { type: og.shaderProgram.types.FLOAT },
            fInnerRadius: { type: og.shaderProgram.types.FLOAT },
            fKrESun: { type: og.shaderProgram.types.FLOAT },
            fKmESun: { type: og.shaderProgram.types.FLOAT },
            fKr4PI: { type: og.shaderProgram.types.FLOAT },
            fKm4PI: { type: og.shaderProgram.types.FLOAT },
            fScale: { type: og.shaderProgram.types.FLOAT },
            fScaleDepth: { type: og.shaderProgram.types.FLOAT },
            fScaleOverScaleDepth: { type: og.shaderProgram.types.FLOAT },

            lightsPositions: { type: og.shaderProgram.types.VEC4 },
            lightsParamsv: { type: og.shaderProgram.types.VEC3 },
            lightsParamsf: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "singleAtmosphere_wl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "singleAtmosphere_wl_fs.txt")
    });
};