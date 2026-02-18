import {Program} from '../../webgl/Program';

import polyline_vert from './polyline.vert.glsl';
import polyline_woit_frag from './polyline_woit.frag.glsl';
import polyline_forward_frag from './polyline_forward.frag.glsl';

import polyline_picking_vert from './polyline_picking.vert.glsl';
import polyline_picking_frag from './polyline_picking.frag.glsl';

export function polylineTransparent(): Program {
    return new Program("polylineTransparent", {
        uniforms: {
            viewport: "vec2",
            proj: "mat4",
            view: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            thicknessScale: "float",
            opacity: "float",
            depthOffset: "float",
            visibleSphere: "vec4",
            texAtlas: "sampler2d",
            strokeSize: "float",
            texOffset: "float"
        },
        attributes: {
            prevHigh: "vec3",
            currentHigh: "vec3",
            nextHigh: "vec3",
            prevLow: "vec3",
            currentLow: "vec3",
            nextLow: "vec3",
            order: "float",
            color: "vec4",
            texCoord: "vec4",
            thickness: "float"
        },
        vertexShader: polyline_vert,
        fragmentShader: polyline_woit_frag
    });
}

export function polylineForward(): Program {
    return new Program("polylineForward", {
        uniforms: {
            viewport: "vec2",
            proj: "mat4",
            view: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            thicknessScale: "float",
            opacity: "float",
            depthOffset: "float",
            visibleSphere: "vec4",
            texAtlas: "sampler2d",
            strokeSize: "float",
            texOffset: "float"
        },
        attributes: {
            prevHigh: "vec3",
            currentHigh: "vec3",
            nextHigh: "vec3",
            prevLow: "vec3",
            currentLow: "vec3",
            nextLow: "vec3",
            order: "float",
            color: "vec4",
            texCoord: "vec4",
            thickness: "float"
        },
        vertexShader: polyline_vert,
        fragmentShader: polyline_forward_frag
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
            thicknessScale: "float",
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
            thickness: "float"
        },
        vertexShader: polyline_picking_vert,
        fragmentShader: polyline_picking_frag
    });
}
