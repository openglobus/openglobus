import { ShaderProgram } from "../../webgl/ShaderProgram";

import polyline_tex_vert from "./polyline.vert.glsl";
import polyline_tex_frag from "./polyline_forward.frag.glsl";
import polyline_woit_frag from "./polyline_woit.frag.glsl";

import polyline_plain_vert from "./polyline_plain.vert.glsl";
import polyline_plain_frag from "./polyline_plain.frag.glsl";
import polyline_plain_woit_frag from "./polyline_plain_woit.frag.glsl";

import polyline_picking_vert from "./polyline_picking.vert.glsl";
import polyline_picking_frag from "./polyline_picking.frag.glsl";

const SHARED_UNIFORMS = {
    viewport: "vec2",
    proj: "mat4",
    view: "mat4",
    rtcEyePositionHigh: "vec3",
    rtcEyePositionLow: "vec3",
    thicknessScale: "float",
    opacity: "float",
    depthOffset: "float",
    depthOffsetNear: "float",
    visibleSphere: "vec4"
};

const SHARED_ATTRIBUTES = {
    prevHigh: "vec3",
    currentHigh: "vec3",
    nextHigh: "vec3",
    prevLow: "vec3",
    currentLow: "vec3",
    nextLow: "vec3",
    order: "float",
    color: "vec4",
    thickness: "float"
};

export function polylineTex(): ShaderProgram {
    return new ShaderProgram("polylineTex", {
        uniforms: {
            ...SHARED_UNIFORMS,
            time: "float",
            texAtlas: "sampler2d"
        },
        attributes: {
            ...SHARED_ATTRIBUTES,
            texCoord: "vec4",
            textureParams: "vec3",
            pathPhase: "float",
            boundingSphere: "vec4"
        },
        vertexShader: polyline_tex_vert,
        fragmentShader: polyline_tex_frag
    });
}

export function polylinePlain(): ShaderProgram {
    return new ShaderProgram("polylinePlain", {
        uniforms: {
            ...SHARED_UNIFORMS
        },
        attributes: {
            ...SHARED_ATTRIBUTES
        },
        vertexShader: polyline_plain_vert,
        fragmentShader: polyline_plain_frag
    });
}

function createPolylineTexWoitProgram(name: string): ShaderProgram {
    return new ShaderProgram(name, {
        uniforms: {
            ...SHARED_UNIFORMS,
            useReverseDepth: "float",
            time: "float",
            texAtlas: "sampler2d"
        },
        attributes: {
            ...SHARED_ATTRIBUTES,
            texCoord: "vec4",
            textureParams: "vec3",
            pathPhase: "float",
            boundingSphere: "vec4"
        },
        vertexShader: polyline_tex_vert,
        fragmentShader: polyline_woit_frag
    });
}

export function polylineTexWoit(): ShaderProgram {
    return createPolylineTexWoitProgram("polylineTexWoit");
}

export function polylineWoitTex(): ShaderProgram {
    return createPolylineTexWoitProgram("polylineWoitTex");
}

export function polylineWoitPlain(): ShaderProgram {
    return new ShaderProgram("polylineWoitPlain", {
        uniforms: {
            ...SHARED_UNIFORMS,
            useReverseDepth: "float"
        },
        attributes: {
            ...SHARED_ATTRIBUTES
        },
        vertexShader: polyline_plain_vert,
        fragmentShader: polyline_plain_woit_frag
    });
}

export function polyline_picking(): ShaderProgram {
    return new ShaderProgram("polyline_picking", {
        uniforms: {
            viewport: "vec2",
            proj: "mat4",
            view: "mat4",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            thicknessScale: "float",
            depthOffset: "float",
            depthOffsetNear: "float",
            visibleSphere: "vec4"
        },
        attributes: {
            prevHigh: "vec3",
            currentHigh: "vec3",
            nextHigh: "vec3",
            prevLow: "vec3",
            currentLow: "vec3",
            nextLow: "vec3",
            pickingColor: "vec3",
            order: "float",
            thickness: "float"
        },
        vertexShader: polyline_picking_vert,
        fragmentShader: polyline_picking_frag
    });
}
