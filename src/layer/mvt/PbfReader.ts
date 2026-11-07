/**
 * Protobuf wire types.
 * https://protobuf.dev/programming-guides/encoding/#structure
 */
export const PBF_VARINT = 0;
export const PBF_FIXED64 = 1;
export const PBF_BYTES = 2;
export const PBF_FIXED32 = 5;

const SHIFT_LEFT_32 = 4294967296;

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

/**
 * Minimal protobuf decoder, enough to read Mapbox Vector Tiles.
 * Integers above 2^53 lose precision, because values are returned as numbers.
 * @class
 * @param {ArrayBuffer | Uint8Array} buf - Encoded message.
 */
export class PbfReader {
    public buf: Uint8Array;

    public pos: number;

    public length: number;

    /**
     * Wire type of the last read field tag.
     * @public
     * @type {number}
     */
    public type: number;

    protected _view: DataView;

    constructor(buf: ArrayBuffer | Uint8Array) {
        this.buf = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        this._view = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength);
        this.pos = 0;
        this.length = this.buf.length;
        this.type = 0;
    }

    /**
     * Reads message fields until the end position, calling readField for every field tag.
     * Fields that readField doesn't consume must be skipped by it with `pbf.skip()`.
     * @public
     * @param {function} readField - Field callback (tag, result, pbf).
     * @param {T} result - Object passed to the callback.
     * @param {number} [end] - End position, default is the buffer end.
     * @returns {T} -
     */
    public readFields<T>(
        readField: (tag: number, result: T, pbf: PbfReader) => void,
        result: T,
        end: number = this.length
    ): T {
        while (this.pos < end) {
            const val = this.readVarint();
            const tag = val >> 3;
            const startPos = this.pos;
            this.type = val & 0x7;
            readField(tag, result, this);
            if (this.pos === startPos) {
                this.skip(this.type);
            }
        }
        return result;
    }

    /**
     * Reads an embedded length-delimited message.
     * @public
     */
    public readMessage<T>(readField: (tag: number, result: T, pbf: PbfReader) => void, result: T): T {
        const end = this.readVarint() + this.pos;
        return this.readFields(readField, result, end);
    }

    /**
     * Reads a varint.
     * @public
     * @param {boolean} [isSigned=false] - Read it as a two's complement int64, otherwise as unsigned.
     * @returns {number} -
     */
    public readVarint(isSigned: boolean = false): number {
        const buf = this.buf;
        let b = buf[this.pos++];
        let low = b & 0x7f;
        if (b < 0x80) return low;
        b = buf[this.pos++];
        low |= (b & 0x7f) << 7;
        if (b < 0x80) return low;
        b = buf[this.pos++];
        low |= (b & 0x7f) << 14;
        if (b < 0x80) return low;
        b = buf[this.pos++];
        low |= (b & 0x7f) << 21;
        if (b < 0x80) return low;

        // Bits 28..63 are split between the fifth byte and the rest
        b = buf[this.pos++];
        low = (low | ((b & 0x0f) << 28)) >>> 0;
        let high = (b & 0x70) >> 4;
        if (b < 0x80) return high * SHIFT_LEFT_32 + low;

        let shift = 3;
        for (let i = 0; i < 5; i++) {
            b = buf[this.pos++];
            high |= (b & 0x7f) << shift;
            if (b < 0x80) return (isSigned ? high : high >>> 0) * SHIFT_LEFT_32 + low;
            shift += 7;
        }

        throw new Error("Expected varint not more than 10 bytes");
    }

    /**
     * Reads a zigzag encoded varint (sint32, sint64).
     * @public
     */
    public readSVarint(): number {
        const n = this.readVarint();
        return n % 2 === 1 ? (n + 1) / -2 : n / 2;
    }

    public readBoolean(): boolean {
        return Boolean(this.readVarint());
    }

    public readFixed32(): number {
        const val = this._view.getUint32(this.pos, true);
        this.pos += 4;
        return val;
    }

    public readSFixed32(): number {
        const val = this._view.getInt32(this.pos, true);
        this.pos += 4;
        return val;
    }

    public readFixed64(): number {
        const val = this._view.getUint32(this.pos, true) + this._view.getUint32(this.pos + 4, true) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    }

    public readSFixed64(): number {
        const val = this._view.getUint32(this.pos, true) + this._view.getInt32(this.pos + 4, true) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    }

    public readFloat(): number {
        const val = this._view.getFloat32(this.pos, true);
        this.pos += 4;
        return val;
    }

    public readDouble(): number {
        const val = this._view.getFloat64(this.pos, true);
        this.pos += 8;
        return val;
    }

    public readBytes(): Uint8Array {
        const end = this.readVarint() + this.pos;
        const bytes = this.buf.subarray(this.pos, end);
        this.pos = end;
        return bytes;
    }

    public readString(): string {
        const bytes = this.readBytes();
        return textDecoder ? textDecoder.decode(bytes) : decodeUtf8(bytes);
    }

    public skip(type: number) {
        if (type === PBF_VARINT) {
            while (this.buf[this.pos++] > 0x7f) {}
        } else if (type === PBF_BYTES) {
            this.pos = this.readVarint() + this.pos;
        } else if (type === PBF_FIXED32) {
            this.pos += 4;
        } else if (type === PBF_FIXED64) {
            this.pos += 8;
        } else {
            throw new Error(`Unimplemented protobuf wire type: ${type}`);
        }
    }
}

function decodeUtf8(bytes: Uint8Array): string {
    let str = "";
    let i = 0;
    while (i < bytes.length) {
        const b0 = bytes[i++];
        let c: number;
        if (b0 < 0x80) {
            c = b0;
        } else if (b0 < 0xe0) {
            c = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f);
        } else if (b0 < 0xf0) {
            c = ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        } else {
            c = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        }
        str += String.fromCodePoint(c);
    }
    return str;
}
