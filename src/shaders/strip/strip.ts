import { ShaderProgram } from "../../webgl/ShaderProgram";

import strip_vert from "./strip.vert.glsl";
import strip_woit_frag from "./strip_woit.frag.glsl";
import strip_forward_frag from "./strip_forward.frag.glsl";
import strip_time_vert from "./strip_time.vert.glsl";
import strip_woit_time_frag from "./strip_woit_time.frag.glsl";
import strip_forward_time_frag from "./strip_forward_time.frag.glsl";

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

export function stripTransparentTime(): ShaderProgram {
    return new ShaderProgram("stripTransparentTime", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uColor: "vec4",
            uOpacity: "float",
            useReverseDepth: "float",
            timeCut: "ivec2",
            timeOpacity: "vec2"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            pathTime: "ivec2"
        },
        vertexShader: strip_time_vert,
        fragmentShader: strip_woit_time_frag
    });
}

export function stripForwardTime(): ShaderProgram {
    return new ShaderProgram("stripForwardTime", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            uColor: "vec4",
            uOpacity: "float",
            timeCut: "ivec2",
            timeOpacity: "vec2"
        },
        attributes: {
            aVertexPositionHigh: "vec3",
            aVertexPositionLow: "vec3",
            pathTime: "ivec2"
        },
        vertexShader: strip_time_vert,
        fragmentShader: strip_forward_time_frag
    });
}
