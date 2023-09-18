/**
 * @module og/segment/SegmentHelper
 */

import {N, W, S, E} from '../quadTree/quadTree';

type IndexTypeArray = Uint32Array;
type IndexesTable = [IndexTypeArray[][], IndexTypeArray[][], IndexTypeArray[][], IndexTypeArray[][]];


function NewIndexesTypedArray(arr: number[]): IndexTypeArray {
    return new Uint32Array(arr);
}

function NewIndexesTypedArrayEmpty(size: number): IndexTypeArray {
    return new Uint32Array(size);
}

function createCenterBodyIndexes(size: number): IndexTypeArray {

    let indexes = [];

    let i0 = 1,
        j0 = 1;

    let i1 = 1,
        j1 = 1;

    let ind1 = 0, ind2 = 0, nr = 0;
    for (let i = i0; i < size - 1 - i1; i++) {
        for (let j = j0; j < size - j1; j++) {
            ind1 = i * size + j;
            nr = (i + 1) * size;
            ind2 = nr + j;
            indexes.push(ind1, ind2);
        }
        indexes.push(ind2, nr + j0);
    }
    indexes.push(indexes[indexes.length - 1], size * size - size);

    return NewIndexesTypedArray(indexes);
}

function createWestNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    const b = size * size - size;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = b - size * i - size + 1,
            lind = b - size * k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size);
        indexes.push(0);
    }

    return NewIndexesTypedArray(indexes);
}

function createNorthNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = size + i + 1,
            lind = k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size - 2);
        indexes.push(size - 1);
    }

    return NewIndexesTypedArray(indexes);
}

function createEastNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = size * (i + 1) + size - 2,
            lind = size + size * k - 1;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size * (size - 1) - 1);
        indexes.push(size * size - 1);
    }

    return NewIndexesTypedArray(indexes);
}

function createSouthNeighborSkirt(size: number, deltaGr: number): IndexTypeArray {
    let indexes = [];
    const grCount = (size - 1) / deltaGr;
    let k = 0;
    const rb = size * (size - 1) - 2;
    const lb = size * size - 1;
    for (let i = 0; i < size - 2; i++) {
        if (i % grCount === 0) {
            k = i;
        }
        let rind = rb - i,
            lind = lb - k;
        indexes.push(lind, rind);
    }

    if (deltaGr === (size - 1)) {
        indexes.push(size * size - size + 1);
    }
    indexes.push(size * size - size);

    return NewIndexesTypedArray(indexes);
}

function initIndexesBodySkirts(pow: number): IndexesTable {
    let table: IndexesTable = [[], [], [], []];

    for (let i = 0; i <= pow; i++) {
        let d = Math.pow(2, i),
            d1 = d + 1;

        table[N][i] = [];
        table[W][i] = [];
        table[S][i] = [];
        table[E][i] = [];

        for (let j = 0; j <= pow; j++) {
            let dd = Math.pow(2, j);
            table[W][i][j] = createWestNeighborSkirt(d1, dd);
            table[N][i][j] = createNorthNeighborSkirt(d1, dd);
            table[E][i][j] = createEastNeighborSkirt(d1, dd);
            table[S][i][j] = createSouthNeighborSkirt(d1, dd);

        }
    }
    return table;
}

function initIndexBodiesTable(pow: number): IndexTypeArray[] {
    let table = [];
    for (let i = 0; i <= pow; i++) {
        const d = Math.pow(2, i);
        table[i] = createCenterBodyIndexes(d + 1);
    }
    return table;
}

function createTextureCoords(size: number): Uint16Array {
    let texCoords = new Uint16Array((size + 1) * (size + 1) * 2);
    let k = 0;
    for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
            texCoords[k++] = j / size * 0xFFFF;
            texCoords[k++] = i / size * 0xFFFF;
        }
    }
    return texCoords;
}

class SegmentHelper {

    protected _maxGridSize: number;
    public centerIndexesTable: IndexTypeArray[];
    public skirtsIndexesTable: IndexesTable;

    constructor(maxGridSize: number = 0) {
        this._maxGridSize = maxGridSize;
        this.centerIndexesTable = initIndexBodiesTable(this._maxGridSize)
        this.skirtsIndexesTable = initIndexesBodySkirts(this._maxGridSize);
    }

    public get maxGridSize(): number {
        return this._maxGridSize;
    }

    public init() {
        this.centerIndexesTable = initIndexBodiesTable(this._maxGridSize);
        this.skirtsIndexesTable = initIndexesBodySkirts(this._maxGridSize);
    }

    public setMaxGridSize(gridSize: number) {
        this._maxGridSize = gridSize;
        this.init();
    }

    public createSegmentIndexes(size: number, sidesSizes: [number, number, number, number]) {
        if (size) {
            let c = this.centerIndexesTable[size],
                w = this.skirtsIndexesTable[W][size][sidesSizes[W]],
                n = this.skirtsIndexesTable[N][size][sidesSizes[N]],
                e = this.skirtsIndexesTable[E][size][sidesSizes[E]],
                s = this.skirtsIndexesTable[S][size][sidesSizes[S]];

            let indexes = NewIndexesTypedArrayEmpty(c.length + w.length + n.length + e.length + s.length);

            indexes.set(c, 0);
            indexes.set(w, c.length);
            indexes.set(n, c.length + w.length);
            indexes.set(e, c.length + w.length + n.length);
            indexes.set(s, c.length + w.length + n.length + e.length);

            return indexes;
        } else {
            return NewIndexesTypedArray([0, 2, 1, 3]);
        }
    }

    public initTextureCoordsTable(pow: number): Uint16Array[] {
        let table = [];
        for (let i = 0; i <= pow; i++) {
            const d = Math.pow(2, i);
            table[i] = createTextureCoords(d);
        }
        return table;
    }
}

let instance = new SegmentHelper();

export function getInstance() {
    return instance;
}