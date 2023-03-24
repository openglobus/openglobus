/**
 * @module og/scene/BaseNode
 */

"use strict";

/**
 * Scene node base class.
 * @class
 * @param {string} name - Node name.
 */
class BaseNode {
    constructor(name) {
        /**
         * Node name.
         * @public
         * @type {string}
         */
        this.name = name;

        /**
         * Top scene tree node pointer.
         * @public
         * @type {BaseNode}
         */
        this.topNode = this;

        this._dictionary = [];
        this._dictionary[name] = this;

        /**
         * Children nodes.
         * @public
         * @type {Array.<RenderNode>}
         */
        this.childNodes = [];

        /**
         * Parent node pointer.
         * @public
         * @type {RenderNode}
         */
        this.parentNode = null;

        this.__staticId = BaseNode._staticCounter++;
    }

    static get _staticCounter() {
        if (!this.__counter__ && this.__counter__ !== 0) {
            this.__counter__ = 0;
        }
        return this.__counter__;
    }

    static set _staticCounter(n) {
        this.__counter__ = n;
    }

    /**
     * Adds node to the current hierarchy.
     * @public
     * @type {BaseNode}
     */
    addNode(node) {
        if (this.parentNode == null) {
            node.topNode = this;
        } else {
            node.topNode = this.topNode;
        }
        node.parentNode = this;
        node._dictionary = this.topNode._dictionary;
        this.childNodes.push(node);
        this.topNode._dictionary[node.name] = node;
    }

    /**
     * Destroy node.
     * @public
     */
    destroy() {
        for (var i = 0; i < this.childNodes.length; i++) {
            this.childNodes[i].destroy();
        }
        this._clear();
    }

    /**
     * Gets node by name in the current.
     * @public
     * @param {string} name - Node name.
     * @return {RenderNode} Node object in the current node.
     */
    getNodeByName(name) {
        return this._dictionary[name];
    }

    /**
     * Clear current node.
     * @protected
     */
    _clear() {
        this.name = "";
        this.parentNode = null;
        this.topNode = null;
        this.childNodes.length = 0;
    }

    isEqual(node) {
        return node.__staticId === this.__staticId;
    }
}

export { BaseNode };
