'use strict';

import { Program } from '../webgl/Program.js';

export function depth() {
    return new Program("depth", {
        uniforms: {
            depthTexture: "sampler2d",
            frustumPickingTexture: "sampler2d",
            nearFarArr: "vec2[]",
            frustumColors: "vec3[]"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader:
            `#version 300 es
            
            in vec2 corners;
            
            out vec2 tc;

            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `#version 300 es

            precision highp float;

            #define MAX_FRUSTUMS 4

            uniform sampler2D depthTexture;
            uniform sampler2D frustumPickingTexture;
            uniform vec2 nearFarArr[MAX_FRUSTUMS];
            uniform vec3 frustumColors[MAX_FRUSTUMS];
           
            in vec2 tc;

            layout(location = 0) out vec4 fragColor;

            int getFrustumIndex(in vec3 frustumColor){
                int res = -1;
                for( int i=0; i < MAX_FRUSTUMS; i++){
                    if(distance(frustumColor, frustumColors[i]) < 0.1) {
                        res = i;
                        break;
                    }
                }
                return res;
            }

            float LinearizeDepth(in vec2 uv)
            {
                int index = getFrustumIndex(texture(frustumPickingTexture, tc).rgb);
                float zNear = nearFarArr[index].x,
                      zFar = nearFarArr[index].y;                
                float depth = texture(depthTexture, tc).x;
                return (2.0 * zNear) / (zFar + zNear - depth * (zFar - zNear));
            }
            
            void main(void) {
                float c = LinearizeDepth(tc);
                fragColor = vec4(c, c, c, 1.0);
            }`
    });
};