'use strict';

import { Program } from '../webgl/Program.js';

export const COMMON =
    `float pi = 3.141592;
    float bottomRadius = 6360e3;
    float topRadius = 6460e3;
    float rayleighScaleHeight = 8e3;
    float mieScaleHeight = 1.2e3;
    // rayleightScatteringCoefficient from waveLength
    //vec3 waveLength = vec3(680e-9, 550e-9, 440e-9);
    //vec3 rayleighScatteringCoefficient = (1.0 / pow(waveLength, vec3(4.0))) * 1.241e-30;
    vec3 rayleighScatteringCoefficient = vec3(5.8e-6, 13.5e-6, 33.1e-6);
    float mieScatteringCoefficient = 3.996e-06;
    float mieExtinctionCoefficient = 4.440e-06;
    vec3 ozoneAbsorptionCoefficient = vec3(0.650e-6, 1.881e-6, 0.085e-6);
    float sunAngularRadius = 0.004685 * 2.0;
    float sunIntensity = 1.0;
    
    float rayleighPhase(float angle) {
        return 3.0 / (16.0 * pi) * (1.0 + (angle * angle));
    }
    
    float miePhase(float angle) {
        float g = 0.8;
        return 3.0 / (8.0 * pi) * ((1.0 - g * g) * (1.0 + angle * angle)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * angle, 1.5));
    }
    
    mat3 rotationMatrixAxisAngle(vec3 axis, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        vec3 column1 = axis * axis.x * (1.0 - c) + vec3(c, axis.z * s, -axis.y * s);
        vec3 column2 = axis * axis.y * (1.0 - c) + vec3(-axis.z * s, c, axis.x * s);
        vec3 column3 = axis * axis.z * (1.0 - c) + vec3(axis.y * s, -axis.x * s, c);
        return mat3(column1, column2, column3);
    }
    
    bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t1, inout float t2) {
        float b = dot(rayDirection, rayOrigin);
        float c = dot(rayOrigin, rayOrigin) - radius * radius;
        float d = b * b - c;
        if (d < 0.0) {
            return false;
        }
        t1 = -b - sqrt(d);
        t2 = -b + sqrt(d);
        return true;
    }
    
    bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t) {
        float b = dot(rayDirection, rayOrigin);
        float c = dot(rayOrigin, rayOrigin) - radius * radius;
        float d = b * b - c;
        if (d < 0.0) {
            return false;
        }
        t = -b - sqrt(d);
        return true;
    }
    
    vec3 opticalDepth(float height, float angle) {
        const int sampleCount = 32;
        vec3 rayOrigin = vec3(0.0, bottomRadius + height, 0.0);
        vec3 rayDirection = vec3(sqrt(1.0 - angle * angle), angle, 0.0);
        float t1;
        float t2;
        intersectSphere(rayOrigin, rayDirection, topRadius, t1, t2);
        float segmentLength = t2 / float(sampleCount);
        
        float t = segmentLength * 0.5;
        vec3 opticalDepth = vec3(0.0);
        
        for (int i = 0; i < sampleCount; i++) {
            vec3 position = rayOrigin + t * rayDirection;
            float height = length(position) - bottomRadius;
            opticalDepth.xy += exp(-height / vec2(rayleighScaleHeight, mieScaleHeight)) * segmentLength;
            // density of the ozone layer is modeled as a triangular function that is 30 km wide and centered at 25 km altitude
            opticalDepth.z += (1.0 - min(abs(height - 25e3) / 15e3, 1.0)) * segmentLength;  
            t += segmentLength;
        }
        return opticalDepth;
    }
    
    vec3 transmittance(float height, float angle) {
        vec3 opticalDepth = opticalDepth(height, angle);
        return exp(-(rayleighScatteringCoefficient * opticalDepth.x + mieExtinctionCoefficient * opticalDepth.y + ozoneAbsorptionCoefficient * opticalDepth.z));
    }`;

export function transmittance() {
    return new Program("transmittance", {
        uniforms: {
            iResolution: "vec2"
        },
        attributes: {
            a_position: "vec2"
        },

        vertexShader:
            `attribute vec2 a_position;            
            varying vec2 uv;            
            void main(void) {
                gl_Position = vec4(a_position, 0.0, 1.0);
                //uv = a_position * 0.5 + 0.5;
            }`,

        fragmentShader:
            `precision highp float;
            
            ${COMMON}
                       
            uniform vec2 iResolution;
            //varying vec2 uv;
            
            void main(void) {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                float height = uv.y * (topRadius - bottomRadius);
                float angle = uv.x * 2.0 - 1.0;
                gl_FragColor = vec4(transmittance(height, angle), 0.0);
            }`
    });
}