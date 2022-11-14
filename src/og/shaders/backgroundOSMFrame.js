'use strict';

import { Program } from '../webgl/Program.js';

export function backgroundOSMFrame() {
    return new Program("backgroundOSMFrame", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            earthRadius: "float",
            //projectionMatrix: "mat4",
            viewMatrix: "mat4"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `attribute vec2 corners;
            
            varying vec2 tc;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `precision highp float;
            
            #define MAX 10e10
            #define PI 3.14159265359
            #define rad(x) x * PI / 180.
            #define ZERO vec3(0.0)
           
            #define RED vec4(1.0, 0.0, 0.0, 1.0)
            #define GREEN vec4(0.0, 1.0, 0.0, 1.0)         
            
            uniform vec3 camPos;            
            uniform vec2 iResolution;
            uniform float fov;
            uniform float earthRadius;
            //uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
                         
            varying vec2 tc;
                        
            // compute the view ray in the camera coordinate
            vec3 computeView(vec2 uv){
                float w_h_ratio = iResolution.x / iResolution.y;   
                float h = tan(rad(fov/2.));
                return normalize(vec3(-w_h_ratio * h, -h, -1.) + vec3(uv.x * 2. * h * w_h_ratio, uv.y*2.*h, 0.));
            }

            vec2 computeIntersection(vec3 origin, vec3 ray, float radius){
                float factor = pow(dot(origin, ray), 2.) - (dot(origin, origin) - radius * radius);
                if(factor >= 0.){
                    float t1 = -dot(origin, ray) - sqrt(factor);
                    float t2 = -dot(origin, ray) + sqrt(factor);
                    return vec2(t1, t2);
                }
                return vec2(MAX, -MAX);
            }

            // sphere of size ra centered at point ce
            vec2 sphIntersect( in vec3 ro, in vec3 rd, in vec3 ce, float ra )
            {
                vec3 oc = ro - ce;
                float b = dot( oc, rd );
                float c = dot( oc, oc ) - ra * ra;
                float h = b * b - c;
                if( h < 0.0 ) return vec2(MAX); // no intersection
                h = sqrt( h );
                return vec2( -b-h, -b+h );
            }

            vec2 sphDistances( vec3 ro, vec3 rd, vec4 sph )
            {
                vec3 oc = ro - sph.xyz;
                float b = dot( oc, rd );
                float c = dot( oc, oc ) - sph.w*sph.w;
                float h = b*b - c;
                float d = sqrt( max(0.0,sph.w*sph.w-h)) - sph.w;
                return vec2( d, -b - sqrt(max(h,0.0)) );
            }
            
            float sphDistance( in vec3 ro, in vec3 rd, in vec4 sph )
            {
                vec3 oc = ro - sph.xyz;
                float b = dot( oc, rd );
                float h = dot( oc, oc ) - b*b;
                return sqrt( max(0.0,h)) - sph.w;
            }
            
            vec4 affinity(in vec4 v){
                float iw = 1.0 / v.w;
                return vec4(v.x * iw, v.y * iw, v.z * iw, 1.0);
            }
            
            // vec3 unproject(in vec2 p) {                            
            //     vec4 world1 = affinity(invProjViewMatrix * vec4(p.x, p.y, -1.0, 1.0));
            //     vec4 world2 = affinity(invProjViewMatrix * vec4(p.x, p.y, 0.0, 1.0));        
            //     return normalize(world2 - world1).xyz;
            // }
            
            mat3 transpose(mat3 matrix) {
                vec3 row0 = matrix[0];
                vec3 row1 = matrix[1];
                vec3 row2 = matrix[2];
                mat3 result = mat3(
                    vec3(row0.x, row1.x, row2.x),
                    vec3(row0.y, row1.y, row2.y),
                    vec3(row0.z, row1.z, row2.z)
                );
                return result;
            }
            
            float det(mat2 matrix) {
                return matrix[0].x * matrix[1].y - matrix[0].y * matrix[1].x;
            }
            
            mat3 inverse(mat3 matrix) {
                vec3 row0 = matrix[0];
                vec3 row1 = matrix[1];
                vec3 row2 = matrix[2];
            
                vec3 minors0 = vec3(
                    det(mat2(row1.y, row1.z, row2.y, row2.z)),
                    det(mat2(row1.z, row1.x, row2.z, row2.x)),
                    det(mat2(row1.x, row1.y, row2.x, row2.y))
                );
                vec3 minors1 = vec3(
                    det(mat2(row2.y, row2.z, row0.y, row0.z)),
                    det(mat2(row2.z, row2.x, row0.z, row0.x)),
                    det(mat2(row2.x, row2.y, row0.x, row0.y))
                );
                vec3 minors2 = vec3(
                    det(mat2(row0.y, row0.z, row1.y, row1.z)),
                    det(mat2(row0.z, row0.x, row1.z, row1.x)),
                    det(mat2(row0.x, row0.y, row1.x, row1.y))
                );
            
                mat3 adj = transpose(mat3(minors0, minors1, minors2));
            
                return (1.0 / dot(row0, minors0)) * adj;
            }
            
            void main(void) {
            
                vec3 dir = computeView(tc);
                dir = inverse(mat3(viewMatrix)) * dir;
                
                vec2 ER = sphIntersect(camPos, dir, vec3(0.0), earthRadius);
                
                float bigRadius = earthRadius * 3.0;
                vec3 bigCenter = normalize(camPos) * bigRadius;                
                               
                vec2 BIG = sphIntersect(camPos, dir, bigCenter, bigRadius);                
                
                float Ix = distance(camPos + dir * BIG.y, ZERO);
                
                if(BIG.y > ER.x) {
                    gl_FragColor = RED;
                    return;
                }
                
                float maxI = sqrt(bigRadius * bigRadius + bigRadius * bigRadius) * 0.04;
                                   
                gl_FragColor = vec4(mix(vec3(1.0), vec3(0.0), Ix / maxI), 1.0);
            }`
    });
}