import { getTileExtent } from "../mercator.js";
import { Layer } from "../layer/Layer.js";
import { GlobusTerrain } from "./GlobusTerrain.js";
import { isPowerOfTwo } from "../math.js";

const KEY =
    "pk.eyJ1IjoiZm94bXVsZGVyODMiLCJhIjoiY2pqYmR3dG5oM2Z1bzNrczJqYm5pODhuNSJ9.Y4DRmEPhb-XSlCR9CAXACQ";

class MapboxTerrain extends GlobusTerrain {
    constructor(name, options) {
        super(name, options);

        options = options || {};

        this.equalizeVertices =
            options.equalizeVertices != undefined ? options.equalizeVertices : true;

        this.equalizeNormals = options.equalizeNormals || false;

        this.minZoom = options.minZoom != undefined ? options.minZoom : 2;

        this.maxZoom = options.maxZoom != undefined ? options.maxZoom : 17;

        this.gridSizeByZoom = options.gridSizeByZoom || [
            64, 32, 16, 8, 8, 8, 8, 16, 16, 16, 16, 16, 32, 16, 32, 16, 32, 16, 32, 16, 8, 4
        ];

        this.url =
            options.url != undefined
                ? options.url
                : `//api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${
                      options.key || KEY
                  }`;

        this.noDataValues = options.noDataValues || [-65537, -10000];

        this.plainGridSize = options.plainGridSize || 128;

        this._dataType = "imageBitmap";

        this._imageSize = options.imageSize || 256;

        this._ctx = this._createTemporalCanvas(this._imageSize);
    }

    isBlur(segment) {
        if (segment.tileZoom >= 13) {
            return true;
        }
        return false;
    }

    _createTemporalCanvas(size) {
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        return canvas.getContext("2d");
    }

    _createHeights(data, segment) {
        const SIZE = data.width;

        this._ctx.clearRect(0, 0, SIZE, SIZE);
        this._ctx.drawImage(data, 0, 0);
        let rgbaData = this._ctx.getImageData(0, 0, SIZE, SIZE).data;

        //
        //Non power of two images
        //
        if (!isPowerOfTwo(this._imageSize) && SIZE === this._imageSize) {
            let outCurrenElevations = new Float32Array(SIZE * SIZE);
            extractElevationTilesMapboxNonPowerOfTwo(rgbaData, outCurrenElevations);
            return outCurrenElevations;
        }

        // TODO:
        //if (this._imageSize === this.plainGridSize) {
        //    let elevationsSize = (this.plainGridSize + 1) * (this.plainGridSize + 1);
        //    let d = SIZE / this.plainGridSize;

        //    let outCurrenElevations = new Float32Array(elevationsSize);

        //    for (let i = 0, len = outCurrenElevations.length; i < len; i++) {
        //        let i4 = i * 4;
        //        outCurrenElevations[i] = -10000 + 0.1 * (rgbaData[i4] * 256 * 256 + rgbaData[i4 + 1] * 256 + rgbaData[i4 + 2]);
        //    }

        //    return outCurrenElevations;
        //}

        //
        // Power of two images
        //
        let elevationsSize = (this.plainGridSize + 1) * (this.plainGridSize + 1);
        let d = SIZE / this.plainGridSize;

        let outCurrenElevations = new Float32Array(elevationsSize);
        let outChildrenElevations = new Array(d);

        for (let i = 0; i < d; i++) {
            outChildrenElevations[i] = [];
            for (let j = 0; j < d; j++) {
                outChildrenElevations[i][j] = new Float32Array(elevationsSize);
            }
        }

        extractElevationTilesMapbox(
            rgbaData,
            this.noDataValues,
            outCurrenElevations,
            outChildrenElevations
        );

        this._elevationCache[segment.tileIndex] = {
            heights: outCurrenElevations,
            extent: segment.getExtent()
        };

        for (let i = 0; i < d; i++) {
            for (let j = 0; j < d; j++) {
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

function extractElevationTilesMapboxNonPowerOfTwo(rgbaData, outCurrenElevations) {
    for (let i = 0, len = outCurrenElevations.length; i < len; i++) {
        let i4 = i * 4;
        outCurrenElevations[i] =
            -10000 + 0.1 * (rgbaData[i4] * 256 * 256 + rgbaData[i4 + 1] * 256 + rgbaData[i4 + 2]);
    }
}

function extractElevationTilesMapbox(
    rgbaData,
    noDataValues,
    outCurrenElevations,
    outChildrenElevations
) {
    let destSize = Math.sqrt(outCurrenElevations.length) - 1;
    let destSizeOne = destSize + 1;
    let sourceSize = Math.sqrt(rgbaData.length / 4);
    let dt = sourceSize / destSize;

    let rightHeight = 0,
        bottomHeight = 0,
        sourceSize4 = 0;

    for (
        let k = 0, currIndex = 0, sourceDataLength = rgbaData.length / 4;
        k < sourceDataLength;
        k++
    ) {
        let k4 = k * 4;

        let height =
            -10000 + 0.1 * (rgbaData[k4] * 256 * 256 + rgbaData[k4 + 1] * 256 + rgbaData[k4 + 2]);

        let isNoDataCurrent = MapboxTerrain.checkNoDataValue(noDataValues, height),
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
            rightHeight =
                -10000 +
                0.1 * (rgbaData[k4 + 4] * 256 * 256 + rgbaData[k4 + 5] * 256 + rgbaData[k4 + 6]);

            isNoDataRight = MapboxTerrain.checkNoDataValue(noDataValues, rightHeight);

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
            sourceSize4 = sourceSize * 4;

            bottomHeight =
                -10000 +
                0.1 *
                    (rgbaData[k4 + sourceSize4] * 256 * 256 +
                        rgbaData[k4 + sourceSize4 + 1] * 256 +
                        rgbaData[k4 + sourceSize4 + 2]);

            isNoDataBottom = MapboxTerrain.checkNoDataValue(noDataValues, bottomHeight);

            let middleHeight = (height + bottomHeight) * 0.5;

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
            let rightBottomHeight =
                -10000 +
                0.1 *
                    (rgbaData[k4 + sourceSize4 + 4] * 256 * 256 +
                        rgbaData[k4 + sourceSize4 + 5] * 256 +
                        rgbaData[k4 + sourceSize4 + 6]);

            let isNoDataRightBottom = MapboxTerrain.checkNoDataValue(
                noDataValues,
                rightBottomHeight
            );

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

export { MapboxTerrain };
