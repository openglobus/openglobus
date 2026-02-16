import {Program} from '../../webgl/Program';

import strip_vert from './strip.vert.glsl';
import strip_frag from './strip.frag.glsl';
import strip_opaque_frag from './stripOpaque.frag.glsl';

export function stripTransparentScreen(): Program {
    return new Program("stripTransparent", {
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
        fragmentShader: strip_frag
    });
}

export function stripForwardScreen(): Program {
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
        fragmentShader: strip_opaque_frag
    });
}
