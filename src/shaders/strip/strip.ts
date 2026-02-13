import {Program} from '../../webgl/Program';

import strip_vert from './strip.vert.glsl';
import strip_frag from './strip.frag.glsl';

export function stripScreen(): Program {
    return new Program("strip", {
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
