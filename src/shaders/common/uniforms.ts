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
