class Lock {

    protected _lock: number;

    constructor() {
        this._lock = 0;
    }

    public lock(key: Key) {
        this._lock |= (1 << key.id);
    }

    public free(key: Key) {
        this._lock &= ~(1 << key.id);
    }

    public isFree(): boolean {
        return this._lock === 0;
    }

    public isLocked(): boolean {
        return this._lock !== 0;
    }
}

class Key {

    static __counter__: number = 0;

    protected __id: number;

    constructor() {
        this.__id = Key.__counter__++;
    }

    public get id(): number {
        return this.__id;
    }
}

export {Lock, Key};
