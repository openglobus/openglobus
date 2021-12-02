"use strict";

import { Control } from "../Control.js";
import * as shaders from "./drawnode.js";
import { Slice } from "../../segment/Slice.js";

function rewriteSlice() {
    Slice.prototype.init = function (segment) {
        this.visibleExtentOffsetArr = new Float32Array(this.segment.planet.SLICE_SIZE_4);
    };

    Slice.prototype.append = function (layer, material) {
        let n = this.layers.length;

        this.layers.push(layer);

        this.layerOpacityArr[n] = layer.opacity;

        let n4 = n * 4;

        let arr = layer.applyMaterial(material);
        this.tileOffsetArr[n4] = arr[0];
        this.tileOffsetArr[n4 + 1] = arr[1];
        this.tileOffsetArr[n4 + 2] = arr[2];
        this.tileOffsetArr[n4 + 3] = arr[3];

        arr = this.segment._getLayerExtentOffset(layer);
        this.visibleExtentOffsetArr[n4] = arr[0];
        this.visibleExtentOffsetArr[n4 + 1] = arr[1];
        this.visibleExtentOffsetArr[n4 + 2] = arr[2];
        this.visibleExtentOffsetArr[n4 + 3] = arr[3];
    };

    Slice.prototype.clear = function () {
        this.layers = null;
        this.tileOffsetArr = null;
        this.layerOpacityArr = null;
        this.visibleExtentOffsetArr = null;
    };
}

/**
 * @class
 * @extends {Control}
 */
class VisibleExtent extends Control {
    constructor() {
        super();

        rewriteSlice();
    }

    oninit() {
        let h = this.renderer.handler;

        h.stop();

        h.removeProgram("drawnode_screen_nl");
        h.removeProgram("drawnode_screen_wl");
        h.removeProgram("drawnode_colorPicking");
        h.removeProgram("drawnode_depth");
        h.removeProgram("drawnode_heightPicking");

        h.addProgram(shaders.drawnode_screen_nl(), true);
        //h.addProgram(shaders.drawnode_screen_wl(), true);
        h.addProgram(shaders.drawnode_screen_wl_webgl2(), true);
        h.addProgram(shaders.drawnode_colorPicking(), true);
        h.addProgram(shaders.drawnode_depth(), true);
        h.addProgram(shaders.drawnode_heightPicking(), true);

        h.start();

    }
}

export function visibleExtent() {
    return new VisibleExtent();
}

export { VisibleExtent };
