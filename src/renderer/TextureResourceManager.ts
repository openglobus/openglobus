import type { Handler, ImageSource, WebGLTextureExt } from "../webgl/Handler";
import { fnv1a32, normalizeUri } from "../utils/shared";
import { getTextureResourceMeta } from "../utils/textureResourceMeta";

interface TextureResourceEntry {
    key: string;
    texture: WebGLTextureExt;
    refCount: number;
}

export interface RendererTextureRequest {
    image: ImageSource;
    resourceKey?: string;
    sourceUri?: string;
    mimeType?: string;
    byteLength?: number;
    internalFormat?: number | null;
    texParami?: number | null;
}

function toKeyField(name: string, value: string | number | null | undefined): string {
    if (value === undefined || value === null || value === "") {
        return `${name}:default`;
    }
    return `${name}:${value}`;
}

export class TextureResourceManager {
    protected _handler: Handler;
    protected _entriesByKey: Map<string, TextureResourceEntry> = new Map();
    protected _keysByTexture: WeakMap<WebGLTextureExt, string> = new WeakMap();
    protected _objectKeys: WeakMap<ImageSource, number> = new WeakMap();
    protected _objectKeyCounter: number = 0;

    constructor(handler: Handler) {
        this._handler = handler;
    }

    public acquireTexture(params: RendererTextureRequest): WebGLTextureExt | null {
        const key = this._buildResourceKey(params);
        const existing = this._entriesByKey.get(key);
        if (existing) {
            // Reuse already-uploaded GPU texture for the same resource key.
            existing.refCount++;
            return existing.texture;
        }

        const texture = this._handler.createTextureDefault(params.image, params.internalFormat, params.texParami);

        if (!texture) {
            return null;
        }

        this._entriesByKey.set(key, {
            key,
            texture,
            refCount: 1
        });
        this._keysByTexture.set(texture, key);

        return texture;
    }

    public releaseTexture(texture: WebGLTextureExt | null | undefined): void {
        if (!texture) {
            return;
        }

        const key = this._keysByTexture.get(texture);
        // Do not touch unmanaged textures.
        if (!key) {
            return;
        }

        const entry = this._entriesByKey.get(key);
        if (!entry) {
            this._keysByTexture.delete(texture);
            return;
        }

        entry.refCount--;
        if (entry.refCount <= 0) {
            // Physical GPU deletion happens only when the last owner releases the texture.
            this._entriesByKey.delete(key);
            this._keysByTexture.delete(texture);
            this._handler.deleteTexture(entry.texture);
        }
    }

    public clear(): void {
        for (const entry of this._entriesByKey.values()) {
            this._handler.deleteTexture(entry.texture);
        }
        this._entriesByKey.clear();
        this._keysByTexture = new WeakMap();
    }

    public getEntryCount(): number {
        return this._entriesByKey.size;
    }

    public getStats(): { entries: number; refs: number } {
        let refs = 0;
        for (const entry of this._entriesByKey.values()) {
            refs += entry.refCount;
        }
        return {
            entries: this._entriesByKey.size,
            refs
        };
    }

    protected _buildResourceKey(params: RendererTextureRequest): string {
        const imageMeta = getTextureResourceMeta(params.image);
        const resourceKey = params.resourceKey ?? imageMeta?.resourceKey;
        const sourceUri = params.sourceUri ?? imageMeta?.sourceUri;
        const mimeType = params.mimeType ?? imageMeta?.mimeType;
        const byteLength = params.byteLength ?? imageMeta?.byteLength;

        const gpuParts: string[] = [toKeyField("fmt", params.internalFormat), toKeyField("wrap", params.texParami)];

        if (resourceKey) {
            return [`res:${resourceKey}`, ...gpuParts].join("|");
        }

        const metaParts: string[] = [toKeyField("mime", mimeType), toKeyField("len", byteLength)];

        const uri = sourceUri ? normalizeUri(sourceUri) : this._getExternalImageUri(params.image);
        if (uri) {
            return [`uri:${uri}`, ...metaParts, ...gpuParts].join("|");
        }

        // Content fingerprint is an expensive fallback path:
        // it may trigger canvas readback and can fail for cross-origin images.
        // GLTF/GLB should normally provide resourceKey/URI earlier in the pipeline.
        const fingerprint = this._fingerprintImage(params.image);
        if (fingerprint) {
            const resolvedByteLength = byteLength ?? fingerprint.byteLength;
            return [
                `fp:${fingerprint.hash}`,
                toKeyField("mime", mimeType),
                toKeyField("len", resolvedByteLength),
                ...gpuParts
            ].join("|");
        }

        // Last-resort fallback: unique key per source object identity.
        // This avoids accidental sharing when URI and content fingerprint are unavailable.
        return [`obj:${this._getObjectKey(params.image)}`, ...metaParts, ...gpuParts].join("|");
    }

    protected _getObjectKey(image: ImageSource): number {
        const existing = this._objectKeys.get(image);
        if (existing !== undefined) {
            return existing;
        }

        const key = ++this._objectKeyCounter;
        this._objectKeys.set(image, key);
        return key;
    }

    protected _getExternalImageUri(image: ImageSource): string | null {
        if (!(image instanceof HTMLImageElement)) {
            return null;
        }

        const src = image.src?.trim();
        if (!src || src.startsWith("blob:")) {
            return null;
        }

        return normalizeUri(src);
    }

    protected _fingerprintImage(image: ImageSource): { hash: string; byteLength: number } | null {
        if (image instanceof ImageData) {
            return {
                hash: fnv1a32(image.data),
                byteLength: image.data.byteLength
            };
        }

        const size = this._getImageSize(image);
        if (!size) {
            return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return null;
        }

        try {
            ctx.drawImage(image as CanvasImageSource, 0, 0, size.width, size.height);
            const imageData = ctx.getImageData(0, 0, size.width, size.height);
            return {
                hash: fnv1a32(imageData.data),
                byteLength: imageData.data.byteLength
            };
        } catch {
            return null;
        }
    }

    protected _getImageSize(image: ImageSource): { width: number; height: number } | null {
        if (image instanceof ImageData) {
            return { width: image.width, height: image.height };
        }

        const htmlImage = image as HTMLImageElement;
        const width = htmlImage.naturalWidth || (image as any).width;
        const height = htmlImage.naturalHeight || (image as any).height;
        if (!width || !height) {
            return null;
        }
        return { width, height };
    }
}
