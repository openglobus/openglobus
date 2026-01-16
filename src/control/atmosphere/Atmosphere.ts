import {type AtmosphereParameters, transmittance, scattering, getAtmospherePresetByEllipsoid} from "../../shaders/atmos/atmos";
import {Framebuffer} from "../../webgl/Framebuffer";
import {Program} from '../../webgl/Program';
import {Control, type IControlParams} from "../Control";

import atmosphere_vert from './atmosphere.vert.glsl';
import atmosphere_frag from './atmosphere.frag.glsl';

import {stringTemplate2} from "../../utils/shared";

export interface IAtmosphereParams extends IControlParams {
    height?: number,
    rayleighScale?: number,
    mieScale?: number,
    groundAlbedo?: number,
    bottomRadius?: number,
    equatorialRadius?: number,
    rayleighScatteringCoefficient_0?: number,
    rayleighScatteringCoefficient_1?: number,
    rayleighScatteringCoefficient_2?: number,
    mieScatteringCoefficient?: number,
    mieExtinctionCoefficient?: number,
    ozoneAbsorptionCoefficient_0?: number,
    ozoneAbsorptionCoefficient_1?: number,
    ozoneAbsorptionCoefficient_2?: number,
    sunAngularRadius?: number,
    sunIntensity?: number,
    ozoneDensityHeight?: number,
    ozoneDensityWide?: number,
    disableSunDisk?: boolean
}

export class Atmosphere extends Control {
    public _transmittanceBuffer: Framebuffer | null;
    public _scatteringBuffer: Framebuffer | null;
    public opacity: number;

    protected _parameters: AtmosphereParameters;
    protected _overrideBottomRadius: boolean;
    protected _overrideEquatorialRadius: boolean;
    protected _overrideOpticalParams: boolean;
    protected _options: IAtmosphereParams;

    constructor(options: IAtmosphereParams = {}) {
        super({
            name: "Atmosphere",
            ...options
        });

        this._transmittanceBuffer = null;
        this._scatteringBuffer = null;

        this.opacity = 1.0;

        this._options = options;
        this._overrideBottomRadius = "bottomRadius" in options;
        this._overrideEquatorialRadius = "equatorialRadius" in options;
        this._overrideOpticalParams = ("height" in options) ||
            ("rayleighScale" in options) ||
            ("mieScale" in options) ||
            ("groundAlbedo" in options) ||
            ("rayleighScatteringCoefficient_0" in options) ||
            ("rayleighScatteringCoefficient_1" in options) ||
            ("rayleighScatteringCoefficient_2" in options) ||
            ("mieScatteringCoefficient" in options) ||
            ("mieExtinctionCoefficient" in options) ||
            ("ozoneAbsorptionCoefficient_0" in options) ||
            ("ozoneAbsorptionCoefficient_1" in options) ||
            ("ozoneAbsorptionCoefficient_2" in options) ||
            ("ozoneDensityHeight" in options) ||
            ("ozoneDensityWide" in options) ||
            ("sunAngularRadius" in options) ||
            ("sunIntensity" in options);

        // temporary defaults; real preset is selected once we know the planet ellipsoid (see oninit)
        this._parameters = getAtmospherePresetByEllipsoid();
        this._parameters.disableSunDisk = options.disableSunDisk;
    }

    protected _syncPlanetRadiiAndPreset() {
        if (!this.planet) return;

        const ell = this.planet.ellipsoid;
        // NOTE: Atmosphere shaders use both polar and equatorial radii; the equatorial radius must NOT be hardcoded
        // to Earth, otherwise Mars (and other bodies) get incorrect atmosphere geometry.

        // base preset from shaders/atmos/atmos.ts
        this._parameters = getAtmospherePresetByEllipsoid(ell);

        if (!this._overrideBottomRadius) {
            this._parameters.BOTTOM_RADIUS = ell.getPolarSize();
        } else {
            this._parameters.BOTTOM_RADIUS = this._options.bottomRadius!;
        }
        if (!this._overrideEquatorialRadius) {
            this._parameters.EQUATORIAL_RADIUS = ell.getEquatorialSize();
        } else {
            this._parameters.EQUATORIAL_RADIUS = this._options.equatorialRadius!;
        }

        if (this._overrideOpticalParams) {
            const o = this._options as any;
            const p = this._parameters as any;
            const map: [keyof IAtmosphereParams, keyof AtmosphereParameters][] = [
                ["height", "ATMOS_HEIGHT"],
                ["rayleighScale", "RAYLEIGH_SCALE"],
                ["mieScale", "MIE_SCALE"],
                ["groundAlbedo", "GROUND_ALBEDO"],
                ["rayleighScatteringCoefficient_0", "rayleighScatteringCoefficient_0"],
                ["rayleighScatteringCoefficient_1", "rayleighScatteringCoefficient_1"],
                ["rayleighScatteringCoefficient_2", "rayleighScatteringCoefficient_2"],
                ["mieScatteringCoefficient", "mieScatteringCoefficient"],
                ["mieExtinctionCoefficient", "mieExtinctionCoefficient"],
                ["ozoneAbsorptionCoefficient_0", "ozoneAbsorptionCoefficient_0"],
                ["ozoneAbsorptionCoefficient_1", "ozoneAbsorptionCoefficient_1"],
                ["ozoneAbsorptionCoefficient_2", "ozoneAbsorptionCoefficient_2"],
                ["sunAngularRadius", "SUN_ANGULAR_RADIUS"],
                ["sunIntensity", "SUN_INTENSITY"],
                ["ozoneDensityHeight", "ozoneDensityHeight"],
                ["ozoneDensityWide", "ozoneDensityWide"]
            ];
            for (const [ok, pk] of map) {
                if (ok in this._options) p[pk] = o[ok];
            }
        }

        if ("disableSunDisk" in this._options) {
            this._parameters.disableSunDisk = this._options.disableSunDisk;
        }
    }

    public setParameters(parameters: AtmosphereParameters) {

        this._parameters = JSON.parse(JSON.stringify(parameters));

        this.initLookupTexturesShaders();
        this.drawLookupTextures();
        this.removeLookupTexturesShaders();

        this.initPlanetAtmosphereShader();
    }

    public get parameters(): AtmosphereParameters {
        return JSON.parse(JSON.stringify(this._parameters));
    }

    public initPlanetAtmosphereShader() {
        this.planet?.initAtmosphereShader(this._parameters);
    }

    public override oninit() {
        if (this.renderer) {

            //
            // Draw atmosphere lookup textures
            //
            this._initLookupTextures();
            this._syncPlanetRadiiAndPreset();

            this.initLookupTexturesShaders();
            this.drawLookupTextures();
            this.removeLookupTexturesShaders();

            this.initBackgroundShader();

            this.activate();
        }
    }

    public initLookupTexturesShaders() {
        if (this.renderer) {
            this.renderer.handler.addProgram(transmittance(this._parameters));
            this.renderer.handler.addProgram(scattering(this._parameters));
        }
    }

    public initBackgroundShader() {
        if (this.renderer) {
            this.renderer.handler.addProgram(atmosphereBackgroundShader(this._parameters));
        }
    }

    public removeBackgroundShader() {
        if (this.renderer) {
            this.renderer.handler.removeProgram("atmosphereBackground");
        }
    }

    public removeLookupTexturesShaders() {
        if (this.renderer) {
            let h = this.renderer.handler;

            if (this._scatteringBuffer?.isComplete()) {
                h.removeProgram("scattering");
            }

            if (this._transmittanceBuffer?.isComplete()) {
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

        let width = 1024,
            height = 1024;

        this._transmittanceBuffer = new Framebuffer(this.renderer!.handler, {
            width: width,
            height: height,
            useDepth: false,
            targets: [{
                filter: "LINEAR",
                type: "FLOAT",
                internalFormat: "RGBA16F"
            }]
        });

        this._transmittanceBuffer.init();

        this._scatteringBuffer = new Framebuffer(this.renderer!.handler, {
            width: width,
            height: height,
            useDepth: false,
            targets: [{
                filter: "LINEAR",
                type: "FLOAT",
                internalFormat: "RGBA16F"
            }]
        });

        this._scatteringBuffer.init();
    }

    protected _renderLookupTextures() {
        if (!this.renderer) return;

        let positionBuffer = this.renderer.screenFramePositionBuffer;

        let h = this.renderer.handler;
        let gl = h.gl!;

        //
        // Draw transmittance texture
        //
        if (this._transmittanceBuffer) {
            this._transmittanceBuffer.activate();

            let p = h.programs.transmittance;
            let sha = p._program.attributes;
            let shu = p._program.uniforms;
            p.activate();

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.uniform2fv(shu.iResolution, [this._transmittanceBuffer.width, this._transmittanceBuffer.height]);

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer!);
            gl.vertexAttribPointer(sha.a_position, positionBuffer!.itemSize, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer!.numItems);

            this._transmittanceBuffer.deactivate();
        }

        //
        // Draw scattering texture
        //
        if (this._scatteringBuffer && this._transmittanceBuffer) {
            this._scatteringBuffer.activate();

            let p = h.programs.scattering;
            let sha = p._program.attributes;
            let shu = p._program.uniforms;
            p.activate();

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.uniform2fv(shu.iResolution, [this._scatteringBuffer.width, this._scatteringBuffer.height]);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._transmittanceBuffer.textures[0]);
            gl.uniform1i(shu.transmittanceTexture, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer!);
            gl.vertexAttribPointer(sha.a_position, positionBuffer!.itemSize, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, positionBuffer!.numItems);

            this._scatteringBuffer.deactivate();
        }
    }

    public drawLookupTextures() {
        this._renderLookupTextures();
    }

    protected _drawBackground() {
        let h = this.renderer!.handler;
        let sh = h.programs.atmosphereBackground,
            p = sh._program,
            shu = p.uniforms,
            gl = h.gl!;
        let r = this.renderer!;
        let cam = this.planet!.camera;

        gl.disable(gl.DEPTH_TEST);

        r.enableBlendOneSrcAlpha();
        //r.enableBlendDefault();

        sh.activate();
        gl.bindBuffer(gl.ARRAY_BUFFER, r.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._transmittanceBuffer!.textures[0]);
        gl.uniform1i(shu.transmittanceTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._scatteringBuffer!.textures[0]);
        gl.uniform1i(shu.scatteringTexture, 1);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());

        let sunPos = this.planet!.sunPos;
        gl.uniform3fv(shu.sunPos, [sunPos.x, sunPos.y, sunPos.z]);
        gl.uniform3fv(shu.camPos, [cam.eye.x, cam.eye.y, cam.eye.z]);
        gl.uniform2fv(shu.iResolution, [r.sceneFramebuffer!.width, r.sceneFramebuffer!.height]);
        gl.uniform1f(shu.fov, cam.getViewAngle());
        gl.uniform1f(shu.opacity, this.opacity);

        let f = cam.frustum;
        gl.uniform1f(shu.isOrthographic, cam.isOrthographic ? 1.0 : 0.0);
        gl.uniform4fv(shu.frustumParams, [f.right - f.left, f.top - f.bottom, f.right, f.top]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);

        r.enableBlendDefault();
    }
}

function atmosphereBackgroundShader(atmosParams?: AtmosphereParameters): Program {
    return new Program("atmosphereBackground", {
        uniforms: {
            iResolution: "vec2",
            fov: "float",
            camPos: "vec3",
            viewMatrix: "mat4",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            sunPos: "vec3",
            opacity: "float",
            isOrthographic: "float",
            frustumParams: "vec4"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: atmosphere_vert,
        fragmentShader: stringTemplate2(atmosphere_frag, {
            ...atmosParams,
            disableSunDisk: atmosParams?.disableSunDisk ? 1 : 0
        })
    });
}
