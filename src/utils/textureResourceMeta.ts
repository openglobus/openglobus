export const OG_TEXTURE_RESOURCE_META_KEY = Symbol.for("openglobus.textureResourceMeta");

export interface ITextureResourceMeta {
    resourceKey?: string;
    sourceUri?: string;
    mimeType?: string;
    byteLength?: number;
}

type TextureResourceMetaContainer = Record<PropertyKey, unknown>;

export function getTextureResourceMeta(target: object | null | undefined): ITextureResourceMeta | undefined {
    if (!target) {
        return undefined;
    }

    return (target as TextureResourceMetaContainer)[OG_TEXTURE_RESOURCE_META_KEY] as
        | ITextureResourceMeta
        | undefined;
}

export function setTextureResourceMeta(target: object | null | undefined, meta: ITextureResourceMeta | undefined): void {
    if (!target) {
        return;
    }

    const container = target as TextureResourceMetaContainer;
    if (!meta) {
        delete container[OG_TEXTURE_RESOURCE_META_KEY];
        return;
    }

    Object.defineProperty(container, OG_TEXTURE_RESOURCE_META_KEY, {
        value: meta,
        writable: true,
        configurable: true,
        enumerable: false
    });
}
