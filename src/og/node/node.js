goog.provide('og.node.Node');

og.node.Node = function (name) {
    this.name = name;
    this.topNode = this;
    this.dictionary = [];
    this.dictionary[name] = this;
    this.childNodes = [];
    this.parentNode = null;
    this.__staticId = og.node.Node.staticCounter++;
};

og.node.Node.staticCounter = 0;

og.node.Node.prototype = {
    name: "",
    childNodes: [],
    parentNode: null,
    topNode: null,
    dictionary: []
};

og.node.Node.prototype.addNode = function (node) {
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

og.node.Node.prototype.destroy = function () {
    for (var i = 0; i < this.childNodes.length; i++) {
        this.childNodes[i].destroy();
    }
    this._clear();
};

og.node.Node.prototype._clear = function () {
    this.name = "";
    this.parentNode = null;
    this.topNode = null;
    this.childNodes.length = 0;
};

og.node.Node.prototype.getNodeByName = function (name) {
    return this.dictionary[name];
};