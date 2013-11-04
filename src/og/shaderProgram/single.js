goog.provide('og.shaderProgram.single');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.single = new og.shaderProgram.ShaderProgram("single", {
    uniforms: {
        uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
        texBias: { type: og.shaderProgram.types.VEC3 },
        uSampler: { type: og.shaderProgram.types.SAMPLER2D }
    },
    attributes: {
        aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
        aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
    },
    vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_vs.txt"),
    fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "single_fs.txt")
});