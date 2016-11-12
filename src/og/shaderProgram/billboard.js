goog.provide('og.shaderProgram.billboard');
goog.provide('og.shaderProgram.billboardPicking');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.billboard = function () {
    return new og.shaderProgram.ShaderProgram("billboard", {
        uniforms: {
            u_texture: { type: og.shaderProgram.types.SAMPLER2D },
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            uCamPos: { type: og.shaderProgram.types.VEC3 },
            uFloatParams: { type: og.shaderProgram.types.VEC2 },
            uScaleByDistance: { type: og.shaderProgram.types.VEC3 },
            uOpacity: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_texCoord: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_positions: { type: og.shaderProgram.types.VEC4, enableArray: true },
            a_size: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_offset: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_rgba: { type: og.shaderProgram.types.VEC4, enableArray: true },
            a_rotation: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_alignedAxis: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            attribute vec2 a_vertices;\
            attribute vec2 a_texCoord;\
            attribute vec4 a_positions;\
            attribute vec3 a_offset;\
            attribute vec2 a_size;\
            attribute float a_rotation;\
            attribute vec4 a_rgba;\
            attribute vec3 a_alignedAxis;\
            varying vec2 v_texCoords;\
            varying vec4 v_rgba;\
            uniform mat4 viewMatrix;\
            uniform mat4 projectionMatrix;\
            uniform vec3 uCamPos;\
            uniform vec2 uFloatParams;\
            uniform vec3 uScaleByDistance;\
            uniform float uOpacity;\
            const vec3 ZERO3 = vec3(0.0);\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main() {\
                v_texCoords = a_texCoord;\
                vec3 look = a_positions.xyz - uCamPos;\
                float lookLength = length(look);\
                v_rgba = a_rgba;\
                /*v_rgba.a *= uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0]));*/\
                if(uOpacity * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz,a_positions.xyz) - uFloatParams[0])) == 0.0){\
                    return;\
                }\
                vec3 right, up;\
                if(a_alignedAxis == ZERO3){\
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );\
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );\
                }else{\
                    up = normalize(a_alignedAxis);\
                    right = normalize(cross(look,up));\
                    look = cross(up,right);\
                }\
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));\
                float focalSize = 2.0 * dist * uFloatParams[1];\
                vec2 offset = a_offset.xy * focalSize;\
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) * (1.0 - step(uScaleByDistance[2], lookLength));\
                vec2 scale = a_size * focalSize * scd;\
                float cosRot = cos(a_rotation);\
                float sinRot = sin(a_rotation);\
                vec3 rr = (right * cosRot - up * sinRot) * (scale.x * a_vertices.x + scd * offset.x) + (right * sinRot + up * cosRot) * (scale.y * a_vertices.y + scd * offset.y) + a_positions.xyz;\
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                gl_Position.z += a_offset.z;\
            }',
        fragmentShader:
            '#extension GL_EXT_draw_buffers : require\n\
            #ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            uniform sampler2D u_texture;\
            varying vec2 v_texCoords;\
            varying vec4 v_rgba;\
            varying vec3 v_pickingColor;\
            void main () {\
                vec4 color = texture2D(u_texture, v_texCoords);\
                if(color.a < 0.1)\
                    discard;\
                gl_FragData[0] = color * v_rgba;\
                gl_FragData[1] = vec4(0.0);\
            }'
    });
};

og.shaderProgram.billboardPicking = function () {
    return new og.shaderProgram.ShaderProgram("billboardPicking", {
        uniforms: {
            projectionMatrix: { type: og.shaderProgram.types.MAT4 },
            viewMatrix: { type: og.shaderProgram.types.MAT4 },
            uCamPos: { type: og.shaderProgram.types.VEC3 },
            uFloatParams: { type: og.shaderProgram.types.VEC2 },
            uScaleByDistance: { type: og.shaderProgram.types.VEC3 },
            uOpacity: { type: og.shaderProgram.types.FLOAT }
        },
        attributes: {
            a_vertices: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_positions: { type: og.shaderProgram.types.VEC4, enableArray: true },
            a_size: { type: og.shaderProgram.types.VEC2, enableArray: true },
            a_offset: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_pickingColor: { type: og.shaderProgram.types.VEC3, enableArray: true },
            a_rotation: { type: og.shaderProgram.types.FLOAT, enableArray: true },
            a_alignedAxis: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            attribute vec2 a_vertices;\
            attribute vec4 a_positions;\
            attribute vec3 a_offset;\
            attribute vec2 a_size;\
            attribute float a_rotation;\
            attribute vec3 a_pickingColor;\
            attribute vec3 a_alignedAxis;\
            varying vec4 v_color;\
            uniform mat4 viewMatrix;\
            uniform mat4 projectionMatrix;\
            uniform vec3 uCamPos;\
            uniform vec2 uFloatParams;\
            uniform vec3 uScaleByDistance;\
            uniform float uOpacity;\
            const vec3 ZERO3 = vec3(0.0);\
            const float C = 0.1;\
            const float far = 149.6e+9;\
            float logc = 2.0 / log( C * far + 1.0 );\
            void main() {\
                vec3 look = a_positions.xyz - uCamPos;\
                float lookLength = length(look);\
                if( uOpacity == 0.0 ) {\
                    gl_Position = vec4(0.0);\
                    return;\
                }\
                v_color = vec4(a_pickingColor.rgb, 1.0) * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(a_positions.xyz, a_positions.xyz) - uFloatParams[0]));\
                vec3 right, up;\
                if(a_alignedAxis == ZERO3){\
                    up = vec3( viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1] );\
                    right = vec3( viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0] );\
                }else{\
                    up = normalize(a_alignedAxis);\
                    right = normalize(cross(look,up));\
                    look = cross(up,right);\
                }\
                float dist = dot(uCamPos - a_positions.xyz, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));\
                float focalSize = 2.0 * dist * uFloatParams[1];\
                vec2 offset = a_offset.xy * focalSize;\
                float scd = a_positions.w * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) *(1.0 - step(uScaleByDistance[2], lookLength));\
                vec2 scale = a_size * focalSize * scd;\
                float cosRot = cos(a_rotation);\
                float sinRot = sin(a_rotation);\
                vec3 rr = (right * cosRot - up * sinRot) * (scale.x * a_vertices.x + scd * offset.x) + (right * sinRot + up * cosRot) * (scale.y * a_vertices.y + scd * offset.y) + a_positions.xyz;\
                gl_Position = projectionMatrix * viewMatrix * vec4(rr, 1);\
                gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                gl_Position.z += a_offset.z;\
            }',
        fragmentShader:
            '#ifdef GL_ES\n\
            #ifdef GL_FRAGMENT_PRECISION_HIGH\n\
            precision highp float;\n\
            #else\n\
            precision mediump float;\n\
            #endif // GL_FRAGMENT_PRECISION_HIGH\n\
            #endif // GL_ES\n\
            varying vec4 v_color;\
            void main () {\
                gl_FragColor = v_color;\
            }'
    });
};