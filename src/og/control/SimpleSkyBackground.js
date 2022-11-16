/**
 * @module og/control/SimpleSkyBackground
 */

"use strict";

import { Control } from "./Control.js";
import { Program } from '../webgl/Program.js';

/**
 * Frame per second(FPS) display control.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class SimpleSkyBackground extends Control {
    constructor(options) {
        super({
            name: "SimpleSkyBackground",
            ...options
        });
    }

    oninit() {
        this.renderer.handler.addProgram(simpleSkyBackgroundShader());
        this.planet.events.on("draw", this._drawBackground, this);
    }

    onactivate() {
        super.onactivate();
        this.planet.events.on("draw", this._drawBackground, this);
    }

    ondeactivate() {
        super.ondeactivate();
        this.planet.events.off("draw", this._drawBackground);
    }

    _drawBackground() {
        let h = this.renderer.handler;
        let sh = h.programs.simpleSkyBackground, p = sh._program, shu = p.uniforms, gl = h.gl;
        let cam = this.renderer.activeCamera;

        gl.disable(gl.DEPTH_TEST);

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.renderer._screenFrameCornersBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform2fv(shu.iResolution, [h.getWidth(), h.getHeight()]);
        gl.uniform1f(shu.fov, cam.getViewAngle());
        gl.uniform1f(shu.earthRadius, this.planet.ellipsoid.getPolarSize() + 1);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam._viewMatrix._m);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }
}

export function simpleSkyBackground(options) {
    return new SimpleSkyBackground(options);
}

function simpleSkyBackgroundShader() {
    return new Program("simpleSkyBackground", {
        uniforms: {
            iResolution: "vec2", fov: "float", camPos: "vec3", earthRadius: "float", //projectionMatrix: "mat4",
            viewMatrix: "mat4"
        }, attributes: {
            corners: "vec3"
        }, vertexShader: `attribute vec2 corners;
            
            varying vec2 tc;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`, fragmentShader: `precision highp float;
            
            #define MAX 10e10
            #define PI 3.14159265359
            #define rad(x) x * PI / 180.
            #define ZERO vec3(0.0)
           
            const vec3 START_COLOR = vec3(1.0);
            const vec3 END_COLOR = vec3(0.0, 153.0/255.0, 221.0/255.0);
           
            #define RED vec4(1.0, 0.0, 0.0, 1.0)
            #define GREEN vec4(0.0, 1.0, 0.0, 1.0)         
            
            uniform vec3 camPos;            
            uniform vec2 iResolution;
            uniform float fov;
            uniform float earthRadius;
            uniform mat4 viewMatrix;
                         
            varying vec2 tc;
                        
            // compute the view ray in the camera coordinate
            vec3 computeView(vec2 uv){
                float w_h_ratio = iResolution.x / iResolution.y;   
                float h = tan(rad(fov/2.));
                return normalize(vec3(-w_h_ratio * h, -h, -1.) + vec3(uv.x * 2. * h * w_h_ratio, uv.y*2.*h, 0.));
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
                vec3 bigCenter = normalize(camPos) * bigRadius * 1.3;                
                               
                vec2 BIG = sphIntersect(camPos, dir, bigCenter, bigRadius);
                
                float Ix = distance(camPos + dir * BIG.y, ZERO);               
                
                float maxI = sqrt(bigRadius * bigRadius + bigRadius * bigRadius);
                                   
                gl_FragColor = vec4(mix(START_COLOR, END_COLOR, Ix / maxI), 1.0);
            }`
    });
}

export { SimpleSkyBackground };
