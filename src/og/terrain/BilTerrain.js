import { GlobusTerrain } from './GlobusTerrain.js';
import { WMS } from '../layer/WMS.js';

//http://95.211.82.211:8080/geoserver/og/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=application/bil16&TRANSPARENT=true&LAYERS=og:n30_e130_1arc_v3&WIDTH=256&HEIGHT=256&SRS=EPSG:900913&BBOX=14522658.678548105,3547594.2801567726,14532431.665545782,3557367.2671544496

class BilTerrain extends GlobusTerrain {
    constructor(options) {

        super("bil", options);

        options = options || {};

        this.equalizeVertices = true;

        this.equalizeNormals = true;//true;//options.equalizeNormals || false;

        this.minZoom = options.minZoom || 3;

        this.maxZoom = options.maxZoom || 15;

        this._format = "application/bil16";

        this._layers = options.layers || "";

        this.url = options.url || "";

        this.imageSize = 128;

        this.plainGridSize = 64;

        this._dataType = "arrayBuffer";
    }

    isBlur(segment) {
        if (segment.tileZoom >= 13) {
            return true;
        }
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
            this.imageSize,
            this.imageSize
        );
    }

    _createHeights(data, segment) {

        let bil16 = new Int16Array(data);

        let elevationsSize = (this.plainGridSize + 1) * (this.plainGridSize + 1);

        let d = 4;

        let outChildrenElevations = new Array(d);

        for (let i = 0; i < d; i++) {
            outChildrenElevations[i] = [];
            for (let j = 0; j < d; j++) {
                outChildrenElevations[i][j] = new Float32Array(elevationsSize);
            }
        }

        let outCurrenElevations = new Float32Array(elevationsSize);

        extractElevationTiles(bil16, outCurrenElevations, outChildrenElevations);

        return outCurrenElevations;
    }
};

function extractElevationTiles(data, outCurrenElevations, outChildrenElevations) {

    let destSize = Math.sqrt(outCurrenElevations.length) - 1;
    let destSizeOne = destSize + 1;
    let sourceSize = Math.sqrt(data.length);
    let dt = sourceSize / destSize;

    let rightHeigh = 0,
        bottomHeigh = 0;

    for (let k = 0, currIndex = 0, sourceDataLength = data.length; k < sourceDataLength; k++) {

        let height = data[k];

        if (height === -9999 || height === 32767) {
            height = -1000;
        }

        let i = Math.floor(k / sourceSize),
            j = k % sourceSize;

        let tileX = Math.floor(j / destSize),
            tileY = Math.floor(i / destSize);

        let destArr = outChildrenElevations[tileY][tileX];

        let ii = i % destSize,
            jj = j % destSize;

        let destIndex = (ii + tileY) * destSizeOne + jj + tileX;

        destArr[destIndex] = height;

        if ((i + tileY) % dt === 0 && (j + tileX) % dt === 0) {
            outCurrenElevations[currIndex++] = height;
        }

        if ((j + 1) % destSize === 0 && j !== (sourceSize - 1)) {

            //current tile
            rightHeigh = data[k];

            if (rightHeigh === -9999 || rightHeigh === 32767) {
                rightHeigh = -1000;
            }


            let middleHeight = (height + rightHeigh) * 0.5;
            destIndex = (ii + tileY) * destSizeOne + jj + 1;
            destArr[destIndex] = middleHeight;

            if ((i + tileY) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next right tile
            let rightindex = (ii + tileY) * destSizeOne + ((jj + 1) % destSize);
            outChildrenElevations[tileY][tileX + 1][rightindex] = middleHeight;
        }

        if ((i + 1) % destSize === 0 && i !== (sourceSize - 1)) {

            //current tile
            bottomHeigh = data[k + sourceSize];

            if (bottomHeigh === -9999 || bottomHeigh === 32767) {
                bottomHeigh = -1000;
            }

            let middleHeight = (height + bottomHeigh) * 0.5;
            destIndex = (ii + 1) * destSizeOne + jj + tileX;
            destArr[destIndex] = middleHeight;

            if ((j + tileX) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next bottom tile
            let bottomindex = ((ii + 1) % destSize) * destSizeOne + jj + tileX;
            outChildrenElevations[tileY + 1][tileX][bottomindex] = middleHeight;
        }

        if ((j + 1) % destSize === 0 && j !== (sourceSize - 1) &&
            (i + 1) % destSize === 0 && i !== (sourceSize - 1)) {

            //current tile
            let rightBottomHeight = data[k + sourceSize + 1];

            if (rightBottomHeight === -9999 || rightBottomHeight === 32767) {
                rightBottomHeight = -1000;
            }

            let middleHeight = (height + rightHeigh + bottomHeigh + rightBottomHeight) * 0.25;
            destIndex = (ii + 1) * destSizeOne + (jj + 1);
            destArr[destIndex] = middleHeight;

            outCurrenElevations[currIndex++] = middleHeight;

            //next right tile            
            let rightindex = (ii + 1) * destSizeOne;
            outChildrenElevations[tileY][tileX + 1][rightindex] = middleHeight;

            //next bottom tile
            let bottomindex = destSize;
            outChildrenElevations[tileY + 1][tileX][bottomindex] = middleHeight;

            //next right bottom tile
            let rightBottomindex = 0;
            outChildrenElevations[tileY + 1][tileX + 1][rightBottomindex] = middleHeight;
        }
    }
};

export { BilTerrain };
