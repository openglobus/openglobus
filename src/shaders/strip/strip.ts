import {Program} from '../../webgl/Program';

import strip_vert from './strip.vert.glsl';
import strip_woit_frag from './strip_woit.frag.glsl';
import strip_forward_frag from './strip_forward.frag.glsl';

export function stripTransparent(): Program {
    return new Program("stripTransparent", {
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

export function stripForward(): Program {
    return new Program("stripForward", {
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
