import { ShaderProgram } from "../../webgl/ShaderProgram";
import { stringTemplate2 } from "../../utils/shared";
import type { AtmosphereParameters } from "../atmos/atmos";
import { DEFAULT_PARAMS } from "../atmos/atmos";

import deferred_vert from "./deferredShading.vert.glsl";
import deferred_atmos_frag from "./deferredShadingAtmos.frag.glsl";

export function deferredShadingAtmos(atmosParams: AtmosphereParameters = DEFAULT_PARAMS): ShaderProgram {
    return new ShaderProgram("deferredShadingAtmos", {
        uniforms: {
            normalMatrix: "mat3",
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            viewPositionTexture: "sampler2d",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            cameraPosition: "vec3",
            atmosFadeDist: "vec2",
            atmosMaxMinOpacity: "vec2",
            u_projectorCount: "int",
            u_projectorViewProjRTE: "mat4",
            u_projectorEyeRel: "vec3",
            u_projectorColorIntensity: "vec4",
            u_projectorParams: "vec4",
            u_projectorDepth0: "sampler2d",
            u_projectorDepth1: "sampler2d",
            u_projectorDepth2: "sampler2d",
            u_projectorDepth3: "sampler2d"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: stringTemplate2(deferred_atmos_frag, {
            ...atmosParams
        })
    });
}
