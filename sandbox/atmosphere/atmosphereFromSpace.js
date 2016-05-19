goog.provide('og.shaderProgram.atmosphereSpace');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.atmosphereSpace = function () {
    return new og.shaderProgram.ShaderProgram("atmosphereSpace", {
        uniforms: {
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            modelViewMatrix: { type: og.shaderProgram.types.MAT4 },
            cameraPosition: { type: og.shaderProgram.types.VEC3 },
            v3LightPosition: { type: og.shaderProgram.types.VEC3 },
            v3InvWavelength: { type: og.shaderProgram.types.VEC3 },
            v3LightPos: { type: og.shaderProgram.types.VEC3 },
            g: { type: og.shaderProgram.types.FLOAT },
            g2: { type: og.shaderProgram.types.FLOAT },
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
            fScaleOverScaleDepth: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            position: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: og.utils.readTextFile("atmosphereSpace_vs.txt"),
        fragmentShader: og.utils.readTextFile("atmosphereSpace_fs.txt")
    });
};