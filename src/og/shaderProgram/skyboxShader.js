goog.provide('og.shaderProgram.skyboxShader');

goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.skyboxShader = new og.shaderProgram.ShaderProgram("skybox", {
    uniforms: {
        uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
        uSampler: { type: og.shaderProgram.types.SAMPLER2D },
        pos: { type: og.shaderProgram.types.VEC3 }
    },
    attributes: {
        aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
        aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
    },
    vertexShader: og.utils.readTextFile("../src/og/shaders/skybox_vs.txt"),
    fragmentShader: og.utils.readTextFile("../src/og/shaders/skybox_fs.txt")
});