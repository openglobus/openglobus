import { LRUCache } from "../../src/utils/LRUCache";

const keysOf = (cache) => Array.from(cache._map.keys());

test("LRUCache keeps values up to the capacity", () => {
    const cache = new LRUCache(3);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(undefined);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("c")).toBe(false);
});

test("LRUCache evicts the least recently set value over the capacity", () => {
    const onEvict = vi.fn();
    const cache = new LRUCache(2, onEvict);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.size).toBe(2);
    expect(cache.has("a")).toBe(false);
    expect(keysOf(cache)).toEqual(["b", "c"]);
    expect(onEvict).toHaveBeenCalledTimes(1);
    expect(onEvict).toHaveBeenCalledWith("a", 1);
});

test("LRUCache get makes the value the most recently used, peek does not", () => {
    const cache = new LRUCache(2);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.peek("a")).toBe(1);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(false);

    expect(cache.get("b")).toBe(2);
    cache.set("d", 4);
    expect(keysOf(cache)).toEqual(["b", "d"]);
});

test("LRUCache set of an existing key replaces the value and makes it the most recently used", () => {
    const onEvict = vi.fn();
    const cache = new LRUCache(2, onEvict);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10);

    expect(cache.size).toBe(2);
    expect(onEvict).not.toHaveBeenCalled();

    cache.set("c", 3);
    expect(cache.get("a")).toBe(10);
    expect(cache.has("b")).toBe(false);
    expect(onEvict).toHaveBeenCalledWith("b", 2);
});

test("LRUCache keeps falsy values", () => {
    const cache = new LRUCache(4);
    cache.set("zero", 0);
    cache.set("null", null);
    cache.set("undefined", undefined);
    cache.set("empty", "");

    expect(cache.get("zero")).toBe(0);
    expect(cache.get("null")).toBe(null);
    expect(cache.has("undefined")).toBe(true);
    expect(cache.get("empty")).toBe("");

    // get of the undefined value made it the most recently used too
    cache.get("undefined");
    cache.set("new", 1);
    expect(cache.has("zero")).toBe(false);
    expect(keysOf(cache)).toEqual(["null", "empty", "undefined", "new"]);
});

test("LRUCache delete and clear are not evictions", () => {
    const onEvict = vi.fn();
    const cache = new LRUCache(2, onEvict);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);
    expect(cache.size).toBe(1);

    // The place of the deleted value is free
    cache.set("c", 3);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(onEvict).not.toHaveBeenCalled();
});

test("LRUCache evicts in the least recently used order, with any keys", () => {
    const evicted = [];
    const keys = [{}, 1, "1", null];
    const cache = new LRUCache(2, (key) => evicted.push(key));

    keys.forEach((key, i) => cache.set(key, i));

    expect(evicted).toEqual([keys[0], keys[1]]);
    expect(cache.get("1")).toBe(2);
    expect(cache.get(null)).toBe(3);
});

test("LRUCache with the capacity of one keeps the last value", () => {
    const cache = new LRUCache(1);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(keysOf(cache)).toEqual(["b"]);
});

test("LRUCache capacity is a positive integer", () => {
    expect(new LRUCache(2.7).capacity).toBe(2);
    for (const capacity of [0, -1, 0.5, NaN, undefined]) {
        expect(() => new LRUCache(capacity)).toThrow();
    }
});

test("LRUCache values go from the least to the most recently used, without making them used", () => {
    const cache = new LRUCache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a");

    expect(Array.from(cache.values())).toEqual([2, 3, 1]);
    expect(Array.from(cache.values())).toEqual([2, 3, 1]);

    cache.set("d", 4);
    expect(cache.has("b")).toBe(false);
});
