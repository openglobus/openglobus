import { MAX_FORWARD_PROJECTOR_SOURCES, MAX_FORWARD_PROJECTORS } from "../../renderer/textureUnits";
import { variantBit } from "../../webgl/ShaderProgram";

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

/** Uniforms of lightingFeatures.glsl; the ones of a feature switched off are inactive in that variant. */
export const lightingFeatureUniforms = {
    ...projectorUniforms,
    ...shadowMapUniforms,
    ...cascadeShadowUniforms
};

/** Uniforms of programs that receive shadows but no projectors. */
export const shadowFeatureUniforms = {
    ...shadowMapUniforms,
    ...cascadeShadowUniforms
};

/**
 * Switch defines of lightingFeatures.glsl. Compiled-in projector and shadow code slows the fragment
 * stage on some GPUs even with nothing active (Mali-G57: +3.5 ms a frame for the terrain at
 * 1920x1150), so programs that include it draw with program.variant(renderer.activeLightingFeatures).
 */
export const lightingFeatureDefines = {
    USE_PROJECTORS: false,
    USE_SHADOW_MAPS: false,
    USE_CASCADE_SHADOWS: false
};

/** Switch defines of programs that receive shadows but no projectors. */
export const shadowFeatureDefines = {
    USE_SHADOW_MAPS: false,
    USE_CASCADE_SHADOWS: false
};

/** Bits of the lighting feature switches in variant masks. */
export const LIGHTING_FEATURE_PROJECTORS = variantBit("USE_PROJECTORS");
export const LIGHTING_FEATURE_SHADOW_MAPS = variantBit("USE_SHADOW_MAPS");
export const LIGHTING_FEATURE_CASCADE_SHADOWS = variantBit("USE_CASCADE_SHADOWS");
