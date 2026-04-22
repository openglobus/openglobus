import { Program } from "../../webgl/Program";
import { stringTemplate2 } from "../../utils/shared";
import type { AtmosphereParameters } from "../atmos/atmos";
import { DEFAULT_PARAMS } from "../atmos/atmos";
import geo_object_vert from "./geo_object.vert.glsl";
import geo_object_deferred_frag from "./geo_object_deferred.frag.glsl";
import geo_object_forward_frag from "./geo_object_forward.frag.glsl";
import geo_object_woit_frag from "./geo_object_woit.frag.glsl";
import geo_object_woit_atmos_frag from "./geo_object_woit_atmos.frag.glsl";
import geo_object_picking_vert from "./geo_object_picking.vert.glsl";
import geo_object_picking_frag from "./geo_object_picking.frag.glsl";
import geo_object_depth_vert from "./geo_object_depth.vert.glsl";
import geo_object_depth_frag from "./geo_object_depth.frag.glsl";

export const geo_object_deferred = (): Program =>
    new Program("geo_object_deferred", {
        uniforms: {
            viewMatrix: "mat4",
            normalMatrix: "mat3",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            uColorTexture: "sampler2d",
            uNormalTexture: "sampler2d",
            uUseColorTexture: "float",
            uUseNormalTexture: "float",
            materialProperties: "vec3",
            shadeMode: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",
            aLocalPosition: { type: "vec3", divisor: 1 },
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aColor: { type: "vec4", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 }
        },
        vertexShader: geo_object_vert,
        fragmentShader: geo_object_deferred_frag
    });

export const geo_object_forward = (): Program =>
    new Program("geo_object_forward", {
        uniforms: {
            viewMatrix: "mat4",
            normalMatrix: "mat3",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            materialProperties: "vec3",
            uColorTexture: "sampler2d",
            uNormalTexture: "sampler2d",
            uUseColorTexture: "float",
            uUseNormalTexture: "float",
            shadeMode: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",
            aLocalPosition: { type: "vec3", divisor: 1 },
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aColor: { type: "vec4", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 }
        },
        vertexShader: geo_object_vert,
        fragmentShader: geo_object_forward_frag
    });

export const geo_object_woit = (): Program =>
    new Program("geo_object_woit", {
        uniforms: {
            viewMatrix: "mat4",
            normalMatrix: "mat3",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            materialProperties: "vec3",
            uColorTexture: "sampler2d",
            uNormalTexture: "sampler2d",
            uUseColorTexture: "float",
            uUseNormalTexture: "float",
            shadeMode: "float",
            useReverseDepth: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",
            aLocalPosition: { type: "vec3", divisor: 1 },
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aColor: { type: "vec4", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 }
        },
        vertexShader: geo_object_vert,
        fragmentShader: geo_object_woit_frag
    });

export function geo_object_woit_atmos(atmosParams: AtmosphereParameters = DEFAULT_PARAMS): Program {
    return new Program("geo_object_woit_atmos", {
        uniforms: {
            viewMatrix: "mat4",
            normalMatrix: "mat3",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            materialProperties: "vec3",
            uColorTexture: "sampler2d",
            uNormalTexture: "sampler2d",
            uUseColorTexture: "float",
            uUseNormalTexture: "float",
            shadeMode: "float",
            useReverseDepth: "float",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            atmosFadeDist: "vec2"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",
            aLocalPosition: { type: "vec3", divisor: 1 },
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aColor: { type: "vec4", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 }
        },
        vertexShader: geo_object_vert,
        fragmentShader: stringTemplate2(geo_object_woit_atmos_frag, {
            ...atmosParams
        })
    });
}

export const geo_object_picking = (): Program =>
    new Program("geo_object_picking", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            pickingScale: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3"
        },
        attributes: {
            aVertexPosition: "vec3",
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aPickingColor: { type: "vec3", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aLocalPosition: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 }
        },
        vertexShader: geo_object_picking_vert,
        fragmentShader: geo_object_picking_frag
    });

export const geo_object_depth = (): Program =>
    new Program("geo_object_depth", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            frustumPickingColor: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aRTCPositionHigh: { type: "vec3", divisor: 1 },
            aRTCPositionLow: { type: "vec3", divisor: 1 },
            aScale: { type: "vec3", divisor: 1 },
            aTranslate: { type: "vec3", divisor: 1 },
            aDispose: { type: "float", divisor: 1 },
            qRot: { type: "vec4", divisor: 1 },
            aLocalPosition: { type: "vec3", divisor: 1 }
        },
        vertexShader: geo_object_depth_vert,
        fragmentShader: geo_object_depth_frag
    });
