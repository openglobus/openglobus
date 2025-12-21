import {Program} from '../../webgl/Program';

import ray_vert from './ray.vert.glsl';
import ray_frag from './ray.frag.glsl';

export function rayScreen(): Program {
    return new Program("rayScreen", {
        uniforms: {
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            resolution: "float",
            uOpacity: "float",
            texAtlas: "sampler2d",
            viewport: "vec2",
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_startPosHigh: "vec3",
            a_startPosLow: "vec3",
            a_endPosHigh: "vec3",
            a_endPosLow: "vec3",
            a_thickness: "float",
            a_rgba: "vec4",
            a_texOffset: "float",
            a_strokeSize: "float"
        },
        vertexShader: ray_vert,
        fragmentShader: ray_frag
    });
}
