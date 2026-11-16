import { MAX_FORWARD_PROJECTOR_SOURCES, MAX_FORWARD_PROJECTORS } from "../../renderer/projectors/ProjectorManager";

/** Array sizes for projectors.glsl, filled in with stringTemplate2() by every program that includes it. */
export const projectorShaderParams = {
    MAX_PROJECTORS: MAX_FORWARD_PROJECTORS,
    PROJECTOR_MAX_SOURCES: MAX_FORWARD_PROJECTOR_SOURCES
};

export const projectorUniforms = {
    u_projectorCount: "int",
    u_projectorLayer: "intxx",
    u_projectorSourceIndex: "intxx",
    u_projectorViewProjRTE: "mat4",
    u_projectorEyeRel: "vec3",
    u_projectorColor: "vec4",
    u_projectorParams: "vec4",
    u_projectorDepthRange: "vec3",
    u_projectorDepthArray: "sampler2darray",
    u_projectorSource: "sampler2darraylegacy"
};

export const shadowMapUniforms = {
    u_shadowMapCount: "int",
    u_shadowMapLayer: "intxx",
    u_shadowMapViewProjRTE: "mat4",
    u_shadowMapEyeRel: "vec3",
    u_shadowMapParams: "vec4",
    u_shadowMapDepthRange: "vec3",
    u_shadowMapDepthArray: "sampler2darray"
};

export const cascadeShadowUniforms = {
    u_cascadeShadowCount: "int",
    u_cascadeShadowLayer: "intxx",
    u_cascadeShadowViewProjRTE: "mat4",
    u_cascadeShadowEyeRel: "vec3",
    u_cascadeShadowParams: "vec4",
    u_cascadeShadowSplits: "vec4",
    u_cascadeShadowViewForward: "vec3",
    u_cascadeShadowDepthArray: "sampler2darray"
};

/**
 * Lighting features a program variant compiles in (lightingFeatures.glsl), as a bit mask.
 * Compiled-in projector and shadow code slows the fragment stage on some GPUs even with
 * nothing active (Mali-G57: +3.5 ms a frame for the terrain at 1920x1150), so programs
 * are built per mask of what is actually active.
 */
export const SHADER_FEATURE_PROJECTORS = 1;
export const SHADER_FEATURE_SHADOW_MAPS = 2;
export const SHADER_FEATURE_CASCADE_SHADOWS = 4;
export const SHADER_FEATURES_ALL =
    SHADER_FEATURE_PROJECTORS | SHADER_FEATURE_SHADOW_MAPS | SHADER_FEATURE_CASCADE_SHADOWS;
/** Features of programs that receive shadows but no projectors. */
export const SHADER_FEATURES_SHADOWS = SHADER_FEATURE_SHADOW_MAPS | SHADER_FEATURE_CASCADE_SHADOWS;

/** Uniforms of the features in `mask`. */
export function shaderFeatureUniforms(mask: number): Record<string, string> {
    return {
        ...(mask & SHADER_FEATURE_PROJECTORS ? projectorUniforms : {}),
        ...(mask & SHADER_FEATURE_SHADOW_MAPS ? shadowMapUniforms : {}),
        ...(mask & SHADER_FEATURE_CASCADE_SHADOWS ? cascadeShadowUniforms : {})
    };
}

/** stringTemplate2() parameters for lightingFeatures.glsl. */
export function shaderFeatureParams(mask: number): Record<string, number> {
    return {
        USE_PROJECTORS: mask & SHADER_FEATURE_PROJECTORS ? 1 : 0,
        USE_SHADOW_MAPS: mask & SHADER_FEATURE_SHADOW_MAPS ? 1 : 0,
        USE_CASCADE_SHADOWS: mask & SHADER_FEATURE_CASCADE_SHADOWS ? 1 : 0,
        ...projectorShaderParams
    };
}

/**
 * Program name of a feature variant. The variant with every feature the program supports keeps
 * the plain name, so code that looks a program up by name still finds the full one.
 * @param {string} name - Plain program name.
 * @param {number} mask - Features to compile in.
 * @param {number} [supported] - Features the program has at all.
 */
export function shaderFeatureProgramName(name: string, mask: number, supported: number = SHADER_FEATURES_ALL): string {
    const features = mask & supported;
    return features === supported ? name : `${name}_f${features}`;
}
