import { ShaderProgram } from "../../webgl/ShaderProgram";
import { projectorUniforms } from "../common/uniforms";

import vert from "./projectorsPass.vert.glsl";
import frag from "./projectorsPass.frag.glsl";

export function projectorsPass(): ShaderProgram {
    return new ShaderProgram("projectorsPass", {
        uniforms: {
            u_normalMatrix: "mat3",
            u_baseTexture: "sampler2d",
            u_materialsTexture: "sampler2d",
            u_normalTexture: "sampler2d",
            u_viewPositionTexture: "sampler2d",
            ...projectorUniforms
        },
        attributes: {
            a_corners: "vec3"
        },
        vertexShader: vert,
        fragmentShader: frag
    });
}
