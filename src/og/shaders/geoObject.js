/**
 * @module og/shaders/drawnode
 */

"use strict";

import { Program } from "../webgl/Program.js";

export const geo_object = () =>
    new Program("geo_object", {
        uniforms: {
            viewMatrix: 'mat4',
            projectionMatrix: 'mat4',
            normalMatrix: 'mat3',

            direction: 'vec3',
            uScaleByDistance: 'vec3',

            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",

            lightsPositions: 'vec4',
            lightsParamsv: 'vec3',
            lightsParamsf: 'float'
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",

            positionHigh: "vec3",
            positionLow: "vec3"
        },
        vertexShader: `precision highp float;

            attribute vec3 aVertexPosition;
            attribute vec3 aVertexNormal; 
            attribute vec3 positionHigh;
            attribute vec3 positionLow;    
            
            uniform vec3 uScaleByDistance;
            uniform vec3 direction;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat3 normalMatrix;
            
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            

            varying vec3 vNormal;
            varying vec4 vPosition;           
            
            const float RADIANS = 3.141592653589793 / 180.0;

            void main(void) {
                float scale = 0.02;
                float roll = 0.0;
                mat3 rotZ = mat3(
                     vec3(cos(roll), -sin(roll), 0.0),
                     vec3(sin(roll), cos(roll), 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float pitch = 0.0;
                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos(pitch), -sin(pitch)), 
                    vec3(0.0, sin(pitch), cos(pitch)) 
               );
            
                vec3 position = positionHigh + positionLow;
                vec3 r = cross(normalize(-position), direction);
                mat3 modelMatrix = mat3(r, normalize(position), -direction) * rotX * rotZ; /*up=-cross(direction, r)*/

                vec3 look = position - (eyePositionHigh + eyePositionLow);
                float lookLength = length(look);
                float scd = scale * (1.0 - smoothstep(uScaleByDistance[0], uScaleByDistance[1], lookLength)) * (1.0 - step(uScaleByDistance[2], lookLength));
                vNormal = normalMatrix * modelMatrix * aVertexNormal;

                vec3 highDiff = positionHigh - eyePositionHigh;
                vec3 lowDiff = positionLow + modelMatrix * (aVertexPosition * scd) - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vPosition = viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);

                gl_Position = projectionMatrix * vPosition;
            }`,
        fragmentShader: `precision highp float;

                uniform vec4 color;
                
                #define MAX_POINT_LIGHTS 1
                
                uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
                uniform vec3 lightsParamsv[MAX_POINT_LIGHTS * 3];
                uniform float lightsParamsf[MAX_POINT_LIGHTS];
                
                varying vec3 vNormal;
                varying vec4 vPosition;
                
                void main(void) {
                    vec3 lightWeighting;
                    vec3 lightDirection;
                    vec3 normal;
                    vec3 eyeDirection;
                    vec3 reflectionDirection;
                    float specularLightWeighting;
                    float diffuseLightWeighting;
                
                    lightDirection = normalize(lightsPositions[0].xyz - vPosition.xyz * lightsPositions[0].w);
                    normal = normalize(vNormal);
                    eyeDirection = normalize(-vPosition.xyz);
                    reflectionDirection = reflect(-lightDirection, normal);
                    specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), lightsParamsf[0]);
                    diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
                    lightWeighting = lightsParamsv[0] + lightsParamsv[1] * diffuseLightWeighting + lightsParamsv[2] * specularLightWeighting;
                    gl_FragColor = vec4(lightWeighting, 1.0) * color;
                }`
    });
