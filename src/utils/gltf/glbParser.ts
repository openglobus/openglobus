import { GltfData, GltfMetadata } from "./types";

interface GlbChunk {
    length: number;
    type: ChunkType;
    chunkData: ArrayBuffer;
}

enum ChunkType {
    JSON,
    BIN,
    INVALID
}

export class Glb {
    public static async load(src: string): Promise<GltfData> {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Unable to load '${src}'`);
        }

        const buffer = await response.arrayBuffer();

        const dv = new DataView(buffer);
        const magic = dv.getUint32(0, true);

        if (magic !== 0x46546c67) {
            throw new Error("Not a valid GLB");
        }
        const version = dv.getUint32(4, true);
        const chunks = this.getChunks(dv);
        return this.parseChunks(chunks);
    }

    private static getChunks(dv: DataView): GlbChunk[] {
        const chunks: GlbChunk[] = [];
        let currentOffset = 12; // skip magic, version and total length
        do {
            const chunk = this.getChunk(dv, currentOffset);
            currentOffset += 8 + chunk.length;
            chunks.push(chunk);
        } while (currentOffset < dv.byteLength);
        return chunks;
    }

    private static getChunk(dv: DataView, offset: number): GlbChunk {
        const length = dv.getUint32(offset, true);
        const type = this.getChunkType(dv.getUint32(offset + 4, true));
        const chunkData = dv.buffer.slice(offset + 8, offset + 8 + length);
        return { length, type, chunkData };
    }

    private static getChunkType(type: number): ChunkType {
        switch (type) {
            case 0x4e4f534a:
                return ChunkType.JSON;
            case 0x004e4942:
                return ChunkType.BIN;
            default:
                return ChunkType.INVALID;
        }
    }

    private static parseChunks(chunks: GlbChunk[]): GltfData {
        let gltf: GltfMetadata | undefined, bin: ArrayBuffer[] = [];
        for (const chunk of chunks) {
            switch (chunk.type) {
                case ChunkType.JSON:
                    gltf = this.parseJsonChunk(chunk);
                    break;
                case ChunkType.BIN:
                    bin.push(chunk.chunkData);
                    break;
                default:
                    break;
            }
        }
        if (gltf === undefined) {
            throw new Error('GLB json data extraction failed');
        }
        return {
            gltf,
            bin
        };
    }

    private static parseJsonChunk(chunk: GlbChunk): GltfMetadata {
        return JSON.parse(new TextDecoder().decode(chunk.chunkData));
    }
}
