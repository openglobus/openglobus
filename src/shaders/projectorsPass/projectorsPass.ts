import { ShaderProgram } from "../../webgl/ShaderProgram";

import vert from "./projectorsPass.vert.glsl";
import frag from "./projectorsPass.frag.glsl";

export function projectorsPass(): ShaderProgram {
    return new ShaderProgram("projectorsPass", {
        uniforms: {
            u_normalMatrix: "mat3",
            u_materialsTexture: "sampler2d",
            u_normalTexture: "sampler2d",
            u_viewPositionTexture: "sampler2d",
            u_projectorCount: "int",
            u_projectorLayer: "intxx",
            u_projectorViewProjRTE: "mat4",
            u_projectorEyeRel: "vec3",
            u_projectorColorIntensity: "vec4",
            u_projectorParams: "vec4",
            u_projectorDepthArray: "sampler2darray"
        },
        attributes: {
            a_corners: "vec3"
        },
        vertexShader: vert,
        fragmentShader: frag
    });
}
