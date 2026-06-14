import { ShaderProgram } from "../../webgl/ShaderProgram";

import vert from "./shadowPass.vert.glsl";
import frag from "./shadowPass.frag.glsl";

export function shadowPass(): ShaderProgram {
    return new ShaderProgram("shadowPass", {
        uniforms: {
            u_normalMatrix: "mat3",
            u_baseTexture: "sampler2d",
            u_materialsTexture: "sampler2d",
            u_normalTexture: "sampler2d",
            u_viewPositionTexture: "sampler2d",
            u_lightDiffuse: "vec3",
            u_shadowMapCount: "int",
            u_shadowMapLayer: "intxx",
            u_shadowMapViewProjRTE: "mat4",
            u_shadowMapEyeRel: "vec3",
            u_shadowMapForward: "vec3",
            u_shadowMapColor: "vec4",
            u_shadowMapParams: "vec4",
            u_shadowMapDepthParams: "vec4",
            u_shadowMapDepthArray: "sampler2darray"
        },
        attributes: {
            a_corners: "vec3"
        },
        vertexShader: vert,
        fragmentShader: frag
    });
}
