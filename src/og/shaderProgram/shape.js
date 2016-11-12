goog.provide('og.shaderProgram.shape_wl');
goog.provide('og.shaderProgram.shape_nl');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.shape_wl = function () {
    return new og.shaderProgram.ShaderProgram("shape_wl", {
        uniforms: {
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            modelMatrix: { type: og.shaderProgram.types.MAT4 },
            normalMatrix: { type: og.shaderProgram.types.MAT4 },

            lightsPositions: { type: og.shaderProgram.types.VEC4 },
            lightsParamsv: { type: og.shaderProgram.types.VEC3 },
            lightsParamsf: { type: og.shaderProgram.types.FLOAT },

            uColor: { type: og.shaderProgram.types.VEC4 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aVertexNormal: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader:
            'attribute vec3 aVertexNormal;\
            attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionMatrix;\
            uniform mat4 viewMatrix;\
            uniform mat4 modelMatrix;\
            uniform mat3 normalMatrix;\
            varying vec2 vTextureCoord;\
            varying vec3 vNormal;\
            varying vec4 vPosition;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                vTextureCoord = aTextureCoord;\
                vNormal = normalMatrix * aVertexNormal;\
                vPosition = viewMatrix * modelMatrix * vec4(aVertexPosition, 1.0);\
                gl_Position = projectionMatrix * vPosition;\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            varying vec2 vTextureCoord;\
            varying vec3 vNormal;\
            varying vec4 vPosition;\
            uniform vec4 uColor;\
            uniform sampler2D uSampler;\n\
            #define MAX_POINT_LIGHTS 1\n\
            uniform int lightsQuantity;\
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];\
            uniform vec3 lightsParamsv[MAX_POINT_LIGHTS * 3];\
            uniform float lightsParamsf[MAX_POINT_LIGHTS];\
            void main(void) {\
                vec3 lightWeighting;\
                vec3 lightDirection;\
                vec3 normal;\
                vec3 eyeDirection;\
                vec3 reflectionDirection;\
                float specularLightWeighting;\
                float diffuseLightWeighting;\
                lightDirection = normalize(lightsPositions[0].xyz - vPosition.xyz * lightsPositions[0].w);\
                normal = normalize(vNormal);\
                eyeDirection = normalize(-vPosition.xyz);\
                reflectionDirection = reflect(-lightDirection, normal);\
                specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), lightsParamsf[0]);\
                diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);\
                lightWeighting = lightsParamsv[0] + lightsParamsv[1] * diffuseLightWeighting + lightsParamsv[2] * specularLightWeighting;\
                vec4 cc = texture2D( uSampler, vTextureCoord.st );\
                gl_FragColor = vec4(lightWeighting, uColor.a) * cc * uColor;\
            }'
    });
};

og.shaderProgram.shape_nl = function () {
    return new og.shaderProgram.ShaderProgram("shape_nl", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 },
            modelMatrix: { type: og.shaderProgram.types.MAT4 },
            uColor: { type: og.shaderProgram.types.VEC4 },
            uSampler: { type: og.shaderProgram.types.SAMPLER2D }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aTextureCoord: { type: og.shaderProgram.types.VEC2, enableArray: true }
        },
        vertexShader: 
            'attribute vec3 aVertexPosition;\
            attribute vec2 aTextureCoord;\
            uniform mat4 projectionViewMatrix;\
            uniform mat4 modelMatrix;\
            varying vec2 vTextureCoord;\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main(void) {\
                gl_Position = projectionViewMatrix * (modelMatrix * vec4(aVertexPosition, 1.0));\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                vTextureCoord = aTextureCoord;\
            }',
        fragmentShader: 
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform vec4 uColor;\
            uniform sampler2D uSampler;\
            varying vec2 vTextureCoord;\
            void main(void) {\
                gl_FragColor = uColor*texture2D( uSampler, vTextureCoord.st );\
            }'
    });
};