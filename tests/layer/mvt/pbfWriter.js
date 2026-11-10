// Minimal protobuf encoder for building vector tiles in tests

export class PbfWriter {
    constructor() {
        this.bytes = [];
    }

    varint(n) {
        let v = BigInt.asUintN(64, BigInt(n));
        do {
            let b = Number(v & 0x7fn);
            v >>= 7n;
            if (v) b |= 0x80;
            this.bytes.push(b);
        } while (v);
        return this;
    }

    tag(field, type) {
        return this.varint((field << 3) | type);
    }

    varintField(field, n) {
        return this.tag(field, 0).varint(n);
    }

    svarintField(field, n) {
        const v = BigInt(n);
        return this.tag(field, 0).varint(v >= 0n ? v * 2n : -v * 2n - 1n);
    }

    bytesField(field, arr) {
        this.tag(field, 2).varint(arr.length);
        this.bytes.push(...arr);
        return this;
    }

    stringField(field, s) {
        return this.bytesField(field, [...new TextEncoder().encode(s)]);
    }

    packedField(field, nums) {
        const w = new PbfWriter();
        nums.forEach((n) => w.varint(n));
        return this.bytesField(field, w.bytes);
    }

    floatField(field, f) {
        const dv = new DataView(new ArrayBuffer(4));
        dv.setFloat32(0, f, true);
        this.tag(field, 5);
        this.bytes.push(...new Uint8Array(dv.buffer));
        return this;
    }

    doubleField(field, d) {
        const dv = new DataView(new ArrayBuffer(8));
        dv.setFloat64(0, d, true);
        this.tag(field, 1);
        this.bytes.push(...new Uint8Array(dv.buffer));
        return this;
    }

    messageField(field, fn) {
        const w = new PbfWriter();
        fn(w);
        return this.bytesField(field, w.bytes);
    }

    finish() {
        return new Uint8Array(this.bytes);
    }
}

export const zigzag = (n) => (n << 1) ^ (n >> 31);

export const command = (id, count) => (id & 7) | (count << 3);

/**
 * Encodes a vector tile.
 * @param {Array} layers - [{ name, extent, features: [{ id, type, properties, geometry }] }],
 * geometry is a raw command integer array.
 */
export function encodeTile(layers) {
    const tile = new PbfWriter();

    for (const layer of layers) {
        tile.messageField(3, (lw) => {
            const keys = [];
            const values = [];

            const featureTags = layer.features.map((f) => {
                const tags = [];
                for (const [k, v] of Object.entries(f.properties || {})) {
                    let ki = keys.indexOf(k);
                    if (ki === -1) ki = keys.push(k) - 1;
                    values.push(v);
                    tags.push(ki, values.length - 1);
                }
                return tags;
            });

            lw.varintField(15, layer.version ?? 2);
            lw.stringField(1, layer.name);

            layer.features.forEach((f, i) => {
                lw.messageField(2, (fw) => {
                    if (f.id !== undefined) fw.varintField(1, f.id);
                    if (featureTags[i].length) fw.packedField(2, featureTags[i]);
                    fw.varintField(3, f.type);
                    fw.packedField(4, f.geometry);
                });
            });

            keys.forEach((k) => lw.stringField(3, k));

            values.forEach((v) => {
                lw.messageField(4, (vw) => {
                    if (typeof v === "string") vw.stringField(1, v);
                    else if (typeof v === "boolean") vw.varintField(7, v ? 1 : 0);
                    else if (v.float !== undefined) vw.floatField(2, v.float);
                    else if (v.double !== undefined) vw.doubleField(3, v.double);
                    else if (v.int !== undefined) vw.varintField(4, v.int);
                    else if (v.uint !== undefined) vw.varintField(5, v.uint);
                    else if (v.sint !== undefined) vw.svarintField(6, v.sint);
                });
            });

            if (layer.extent !== undefined) lw.varintField(5, layer.extent);

            // Unknown field, must be skipped
            lw.varintField(9, 12345);
        });
    }

    return tile.finish();
}
