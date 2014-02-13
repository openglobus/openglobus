goog.provide('og.shaderProgram.picking');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.picking = new og.shaderProgram.ShaderProgram("picking", {
    uniforms: {
        uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
        camPos: { type: og.shaderProgram.types.VEC3 }
    },
    attributes: {
        aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
    },
    vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "picking_vs.txt"),
    fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "picking_fs.txt")
});