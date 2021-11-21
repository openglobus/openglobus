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
                this._id++,
                handler._maxLetters,
                label.getVisibility() ? 1 : 0,
                label._positionHigh.x, label._positionHigh.y, label._positionHigh.z,
                label._positionLow.x, label._positionLow.y, label._positionLow.z,
                label._size,
                label._offset.x, label._offset.y, label._offset.z,
                label._color.x, label._color.y, label._color.z, label._color.w,
                label._rotation,
                label._alignedAxis.x, label._alignedAxis.y, label._alignedAxis.z,
                label._fontIndex,
                label._outline,
                label._outlineColor.x, label._outlineColor.y, label._outlineColor.z, label._outlineColor.w,
                label._entity._pickingColor.x, label._entity._pickingColor.y, label._entity._pickingColor.z
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
            isVisible = labelData[2];

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

            var x = label._positionHigh.x, y = label._positionHigh.y, z = label._positionHigh.z, w;
            _positionHighArr = concatTypedArrays(_positionHighArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = label._positionLow.x; y = label._positionLow.y; z = label._positionLow.z;
            _positionLowArr = concatTypedArrays(_positionLowArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = label._size;
            _sizeArr = concatTypedArrays(_sizeArr, [x, x, x, x, x, x]);

            x = label._offset.x; y = label._offset.y; z = label._offset.z;
            _offsetArr = concatTypedArrays(_offsetArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = label._color.x; y = label._color.y; z = label._color.z; w = label._color.w;
            _rgbaArr = concatTypedArrays(_rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

            x = label._rotation;
            _rotationArr = concatTypedArrays(_rotationArr, [x, x, x, x, x, x]);

            x = label._alignedAxis.x; y = label._alignedAxis.y; z = label._alignedAxis.z;
            _alignedAxisArr = concatTypedArrays(_alignedAxisArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]);

            x = label._fontIndex;
            _fontIndexArr = concatTypedArrays(_fontIndexArr, [x, x, x, x, x, x]);

            x = label._outline;
            _outlineArr = concatTypedArrays(_outlineArr, [x, x, x, x, x, x]);

            w = 0.001;
            _noOutlineArr = concatTypedArrays(_noOutlineArr, [w, w, w, w, w, w]);

            x = label._outlineColor.x; y = label._outlineColor.y; z = label._outlineColor.z; w = label._outlineColor.w;
            _outlineColorArr = concatTypedArrays(_outlineColorArr, [x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w, x, y, z, w]);

            x = label._entity._pickingColor.x / 255; y = label._entity._pickingColor.y / 255; z = label._entity._pickingColor.z / 255;
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
