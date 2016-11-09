goog.provide('og.shaderProgram.simple');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.simple = function () {
    return new og.shaderProgram.ShaderProgram("simple", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexPosition;\
            attribute vec4 aVertexColor;\
            uniform mat4 projectionViewMatrix;\
            varying vec4 vColor;\
            void main(void) {\
                gl_Position = projectionViewMatrix * vec4(aVertexPosition, 1.0);\
                vColor = aVertexColor;\
            }',
        fragmentShader:
            'precision mediump float;\
            varying vec4 vColor;\
            void main(void) {\
                gl_FragColor = vColor;\
            }'
    });
};