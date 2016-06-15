goog.provide('og.shaderProgram.sphere');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.sphere = function () {
    return new og.shaderProgram.ShaderProgram("sphere", {
        uniforms: {
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            uNMatrix: { type: og.shaderProgram.types.MAT4 },

            cameraPosition: { type: og.shaderProgram.types.VEC3 },
            v3LightPosition: { type: og.shaderProgram.types.VEC3 },
            v3InvWavelength: { type: og.shaderProgram.types.VEC3 },
            //v3LightPos: { type: og.shaderProgram.types.VEC3 },
            //g: { type: og.shaderProgram.types.FLOAT },
            //g2: { type: og.shaderProgram.types.FLOAT },
            //fCameraHeight: { type: og.shaderProgram.types.FLOAT },
            fCameraHeight2: { type: og.shaderProgram.types.FLOAT },
            fOuterRadius: { type: og.shaderProgram.types.FLOAT },
            fOuterRadius2: { type: og.shaderProgram.types.FLOAT },
            fInnerRadius: { type: og.shaderProgram.types.FLOAT },
            //fInnerRadius2: { type: og.shaderProgram.types.FLOAT },
            fKrESun: { type: og.shaderProgram.types.FLOAT },
            fKmESun: { type: og.shaderProgram.types.FLOAT },
            fKr4PI: { type: og.shaderProgram.types.FLOAT },
            fKm4PI: { type: og.shaderProgram.types.FLOAT },
            fScale: { type: og.shaderProgram.types.FLOAT },
            fScaleDepth: { type: og.shaderProgram.types.FLOAT },
            fScaleOverScaleDepth: { type: og.shaderProgram.types.FLOAT },

            pointLightsPositions: { type: og.shaderProgram.types.VEC3 },
            pointLightsParamsv: { type: og.shaderProgram.types.VEC3 },
            pointLightsParamsf: { type: og.shaderProgram.types.FLOAT },

            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            normal: { type: og.shaderProgram.types.VEC3, enableArray: true },
            position: { type: og.shaderProgram.types.VEC3, enableArray: true },
            uv: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("sphere_vs.txt"),
        fragmentShader: og.utils.readTextFile("sphere_fs.txt")
    });
};