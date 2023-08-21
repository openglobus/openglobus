import {Layer} from "./Layer";
import {Segment} from "../segment/Segment";
import {WebGLTextureExt} from "../webgl/Handler";
import {NumberArray4} from "../math/Vec4";

/**
 * @class Material
 * @param {Segment} segment
 * @param {Layer} layer
 */
class Material {

    public segment: Segment;
    public layer: Layer;
    public isReady: boolean;
    public isLoading: boolean;
    public texture: WebGLTextureExt | null;
    public pickingMask: WebGLTextureExt | null;

    public textureExists: boolean;
    public appliedNodeId: number;
    public appliedNode: Node | null;
    public texOffset: NumberArray4;
    public loadingAttempts: number;

    // vector data
    public _updateTexture: WebGLTextureExt | null;
    public _updatePickingMask: WebGLTextureExt | null;
    public pickingReady: boolean;

    constructor(segment: Segment, layer: Layer) {
        this.segment = segment;
        this.layer = layer;
        this.isReady = false;
        this.isLoading = false;
        this.texture = null;
        this.pickingMask = null;

        this.textureExists = false;
        this.appliedNodeId = 0;
        this.appliedNode = null;
        this.texOffset = [0.0, 0.0, 1.0, 1.0];
        this.loadingAttempts = 0;

        this._updateTexture = null;
        this._updatePickingMask = null;
        this.pickingReady = false;
    }

    public abortLoading() {
        this.layer.abortMaterialLoading(this);
    }

    public _createTexture(img: HTMLCanvasElement | ImageBitmap | HTMLImageElement) {
        return this.layer._planet && this.layer.createTexture(img, this.layer._internalFormat, this.isReady ? this.texture : null);
    }

    public applyImage(img: HTMLCanvasElement | ImageBitmap | HTMLImageElement) {
        if (this.segment.initialized) {
            this._updateTexture = null;
            //this.image = img;
            this.texture = this._createTexture(img);
            this.isReady = true;
            this.pickingReady = true;
            this.textureExists = true;
            this.isLoading = false;
            this.appliedNodeId = this.segment.node.nodeId;
            this.texOffset = [0.0, 0.0, 1.0, 1.0];
        }
    }

    public applyTexture(texture: WebGLTextureExt, pickingMask?: WebGLTextureExt) {
        if (this.segment.initialized) {
            this.texture = texture;
            this._updateTexture = null;
            this.pickingMask = pickingMask || null;
            this._updatePickingMask = null;
            this.isReady = true;
            this.pickingReady = true;
            this.textureExists = true;
            this.isLoading = false;
            this.appliedNodeId = this.segment.node.nodeId;
            this.texOffset = [0.0, 0.0, 1.0, 1.0];
        }
    }

    public textureNotExists() {
        if (this.segment.initialized) {
            this.pickingReady = true;
            this.isLoading = false;
            this.isReady = true;
            this.textureExists = false;
        }
    }

    public clear() {
        this.loadingAttempts = 0;
        this.layer.clearMaterial(this);
    }
}

export {Material};
