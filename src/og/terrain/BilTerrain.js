import { GlobusTerrain } from './GlobusTerrain.js';

class BilTerrain extends GlobusTerrain {
    constructor(name, options) {

        super(name, options);

        options = options || {};

        this.equalizeVertices = options.equalizeVertices != undefined ? options.equalizeVertices : true;

        this.equalizeNormals = options.equalizeNormals || false;

        this.minZoom = options.minZoom || 3;

        this.maxZoom = options.maxZoom || 15;

        this.url = "";
        this.fileGridSize = 128;
        this._dataType = "blob";
    }

    isBlur() {
        return false;
    }

    _createHeights(data, segment) {

    }
};

export { BilTerrain };
