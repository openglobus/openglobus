/**
 * @module og/control/Atmosphere
 */

"use strict";

import { Control } from "./Control.js";
import { Program } from '../webgl/Program.js';
import * as atmos from "../shaders/atmos.js";
import { Framebuffer } from "../webgl/index.js";


window.camPosOffset = 0.0;//25000;

/**
 * Frame per second(FPS) display control.
 * @class
 * @extends {Control}
 * @param {Object} [options] - Control options.
 */
class Atmosphere extends Control {
    constructor(options) {
        super({
            name: "Atmosphere",
            ...options
        });

        this._transmittanceBuffer = null;
        this._scatteringBuffer = null;
    }

    oninit() {
        this.renderer.handler.addProgram(atmos.transmittance(), true);
        this.renderer.handler.addProgram(atmos.scattering(), true);
        this.renderer.handler.addProgram(atmosphereBackgroundShader(), true);

        this._drawAtmosphereTextures();

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

    _drawAtmosphereTextures() {

        let width = 512,//this.renderer.handler.getWidth(),
            height = 512//this.renderer.handler.getHeight();

        this._transmittanceBuffer = new Framebuffer(this.renderer.handler, {
            width: width,
            height: height,
            useDepth: false,
            filter: "LINEAR",
            type: "FLOAT",
            internalFormat: "RGBA16F"
        });

        this._transmittanceBuffer.init();

        this._scatteringBuffer = new Framebuffer(this.renderer.handler, {
            width: width,
            height: height,
            useDepth: false,
            filter: "LINEAR",
            type: "FLOAT",
            internalFormat: "RGBA16F"
        });

        this._scatteringBuffer.init();

        let positionBuffer = this.renderer.screenFramePositionBuffer;

        let h = this.renderer.handler;
        let gl = h.gl;

        //
        // Draw transmittance texture
        //
        this._transmittanceBuffer.activate();

        let p = h.programs.transmittance;
        let sha = p._program.attributes;
        let shu = p._program.uniforms;
        p.activate();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniform2fv(shu.iResolution, [this._transmittanceBuffer.width, this._transmittanceBuffer.height]);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(sha.a_position, positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer.numItems);

        this._transmittanceBuffer.deactivate();

        //
        // Draw scattering texture
        //
        this._scatteringBuffer.activate();

        p = h.programs.scattering;
        sha = p._program.attributes;
        shu = p._program.uniforms;
        p.activate();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniform2fv(shu.iResolution, [this._scatteringBuffer.width, this._scatteringBuffer.height]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._transmittanceBuffer.textures[0]);
        gl.uniform1i(shu.transmittanceTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(sha.a_position, positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer.numItems);

        this._scatteringBuffer.deactivate();
    }

    _drawBackground() {
        let h = this.renderer.handler;
        let sh = h.programs.atmosphereBackground,
            p = sh._program,
            shu = p.uniforms, gl = h.gl;
        let cam = this.renderer.activeCamera;

        gl.disable(gl.DEPTH_TEST);

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.renderer.screenFramePositionBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._transmittanceBuffer.textures[0]);
        gl.uniform1i(shu.transmittanceTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._scatteringBuffer.textures[0]);
        gl.uniform1i(shu.scatteringTexture, 1);

        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform1f(shu.camPosOffset, window.camPosOffset || 0);
        gl.uniform2fv(shu.iResolution, [h.getWidth(), h.getHeight()]);
        gl.uniform1f(shu.fov, cam.getViewAngle());

        //gl.uniform1f(shu.earthRadius, this.planet.ellipsoid.getPolarSize() + 1);

        let sunPos = this.planet.sunPos;
        gl.uniform3fv(shu.sunPos, [sunPos.x, sunPos.y, sunPos.z]);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam._viewMatrix._m);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }
}

function atmosphereBackgroundShader() {
    return new Program("atmosphereBackground", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            //earthRadius: "float",
            viewMatrix: "mat4",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            sunPos: "vec3",
            camPosOffset: "float"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `#version 300 es
            
            in vec2 corners;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader:
            `#version 300 es
                                   
            precision highp float;
            
            ${atmos.COMMON}
            
            uniform vec3 camPos;     
            uniform vec2 iResolution;
            uniform float fov;
            
            //uniform float earthRadius;
            uniform mat4 viewMatrix;
            
            uniform sampler2D transmittanceTexture;
            uniform sampler2D scatteringTexture;
            
            uniform float camPosOffset;
            
            uniform vec3 sunPos;                                  
                                   
            vec3 transmittanceFromTexture(float height, float angle) {
                float u = (angle + 1.0) * 0.5;
                float v = height / (topRadius - bottomRadius);
                return texture(transmittanceTexture, vec2(u, v)).xyz;
            }
            
            vec3 multipleScatteringContributionFromTexture(float height, float angle) {
                float u = (angle + 1.0) * 0.5;
                float v = height / (topRadius - bottomRadius);
                return texture(scatteringTexture, vec2(u, v)).xyz; 
            }
                                                         
            layout(location = 0) out vec4 diffuseColor;
            layout(location = 1) out vec4 normalColor;
            layout(location = 2) out vec4 positionColor;
            
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            
                mat3 cameraOrientation = mat3(1.0);
                vec3 cameraPosition = camPos - normalize(camPos) * camPosOffset; 
                            
                vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
                float fieldOfView = fov;
                float z = 1.0 / tan(fieldOfView * 0.5 * pi / 180.0);
                vec3 rayDirection = normalize(vec3(uv, -z));
                vec4 rd = transpose(viewMatrix) * vec4(rayDirection, 1.0);
                rayDirection = rd.xyz;               
              
                vec3 lightDirection = normalize(sunPos);
            
                int sampleCount = 32;
                vec3 light = vec3(0.0);
                vec3 transmittanceFromCameraToSpace = vec3(1.0);
                float offset = 0.0;
                float distanceToSpace = 0.0;
                
                //if (intersectSphere(cameraPosition, rayDirection, topRadius, offset, distanceToSpace)) {

                if (intersectEllipsoid(cameraPosition, rayDirection, topRadii, offset, distanceToSpace)) {
                                                    
                    vec3 rayOrigin = cameraPosition;
                    
                    if (offset > 0.0) { // above atmosphere
                        rayOrigin += rayDirection * offset; // intersection of camera ray with atmosphere
                    }
                    
                    float height = length(rayOrigin) - bottomRadius;
                    float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
                    bool cameraBelow = rayAngle < 0.0;
                    
                    transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                    
                    float phaseAngle = dot(lightDirection, rayDirection);
                    float rayleighPhase = rayleighPhase(phaseAngle);
                    float miePhase = miePhase(phaseAngle);
                    
                    float distanceToGround = 0.0;
                    
                    //bool hitGround = intersectSphere(cameraPosition, rayDirection, bottomRadius, distanceToGround) && distanceToGround > 0.0;                                        
                    bool hitGround = intersectEllipsoid(cameraPosition, rayDirection, bottomRadii, distanceToGround) && distanceToGround > 0.0;
                    
                    //distanceToGround = 0.0;
                    
                    float segmentLength = ((hitGround ? distanceToGround : distanceToSpace) - max(offset, 0.0)) / float(sampleCount);
                            
                    float t = segmentLength * 0.5;
                    
                    vec3 transmittanceCamera; 
                    vec3 transmittanceLight; 
            
                    //if(distanceToGround == 0.0)
                    for (int i = 0; i < sampleCount; i++) {
                        vec3 position = rayOrigin + t * rayDirection;
                        float height = length(position) - bottomRadius; 
                        vec3 up = position / length(position);
                        float rayAngle = dot(up, rayDirection);
                        float lightAngle = dot(up, lightDirection);
                        // shadow is ommitted because it can create banding artifacts with low sample counts
                        // float distanceToGround;
                        // float shadow = intersectSphere(position, lightDirection, bottomRadius, distanceToGround) && distanceToGround >= 0.0 ? 0.0 : 1.0;         
                        float shadow = 1.0;
                        vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                        transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
                        transmittanceLight = transmittanceFromTexture(height, lightAngle);
                        vec2 opticalDensity = exp(-height / vec2(rayleighScaleHeight, mieScaleHeight));
                        vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x * rayleighPhase + mieScatteringCoefficient * opticalDensity.y * miePhase);
                        scatteredLight += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y);  
                        light += shadow * transmittanceCamera * scatteredLight * segmentLength;
                        t += segmentLength;
                    }
                    
                    light *= sunIntensity;
            
                    if (hitGround /*&& distanceToGround!=0.0*/) {
                        vec3 hitPoint = cameraPosition + rayDirection * distanceToGround;
                        vec3 up = hitPoint / length(hitPoint);
                        float diffuseAngle = max(dot(up, lightDirection), 0.0);
                        float lightAngle = dot(up, lightDirection);
                        float groundAlbedo = 0.05;
                        light += transmittanceCamera * (groundAlbedo / pi) * multipleScatteringContributionFromTexture(height, lightAngle) * sunIntensity;
                        light += transmittanceCamera * transmittanceLight * (groundAlbedo / pi) * diffuseAngle * sunIntensity;
                    }
                }                     
                // sun disk
                //float distanceToGround;
                //bool hitGround = intersectSphere(cameraPosition, rayDirection, bottomRadius, distanceToGround) && distanceToGround > 0.0;
                //if (!hitGround) {
                //    float angle = dot(rayDirection, lightDirection);
                //    if (angle > cos(sunAngularRadius)) {
                //       light += sunIntensity * transmittanceFromCameraToSpace;
                //    }
                //}
            
                vec3 color = light;
                // tone mapping
                // float exposure = 10.0;
                // color = (1.0 - exp(color * -exposure));
                color *= 8.0;
                //color = aces(color);    
                color = pow(color, vec3(1.0 / 2.2));
                fragColor = vec4(color, 1.0);
            }
                                    
            void main(void) {
                            
                vec4 color;                                                                  
                mainImage(color, gl_FragCoord.xy);
                
                diffuseColor = color;
                
                normalColor = vec4(1.0, 1.0, 0.0, 1.0);
                positionColor = vec4(1.0, 1.0, 0.0, 1.0);
            }`
    });
}

export { Atmosphere };
