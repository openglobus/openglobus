import type {AtmosphereParameters} from "../atmos/atmos";
import {Program} from "../../webgl/Program";

import drawnode_screen_nl_vert from './drawnode_screen_nl.vert.glsl';
import drawnode_screen_nl_frag from './drawnode_screen_nl.frag.glsl';

import drawnode_screen_wl_webgl1NoAtmos_vert from './drawnode_screen_wl_webgl1NoAtmos.vert.glsl';
import drawnode_screen_wl_webgl1NoAtmos_frag from './drawnode_screen_wl_webgl1NoAtmos.frag.glsl';

import drawnode_screen_wl_webgl2Atmos_vert from './drawnode_screen_wl_webgl2Atmos.vert.glsl';
import drawnode_screen_wl_webgl2Atmos_frag from './drawnode_screen_wl_webgl2Atmos.frag.glsl';

import drawnode_screen_wl_webgl2NoAtmos_vert from './drawnode_screen_wl_webgl2NoAtmos.vert.glsl';
import drawnode_screen_wl_webgl2NoAtmos_frag from './drawnode_screen_wl_webgl2NoAtmos.frag.glsl';

import drawnode_colorPicking_vert from './drawnode_colorPicking.vert.glsl';
import drawnode_colorPicking_frag from './drawnode_colorPicking.frag.glsl';

import drawnode_depth_vert from './drawnode_depth.vert.glsl';
import drawnode_depth_frag from './drawnode_depth.frag.glsl';
import {stringTemplate2} from "../../utils/shared";

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
        fragmentShader: stringTemplate2(drawnode_screen_wl_webgl2Atmos_frag, atmosParams)
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
