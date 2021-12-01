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

const CORNERS = `const vec2 BOTTOMLEFT = vec2(-0.01);
                const vec2 TOPRIGHT = vec2(1.01);`;

const NIGHT = `const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);`;

export function drawnode_screen_nl() {
    return new Program("drawnode_screen_nl", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            visibleExtentOffsetArr: "vec4",
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

                /*vec3 cameraPosition = eyePositionHigh + eyePositionLow;*/
                /*vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow * (cameraPosition / cameraPosition);*/
                /*gl_Position = projectionViewMatrix * vec4(aVertexPosition + normalize(aVertexPosition) * height, 1.0);*/
            }`,

        fragmentShader: `precision highp float;
            uniform vec4 tileOffsetArr[5];
            uniform vec4 visibleExtentOffsetArr[5];
            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[5];
            uniform int samplerCount;
            varying vec2 vTextureCoord;

            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

            ${CORNERS}

            void blend(
                out vec4 prevColor,
                in sampler2D sampler,
                in vec4 tileOffset,
                in vec4 visibleExtentOffset,
                in float opacity)
            {
                vec4 t = texture2D( sampler, tileOffset.xy + vTextureCoord.xy * tileOffset.zw );

                float emptiness = insideBox(visibleExtentOffset.xy + vTextureCoord.xy * visibleExtentOffset.zw, BOTTOMLEFT, TOPRIGHT);

                prevColor = prevColor * (1.0 - t.a * opacity * emptiness) + vec4(t.rgb, t.a) * opacity * emptiness;
            }

            void main(void) {
                gl_FragColor = texture2D( defaultTexture, vTextureCoord );
                if( samplerCount == 0 ) return;

                blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], visibleExtentOffsetArr[0], 1.0);
                if( samplerCount == 1 ) return;

                blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], visibleExtentOffsetArr[1], 1.0);
                if( samplerCount == 2 ) return;

                blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], visibleExtentOffsetArr[2], 1.0);
                if( samplerCount == 3 ) return;

                blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], visibleExtentOffsetArr[3], 1.0);
                if( samplerCount == 4 ) return;

                blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], visibleExtentOffsetArr[4], 1.0);
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
            visibleExtentOffsetArr: "vec4",
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
            #define MAX_OVERLAYS 5
            #define MAX_OVERLAYS_PLUS_ONE 6

            uniform vec3 diffuse;
            uniform vec3 ambient;
            uniform vec4 specular;

            uniform sampler2D uNormalMap;
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
            uniform mat3 normalMatrix;
            uniform sampler2D nightTexture;
            uniform sampler2D specularTexture;

            uniform vec4 tileOffsetArr[MAX_OVERLAYS];
            uniform vec4 visibleExtentOffsetArr[MAX_OVERLAYS];

            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[MAX_OVERLAYS];
            uniform int samplerCount;

            varying vec4 vTextureCoord;
            varying vec2 vGlobalTextureCoord;
            varying vec4 v_vertex;
            varying float v_height;

            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

            ${CORNERS}

            ${NIGHT}

            void blend(
                out vec4 dest,
                in sampler2D sampler,
                in vec4 tileOffset,
                in vec4 visibleExtentOffset,
                in float opacity,
                in vec4 specular,
                in vec3 ambient,
                in vec3 diffuse)
            {
                vec3 spec = specular.rgb * pow(reflection, specular.w) * (1.0 + shininess);
                vec3 lightWeighting = ambient + diffuse * diffuseLightWeighting + spec;

                vec4 src = texture( sampler, tileOffset.xy + vTextureCoord.xy * tileOffset.zw );

                float emptiness = insideBox(visibleExtentOffset.xy + vTextureCoord.xy * visibleExtentOffset.zw, BOTTOMLEFT, TOPRIGHT);

                dest = dest * (1.0 - src.a * opacity * emptiness) + vec4(src.rgb * lightWeighting + night + spec * src.a, src.a) * opacity * emptiness;
            }


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
                vec3 lightWeighting = ambient + diffuse * diffuseLightWeighting + spec;

                vec4 t = texture2D( defaultTexture, vTextureCoord.xy );
                gl_FragColor = vec4(t.rgb * lightWeighting + night + spec, t.a);
                if( samplerCount == 0 ) return;

                blend(gl_FragColor, samplerArr[0], tileOffsetArr[0], visibleExtentOffsetArr[0], 1.0);
                if( samplerCount == 1 ) return;

                blend(gl_FragColor, samplerArr[1], tileOffsetArr[1], visibleExtentOffsetArr[1], 1.0);
                if( samplerCount == 2 ) return;

                blend(gl_FragColor, samplerArr[2], tileOffsetArr[2], visibleExtentOffsetArr[2], 1.0);
                if( samplerCount == 3 ) return;

                blend(gl_FragColor, samplerArr[3], tileOffsetArr[3], visibleExtentOffsetArr[3], 1.0);
                if( samplerCount == 4 ) return;

                blend(gl_FragColor, samplerArr[4], tileOffsetArr[4], visibleExtentOffsetArr[4], 1.0);
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
            visibleExtentOffsetArr: "vec4",
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
            #define MAX_OVERLAYS 5
            #define MAX_OVERLAYS_PLUS_ONE 6

            uniform vec3 diffuse;
            uniform vec3 ambient;
            uniform vec4 specular;

            uniform sampler2D uNormalMap;
            uniform vec4 lightsPositions[MAX_POINT_LIGHTS];
            uniform mat3 normalMatrix;
            uniform sampler2D nightTexture;
            uniform sampler2D specularTexture;

            uniform vec4 tileOffsetArr[MAX_OVERLAYS];
            uniform vec4 visibleExtentOffsetArr[MAX_OVERLAYS];

            uniform sampler2D defaultTexture;
            uniform sampler2D samplerArr[MAX_OVERLAYS];
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

            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

            ${CORNERS}

            ${NIGHT}

            void blend(
                out vec4 dest,
                in sampler2D sampler,
                in vec4 tileOffset,
                in vec4 visibleExtentOffset,
                in float opacity)
            {
                vec4 src = texture( sampler, tileOffset.xy + vTextureCoord.xy * tileOffset.zw );

                float emptiness = insideBox(visibleExtentOffset.xy + vTextureCoord.xy * visibleExtentOffset.zw, BOTTOMLEFT, TOPRIGHT);

                dest = dest * (1.0 - src.a * opacity * emptiness) + src * opacity * emptiness;
            }

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
                vec4 lightWeighting = vec4(ambient + diffuse * diffuseLightWeighting + spec, 1.0);

                vec4 t = texture( defaultTexture, vTextureCoord.xy );
                fragColor = t;
                if( samplerCount == 0 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[0], tileOffsetArr[0], visibleExtentOffsetArr[0], 1.0);
                if( samplerCount == 1 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[1], tileOffsetArr[1], visibleExtentOffsetArr[1], 1.0);
                if( samplerCount == 2 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[2], tileOffsetArr[2], visibleExtentOffsetArr[2], 1.0);
                if( samplerCount == 3 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[3], tileOffsetArr[3], visibleExtentOffsetArr[3], 1.0);
                if( samplerCount == 4 ) {
                    fragColor *= lightWeighting;
                    return;
                }

                blend(fragColor, samplerArr[4], tileOffsetArr[4], visibleExtentOffsetArr[4], 1.0);
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
            visibleExtentOffsetArr: "vec4",
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
            uniform vec4 tileOffsetArr[5];
            uniform vec4 visibleExtentOffsetArr[5];
            uniform vec4 pickingColorArr[5];
            uniform sampler2D samplerArr[5];
            uniform sampler2D pickingMaskArr[5];
            uniform int samplerCount;
            varying vec2 vTextureCoord;
            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

            ${CORNERS}

            void main(void) {
                gl_FragColor = vec4(0.0);
                if( samplerCount == 0 ) return;

                vec2 tc = tileOffsetArr[0].xy + vTextureCoord.xy * tileOffsetArr[0].zw;
                float ins = insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord.xy * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);
                vec4 t = texture2D( samplerArr[0], tc ) * ins;
                vec4 p = texture2D( pickingMaskArr[0], tc ) * ins;
                gl_FragColor = mix( gl_FragColor, vec4(max(pickingColorArr[0].rgb, p.rgb), 1.0), pickingColorArr[0].a);
                if( samplerCount == 1 ) return;

                tc = tileOffsetArr[1].xy + vTextureCoord.xy * tileOffsetArr[1].zw;
                ins = insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord.xy * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);
                t = texture2D( samplerArr[1], tc ) * ins;
                p = texture2D( pickingMaskArr[1], tc ) * ins;
                gl_FragColor = mix( gl_FragColor, vec4(max(pickingColorArr[1].rgb, p.rgb), 1.0), pickingColorArr[1].a);
                if( samplerCount == 2 ) return;

                tc = tileOffsetArr[2].xy + vTextureCoord.xy * tileOffsetArr[2].zw;
                ins = insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord.xy * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);
                t = texture2D( samplerArr[2], tc ) * ins;
                p = texture2D( pickingMaskArr[2], tc ) * ins;
                gl_FragColor = mix( gl_FragColor, vec4(max(pickingColorArr[2].rgb, p.rgb), 1.0), pickingColorArr[2].a);
                if( samplerCount == 3 ) return;

                tc = tileOffsetArr[3].xy + vTextureCoord.xy * tileOffsetArr[3].zw;
                ins = insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord.xy * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);
                t = texture2D( samplerArr[3], tc ) * ins;
                p = texture2D( pickingMaskArr[3], tc ) * ins;
                gl_FragColor = mix( gl_FragColor, vec4(max(pickingColorArr[3].rgb, p.rgb), 1.0), pickingColorArr[3].a);
                if( samplerCount == 4 ) return;

                tc = tileOffsetArr[4].xy + vTextureCoord.xy * tileOffsetArr[4].zw;
                ins = insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord.xy * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);
                t = texture2D( samplerArr[4], tc ) * ins;
                p = texture2D( pickingMaskArr[4], tc ) * ins;
                gl_FragColor = mix( gl_FragColor, vec4(max(pickingColorArr[4].rgb, p.rgb), 1.0), pickingColorArr[4].a);
            }`
    });
}

export function drawnode_heightPicking() {
    return new Program("drawnode_heightPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            visibleExtentOffsetArr: "vec4",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3"
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
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            varying vec2 vTextureCoord;
            varying float range;

            void main(void) {

                vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                range = distance(cameraPosition, aVertexPosition + normalize(aVertexPosition) * height);
                vTextureCoord = aTextureCoord;
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `precision highp float;
            uniform sampler2D defaultTexture;
            uniform vec4 tileOffsetArr[5];
            uniform vec4 visibleExtentOffsetArr[5];
            uniform sampler2D samplerArr[5];
            uniform int samplerCount;
            varying vec2 vTextureCoord;
            varying float range;

            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

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

            ${CORNERS}

            void main(void) {
                gl_FragColor = vec4(encode24(range), texture2D( defaultTexture, vTextureCoord ).a);
                if( samplerCount == 0 ) return;

                vec4 t = texture2D( samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw ) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);
                gl_FragColor = mix( gl_FragColor, vec4(encode24(range), 1.0), 1.0);
                if( samplerCount == 1 ) return;

                t = texture2D( samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw ) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);
                gl_FragColor = mix( gl_FragColor, vec4(encode24(range), 1.0), 1.0);
                if( samplerCount == 2 ) return;

                t = texture2D( samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw ) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);
                gl_FragColor = mix( gl_FragColor, vec4(encode24(range), 1.0), 1.0);
                if( samplerCount == 3 ) return;

                t = texture2D( samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw ) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);
                gl_FragColor = mix( gl_FragColor, vec4(encode24(range), 1.0), 1.0);
                if( samplerCount == 4 ) return;

                t = texture2D( samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw ) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);
                gl_FragColor = mix( gl_FragColor, vec4(encode24(range), 1.0), 1.0);
            }`
    });
}

export function drawnode_depth() {
    return new Program("drawnode_depth", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            visibleExtentOffsetArr: "vec4",
            samplerArr: "sampler2darray",
            defaultTexture: "sampler2d",
            height: "float",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            frustumPickingColor: "vec3"
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
            uniform vec3 eyePositionHigh;
            uniform vec3 eyePositionLow;

            out vec2 vTextureCoord;

            void main(void) {

                vec3 cameraPosition = eyePositionHigh + eyePositionLow;
                vec3 aVertexPosition = aVertexPositionHigh + aVertexPositionLow;

                vec3 highDiff = aVertexPositionHigh - eyePositionHigh;
                vec3 lowDiff = aVertexPositionLow + normalize(aVertexPosition) * height - eyePositionLow;

                mat4 viewMatrixRTE = viewMatrix;
                viewMatrixRTE[3] = vec4(0.0, 0.0, 0.0, 1.0);

                vTextureCoord = aTextureCoord;
                gl_Position = projectionMatrix * viewMatrixRTE * vec4(highDiff + lowDiff, 1.0);
            }`,

        fragmentShader: `#version 300 es
            precision highp float;
            uniform sampler2D defaultTexture;
            uniform vec4 tileOffsetArr[5];
            uniform vec4 visibleExtentOffsetArr[5];
            uniform sampler2D samplerArr[5];
            uniform int samplerCount;
            uniform vec3 frustumPickingColor;

            in vec2 vTextureCoord;

            layout(location = 0) out vec4 frustumColor;

            /* return 1 if v inside the box, return 0 otherwise */
            float insideBox(vec2 v, vec2 bottomLeft, vec2 topRight) {
                vec2 s = step(bottomLeft, v) - step(topRight, v);
                return s.x * s.y;
            }

            ${CORNERS}

            void main(void) {

            frustumColor = vec4(frustumPickingColor, texture(defaultTexture, vTextureCoord).a);
            if(samplerCount == 0) return;

    vec4 t = texture(samplerArr[0], tileOffsetArr[0].xy + vTextureCoord * tileOffsetArr[0].zw) * insideBox(visibleExtentOffsetArr[0].xy + vTextureCoord * visibleExtentOffsetArr[0].zw, BOTTOMLEFT, TOPRIGHT);
    frustumColor = mix(frustumColor, vec4(frustumPickingColor, 1.0), 1.0);
    if (samplerCount == 1) return;

    t = texture(samplerArr[1], tileOffsetArr[1].xy + vTextureCoord * tileOffsetArr[1].zw) * insideBox(visibleExtentOffsetArr[1].xy + vTextureCoord * visibleExtentOffsetArr[1].zw, BOTTOMLEFT, TOPRIGHT);
    frustumColor = mix(frustumColor, vec4(frustumPickingColor, 1.0), 1.0);
    if (samplerCount == 2) return;

    t = texture(samplerArr[2], tileOffsetArr[2].xy + vTextureCoord * tileOffsetArr[2].zw) * insideBox(visibleExtentOffsetArr[2].xy + vTextureCoord * visibleExtentOffsetArr[2].zw, BOTTOMLEFT, TOPRIGHT);
    frustumColor = mix(frustumColor, vec4(frustumPickingColor, 1.0), 1.0);
    if (samplerCount == 3) return;

    t = texture(samplerArr[3], tileOffsetArr[3].xy + vTextureCoord * tileOffsetArr[3].zw) * insideBox(visibleExtentOffsetArr[3].xy + vTextureCoord * visibleExtentOffsetArr[3].zw, BOTTOMLEFT, TOPRIGHT);
    frustumColor = mix(frustumColor, vec4(frustumPickingColor, 1.0), 1.0);
    if (samplerCount == 4) return;

    t = texture(samplerArr[4], tileOffsetArr[4].xy + vTextureCoord * tileOffsetArr[4].zw) * insideBox(visibleExtentOffsetArr[4].xy + vTextureCoord * visibleExtentOffsetArr[4].zw, BOTTOMLEFT, TOPRIGHT);
    frustumColor = mix(frustumColor, vec4(frustumPickingColor, 1.0), 1.0);
} `
    });
}
