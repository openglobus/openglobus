goog.provide('og.shaderProgram.skybox');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.skybox = function () {
    return new og.shaderProgram.ShaderProgram("skybox", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            uSampler: { type: og.shaderProgram.types.SAMPLERCUBE },
            pos: { type: og.shaderProgram.types.VEC3 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: 
            'attribute vec3 aVertexPosition;\
            uniform mat4 projectionViewMatrix;\
            uniform vec3 pos;\
            varying vec3 vTextureCoord;\
            void main(void) {\
                vTextureCoord = aVertexPosition;\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition + pos, 1.0);\
            }',
        fragmentShader: 
            'precision lowp float;\
            varying vec3 vTextureCoord;\
            uniform samplerCube uSampler;\
            void main(void) {\
                gl_FragColor = textureCube(uSampler, vTextureCoord);\
            }'
    });
};