goog.provide('og.shaderProgram.drawnode_nl');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');

og.shaderProgram.drawnode_nl = function () {
    return new og.shaderProgram.ShaderProgram("drawnode_nl", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            samplerCount: { type: og.shaderProgram.types.INT },
            tileOffsetArr: { type: og.shaderProgram.types.VEC4 },
            visibleExtentOffsetArr: { type: og.shaderProgram.types.VEC4 },
            samplerArr: { type: og.shaderProgram.types.SAMPLER2DXX },
            transparentColorArr: { type: og.shaderProgram.types.VEC4 },
            pickingColorArr: { type: og.shaderProgram.types.VEC3 },
            defaultTexture: { type: og.shaderProgram.types.SAMPLER2D },
            height: { type: og.shaderProgram.types.FLOAT },
            cameraPosition: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "drawnode_nl_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "drawnode_nl_fs.txt")
    });
};