import { Layer } from "./Layer";
import type { ILayerParams } from "./Layer";
import { Material } from "./Material";
import type { NumberArray4 } from "../math/Vec4";
import type { Node } from "../quadTree/Node";
import { Segment } from "../segment/Segment";

export interface IBaseTileMaterialLayerParams extends ILayerParams {
    minNativeZoom?: number;
    maxNativeZoom?: number;
}

/**
 * Shared tile material application for imagery/canvas tile layers.
 * It can be applied to any type of tiled data that can be displayed on the planet in either of these two ways, such as BUildings, vector tiles etc.
 */
export abstract class BaseTileMaterialLayer extends Layer {
    public minNativeZoom: number = 0;
    public maxNativeZoom: number = 50;

    constructor(name?: string | null, options: IBaseTileMaterialLayerParams = {}) {
        super(name, options);
        this.minNativeZoom = options.minNativeZoom ?? this.minNativeZoom;
        this.maxNativeZoom = options.maxNativeZoom ?? this.maxNativeZoom;
    }

    public override applyMaterial(material: Material, forceLoading: boolean = false): NumberArray4 {
        if (this.waitForParentMaterial) {
            return this._applyMaterialDefaultCore(material, forceLoading);
        }
        return this._applyMaterialFastCore(material, forceLoading);
    }

    protected _applyMaterialDefaultCore(material: Material, forceLoading: boolean = false): NumberArray4 {
        if (material.isReady) {
            this._onMaterialReady(material);
            return material.texOffset;
        } else if (material.segment.tileZoom < this.minNativeZoom) {
            material.textureNotExists();
        } else {
            const segment = material.segment;
            const layerId = this.__id;

            if (segment.passReady || this._allowsLoadWithoutPassReady()) {
                let node = segment.node;
                let targetNode: Node | null = null;

                while (node) {
                    const seg = node.segment;

                    if (seg.tileZoom <= this.maxNativeZoom) {
                        const mat = seg.materials[layerId];
                        if (!mat || !mat.isReady) {
                            targetNode = node;
                        }
                    }

                    node = node.parentNode!;
                }

                if (targetNode) {
                    const seg = targetNode.segment;
                    let mat = seg.materials[layerId];
                    if (!mat) {
                        mat = seg.materials[layerId] = this.createMaterial(seg);
                    }

                    if (!mat.isReady && !mat.isLoading) {
                        this._triggerDefaultMaterialLoad(mat, material, targetNode, forceLoading);
                    }
                }
            }

            this._applyReadyParentTexture(material, segment, layerId);
        }

        return material.texOffset;
    }

    protected _applyMaterialFastCore(material: Material, forceLoading: boolean = false): NumberArray4 {
        if (material.isReady) {
            this._onMaterialReady(material);
            return material.texOffset;
        } else if (material.segment.tileZoom < this.minNativeZoom) {
            material.textureNotExists();
        } else {
            const segment = material.segment;
            let pn = segment.node;
            let parentTextureExists = false;

            this._beforeFastMaterialParentWalk(material, segment, forceLoading);

            const mId = this.__id;
            let psegm = material;
            while (pn.parentNode) {
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
                if (psegm && this._hasParentMaterial(psegm)) {
                    parentTextureExists = true;
                    break;
                }
            }

            this._applyFastPassReadyLoading(material, segment, pn, forceLoading);

            if (parentTextureExists) {
                material.appliedNode = pn;
                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                const dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                material.texOffset[0] = segment.tileX * dZ2 - pn.segment.tileX;
                material.texOffset[1] = segment.tileY * dZ2 - pn.segment.tileY;
                material.texOffset[2] = dZ2;
                material.texOffset[3] = dZ2;
                this._onParentMaterialApplied(material, psegm);
            } else {
                this._applyNoParentMaterial(material, segment);
            }
        }

        return material.texOffset;
    }

    protected _applyReadyParentTexture(material: Material, segment: Segment, layerId: number) {
        let pn = segment.node;
        let psegm: Material | null = null;
        while (pn) {
            const pm = pn.segment.materials[layerId];
            if (pm && pm.isReady && this._hasParentMaterial(pm)) {
                psegm = pm;
                break;
            }
            pn = pn.parentNode!;
        }

        if (psegm && pn) {
            material.appliedNode = pn;
            material.appliedNodeId = pn.nodeId;
            material.texture = psegm.texture;
            const dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
            material.texOffset[0] = segment.tileX * dZ2 - pn.segment.tileX;
            material.texOffset[1] = segment.tileY * dZ2 - pn.segment.tileY;
            material.texOffset[2] = dZ2;
            material.texOffset[3] = dZ2;
            this._onParentMaterialApplied(material, psegm);
        } else {
            this._applyNoParentMaterial(material, segment);
        }
    }

    protected _allowsLoadWithoutPassReady(): boolean {
        return false;
    }

    protected _hasParentMaterial(psegm: Material): boolean {
        return psegm.textureExists;
    }

    protected _applyNoParentMaterial(material: Material, segment: Segment): void {
        material.texture = segment.planet.transparentTexture;
        material.texOffset[0] = 0.0;
        material.texOffset[1] = 0.0;
        material.texOffset[2] = 1.0;
        material.texOffset[3] = 1.0;
    }

    protected _onMaterialReady(_material: Material): void {}

    protected _onParentMaterialApplied(_material: Material, _psegm: Material): void {}

    protected _beforeFastMaterialParentWalk(material: Material, segment: Segment, forceLoading: boolean): void {
        if (
            (segment.passReady || this._allowsLoadWithoutPassReady()) &&
            !material.isLoading &&
            segment.tileZoom <= this.maxNativeZoom
        ) {
            this.loadMaterial(material, forceLoading);
        }
    }

    protected _applyFastPassReadyLoading(material: Material, segment: Segment, pn: Node, forceLoading: boolean): void {
        if (!segment.passReady) {
            return;
        }

        const maxNativeZoom = this.maxNativeZoom;

        if (pn.segment.tileZoom === maxNativeZoom) {
            this._fastWhenWalkerAtMaxNativeZoom(material, segment);
            return;
        }

        if (pn.segment.tileZoom < maxNativeZoom) {
            this._fastLoadParentAtMaxNativeZoom(material, segment, maxNativeZoom);
        }
    }

    /** pn from parent walk is at maxNativeZoom. */
    protected _fastWhenWalkerAtMaxNativeZoom(material: Material, segment: Segment): void {
        if (segment.tileZoom > this.maxNativeZoom) {
            material.textureNotExists();
        }
    }

    protected _fastLoadParentAtMaxNativeZoom(material: Material, segment: Segment, maxNativeZoom: number): void {
        let pn = segment.node;
        while (pn.segment.tileZoom > maxNativeZoom) {
            pn = pn.parentNode!;
        }
        let pnm = pn.segment.materials[this.__id];
        if (pnm) {
            !pnm.isLoading && !pnm.isReady && this.loadMaterial(pnm, true);
        } else {
            pnm = pn.segment.materials[material.layer.__id] = material.layer.createMaterial(pn.segment);
            this.loadMaterial(pnm, true);
        }
    }

    protected _triggerDefaultMaterialLoad(
        mat: Material,
        material: Material,
        targetNode: Node,
        forceLoading: boolean
    ): void {
        this.loadMaterial(mat, this._defaultMaterialLoadForce(mat, material, targetNode, forceLoading));
    }

    protected _defaultMaterialLoadForce(
        _mat: Material,
        material: Material,
        targetNode: Node,
        forceLoading: boolean
    ): boolean {
        return targetNode === material.segment.node ? forceLoading : true;
    }

    public override clearMaterial(material: Material) {
        if (material.isReady && material.textureExists && material.texture && !material.texture.default) {
            material.segment.handler.gl!.deleteTexture(material.texture);
            material.texture = null;
        }

        this.abortMaterialLoading(material);

        material.isReady = false;
        material.textureExists = false;
        material.isLoading = false;

        //@ts-ignore
        material.layer = null;
        //@ts-ignore
        material.segment = null;

        // if (material.image) {
        //     material.image.src = "";
        //     material.image = null;
        // }
    }
}
