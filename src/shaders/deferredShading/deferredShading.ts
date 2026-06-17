import { ShaderProgram } from "../../webgl/ShaderProgram";

import deferred_vert from "./deferredShading.vert.glsl";
import deferred_frag from "./deferredShading.frag.glsl";

export function deferredShading(): ShaderProgram {
    return new ShaderProgram("deferredShading", {
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
            u_shadowMapCount: "int",
            u_shadowMapLayer: "intxx",
            u_shadowMapViewProjRTE: "mat4",
            u_shadowMapEyeRel: "vec3",
            u_shadowMapParams: "vec4",
            u_shadowMapDepthArray: "sampler2darray"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: deferred_frag
    });
}
