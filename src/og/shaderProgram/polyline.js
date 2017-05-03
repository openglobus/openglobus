goog.provide('og.shaderProgram.polyline');

goog.require('og.shaderProgram');
goog.require('og.shaderProgram.ShaderProgram');
goog.require('og.shaderProgram.types');
goog.require('og.utils');

og.shaderProgram.polyline = function (isDrawBuffersExtension) {
    if (isDrawBuffersExtension) {
        return new og.shaderProgram.ShaderProgram("polyline", {
            uniforms: {
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'proj': { type: og.shaderProgram.types.MAT4 },
                'view': { type: og.shaderProgram.types.MAT4 },
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'uCamPos': { type: og.shaderProgram.types.VEC3 },
                'uFloatParams': { type: og.shaderProgram.types.VEC2 },
                'color': { type: og.shaderProgram.types.VEC4 },
                'thickness': { type: og.shaderProgram.types.FLOAT },
                'pickingColor': { type: og.shaderProgram.types.VEC3 }
            },
            attributes: {
                'prev': { type: og.shaderProgram.types.VEC3 },
                'current': { type: og.shaderProgram.types.VEC3 },
                'next': { type: og.shaderProgram.types.VEC3 },
                'order': { type: og.shaderProgram.types.FLOAT }
            },
            vertexShader: 'attribute vec3 prev;\
                attribute vec3 current;\
                attribute vec3 next;\
                attribute float order;\
                uniform float thickness;\
                uniform vec4 color;\
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                const float NEAR = -1.0;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    vec2 dir = end2 - start2;\
                    vec2 perp = vec2(-dir.y, dir.x);\
                    float d2 = dot(perp, start2);\
                    float seg = dot(perp, start1) - d2;\
                    float prl = seg - dot(perp, end1) + d2;\
                    if(prl > -1.0 && prl < 1.0){\
                        return start1;\
                    }\
                    float u = seg / prl;\
                    return start1 + u * (end1 - start1);\
                }\
                \
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                \
                void main(){\
                    vColor = color;\
                    vPos = current;\
                    \
                    vec4 vCurrent = view * vec4(current, 1.0);\
                    vec4 vPrev = view * vec4(prev, 1.0);\
                    vec4 vNext = view * vec4(next, 1.0);\
                    \
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
                    \
                    vec4 dCurrent = proj * vCurrent;\
                    vec2 _next = project(proj * vNext);\
                    vec2 _prev = project(proj * vPrev);\
                    vec2 _current = project(dCurrent);\
                    if(_prev == _current){\
                        if(_next == _current){\
                            _next = _current + vec2(1.0, 0.0);\
                            _prev = _current - _next;\
                        }else{\
                            _prev = _current + normalize(_current - _next);\
                        }\
                    }\
                    if(_next == _current){\
                        _next = _current + normalize(_current - _prev);\
                    }\
                    \
                    vec2 sNext = _next,\
                         sCurrent = _current,\
                         sPrev = _prev;\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    float dotNP = dot(dirNext, dirPrev);\
                    \
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    \
                    float d = thickness * sign(order);\
                    \
                    vec2 m;\
                    if(dotNP >= 0.99991){\
                        m = sCurrent - normalPrev * d;\
                    }else{\
                        m = getIntersection( sCurrent + normalPrev * d, sPrev + normalPrev * d,\
                            sCurrent + normalNext * d, sNext + normalNext * d );\
                        \
                        if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){\
                            float occw = order * sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);\
                            if(occw == -1.0){\
                                m = sCurrent + normalPrev * d;\
                            }else if(occw == 1.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == -2.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == 2.0){\
                                m = sCurrent + normalPrev * d;\
                            }\
                        }else if(distance(sCurrent, m) > min(distance(sCurrent, sNext), distance(sCurrent, sPrev))){\
                            m = sCurrent + normalNext * d;\
                        }\
                    }\
                    gl_Position = vec4((2.0 * m / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }',
            fragmentShader:
                '#extension GL_EXT_draw_buffers : require\n\
                precision highp float;\n\
                uniform vec3 pickingColor;\
                uniform vec2 uFloatParams;\
                uniform vec3 uCamPos;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                void main() {\
                    vec3 look = vPos - uCamPos;\
                    float lookLength = length(look);\
                    float a = vColor.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));\
                    gl_FragData[0] = vec4(vColor.rgb, a);\
                    gl_FragData[1] = vec4(pickingColor, 1.0);\
                }'
        });
    } else {
        return new og.shaderProgram.ShaderProgram("polyline", {
            uniforms: {
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'proj': { type: og.shaderProgram.types.MAT4 },
                'view': { type: og.shaderProgram.types.MAT4 },
                'viewport': { type: og.shaderProgram.types.VEC2 },
                'uCamPos': { type: og.shaderProgram.types.VEC3 },
                'uFloatParams': { type: og.shaderProgram.types.VEC2 },
                'color': { type: og.shaderProgram.types.VEC4 },
                'thickness': { type: og.shaderProgram.types.FLOAT }
            },
            attributes: {
                'prev': { type: og.shaderProgram.types.VEC3 },
                'current': { type: og.shaderProgram.types.VEC3 },
                'next': { type: og.shaderProgram.types.VEC3 },
                'order': { type: og.shaderProgram.types.FLOAT }
            },
            vertexShader: 'attribute vec3 prev;\
                attribute vec3 current;\
                attribute vec3 next;\
                attribute float order;\
                uniform float thickness;\
                uniform vec4 color;\
                uniform mat4 proj;\
                uniform mat4 view;\
                uniform vec2 viewport;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                \
                const float C = 0.1;\
                const float far = 149.6e+9;\
                float logc = 2.0 / log( C * far + 1.0 );\
                \
                const float NEAR = -1.0;\
                \
                vec2 getIntersection(vec2 start1, vec2 end1, vec2 start2, vec2 end2){\
                    vec2 dir = end2 - start2;\
                    vec2 perp = vec2(-dir.y, dir.x);\
                    float d2 = dot(perp, start2);\
                    float seg = dot(perp, start1) - d2;\
                    float prl = seg - dot(perp, end1) + d2;\
                    if(prl > -1.0 && prl < 1.0){\
                        return start1;\
                    }\
                    float u = seg / prl;\
                    return start1 + u * (end1 - start1);\
                }\
                \
                vec2 project(vec4 p){\
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;\
                }\
                \
                void main(){\
                    vColor = color;\
                    vPos = current;\
                    \
                    vec4 vCurrent = view * vec4(current, 1.0);\
                    vec4 vPrev = view * vec4(prev, 1.0);\
                    vec4 vNext = view * vec4(next, 1.0);\
                    \
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
                    \
                    vec4 dCurrent = proj * vCurrent;\
                    vec2 _next = project(proj * vNext);\
                    vec2 _prev = project(proj * vPrev);\
                    vec2 _current = project(dCurrent);\
                    if(_prev == _current){\
                        if(_next == _current){\
                            _next = _current + vec2(1.0, 0.0);\
                            _prev = _current - _next;\
                        }else{\
                            _prev = _current + normalize(_current - _next);\
                        }\
                    }\
                    if(_next == _current){\
                        _next = _current + normalize(_current - _prev);\
                    }\
                    \
                    vec2 sNext = _next,\
                         sCurrent = _current,\
                         sPrev = _prev;\
                    vec2 dirNext = normalize(sNext - sCurrent);\
                    vec2 dirPrev = normalize(sPrev - sCurrent);\
                    float dotNP = dot(dirNext, dirPrev);\
                    \
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));\
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));\
                    \
                    float d = thickness * sign(order);\
                    \
                    vec2 m;\
                    if(dotNP >= 0.99991){\
                        m = sCurrent - normalPrev * d;\
                    }else{\
                        m = getIntersection( sCurrent + normalPrev * d, sPrev + normalPrev * d,\
                            sCurrent + normalNext * d, sNext + normalNext * d );\
                        \
                        if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){\
                            float occw = order * sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);\
                            if(occw == -1.0){\
                                m = sCurrent + normalPrev * d;\
                            }else if(occw == 1.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == -2.0){\
                                m = sCurrent + normalNext * d;\
                            }else if(occw == 2.0){\
                                m = sCurrent + normalPrev * d;\
                            }\
                        }else if(distance(sCurrent, m) > min(distance(sCurrent, sNext), distance(sCurrent, sPrev))){\
                            m = sCurrent + normalNext * d;\
                        }\
                    }\
                    gl_Position = vec4((2.0 * m / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);\
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;\
                }',
            fragmentShader:
                'precision highp float;\
                uniform vec2 uFloatParams;\
                uniform vec3 uCamPos;\
                varying vec4 vColor;\
                varying vec3 vPos;\
                void main() {\
                    vec3 look = vPos - uCamPos;\
                    float lookLength = length(look);\
                    float a = vColor.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));\
                    gl_FragColor = vec4(vColor.rgb, a);\
                }'
        });
    }
};