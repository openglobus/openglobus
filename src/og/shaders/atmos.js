'use strict';

import { Program } from '../webgl/Program.js';

export const COMMON =
    `float pi = 3.141592;
    
    // Sphere
    float bottomRadius = 6356752.3142451793;
    float topRadius = 6356752.3142451793 + 100000.0;
    
    // Ellipsoid
    vec3 bottomRadii = vec3(6378137.0, 6356752.3142451793, 6378137.0);           
    vec3 topRadii = vec3(6378137.0 + 100000.0, 6356752.3142451793 + 100000.0, 6378137.0 + 100000.0);
    
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
    
    bool intersectEllipsoid( in vec3 ro, in vec3 rd, in vec3 ra, inout float t )
    {
        vec3 ocn = ro/ra;
        vec3 rdn = rd/ra;
        float a = dot( rdn, rdn );
        float b = dot( ocn, rdn );
        float c = dot( ocn, ocn );
        float h = b*b - a*(c-1.0);               
        if (h < 0.0) { 
            return false; 
        }
        t = (-b-sqrt(h))/a;
        return true;
    }
    
    bool intersectEllipsoid( in vec3 ro, in vec3 rd, in vec3 ra, inout float t1, inout float t2)
    {
        vec3 ocn = ro/ra;
        vec3 rdn = rd/ra;
        float a = dot( rdn, rdn );
        float b = dot( ocn, rdn );
        float c = dot( ocn, ocn );
        float h = b*b - a*(c-1.0);        
        if (h < 0.0) { 
            return false; 
        }
        h = sqrt(h);
        t1 = (-b-h)/a;
        t2 = (-b+h)/a;
        return true;
    }
    
    vec3 normalEllipsoid( in vec3 pos, in vec3 ra )
    {
        return normalize( pos/(ra*ra) );
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
                gl_FragColor = vec4(transmittance(height, angle), 1.0);
            }`
    });
}

export function scattering() {
    return new Program("scattering", {
        uniforms: {
            iResolution: "vec2",
            transmittanceTexture: "sampler2d"
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
            
            uniform sampler2D transmittanceTexture;
            uniform vec2 iResolution;

            ${COMMON}
            
            vec3 transmittanceFromTexture(float height, float angle) {
                float u = (angle + 1.0) * 0.5;
                float v = height / (topRadius - bottomRadius);
                return texture2D(transmittanceTexture, vec2(u, v)).xyz;
            }
                                   
            void main(void) {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                
                float height = uv.y * (topRadius - bottomRadius);
                float angle = uv.x * 2.0 - 1.0;
                
                vec3 rayOrigin = vec3(0.0, bottomRadius + height, 0.0);                
                vec3 up = rayOrigin / length(rayOrigin);                
                vec3 lightDirection = vec3(sqrt(1.0 - angle * angle), angle, 0.0);
                                
                float isotropicPhase = 1.0 / (4.0 * pi);
                
                const int sqrtSampleCount = 8;
                
                vec3 light = vec3(0.0);
                vec3 lightTransferFactor = vec3(0.0);
                
                for (int i = 0; i < sqrtSampleCount; i++) {
                    for (int j = 0; j < sqrtSampleCount; j++) {    
                        float u = ((0.5 + float(i)) / float(sqrtSampleCount)) * 2.0 - 1.0;
                        float v = (0.5 + float(j)) / float(sqrtSampleCount);
                        float r = sqrt(1.0 - u * u);
                        float theta = 2.0 * pi * v;
                        vec3 rayDirection = vec3(cos(theta) * r, sin(theta) * r, u);
                        
                        const int sampleCount = 32;
                        
                        float rayAngle = dot(up, rayDirection);                        
                        bool cameraBelow = rayAngle < 0.0;
                        
                        vec3 transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                        
                        float offset = 0.0;
                        float distanceToSpace = 0.0;
                        
                        intersectSphere(rayOrigin, rayDirection, topRadius, offset, distanceToSpace);
                        
                        float distanceToGround = 0.0;
                        bool hitGround = intersectSphere(rayOrigin, rayDirection, bottomRadius, distanceToGround) && distanceToGround > 0.0;                        
                        float segmentLength = (hitGround ? distanceToGround : distanceToSpace) / float(sampleCount);
                        float t = segmentLength * 0.5;
                        
                        vec3 transmittanceCamera;
                        vec3 transmittanceLight;
                         
                        for (int k = 0; k < sampleCount; k++) {
                            vec3 position = rayOrigin + t * rayDirection;
                            float height = length(position) - bottomRadius;
                            vec3 up = position / length(position);
                            float rayAngle = dot(up, rayDirection);
                            float lightAngle = dot(up, lightDirection);
                            
                            float distanceToGround;
                            float shadow = intersectSphere(position, lightDirection, bottomRadius, distanceToGround) && distanceToGround >= 0.0 ? 0.0 : 1.0;
                            vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                            
                            transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
                            transmittanceLight = transmittanceFromTexture(height, lightAngle);
                            
                            vec2 opticalDensity = exp(-height / vec2(rayleighScaleHeight, mieScaleHeight));        
                            vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y) * isotropicPhase;
                            
                            light += shadow * transmittanceCamera * scatteredLight * segmentLength;
                            lightTransferFactor += transmittanceCamera * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y) * segmentLength;
                            
                            t += segmentLength;
                        }
                    
                        if (hitGround) {
                            vec3 hitPoint = rayOrigin + rayDirection * distanceToGround;
                            vec3 normal = normalize(hitPoint);
                            float diffuseAngle = max(dot(normal, lightDirection), 0.0); 
                            vec3 earthAlbedo = vec3(0.3);
                            light += transmittanceCamera * transmittanceLight * (earthAlbedo / pi) * diffuseAngle;
                        }
                    }
                }
                
                light /= float(sqrtSampleCount * sqrtSampleCount);
                lightTransferFactor /= float(sqrtSampleCount * sqrtSampleCount);
                vec3 color = light / (1.0 - lightTransferFactor);                 
                gl_FragColor = vec4(color, 1.0);
            }`
    });
}