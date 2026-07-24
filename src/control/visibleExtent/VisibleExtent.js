import { Slice } from "../../segment/Slice";
import { Control } from "../Control";
import * as shaders from "./segment";

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

export class VisibleExtent extends Control {
    constructor() {
        super();

        rewriteSlice();
    }

    oninit() {
        let h = this.renderer.handler;

        h.stop();

        h.removeProgram("segment_screen_nl");
        h.removeProgram("segment_screen_wl");
        h.removeProgram("segment_colorPicking");
        h.removeProgram("segment_depth");
        h.removeProgram("segment_heightPicking");

        h.addProgram(shaders.segment_screen_nl(), true);
        //h.addProgram(shaders.segment_screen_wl(), true);
        h.addProgram(shaders.segment_screen_wl_webgl2(), true);
        h.addProgram(shaders.segment_colorPicking(), true);
        h.addProgram(shaders.segment_depth(), true);
        h.addProgram(shaders.segment_heightPicking(), true);

        h.start();
    }
}

/**
 * @deprecated
 */
export const visibleExtent = () => new VisibleExtent();
