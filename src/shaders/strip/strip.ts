import { ShaderProgram } from "../../webgl/ShaderProgram";

import strip_vert from "./strip.vert.glsl";
import strip_woit_frag from "./strip_woit.frag.glsl";
import strip_forward_frag from "./strip_forward.frag.glsl";

export function stripTransparent(): ShaderProgram {
    return new ShaderProgram("stripTransparent", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uColor: "vec4",
            uOpacity: "float",
            useReverseDepth: "float"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },
        vertexShader: strip_vert,
        fragmentShader: strip_woit_frag
    });
}

export function stripForward(): ShaderProgram {
    return new ShaderProgram("stripForward", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uColor: "vec4",
            uOpacity: "float"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3"
        },
        vertexShader: strip_vert,
        fragmentShader: strip_forward_frag
    });
}
