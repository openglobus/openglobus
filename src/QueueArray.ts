class QueueArray<T> {
    protected _size: number;
    protected _array: T[];
    protected _popIndex: number;
    protected _shiftIndex: number;
    public length: number;

    constructor(size: number = 2048) {
        this._size = size;
        this._array = new Array(this._size);
        this._popIndex = Math.floor(this._size * 0.5);
        this._shiftIndex = this._popIndex;
        this.length = 0;
    }

    public reset() {
        this._popIndex = Math.floor(this._size * 0.5);
        this._shiftIndex = this._popIndex;
        this.length = 0;
    }

    public clear() {
        this._array.length = 0;
        this._array = new Array(this._size);
        this._popIndex = Math.floor(this._size * 0.5);
        this._shiftIndex = this._popIndex;
        this.length = 0;
    }

    public push(data: T) {
        this.length++;
        this._array[this._popIndex++] = data;
    }

    public pop(): T | undefined {
        if (this.length) {
            this.length--;
            let res = this._array[--this._popIndex]!;
            // @ts-ignore
            this._array[this._popIndex] = null;
            if (!this._array[this._popIndex - 1]) {
                this._popIndex = Math.floor(this._size * 0.5);
                this._shiftIndex = this._popIndex;
            }
            return res;
        }
        return undefined;
    }

    public unshift(data: T) {
        this.length++;
        this._array[--this._shiftIndex] = data;
    }

    public shift(): T | undefined {
        if (this.length) {
            this.length--;
            let res = this._array[this._shiftIndex]!;
            // @ts-ignore
            this._array[this._shiftIndex++] = null;
            if (!this._array[this._shiftIndex]) {
                this._popIndex = Math.floor(this._size * 0.5);
                this._shiftIndex = this._popIndex;
            }
            return res;
        }
        return undefined;
    }
    public forEach(callback: (el: T) => void) {
        for (let i = this._shiftIndex; i < this._popIndex; i++) {
            callback(this._array[i]);
        }
    }
}

export {QueueArray};
