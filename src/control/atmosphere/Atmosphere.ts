import {type AtmosphereParameters, transmittance, scattering} from "../../shaders/atmos/atmos";
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
}

export class Atmosphere extends Control {
    public _transmittanceBuffer: Framebuffer | null;
    public _scatteringBuffer: Framebuffer | null;
    public opacity: number;

    protected _parameters: AtmosphereParameters;

    constructor(options: IAtmosphereParams = {}) {
        super({
            name: "Atmosphere",
            ...options
        });

        this._transmittanceBuffer = null;
        this._scatteringBuffer = null;

        this.opacity = 1.0;

        this._parameters = {
            ATMOS_HEIGHT: options.height || 100000.0,
            RAYLEIGH_SCALE: options.rayleighScale || 0.08,
            MIE_SCALE: options.mieScale || 0.012,
            GROUND_ALBEDO: options.groundAlbedo || 0.05,
            BOTTOM_RADIUS: options.bottomRadius || 6356752.3142451793,
            rayleighScatteringCoefficient_0: options.rayleighScatteringCoefficient_0 || 5.802,
            rayleighScatteringCoefficient_1: options.rayleighScatteringCoefficient_1 || 13.558,
            rayleighScatteringCoefficient_2: options.rayleighScatteringCoefficient_2 || 33.100,
            mieScatteringCoefficient: options.mieScatteringCoefficient || 3.996,
            mieExtinctionCoefficient: options.mieExtinctionCoefficient || 4.440,
            ozoneAbsorptionCoefficient_0: options.ozoneAbsorptionCoefficient_0 || 0.650,
            ozoneAbsorptionCoefficient_1: options.ozoneAbsorptionCoefficient_1 || 1.881,
            ozoneAbsorptionCoefficient_2: options.ozoneAbsorptionCoefficient_2 || 0.085,
            SUN_ANGULAR_RADIUS: options.sunAngularRadius || 0.004685,
            SUN_INTENSITY: options.sunIntensity || 1.0,
            ozoneDensityHeight: options.ozoneDensityHeight || 25e3,
            ozoneDensityWide: options.ozoneDensityWide || 15e3,
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

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
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
            opacity: "float"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: atmosphere_vert,
        fragmentShader: stringTemplate2(atmosphere_frag, atmosParams)
    });
}
