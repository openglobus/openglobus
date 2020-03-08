import { getTileExtent } from '../mercator.js';
import { Layer } from '../layer/Layer.js';
import { GlobusTerrain } from './GlobusTerrain.js';

const KEY = "pk.eyJ1IjoiZm94bXVsZGVyODMiLCJhIjoiY2pqYmR3dG5oM2Z1bzNrczJqYm5pODhuNSJ9.Y4DRmEPhb-XSlCR9CAXACQ";

class MapboxTerrain extends GlobusTerrain {
    constructor(name, options) {

        super(name, options);

        options = options || {};

        this.equalizeVertices = true;

        this.equalizeNormals = false;

        this.minZoom = 3;

        this.maxZoom = 15;

        this.url = "//api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=" + (options.key || KEY);
        this.fileGridSize = 128;
        this._dataType = "imageBitmap";

        this._canvas = document.createElement("canvas");
        this._canvas.width = 256;
        this._canvas.height = 256;
        this._ctx = this._canvas.getContext("2d");
    }

    isBlur() {
        return false;
    }

    _createHeights(data, segment) {

        const SIZE = data.width;

        this._ctx.drawImage(data, 0, 0);
        let rgbaData = this._ctx.getImageData(0, 0, SIZE, SIZE).data;

        let elevationsSize = (this.fileGridSize + 1) * (this.fileGridSize + 1);
        let d = SIZE / this.fileGridSize;

        let outCurrenElevations = new Float32Array(elevationsSize);
        let outChildrenElevations = new Array(d);

        for (let i = 0; i < d; i++) {
            outChildrenElevations[i] = [];
            for (let j = 0; j < d; j++) {
                outChildrenElevations[i][j] = new Float32Array(elevationsSize);
            }
        }

        extractElevationTilesMapbox(rgbaData, outCurrenElevations, outChildrenElevations);

        this._elevationCache[segment.tileIndex] = {
            heights: outCurrenElevations,
            extent: segment.getExtent()
        };

        for (let i = 0; i < d; i++) {
            for (let j = 0; j < d; j++) {
                let tileIndex = Layer.getTileIndex(segment.tileX * 2 + j, segment.tileY * 2 + i, segment.tileZoom);
                this._elevationCache[tileIndex] = {
                    heights: outChildrenElevations[i][j],
                    extent: getTileExtent(segment.tileX, segment.tileY, segment.tileZoom)
                };
            }
        }

        return outCurrenElevations;
    }
};

function extractElevationTilesMapbox(rgbaData, outCurrenElevations, outChildrenElevations) {

    let destSize = Math.sqrt(outCurrenElevations.length) - 1;
    let destSizeOne = destSize + 1;
    let sourceSize = Math.sqrt(rgbaData.length / 4);
    let dt = sourceSize / destSize;

    let rightHeigh = 0,
        bottomHeigh = 0,
        sourceSize4 = 0;

    for (let k = 0, currIndex = 0, sourceDataLength = rgbaData.length / 4; k < sourceDataLength; k++) {

        let k4 = k * 4;

        let height = -10000 + 0.1 * (rgbaData[k4] * 256 * 256 + rgbaData[k4 + 1] * 256 + rgbaData[k4 + 2]);

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
            rightHeigh = -10000 + 0.1 * (rgbaData[k4 + 4] * 256 * 256 + rgbaData[k4 + 5] * 256 + rgbaData[k4 + 6]);
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
            sourceSize4 = sourceSize * 4;
            bottomHeigh = -10000 + 0.1 * (rgbaData[k4 + sourceSize4] * 256 * 256 + rgbaData[k4 + sourceSize4 + 1] * 256 + rgbaData[k4 + sourceSize4 + 2]);
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
            let rightBottomHeight = -10000 + 0.1 * (rgbaData[k4 + sourceSize4 + 4] * 256 * 256 + rgbaData[k4 + sourceSize4 + 5] * 256 + rgbaData[k4 + sourceSize4 + 6]);

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

export { MapboxTerrain };
