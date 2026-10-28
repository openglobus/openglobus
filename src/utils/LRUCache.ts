/**
 * Least recently used cache of a limited number of entries. Map keeps the insertion order,
 * so the first key is always the least recently used one.
 * @class
 * @param {number} capacity - Maximal number of entries.
 * @param {Function} [onEvict] - Called with the entries removed to free the place for new ones.
 */
export class LRUCache<K, V> {
    public readonly capacity: number;

    protected _map: Map<K, V>;

    protected _onEvict: ((key: K, value: V) => void) | null;

    constructor(capacity: number, onEvict?: (key: K, value: V) => void) {
        if (!(capacity >= 1)) {
            throw new Error(`LRUCache: capacity must be at least 1, ${capacity} is given`);
        }
        this.capacity = Math.floor(capacity);
        this._map = new Map();
        this._onEvict = onEvict || null;
    }

    public get size(): number {
        return this._map.size;
    }

    /**
     * Returns the value and makes it the most recently used.
     */
    public get(key: K): V | undefined {
        if (!this._map.has(key)) {
            return undefined;
        }
        let value = this._map.get(key)!;
        this._map.delete(key);
        this._map.set(key, value);
        return value;
    }

    /**
     * Returns the value without making it the most recently used.
     */
    public peek(key: K): V | undefined {
        return this._map.get(key);
    }

    /**
     * Sets the most recently used value, the least recently used ones over the capacity are evicted.
     */
    public set(key: K, value: V) {
        this._map.delete(key);
        this._map.set(key, value);

        while (this._map.size > this.capacity) {
            let oldest = this._map.keys().next().value as K,
                oldestValue = this._map.get(oldest)!;
            this._map.delete(oldest);
            this._onEvict && this._onEvict(oldest, oldestValue);
        }
    }

    /**
     * Returns the values from the least to the most recently used, without making them used.
     */
    public values(): IterableIterator<V> {
        return this._map.values();
    }

    public has(key: K): boolean {
        return this._map.has(key);
    }

    /**
     * Removes the entry, not counted as an eviction.
     */
    public delete(key: K): boolean {
        return this._map.delete(key);
    }

    /**
     * Removes all the entries, not counted as evictions.
     */
    public clear() {
        this._map.clear();
    }
}
