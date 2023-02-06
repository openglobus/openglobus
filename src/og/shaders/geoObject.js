/**
 * @module og/shaders/drawnode
 */

"use strict";

import { Program } from "../webgl/Program.js";

export const geo_object = () =>
    new Program("geo_object", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            normalMatrix: "mat3",

            uScaleByDistance: "vec3",

            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",

            lightsPositions: "vec4",
            lightsParamsv: "vec3",
            lightsParamsf: "float",

            uTexture: "sampler2d",
            uUseTexture: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",

            aPositionHigh: { type: "vec3", divisor: 1 },
            aPositionLow: { type: "vec3", divisor: 1 },
            aDirection: { type: "vec3", divisor: 1 },
            aPitchRoll: { type: "vec2", divisor: 1 },
            aColor: { type: "vec4", divisor: 1 },
            aScale: { type: "float", divisor: 1 },
            aDispose: { type: "float", divisor: 1 }
        },
        vertexShader:
            `precision highp float;
            
            attribute vec3 aVertexPosition;
            attribute vec3 aVertexNormal; 
            attribute vec3 aPositionHigh;
            attribute vec3 aPositionLow;    
            attribute vec3 aDirection;
            attribute vec2 aPitchRoll;
            attribute vec4 aColor;
            attribute float aScale;
            attribute float aDispose;
            attribute float aUseTexture;
            attribute vec2 aTexCoord;
            
            uniform float uUseTexture;
            uniform vec3 uScaleByDistance;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat3 normalMatrix;
            
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying vec3 vNormal;
            varying vec4 vPosition;           
            varying vec4 vColor;
            varying float vDispose;
            varying float vUseTexture;
            varying vec2 vTexCoords;
            
            const float PI = 3.141592653589793;
            
            const float RADIANS = PI / 180.0;
           
            void main(void) {
            
                if (aDispose == 0.0) {
                   return;
                }
            
                vUseTexture = uUseTexture;
                vColor = aColor;
                vTexCoords = aTexCoord;
              
                float roll = aPitchRoll.y;
                mat3 rotZ = mat3(
                     vec3(cos(roll), sin(roll), 0.0),
                     vec3(-sin(roll), cos(roll), 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float pitch = aPitchRoll.x;
                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos(pitch), sin(pitch)), 
                    vec3(0.0, -sin(pitch), cos(pitch)) 
               );

                vec3 position = aPositionHigh + aPositionLow;
                vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                vec3 r = cross(normalize(-position), aDirection);
                mat3 modelMatrix = mat3(r, normalize(position), -aDirection) * rotX * rotZ;

                float dist = length(cameraPosition);

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 highDiff = aPositionHigh - eyePositionHigh;
                vec3 lowDiff = aPositionLow - eyePositionLow;
             
                vec3 look = cameraPosition - position;
                float lookLength = length(look);
                vNormal = normalMatrix * modelMatrix * aVertexNormal;
                               
                // if(lookLength > uScaleByDistance[1])
                // {
                //     scd = uScaleByDistance[1] / uScaleByDistance[0];
                // }
                // else if(lookLength > uScaleByDistance[0])
                // {
                //     scd = lookLength / uScaleByDistance[0];
                // }
                // ... is the same math
                float scd = uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];
                
                vPosition = vec4((highDiff + lowDiff) + modelMatrix * aVertexPosition * aScale * scd, 1.0);
                gl_Position = projectionMatrix * viewMatrixRTE  * vPosition;
            }`,

        fragmentShader: `precision highp float;

                varying vec4 vColor;
                #define MAX_POINT_LIGHTS 1
                
                uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
                uniform vec3 lightsParamsv[MAX_POINT_LIGHTS * 3];
                uniform float lightsParamsf[MAX_POINT_LIGHTS];
                
                uniform sampler2D uTexture;
                varying vec2 vTexCoords;
                
                varying vec3 vNormal;
                varying vec4 vPosition;
                varying float vUseTexture;
                
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
                    vec4 tColor = texture2D(uTexture, vTexCoords);
                    gl_FragColor = vec4(lightWeighting , 1.0) * mix(vColor, tColor, vUseTexture);
                }`
    });

export const geo_object_picking = () =>
    new Program("geo_object_picking", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",

            uScaleByDistance: "vec3",

            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            pickingScale: "float"

        },
        attributes: {
            aVertexPosition: "vec3",
            aPositionHigh: { type: "vec3", divisor: 1 },
            aPositionLow: { type: "vec3", divisor: 1 },
            aDirection: { type: "vec3", divisor: 1 },
            aPitchRoll: { type: "vec2", divisor: 1 },
            aPickingColor: { type: "vec3", divisor: 1 },
            aScale: { type: "float", divisor: 1 },
            aDispose: { type: "float", divisor: 1 }
        },
        vertexShader: `precision highp float;

            attribute vec3 aVertexPosition;
            attribute vec3 aPositionHigh;
            attribute vec3 aPositionLow;    
            attribute vec3 aDirection;
            attribute vec2 aPitchRoll;
            attribute vec3 aPickingColor;
            attribute float aScale;
            attribute float aDispose;
            
            uniform vec3 uScaleByDistance;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float pickingScale;
            
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying float vDispose;
            varying vec3 vColor;
            
            const float RADIANS = 3.141592653589793 / 180.0;

            void main(void) {
            
             
                if (aDispose == 0.0) {
                   return;
                }
            
                vColor = aPickingColor;
                float roll = aPitchRoll.y * RADIANS;
                mat3 rotZ = mat3(
                     vec3(cos(roll), sin(roll), 0.0),
                     vec3(-sin(roll), cos(roll), 0.0), 
                     vec3(0.0, 0.0, 1.0) 
                );

                float pitch = aPitchRoll.x * RADIANS;
                mat3 rotX = mat3(
                    vec3(1.0, 0.0, 0.0),
                    vec3(0.0, cos(pitch), sin(pitch)), 
                    vec3(0.0, -sin(pitch), cos(pitch)) 
               );

                vec3 position = aPositionHigh + aPositionLow;
                vec3 r = cross(normalize(-position), aDirection);
                mat3 modelMatrix = mat3(r, normalize(position), -aDirection) * rotX * rotZ; /*up=-cross(aDirection, r)*/

                float dist = length(eyePositionHigh + eyePositionLow);

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vec3 highDiff = aPositionHigh - eyePositionHigh;
                vec3 lowDiff = aPositionLow - eyePositionLow;
             
                vec3 look = position - (eyePositionHigh + eyePositionLow);
                float lookLength = length(look);
                
                float scd = uScaleByDistance[2] * clamp(lookLength, uScaleByDistance[0], uScaleByDistance[1]) / uScaleByDistance[0];
                
                vec4 pos = vec4((highDiff + lowDiff) + modelMatrix * aVertexPosition * aScale * pickingScale * scd, 1.0);
                                
                gl_Position = projectionMatrix * viewMatrixRTE * pos;
            }`,
        fragmentShader:
            `precision highp float;
            varying vec3 vColor;
            varying float vDispose;
            void main () {
                gl_FragColor = vec4(vColor, vDispose);
            }`
    });
