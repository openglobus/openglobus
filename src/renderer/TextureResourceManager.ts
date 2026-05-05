import type { Handler, ImageSource, WebGLTextureExt } from "../webgl/Handler";

interface TextureResourceEntry {
    key: string;
    texture: WebGLTextureExt;
    refCount: number;
}

export interface RendererTextureRequest {
    image: ImageSource;
    internalFormat?: number | null;
    texParami?: number | null;
}

function toKeyField(name: string, value: string | number | null | undefined): string {
    if (value === undefined || value === null || value === "") {
        return `${name}:none`;
    }
    return `${name}:${value}`;
}

export class TextureResourceManager {
    protected _handler: Handler;
    protected _entriesByKey: Map<string, TextureResourceEntry> = new Map();
    protected _keysByTexture: Map<WebGLTextureExt, string> = new Map();

    constructor(handler: Handler) {
        this._handler = handler;
    }

    public getTexture(params: RendererTextureRequest): WebGLTextureExt | null {
        const key = this._buildResourceKey(params);
        const existing = this._entriesByKey.get(key);
        if (existing) {
            // Reuse already-uploaded GPU texture for the same resource key.
            existing.refCount++;
            return existing.texture;
        }

        const texture = this._handler.createTextureDefault(
            params.image,
            params.internalFormat,
            params.texParami,
            undefined
        );

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
        if (!key) {
            console.warn("Trying to release unmanaged texture", key);
            this._handler.deleteTexture(texture);
            return;
        }

        const entry = this._entriesByKey.get(key);
        if (!entry) {
            console.warn("Trying to release unmanaged texture", entry, key);
            this._keysByTexture.delete(texture);
            this._handler.deleteTexture(texture);
            return;
        }

        entry.refCount--;
        if (entry.refCount <= 0) {
            // Physical GPU deletion happens only when the last owner releases the texture.
            this._entriesByKey.delete(key);
            this._keysByTexture.delete(texture);
            this._handler.deleteTexture(texture);
        }
    }

    public clear(): void {
        for (const entry of this._entriesByKey.values()) {
            this._handler.deleteTexture(entry.texture);
        }
        this._entriesByKey.clear();
        this._keysByTexture.clear();
    }

    public getEntryCount(): number {
        return this._entriesByKey.size;
    }

    protected _buildResourceKey(params: RendererTextureRequest): string {
        const parts: string[] = [toKeyField("fmt", params.internalFormat), toKeyField("wrap", params.texParami)];

        const uri = this._getExternalImageUri(params.image);
        if (uri) {
            parts.unshift(`uri:${uri}`);
            return parts.join("|");
        }

        const fingerprint = this._fingerprintImage(params.image);
        if (fingerprint) {
            parts.unshift(`fp:${fingerprint.hash}`);
            parts.push(toKeyField("len", fingerprint.byteLength));
            return parts.join("|");
        }

        const size = this._getImageSize(params.image);
        if (size) {
            parts.unshift(`size:${size.width}x${size.height}`);
        } else {
            parts.unshift("size:none");
        }

        return parts.join("|");
    }

    protected _getExternalImageUri(image: ImageSource): string | null {
        if (!(image instanceof HTMLImageElement)) {
            return null;
        }

        const src = image.src?.trim();
        if (!src || src.startsWith("blob:")) {
            return null;
        }

        try {
            const base =
                typeof window !== "undefined" && window.location?.href ? window.location.href : "http://localhost/";
            const normalized = new URL(src, base);
            normalized.hash = "";
            normalized.protocol = normalized.protocol.toLowerCase();
            normalized.hostname = normalized.hostname.toLowerCase();
            return normalized.href;
        } catch {
            return src;
        }
    }

    protected _fingerprintImage(image: ImageSource): { hash: string; byteLength: number } | null {
        if (image instanceof ImageData) {
            return {
                hash: this._fnv1a32(image.data),
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
                hash: this._fnv1a32(imageData.data),
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

    protected _fnv1a32(bytes: Uint8ClampedArray | Uint8Array): string {
        let hash = 0x811c9dc5;
        for (let i = 0; i < bytes.length; i++) {
            hash ^= bytes[i];
            hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }
}
