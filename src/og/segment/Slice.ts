import {Layer} from "../layer/Layer";
import {Segment} from "./Segment";
import {Material} from "../layer/Material";

class Slice {
    public segment: Segment;
    public layers: Layer[];
    public tileOffsetArr: Float32Array;
    public layerOpacityArr: Float32Array;

    constructor(segment: Segment) {
        this.segment = segment;
        this.layers = [];
        this.tileOffsetArr = new Float32Array(segment.planet.SLICE_SIZE_4);
        this.layerOpacityArr = new Float32Array(segment.planet.SLICE_SIZE);
    }

    public clear() {
        // @ts-ignore
        this.layers = null;
        // @ts-ignore
        this.tileOffsetArr = null;
        // @ts-ignore
        this.layerOpacityArr = null;
    }

    public append(layer: Layer, material: Material) {
        let n = this.layers.length;

        this.layers.push(layer);

        this.layerOpacityArr[n] = layer.screenOpacity;

        let n4 = n * 4;

        let arr = layer.applyMaterial(material);
        this.tileOffsetArr[n4] = arr[0];
        this.tileOffsetArr[n4 + 1] = arr[1];
        this.tileOffsetArr[n4 + 2] = arr[2];
        this.tileOffsetArr[n4 + 3] = arr[3];

        //arr = this.segment._getLayerExtentOffset(layer);
        //slice.visibleExtentOffsetArr[n4] = arr[0];
        //slice.visibleExtentOffsetArr[n4 + 1] = arr[1];
        //slice.visibleExtentOffsetArr[n4 + 2] = arr[2];
        //slice.visibleExtentOffsetArr[n4 + 3] = arr[3];

    }
}

export {Slice}