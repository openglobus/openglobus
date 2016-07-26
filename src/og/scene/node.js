goog.provide('og.scene.Node');

/**
 * Scene node base class.
 * @class
 * @param {string} name - Node name.
 */
og.scene.Node = function (name) {

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

    this.__staticId = og.scene.Node.__staticCounter++;
};

og.scene.Node.__staticCounter = 0;

og.scene.Node.prototype = {
    name: "",
    childNodes: [],
    parentNode: null,
    topNode: null,
    _dictionary: []
};

/**
 * Adds node to the current hierarchy.
 * @public
 * @type {og.scene.Node}
 */
og.scene.Node.prototype.addNode = function (node) {
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
};

/**
 * Destroy node.
 * @public
 */
og.scene.Node.prototype.destroy = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].destroy();
    }
    this._clear();
};

/**
 * Gets node by name in the current.
 * @public
 * @param {string} name - Node name.
 * @return {og.scene.Node} Node object in the current node.
 */
og.scene.Node.prototype.getNodeByName = function (name) {
    return this._dictionary[name];
};

/**
 * Clear current node.
 * @protected
 */
og.scene.Node.prototype._clear = function () {
    this.name = "";
    this.parentNode = null;
    this.topNode = null;
    this.childNodes.length = 0;
};
