import {Program} from '../../webgl/Program';

import billboard_picking_vert from './billboard_picking.vert.glsl';
import billboard_picking_frag from './billboard_picking.frag.glsl';

import billboard_screen_vert from './billboard_screen.vert.glsl';
import billboard_screen_frag from './billboard_screen.frag.glsl';

export function billboardPicking(): Program {
    return new Program("billboardPicking", {
        uniforms: {
            viewport: "vec2",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            uScaleByDistance: "vec3",
            opacity: "float",
            depthOffset: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_offset: "vec3",
            a_size: "vec2",
            a_rotation: "float",
            a_rgba: "vec4"
        },
        vertexShader: billboard_picking_vert,
        fragmentShader: billboard_picking_frag
    });
}

export function billboard_screen(): Program {
    return new Program("billboard", {
        uniforms: {
            viewport: "vec2",
            u_texture: "sampler2d",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            uScaleByDistance: "vec3",
            opacity: "float",
            depthOffset: "float"
        },
        attributes: {
            a_vertices: "vec2",
            a_texCoord: "vec2",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_offset: "vec3",
            a_size: "vec2",
            a_rotation: "float",
            a_rgba: "vec4",
        },
        vertexShader: billboard_screen_vert,
        fragmentShader: billboard_screen_frag
    });
}