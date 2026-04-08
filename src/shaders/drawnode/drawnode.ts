import  {AtmosphereParameters, DEFAULT_PARAMS} from "../atmos/atmos";
import {Program} from "../../webgl/Program";

import drawnode_screen_wl from './drawnode_screen_wl.vert.glsl';

import drawnode_screen_wl_atmos_forward_frag from './drawnode_screen_wl_atmos_forward.frag.glsl';
import drawnode_screen_wl_noatmos_forward_frag from './drawnode_screen_wl_noatmos_forward.frag.glsl';

import drawnode_screen_deferred_frag from './drawnode_screen_deferred.frag.glsl';

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

// const NIGHT = `const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);`;
//
// const DEF_BLEND = `#define blend(DEST, SAMPLER, OFFSET, OPACITY) \
//                     src = texture( SAMPLER, OFFSET.xy + vTextureCoord.xy * OFFSET.zw );\
//                     DEST = DEST * (1.0 - src.a * OPACITY) + src * OPACITY;`;
//
// const SLICE_SIZE = 4;

export function drawnode_screen_deferred(): Program {
    return new Program("drawnode_screen_deferred", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darraylegacy",
            defaultTexture: "sampler2d",
            uNormalMap: "sampler2d",
            nightTexture: "sampler2d",
            specularTexture: "sampler2d",
            lightPosition: "vec3",
            shadeMode: "float",
            camHeight: "float",
            nightTextureCoefficient: "float",
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl,
        fragmentShader: drawnode_screen_deferred_frag
    });
}

export function drawnode_screen_wl_forward_noatmos(): Program {
    return new Program("drawnode_screen_wl_forward", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darraylegacy",
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
            transitionOpacity: "float",
            shadeMode: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl,
        fragmentShader: drawnode_screen_wl_noatmos_forward_frag
    });
}

export function drawnode_screen_wl_forward_atmos(atmosParams: AtmosphereParameters = DEFAULT_PARAMS): Program {
    return new Program("drawnode_screen_wl_forward", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            height: "float",
            uGlobalTextureCoord: "vec4",
            uNormalMapBias: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            layerOpacityArr: "float",
            samplerArr: "sampler2darraylegacy",
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
            atmosFadeDist: "vec2",
            camHeight: "float",
            nightTextureCoefficient: "float",
            transitionOpacity: "float",
            shadeMode: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            aTextureCoord: "vec2"
        },
        vertexShader: drawnode_screen_wl,
        fragmentShader: stringTemplate2(drawnode_screen_wl_atmos_forward_frag, atmosParams)
    });
}

export function drawnode_colorPicking(): Program {
    return new Program("drawnode_colorPicking", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            samplerCount: "int",
            tileOffsetArr: "vec4",
            samplerArr: "sampler2darraylegacy",
            pickingMaskArr: "sampler2darraylegacy",
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
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            frustumPickingColor: "float"
        }, attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },
        vertexShader: drawnode_depth_vert,
        fragmentShader: drawnode_depth_frag
    });
}
