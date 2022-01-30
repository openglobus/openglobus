"use strict";

import { GlobusTerrain } from "./GlobusTerrain.js";
import { WMS } from "../layer/WMS.js";
import { isPowerOfTwo, nextHighestPowerOfTwo } from "../math.js";
import { getTileExtent } from "../mercator.js";
import { Layer } from "../layer/Layer.js";

class BilTerrain extends GlobusTerrain {
    noDataValues: any;
    url: any;
    _format: string;
    _layers: any;
    _imageSize: any;
    _dataType: string;
    _elevationCache: any;
    constructor(options) {
        super("bil", options);

        options = options || {};

        this.equalizeVertices = true;

        this.equalizeNormals = true;

        this.minZoom = options.minZoom || 2;

        this.maxZoom = options.maxZoom || 14;

        this.noDataValues = options.noDataValues || [-9999, 32767];

        this.url = options.url || "";

        this._format = "application/bil16";

        this._layers = options.layers || "";

        this._imageSize = options.imageSize || 256;

        this.plainGridSize =
            options.plainGridSize != undefined
                ? options.plainGridSize
                : isPowerOfTwo(this._imageSize)
                ? this._imageSize / 2
                : nextHighestPowerOfTwo(this._imageSize) / 2;

        this._dataType = "arrayBuffer";
    }

    isBlur(segment) {
        if (segment.tileZoom >= 18) {
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
            this._imageSize,
            this._imageSize
        );
    }

    _createHeights(data, segment) {
        let bil16 = new Int16Array(data);

        //
        //Non power of two images
        //
        if (!isPowerOfTwo(this._imageSize)) {
            let outCurrenElevations = new Float32Array(bil16.length);
            //TODO: optimize
            extractElevationTilesNonPowerOfTwo(bil16, outCurrenElevations);
            return outCurrenElevations;
        }

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

        extractElevationTiles(bil16, this.noDataValues, outCurrenElevations, outChildrenElevations);

        this._elevationCache[segment.tileIndex] = {
            heights: outCurrenElevations,
            extent: segment.getExtent()
        };

        let dd = this._imageSize / this.plainGridSize;

        for (let i = 0; i < dd; i++) {
            for (let j = 0; j < dd; j++) {
                let x = segment.tileX * 2 + j,
                    y = segment.tileY * 2 + i,
                    z = segment.tileZoom + 1;
                let tileIndex = Layer.getTileIndex(x, y, z);
                this._elevationCache[tileIndex] = {
                    heights: outChildrenElevations[i][j],
                    extent: getTileExtent(x, y, z)
                };
            }
        }

        return outCurrenElevations;
    }
}

function extractElevationTilesNonPowerOfTwo(data, outCurrenElevations) {
    for (let i = 0, len = outCurrenElevations.length; i < len; i++) {
        outCurrenElevations[i] = data[i];
    }
}

function extractElevationTiles(data, noDataValues, outCurrenElevations, outChildrenElevations) {
    let destSize = Math.sqrt(outCurrenElevations.length) - 1;
    let destSizeOne = destSize + 1;
    let sourceSize = Math.sqrt(data.length);
    let dt = sourceSize / destSize;

    let rightHeight = 0,
        bottomHeight = 0;

    for (let k = 0, currIndex = 0, sourceDataLength = data.length; k < sourceDataLength; k++) {
        let height = data[k];

        let isNoDataCurrent = BilTerrain.checkNoDataValue(noDataValues, height),
            isNoDataRight = false,
            isNoDataBottom = false;

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

        if ((j + 1) % destSize === 0 && j !== sourceSize - 1) {
            //current tile
            rightHeight = data[k];

            isNoDataRight = BilTerrain.checkNoDataValue(noDataValues, rightHeight);

            let middleHeight = height;
            if (!(isNoDataCurrent || isNoDataRight)) {
                middleHeight = (height + rightHeight) * 0.5;
            }

            destIndex = (ii + tileY) * destSizeOne + jj + 1;
            destArr[destIndex] = middleHeight;

            if ((i + tileY) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next right tile
            let rightindex = (ii + tileY) * destSizeOne + ((jj + 1) % destSize);
            outChildrenElevations[tileY][tileX + 1][rightindex] = middleHeight;
        }

        if ((i + 1) % destSize === 0 && i !== sourceSize - 1) {
            //current tile
            bottomHeight = data[k + sourceSize];

            isNoDataBottom = BilTerrain.checkNoDataValue(noDataValues, bottomHeight);

            let middleHeight = height;

            if (!(isNoDataCurrent || isNoDataBottom)) {
                middleHeight = (height + bottomHeight) * 0.5;
            }

            destIndex = (ii + 1) * destSizeOne + jj + tileX;
            destArr[destIndex] = middleHeight;

            if ((j + tileX) % dt === 0) {
                outCurrenElevations[currIndex++] = middleHeight;
            }

            //next bottom tile
            let bottomindex = ((ii + 1) % destSize) * destSizeOne + jj + tileX;
            outChildrenElevations[tileY + 1][tileX][bottomindex] = middleHeight;
        }

        if (
            (j + 1) % destSize === 0 &&
            j !== sourceSize - 1 &&
            (i + 1) % destSize === 0 &&
            i !== sourceSize - 1
        ) {
            //current tile
            let rightBottomHeight = data[k + sourceSize + 1];

            let isNoDataRightBottom = BilTerrain.checkNoDataValue(noDataValues, rightBottomHeight);

            let middleHeight = height;

            if (!(isNoDataCurrent || isNoDataRight || isNoDataBottom || isNoDataRightBottom)) {
                middleHeight = (height + rightHeight + bottomHeight + rightBottomHeight) * 0.25;
            }

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
}

export { BilTerrain };
