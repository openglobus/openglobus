import {Program} from '../../webgl/Program';

import label_webgl2_vert from './label_webgl2.vert.glsl';
import label_webgl2_frag from './label_webgl2.frag.glsl';

import label_webgl1_vert from './label_webgl1.vert.glsl';
import label_webgl1_frag from './label_webgl1.frag.glsl';

import label_picking_vert from './label_picking.vert.glsl';
import label_picking_frag from './label_picking.frag.glsl';

export function label_webgl2(): Program {
    return new Program("label", {
        uniforms: {
            viewport: "vec2",
            fontTextureArr: "sampler2darray",
            sdfParamsArr: "vec4",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            scaleByDistance: "vec3",
            opacity: "float",
            isOutlinePass: "int",
            depthOffset: "float"
        },
        attributes: {
            a_outline: "float",
            a_gliphParam: "vec4",
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_size: "float",
            a_rotation: "float",
            a_rgba: "vec4",
            a_offset: "vec3",
            a_fontIndex: "float"
        },
        vertexShader: label_webgl2_vert,
        fragmentShader: label_webgl2_frag
    });
}

export function label_screen(): Program {
    return new Program("label", {
        uniforms: {
            viewport: "vec2",
            fontTextureArr: "sampler2darray",
            sdfParamsArr: "vec4",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            scaleByDistance: "vec3",
            opacity: "float",
            isOutlinePass: "int",
            depthOffset: "float"
        },
        attributes: {
            a_outline: "float",
            a_gliphParam: "vec4",
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_size: "float",
            a_rotation: "float",
            a_rgba: "vec4",
            a_offset: "vec3",
            a_fontIndex: "float"
        },
        vertexShader: label_webgl1_vert,
        fragmentShader: label_webgl1_frag,
    });
}

export function labelPicking(): Program {
    return new Program("labelPicking", {
        uniforms: {
            viewport: "vec2",
            projectionMatrix: "mat4",
            viewMatrix: "mat4",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            planetRadius: "float",
            scaleByDistance: "vec3",
            opacity: "float",
            depthOffset: "float"
        },
        attributes: {
            a_gliphParam: "vec4",
            a_vertices: "vec2",
            a_texCoord: "vec4",
            a_positionsHigh: "vec3",
            a_positionsLow: "vec3",
            a_offset: "vec3",
            a_size: "float",
            a_rotation: "float",
            a_rgba: "vec4"
        },
        vertexShader: label_picking_vert,
        fragmentShader: label_picking_frag,
    });
}