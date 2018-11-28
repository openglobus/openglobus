/**
 * @module og/shaders/polyline
 */

'use sctrict';

import { Program } from '../webgl/Program.js';

export function polyline() {
    return new Program("polyline", {
        uniforms: {
            'viewport': "vec2",
            'proj': "mat4",
            'view': "mat4",
            'viewport': "vec2",
            'uCamPos': "vec3",
            'uFloatParams': "vec2",
            'color': "vec4",
            'thickness': "float",
            'pickingColor': "vec3"
        },
        attributes: {
            'prev': "vec3",
            'current': "vec3",
            'next': "vec3",
            'order': "float"
        },

        vertexShader:
                `#version 300 es

                in vec3 prev;
                in vec3 current;
                in vec3 next;
                in float order;

                uniform float thickness;
                uniform vec4 color;
                uniform mat4 proj;
                uniform mat4 view;
                uniform vec2 viewport;

                out vec4 vColor;
                out vec3 vPos;
                
                const float C = 0.1;
                const float far = 149.6e+9;
                float logc = 2.0 / log( C * far + 1.0 );
                
                const float NEAR = -1.0;
                
                vec2 project(vec4 p){
                    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;
                }
                
                void main(){
                    vColor = color;
                    vPos = current;
                    
                    vec4 vCurrent = view * vec4(current, 1.0);
                    vec4 vPrev = view * vec4(prev, 1.0);
                    vec4 vNext = view * vec4(next, 1.0);
                    
                    /*Clip near plane*/
                    if(vCurrent.z > NEAR) {
                        if(vPrev.z < NEAR){
                            /*to the begining path view*/
                            vCurrent = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);
                        }else if(vNext.z < NEAR){
                            /*to the end path view*/
                            vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);
                            vCurrent = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);
                        }
                    } else if( vPrev.z > NEAR) {
                        /*to the end path view*/
                        vPrev = vPrev + (vCurrent - vPrev) * (NEAR - vPrev.z) / (vCurrent.z - vPrev.z);
                    } else if( vNext.z > NEAR) {
                        /*to the begining path view*/
                        vNext = vNext + (vCurrent - vNext) * (NEAR - vNext.z) / (vCurrent.z - vNext.z);
                    }
                    
                    vec4 dCurrent = proj * vCurrent;
                    vec2 _next = project(proj * vNext);
                    vec2 _prev = project(proj * vPrev);
                    vec2 _current = project(dCurrent);

                    if(_prev == _current){
                        if(_next == _current){
                            _next = _current + vec2(1.0, 0.0);
                            _prev = _current - _next;
                        }else{
                            _prev = _current + normalize(_current - _next);
                        }
                    }
                    if(_next == _current){
                        _next = _current + normalize(_current - _prev);
                    }
                    
                    vec2 sNext = _next,
                         sCurrent = _current,
                         sPrev = _prev;

                    vec2 dirNext = normalize(sNext - sCurrent);
                    vec2 dirPrev = normalize(sPrev - sCurrent);
                    float dotNP = dot(dirNext, dirPrev);
                    
                    vec2 normalNext = normalize(vec2(-dirNext.y, dirNext.x));
                    vec2 normalPrev = normalize(vec2(dirPrev.y, -dirPrev.x));
                    
                    float d = thickness * sign(order);
                    
                    vec2 m;
                    if(dotNP >= 0.99991){
                        m = sCurrent - normalPrev * d;
                    }else{
                        vec2 dir = normalPrev + normalNext;
                        m = sCurrent + dir * d / (dirNext.x * dir.y - dirNext.y * dir.x);
                        
                        if( dotNP > 0.5 && dot(dirNext + dirPrev, m - sCurrent) < 0.0 ){
                            float occw = order * sign(dirNext.x * dirPrev.y - dirNext.y * dirPrev.x);
                            if(occw == -1.0){
                                m = sCurrent + normalPrev * d;
                            }else if(occw == 1.0){
                                m = sCurrent + normalNext * d;
                            }else if(occw == -2.0){
                                m = sCurrent + normalNext * d;
                            }else if(occw == 2.0){
                                m = sCurrent + normalPrev * d;
                            }

                        }else if(distance(sCurrent, m) > min(distance(sCurrent, sNext), distance(sCurrent, sPrev))){
                            m = sCurrent + normalNext * d;
                        }
                    }

                    gl_Position = vec4((2.0 * m / viewport - 1.0) * dCurrent.w, dCurrent.z, dCurrent.w);
                    gl_Position.z = ( log( C * gl_Position.w + 1.0 ) * logc - 1.0 ) * gl_Position.w;
                }`,

        fragmentShader:
                `#version 300 es

                precision highp float;

                uniform vec3 pickingColor;
                uniform vec2 uFloatParams;
                uniform vec3 uCamPos;

                in vec4 vColor;
                in vec3 vPos;

                layout(location = 0) out vec4 outScreen;
                layout(location = 1) out vec4 outPicking;

                void main() {
                    vec3 look = vPos - uCamPos;
                    float lookLength = length(look);
                    float a = vColor.a * step(lookLength, sqrt(dot(uCamPos,uCamPos) - uFloatParams[0]) + sqrt(dot(vPos,vPos) - uFloatParams[0]));

                    outScreen = vec4(vColor.rgb, a);
                    outPicking = vec4(pickingColor, 1.0);
                }`
    });
};