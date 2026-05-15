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
            cameraPosition: "vec3",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            u_projectorCount: "int",
            u_projectorViewProj: "mat4",
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
        fragmentShader: deferred_frag
    });
}
