import { cascade_shadow_depth } from "./cascade_shadow_depth";
import { Vector } from "../../layer/Vector";
import type { Planet } from "../../scene/Planet";
import type { ShaderProgram } from "../../webgl/ShaderProgram";
import type { Renderer } from "../Renderer";
import { DEFAULT_CASCADE_SHADOW_TEXTURE_UNIT_START } from "../textureUnits";
import { CascadeShadowMap } from "./CascadeShadowMap";

// Must match MAX_CASCADE_COUNT in cascadeShadows.glsl.
const MAX_CASCADE_COUNT = 4;

export class CascadeShadowManager {
    protected _renderer: Renderer;
    protected _planet: Planet | null;
    protected _cascadeShadowMaps: CascadeShadowMap[];
    protected _activeCascadeShadowMaps: CascadeShadowMap[];

    public readonly cameraFrustumLayer: Vector;

    protected _viewProjData: Float32Array;
    protected _eyeRelData: Float32Array;
    protected _paramsData: Float32Array;
    protected _splitsData: Float32Array;
    protected _viewForwardData: Float32Array;
    protected _layerData: Int32Array;
    protected _updateActiveCascadeShadowMaps: boolean;
    protected _initialized: boolean;

    constructor(renderer: Renderer) {
        this._renderer = renderer;
        this._planet = null;
        this._cascadeShadowMaps = [];
        this._activeCascadeShadowMaps = [];
        this.cameraFrustumLayer = new Vector("cascadeShadowCameraFrustumLayer", {
            entities: [],
            pickingEnabled: true,
            receiveProjectors: false,
            receiveShadows: false,
            shadeMode: "unlit",
            hideInLayerSwitcher: true,
            scaleByDistance: [100, 1000000, 1.0]
        });

        this._viewProjData = new Float32Array(MAX_CASCADE_COUNT * 16);
        this._eyeRelData = new Float32Array(MAX_CASCADE_COUNT * 3);
        this._paramsData = new Float32Array(MAX_CASCADE_COUNT * 4);
        this._splitsData = new Float32Array(MAX_CASCADE_COUNT * 4);
        this._viewForwardData = new Float32Array(3);
        this._layerData = new Int32Array(MAX_CASCADE_COUNT);
        this._updateActiveCascadeShadowMaps = true;
        this._initialized = false;
    }

    public get activeCount(): number {
        return this._getActiveCascadeShadowMaps().length;
    }

    public get active(): CascadeShadowMap[] {
        return this._getActiveCascadeShadowMaps().slice();
    }

    public init(): void {
        if (this._initialized) return;

        this._renderer.addProgram(cascade_shadow_depth());
        this._renderer.events.on("predraw", this._onDraw, this, 0);
        this._initialized = true;
        this._addCameraFrustumLayer();
        this._syncCameraFrustumLayerEntities();

        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            this._initCascadeShadowMap(this._cascadeShadowMaps[i]);
        }
    }

    public bindPlanet(planet: Planet): void {
        if (this._planet === planet) return;

        if (this._planet) {
            this.unbindPlanet();
        }

        this._planet = planet;
        this._addCameraFrustumLayer();
        this._syncCameraFrustumLayerEntities();

        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            this._initCascadeShadowMap(this._cascadeShadowMaps[i]);
        }
    }

    public unbindPlanet(): void {
        this._removeCameraFrustumLayer();

        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            this._cascadeShadowMaps[i].unbindPlanet();
        }

        this._planet = null;
    }

    public add(cascadeShadowMap: CascadeShadowMap): number {
        if (cascadeShadowMap._manager) {
            return cascadeShadowMap.id;
        }

        cascadeShadowMap._manager = this;
        this._cascadeShadowMaps.push(cascadeShadowMap);
        this._addCascadeShadowMapEntity(cascadeShadowMap);
        this._updateActiveCascadeShadowMaps = true;

        this._initCascadeShadowMap(cascadeShadowMap);

        return cascadeShadowMap.id;
    }

    public update(cascadeShadowMap: CascadeShadowMap): boolean {
        const index = this._cascadeShadowMaps.findIndex((s) => s.id === cascadeShadowMap.id);
        if (index === -1) return false;

        this._cascadeShadowMaps[index] = cascadeShadowMap;
        this._updateActiveCascadeShadowMaps = true;
        return true;
    }

    public remove(cascadeShadowMap: CascadeShadowMap): boolean {
        const index = this._cascadeShadowMaps.findIndex((s) => s.id === cascadeShadowMap.id);
        if (index === -1) return false;

        this._removeCascadeShadowMapEntity(cascadeShadowMap);
        cascadeShadowMap.destroy();
        cascadeShadowMap._manager = null;
        this._cascadeShadowMaps.splice(index, 1);
        this._updateActiveCascadeShadowMaps = true;
        return true;
    }

    public clear(): void {
        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            const csm = this._cascadeShadowMaps[i];
            this._removeCascadeShadowMapEntity(csm);
            csm.destroy();
            csm._manager = null;
        }

        this._cascadeShadowMaps.length = 0;
        this._activeCascadeShadowMaps.length = 0;
        this._updateActiveCascadeShadowMaps = false;
    }

    public destroy(): void {
        this.clear();
        this._removeCameraFrustumLayer();
        this._planet = null;

        if (this._initialized) {
            this._renderer.events.off("predraw", this._onDraw);
            this._initialized = false;
        }
    }

    public bindForward(
        program: ShaderProgram,
        textureUnitStart: number = DEFAULT_CASCADE_SHADOW_TEXTURE_UNIT_START
    ): number {
        const gl = this._renderer.handler.gl;
        if (!gl) return 0;

        const u = program.uniforms!;
        const active = this._getActiveCascadeShadowMaps();
        const csm = active[0];
        const viewForward = this._renderer.activeCamera.getForward();

        this._viewForwardData[0] = viewForward.x;
        this._viewForwardData[1] = viewForward.y;
        this._viewForwardData[2] = viewForward.z;
        gl.uniform3fv(u.u_cascadeShadowViewForward, this._viewForwardData);

        if (!csm || !csm.depthArrayTexture || !csm.framebuffer) {
            gl.uniform1i(u.u_cascadeShadowCount, 0);
            gl.uniform1i(u.u_cascadeShadowDepthArray, textureUnitStart);
            return 0;
        }

        const size = Math.min(csm.cascades.length, MAX_CASCADE_COUNT);
        const activeCameraEye = this._renderer.activeCamera.eye;

        for (let i = 0; i < size; i++) {
            const cascade = csm.cascades[i];
            const camera = csm.depthCamera;
            const frustum = camera.frustums[i];
            const mOffset = i * 16;
            const eOffset = i * 3;
            const vOffset = i * 4;
            const depthRange = Math.max(frustum.far - frustum.near, 1e-6);
            const depthScale = 1.0 / depthRange;
            const texelWorldSize =
                Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom) / csm.framebuffer.width;

            this._viewProjData.set(frustum.projectionViewRTEMatrix._m, mOffset);

            this._eyeRelData[eOffset] = camera.eye.x - activeCameraEye.x;
            this._eyeRelData[eOffset + 1] = camera.eye.y - activeCameraEye.y;
            this._eyeRelData[eOffset + 2] = camera.eye.z - activeCameraEye.z;

            // Keep cascade bias values in the same units as DepthCamera and normalize only for shader compare.
            this._paramsData[vOffset] = cascade.bias * depthScale;
            this._paramsData[vOffset + 1] = cascade.normalBias;
            this._paramsData[vOffset + 2] = texelWorldSize * depthScale;
            this._paramsData[vOffset + 3] = cascade.depthEpsilon * depthScale;

            this._splitsData[vOffset] = cascade.splitNear;
            this._splitsData[vOffset + 1] = cascade.splitFar;
            this._splitsData[vOffset + 2] = 0.0;
            this._splitsData[vOffset + 3] = 0.0;

            this._layerData[i] = i;
        }

        gl.uniform1i(u.u_cascadeShadowCount, size);
        gl.uniform1iv(u.u_cascadeShadowLayer, this._layerData);
        gl.uniformMatrix4fv(u.u_cascadeShadowViewProjRTE, false, this._viewProjData);
        gl.uniform3fv(u.u_cascadeShadowEyeRel, this._eyeRelData);
        gl.uniform4fv(u.u_cascadeShadowParams, this._paramsData);
        gl.uniform4fv(u.u_cascadeShadowSplits, this._splitsData);

        gl.activeTexture(gl.TEXTURE0 + textureUnitStart);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, csm.depthArrayTexture);
        gl.uniform1i(u.u_cascadeShadowDepthArray, textureUnitStart);
        gl.activeTexture(gl.TEXTURE0);

        return size;
    }

    protected _addCameraFrustumLayer(): void {
        if (this._planet && !this.cameraFrustumLayer.planet) {
            this._planet.addLayer(this.cameraFrustumLayer);
        }
    }

    protected _removeCameraFrustumLayer(): void {
        if (this.cameraFrustumLayer.planet) {
            this.cameraFrustumLayer.remove();
        }
    }

    protected _addCascadeShadowMapEntity(cascadeShadowMap: CascadeShadowMap): void {
        this.cameraFrustumLayer.add(cascadeShadowMap.cameraFrustumEntity);
    }

    protected _removeCascadeShadowMapEntity(cascadeShadowMap: CascadeShadowMap): void {
        this.cameraFrustumLayer.removeEntity(cascadeShadowMap.cameraFrustumEntity);
    }

    protected _syncCameraFrustumLayerEntities(): void {
        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            this._addCascadeShadowMapEntity(this._cascadeShadowMaps[i]);
        }
    }

    protected _initCascadeShadowMap(cascadeShadowMap: CascadeShadowMap): void {
        if (!this._initialized) {
            return;
        }

        cascadeShadowMap.init(this._renderer);

        if (this._planet) {
            cascadeShadowMap.bindPlanet(this._planet);
        }
    }

    protected _collectActiveCascadeShadowMaps(): CascadeShadowMap[] {
        const active: CascadeShadowMap[] = [];

        for (let i = 0; i < this._cascadeShadowMaps.length; i++) {
            const cascadeShadowMap = this._cascadeShadowMaps[i];
            if (!cascadeShadowMap.enabled) {
                continue;
            }
            active.push(cascadeShadowMap);
        }

        return active;
    }

    protected _getActiveCascadeShadowMaps(): CascadeShadowMap[] {
        if (!this._updateActiveCascadeShadowMaps) {
            return this._activeCascadeShadowMaps;
        }

        this._activeCascadeShadowMaps = this._collectActiveCascadeShadowMaps();
        this._updateActiveCascadeShadowMaps = false;

        return this._activeCascadeShadowMaps;
    }

    protected _onDraw = (): void => {
        const active = this._getActiveCascadeShadowMaps();
        const csm = active[0];
        if (csm) {
            csm.frame();
        }
    };
}
