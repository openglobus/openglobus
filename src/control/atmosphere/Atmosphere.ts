import {
    DEFAULT_PARAMS,
    type AtmosphereParameters,
    transmittance,
    scattering,
    aerialPerspective,
    AERIAL_PERSPECTIVE_LUT_SIZE
} from "../../shaders/atmos/atmos";
import { Framebuffer } from "../../webgl/Framebuffer";
import { ShaderProgram } from "../../webgl/ShaderProgram";
import { Control, type IControlParams } from "../Control";
import type { PlanetCamera } from "../../camera/PlanetCamera";
import { clamp } from "../../math";

import atmosphere_vert from "./atmosphere.vert.glsl";
import atmosphere_frag from "./atmosphere.frag.glsl";

import { stringTemplate2 } from "../../utils/shared";

// Must match ATMOS_LUT_SIZE in lut_helpers.glsl
const ATMOS_LUT_SIZE = 1024;

// Terrain above this height is still covered by the aerial perspective volume beyond the horizon.
const AERIAL_PERSPECTIVE_MAX_OBJECT_HEIGHT = 20000.0;

export interface IAtmosphereParams extends IControlParams {
    ATMOS_HEIGHT?: number;
    RAYLEIGH_SCALE?: number;
    MIE_SCALE?: number;
    GROUND_ALBEDO?: number;
    BOTTOM_RADIUS?: number;
    EQUATORIAL_RADIUS?: number;
    rayleighScatteringCoefficient_0?: number;
    rayleighScatteringCoefficient_1?: number;
    rayleighScatteringCoefficient_2?: number;
    mieScatteringCoefficient?: number;
    mieExtinctionCoefficient?: number;
    ozoneAbsorptionCoefficient_0?: number;
    ozoneAbsorptionCoefficient_1?: number;
    ozoneAbsorptionCoefficient_2?: number;
    SUN_ANGULAR_RADIUS?: number;
    SUN_INTENSITY?: number;
    ozoneDensityHeight?: number;
    ozoneDensityWide?: number;
    disableSunDisk?: boolean;
    aerialPerspective?: boolean;
    aerialPerspectiveFadeStart?: number;
    aerialPerspectiveFadeEnd?: number;
    aerialPerspectiveStrength?: number;
    aerialPerspectiveAerosol?: number;
    aerialPerspectiveStartFactor?: number;
    aerialPerspectiveSlope?: number;
}

export class Atmosphere extends Control {
    /** Transmittance LUT in the left half, multiple scattering LUT in the right half. */
    public _lutBuffer: Framebuffer | null;
    public opacity: number;

    /**
     * Applies the aerial perspective volume to the surface when the camera is low.
     * @public
     * @type {boolean}
     */
    public aerialPerspective: boolean;

    /**
     * Camera altitude in meters where the aerial perspective starts fading to the space view shading.
     * @public
     * @type {number}
     */
    public aerialPerspectiveFadeStart: number;

    /**
     * Camera altitude in meters where only the space view shading remains.
     * @public
     * @type {number}
     */
    public aerialPerspectiveFadeEnd: number;

    /**
     * Haze start distance as a multiple of the camera altitude: closer to the camera haze grows
     * smoothly from zero, farther it accumulates at the full rate.
     * @public
     * @type {number}
     */
    public aerialPerspectiveStartFactor: number;

    /**
     * Camera slope where the aerial perspective reaches full intensity. Looking straight down
     * (slope 1) there is no haze, between 1 and this value it fades in smoothly.
     * @public
     * @type {number}
     */
    public aerialPerspectiveSlope: number;

    protected _parameters: AtmosphereParameters;

    protected _aerialPerspectiveStrength: number;
    protected _aerialPerspectiveAerosol: number;

    protected _isReady: boolean = false;

    protected _aerialPerspectiveFramebuffer: Framebuffer | null;
    protected _aerialPerspectiveTexture: WebGLTexture | null;
    protected _aerialPerspectiveFrame: Float32Array;
    protected _aerialPerspectiveParams: Float32Array;
    protected _aerialPerspectiveDirty: boolean;
    protected _aerialPerspectiveBuiltRadius: number;
    protected _aerialPerspectiveBuiltSunCosZenith: number;
    protected _aerialPerspectiveStartDistance: number;
    protected _aerialPerspectiveIntensity: number;

    constructor(options: IAtmosphereParams = {}) {
        super({
            name: "Atmosphere",
            ...options
        });

        this._lutBuffer = null;

        this.opacity = 1.0;

        const o = options as unknown as Partial<AtmosphereParameters>;
        this._parameters = JSON.parse(
            JSON.stringify({
                ...DEFAULT_PARAMS,
                ...o
            })
        );

        this.aerialPerspective = options.aerialPerspective ?? true;
        this.aerialPerspectiveFadeStart = options.aerialPerspectiveFadeStart ?? this._parameters.ATMOS_HEIGHT * 0.2;
        this.aerialPerspectiveFadeEnd = options.aerialPerspectiveFadeEnd ?? this._parameters.ATMOS_HEIGHT;
        this._aerialPerspectiveStrength = options.aerialPerspectiveStrength ?? 3.0;
        this._aerialPerspectiveAerosol = options.aerialPerspectiveAerosol ?? 1.0;
        this.aerialPerspectiveStartFactor = options.aerialPerspectiveStartFactor ?? 2.0;
        this.aerialPerspectiveSlope = options.aerialPerspectiveSlope ?? 0.4;

        this._aerialPerspectiveFramebuffer = null;
        this._aerialPerspectiveTexture = null;
        this._aerialPerspectiveFrame = new Float32Array(9);
        this._aerialPerspectiveParams = new Float32Array(4);
        this._aerialPerspectiveDirty = true;
        this._aerialPerspectiveBuiltRadius = 0.0;
        this._aerialPerspectiveBuiltSunCosZenith = 0.0;
        this._aerialPerspectiveStartDistance = 0.0;
        this._aerialPerspectiveIntensity = 1.0;
    }

    /**
     * Air density multiplier (Rayleigh and aerosols) of the whole atmosphere: the distant haze gets thicker
     * and the sky changes with it, so they meet at the horizon without an edge. Ozone is not scaled.
     * Changing it rebuilds the lookup textures and the atmosphere shaders.
     * @public
     * @type {number}
     */
    public get aerialPerspectiveStrength(): number {
        return this._aerialPerspectiveStrength;
    }

    public set aerialPerspectiveStrength(strength: number) {
        if (strength !== this._aerialPerspectiveStrength) {
            this._aerialPerspectiveStrength = strength;
            this._applyParameters();
        }
    }

    /**
     * Additional aerosol (Mie) density multiplier on top of the strength, for the sky and the haze alike.
     * Aerosols give whitish haze, Rayleigh scattering alone tints far haze blue or purple at sunset.
     * Changing it rebuilds the lookup textures and the atmosphere shaders.
     * @public
     * @type {number}
     */
    public get aerialPerspectiveAerosol(): number {
        return this._aerialPerspectiveAerosol;
    }

    public set aerialPerspectiveAerosol(aerosol: number) {
        if (aerosol !== this._aerialPerspectiveAerosol) {
            this._aerialPerspectiveAerosol = aerosol;
            this._applyParameters();
        }
    }

    public setParameters(parameters: AtmosphereParameters) {
        this._parameters = JSON.parse(JSON.stringify(parameters));
        this._applyParameters();
    }

    protected _applyParameters() {
        if (!this.renderer) return;

        this._isReady = false;

        this.removeAerialPerspectiveShader();
        this.initLookupTexturesShaders();
        this.drawLookupTextures();
        this.removeLookupTexturesShaders();

        // Atmosphere constants are compiled into the sky shader
        this.removeBackgroundShader();
        this.initBackgroundShader();

        this.initPlanetAtmosphereShader();

        this.renderer.requestRedraw();
    }

    public get isReady(): boolean {
        return this._isReady;
    }

    /**
     * Base atmosphere parameters, without the aerial perspective strength and aerosol multipliers.
     * @public
     * @type {AtmosphereParameters}
     */
    public get parameters(): AtmosphereParameters {
        return JSON.parse(JSON.stringify(this._parameters));
    }

    /**
     * Parameters the shaders use: the base ones with the air density multiplied by the strength and aerosol.
     * @public
     * @type {AtmosphereParameters}
     */
    public get effectiveParameters(): AtmosphereParameters {
        let p = JSON.parse(JSON.stringify(this._parameters)) as AtmosphereParameters,
            s = this._aerialPerspectiveStrength,
            m = s * this._aerialPerspectiveAerosol;

        p.rayleighScatteringCoefficient_0 *= s;
        p.rayleighScatteringCoefficient_1 *= s;
        p.rayleighScatteringCoefficient_2 *= s;
        p.mieScatteringCoefficient *= m;
        p.mieExtinctionCoefficient *= m;

        return p;
    }

    public initPlanetAtmosphereShader() {
        this.planet?.initAtmosphereShader(this.effectiveParameters);
    }

    public override oninit() {
        if (this.renderer) {
            //
            // Draw atmosphere lookup textures
            //
            this._initLookupTextures();

            this.initLookupTexturesShaders();
            this.drawLookupTextures();
            this.removeLookupTexturesShaders();

            this.initBackgroundShader();

            this.activate();
        }
    }

    public initLookupTexturesShaders() {
        if (this.renderer) {
            let h = this.renderer.handler;
            let p = this.effectiveParameters;
            h.addProgram(transmittance(p));
            h.addProgram(scattering(p));
            h.addProgram(aerialPerspective(p));
        }
    }

    public initBackgroundShader() {
        if (this.renderer) {
            this.renderer.handler.addProgram(atmosphereBackgroundShader(this.effectiveParameters));
        }
    }

    public removeBackgroundShader() {
        if (this.renderer) {
            this.renderer.handler.removeProgram("atmosphereBackground");
        }
    }

    // Aerial perspective volume is redrawn every frame, so its program outlives the other LUT programs.
    public removeAerialPerspectiveShader() {
        if (this.renderer) {
            this.renderer.handler.removeProgram("aerialPerspective");
        }
    }

    public removeLookupTexturesShaders() {
        if (this.renderer) {
            let h = this.renderer.handler;

            if (this._lutBuffer?.isComplete()) {
                h.removeProgram("scattering");
                h.removeProgram("transmittance");
            }
        }
    }

    public override onactivate() {
        super.onactivate();
        this.planet && this.planet.events.on("draw", this._drawBackground, this);
    }

    public override ondeactivate() {
        super.ondeactivate();
        this.planet && this.planet.events.off("draw", this._drawBackground);
    }

    protected _initLookupTextures() {
        this._lutBuffer = new Framebuffer(this.renderer!.handler, {
            width: ATMOS_LUT_SIZE * 2,
            height: ATMOS_LUT_SIZE,
            useDepth: false,
            targets: [
                {
                    filter: "LINEAR",
                    internalFormat: "RGBA16F"
                }
            ]
        });

        this._lutBuffer.init();

        this._initAerialPerspective();
    }

    protected _initAerialPerspective() {
        let h = this.renderer!.handler,
            gl = h.gl!,
            s = AERIAL_PERSPECTIVE_LUT_SIZE;

        // In-scattering in the left half, transmittance in the right half of every slice.
        this._aerialPerspectiveTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, this._aerialPerspectiveTexture);
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA16F, s.width * 2, s.height, s.depth);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_3D, null);

        this._aerialPerspectiveFramebuffer = new Framebuffer(h, {
            width: s.width * 2,
            height: s.height,
            useDepth: false,
            targets: [
                {
                    filter: "NEAREST",
                    internalFormat: "RGBA16F"
                }
            ]
        });

        this._aerialPerspectiveFramebuffer.init();
    }

    protected _renderLookupTextures() {
        if (!this.renderer || !this._lutBuffer) return;

        let positionBuffer = this.renderer.screenFramePositionBuffer!;

        let h = this.renderer.handler;
        let gl = h.gl!;

        // The scattering pass samples transmittance, so it reads from a separate buffer.
        let transmittanceBuffer = new Framebuffer(h, {
            width: ATMOS_LUT_SIZE,
            height: ATMOS_LUT_SIZE,
            useDepth: false,
            targets: [
                {
                    filter: "LINEAR",
                    internalFormat: "RGBA16F"
                }
            ]
        });

        transmittanceBuffer.init();

        let tp = h.programs.transmittance;

        const drawTransmittance = () => {
            tp.activate();
            gl.uniform2fv(tp.uniforms.iResolution, [ATMOS_LUT_SIZE, ATMOS_LUT_SIZE]);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(tp.attributes.a_position, positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer.numItems);
        };

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        transmittanceBuffer.activate();
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawTransmittance();
        transmittanceBuffer.deactivate();

        this._lutBuffer.activate();
        gl.clear(gl.COLOR_BUFFER_BIT);

        //
        // Transmittance, left half
        //
        gl.viewport(0, 0, ATMOS_LUT_SIZE, ATMOS_LUT_SIZE);
        drawTransmittance();

        //
        // Multiple scattering, right half
        //
        gl.viewport(ATMOS_LUT_SIZE, 0, ATMOS_LUT_SIZE, ATMOS_LUT_SIZE);

        let sp = h.programs.scattering;
        sp.activate();

        gl.uniform2fv(sp.uniforms.iResolution, [ATMOS_LUT_SIZE, ATMOS_LUT_SIZE]);
        gl.uniform2fv(sp.uniforms.fragCoordOffset, [ATMOS_LUT_SIZE, 0]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, transmittanceBuffer.textures[0]);
        gl.uniform1i(sp.uniforms.transmittanceTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(sp.attributes.a_position, positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer.numItems);

        this._lutBuffer.deactivate();

        transmittanceBuffer.destroy();

        this._aerialPerspectiveDirty = true;
        this._isReady = true;
    }

    /**
     * Updates the aerial perspective volume: in-scattering and transmittance from the camera
     * along view directions given relative to the local up and the sun, slices spread quadratically
     * from the atmosphere entry to the farthest visible terrain. The volume depends only on the camera
     * altitude and the sun angle, so it is rebuilt only when they change noticeably.
     */
    protected _drawAerialPerspective(cam: PlanetCamera) {
        let p = this._parameters,
            apParams = this._aerialPerspectiveParams;

        let scale = p.BOTTOM_RADIUS / p.EQUATORIAL_RADIUS,
            eye = cam.eye,
            ex = eye.x * scale,
            ey = eye.y * scale,
            ez = eye.z,
            c = Math.sqrt(ex * ex + ey * ey + ez * ez),
            altitude = c - p.BOTTOM_RADIUS;

        let weight = 0.0;
        if (this.aerialPerspective && !cam.isOrthographic) {
            let range = Math.max(this.aerialPerspectiveFadeEnd - this.aerialPerspectiveFadeStart, 1.0);
            let t = clamp((altitude - this.aerialPerspectiveFadeStart) / range, 0.0, 1.0);
            weight = 1.0 - t * t * (3.0 - 2.0 * t);
        }

        apParams[2] = weight;

        if (weight === 0.0) return;

        this._aerialPerspectiveStartDistance = Math.max(altitude, 0.0) * this.aerialPerspectiveStartFactor;

        let s = clamp((1.0 - cam.slope) / Math.max(1.0 - this.aerialPerspectiveSlope, 1e-6), 0.0, 1.0);
        this._aerialPerspectiveIntensity = s * s * (3.0 - 2.0 * s);

        // Looking straight down the volume is not sampled, it is rebuilt when the camera tilts
        if (this._aerialPerspectiveIntensity < 1e-3) {
            this._aerialPerspectiveIntensity = 0.0;
            return;
        }

        //
        // Camera local frame in the scaled space: towards the sun, up, side
        //
        let ux = ex / c,
            uy = ey / c,
            uz = ez / c;

        let sunPos = this.planet!.sunPos,
            sx = sunPos.x * scale,
            sy = sunPos.y * scale,
            sz = sunPos.z,
            sl = Math.sqrt(sx * sx + sy * sy + sz * sz);

        sx /= sl;
        sy /= sl;
        sz /= sl;

        let sunCosZenith = ux * sx + uy * sy + uz * sz;

        let tx = sx - ux * sunCosZenith,
            ty = sy - uy * sunCosZenith,
            tz = sz - uz * sunCosZenith,
            tl = Math.sqrt(tx * tx + ty * ty + tz * tz);

        if (tl < 1e-6) {
            // The sun is at the zenith, any horizontal direction will do
            let ax = Math.abs(ux) < 0.9 ? 1.0 : 0.0,
                ay = 1.0 - ax,
                d = ax * ux + ay * uy;
            tx = ax - ux * d;
            ty = ay - uy * d;
            tz = -uz * d;
            tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
        }

        tx /= tl;
        ty /= tl;
        tz /= tl;

        let f = this._aerialPerspectiveFrame;
        f[0] = tx;
        f[1] = ty;
        f[2] = tz;
        f[3] = ux;
        f[4] = uy;
        f[5] = uz;
        f[6] = uy * tz - uz * ty;
        f[7] = uz * tx - ux * tz;
        f[8] = ux * ty - uy * tx;

        let r = Math.max(c, p.BOTTOM_RADIUS + 1.0);

        if (
            !this._aerialPerspectiveDirty &&
            Math.abs(r - this._aerialPerspectiveBuiltRadius) <= Math.max(1.0, altitude * 0.01) &&
            Math.abs(sunCosZenith - this._aerialPerspectiveBuiltSunCosZenith) <= 1e-3
        ) {
            return;
        }

        this._aerialPerspectiveDirty = false;
        this._aerialPerspectiveBuiltRadius = r;
        this._aerialPerspectiveBuiltSunCosZenith = sunCosZenith;

        let rb = p.BOTTOM_RADIUS,
            rObj = rb + AERIAL_PERSPECTIVE_MAX_OBJECT_HEIGHT,
            near = Math.max(r - rb - p.ATMOS_HEIGHT, 0.0),
            far = Math.sqrt(Math.max(r * r - rb * rb, 0.0)) + Math.sqrt(rObj * rObj - rb * rb),
            depthRange = Math.max(far - near, 1.0);

        apParams[0] = near;
        apParams[1] = 1.0 / depthRange;
        apParams[3] = r;

        let rn = this.renderer!,
            h = rn.handler,
            gl = h.gl!,
            sh = h.programs.aerialPerspective,
            shu = sh.uniforms,
            fb = this._aerialPerspectiveFramebuffer!;

        fb.activate();

        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);

        sh.activate();

        gl.bindBuffer(gl.ARRAY_BUFFER, rn.screenFramePositionBuffer!);
        gl.vertexAttribPointer(sh.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._lutBuffer!.textures[0]);
        gl.uniform1i(shu.atmosLutTexture, 0);

        gl.uniform2f(shu.cameraParams, r, sunCosZenith);
        gl.uniform2f(shu.depthParams, near, depthRange);
        // The strength and aerosol are already in the atmosphere parameters, shared with the sky
        gl.uniform2f(shu.densityScale, 1.0, 1.0);

        for (let i = 0; i < AERIAL_PERSPECTIVE_LUT_SIZE.depth; i++) {
            fb.bindOutputTextureLayer(this._aerialPerspectiveTexture, i);
            gl.uniform1f(shu.slice, i);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        fb.deactivate();
    }

    /**
     * Binds the atmosphere LUT and aerial perspective uniforms to a program
     * that includes atmos/aerialPerspective.glsl.
     * @public
     * @param {ShaderProgram} p - Active program.
     * @param {number} lutTextureUnit - Texture unit for the transmittance/scattering LUT.
     * @param {number} aerialPerspectiveTextureUnit - Texture unit for the aerial perspective volume.
     */
    public bindForward(p: ShaderProgram, lutTextureUnit: number, aerialPerspectiveTextureUnit: number) {
        let gl = this.renderer!.handler.gl!,
            u = p.uniforms;

        gl.activeTexture(gl.TEXTURE0 + lutTextureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this._lutBuffer!.textures[0]);
        gl.uniform1i(u.atmosLutTexture, lutTextureUnit);

        gl.activeTexture(gl.TEXTURE0 + aerialPerspectiveTextureUnit);
        gl.bindTexture(gl.TEXTURE_3D, this._aerialPerspectiveTexture);
        gl.uniform1i(u.aerialPerspectiveTexture, aerialPerspectiveTextureUnit);

        gl.uniformMatrix3fv(u.aerialPerspectiveFrame, false, this._aerialPerspectiveFrame);
        gl.uniform4fv(u.aerialPerspectiveParams, this._aerialPerspectiveParams);
        gl.uniform1f(u.aerialPerspectiveStartDistance, this._aerialPerspectiveStartDistance);
        gl.uniform1f(u.aerialPerspectiveIntensity, this._aerialPerspectiveIntensity);
    }

    public drawLookupTextures() {
        this._renderLookupTextures();
    }

    protected _drawBackground() {
        if (!this._isReady) return;

        let h = this.renderer!.handler;
        let sh = h.programs.atmosphereBackground,
            p = sh,
            shu = p.uniforms,
            gl = h.gl!;
        let r = this.renderer!;
        let cam = this.planet!.camera;

        // Surface passes of this frame sample the volume, they run after the planet draw event.
        this._drawAerialPerspective(cam);

        gl.disable(gl.DEPTH_TEST);

        r.enableBlendOneSrcAlpha();
        //r.enableBlendDefault();

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._lutBuffer!.textures[0]);
        gl.uniform1i(shu.atmosLutTexture, 0);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());

        let sunPos = this.planet!.sunPos;
        gl.uniform3fv(shu.sunPos, [sunPos.x, sunPos.y, sunPos.z]);
        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform2fv(shu.iResolution, [r.viewportWidth, r.viewportHeight]);
        gl.uniform1f(shu.fov, cam.getViewAngle());
        gl.uniform1f(shu.opacity, this.opacity * r.frameOpacity);

        let f = cam.frustum;
        gl.uniform1f(shu.isOrthographic, cam.isOrthographic ? 1.0 : 0.0);
        gl.uniform4fv(shu.frustumParams, [f.right - f.left, f.top - f.bottom, f.right, f.top]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);

        r.enableBlendDefault();
    }
}

function atmosphereBackgroundShader(atmosParams?: AtmosphereParameters): ShaderProgram {
    return new ShaderProgram("atmosphereBackground", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            viewMatrix: "mat4",
            atmosLutTexture: "sampler2D",
            sunPos: "vec3",
            opacity: "float",
            isOrthographic: "float",
            frustumParams: "vec4"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader: atmosphere_vert,
        fragmentShader: stringTemplate2(atmosphere_frag, {
            ...atmosParams,
            disableSunDisk: atmosParams?.disableSunDisk ? 1 : 0
        })
    });
}
