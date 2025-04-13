import {Program} from "../../webgl/Program";
import geoObjectVert from './geo_object.vert.glsl';
import geoObjectFrag from './geo_object.frag.glsl';
import geoObjectPickingVert from './geo_object_picking.vert.glsl';
import geoObjectPickingFrag from './geo_object_picking.frag.glsl';
import geoObjectDepthVert from './geo_object_depth.vert.glsl';
import geoObjectDepthFrag from './geo_object_depth.frag.glsl';

export const geo_object = (): Program =>
    new Program("geo_object", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec3",
            eyePositionHigh: "vec3",
            eyePositionLow: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            sunPosition: "vec3",
            materialParams: "vec3",
            materialShininess: "float",
            uTexture: "sampler2d",
            uUseTexture: "float",
            useLighting: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aVertexNormal: "vec3",
            aTexCoord: "vec2",
            aLocalPosition: {type: "vec3", divisor: 1},
            aRTCPositionHigh: {type: "vec3", divisor: 1},
            aRTCPositionLow: {type: "vec3", divisor: 1},
            aColor: {type: "vec4", divisor: 1},
            aScale: {type: "vec3", divisor: 1},
            aTranslate: {type: "vec3", divisor: 1},
            aDispose: {type: "float", divisor: 1},
            qRot: {type: "vec4", divisor: 1}
        },
        vertexShader: geoObjectVert,
        fragmentShader: geoObjectFrag
    });

export const geo_object_picking = (): Program =>
    new Program("geo_object_picking", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec3",
            pickingScale: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
        },
        attributes: {
            aVertexPosition: "vec3",
            aRTCPositionHigh: {type: "vec3", divisor: 1},
            aRTCPositionLow: {type: "vec3", divisor: 1},
            aPickingColor: {type: "vec3", divisor: 1},
            aScale: {type: "vec3", divisor: 1},
            aTranslate: {type: "vec3", divisor: 1},
            aLocalPosition: {type: "vec3", divisor: 1},
            aDispose: {type: "float", divisor: 1},
            qRot: {type: "vec4", divisor: 1}
        },
        vertexShader: geoObjectPickingVert,
        fragmentShader: geoObjectPickingFrag
    });

export const geo_object_depth = (): Program =>
    new Program("geo_object_depth", {
        uniforms: {
            viewMatrix: "mat4",
            projectionMatrix: "mat4",
            uScaleByDistance: "vec3",
            rtcEyePositionHigh: "vec3",
            rtcEyePositionLow: "vec3",
            frustumPickingColor: "float"
        },
        attributes: {
            aVertexPosition: "vec3",
            aRTCPositionHigh: {type: "vec3", divisor: 1},
            aRTCPositionLow: {type: "vec3", divisor: 1},
            aScale: {type: "vec3", divisor: 1},
            aTranslate: {type: "vec3", divisor: 1},
            aDispose: {type: "float", divisor: 1},
            qRot: {type: "vec4", divisor: 1},
            aLocalPosition: {type: "vec3", divisor: 1},
        },
        vertexShader: geoObjectDepthVert,
        fragmentShader: geoObjectDepthFrag
    });