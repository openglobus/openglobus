import {Program} from '../../webgl/Program';

import polyline_screen_vert from './polyline_screen.vert.glsl';
import polyline_screen_frag from './polyline_screen.frag.glsl';

import polyline_picking_vert from './polyline_picking.vert.glsl';
import polyline_picking_frag from './polyline_picking.frag.glsl';

export function polyline_screen(): Program {
    return new Program("polyline_screen", {
        uniforms: {
            viewport: "vec2",
            proj: "mat4",
            view: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            thickness: "float",
            opacity: "float",
            depthOffset: "float",
            visibleSphere: "vec4",
        },
        attributes: {
            prevHigh: "vec3",
            currentHigh: "vec3",
            nextHigh: "vec3",
            prevLow: "vec3",
            currentLow: "vec3",
            nextLow: "vec3",
            order: "float",
            color: "vec4"
        },
        vertexShader: polyline_screen_vert,
        fragmentShader: polyline_screen_frag
    });
}

export function polyline_picking(): Program {
    return new Program("polyline_picking", {
        uniforms: {
            viewport: "vec2",
            proj: "mat4",
            view: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            color: "vec4",
            thickness: "float",
            depthOffset: "float",
            visibleSphere: "vec4",
        },
        attributes: {
            prevHigh: "vec3",
            currentHigh: "vec3",
            nextHigh: "vec3",
            prevLow: "vec3",
            currentLow: "vec3",
            nextLow: "vec3",
            order: "float"
        },
        vertexShader: polyline_picking_vert,
        fragmentShader: polyline_picking_frag
    });
}