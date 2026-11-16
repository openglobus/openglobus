import { ShaderProgram } from "../../webgl/ShaderProgram";
import { stringTemplate2 } from "../../utils/shared";
import {
    SHADER_FEATURES_ALL,
    SHADER_FEATURES_SHADOWS,
    shaderFeatureParams,
    shaderFeatureProgramName,
    shaderFeatureUniforms
} from "../common/uniforms";

import deferred_vert from "./deferredShading.vert.glsl";
import deferred_frag from "./deferredShading.frag.glsl";

/** @param {number} [features] - Lighting features to compile in; this program takes shadows only. */
export function deferredShading(features: number = SHADER_FEATURES_ALL): ShaderProgram {
    return new ShaderProgram(shaderFeatureProgramName("deferredShading", features, SHADER_FEATURES_SHADOWS), {
        uniforms: {
            normalMatrix: "mat3",
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            viewPositionTexture: "sampler2d",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            frameOpacity: "float",
            ...shaderFeatureUniforms(features & SHADER_FEATURES_SHADOWS)
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: stringTemplate2(deferred_frag, shaderFeatureParams(features & SHADER_FEATURES_SHADOWS))
    });
}
