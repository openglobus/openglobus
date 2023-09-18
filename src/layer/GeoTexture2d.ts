import {BaseGeoImage, IBaseGeoImageParams} from './BaseGeoImage';
import {Material} from "../layer/Material";
import {nextHighestPowerOfTwo} from '../math';
import {WebGLTextureExt} from "../webgl/Handler";

interface IGeoTexture2dParams extends IBaseGeoImageParams {
    texture?: WebGLTextureExt;
    frameWidth?: number;
    frameHeight?: number;
}

class GeoTexture2d extends BaseGeoImage {
    constructor(name: string | null, options: IGeoTexture2dParams = {}) {
        super(name, options);

        this._sourceTexture = options.texture || null;

        if (options.texture) {
            this._sourceReady = true;
            this._sourceCreated = true;
        }

        this._frameWidth = options.frameWidth != undefined ? nextHighestPowerOfTwo(options.frameWidth!) : 256;
        this._frameHeight = options.frameHeight != undefined ? nextHighestPowerOfTwo(options.frameHeight!) : 256;

        this._animate = true;
    }

    public override get instanceName(): string {
        return "GeoTexture2d";
    }

    public override loadMaterial(material: Material) {
        this._planet!._geoImageCreator.add(this);
    }

    public bindTexture(texture: WebGLTextureExt) {
        this._sourceReady = true;
        this._sourceCreated = true;
        this._sourceTexture = texture;
    }

    public setSize(width: number, height: number) {
        this._frameWidth = width;
        this._frameHeight = height;
        this._frameCreated = false;
    }

    public override abortMaterialLoading(material: Material) {
        this._creationProceeding = false;
        material.isLoading = false;
        material.isReady = false;
    }
}

export {GeoTexture2d};
