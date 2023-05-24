"use strict";

import { EPSG3857 } from "../proj/EPSG3857.js";

export class QuadTreeStrategy {
    constructor(options = {}) {
        this.name = "";
        this._planet = options.planet;
        this.projection = EPSG3857;

        /**
         * grid tree list.
         * @protected
         * @type {quadTree.Node[]}
         */
        this._quadTreeList = [];
    }

    destroyBranches() {
        for (let i = 0, len = this._quadTreeList.length; i < len; i++) {
            this._quadTreeList[i].destroyBranches();
        }
    }

    clearLayerMaterial(layer) {
        let lid = layer._id;
        for (let i = 0, len = this._quadTreeList.length; i < len; i++) {
            this._quadTreeList[i].traverseTree(function (node) {
                let mats = node.segment.materials;
                if (mats[lid]) {
                    mats[lid].clear();
                    mats[lid] = null;
                    delete mats[lid];
                }
            });
        }
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