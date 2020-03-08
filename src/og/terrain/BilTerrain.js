import { GlobusTerrain } from './GlobusTerrain.js';
import { WMS } from '../layer/WMS.js';

//http://95.211.82.211:8080/geoserver/og/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/bil16&TRANSPARENT=true&LAYERS=og:n30_e130_1arc_v3&WIDTH=256&HEIGHT=256&SRS=EPSG:900913&BBOX=14522658.678548105,3547594.2801567726,14532431.665545782,3557367.2671544496

class BilTerrain extends GlobusTerrain {
    constructor(options) {

        super("bil", options);

        options = options || {};

        this.equalizeVertices = options.equalizeVertices != undefined ? options.equalizeVertices : true;

        this.equalizeNormals = options.equalizeNormals || false;

        this.minZoom = options.minZoom || 3;

        this.maxZoom = options.maxZoom || 15;

        this._format = "application/bil16";

        this._layers = options.layers || "";

        this.url = options.url || "";

        this.fileGridSize = 128;

        this._dataType = "arrayBuffer";
    }

    isBlur() {
        return false;
    }

    _createUrl(segment) {
        return WMS.createRequestUrl(
            this.url,
            this._layers,
            this._format,
            "1.1.1",
            "GetMap",
            segment._projection.code,
            WMS.get_bbox_v1_1_1(segment.getExtent()),
            this.fileGridSize,
            this.fileGridSize
        );
    }

    _createHeights(data, segment) {
        let buf = data;

        let elevationsSize = (this.fileGridSize + 1) * (this.fileGridSize + 1);

        let outCurrenElevations = new Float32Array(elevationsSize);

        return outCurrenElevations;
    }
};

export { BilTerrain };
