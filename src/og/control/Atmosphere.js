/**
 * @module og/control/Atmosphere
 */

"use strict";

import * as atmos from "../shaders/atmos.js";
import { Control } from "./Control.js";
import { Program } from '../webgl/Program.js';
import { Framebuffer } from "../webgl/index.js";

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

        this.opacity = 1.0;
    }

    oninit() {
        this.renderer.handler.addProgram(atmos.transmittance(), true);
        this.renderer.handler.addProgram(atmos.scattering(), true);
        this.renderer.handler.addProgram(atmosphereBackgroundShader(), true);

        this._drawAtmosphereTextures();

        this.activate();
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

        let width = 256,
            height = 128;

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

        //
        // remove shaders
        if (this._scatteringBuffer.isComplete()) {
            h.removeProgram("scattering");
        }

        if (this._transmittanceBuffer.isComplete()) {
            h.removeProgram("transmittance");
        }
    }

    _drawBackground() {
        let h = this.renderer.handler;
        let sh = h.programs.atmosphereBackground,
            p = sh._program,
            shu = p.uniforms, gl = h.gl;
        let cam = this.renderer.activeCamera;

        gl.disable(gl.DEPTH_TEST);

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.renderer.screenFramePositionBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._transmittanceBuffer.textures[0]);
        gl.uniform1i(shu.transmittanceTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._scatteringBuffer.textures[0]);
        gl.uniform1i(shu.scatteringTexture, 1);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());

        let sunPos = this.planet.sunPos;
        gl.uniform3fv(shu.sunPos, [sunPos.x, sunPos.y, sunPos.z]);
        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform2fv(shu.iResolution, [this.renderer.sceneFramebuffer.width, this.renderer.sceneFramebuffer.height]);
        gl.uniform1f(shu.fov, cam.getViewAngle());
        gl.uniform1f(shu.opacity, this.opacity);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    }
}

function atmosphereBackgroundShader() {
    return new Program("atmosphereBackground", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            viewMatrix: "mat4",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            sunPos: "vec3",
            opacity: "float"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader:
            `            
            attribute vec2 corners;
            
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
            }`,
        fragmentShader:
            `                                   
            precision highp float;
            
            ${atmos.COMMON}
            
            uniform mat4 viewMatrix;
            uniform vec3 sunPos;
            uniform vec3 camPos;     
            uniform vec2 iResolution;
            uniform float fov;
            uniform float opacity;
                       
            uniform sampler2D transmittanceTexture;
            uniform sampler2D scatteringTexture;
                                                           
            vec3 transmittanceFromTexture(float height, float angle) 
            {
                float u = (angle + 1.0) * 0.5;
                float v = height / ATMOS_HEIGHT;
                return texture2D(transmittanceTexture, vec2(u, v)).xyz;
            }
            
            vec3 multipleScatteringContributionFromTexture(float height, float angle) 
            {
                float u = (angle + 1.0) * 0.5;
                float v = height / ATMOS_HEIGHT;
                return texture2D(scatteringTexture, vec2(u, v)).xyz; 
            }

            bool intersectEllipsoidToSphere(in vec3 ro, in vec3 rd, in vec3 ellRadii, in float sphereRadius, out float t1, out float t2) 
            {
                float offset = 0.0,
                      distanceToSpace = 0.0;
                                                        
                if(intersectEllipsoid(ro, rd, ellRadii, offset, distanceToSpace)){
                    vec3 hitEll = ro + rd * offset;
                    vec3 nEll = normalEllipsoid(hitEll, ellRadii);
                    float t = 0.0;
                    bool intersectsSphere = intersectSphere(hitEll, nEll, sphereRadius, t);
                    vec3 hitSphere = hitEll + nEll * t;
                    t1 = length(hitSphere - ro);
                    
                    hitEll = ro + rd * distanceToSpace;
                    nEll = normalEllipsoid(hitEll, ellRadii);
                    t = 0.0;
                    intersectsSphere = intersectSphere(hitEll, nEll, sphereRadius, t);
                    hitSphere = hitEll + nEll * t;
                    t2 = length(hitSphere - ro);
                    
                    return true; 
                }
                return false; 
            }
            
            mat4 transpose(in mat4 m) 
            {
                vec4 i0 = m[0];
                vec4 i1 = m[1];
                vec4 i2 = m[2];
                vec4 i3 = m[3];
            
                mat4 outMatrix = mat4(
                     vec4(i0.x, i1.x, i2.x, i3.x),
                     vec4(i0.y, i1.y, i2.y, i3.y),
                     vec4(i0.z, i1.z, i2.z, i3.z),
                     vec4(i0.w, i1.w, i2.w, i3.w)
                     );
                                 
                return outMatrix;
            }
                                                                     
            void mainImage(out vec4 fragColor) 
            {            
                vec3 cameraPosition = camPos;
                
                vec3 lightDirection = normalize(sunPos);               
                             
                vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
                float fieldOfView = fov;
                float z = 1.0 / tan(fieldOfView * 0.5 * PI / 180.0);
                vec3 rayDirection = normalize(vec3(uv, -z));
                vec4 rd = transpose(viewMatrix) * vec4(rayDirection, 1.0);
                rayDirection = rd.xyz;               
                                          
                vec3 light = vec3(0.0);
                vec3 transmittanceFromCameraToSpace = vec3(1.0);
                float offset = 0.0;
                float distanceToSpace = 0.0;
                                                
                rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
                cameraPosition *= SPHERE_TO_ELLIPSOID_SCALE;
                lightDirection = normalize(lightDirection * SPHERE_TO_ELLIPSOID_SCALE);
                                                
                if (intersectSphere(cameraPosition, rayDirection, TOP_RADIUS, offset, distanceToSpace)) 
                {    
                    vec3 rayOrigin = cameraPosition;
                    
                    // above atmosphere                    
                    if (offset > 0.0) {
                        // intersection of camera ray with atmosphere
                        rayOrigin = cameraPosition + rayDirection * offset;
                    }
                    
                    float height = length(rayOrigin) - BOTTOM_RADIUS;
                    float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
                    bool cameraBelow = rayAngle < 0.0;
                    
                    transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                    
                    float phaseAngle = dot(lightDirection, rayDirection);
                    float rayleighPhase = rayleighPhase(phaseAngle);
                    float miePhase = miePhase(phaseAngle);
                    
                    float distanceToGround = 0.0;
                    
                    bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
                    
                    if(intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS - 15000.0, distanceToGround) && hitGround){
                        discard;
                    }
                    
                    float segmentLength = ((hitGround ? distanceToGround : distanceToSpace) - max(offset, 0.0)) / float(SAMPLE_COUNT);
                            
                    float t = segmentLength * 0.5;
                    
                    vec3 transmittanceCamera; 
                    vec3 transmittanceLight; 
            
                    for (int i = 0; i < SAMPLE_COUNT; i++) 
                    {
                        vec3 position = rayOrigin + t * rayDirection;
                        float height = length(position) - BOTTOM_RADIUS; 
                        vec3 up = position / length(position);
                        float rayAngle = dot(up, rayDirection);
                        float lightAngle = dot(up, lightDirection);
                        // shadow is ommitted because it can create banding artifacts with low sample counts
                        // float distanceToGround;
                        // float shadow = intersectSphere(position, lightDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround >= 0.0 ? 0.0 : 1.0;         
                        float shadow = 1.0;
                        vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
                        transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
                        transmittanceLight = transmittanceFromTexture(height, lightAngle);
                        vec2 opticalDensity = exp(-height / rayleighMieHeights);
                        vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x * rayleighPhase + mieScatteringCoefficient * opticalDensity.y * miePhase);
                        scatteredLight += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y);  
                        light += shadow * transmittanceCamera * scatteredLight * segmentLength;
                        t += segmentLength;
                    }
                    
                    light *= SUN_INTENSITY;
            
                    if (hitGround) 
                    {
                        vec3 hitPoint = cameraPosition + rayDirection * distanceToGround;
                        vec3 up = hitPoint / length(hitPoint);
                        float diffuseAngle = max(dot(up, lightDirection), 0.0);
                        float lightAngle = dot(up, lightDirection);
                        light += transmittanceCamera * GROUND_ALBEDO * multipleScatteringContributionFromTexture(height, lightAngle) * SUN_INTENSITY;
                        light += transmittanceCamera * transmittanceLight * GROUND_ALBEDO * diffuseAngle * SUN_INTENSITY;
                    }
                }
                                     
                // sun disk
                // float distanceToGround;
                // bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
                // if (!hitGround) {
                //    float angle = dot(rayDirection, lightDirection);
                //    if (angle > cos(SUN_ANGULAR_RADIUS)) {
                //       light = SUN_INTENSITY * transmittanceFromCameraToSpace;
                //    }
                // }
                
                float distanceToGround = 0.0;
                bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
                if(!hitGround)
                {
                    vec3 sunLum = sunWithBloom(rayDirection, lightDirection) * vec3(1.0,1.0,0.8);
                    // limit the bloom effect
                    sunLum = smoothstep(0.002, 1.0, sunLum);
                    light += sunLum * SUN_INTENSITY * transmittanceFromCameraToSpace;
                }
                            
                fragColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), clamp(opacity, 0.0, 1.0));           
            }
                                    
            void main(void) 
            {                            
                mainImage(gl_FragColor);            
            }`
    });
}

export { Atmosphere };
