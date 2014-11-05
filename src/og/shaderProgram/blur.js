goog.provide('og.shaderProgram.blur');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.blur = function () {
    return new og.shaderProgram.ShaderProgram("blur", {
        attributes: {
            a_position: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            resolution: { type: og.shaderProgram.types.FLOAT },
            radius: { type: og.shaderProgram.types.FLOAT },
            dir: { type: og.shaderProgram.types.VEC2 }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "blur_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "blur_fs.txt")
    });
};