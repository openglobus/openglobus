/**
 * @module og/scene/BaseNode
 */

'use strict';

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
         * @type {og.scene.Node}
         */
        this.topNode = this;

        this._dictionary = [];
        this._dictionary[name] = this;

        /**
         * Children nodes.
         * @public
         * @type {Array.<og.scene.Node>}
         */
        this.childNodes = [];

        /**
         * Parent node pointer.
         * @public
         * @type {og.scene.Node}
         */
        this.parentNode = null;

        this.__staticId = Node.__staticCounter++;
    }

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }


    /**
     * Adds node to the current hierarchy.
     * @public
     * @type {og.scene.Node}
     */
    addNode(node) {
        if (this.parentNode == null) {
            node.topNode = this;
        }
        else {
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
     * @return {og.scene.Node} Node object in the current node.
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
};

export { BaseNode };