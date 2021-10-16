/**
 * @module og/Stack
 */

'use strict';

class Node {
    constructor() {
        this.next = null;
        this.prev = null;
        this.data = null;
    }
}

class Stack {
    constructor(size = 256) {

        this._current = new Node();
        this._head = this._current;

        for (var i = 0; i < size; i++) {
            var n = new Node();
            n.prev = this._current;
            this._current.next = n;
            this._current = n;
        }
        this._current = this._head;
    }

    current() {
        return this._current;
    }

    push(data) {
        this._current = this._current.next;
        this._current.data = data;
    }

    pop(data) {
        this._current = this._current.prev;
        return this._current.next.data;
    }

    popPrev(data) {
        this._current = this._current.prev;
        return this._current.data;
    }
}

export { Stack };
