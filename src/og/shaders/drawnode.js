/**
 * @module og/shaders/drawnode
 */

"use strict";

import { Program } from "../webgl/Program.js";

// REMEMBER!
// src*(1)+dest*(1-src.alpha)
// glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
// src*(src.alpha)+dest*(1-src.alpha)
// glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);


const NIGHT = `const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);`;

const BLEND = `
            void blend(
                out vec4 dest,
                in sampler2D sampler,
                in vec4 tileOffset,
                in float opacity)
            {
                vec4 src = texture( sampler, tileOffset.xy + vTextureCoord.xy * tileOffset.zw );
                dest = dest * (1.0 - src.a * opacity) + src * opacity;
            }`;

const BLEND1 =
            `void blend(
                out vec4 dest,
                in sampler2D sampler,
                in vec4 tileOffset,
                in float opacity)
            {
                vec4 src = texture2D(sampler, tileOffset.xy + vTextureCoord.xy * tileOffset.zw);
                dest = dest * (1.0 - src.a * opacity) + src * opacity;
            }`

const SLICE_SIZE = 4;

export function drawnode_screen_nl() {
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
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },

        vertexShader: `attribute vec3 aVertexPositionHigh;
            attribute vec3 aVertexPositionLow;
            attribute vec2 aTextureCoord;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float height;

            varying vec2 vTextureCoord;

            void main(void) {
                vTextureCoord = aTextureCoord;

                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;
            #define SLICE_SIZE ${SLICE_SIZE + 1}
            uniform vec4 tileOffsetArr[SLICE_SIZE];
            uniform float layerOpacityArr[SLICE_SIZE];
            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[SLICE_SIZE];
            uniform int samplerCount;
            varying vec2 vTextureCoord;

            ${BLEND1}

            void main(void) {
                gl_FragColor = texture2D( defaultTexture, vTextureCoord );
                if( samplerCount == 0 ) return;

                blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
                if( samplerCount == 1 ) return;

                blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
                if( samplerCount == 2 ) return;

                blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
                if( samplerCount == 3 ) return;

                blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
                if( samplerCount == 4 ) return;

                blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
            }`
    });
}

export function drawnode_screen_wl() {
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
            normalMatrix: "mat3",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightsPositions: "vec4",
            diffuse: "vec3",
            ambient: "vec3",
            specular: "vec4"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },

        vertexShader: `attribute vec3 aVertexPositionHigh;
            attribute vec3 aVertexPositionLow;
            attribute vec2 aTextureCoord;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float height;
            uniform vec4 uGlobalTextureCoord;
            uniform vec3 uNormalMapBias;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying vec4 vTextureCoord;
            varying vec2 vGlobalTextureCoord;
            varying vec4 v_vertex;
            varying float v_height;

            void main(void) {

                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                v_height = height;
                vec3 heightVertex = aVertexPosition + normalize(aVertexPosition) * height;
                v_vertex = viewMatrix * vec4(heightVertex, 1.0);
                vTextureCoord.xy = aTextureCoord;
                vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;
                vTextureCoord.zw = uNormalMapBias.z * ( aTextureCoord + uNormalMapBias.xy );
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;

            #define MAX_POINT_LIGHTS 1
            #define SLICE_SIZE ${SLICE_SIZE + 1}

            uniform vec3 diffuse;
            uniform vec3 ambient;
            uniform vec4 specular;

            uniform sampler2D uNormalMap;
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
            uniform mat3 normalMatrix;
            uniform sampler2D nightTexture;
            uniform sampler2D specularTexture;

            uniform vec4 tileOffsetArr[SLICE_SIZE];
            uniform float layerOpacityArr[SLICE_SIZE];

            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[SLICE_SIZE];
            uniform int samplerCount;

            varying vec4 vTextureCoord;
            varying vec2 vGlobalTextureCoord;
            varying vec4 v_vertex;
            varying float v_height;

            ${NIGHT}

            ${BLEND}


            void main(void) {

                float overGround = 1.0 - step(0.1, v_height);
                vec3 normal = normalize(normalMatrix * ((texture2D(uNormalMap, vTextureCoord.zw).rgb - 0.5) * 2.0));
                vec3 lightDirection = normalize(lightsPositions[0].xyz - v_vertex.xyz * lightsPositions[0].w);
                vec3 eyeDirection = normalize(-v_vertex.xyz);
                vec3 reflectionDirection = reflect(-lightDirection, normal);
                vec4 nightImageColor = texture2D( nightTexture, vGlobalTextureCoord.st );
                float shininess = texture2D( specularTexture, vGlobalTextureCoord.st ).r * 255.0 * overGround;
                float reflection = max( dot(reflectionDirection, eyeDirection), 0.0);
                float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
                vec3 night = nightStep * (0.3 - diffuseLightWeighting) * nightImageColor.rgb;
                night *= overGround * step(0.0, night);

                vec3 spec = specular.rgb * pow( reflection, specular.w) * shininess;
                vec3 lightWeighting = ambient + diffuse * diffuseLightWeighting + spec + night;

                gl_FragColor = texture2D( defaultTexture, vTextureCoord.xy );
                if( samplerCount == 0 ) {
                    gl_FragColor *= lightWeighting;
                    return;
                }

                blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
                if( samplerCount == 1 ) {
                    gl_FragColor *= lightWeighting;
                    return;
                }

                blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
                if( samplerCount == 2 ) {
                    gl_FragColor *= lightWeighting;
                    return;
                }

                blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
                if( samplerCount == 3 ) {
                    gl_FragColor *= lightWeighting;
                    return;
                }

                blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
                if( samplerCount == 4 ) {
                    gl_FragColor *= lightWeighting;
                    return;
                }

                blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
                gl_FragColor *= lightWeighting;
            }`
    });
}

export function drawnode_screen_wl_webgl2() {
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
            normalMatrix: "mat3",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightsPositions: "vec4",
            diffuse: "vec3",
            ambient: "vec3",
            specular: "vec4"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },

        vertexShader: `#version 300 es

            in vec3 aVertexPositionHigh;
            in vec3 aVertexPositionLow;
            in vec2 aTextureCoord;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float height;
            uniform vec4 uGlobalTextureCoord;
            uniform vec3 uNormalMapBias;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            out vec4 vTextureCoord;
            out vec2 vGlobalTextureCoord;
            out vec4 v_vertex;
            out float v_height;

            void main(void) {

                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                v_height = height;
                vec3 heightVertex = aVertexPosition + normalize(aVertexPosition) * height;
                v_vertex = viewMatrix * vec4(heightVertex, 1.0);
                vTextureCoord.xy = aTextureCoord;
                vGlobalTextureCoord = uGlobalTextureCoord.xy + (uGlobalTextureCoord.zw - uGlobalTextureCoord.xy) * aTextureCoord;
                vTextureCoord.zw = uNormalMapBias.z * ( aTextureCoord + uNormalMapBias.xy );
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `#version 300 es

            precision highp float;

            #define MAX_POINT_LIGHTS 1
            #define SLICE_SIZE ${SLICE_SIZE + 1}

            uniform vec3 diffuse;
            uniform vec3 ambient;
            uniform vec4 specular;

            uniform sampler2D uNormalMap;
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
            uniform mat3 normalMatrix;
            uniform sampler2D nightTexture;
            uniform sampler2D specularTexture;

            uniform vec4 tileOffsetArr[SLICE_SIZE];
            uniform float layerOpacityArr[SLICE_SIZE];

            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[SLICE_SIZE];
            uniform int samplerCount;

            in vec4 vTextureCoord;
            in vec2 vGlobalTextureCoord;
            in vec4 v_vertex;
            in float v_height;

            float shininess;
            float reflection;
            float diffuseLightWeighting;
            vec3 night;

            layout(location = 0) out vec4 fragColor;

            ${NIGHT}

            ${BLEND}

            void main(void) {

                float overGround = 1.0 - step(0.1, v_height);
                vec3 normal = normalize(normalMatrix * ((texture(uNormalMap, vTextureCoord.zw).rgb - 0.5) * 2.0));
                vec3 lightDirection = normalize(lightsPositions[0].xyz - v_vertex.xyz * lightsPositions[0].w);
                vec3 eyeDirection = normalize(-v_vertex.xyz);
                vec3 reflectionDirection = reflect(-lightDirection, normal);
                vec4 nightImageColor = texture( nightTexture, vGlobalTextureCoord.st );

                shininess = texture( specularTexture, vGlobalTextureCoord.st ).r * 255.0 * overGround;
                reflection = max( dot(reflectionDirection, eyeDirection), 0.0);
                diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
                night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb;
                night *= overGround * step(0.0, night);

                vec3 spec = specular.rgb * pow( reflection, specular.w) * shininess;
                vec4 lightWeighting = vec4(ambient + diffuse * diffuseLightWeighting + spec + night, 1.0);

                fragColor = texture( defaultTexture, vTextureCoord.xy );
                if( samplerCount == 0 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
                if( samplerCount == 1 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
                if( samplerCount == 2 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
                if( samplerCount == 3 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
                if( samplerCount == 4 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
                fragColor *= lightWeighting;
            }`
    });
}

export function drawnode_colorPicking() {
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
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },

        vertexShader: `attribute vec3 aVertexPositionHigh;
            attribute vec3 aVertexPositionLow;
            attribute vec2 aTextureCoord;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;
            uniform float height;

            varying vec2 vTextureCoord;

            void main(void) {

                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;
                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vTextureCoord = aTextureCoord;
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;
            #define SLICE_SIZE ${SLICE_SIZE + 1}
            uniform vec4 tileOffsetArr[SLICE_SIZE];
            uniform vec4 pickingColorArr[SLICE_SIZE];
            uniform sampler2D samplerArr[SLICE_SIZE];
            uniform sampler2D pickingMaskArr[SLICE_SIZE];
            uniform int samplerCount;
            varying vec2 vTextureCoord;

            void blendPicking(
                out vec4 dest,
                in vec4 tileOffset,
                in sampler2D sampler,
                in sampler2D pickingMask,
                in vec4 pickingColor,
                in float opacity)
            {
                vec2 tc = tileOffset.xy + vTextureCoord.xy * tileOffset.zw;
                vec4 t = texture2D( sampler, tc );
                vec4 p = texture2D( pickingMask, tc );
                dest = mix( dest, vec4(max(pickingColor.rgb, p.rgb), opacity), (t.a == 0.0 ? 0.0 : 1.0) * pickingColor.a);
            }

            void main(void) {
                gl_FragColor = vec4(0.0);
                if( samplerCount == 0 ) return;

                blendPicking(gl_FragColor, tileOffsetArr[0], samplerArr[0], pickingMaskArr[0], pickingColorArr[0], 1.0);
                if( samplerCount == 1 ) return;

                blendPicking(gl_FragColor, tileOffsetArr[1], samplerArr[1], pickingMaskArr[1], pickingColorArr[1], 1.0);
                if( samplerCount == 2 ) return;

                blendPicking(gl_FragColor, tileOffsetArr[2], samplerArr[2], pickingMaskArr[2], pickingColorArr[2], 1.0);
                if( samplerCount == 3 ) return;

                blendPicking(gl_FragColor, tileOffsetArr[3], samplerArr[3], pickingMaskArr[3], pickingColorArr[3], 1.0);
                if( samplerCount == 4 ) return;

                blendPicking(gl_FragColor, tileOffsetArr[4], samplerArr[4], pickingMaskArr[4], pickingColorArr[4], 1.0);
            }`
    });
}

export function drawnode_heightPicking() {
    return new Program("drawnode_heightPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader: `attribute vec3 aVertexPositionHigh;
            attribute vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float height;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying float range;

            void main(void) {

                vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                range = distance(cameraPosition, aVertexPosition + normalize(aVertexPosition) * height);
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;

            varying float range;

            vec3 encode24(highp float f) {
                float F = abs(f);
                float s = step( 0.0, -f );
                float e = floor( log2(F) );
                float m = exp2(- e) * F;
                e = floor( log2(F) + 127.0 ) + floor( log2(m) );
                return vec3(
                    ( 128.0 * s + floor( e * exp2(-1.0) ) ) / 255.0,
                    ( 128.0 * mod( e, 2.0 ) + mod( floor( m * 128.0 ), 128.0 ) ) / 255.0,
                    floor( mod( floor( m * exp2( 23.0 - 8.0) ), exp2(8.0) ) ) / 255.0);
            }

            void main(void) {
                gl_FragColor = vec4(encode24(range), 1.0);
            }`
    });
}

export function drawnode_depth() {
    return new Program("drawnode_depth", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            frustumPickingColor: "vec3"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },

        vertexShader: `attribute vec3 aVertexPositionHigh;
            attribute vec3 aVertexPositionLow;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float height;
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            void main(void) {

                vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;
            uniform vec3 frustumPickingColor;

            void main(void) {
                gl_FragColor = vec4(frustumPickingColor, 1.0);
            } `
    });
}
