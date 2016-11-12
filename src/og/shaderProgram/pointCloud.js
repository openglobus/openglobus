goog.provide('og.shaderProgram.pointCloud');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

//Picking is the same
og.shaderProgram.pointCloud = function () {
    return new og.shaderProgram.ShaderProgram("pointCloud", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            opacity: { type: og.shaderProgram.types.FLOAT },
            pointSize: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            coordinates: { type: og.shaderProgram.types.VEC3, enableArray: true },
            colors: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader:
            'attribute vec3 coordinates;\
            attribute vec4 colors;\
            uniform mat4 projectionViewMatrix;\
            uniform float opacity;\
            uniform float pointSize;\
            varying vec4 color;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main() {\
                color = colors;\
                color.a *= opacity;\
                gl_Position = projectionViewMatrix * vec4(coordinates, 1.0);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                gl_PointSize = pointSize;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            varying vec4 color;\
            void main(void) {\
                gl_FragColor = color;\
            }'
    });
};