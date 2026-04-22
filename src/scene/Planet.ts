/*
 * Copyright 2026 Michael Gevlich
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as segmentHelper from "../segment/segmentHelper";
import * as shaders from "../shaders/drawnode/drawnode";
import { Atmosphere } from "../control/atmosphere/Atmosphere";
import type { IAtmosphereParams } from "../control/atmosphere/Atmosphere";
import { Control } from "../control/Control";
import { createEvents } from "../Events";
import type { EventsHandler } from "../Events";
import { EarthQuadTreeStrategy } from "../quadTree/earth/EarthQuadTreeStrategy";
import { EmptyTerrain } from "../terrain/EmptyTerrain";
import { Extent } from "../Extent";
import { Entity } from "../entity/Entity";
import { Ellipsoid } from "../ellipsoid/Ellipsoid";
import { EntityCollection } from "../entity/EntityCollection";
import { Geoid } from "../terrain/Geoid";
import type { GeoidModel } from "../terrain/Geoid";
import { GeoImageCreator } from "../utils/GeoImageCreator";
import type { IBaseInputState } from "../renderer/RendererEvents";
import { Key, Lock } from "../Lock";
import { Layer } from "../layer/Layer";
import { Loader } from "../utils/Loader";
import { LonLat } from "../LonLat";
import { Node } from "../quadTree/Node";
import { NormalMapCreator } from "../utils/NormalMapCreator";
import { PlainSegmentWorker } from "../utils/PlainSegmentWorker";
import type { Camera } from "../camera/Camera";
import { IPlanetFlyCartesianParams, PlanetCamera } from "../camera/PlanetCamera";
import { Quat } from "../math/Quat";
import { QuadTreeStrategy } from "../quadTree/QuadTreeStrategy";
import { Ray } from "../math/Ray";
import { AltitudeNearPlaneStrategy, type INearPlaneStrategy } from "./AltitudeNearPlaneStrategy";
import { RenderNode } from "./RenderNode";
import { SimpleSkyBackground } from "../control/SimpleSkyBackground";
import { Sun } from "../control/Sun";
import { TerrainWorker } from "../utils/TerrainWorker";
import { Vec2, Vec3 } from "../math/index";
import type { NumberArray2, NumberArray4 } from "../math/index";
import { Vector } from "../layer/Vector";
import { VectorTileCreator } from "../utils/VectorTileCreator";
import { wgs84 } from "../ellipsoid/wgs84";
import type { WebGLBufferExt, WebGLTextureExt, IDefaultTextureParams } from "../webgl/Handler";
import { Program } from "../webgl/Program";
import { Segment } from "../segment/Segment";
import type { AtmosphereParameters } from "../shaders/atmos/atmos";
import { ProgramController } from "../webgl/ProgramController";
import { AtmosphereDeferredShading } from "../renderer/AtmosphereDeferredShading";
import { PhongDeferredShading } from "../renderer/PhongDeferredShading";
import {
    normalizeShadeMode,
    SHADE_PHONG,
    SHADE_PBR,
    type ShadeMode,
    type ShadeModeInput
} from "../shadeModeConstants";

export interface IPlanetParams {
    name?: string;
    ellipsoid?: Ellipsoid;
    minAltitude?: number;
    maxAltitude?: number;
    frustums?: NumberArray2[];
    maxEqualZoomAltitude?: number;
    minEqualZoomAltitude?: number;
    minEqualZoomCameraSlope?: number;
    quadTreeStrategyPrototype?: typeof QuadTreeStrategy;
    nightTextureSrc?: string | null;
    specularTextureSrc?: string | null;
    maxGridSize?: number;
    maxLoadingRequests?: number;
    atmosphereEnabled?: boolean;
    transitionOpacityEnabled?: boolean;
    atmosphereParameters?: IAtmosphereParams;
    minDistanceBeforeMemClear?: number;
    vectorTileSize?: number;
    maxNodesCount?: number;
    transparentBackground?: boolean;
    nearPlaneStrategy?: INearPlaneStrategy;
    shadeMode?: ShadeModeInput;
    reverseDepth?: boolean;
}

export type PlanetEventsList = [
    "draw",
    "layeradd",
    "baselayerchange",
    "layerremove",
    "layervisibilitychange",
    "rendercompleted",
    "terraincompleted",
    "layerloadend"
];

/**
 * Maximum created nodes count. The more nodes count the more memory usage.
 * When the maximum node count is exceeded, memClear() will be called.
 * @const
 * @type {number}
 * @default
 */
const DEFAULT_MAX_NODES = 400;

type IndexBufferCacheData = { buffer: WebGLBufferExt | null };

/**
 * Main class for rendering a planet.
 * @class
 * @extends {RenderNode}
 * @param {IPlanetParams} [options={}] - Planet configuration parameters.
 * @param {string} [options.name] - Planet name.
 * @param {Ellipsoid} [options.ellipsoid=wgs84] - Planet ellipsoid.
 * @param {number} [options.minAltitude] - Minimum camera altitude above terrain.
 * @param {number} [options.maxAltitude] - Maximum camera altitude above terrain.
 * @param {Array.<Array.<number>>} [options.frustums] - Planet camera frustum configuration.
 * @param {number} [options.maxGridSize=256] - Maximum terrain segment grid size.
 * @param {number} [options.maxLoadingRequests=12] - Maximum concurrent tile loading requests.
 * @param {number} [options.maxNodesCount=400] - Maximum number of created quadtree nodes.
 * @param {number} [options.maxEqualZoomAltitude=15000000.0] - Max altitude where visible segments keep the same zoom.
 * @param {number} [options.minEqualZoomAltitude=10000.0] - Min altitude where visible segments keep the same zoom.
 * @param {number} [options.minEqualZoomCameraSlope=0.8] - Min camera slope for equal-zoom segment strategy.
 * @param {typeof QuadTreeStrategy} [options.quadTreeStrategyPrototype=EarthQuadTreeStrategy] - Quadtree strategy class.
 * @param {string|null} [options.nightTextureSrc] - Night lights texture URL (`null` disables texture loading).
 * @param {string|null} [options.specularTextureSrc] - Water/specular mask texture URL (`null` disables texture loading).
 * @param {boolean} [options.atmosphereEnabled=false] - Enables atmosphere rendering.
 * @param {boolean} [options.transitionOpacityEnabled] - Enables terrain transition opacity blending.
 * @param {IAtmosphereParams} [options.atmosphereParameters] - Atmosphere model parameters.
 * @param {number} [options.minDistanceBeforeMemClear] - Camera travel distance threshold before automatic memory cleanup.
 * @param {number} [options.vectorTileSize] - Vector tile texture size for vector layer baking.
 * @param {boolean} [options.transparentBackground=false] - Enables transparent renderer background.
 * @param {INearPlaneStrategy} [options.nearPlaneStrategy] - Near-plane strategy implementation.
 * @param {number|string} [options.shadeMode=0.5] - Terrain shading mode: `0|none|unlit`, `0.5|phong`, `1|pbr`.
 * @param {boolean} [options.reverseDepth=true] - Enables reverse-Z depth for the default planet camera in perspective mode.
 *
 * @fires draw - Triggered before globe frame begins to render.
 * @fires layeradd - Triggered when a layer is added to the planet.
 * @fires baselayerchange - Triggered when the base layer changes.
 * @fires layerremove - Triggered when a layer is removed from the planet.
 * @fires layervisibilitychange - Triggered when layer visibility changes.
 * @fires rendercompleted - Triggered when all data is loaded.
 * @fires terraincompleted - Triggered when terrain data is loaded.
 * @fires layerloadend - Triggered when layer data finishes loading.
 */
export class Planet extends RenderNode {
    public events: EventsHandler<PlanetEventsList>;

    public _createdNodesCount: number;

    /**
     * @public
     * @type {Ellipsoid}
     */
    public ellipsoid: Ellipsoid;

    /**
     * Squared ellipsoid radius.
     * @public
     * @type {number}
     */
    public _planetRadius2: number;

    /**
     * Layers array.
     * @public
     * @type {Array.<Layer>}
     */
    public _layers: Layer[];

    /**
     * Flag to trigger layer update in a next frame
     * @type {boolean}
     * @protected
     */
    protected _updateLayers: boolean;

    /**
     * Current visible imagery tile layers array.
     * @public
     * @type {Array.<Layer>}
     */
    public visibleTileLayers: Layer[];

    /**
     * Current visible vector layers array.
     * @protected
     * @type {Array.<Layer>}
     */
    protected visibleVectorLayers: Vector[];
    protected _visibleVectorLayersByDepthOrder: Vector[][];

    protected _visibleTileLayerSlices: Layer[][];

    /**
     * Vector layers visible nodes with collections.
     * @protected
     * @type {EntityCollection[][]}
     */
    protected _visibleEntityCollections: EntityCollection[][];

    /**
     * There is only one base layer on the globe when layer.isBaseLayer is true.
     * @public
     * @type {Layer}
     */
    public baseLayer: Layer | null;

    /**
     * Terrain provider.
     * @public
     * @type {EmptyTerrain}
     */
    public terrain: EmptyTerrain | null;

    /**
     * Camera is this.renderer.activeCamera pointer.
     * @public
     * @type {PlanetCamera}
     */
    public camera: PlanetCamera;
    public nearPlaneStrategy: INearPlaneStrategy;

    public emptyTexture: WebGLTextureExt | null;
    public transparentTexture: WebGLTextureExt | null;
    public defaultTexture: WebGLTextureExt | null;

    protected _initialViewExtent: Extent | null;

    /**
     * Layers activity lock.
     * @public
     * @type {Lock}
     */
    public layerLock: Lock;

    /**
     * Terrain providers activity lock.
     * @public
     * @type {Lock}
     */
    public terrainLock: Lock;

    /**
     * Height scale factor. 1 - is normal elevation scale.
     * @public
     * @type {number}
     */
    public _heightFactor: number;

    /**
     * Precomputed indexes array for different grid size segments.
     * @protected
     * @type {Array.<Array.<number>>}
     */
    public _indexesCache: IndexBufferCacheData[][][][][];

    protected _indexesCacheToRemove: IndexBufferCacheData[];
    public _indexesCacheToRemoveCounter: number;

    /**
     * Precomputed texture coordinates buffers for different grid size segments.
     * @public
     * @type {Array.<Array.<number>>}
     */
    public _textureCoordsBufferCache: WebGLBufferExt[];

    public quadTreeStrategyPrototype: typeof QuadTreeStrategy;
    public quadTreeStrategy: QuadTreeStrategy;

    /**
     * Night glowing gl texture.
     * @protected
     */
    protected _nightTexture: WebGLTextureExt | null;

    /**
     * Specular mask gl texture.
     * @protected
     */
    protected _specularTexture: WebGLTextureExt | null;

    protected _maxGridSize: number;

    /**
     * Segment multiple textures size.(4 - convenient value for the most devices)
     * @const
     * @public
     */
    public SLICE_SIZE: number;
    public SLICE_SIZE_4: number;
    public SLICE_SIZE_3: number;

    public _pickingColorArr: Float32Array;
    public _samplerArr: Int32Array;
    public _pickingMaskArr: Int32Array;

    /**
     * GeoImage creator.
     * @public
     * @type{GeoImageCreator}
     */
    public _geoImageCreator: GeoImageCreator;

    /**
     * VectorTileCreator creator.
     * @public
     * @type{VectorTileCreator}
     */
    public _vectorTileCreator: VectorTileCreator;

    /**
     * NormalMapCreator creator.
     * @public
     * @type{NormalMapCreator}
     */
    public _normalMapCreator: NormalMapCreator;

    public _terrainWorker: TerrainWorker;

    public _plainSegmentWorker: PlainSegmentWorker;

    public _tileLoader: Loader<Layer>;

    protected _memKey: Key;

    public _distBeforeMemClear: number;

    protected _prevCamEye: Vec3;

    protected _initialized: boolean;

    protected _collectRenderNodesIsActive: boolean;

    /**
     * Night texture brightness coefficient
     * @type {number}
     */
    public nightTextureCoefficient: number;

    /**
     * Global terrain shading for drawnode (forward + deferred): 0 unlit, 0.5 Phong, 1 PBR.
     * @public
     */
    protected _shadeMode: ShadeMode;

    //protected _renderOpaqueScreenNodesPASS: () => void;
    //protected _renderTransparentScreenNodesPASS: () => void;
    //protected _renderScreenNodesWithHeightPASS: () => void;

    protected _atmosphereEnabled: boolean;
    protected _atmosphereMaxMinOpacity: Float32Array;
    public atmosphereFadeDist: Float32Array;
    protected _atmosphereBottomRadius: number;

    public solidTextureOne: WebGLTextureExt | null;
    public solidTextureTwo: WebGLTextureExt | null;

    protected _nightTextureSrc: string | null;
    protected _specularTextureSrc: string | null;

    public transitionTime: number;

    protected _atmosphere: Atmosphere;
    private _minDistanceBeforeMemClear: number = 0;
    private _maxNodes: number;

    protected _transparentBackground: boolean;

    constructor(options: IPlanetParams = {}) {
        super(options.name);

        this._createdNodesCount = 0;

        this.transitionTime = 580;

        this.ellipsoid = options.ellipsoid || wgs84;

        this._atmosphere = new Atmosphere(options.atmosphereParameters);

        this._shadeMode = normalizeShadeMode(options.shadeMode ?? SHADE_PHONG);

        this._planetRadius2 = (this.ellipsoid.getPolarSize() - 10000.0) * (this.ellipsoid.getPolarSize() - 10000.0);

        this._layers = [];

        this._updateLayers = false;

        this.visibleTileLayers = [];

        this.visibleVectorLayers = [];
        this._visibleVectorLayersByDepthOrder = [];

        this._visibleTileLayerSlices = [];

        this._visibleEntityCollections = [[]];

        this.baseLayer = null;

        this.terrain = null;

        this.camera = new PlanetCamera(this, {
            frustums: options.frustums,
            eye: new Vec3(25000000, 0, 0),
            look: Vec3.ZERO,
            up: Vec3.NORTH,
            minAltitude: options.minAltitude,
            maxAltitude: options.maxAltitude,
            reverseDepth: options.reverseDepth
        });
        this.nearPlaneStrategy = options.nearPlaneStrategy ?? new AltitudeNearPlaneStrategy();

        this.emptyTexture = null;
        this.transparentTexture = null;
        this.defaultTexture = null;

        this._initialViewExtent = null;

        this.layerLock = new Lock();

        this.terrainLock = new Lock();

        this._heightFactor = 1.0;

        this._indexesCache = [];
        this._indexesCacheToRemove = [];
        this._indexesCacheToRemoveCounter = 0;

        this._textureCoordsBufferCache = [];

        const quadTreeParams = {
            planet: this,
            maxEqualZoomAltitude: options.maxEqualZoomAltitude,
            minEqualZoomAltitude: options.minEqualZoomAltitude,
            minEqualZoomCameraSlope: options.minEqualZoomCameraSlope,
            transitionOpacityEnabled: options.transitionOpacityEnabled
        };

        // Used in CameraDepthHandler
        this.quadTreeStrategyPrototype = options.quadTreeStrategyPrototype || EarthQuadTreeStrategy;
        this.quadTreeStrategy = new this.quadTreeStrategyPrototype(quadTreeParams);

        this._nightTexture = null;

        this._specularTexture = null;

        this._maxGridSize = Math.log2(options.maxGridSize || 256);

        this.SLICE_SIZE = 4;
        this.SLICE_SIZE_4 = this.SLICE_SIZE * 4;
        this.SLICE_SIZE_3 = this.SLICE_SIZE * 3;

        this._maxNodes = options.maxNodesCount || DEFAULT_MAX_NODES;

        this._pickingColorArr = new Float32Array(this.SLICE_SIZE_4);
        this._samplerArr = new Int32Array(this.SLICE_SIZE);
        this._pickingMaskArr = new Int32Array(this.SLICE_SIZE);

        this._geoImageCreator = new GeoImageCreator(this);

        this._vectorTileCreator = new VectorTileCreator(this, options.vectorTileSize, options.vectorTileSize);

        this._normalMapCreator = new NormalMapCreator(this);

        this._terrainWorker = new TerrainWorker(3);

        this._plainSegmentWorker = new PlainSegmentWorker(3);

        this._tileLoader = new Loader(options.maxLoadingRequests || 12);

        this._memKey = new Key();

        this.events = createEvents<PlanetEventsList>(PLANET_EVENTS);

        this._distBeforeMemClear = 0.0;

        this._prevCamEye = new Vec3();

        this._initialized = false;

        this._collectRenderNodesIsActive = true;

        this.nightTextureCoefficient = 1.0;

        //this._renderOpaqueScreenNodesPASS = this._renderOpaqueScreenNodesPASSNoAtmos;
        //this._renderTransparentScreenNodesPASS = this._renderTransparentScreenNodesPASSNoAtmos;
        //this._renderScreenNodesWithHeightPASS = this._renderScreenNodesWithHeightPASSNoAtmos;

        this._atmosphereEnabled = options.atmosphereEnabled || false;
        this._atmosphereMaxMinOpacity = new Float32Array([0.95, 0.28]);
        this.atmosphereFadeDist = new Float32Array(2);
        this._atmosphereBottomRadius = this._atmosphere.parameters.BOTTOM_RADIUS;

        this.solidTextureOne = null;
        this.solidTextureTwo = null;

        this._nightTextureSrc = options.nightTextureSrc || null;
        this._specularTextureSrc = options.specularTextureSrc || null;

        this._transparentBackground = options.transparentBackground || false;
    }

    /**
     * Returns true if current terrain data set is loaded
     * @public
     */
    public get terrainReady(): boolean {
        return this.quadTreeStrategy.terrainReady;
    }

    /**
     * Returns max segment grid size used by the quadtree.
     * @public
     * @returns {number} - Max grid size.
     */
    public get maxGridSize(): number {
        return this._maxGridSize;
    }

    /**
     * Returns local north frame rotation for a cartesian point.
     * @public
     * @param {Vec3} cartesian - Cartesian point.
     * @returns {Quat} - Rotation from world frame to local north frame.
     */
    public getNorthFrameRotation(cartesian: Vec3): Quat {
        return this.getFrameRotation(cartesian);
    }

    /**
     * Returns local frame rotation for a cartesian point.
     * @public
     * @param {Vec3} cartesian - Cartesian point.
     * @returns {Quat} - Rotation from world frame to local frame.
     */
    public override getFrameRotation(cartesian: Vec3): Quat {
        return this.ellipsoid.getNorthFrameRotation(cartesian);
    }

    /**
     * Sets maximum atmosphere opacity.
     * @public
     * @param {number} opacity - Opacity value in range `[0..1]`.
     */
    public set atmosphereMaxOpacity(opacity: number) {
        this._atmosphereMaxMinOpacity[0] = opacity;
    }

    /**
     * Gets maximum atmosphere opacity.
     * @public
     * @returns {number} - Max opacity.
     */
    public get atmosphereMaxOpacity(): number {
        return this._atmosphereMaxMinOpacity[0];
    }

    /**
     * Sets minimum atmosphere opacity.
     * @public
     * @param {number} opacity - Opacity value in range `[0..1]`.
     */
    public set atmosphereMinOpacity(opacity: number) {
        this._atmosphereMaxMinOpacity[1] = opacity;
    }

    /**
     * Gets minimum atmosphere opacity.
     * @public
     * @returns {number} - Min opacity.
     */
    public get atmosphereMinOpacity(): number {
        return this._atmosphereMaxMinOpacity[1];
    }

    /**
     * Gets atmosphere opacity range `[max, min]`.
     * @public
     * @returns {Float32Array} - Opacity range.
     */
    public get atmosphereMaxMinOpacity(): Float32Array {
        return this._atmosphereMaxMinOpacity;
    }

    protected _calcAtmosphereFadeDist() {
        const cameraPosition = this.camera.eye;
        const c = cameraPosition.length();
        const radius = this._atmosphereBottomRadius;
        const maxDist = Math.sqrt(Math.max(c * c - radius * radius, 0.0));
        const minDist = c - radius;
        const distRange = maxDist - minDist;

        this.atmosphereFadeDist[0] = minDist;
        this.atmosphereFadeDist[1] = distRange > 0.0 ? 1.0 / distRange : 0.0;
    }

    /**
     * Enables or disables atmosphere rendering and related programs.
     * @public
     * @param {boolean} enabled - Atmosphere activity flag.
     */
    public set atmosphereEnabled(enabled: boolean) {
        if (enabled != this._atmosphereEnabled) {
            this._atmosphereEnabled = enabled;
            this._initializeAtmosphere();
        }
    }

    /**
     * Returns atmosphere activity flag.
     * @public
     * @returns {boolean} - `true` when atmosphere is enabled.
     */
    public get atmosphereEnabled(): boolean {
        return this._atmosphereEnabled;
    }

    /**
     * Returns active terrain shade mode.
     * @public
     * @returns {number} - Shade mode id.
     */
    public get shadeMode(): ShadeMode {
        return this._shadeMode;
    }

    /**
     * Sets terrain shade mode.
     * @public
     * @param {number|string} m - Shade mode id (`0|0.5|1` or `none|phong|pbr`).
     */
    public set shadeMode(m: ShadeModeInput) {
        this._shadeMode = normalizeShadeMode(m);
    }

    // public set diffuse(rgb: string | NumberArray3 | Vec3) {
    //     let vec = createColorRGB(rgb);
    //     if (this.renderer) {
    //         let diffuse = new Float32Array(vec.toArray());
    //         this.renderer.lightDiffuse.set(diffuse);
    //     }
    // }
    //
    // public set ambient(rgb: string | NumberArray3 | Vec3) {
    //     let vec = createColorRGB(rgb);
    //     if (this.renderer) {
    //         let ambient = new Float32Array(vec.toArray());
    //         this.renderer.lightAmbient.set(ambient);
    //     }
    // }
    //
    // public set specular(rgb: string | NumberArray3 | Vec3) {
    //     let vec = createColorRGB(rgb);
    //     if (this.renderer) {
    //         this.renderer.lightSpecular[0] =vec.x;
    //         this.renderer.lightSpecular[1] =vec.y;
    //         this.renderer.lightSpecular[2] =vec.z;
    //     }
    // }
    //
    // public set shininess(v: number) {
    //     if (this.renderer) {
    //         this.renderer.lightSpecular[3] = v;
    //     }
    // }

    /**
     * Returns normal-map generator used by the planet.
     * @public
     * @returns {NormalMapCreator} - Normal map creator.
     */
    public get normalMapCreator(): NormalMapCreator {
        return this._normalMapCreator;
    }

    /**
     * Returns current layers snapshot.
     * @public
     * @returns {Layer[]} - Layer array copy.
     */
    public get layers(): Layer[] {
        return [...this._layers];
    }

    /**
     * Returns Sun control instance if attached to the renderer.
     * @public
     * @returns {Sun | undefined} - Sun control.
     */
    public get sun(): Sun | undefined {
        if (this.renderer && this.renderer.controls.sun) return this.renderer.controls.sun as Sun;
    }

    /**
     * Returns current sun world position.
     * @public
     * @returns {Vec3} - Sun position.
     */
    public get sunPos(): Vec3 {
        return this.sun!.sunlight.getPosition();
    }

    /**
     * Add the given control to the renderer of the planet scene.
     * @public
     * @param {Control} control - Control.
     */
    public addControl(control: Control) {
        control.planet = this;
        control.addTo(this.renderer!);
    }

    /**
     * Add the given controls array to the renderer of the planet.
     * @public
     * @param {Array.<Control>} cArr - Control array.
     */
    public addControls(cArr: Control[]) {
        for (let i = 0; i < cArr.length; i++) {
            this.addControl(cArr[i]);
        }
    }

    /**
     * Returns a layer by name.
     * @param {string} name - Layer name.
     * @public
     * @returns {Layer | undefined} -
     */
    public getLayerByName(name: string): Layer | undefined {
        for (let i = 0, len = this._layers.length; i < len; i++) {
            if (name === this._layers[i].name) {
                return this._layers[i];
            }
        }
    }

    /**
     * Adds layer to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    public addLayer(layer: Layer) {
        layer.addTo(this);
    }

    /**
     * Dispatch layer visibility changing event.
     * @param {Layer} layer - Changed layer.
     * @public
     */
    public _onLayerVisibilityChanged(layer: Layer) {
        this.events.dispatch(this.events.layervisibilitychange, layer);
    }

    /**
     * Adds the given layers array to the planet.
     * @param {Array.<Layer>} layers - Layers array.
     * @public
     */
    public addLayers(layers: Layer[]) {
        for (let i = 0, len = layers.length; i < len; i++) {
            this.addLayer(layers[i]);
        }
    }

    /**
     * Removes the given layer from the planet.
     * @param {Layer} layer - Layer to remove.
     * @public
     */
    public removeLayer(layer: Layer) {
        layer.remove();
    }

    /**
     * Clears material resources related to a layer in quadtree segments.
     * @public
     * @param {Layer} layer - Material layer.
     */
    public _clearLayerMaterial(layer: Layer) {
        this.quadTreeStrategy.clearLayerMaterial(layer);
    }

    /**
     * Sets base layer coverage to the planet.
     * @param {Layer} layer - Layer object.
     * @public
     */
    public setBaseLayer(layer: Layer) {
        if (this.baseLayer) {
            this._applyBaseLayerLighting(layer);
            if (!this.baseLayer.isEqual(layer)) {
                this.baseLayer.setVisibility(false);
                this.baseLayer = layer;
                layer.setVisibility(true);
                this.events.dispatch(this.events.baselayerchange, layer);
            }
        } else {
            this.baseLayer = layer;
            this.baseLayer.setVisibility(true);
            this._applyBaseLayerLighting(layer);
            this.events.dispatch(this.events.baselayerchange, layer);
        }
    }

    protected _applyBaseLayerLighting(layer: Layer) {
        const renderer = this.renderer;
        if (!renderer) return;

        if (layer._ambient) {
            renderer.lightAmbient.set(layer._ambient);
        }

        if (layer._diffuse) {
            renderer.lightDiffuse.set(layer._diffuse);
        }

        if (layer._specular) {
            renderer.lightSpecular.set(layer._specular);
        }

        this.nightTextureCoefficient = layer.nightTextureCoefficient;
    }

    /**
     * Sets elevation scale. 1.0 is default.
     * @public
     * @param {number} factor - Elevation scale.
     */
    public setHeightFactor(factor: number) {
        if (this._heightFactor !== factor) {
            this._heightFactor = factor;
            this.quadTreeStrategy.destroyBranches();
            this.quadTreeStrategy.clearRenderedNodes();
        }
    }

    /**
     * Gets elevation scale.
     * @public
     * @returns {number} Terrain elevation scale
     */
    public getHeightFactor(): number {
        return this._heightFactor;
    }

    /**
     * Sets LOD thresholds for quadtree terrain rendering.
     * Proxy to {@link QuadTreeStrategy.setLodSize}.
     * @public
     * @param {number} currentLodSize - Current LOD size target.
     * @param {number} [minLodSize] - Minimum LOD size.
     * @param {number} [maxLodSize] - Maximum LOD size.
     */
    public setLodSize(currentLodSize: number, minLodSize?: number, maxLodSize?: number) {
        this.quadTreeStrategy.setLodSize(currentLodSize, minLodSize, maxLodSize);
    }

    /**
     * Sets terrain provider
     * @public
     * @param {EmptyTerrain} terrain - Terrain provider.
     */
    public setTerrain(terrain: EmptyTerrain) {
        if (this._initialized) {
            this.memClear();
        }

        if (this.terrain) {
            this.terrain.abortLoading();
            this.terrain.clearCache();
            this.terrain._planet = null;
        }

        this.terrain = terrain;
        this.terrain._planet = this;

        this.quadTreeStrategy.destroyBranches();

        if (terrain._geoid.model) {
            this._plainSegmentWorker.setGeoid(terrain.getGeoid());
            terrain._isReady = true;
        } else {
            Geoid.loadModel(terrain.geoid.src)
                .then((m: GeoidModel | null) => {
                    terrain.geoid.setModel(m);
                    this._plainSegmentWorker.setGeoid(terrain.getGeoid());
                    terrain._isReady = true;
                })
                .catch((err) => {
                    console.warn(err);
                });
        }
    }

    /**
     * Reinitializes terrain forward/deferred shaders for atmosphere mode.
     * @public
     * @param {AtmosphereParameters} [atmosParams] - Optional atmosphere shader parameters.
     */
    public initAtmosphereShader(atmosParams?: AtmosphereParameters) {
        if (this.renderer && this.renderer.handler && this._atmosphereEnabled) {
            this._atmosphereBottomRadius = atmosParams?.BOTTOM_RADIUS ?? this._atmosphere.parameters.BOTTOM_RADIUS;
            let h = this.renderer.handler;
            h.removeProgram("drawnode_screen_wl_forward");
            h.addProgram(shaders.drawnode_screen_wl_forward_atmos(atmosParams));

            this._swapDeferredShadingPass(atmosParams);
        }
    }

    /**
     * Returns atmosphere control instance bound to the planet.
     * @public
     * @returns {Atmosphere} - Atmosphere control.
     */
    public get atmosphereControl(): Atmosphere {
        return this._atmosphere;
    }

    protected _initializeAtmosphere() {
        if (!this.renderer) return;

        let h = this.renderer.handler;

        h.removeProgram("drawnode_screen_wl_forward");

        if (this._atmosphereEnabled) {
            //this._renderOpaqueScreenNodesPASS = this._renderOpaqueScreenNodesPASSAtmos;
            //this._renderTransparentScreenNodesPASS = this._renderTransparentScreenNodesPASSAtmos;
            //this._renderScreenNodesWithHeightPASS = this._renderScreenNodesWithHeightPASSAtmos;

            if (!this.renderer.controls.Atmosphere) {
                this.addControl(this._atmosphere);
            }

            this._atmosphere.activate();
            this._atmosphereBottomRadius = this._atmosphere.parameters.BOTTOM_RADIUS;

            h.addProgram(shaders.drawnode_screen_wl_forward_atmos(this._atmosphere.parameters));
            this._swapDeferredShadingPass(this._atmosphere.parameters);

            if (!this._transparentBackground) {
                if (this.renderer.controls.SimpleSkyBackground) {
                    this.renderer.controls.SimpleSkyBackground.deactivate();
                }
            }
        } else {
            //this._renderOpaqueScreenNodesPASS = this._renderOpaqueScreenNodesPASSNoAtmos;
            //this._renderTransparentScreenNodesPASS = this._renderTransparentScreenNodesPASSNoAtmos;
            //this._renderScreenNodesWithHeightPASS = this._renderScreenNodesWithHeightPASSNoAtmos;

            this._atmosphere.deactivate();

            this._restoreDefaultDeferredShadingPass();

            if (!this._transparentBackground) {
                if (!this.renderer.controls.SimpleSkyBackground) {
                    this.addControl(new SimpleSkyBackground());
                } else {
                    this.renderer.controls.SimpleSkyBackground.activate();
                }
            }

            h.addProgram(shaders.drawnode_screen_wl_forward_noatmos());
        }
    }

    protected _swapDeferredShadingPass(atmosParams?: AtmosphereParameters) {
        if (!this.renderer) return;
        let r = this.renderer;
        r.deferredShadingPass.dispose();
        r.deferredShadingPass = new AtmosphereDeferredShading(r, this._atmosphere, atmosParams!);
        r.deferredShadingPass.init();
    }

    protected _restoreDefaultDeferredShadingPass() {
        if (!this.renderer) return;
        let r = this.renderer;
        r.deferredShadingPass.dispose();
        r.deferredShadingPass = new PhongDeferredShading(r);
        r.deferredShadingPass.init();
    }

    protected _initializeShaders() {
        if (!this.renderer) {
            throw new Error("Renderer is not initialized");
        }

        let r = this.renderer,
            h = r.handler;

        h.addProgram(shaders.drawnode_screen_deferred());
        h.addProgram(shaders.drawnode_colorPicking());
        h.addProgram(shaders.drawnode_depth());

        r.addPickingCallback(this, this._renderColorPickingFramebufferPASS);
        r.addDepthCallback(this, () => {
            this.renderDepthFramebuffer(this.camera, this.quadTreeStrategy);
        });
    }

    protected _onLayerLoadend(layer: Layer) {
        this.events.dispatch(this.events.layerloadend, layer);
    }

    /**
     * Initializes render resources, workers, shaders, and layer state.
     * @public
     */
    public override init() {
        this._tileLoader.events.on("layerloadend", this._onLayerLoadend, this);

        // Initialization indexes table
        segmentHelper.getInstance().setMaxGridSize(this._maxGridSize);

        const TABLESIZE = this._maxGridSize;

        let kk = 0;
        // Initialization indexes buffers cache. It takes about 120mb RAM!
        for (let i = 0; i <= TABLESIZE; i++) {
            !this._indexesCache[i] && (this._indexesCache[i] = new Array(TABLESIZE));
            for (let j = 0; j <= TABLESIZE; j++) {
                !this._indexesCache[i][j] && (this._indexesCache[i][j] = new Array(TABLESIZE));
                for (let k = 0; k <= TABLESIZE; k++) {
                    !this._indexesCache[i][j][k] && (this._indexesCache[i][j][k] = new Array(TABLESIZE));
                    for (let m = 0; m <= TABLESIZE; m++) {
                        !this._indexesCache[i][j][k][m] && (this._indexesCache[i][j][k][m] = new Array(TABLESIZE));
                        for (let q = 0; q <= TABLESIZE; q++) {
                            let ptr: IndexBufferCacheData = {
                                buffer: null
                            };

                            if (i >= 1 && i === j && i === k && i === m && i === q) {
                                let indexes = segmentHelper.getInstance().createSegmentIndexes(i, [j, k, m, q]);
                                ptr.buffer = this.renderer!.handler.createElementArrayBuffer(indexes, 1);
                            } else {
                                this._indexesCacheToRemove[kk++] = ptr;
                            }

                            this._indexesCache[i][j][k][m][q] = ptr;
                        }
                    }
                }
            }
        }

        this.renderer!.events.on("gbufferpass", () => {
            this._renderOpaqueScreenNodesDeferredPASS();
        });

        this.renderer!.events.on("forwardpass", () => {
            if (this._atmosphereEnabled) {
                this._renderTransparentScreenNodesPASSAtmos();
            } else {
                this._renderTransparentScreenNodesPASSNoAtmos();
            }
        });

        this.renderer!.events.on("postforwardpass", () => {
            if (this._atmosphereEnabled) {
                this._renderScreenNodesWithHeightPASSAtmos();
            } else {
                this._renderScreenNodesWithHeightPASSNoAtmos();
            }
        });

        // Initialize texture coordinates buffer pool
        this._textureCoordsBufferCache = [];

        let texCoordCache = segmentHelper.getInstance().initTextureCoordsTable(TABLESIZE + 1);

        for (let i = 0; i <= TABLESIZE; i++) {
            this._textureCoordsBufferCache[i] = this.renderer!.handler.createArrayBuffer(
                texCoordCache[i],
                2,
                ((1 << i) + 1) * ((1 << i) + 1)
            );
        }

        // creating empty textures
        this.renderer!.handler.createDefaultTexture(null, (t: WebGLTextureExt) => {
            this.solidTextureOne = t;
            this.solidTextureTwo = t;
        });

        this.transparentTexture = this.renderer!.handler.transparentTexture;

        this.drawMode = this.renderer!.handler.gl!.TRIANGLE_STRIP;

        // Applying shaders
        this._initializeShaders();

        this._initializeAtmosphere();

        this._updateVisibleLayers();

        // loading Earth night glowing texture
        if (this._nightTextureSrc) {
            let img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                this._nightTexture = this.renderer!.handler.createTextureDefault(img)!;
                this._nightTexture.default = true;
            };
            img.src = this._nightTextureSrc;

            // createImageBitmap(NIGHT).then((e: ImageBitmap) => {
            //     this._nightTexture = this.renderer!.handler!.createTextureDefault(e);
            // });
        }

        // load water specular mask
        if (this._specularTextureSrc) {
            let img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                this._specularTexture = this.renderer!.handler.createTextureDefault(img)!;
                this._specularTexture.default = true;
            };
            img.src = this._specularTextureSrc;

            // createImageBitmap(SPECULAR).then((e: ImageBitmap) => {
            //     this._specularTexture = this.renderer!.handler!.createTexture_l(e);
            // });
        }

        this._geoImageCreator.init();

        this._vectorTileCreator.init();

        this._normalMapCreator.init();

        this.renderer!.events.on("draw", this._globalPreDraw, this, -100);

        // Creating quad trees nodes
        this.quadTreeStrategy.init(this.camera);

        // this.renderer!.events.on("postdraw", () => {
        //     this._checkRendercompleted();
        // });

        this.initLayers();

        this._initialized = true;

        //
        // after init
        //
        if (this._initialViewExtent) {
            this.viewExtent(this._initialViewExtent);
        }

        this.renderer!.activeCamera = this.camera;

        this.camera.bindFrustumsPickingColors(this.renderer!);
        this.camera.update();

        this.camera.events.on("frustumschanged", () => {
            this.camera.bindFrustumsPickingColors(this.renderer!);
        });
    }

    /**
     * Reattaches already registered layers to apply initialization logic.
     * @public
     */
    public initLayers() {
        let temp = [...this._layers];
        for (let i = 0; i < temp.length; i++) {
            this.removeLayer(temp[i]);
            this.addLayer(temp[i]);
        }
    }

    protected _clearIndexesCache() {
        this._indexesCacheToRemoveCounter = 0;
        let c = this._indexesCacheToRemove,
            gl = this.renderer!.handler.gl!;
        for (let i = 0, len = c.length; i < len; i++) {
            let ci = c[i];
            gl.deleteBuffer(ci.buffer as WebGLBuffer);
            ci.buffer = null;
        }
    }

    /**
     * Creates default textures first for the North Pole and whole globe and second for the South Pole.
     * @public
     * @param {IDefaultTextureParams} param0 - Default texture params for the first texture.
     * @param {IDefaultTextureParams} param1 - Default texture params for the second texture.
     */
    public createDefaultTextures(param0: IDefaultTextureParams, param1: IDefaultTextureParams) {
        this.renderer!.handler.gl!.deleteTexture(this.solidTextureOne!);
        this.renderer!.handler.gl!.deleteTexture(this.solidTextureTwo!);
        this.renderer!.handler.createDefaultTexture(param0, (texture: WebGLTextureExt) => {
            this.solidTextureOne = texture;
        });
        this.renderer!.handler.createDefaultTexture(param1, (texture: WebGLTextureExt) => {
            this.solidTextureTwo = texture;
        });
    }

    protected _getLayerAttributionHTML(layer: Layer) {
        return `<div class="og-attribution__layer">${layer.getAttribution()}</div>`;
    }

    /**
     * Updates attribution lists
     * @public
     */
    public updateAttributionsList() {
        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li.getVisibility()) {
                if (li.getAttribution().length) {
                    html += this._getLayerAttributionHTML(li);
                }
            }
        }
        this._applyAttribution(html);
    }

    /**
     * Schedules visible layers list refresh for the next frame.
     * @public
     */
    public updateVisibleLayers() {
        this._updateLayers = true;
    }

    protected _updateVisibleLayers() {
        this.visibleTileLayers = [];
        this.visibleTileLayers.length = 0;

        this.visibleVectorLayers = [];
        this.visibleVectorLayers.length = 0;

        let html = "";
        for (let i = 0, len = this._layers.length; i < len; i++) {
            let li = this._layers[i];
            if (li.getVisibility()) {
                if (li.isBaseLayer()) {
                    this.createDefaultTextures(li._defaultTextures[0]!, li._defaultTextures[1]!);
                    this.baseLayer = li;
                    this._applyBaseLayerLighting(li);
                }

                if (li.hasImageryTiles()) {
                    this.visibleTileLayers.push(li);
                }

                if (li.isVector) {
                    this.visibleVectorLayers.push(li as Vector);
                }

                if (li.getAttribution().length) {
                    html += this._getLayerAttributionHTML(li);
                }
            } else if (li._fading && li._fadingOpacity > 0) {
                if (li.hasImageryTiles()) {
                    this.visibleTileLayers.push(li);
                }

                if (li.isVector) {
                    this.visibleVectorLayers.push(li as Vector);
                }
            }
        }

        this._applyAttribution(html);

        this._sortLayers();
    }

    /**
     * Apply to render list of layer attributions
     * @protected
     */
    protected _applyAttribution(html: string) {
        if (this.renderer && this.renderer.div) {
            if (html.length) {
                if (this.renderer.div.attributions!.innerHTML !== html) {
                    this.renderer.div.attributions!.innerHTML = html;
                }
            } else {
                this.renderer.div.attributions!.innerHTML = "";
            }
        }
    }

    /**
     * Sort visible layer - preparing for rendering.
     * @protected
     */
    protected _sortLayers() {
        this.visibleVectorLayers.sort((a, b) => a.getZIndex() - b.getZIndex() || a.getHeight() - b.getHeight());

        let grouped: Record<number, Vector[]> = { 0: [] };
        for (const vi of this.visibleVectorLayers) {
            if (!grouped[vi.depthOrder]) {
                grouped[vi.depthOrder] = [];
            }
            grouped[vi.depthOrder].push(vi);
        }

        this._visibleVectorLayersByDepthOrder.length = 0;
        this._visibleVectorLayersByDepthOrder = [];
        this._visibleVectorLayersByDepthOrder = Object.keys(grouped)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => grouped[Number(key)]);

        this._visibleTileLayerSlices = [];
        this._visibleTileLayerSlices.length = 0;

        if (this.visibleTileLayers.length) {
            this.visibleTileLayers.sort((a, b) => {
                if (a.isBaseLayer() !== b.isBaseLayer()) {
                    return a.isBaseLayer() ? -1 : 1;
                }
                return a.getHeight() - b.getHeight() || a.getZIndex() - b.getZIndex();
            });

            let k = -1;
            let currHeight = this.visibleTileLayers[0].getHeight();
            for (let i = 0, len = this.visibleTileLayers.length; i < len; i++) {
                if (i % this.SLICE_SIZE === 0 || this.visibleTileLayers[i].getHeight() !== currHeight) {
                    k++;
                    this._visibleTileLayerSlices[k] = [];
                    currHeight = this.visibleTileLayers[i].getHeight();
                }
                this._visibleTileLayerSlices[k].push(this.visibleTileLayers[i]);
            }
        }
    }

    protected _renderOpaqueScreenNodesDeferredPASS() {
        let cam = this.camera;

        // deferred PASS
        this._renderingOpaqueScreenNodes(
            cam,
            this.quadTreeStrategy,
            this._setUniformsDeferred(cam, this.renderer!.handler.programs.drawnode_screen_deferred),
            this.quadTreeStrategy._renderedNodesInFrustum[cam.currentFrustumIndex]
        );
    }

    protected _renderTransparentScreenNodesPASSNoAtmos() {
        // forward PASS
        this._renderingTransparentScreenNodes(
            this.camera,
            this.quadTreeStrategy,
            this._setUniformsNoAtmos(this.camera, this.renderer!.handler.programs.drawnode_screen_wl_forward, false)
        );
    }

    protected _renderScreenNodesWithHeightPASSNoAtmos() {
        let cam = this.camera;

        // PASS 1: rendering slices, and layers with heights, without transition opacity effect
        this._renderingScreenNodesWithHeight(
            cam,
            this.quadTreeStrategy,
            this._setUniformsNoAtmos(cam, this.renderer!.handler.programs.drawnode_screen_wl_forward, false),
            this.quadTreeStrategy._renderedNodesInFrustum[cam.currentFrustumIndex]
        );
    }

    protected _renderTransparentScreenNodesPASSAtmos() {
        // forward PASS
        this._renderingTransparentScreenNodes(
            this.camera,
            this.quadTreeStrategy,
            this._setUniformsAtmos(this.camera, this.renderer!.handler.programs.drawnode_screen_wl_forward, false)
        );
    }

    protected _renderScreenNodesWithHeightPASSAtmos() {
        let cam = this.camera;

        // PASS 1: rendering slices, and layers with heights, without transition opacity effect
        this._renderingScreenNodesWithHeight(
            cam,
            this.quadTreeStrategy,
            this._setUniformsAtmos(cam, this.renderer!.handler.programs.drawnode_screen_wl_forward, false),
            this.quadTreeStrategy._renderedNodesInFrustum[cam.currentFrustumIndex]
        );
    }

    protected _globalPreDraw() {
        let cam = this.camera;

        this._distBeforeMemClear += this._prevCamEye.distance(cam.eye);
        this._prevCamEye.copy(cam.eye);

        if (this._atmosphereEnabled) {
            this._calcAtmosphereFadeDist();
        }

        // free memory
        if (this._createdNodesCount > this._maxNodes && this._distBeforeMemClear > this._minDistanceBeforeMemClear) {
            this.terrain!.clearCache();
            this.memClear();
        }

        if (this._indexesCacheToRemoveCounter > 600) {
            this._clearIndexesCache();
        }
    }

    /**
     * Render node callback.
     * @public
     */
    public override preFrame() {
        if (this._updateLayers) {
            this._updateLayers = false;
            this._updateVisibleLayers();
        }

        if (this.camera.isFarthestFrustumActive) {
            this.camera.update();

            if (this._collectRenderNodesIsActive) {
                this.quadTreeStrategy.collectRenderNodes(this.camera);
            }

            //this.transformLights();

            // creates terrain normal maps
            this._normalMapCreator.frame();

            // Creating geoImages textures.
            this._geoImageCreator.frame();

            // Vector tiles rasterization
            this._vectorTileCreator.frame();

            this.camera.checkTerrainCollision();
            this.applyNear(this.camera);
            this.camera.update();

            // Here is the planet node dispatches a draw event before
            // rendering begins, and we have got render nodes.
            this.events.dispatch(this.events.draw, this);

            // Collect entity collections from vector layers
            this._collectVectorLayerCollections();
        }

        for (let i = 0; i < this._visibleEntityCollections.length; i++) {
            this.drawEntityCollections(this._visibleEntityCollections[i], i);
        }
    }

    /**
     * Pauses quadtree render-node collection and disables camera terrain collision checks.
     * @public
     */
    public lockQuadTree() {
        this._collectRenderNodesIsActive = false;
        this.camera.setTerrainCollisionActivity(false);
    }

    public applyNear(camera: Camera = this.camera) {
        this.nearPlaneStrategy.applyNear(camera);
    }

    /**
     * Resumes quadtree render-node collection and enables camera terrain collision checks.
     * @public
     */
    public unlockQuadTree() {
        this._collectRenderNodesIsActive = true;
        this.camera.setTerrainCollisionActivity(true);
    }

    protected _setUniformsDeferred(cam: PlanetCamera, program: ProgramController): Program {
        let sh, shu;
        let renderer = this.renderer!;

        let h = renderer.handler;
        let gl = h.gl!;

        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);

        program.activate();
        sh = program._program;
        shu = sh.uniforms;

        gl.uniform1f(shu.shadeMode, this._atmosphereEnabled ? SHADE_PBR : this._shadeMode);
        gl.uniform3fv(shu.lightPosition, renderer.lightPosition);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        gl.uniform3f(shu.cameraPosition, cam.eye.x, cam.eye.y, cam.eye.z);

        gl.uniform1f(shu.nightTextureCoefficient, this.nightTextureCoefficient);

        //
        // Night and specular
        //
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, this._nightTexture! || this.transparentTexture!);
        gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture! || this.transparentTexture!);
        gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

        gl.uniform1f(shu.camHeight, cam.getHeight());

        return sh;
    }

    protected _setUniformsNoAtmos(cam: PlanetCamera, program: ProgramController, disableBlend: boolean): Program {
        let sh, shu;
        let renderer = this.renderer!;

        let h = renderer.handler;
        let gl = h.gl!;

        gl.enable(gl.CULL_FACE);

        if (disableBlend) {
            gl.disable(gl.BLEND);
        } else {
            renderer.enableBlendOneSrcAlpha();
        }

        program.activate();
        sh = program._program;
        shu = sh.uniforms;

        gl.uniform1f(shu.shadeMode, this._shadeMode);

        gl.uniform3fv(shu.lightPosition, renderer.lightPosition);
        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        gl.uniform3fv(shu.diffuse, renderer.lightDiffuse);
        gl.uniform3fv(shu.ambient, renderer.lightAmbient);
        gl.uniform4fv(shu.specular, renderer.lightSpecular);

        gl.uniform1f(shu.nightTextureCoefficient, this.nightTextureCoefficient);

        //
        // Night and specular
        //
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, this._nightTexture! || this.transparentTexture!);
        gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture! || this.transparentTexture!);
        gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

        gl.uniform1f(shu.camHeight, cam.getHeight());

        gl.uniform3f(shu.cameraPosition, cam.eye.x, cam.eye.y, cam.eye.z);

        return sh;
    }

    protected _setUniformsAtmos(cam: PlanetCamera, program: ProgramController, disableBlend: boolean): Program {
        let sh, shu;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;

        gl.enable(gl.CULL_FACE);

        if (disableBlend) {
            gl.disable(gl.BLEND);
        } else {
            renderer.enableBlendOneSrcAlpha();
        }

        let atmosphereControl = renderer.controls.Atmosphere as Atmosphere;

        program.activate();
        sh = program._program;
        shu = sh.uniforms;

        gl.uniform1f(shu.shadeMode, SHADE_PBR);

        if (!atmosphereControl.isReady) return program._program;

        gl.uniform3fv(shu.lightPosition, renderer.lightPosition);
        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        gl.uniform3fv(shu.diffuse, renderer.lightDiffuse);
        gl.uniform3fv(shu.ambient, renderer.lightAmbient);
        gl.uniform4fv(shu.specular, renderer.lightSpecular);

        gl.uniform1f(shu.nightTextureCoefficient, this.nightTextureCoefficient);

        //
        // Night and specular
        //
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE);
        gl.bindTexture(gl.TEXTURE_2D, this._nightTexture! || this.transparentTexture!);
        gl.uniform1i(shu.nightTexture, this.SLICE_SIZE);

        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 1);
        gl.bindTexture(gl.TEXTURE_2D, this._specularTexture! || this.transparentTexture!);
        gl.uniform1i(shu.specularTexture, this.SLICE_SIZE + 1);

        //
        // atmos precomputed textures
        //
        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 4);
        gl.bindTexture(gl.TEXTURE_2D, atmosphereControl._transmittanceBuffer!.textures[0]);
        gl.uniform1i(shu.transmittanceTexture, this.SLICE_SIZE + 4);

        gl.activeTexture(gl.TEXTURE0 + this.SLICE_SIZE + 5);
        gl.bindTexture(gl.TEXTURE_2D, atmosphereControl._scatteringBuffer!.textures[0]);
        gl.uniform1i(shu.scatteringTexture, this.SLICE_SIZE + 5);

        gl.uniform2fv(shu.atmosFadeDist, this.atmosphereFadeDist);
        gl.uniform1f(shu.camHeight, cam.getHeight());

        gl.uniform3f(shu.cameraPosition, cam.eye.x, cam.eye.y, cam.eye.z);

        return sh;
    }

    protected _renderingFadingNodes = (
        camera: PlanetCamera,
        quadTreeStrategy: QuadTreeStrategy,
        nodes: Map<number, boolean>,
        sh: Program,
        currentNode: Node,
        sl: Layer[],
        sliceIndex: number,
        outTransparentSegments?: Segment[],
        outOpaqueSegments?: Segment[]
    ) => {
        let isFirstPass = sliceIndex === 0;
        let isEq = this.terrain!.equalizeVertices;

        for (let j = 0, len = currentNode._fadingNodes.length; j < len; j++) {
            let f = currentNode._fadingNodes[j].segment;

            //if (quadTreeStrategy._fadingNodes.has(currentNode._fadingNodes[j].__id) && !nodes.has(f.node.__id)) {
            if (quadTreeStrategy._fadingNodes.has(currentNode._fadingNodes[0].__id) && !nodes.has(f.node.__id)) {
                nodes.set(f.node.__id, true);

                if (f._transitionOpacity < 1.0) {
                    outTransparentSegments!.push(f);
                } else {
                    if (isFirstPass) {
                        isEq && f.equalize();
                        f.readyToEngage && f.engage();
                        f.updateRTCEyePosition(camera);
                        f.screenRendering(sh, sl, sliceIndex);
                        outOpaqueSegments!.push(f);
                    } else {
                        f.updateRTCEyePosition(camera);
                        f.screenRendering(sh, sl, sliceIndex, this.transparentTexture, true);
                    }
                }
            }
        }
    };

    // protected _renderingFadingNodesNoDepth = (
    //     quadTreeStrategy: QuadTreeStrategy,
    //     nodes: Map<number, boolean>,
    //     sh: Program,
    //     currentNode: Node,
    //     sl: Layer[],
    //     sliceIndex: number,
    //     outOpaqueSegments?: Segment[]
    // ) => {
    //
    //     let isFirstPass = sliceIndex === 0;
    //     let isEq = this.terrain!.equalizeVertices;
    //     let gl = sh.gl!;
    //
    //     gl.disable(gl.DEPTH_TEST);
    //
    //     for (let j = 0, len = currentNode._fadingNodes.length; j < len; j++) {
    //         let f = currentNode._fadingNodes[j].segment;
    //         if (quadTreeStrategy._fadingNodes.has(currentNode._fadingNodes[0].__id) && !nodes.has(f.node.__id)) {
    //             nodes.set(f.node.__id, true);
    //             if (isFirstPass) {
    //                 isEq && f.equalize();
    //                 f.readyToEngage && f.engage();
    //                 f.screenRendering(sh, sl, sliceIndex);
    //                 outOpaqueSegments!.push(f);
    //             } else {
    //                 f.screenRendering(sh, sl, sliceIndex, this.transparentTexture, true);
    //             }
    //         }
    //     }
    //
    //     gl.enable(gl.DEPTH_TEST);
    // }

    protected static __refreshLayersFadingOpacity__(layersRef: Layer[], minCurrZoom: number, maxCurrZoom: number) {
        for (let i = layersRef.length - 1; i >= 0; --i) {
            let li = layersRef[i];
            if (li._fading && li._refreshFadingOpacity(minCurrZoom, maxCurrZoom)) {
                layersRef.splice(i, 1);
            }
        }
    }

    /**
     * Drawing nodes
     */
    // protected _renderingScreenNodes(
    //     quadTreeStrategy: QuadTreeStrategy,
    //     sh: Program,
    //     cam: PlanetCamera,
    //     renderedNodes: Node[]
    // ) {
    //
    //     let sl = this._visibleTileLayerSlices;
    //
    //     if (sl.length && cam.isFarthestFrustumActive) {
    //         Planet.__refreshLayersFadingOpacity__(sl[0], quadTreeStrategy.minCurrZoom, quadTreeStrategy.maxCurrZoom);
    //     }
    //
    //     let nodes = new Map<number, boolean>;
    //     let transparentSegments: Segment[] = [];
    //
    //     let isEq = this.terrain!.equalizeVertices;
    //     let i = renderedNodes.length;
    //
    //     //
    //     // Collect fading opaque segments, because we need them in the framebuffer passes,
    //     // as the segments with equalized sides, which means that there are no gaps
    //     // between currently rendered neighbours
    //     //
    //     quadTreeStrategy._fadingOpaqueSegments = [];
    //
    //     if (cam.slope > 0.8 || !this.terrain || this.terrain.isEmpty) {
    //         while (i--) {
    //             let ri = renderedNodes[i];
    //             let s = ri.segment;
    //
    //             this._renderingFadingNodesNoDepth(quadTreeStrategy, nodes, sh, ri, sl[0], 0, quadTreeStrategy._fadingOpaqueSegments);
    //
    //             isEq && s.equalize();
    //             s.readyToEngage && s.engage();
    //             s.screenRendering(sh, sl[0], 0);
    //         }
    //     } else {
    //
    //         //
    //         // Render opaque segments on the first pass, remove transparent ones into second pass
    //         //
    //         while (i--) {
    //             let ri = renderedNodes[i];
    //             let s = ri.segment;
    //
    //             this._renderingFadingNodes(quadTreeStrategy, nodes, sh, ri, sl[0], 0, transparentSegments, quadTreeStrategy._fadingOpaqueSegments);
    //
    //             if (s._transitionOpacity < 1) {
    //                 transparentSegments.push(s);
    //             } else {
    //                 isEq && s.equalize();
    //                 s.readyToEngage && s.engage();
    //                 s.screenRendering(sh, sl[0], 0);
    //             }
    //         }
    //
    //         //
    //         // Render transparent segments
    //         //
    //         for (let j = 0; j < transparentSegments.length; j++) {
    //             let tj = transparentSegments[j];
    //
    //             isEq && tj.equalize();
    //             tj.readyToEngage && tj.engage();
    //             tj.screenRendering(sh, sl[0], 0);
    //         }
    //     }
    // }

    protected _renderingOpaqueScreenNodes(
        cam: PlanetCamera,
        quadTreeStrategy: QuadTreeStrategy,
        sh: Program,
        renderedNodes: Node[]
    ) {
        let sl = this._visibleTileLayerSlices;

        if (sl.length && cam.isFarthestFrustumActive) {
            Planet.__refreshLayersFadingOpacity__(sl[0], quadTreeStrategy.minCurrZoom, quadTreeStrategy.maxCurrZoom);
        }

        let nodes = new Map<number, boolean>();

        let isEq = this.terrain!.equalizeVertices;
        let i = renderedNodes.length;

        //
        // Collect fading opaque segments, because we need them in the framebuffer passes,
        // as the segments with equalized sides, which means that there are no gaps
        // between currently rendered neighbours
        //
        quadTreeStrategy._fadingOpaqueSegments = [];
        quadTreeStrategy._transparentSegments = [];

        //
        // Render opaque segments on the first pass, remove transparent ones into second pass
        //
        while (i--) {
            let ri = renderedNodes[i];
            let s = ri.segment;

            this._renderingFadingNodes(
                cam,
                quadTreeStrategy,
                nodes,
                sh,
                ri,
                sl[0],
                0,
                quadTreeStrategy._transparentSegments,
                quadTreeStrategy._fadingOpaqueSegments
            );

            if (s._transitionOpacity < 1) {
                quadTreeStrategy._transparentSegments.push(s);
            } else {
                isEq && s.equalize();
                s.readyToEngage && s.engage();
                s.updateRTCEyePosition(cam);
                s.screenRendering(sh, sl[0], 0);
            }
        }
    }

    protected _renderingTransparentScreenNodes(camera: PlanetCamera, quadTreeStrategy: QuadTreeStrategy, sh: Program) {
        let isEq = this.terrain!.equalizeVertices;
        let sl = this._visibleTileLayerSlices;

        for (let j = 0; j < quadTreeStrategy._transparentSegments.length; j++) {
            let tj = quadTreeStrategy._transparentSegments[j];

            isEq && tj.equalize();
            tj.readyToEngage && tj.engage();
            tj.updateRTCEyePosition(camera);
            tj.screenRendering(sh, sl[0], 0);
        }
    }

    protected _renderingScreenNodesWithHeight(
        camera: PlanetCamera,
        quadTreeStrategy: QuadTreeStrategy,
        sh: Program,
        renderedNodes: Node[]
    ) {
        let gl = this.renderer!.handler.gl!;

        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.CULL_FACE);

        let nodes = new Map<number, boolean>();
        let transparentSegments: Segment[] = [];

        let sl = this._visibleTileLayerSlices;

        for (let j = 1, len = sl.length; j < len; j++) {
            if (camera.isFarthestFrustumActive) {
                Planet.__refreshLayersFadingOpacity__(
                    sl[j],
                    quadTreeStrategy.minCurrZoom,
                    quadTreeStrategy.maxCurrZoom
                );
            }

            const polygonOffsetUnits = camera.reverseDepthActive ? j : -j;
            gl.polygonOffset(0, polygonOffsetUnits);
            let i = renderedNodes.length;
            while (i--) {
                let ri = renderedNodes[i];
                this._renderingFadingNodes(camera, quadTreeStrategy, nodes, sh, ri, sl[j], j, transparentSegments);
                if (ri.segment._transitionOpacity < 1) {
                    ri.segment.initSlice(j);
                } else {
                    ri.segment.updateRTCEyePosition(camera);
                    ri.segment.screenRendering(sh, sl[j], j, this.transparentTexture, true);
                }
            }
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
    }

    protected _renderColorPickingFramebufferPASS() {
        let sh;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        h.programs.drawnode_colorPicking.activate();
        sh = h.programs.drawnode_colorPicking._program;
        let shu = sh.uniforms;
        let cam = renderer.activeCamera!;

        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        gl.uniform3f(shu.cameraPosition, cam.eye.x, cam.eye.y, cam.eye.z);

        // drawing planet nodes
        let rn = this.quadTreeStrategy._renderedNodesInFrustum[cam.getCurrentFrustum()];
        let sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            if (rn[i].segment._transitionOpacity >= 1) {
                rn[i].segment.colorPickingRendering(sh, sl[0], 0);
            }
        }

        for (let i = 0; i < this.quadTreeStrategy._fadingOpaqueSegments.length; ++i) {
            this.quadTreeStrategy._fadingOpaqueSegments[i].colorPickingRendering(sh, sl[0], 0);
        }

        gl.enable(gl.POLYGON_OFFSET_FILL);
        for (let j = 1, len = sl.length; j < len; j++) {
            i = rn.length;
            const polygonOffsetUnits = cam.reverseDepthActive ? j : -j;
            gl.polygonOffset(0, polygonOffsetUnits);
            while (i--) {
                rn[i].segment.colorPickingRendering(sh, sl[j], j, this.transparentTexture, true);
            }
        }

        gl.enable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    /**
     * Renders terrain depth and frustum id into the depth framebuffer.
     * @public
     * @param {PlanetCamera} cam - Camera used for rendering.
     * @param {QuadTreeStrategy} quadTreeStrategy - Quadtree strategy with rendered node lists.
     */
    public renderDepthFramebuffer(cam: PlanetCamera, quadTreeStrategy: QuadTreeStrategy) {
        let sh;
        let renderer = this.renderer!;
        let h = renderer.handler;
        let gl = h.gl!;
        h.programs.drawnode_depth.activate();
        sh = h.programs.drawnode_depth._program;
        let shu = sh.uniforms;

        gl.disable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(shu.viewMatrix, false, cam.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, cam.getProjectionMatrix());
        gl.uniform3f(shu.cameraPosition, cam.eye.x, cam.eye.y, cam.eye.z);

        gl.uniform1f(shu.frustumPickingColor, cam.frustumColorIndex);

        // drawing planet nodes
        let rn = quadTreeStrategy._renderedNodesInFrustum[cam.getCurrentFrustum()],
            sl = this._visibleTileLayerSlices;

        let i = rn.length;
        while (i--) {
            if (rn[i].segment._transitionOpacity >= 1) {
                rn[i].segment.depthRendering(sh, sl[0]);
            }
        }

        for (let i = 0; i < quadTreeStrategy._fadingOpaqueSegments.length; ++i) {
            quadTreeStrategy._fadingOpaqueSegments[i].depthRendering(sh, sl[0]);
        }

        gl.enable(gl.BLEND);
    }

    protected _collectVectorLayerCollections() {
        let k = this._visibleVectorLayersByDepthOrder.length;
        this._visibleEntityCollections.length = 0;
        this._visibleEntityCollections = new Array(k);
        for (let i = 0; i < this._visibleEntityCollections.length; i++) {
            this._visibleEntityCollections[i] = [];
        }

        while (k--) {
            let group = this._visibleVectorLayersByDepthOrder[k];
            let j = group.length;
            while (j--) {
                let vi = group[j];
                if (
                    vi._fading &&
                    vi._refreshFadingOpacity(this.quadTreeStrategy.minCurrZoom, this.quadTreeStrategy.maxCurrZoom)
                ) {
                    group.splice(j, 1);
                    if (group.length === 0) {
                        this._visibleVectorLayersByDepthOrder.splice(k, 1);
                    }
                }

                vi.collectVisibleCollections(this._visibleEntityCollections[k]);
                vi.update();
            }
        }
    }

    /**
     * Starts clear memory thread.
     * @public
     */
    public memClear() {
        this._distBeforeMemClear = 0;

        this.camera._insideSegment = null;

        this.layerLock.lock(this._memKey);
        this.terrainLock.lock(this._memKey);
        this._normalMapCreator.lock(this._memKey);

        this._normalMapCreator.clear();
        this.terrain!.abortLoading();
        this._tileLoader.abortAll();

        this.quadTreeStrategy.clear();
        this.layerLock.free(this._memKey);
        this.terrainLock.free(this._memKey);
        this._normalMapCreator.free(this._memKey);

        this._createdNodesCount = 0;
    }

    /**
     * Returns ray vector hit ellipsoid coordinates.
     * If the ray doesn't hit ellipsoid it returns 'undefined'.
     * @public
     * @param {Ray} ray - Ray.
     * @returns {Vec3 | undefined} -
     */
    public getRayIntersectionEllipsoid(ray: Ray): Vec3 | undefined {
        return this.ellipsoid.hitRay(ray.origin, ray.direction);
    }

    /**
     * Project screen coordinates to the planet ellipsoid.
     * @public
     * @param {Vec2 | IBaseInputState } px - Screen coordinates.
     * @returns {Vec3 | undefined} - Cartesian coordinates.
     */
    public getCartesianFromPixelEllipsoid(px: Vec2 | IBaseInputState): Vec3 | undefined {
        let cam = this.renderer!.activeCamera!;
        return this.ellipsoid.hitRay(cam.eye, cam.unproject(px.x, px.y));
    }

    /**
     * Project screen coordinates to the planet ellipsoid.
     * @public
     * @param {Vec2} px - Screen coordinates.
     * @returns {LonLat | undefined} - Geodetic coordinates.
     */
    public getLonLatFromPixelEllipsoid(px: Vec2): LonLat | undefined {
        let coords = this.getCartesianFromPixelEllipsoid(px);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
    }

    /**
     * Returns mouse position cartesian coordinates on the current terrain.
     * @public
     * @returns {Vec3 | undefined} -
     */
    public getCartesianFromMouseTerrain(): Vec3 | undefined {
        let ms = this.renderer!.events.mouseState;
        let distance = this.getDistanceFromPixel(ms);
        if (distance) {
            return ms.direction.scaleTo(distance).addA(this.renderer!.activeCamera!.eye);
        }
    }

    /**
     * Returns screen coordinates cartesian coordinates on the current terrain.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2 | IBaseInputState} px - Pixel screen 2d coordinates.
     * @returns {Vec3 | undefined} -
     */
    public getCartesianFromPixelTerrain(px: Vec2 | IBaseInputState): Vec3 | undefined {
        let distance = this.getDistanceFromPixel(px);
        if (distance) {
            let cam = this.camera;
            let dir = (px as IBaseInputState).direction || cam.unproject(px.x, px.y);
            let cart = dir.scaleTo(distance).addA(cam.eye);

            // Reject points behind the geometric horizon.
            const norm = this.ellipsoid.getSurfaceNormal3v(cart);
            if (cam.eye.sub(cart).dot(norm) <= 0.0) {
                return;
            }

            return cart;
        }
    }

    /**
     * Returns geodetic coordinates on the current terrain planet by its screen coordinates.
     * position or null if input coordinates is outside the planet.
     * @public
     * @param {Vec2 | IBaseInputState} px - Pixel screen 2d coordinates.
     * @returns {LonLat | undefined} -
     */
    public getLonLatFromPixelTerrain(px: Vec2 | IBaseInputState): LonLat | undefined {
        let coords = this.getCartesianFromPixelTerrain(px);
        if (coords) {
            return this.ellipsoid.cartesianToLonLat(coords);
        }
    }

    /**
     * Project cartesian coordinates to screen space.
     * @public
     * @param {Vec3} coords - Cartesian coordinates.
     * @returns {Vec2} - Screen coordinates.
     */
    public getPixelFromCartesian(coords: Vec3): Vec2 {
        return this.renderer!.activeCamera!.project3v(coords);
    }

    /**
     * Project geodetic coordinates to screen space.
     * @public
     * @param {LonLat} lonlat - Geodetic coordinates.
     * @returns {Vec2 | undefined} - Screen coordinates.
     */
    public getPixelFromLonLat(lonlat: LonLat): Vec2 | undefined {
        let coords = this.ellipsoid.lonLatToCartesian(lonlat);
        if (coords) {
            return this.renderer!.activeCamera!.project3v(coords);
        }
    }

    /**
     * Returns distance from an active (screen) camera to the planet ellipsoid.
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {number | undefined} -
     */
    public getDistanceFromPixelEllipsoid(px: Vec2 | IBaseInputState): number | undefined {
        let coords = this.getCartesianFromPixelEllipsoid(px);
        if (coords) {
            return coords.distance(this.renderer!.activeCamera!.eye);
        }
    }

    /**
     * Returns distance from active (screen) camera to the planet terrain by screen coordinates.
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {number} -
     */
    public getDistanceFromPixel(px: Vec2 | IBaseInputState): number {
        return this.renderer!.getDistanceFromPixel(px) || this.getDistanceFromPixelEllipsoid(px) || 0;
    }

    /**
     * Sets camera to the planet geographical extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     */
    public viewExtent(extent: Extent) {
        if (this.camera) {
            this.camera.viewExtent(extent);
        } else {
            this._initialViewExtent = extent;
        }
    }

    /**
     * Fits camera position for the view extent.
     * @public
     * @param {Array.<number>} extentArr - Geographical extent array, (exactly 4 entries)
     * where index 0 - southwest longitude, 1 - latitude southwest, 2 - longitude northeast, 3 - latitude northeast.
     */
    public viewExtentArr(extentArr: NumberArray4) {
        this.viewExtent(new Extent(new LonLat(extentArr[0], extentArr[1]), new LonLat(extentArr[2], extentArr[3])));
    }

    /**
     * Gets current camera view extent.
     * @public
     * @returns {Extent} -
     */
    public getExtent(): Extent {
        if (this.renderer) {
            let w = this.renderer.handler.getWidth(),
                h = this.renderer.handler.getHeight();

            let extent = [
                this.getLonLatFromPixelTerrain(new Vec2(0, 0)),
                this.getLonLatFromPixelTerrain(new Vec2(w, 0)),
                this.getLonLatFromPixelTerrain(new Vec2(w, h)),
                this.getLonLatFromPixelTerrain(new Vec2(0, h))
            ];

            if (extent[0] && extent[1] && extent[2] && extent[3]) {
                let min_lon = extent[0].lon,
                    min_lat = extent[2].lat,
                    max_lon = extent[1].lon,
                    max_lat = extent[0].lat;

                for (let i = 0; i < extent.length; i++) {
                    if (extent[i]!.lon > max_lon) max_lon = extent[i]!.lon;
                    if (extent[i]!.lat > max_lat) max_lat = extent[i]!.lat;
                    if (extent[i]!.lon < min_lon) min_lon = extent[i]!.lon;
                    if (extent[i]!.lat < min_lat) min_lat = extent[i]!.lat;
                }

                return new Extent(new LonLat(min_lon, min_lat), new LonLat(max_lon, max_lat));
            }
        }

        return this.quadTreeStrategy._viewExtent;
    }

    /**
     * Returns currently cached quadtree view extent.
     * @public
     * @returns {Extent} - Cached view extent.
     */
    public getViewExtent(): Extent {
        return this.quadTreeStrategy._viewExtent;
    }

    /**
     * Sets camera to the planet geographical position.
     * @public
     * @param {LonLat} lonlat - Camera position.
     * @param {LonLat} [lookLonLat] - Viewpoint.
     * @param {Vec3} [up] - Camera up vector.
     */
    public viewLonLat(lonlat: LonLat, lookLonLat?: LonLat, up?: Vec3) {
        this.camera.setLonLat(lonlat, lookLonLat, up);
    }

    /**
     * Fly active camera to the view extent.
     * @public
     * @param {Extent} extent - Geographical extent.
     * @param {Number} [height] - Height on the end of the flight route.
     * @param {IPlanetFlyCartesianParams} params - Flight parameters.
     */
    public flyExtent(extent: Extent, height?: number, params: IPlanetFlyCartesianParams = {}) {
        this.camera.flyExtent(extent, height, params);
    }

    /**
     * Fly camera to the point.
     * @public
     * @param {Vec3} cartesian - Fly cartesian coordinates.
     * @param {IPlanetFlyCartesianParams} params - Flight parameters.
     */
    public flyCartesian(cartesian: Vec3, params?: IPlanetFlyCartesianParams) {
        this.camera.flyCartesian(cartesian, params);
    }

    /**
     * Fly camera to the geodetic position.
     * @public
     * @param {LonLat} lonlat - Fly geographical coordinates.
     * @param {IPlanetFlyCartesianParams} params - Flight parameters.
     */
    public flyLonLat(lonlat: LonLat, params: IPlanetFlyCartesianParams = {}) {
        this.camera.flyLonLat(lonlat, params);
    }

    /**
     * Stop current flight.
     * @public
     */
    public stopFlying() {
        this.camera.stopFlying();
    }

    /**
     * Refreshes billboard texture coordinates for all visible entity collections.
     * @public
     */
    public override updateBillboardsTexCoords() {
        for (let i = 0; i < this.entityCollections.length; i++) {
            this.entityCollections[i].billboardHandler.refreshTexCoordsArr();
        }

        let readyCollections: Record<number, boolean> = {};
        for (let i = 0; i < this._layers.length; i++) {
            let li = this._layers[i];
            if (li instanceof Vector) {
                (li as Vector).each(function (e: Entity) {
                    if (e._entityCollection && !readyCollections[e._entityCollection.id]) {
                        e._entityCollection.billboardHandler.refreshTexCoordsArr();
                        readyCollections[e._entityCollection.id] = true;
                    }
                });
            }
        }
    }

    /**
     * Finds terrain point under an entity in currently rendered segments.
     * @public
     * @param {Entity} entity - Entity to test.
     * @param {Vec3} res - Output vector for terrain point.
     * @returns {Vec3 | undefined} - Terrain point if found.
     */
    public getEntityTerrainPoint(entity: Entity, res: Vec3) {
        let n = this.quadTreeStrategy._renderedNodes,
            i = n.length;
        while (i--) {
            if (n[i].segment.isEntityInside(entity)) {
                return n[i].segment.getEntityTerrainPoint(entity, res);
            }
        }
    }

    /**
     * Returns terrain height at the given coordinates in default terrain datum.
     * @public
     * @param {LonLat} lonLat - Geodetic coordinates.
     * @returns {Promise<number>} - Height value.
     */
    public async getHeightDefault(lonLat: LonLat): Promise<number> {
        return new Promise<number>((resolve: (alt: number) => void) => {
            if (this.terrain) {
                this.terrain.getHeightAsync(lonLat.clone(), (alt: number) => {
                    resolve(alt);
                });
            } else {
                resolve(0);
            }
        });
    }

    /**
     * Returns terrain height above ellipsoid at the given coordinates.
     * @public
     * @param {LonLat} lonLat - Geodetic coordinates.
     * @returns {Promise<number>} - Height above ellipsoid.
     */
    public async getHeightAboveELL(lonLat: LonLat): Promise<number> {
        return new Promise<number>((resolve: (alt: number) => void) => {
            if (this.terrain) {
                this.terrain.getHeightAsync(lonLat.clone(), (alt: number) => {
                    resolve(alt + this.terrain!.geoid.getHeightLonLat(lonLat));
                });
            } else {
                resolve(0);
            }
        });
    }

    /**
     * Handles node detachment and frees runtime terrain data.
     * @public
     */
    public override onremove() {
        this.memClear();
        this.quadTreeStrategy.destroyBranches();
        this.quadTreeStrategy.clearRenderedNodes();
    }

    /**
     * Destroy planet.
     * @public
     */
    public override destroy() {
        this._terrainWorker.destroy();
        this._plainSegmentWorker.destroy();
        this.renderer?.destroy();
        this.onremove();
        super.destroy();
    }

    // function checkTerrainCollision(entity) {
    //     let _tempTerrPoint = new Vec3();
    //     let nodes = globus.planet._renderedNodes;
    //     for (let j = 0; j < nodes.length; j++) {
    //         let seg = nodes[j].segment;
    //         if (seg && seg._extentLonLat.isInside(entity.getLonLat())) {
    //             seg.getEntityTerrainPoint(entity, _tempTerrPoint);
    //             entity.setCartesian3v(_tempTerrPoint);
    //             break;
    //         }
    //     }
    // }
}

const PLANET_EVENTS: PlanetEventsList = [
    /**
     * Triggered before globe frame begins to render.
     * @event draw
     */
    "draw",

    /**
     * Triggered when a layer is added to the planet.
     * @event layeradd
     */
    "layeradd",

    /**
     * Triggered when the base layer changes.
     * @event baselayerchange
     */
    "baselayerchange",

    /**
     * Triggered when a layer is removed from the planet.
     * @event layerremove
     */
    "layerremove",

    /**
     * Triggered when layer visibility changes.
     * @event layervisibilitychange
     */
    "layervisibilitychange",

    /**
     * Triggered when all data is loaded.
     * @event rendercompleted
     */
    "rendercompleted",

    /**
     * Triggered when all terrain data is loaded.
     * @event terraincompleted
     */
    "terraincompleted",

    /**
     * Triggered when layer data finishes loading.
     * @event layerloadend
     */
    "layerloadend"
];
