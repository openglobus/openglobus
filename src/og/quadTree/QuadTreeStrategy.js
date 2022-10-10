"use strict";

export class QuadTreeStrategy {
    constructor(options = {}) {
        this.name = "";
        this._planet = options.planet;

        /**
         * grid tree list.
         * @protected
         * @type {quadTree.Node[]}
         */
        this._quadTreeList = [];

    }

    get planet() {
        return this._planet;
    }

    init() {

    }

    preRender() {
        for (let i = 0; i < this._quadTreeList.length; i++) {

            let quadTree = this._quadTreeList[i];
            quadTree.createChildrenNodes();
            quadTree.segment.createPlainSegment();

            for (let j = 0; j < quadTree.nodes.length; j++) {
                quadTree.nodes[j].segment.createPlainSegment();
            }
        }

    }

    preLoad() {

        for (let i = 0; i < this._quadTreeList.length; i++) {

            let quadTree = this._quadTreeList[i];
            quadTree.segment.passReady = true;
            quadTree.renderNode(true);
            this._planet.normalMapCreator.drawSingle(quadTree.segment);

            for (let j = 0; j < quadTree.nodes.length; j++) {
                quadTree.nodes[j].segment.passReady = true;
                quadTree.nodes[j].renderNode(true);
                this._planet._normalMapCreator.drawSingle(quadTree.nodes[j].segment);
            }
        }
    }

    collectRenderNodes() {
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].renderTree(this._planet.camera, 0, null);
        }
    }

    clear() {
        for (let i = 0; i < this._quadTreeList.length; i++) {
            this._quadTreeList[i].clearTree();
        }
    }

    get quadTreeList() {
        return this._quadTreeList;
    }

}