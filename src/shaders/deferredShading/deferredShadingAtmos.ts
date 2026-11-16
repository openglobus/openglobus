import { ShaderProgram } from "../../webgl/ShaderProgram";
import { stringTemplate2 } from "../../utils/shared";
import {
    SHADER_FEATURES_ALL,
    SHADER_FEATURES_SHADOWS,
    shaderFeatureParams,
    shaderFeatureProgramName,
    shaderFeatureUniforms
} from "../common/uniforms";
import type { AtmosphereParameters } from "../atmos/atmos";
import { DEFAULT_PARAMS } from "../atmos/atmos";

import deferred_vert from "./deferredShading.vert.glsl";
import deferred_atmos_frag from "./deferredShadingAtmos.frag.glsl";

/**
 * @param {AtmosphereParameters} [atmosParams] - Atmosphere parameters.
 * @param {number} [features] - Lighting features to compile in; this program takes shadows only.
 */
export function deferredShadingAtmos(
    atmosParams: AtmosphereParameters = DEFAULT_PARAMS,
    features: number = SHADER_FEATURES_ALL
): ShaderProgram {
    return new ShaderProgram(shaderFeatureProgramName("deferredShadingAtmos", features, SHADER_FEATURES_SHADOWS), {
        uniforms: {
            normalMatrix: "mat3",
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            viewPositionTexture: "sampler2d",
            atmosLutTexture: "sampler2d",
            aerialPerspectiveTexture: "sampler3d",
            aerialPerspectiveFrame: "mat3",
            aerialPerspectiveParams: "vec4",
            aerialPerspectiveStartDistance: "float",
            aerialPerspectiveIntensity: "float",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            cameraPosition: "vec3",
            cameraForward: "vec3",
            isOrthographic: "float",
            atmosFadeDist: "vec2",
            atmosMaxMinOpacity: "vec3",
            frameOpacity: "float",
            ...shaderFeatureUniforms(features & SHADER_FEATURES_SHADOWS)
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: stringTemplate2(deferred_atmos_frag, {
            ...atmosParams,
            ...shaderFeatureParams(features & SHADER_FEATURES_SHADOWS)
        })
    });
}
