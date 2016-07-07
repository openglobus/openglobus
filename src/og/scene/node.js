goog.provide('og.scene.Node');

/**
 * Scene node base class.
 * @class
 * @param {string} name - Node name.
 */
og.scene.Node = function (name) {
    this.name = name;
    this.topNode = this;
    this.dictionary = [];
    this.dictionary[name] = this;
    this.childNodes = [];
    this.parentNode = null;
    this.__staticId = og.scene.Node.staticCounter++;
};

og.scene.Node.staticCounter = 0;

og.scene.Node.prototype = {
    name: "",
    childNodes: [],
    parentNode: null,
    topNode: null,
    dictionary: []
};

og.scene.Node.prototype.addNode = function (node) {
    if (this.parentNode == null) {
        node.topNode = this;
    }
    else {
        node.topNode = this.topNode;
    }
    node.parentNode = this;
    node.dictionary = this.topNode.dictionary;
    this.childNodes.push(node);
    this.topNode.dictionary[node.name] = node;
};

og.scene.Node.prototype.destroy = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].destroy();
    }
    this._clear();
};

og.scene.Node.prototype._clear = function () {
    this.name = "";
    this.parentNode = null;
    this.topNode = null;
    this.childNodes.length = 0;
};

og.scene.Node.prototype.getNodeByName = function (name) {
    return this.dictionary[name];
};