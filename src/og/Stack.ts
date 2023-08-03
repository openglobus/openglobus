"use strict";

class Node<T> {

    public next: Node<T> | null;
    public prev: Node<T> | null;
    public data: T | null;

    constructor() {
        this.next = null;
        this.prev = null;
        this.data = null;
    }
}

/**
 * @class Stack<T>
 * @param {number} [size=256] - Stack size
 */
class Stack<T> {

    protected _current: Node<T>;
    protected _head: Node<T>;

    constructor(size: number = 256) {
        this._current = new Node<T>();
        this._head = this._current;

        for (let i = 0; i < size; i++) {
            let n = new Node<T>();
            n.prev = this._current;
            this._current.next = n;
            this._current = n;
        }
        this._current = this._head;
    }

    public current(): Node<T> {
        return this._current;
    }

    public push(data: T) {
        if (this._current.next) {
            this._current = this._current.next;
            this._current.data = data;
        }
    }

    public pop(): T | null {
        if (this._current.prev) {
            let res = this._current.data;
            //this._current.data = null;
            this._current = this._current.prev;
            return res;
        }
        return null;
    }

    public popPrev(): T | null {
        if (this._current.prev) {
            //this._current.data = null;
            this._current = this._current.prev;
            return this._current.data;
        }
        return null;
    }
}

export {Stack};
