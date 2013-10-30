goog.provide('og.shaderProgram.planetShader');

goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.planetShader = new og.shaderProgram.ShaderProgram("planet", {
    uniforms: {
        uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
        uSamplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
        texBiasArr: { type: og.shaderProgram.types.VEC3 },
        alfaArr: { type: og.shaderProgram.types.FLOATXX },
        tcolorArr: { type: og.shaderProgram.types.VEC3 },
        numTex: { type: og.shaderProgram.types.INT }
    },
    attributes: {
        aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
        aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
    },
    vertexShader: og.utils.readTextFile("../../src/og/shaders/planet_vs.txt"),
    fragmentShader: og.utils.readTextFile("../../src/og/shaders/planet_fs.txt")
});