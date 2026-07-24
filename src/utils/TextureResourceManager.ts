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

import type { Handler, ImageSource, WebGLTextureExt } from "../webgl/Handler";
import { fnv1a32, normalizeUri } from "./shared";
import { getTextureResourceMeta } from "./textureResourceMeta";

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

/**
 * Converts a nullable key component into a stable string field.
 *
 * Used by texture resource keys to make absent/default GPU parameters explicit.
 *
 * Examples:
 * - toKeyField("fmt", undefined) => "fmt:default"
 * - toKeyField("wrap", null) => "wrap:default"
 * - toKeyField("mime", "image/png") => "mime:image/png"
 *
 * The "default" value means that the texture will be created using the
 * default behavior of Handler.createTextureDefault(...) for this parameter.
 */
function toKeyField(name: string, value: string | number | null | undefined): string {
    if (value === undefined || value === null || value === "") {
        return `${name}:default`;
    }
    return `${name}:${value}`;
}

/**
 * Manages shared WebGL textures with reference counting.
 * Reuses textures for the same resource key and deletes them when no owners remain.
 */
export class TextureResourceManager {
    protected _handler: Handler;
    protected _entriesByKey: Map<string, TextureResourceEntry> = new Map();
    protected _keysByTexture: WeakMap<WebGLTextureExt, string> = new WeakMap();
    protected _objectKeys: WeakMap<ImageSource, number> = new WeakMap();
    protected _objectKeyCounter: number = 0;

    /**
     * @param handler WebGL handler used to create and delete textures.
     */
    constructor(handler: Handler) {
        this._handler = handler;
    }

    /**
     * Returns an existing texture for the same resource or creates a new one.
     * Increases reference count for reused textures.
     * @param params Texture source and GPU creation parameters.
     * @returns Managed WebGL texture or null if creation failed.
     */
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

    /**
     * Releases one texture reference.
     * Deletes GPU texture only when the reference count reaches zero.
     * @param texture Managed texture previously returned by acquireTexture.
     */
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

    /**
     * Deletes all managed GPU textures and clears manager state.
     */
    public clear(): void {
        for (const entry of this._entriesByKey.values()) {
            this._handler.deleteTexture(entry.texture);
        }
        this._entriesByKey.clear();
        this._keysByTexture = new WeakMap();
    }

    /**
     * Returns number of unique managed texture entries.
     * @returns Number of entries in the manager.
     */
    public getEntryCount(): number {
        return this._entriesByKey.size;
    }

    /**
     * Returns debug statistics for managed textures.
     * @returns Object with number of entries and total reference count.
     */
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

    /**
     * Builds a stable texture resource key.
     *
     * The key is composed of two logical parts:
     *
     * 1. Source image identity
     *    Describes where the original image comes from or how it can be uniquely identified.
     *
     *    Supported prefixes:
     *
     *    - res:
     *      A precomputed resource key provided by the GLTF parser.
     *      This is the preferred path for GLTF/GLB textures.
     *
     *      Example:
     *      res:gltf-image|bytes:9a4c1f20|mime:image/png|len:24576
     *
     *    - uri:
     *      A normalized external image URI.
     *      Used when the texture comes from an external image file.
     *      The URI should be resolved relative to the GLTF file path.
     *
     *      Example:
     *      uri:https://example.com/models/tree/textures/baseColor.png
     *
     *    - fp:
     *      A content fingerprint calculated from image pixels.
     *      This is an expensive fallback path because it may require canvas readback.
     *      It can also fail for cross-origin images.
     *
     *      Example:
     *      fp:7f21ab09
     *
     *    - obj:
     *      A last-resort object identity key.
     *      Used only when no resourceKey, URI, or content fingerprint is available.
     *      This avoids accidental sharing between unrelated images.
     *
     *      Example:
     *      obj:3
     *
     * 2. GPU texture creation parameters.
     *    Describes how the source image is uploaded to WebGL.
     *    The same source image may require different GPU textures if creation parameters differ.
     *
     *    Supported fields:
     *
     *    - fmt:
     *      Internal texture format passed to Handler.createTextureDefault(...).
     *      If absent, "fmt:default" means the default internal format is used.
     *
     *      Example:
     *      fmt:default
     *      fmt:6408
     *
     *    - wrap:
     *      Texture wrapping/filtering parameter passed to Handler.createTextureDefault(...).
     *      If absent, "wrap:default" means the default texture parameter is used.
     *
     *      Example:
     *      wrap:default
     *      wrap:10497
     *
     *    - mime:
     *      MIME type of the original image, if available.
     *      Used as an additional discriminator and for debugging.
     *
     *      Example:
     *      mime:image/png
     *
     *    - len:
     *      Original image byte length, if available.
     *      Used as an additional cheap discriminator, but not as the primary identity.
     *
     *      Example:
     *      len:24576
     *
     * Important:
     *
     * - GLTF texture/image name is intentionally not used as a primary identity key.
     *   Names may be missing, duplicated, or different for the same binary image.
     *
     * - The preferred identity source is resourceKey from the GLTF parser.
     *
     * - The fallback order is:
     *   resourceKey -> normalized URI -> content fingerprint -> object identity.
     *
     * - The final key must distinguish not only the source image, but also the GPU upload
     *   parameters that may affect the resulting WebGLTexture.
     */
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
