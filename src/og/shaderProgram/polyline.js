goog.provide('og.shaderProgram.polyline');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.polyline = function (isDrawBuffersExtension) {
    if (isDrawBuffersExtension) {
        return new og.shaderProgram.ShaderProgram("polyline", {
            uniforms: {
                proj: { type: og.shaderProgram.types.MAT4 },
                view: { type: og.shaderProgram.types.MAT4 },
                viewport: { type: og.shaderProgram.types.VEC2 },
                thickness: { type: og.shaderProgram.types.FLOAT },
                color: { type: og.shaderProgram.types.VEC4 },
                uCamPos: { type: og.shaderProgram.types.VEC3 },
                uFloatParams: { type: og.shaderProgram.types.VEC2 },
                pickingColor: { type: og.shaderProgram.types.VEC3 }
            },
            attributes: {
                prev: { type: og.shaderProgram.types.VEC3, enableArray: true },
                current: { type: og.shaderProgram.types.VEC3, enableArray: true },
                next: { type: og.shaderProgram.types.VEC3, enableArray: true },
                order: { type: og.shaderProgram.types.VEC2, enableArray: true }
            },
            vertexShader:
                'attribute vec3 prev;\
                attribute vec3 current;\
                attribute vec3 next;\
                attribute vec2 order;\
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                uniform float thickness;\
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                const float NEAR = -1.0;\
                varying vec3 vPos;\
                void main(){\
                    vPos = current;\
                    vec4 vCurrent = view * vec4(current, 1.0);\
                    vec4 vPrev = view * vec4(prev, 1.0);\
                    vec4 vNext = view * vec4(next, 1.0);\
                    /*Clip near plane*/\
                    if(vCurrent.z > NEAR) {\
                        if(vPrev.z < NEAR){\
                            /*to the begining path view*/\
                            vCurrent = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                        }else if(vNext.z < NEAR){\
                            /*to the end path view*/\
                            vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                            vCurrent = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                        }\
                    } else if( vPrev.z > NEAR) {\
                        /*to the end path view*/\
                        vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                    } else if( vNext.z > NEAR) {\
                        /*to the begining path view*/\
                        vNext = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                    }\
                    vec4 dCurrent = proj * vCurrent;\
                    vec2 sCurrent = project(dCurrent);\
                    vec2 dirNext = project(proj * vNext) - sCurrent;\
                    vec2 sNormalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 dirPrev = normalize(project(proj * vPrev) - sCurrent);\
                    vec2 sNormalPrev = normalize(vec2(-dirPrev.y, dirPrev.x));\
                    vec2 dir = sNormalNext - sNormalPrev;\
                    float sinA = dirPrev.x * dir.y - dirPrev.y * dir.x;\
                    if( abs(sinA) < 0.2 ) {\
                        if(order.x == 1.0){\
                            dir = sNormalPrev;\
                        } else {\
                            dir = sNormalNext;\
                        }\
                    } else {\
                        dir *= order.x / sinA;\
                    }\
                    gl_Position = vec4((2.0 * (sCurrent + dir * thickness * order.y) / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }',
            fragmentShader:
                '#extension GL_EXT_draw_buffers : require\n\
                precision highp float;\n\
                uniform vec3 pickingColor;\
                uniform vec4 color;\
                uniform vec2 uFloatParams;\
                uniform vec3 uCamPos;\
                varying vec3 vPos;\
                void main(void) {\
                    vec3 look = vPos - uCamPos;\
                    float lookLength = length(look);\
                    float a = color.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));\
                    gl_FragData[0] = vec4(color.rgb, a);\
                    gl_FragData[1] = vec4(pickingColor, 1.0);\
                }'
        });
    } else {
        return new og.shaderProgram.ShaderProgram("polyline", {
            uniforms: {
                proj: { type: og.shaderProgram.types.MAT4 },
                view: { type: og.shaderProgram.types.MAT4 },
                viewport: { type: og.shaderProgram.types.VEC2 },
                thickness: { type: og.shaderProgram.types.FLOAT },
                color: { type: og.shaderProgram.types.VEC4 },
                uCamPos: { type: og.shaderProgram.types.VEC3 },
                uFloatParams: { type: og.shaderProgram.types.VEC2 }
            },
            attributes: {
                prev: { type: og.shaderProgram.types.VEC3, enableArray: true },
                current: { type: og.shaderProgram.types.VEC3, enableArray: true },
                next: { type: og.shaderProgram.types.VEC3, enableArray: true },
                order: { type: og.shaderProgram.types.VEC2, enableArray: true }
            },
            vertexShader:
                'attribute vec3 prev;\
                attribute vec3 current;\
                attribute vec3 next;\
                attribute vec2 order;\
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                uniform float thickness;\
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                const float NEAR = -1.0;\
                varying vec3 vPos;\
                void main(){\
                    vPos = current;\
                    vec4 vCurrent = view * vec4(current, 1.0);\
                    vec4 vPrev = view * vec4(prev, 1.0);\
                    vec4 vNext = view * vec4(next, 1.0);\
                    /*Clip near plane*/\
                    if(vCurrent.z > NEAR) {\
                        if(vPrev.z < NEAR){\
                            /*to the begining path view*/\
                            vCurrent = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                        }else if(vNext.z < NEAR){\
                            /*to the end path view*/\
                            vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                            vCurrent = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                        }\
                    } else if( vPrev.z > NEAR) {\
                        /*to the end path view*/\
                        vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);\
                    } else if( vNext.z > NEAR) {\
                        /*to the begining path view*/\
                        vNext = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);\
                    }\
                    vec4 dCurrent = proj * vCurrent;\
                    vec2 sCurrent = project(dCurrent);\
                    vec2 dirNext = project(proj * vNext) - sCurrent;\
                    vec2 sNormalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 dirPrev = normalize(project(proj * vPrev) - sCurrent);\
                    vec2 sNormalPrev = normalize(vec2(-dirPrev.y, dirPrev.x));\
                    vec2 dir = sNormalNext - sNormalPrev;\
                    float sinA = dirPrev.x * dir.y - dirPrev.y * dir.x;\
                    if( abs(sinA) < 0.2 ) {\
                        if(order.x == 1.0){\
                            dir = sNormalPrev;\
                        } else {\
                            dir = sNormalNext;\
                        }\
                    } else {\
                        dir *= order.x / sinA;\
                    }\
                    gl_Position = vec4((2.0 * (sCurrent + dir * thickness * order.y) / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }',
            fragmentShader:
                'precision highp float;\n\
                uniform vec4 color;\
                uniform vec2 uFloatParams;\
                uniform vec3 uCamPos;\
                varying vec3 vPos;\
                void main(void) {\
                    vec3 look = vPos - uCamPos;\
                    float lookLength = length(look);\
                    float a = color.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));\
                    gl_FragColor = vec4(color.rgb, a);\
                }'
        });
    }
};