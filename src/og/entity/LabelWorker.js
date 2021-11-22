"use strict";

// import { QueueArray } from '../QueueArray.js';

class LabelWorker {
    constructor(numWorkers = 4) {
        this._id = 0;
        this._labelHandler = {};

        this._workerQueue = []; //new QueueArray(numWorkers);
        var labelProgramm = new Blob([_programm], { type: "application/javascript" });

        var that = this;

        for (let i = 0; i < numWorkers; i++) {
            var w = new Worker(URL.createObjectURL(labelProgramm));
            w.onmessage = function (e) {
                //that._labelHandler[e.data.id]._terrainWorkerCallback(e.data);
                //that._labelHandler[e.data.id] = null;

                //e.data.normalMapNormals = null;
                //e.data.normalMapVertices = null;
                //e.data.normalMapVerticesHigh = null;
                //e.data.normalMapVerticesLow = null;
                //e.data.terrainVertices = null;
                //e.data.terrainVerticesHigh = null;
                //e.data.terrainVerticesLow = null;

                //delete that._labelHandler[e.data.id];

                that._workerQueue.unshift(this);
                that.check();
            };

            this._workerQueue.push(w);
        }

        this._pendingQueue = []; //new QueueArray(512);
    }

    check() {
        if (this._pendingQueue.length) {
            var p = this._pendingQueue.pop();
            this.make(p.handler, p.data);
        }
    }

    make(handler, label) {
        if (this._workerQueue.length) {
            var w = this._workerQueue.pop();

            this._labelHandler[this._id] = handler;

            let labelData = new Float32Array([
                /*0*/this._id++,
                /*1*/handler._maxLetters,
                /*2*/label.getVisibility() ? 1 : 0,
                /*3, 4, 5*/label._positionHigh.x, label._positionHigh.y, label._positionHigh.z,
                /*6, 7, 8*/label._positionLow.x, label._positionLow.y, label._positionLow.z,
                /*9*/label._size,
                /*10, 11, 12*/label._offset.x, label._offset.y, label._offset.z,
                /*13, 14, 15, 16*/label._color.x, label._color.y, label._color.z, label._color.w,
                /*17*/label._rotation,
                /*18, 19, 20*/label._alignedAxis.x, label._alignedAxis.y, label._alignedAxis.z,
                /*21*/label._fontIndex,
                /*22*/label._outline,
                /*23, 24, 25, 26*/label._outlineColor.x, label._outlineColor.y, label._outlineColor.z, label._outlineColor.w,
                /*27, 28, 29*/label._entity._pickingColor.x, label._entity._pickingColor.y, label._entity._pickingColor.z
            ]);

            w.postMessage({
                labelData: labelData
            }, [
                labelData.buffer,
            ]);
        } else {
            this._pendingQueue.push({ handler: handler, label: label });
        }
    }
}

const _programm = `'use strict';

    function concatTypedArrays(a, b) {
        var c = new a.constructor(a.length + b.length);
        c.set(a, 0);
        c.set(b, a.length);
        return c;
    }

    self.onmessage = function (e) {
        var labelData = e.data.labelData,
            id = labelData[0],
            maxLetters = labelData[1],
            isVisible = labelData[2],
            /*3, 4, 5*/_positionHigh_x = labelData[3], _positionHigh_y = labelData[4], _positionHigh_z = labelData[5],
            /*6, 7, 8*/_positionLow_x = labelData[6], _positionLow_y = labelData[7], _positionLow_z = labelData[8],
            /*9*/_size = labelData[9],
            /*10, 11, 12*/_offset_x = labelData[10], _offset_y = labelData[11], _offset_z = labelData[12],
            /*13, 14, 15, 16*/_color_x = labelData[13], _color_y = labelData[14], _color_z = labelData[15], _color_w = labelData[16],
            /*17*/_rotation = labelData[17],
            /*18, 19, 20*/_alignedAxis_x = labelData[18], _alignedAxis_y = labelData[19], _alignedAxis_z = labelData[20],
            /*21*/_fontIndex = labelData[21],
            /*22*/_outline = labelData[22],
            /*23, 24, 25, 26*/_outlineColor_x = labelData[23], _outlineColor_y = labelData[24], _outlineColor_z = labelData[25], _outlineColor_w = labelData[26],
            /*27, 28, 29*/_pickingColor_x = labelData[27], _pickingColor_y = labelData[28], _pickingColor_z = labelData[29]
         

        let _vertexArr = new Float32Array(),
            _texCoordArr = new Float32Array(),
            _gliphParamArr = new Float32Array(),
            _positionHighArr = new Float32Array(),
            _positionLowArr = new Float32Array(),
            _sizeArr = new Float32Array(),
            _offsetArr = new Float32Array(),
            _rgbaArr = new Float32Array(),
            _rotationArr = new Float32Array(),
            _alignedAxisArr = new Float32Array(),
            _fontIndexArr = new Float32Array(),
            _outlineArr = new Float32Array(),
            _noOutlineArr = new Float32Array(),
            _outlineColorArr = new Float32Array(),
            _pickingColorArr = new Float32Array();
        
        for (var i = 0; i < maxLetters; i++) {
            if (isVisible !== 0) {
                _vertexArr = concatTypedArrays(_vertexArr, [0, 0, 0, -1, 1, -1, 1, -1, 1, 0, 0, 0]);
            } else {
                _vertexArr = concatTypedArrays(_vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
            }

            _texCoordArr = concatTypedArrays(_texCoordArr, [0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0]);
            _gliphParamArr = concatTypedArrays(_gliphParamArr, [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0]);

            var x = _positionHigh_x, y = _positionHigh_y, z = _positionHigh_z, w;
            _positionHighArr = concatTypedArrays(_positionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = _positionLow_x; y = _positionLow_y; z = _positionLow_z;
            _positionLowArr = concatTypedArrays(_positionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = _size;
            _sizeArr = concatTypedArrays(_sizeArr, [x, x, x, x, x, x]);

            x = _offset_x; y = _offset_y; z = _offset_z;
            _offsetArr = concatTypedArrays(_offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = _color_x; y = _color_y; z = _color_z; w = _color_w;
            _rgbaArr = concatTypedArrays(_rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

            x = _rotation;
            _rotationArr = concatTypedArrays(_rotationArr, [x, x, x, x, x, x]);

            x = _alignedAxis_x; y = _alignedAxis_y; z = _alignedAxis_z;
            _alignedAxisArr = concatTypedArrays(_alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = _fontIndex;
            _fontIndexArr = concatTypedArrays(_fontIndexArr, [x, x, x, x, x, x]);

            x = _outline;
            _outlineArr = concatTypedArrays(_outlineArr, [x, x, x, x, x, x]);

            w = 0.001;
            _noOutlineArr = concatTypedArrays(_noOutlineArr, [w, w, w, w, w, w]);

            x = _outlineColor_x; y = _outlineColor_y; z = _outlineColor_z; w = _outlineColor_w;
            _outlineColorArr = concatTypedArrays(_outlineColorArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

            x = _pickingColor_x / 255; y = _pickingColor_y / 255; z = _pickingColor_z / 255;
            _pickingColorArr = concatTypedArrays(_pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);
        }

        self.postMessage({
                id: id,
                vertexArr: _vertexArr,
                texCoordArr: _texCoordArr,
                gliphParamArr: _gliphParamArr,
                positionHighArr: _positionHighArr,
                positionLowArr: _positionLowArr,
                sizeArr: _sizeArr,
                offsetArr: _offsetArr,
                rgbaArr: _rgbaArr,
                rotationArr: _rotationArr,
                alignedAxisArr: _alignedAxisArr,
                fontIndexArr: _fontIndexArr,
                outlineArr: _outlineArr,
                noOutlineArr: _noOutlineArr,
                outlineColorArr: _outlineColorArr,
                pickingColorArr: _pickingColorArr
             }, [
                    _vertexArr.buffer,
                    _texCoordArr.buffer,
                    _gliphParamArr.buffer,
                    _positionHighArr.buffer,
                    _positionLowArr.buffer,
                    _sizeArr.buffer,
                    _offsetArr.buffer,
                    _rgbaArr.buffer,
                    _rotationArr.buffer,
                    _alignedAxisArr.buffer,
                    _fontIndexArr.buffer,
                    _outlineArr.buffer,
                    _noOutlineArr.buffer,
                    _outlineColorArr.buffer,
                    _pickingColorArr.buffer
            ]);
    }`;

export { LabelWorker };
