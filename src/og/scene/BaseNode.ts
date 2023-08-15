"use strict";

/**
 * Scene node base class.
 * @class
 * @param {string} name - Node name.
 */
class BaseNode {

    static __counter__: number = 0;

    protected __id: number;

    /**
     * Node name.
     * @public
     * @type {string}
     */
    protected _name: string;

    /**
     * Top scene tree node pointer.
     * @public
     * @type {BaseNode}
     */
    public topNode: BaseNode;

    protected _dictionary: Record<string, BaseNode>;

    /**
     * Children nodes.
     * @public
     * @type {Array.<BaseNode>}
     */
    public childNodes: BaseNode[];

    /**
     * Parent node pointer.
     * @public
     * @type {BaseNode}
     */
    public parentNode: BaseNode | null;

    constructor(name?: string) {

        this.__id = BaseNode.__counter__++;

        this._name = name || `nonameNode:${this.__id}`;

        this.topNode = this;

        this._dictionary = {};
        this._dictionary[this._name] = this;

        this.childNodes = [];

        this.parentNode = null;
    }

    public get name(): string {
        return this._name;
    }

    /**
     * Adds node to the current hierarchy.
     * @public
     * @type {BaseNode}
     */
    public addNode(node: BaseNode) {
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
    public destroy() {
        for (let i = 0; i < this.childNodes.length; i++) {
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
    public getNodeByName(name: string): BaseNode {
        return this._dictionary[name];
    }

    /**
     * Clear current node.
     * @protected
     */
    protected _clear() {
        this.parentNode = null;
        this.topNode = this;
        this.childNodes.length = 0;
    }

    public isEqual(node: BaseNode): boolean {
        return node.__id === this.__id;
    }
}

export {BaseNode};
