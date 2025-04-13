import {COMMON} from "../atmos/atmos";
import type {AtmosphereParameters} from "../atmos/atmos";
import {Program} from "../../webgl/Program";

import drawnode_screen_nl_vert from './drawnode_screen_nl.vert.glsl';
import drawnode_screen_nl_frag from './drawnode_screen_nl.frag.glsl';

import drawnode_screen_wl_webgl1NoAtmos_vert from './drawnode_screen_wl_webgl1NoAtmos.vert.glsl';
import drawnode_screen_wl_webgl1NoAtmos_frag from './drawnode_screen_wl_webgl1NoAtmos.frag.glsl';

import drawnode_screen_wl_webgl2Atmos_vert from './drawnode_screen_wl_webgl2Atmos.vert.glsl';
//import drawnode_screen_wl_webgl2Atmos_frag from './drawnode_screen_wl_webgl1Atmos.frag.glsl';

import drawnode_screen_wl_webgl2NoAtmos_vert from './drawnode_screen_wl_webgl2NoAtmos.vert.glsl';
import drawnode_screen_wl_webgl2NoAtmos_frag from './drawnode_screen_wl_webgl2NoAtmos.frag.glsl';

import drawnode_colorPicking_vert from './drawnode_colorPicking.vert.glsl';
import drawnode_colorPicking_frag from './drawnode_colorPicking.frag.glsl';

import drawnode_depth_vert from './drawnode_depth.vert.glsl';
import drawnode_depth_frag from './drawnode_depth.frag.glsl';

// REMEMBER!
// src*(1)+dest*(1-src.alpha)
// glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
// src*(src.alpha)+dest*(1-src.alpha)
// glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);


const NIGHT = `const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);`;

const DEF_BLEND = `#define blend(DEST, SAMPLER, OFFSET, OPACITY) \
                    src = texture( SAMPLER, OFFSET.xy + vTextureCoord.xy * OFFSET.zw );\
                    DEST = DEST * (1.0 - src.a * OPACITY) + src * OPACITY;`;

const SLICE_SIZE = 4;

export function drawnode_screen_nl(): Program {
    return new Program("drawnode_screen_nl", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            height: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_nl_vert,
        fragmentShader: drawnode_screen_nl_frag
    });
}

export function drawnode_screen_wl_webgl1NoAtmos(): Program {
    return new Program("drawnode_screen_wl", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightPosition: "vec3",
            diffuse: "vec3",
            ambient: "vec3",
            specular: "vec4",
            camHeight: "float",
            nightTextureCoefficient: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl_webgl1NoAtmos_vert,
        fragmentShader: drawnode_screen_wl_webgl1NoAtmos_frag
    });
}

export function drawnode_screen_wl_webgl2NoAtmos(): Program {
    return new Program("drawnode_screen_wl", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightPosition: "vec3",
            diffuse: "vec3",
            ambient: "vec3",
            specular: "vec4",
            camHeight: "float",
            nightTextureCoefficient: "float",
            transitionOpacity: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl_webgl2NoAtmos_vert,
        fragmentShader: drawnode_screen_wl_webgl2NoAtmos_frag
    });
}

export function drawnode_screen_wl_webgl2Atmos(atmosParams?: AtmosphereParameters): Program {
    return new Program("drawnode_screen_wl", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightPosition: "vec3",
            diffuse: "vec3",
            ambient: "vec3",
            specular: "vec4",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            camHeight: "float",
            nightTextureCoefficient: "float",
            maxMinOpacity: "vec2",
            transitionOpacity: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl_webgl2Atmos_vert,

        fragmentShader:
            `#version 300 es

            precision highp float;
            
            #define SLICE_SIZE ${SLICE_SIZE + 1}

            uniform vec4 specular;
            uniform vec3 diffuse;
            uniform vec3 ambient;

            uniform vec3 lightPosition;

            uniform sampler2D uNormalMap;
            uniform sampler2D nightTexture;
            uniform sampler2D specularTexture;
            uniform sampler2D transmittanceTexture;
            uniform sampler2D scatteringTexture;
            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[SLICE_SIZE];

            uniform vec4 tileOffsetArr[SLICE_SIZE];
            uniform float layerOpacityArr[SLICE_SIZE];

            uniform int samplerCount;
            uniform float nightTextureCoefficient;
            
            uniform vec2 maxMinOpacity;                
            uniform float camHeight;
            
            uniform float transitionOpacity;

            in vec4 vTextureCoord;
            in vec3 v_vertex;
            in vec3 cameraPosition;
            in vec2 vGlobalTextureCoord;
            in float v_height;

            vec3 sunPos;

            layout(location = 0) out vec4 diffuseColor;

            ${NIGHT}

            ${DEF_BLEND}
            
            ${COMMON(atmosParams)}            
            
            vec3 transmittanceFromTexture(float height, float angle) 
            {
                float u = (angle + 1.0) * 0.5;
                float v = height / ATMOS_HEIGHT;
                return texture(transmittanceTexture, vec2(u, v)).xyz;
            }

            vec3 multipleScatteringContributionFromTexture(float height, float angle) 
            {
                float u = (angle + 1.0) * 0.5;
                float v = height / ATMOS_HEIGHT;
                return texture(scatteringTexture, vec2(u, v)).xyz;
            }
            
            void getSunIlluminance(in vec3 point, in vec3 lightDir, out vec3 sunIlluminance)
            {
                //     float r = length(point);
                //     float mu_s = dot(point, sun_direction) / r;
                //     float height = r - BOTTOM_RADIUS;
                
                float mu_s = dot(normalize(point), lightDir);
                float height = length(point) - BOTTOM_RADIUS;
                sunIlluminance = SUN_INTENSITY * transmittanceFromTexture(height, mu_s);
            }
           
            void atmosGroundColor(out vec4 fragColor, in vec3 normal)
            {      
                vec3 cameraPosition = cameraPosition;           
                
                if(length(cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) < BOTTOM_RADIUS + 1.0){
                    cameraPosition = normalize(cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) * (BOTTOM_RADIUS + 1.0) / SPHERE_TO_ELLIPSOID_SCALE;
                }             
                                                                                
                vec3 rayDirection = normalize(v_vertex - cameraPosition);
                vec3 lightDir = normalize(sunPos);
                
                rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
                vec3 camPos = cameraPosition * SPHERE_TO_ELLIPSOID_SCALE;
                lightDir = normalize(lightDir * SPHERE_TO_ELLIPSOID_SCALE);
               

                vec3 light = vec3(0.0);
                vec3 transmittanceFromCameraToSpace = vec3(1.0);
                float offset = 0.0;
                float distanceToSpace = 0.0;
                
                intersectSphere(camPos, rayDirection, TOP_RADIUS, offset, distanceToSpace);
            
                vec3 rayOrigin = camPos;
                
                // above atmosphere
                if (offset > 0.0) 
                {
                    // intersection of camera ray with atmosphere
                    rayOrigin += rayDirection * offset;
                }
                
                float height = length(rayOrigin) - BOTTOM_RADIUS;
                float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
                bool cameraBelow = rayAngle < 0.0;
                
                transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                
                float phaseAngle = dot(lightDir, rayDirection);
                float rayleighPhase = rayleighPhase(phaseAngle);
                float miePhase = miePhase(phaseAngle);
                
                float distanceToGround = 0.0;
                
                bool hitGround = intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;                
                //intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround);
               

                if(length(v_vertex * SPHERE_TO_ELLIPSOID_SCALE) > BOTTOM_RADIUS){
                    distanceToGround = distance(camPos, v_vertex * SPHERE_TO_ELLIPSOID_SCALE);
                }
                                                                
                float segmentLength = (distanceToGround - max(offset, 0.0)) / float(SAMPLE_COUNT);
                
                float t = segmentLength * 0.5;
                
                vec3 transmittanceCamera; 
                vec3 transmittanceLight; 
                
                for (int i = 0; i < SAMPLE_COUNT; i++) 
                {
                    vec3 position = rayOrigin + t * rayDirection;
                    float height = length(position) - BOTTOM_RADIUS;
                    vec3 up = position / length(position);
                    float rayAngle = dot(up, rayDirection);
                    float lightAngle = dot(up, lightDir);                                                 
                    vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                    transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
                    transmittanceLight = transmittanceFromTexture(height, lightAngle);
                    vec2 opticalDensity = exp(-height / rayleighMieHeights);
                    vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x * rayleighPhase + mieScatteringCoefficient * opticalDensity.y * miePhase);
                    scatteredLight += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y);  
                    light += transmittanceCamera * scatteredLight * segmentLength;
                    t += segmentLength;
                }
                
                light *= SUN_INTENSITY;
        
                vec3 hitPoint = camPos + rayDirection * distanceToGround;
                vec3 up = normalize(hitPoint);
                float diffuseAngle = max(dot(up, lightDir), 0.0);                
                                
                float lightAngle = dot(normal, lightDir);
                vec3 tA = transmittanceCamera * GROUND_ALBEDO * SUN_INTENSITY;                                               
                vec3 scatteringLight = multipleScatteringContributionFromTexture(height, lightAngle);
                vec3 diffuseTransmittanceLight = transmittanceLight * diffuseAngle;                
                light += tA * (scatteringLight + diffuseTransmittanceLight);
                                                                
                fragColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), 1.0);
            }

            void getAtmosFadingOpacity(out float opacity)
            {            
                float c = length(cameraPosition);
                float maxDist = sqrt(c * c - BOTTOM_RADIUS * BOTTOM_RADIUS);
                float minDist = c - BOTTOM_RADIUS;
                float vertDist = distance(cameraPosition, v_vertex);                    
                opacity = clamp(maxMinOpacity.y + ( maxMinOpacity.x -  maxMinOpacity.y) * getLerpValue(minDist, maxDist, vertDist), 0.0, 1.0);
            }

            void main(void) {
            
                sunPos = lightPosition;
                                
                vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
                vec3 normal = normalize((texNormal - 0.5) * 2.0);
                
                float minH = 1200000.0;
                float maxH = minH * 3.0;
                float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;
                                
                // if(camHeight > 6000000.0)
                // {
                //    normal = normalize(v_vertex);
                // }
                                            
                vec3 lightDir = normalize(sunPos);
                vec3 viewDir = normalize(cameraPosition - v_vertex);
                
                vec4 atmosColor;
                atmosGroundColor(atmosColor, normal);
                
                vec3 sunIlluminance;                
                getSunIlluminance(v_vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
                
                float overGround = 1.0 - step(0.1, v_height);

                float shininess = texture( specularTexture, vGlobalTextureCoord.st ).r * 255.0 * overGround;
                vec3 reflectionDirection = reflect(-lightDir, normal);
                float reflection = max( dot(reflectionDirection, viewDir), 0.0);
                vec3 spec = sunIlluminance * specular.rgb * pow( reflection, specular.w) * shininess;                
                float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
                              
                vec4 nightImageColor = texture( nightTexture, vGlobalTextureCoord.st );
                vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
                night *= overGround * step(0.0, night);                
                vec4 lightWeighting = vec4(ambient + sunIlluminance * diffuse * diffuseLightWeighting + night, 1.0);
                
                float fadingOpacity;
                getAtmosFadingOpacity(fadingOpacity);
                
                getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
                
                spec *= sunIlluminance;

                diffuseColor = texture( defaultTexture, vTextureCoord.xy );
                if( samplerCount == 0 ) {
                    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor, fadingOpacity) + vec4(spec, 0.0);
                    diffuseColor *= transitionOpacity;
                    return;
                }

                vec4 src;

                blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
                if( samplerCount == 1 ) {                
                    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
                    diffuseColor *= transitionOpacity;
                    return;
                }

                blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
                if( samplerCount == 2 ) {
                    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
                    diffuseColor *= transitionOpacity;
                    return;
                }

                blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
                if( samplerCount == 3 ) {
                    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
                    diffuseColor *= transitionOpacity;
                    return;
                }

                blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
                if( samplerCount == 4 ) {
                    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
                    diffuseColor *= transitionOpacity;
                    return;
                }

                blend(diffuseColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
                diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
                diffuseColor *= transitionOpacity;
            }`
    });
}

export function drawnode_colorPicking(): Program {
    return new Program("drawnode_colorPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            samplerArr: "sampler2darray",
            pickingMaskArr: "sampler2darray",
            pickingColorArr: "vec4",
            height: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_colorPicking_vert,
        fragmentShader: drawnode_colorPicking_frag
    });
}

export function drawnode_depth(): Program {
    return new Program("drawnode_depth", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            frustumPickingColor: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },
        vertexShader: drawnode_depth_vert,
        fragmentShader: drawnode_depth_frag
    });
}


// export const ENCODE24 = `vec3 encode24(highp float f) {
//                 float F = abs(f);
//                 float s = step( 0.0, -f );
//                 float e = floor( log2(F) );
//                 float m = exp2(- e) * F;
//                 e = floor( log2(F) + 127.0 ) + floor( log2(m) );
//                 return vec3(
//                     ( 128.0 * s + floor( e * exp2(-1.0) ) ) / 255.0,
//                     ( 128.0 * mod( e, 2.0 ) + mod( floor( m * 128.0 ), 128.0 ) ) / 255.0,
//                     floor( mod( floor( m * exp2( 23.0 - 8.0) ), exp2(8.0) ) ) / 255.0);
//             }`

// export function drawnode_heightPicking(): Program {
//     return new Program("drawnode_heightPicking", {
//         uniforms: {
//             projectionMatrix: "mat4",
//             viewMatrix: "mat4",
//             height: "float",
//             eyePositionHigh: "vec3",
//             eyePositionLow: "vec3"
//         }, attributes: {
//             aVertexPositionHigh: "vec3", aVertexPositionLow: "vec3"
//         },
//
//         vertexShader:
//             `precision highp float;
//
//             attribute vec3 aVertexPositionHigh;
//             attribute vec3 aVertexPositionLow;
//
//             uniform mat4 projectionMatrix;
//             uniform mat4 viewMatrix;
//             uniform vec3 eyePositionHigh;
//             uniform vec3 eyePositionLow;
//             uniform float height;
//
//             varying vec4 vert;
//
//             void main(void) {
//
//                 mat4 viewMatrixRTE = viewMatrix;
//                 viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);
//
//                 vec3 nh = height * normalize(aVertexPositionHigh + aVertexPositionLow);
//
//                 vec3 eyePosition = eyePositionHigh + eyePositionLow;
//                 vec3 vertexPosition = aVertexPositionHigh + aVertexPositionLow;
//
//                 vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
//                 vec3 lowDiff = aVertexPositionLow - eyePositionLow + nh;
//
//                 vert = viewMatrixRTE * vec4(highDiff * step(1.0, length(highDiff)) + lowDiff, 1.0);
//
//                 gl_Position =  projectionMatrix * vert;
//             }`,
//
//         fragmentShader:
//             `precision highp float;
//
//             varying vec4 vert;
//
//             ${ENCODE24}
//
//             void main(void) {
//                 gl_FragColor = vec4(encode24(length(vert.xyz)), 1.0);
//             }`
//     });
// }
