import * as shaders from "../../shaders/label/label";
import {ALIGN, Label} from "./Label";
import {BaseBillboardHandler} from "../billboard/BaseBillboardHandler";
import {concatTypedArrays, spliceTypedArray} from "../../utils/shared";
import {EntityCollection} from "../EntityCollection";
import {LOCK_FREE} from "./LabelWorker";
import {Planet} from "../../scene/Planet";
import type {WebGLBufferExt} from "../../webgl/Handler";
import type {ProgramController} from "../../webgl/ProgramController";
import {Vec3} from "../../math/Vec3";
import {Vec4} from "../../math/Vec4";
import {BaseBillboard} from "../billboard/BaseBillboard";

type LabelWorkerCallbackData = {
    vertexArr: Float32Array,
    texCoordArr: Float32Array,
    gliphParamArr: Float32Array,
    positionHighArr: Float32Array,
    positionLowArr: Float32Array,
    sizeArr: Float32Array,
    offsetArr: Float32Array,
    rgbaArr: Float32Array,
    rotationArr: Float32Array,
    fontIndexArr: Float32Array,
    outlineArr: Float32Array,
    outlineColorArr: Float32Array,
    pickingColorArr: Float32Array
}

const PICKINGCOLOR_BUFFER = 0;
const POSITION_BUFFER = 1;
const SIZE_BUFFER = 2;
const OFFSET_BUFFER = 3;
const RGBA_BUFFER = 4;
const ROTATION_BUFFER = 5;
const TEXCOORD_BUFFER = 6;
const VERTEX_BUFFER = 7;
const FONTINDEX_BUFFER = 8;
const OUTLINE_BUFFER = 9;
const OUTLINECOLOR_BUFFER = 10;

const EMPTY = -1.0;
const RTL = 1.0;

class LabelPassHandler {
    protected _owner: LabelHandler;
    protected _isOutlinePass: boolean;

    constructor(owner: LabelHandler, isOutlinePass: boolean) {
        this._owner = owner;
        this._isOutlinePass = isOutlinePass;
    }

    public drawOpaque() {
        this._owner.drawPass(this._isOutlinePass, true);
    }

    public drawTransparent() {
        this._owner.drawPass(this._isOutlinePass, false);
    }

    public drawTransparentForward() {
        this._owner.drawPass(this._isOutlinePass, false, true);
    }
}

class LabelHandler extends BaseBillboardHandler {

    protected override _billboards: Label[];

    protected _gliphParamBuffer: WebGLBufferExt | null;
    protected _fontIndexBuffer: WebGLBufferExt | null;
    protected _outlineBuffer: WebGLBufferExt | null;
    protected _outlineColorBuffer: WebGLBufferExt | null;

    protected _gliphParamArr: Float32Array;
    protected _fontIndexArr: Float32Array;
    protected _outlineArr: Float32Array;
    protected _outlineColorArr: Float32Array;

    public fillLabelHandler: LabelPassHandler;
    public outlineLabelHandler: LabelPassHandler;

    public _maxLetters: number;

    constructor(entityCollection: EntityCollection, maxLetters: number = 21) {
        super(entityCollection);

        this._billboards = [];

        this._gliphParamBuffer = null;
        this._fontIndexBuffer = null;
        this._outlineBuffer = null;
        this._outlineColorBuffer = null;

        this._gliphParamArr = new Float32Array([]);
        this._fontIndexArr = new Float32Array([]);
        this._outlineArr = new Float32Array([]);
        this._outlineColorArr = new Float32Array([]);

        this._buffersUpdateCallbacks[FONTINDEX_BUFFER] = this.createFontIndexBuffer;
        this._buffersUpdateCallbacks[OUTLINE_BUFFER] = this.createOutlineBuffer;
        this._buffersUpdateCallbacks[OUTLINECOLOR_BUFFER] = this.createOutlineColorBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);

        this.fillLabelHandler = new LabelPassHandler(this, false);
        this.outlineLabelHandler = new LabelPassHandler(this, true);

        this._maxLetters = maxLetters;
    }

    public override initProgram() {
        if (this._renderer && this._renderer.handler && this._renderer.handler.gl) {
            this._renderer.addPrograms(
                shaders.label_webgl2(),
                shaders.label_woit(),
                shaders.labelPicking()
            );
        }
    }

    public get labels(): Label[] {
        return this._billboards;
    }

    public override add(label: Label) {
        if (!label._handler) {
            label._handler = this;
            this.assignFontAtlas(label);
            this.refresh();
        }
    }

    public updateFonts() {
        let l = [...this._billboards];
        this._billboards = [];
        for (let i = 0; i < l.length; i++) {
            this.assignFontAtlas(l[i]);
        }
    }

    protected _addLabelToArrays(label: Label) {
        this._renderer && this._renderer.labelWorker.make({handler: this, label: label});
    }

    public assignFontAtlas(label: Label) {
        if (this._entityCollection && this._renderer) {
            label.assignFontAtlas(this._renderer.fontAtlas);
            this._addLabelToArrays(label);
        } else {
            this._billboards.push(label);
        }
    }

    public workerCallback(data: LabelWorkerCallbackData, label: Label) {
        if (label._lockId !== LOCK_FREE && label._handler && this.isEqual(label._handler)) {
            label._isReady = true;
            label._lockId = LOCK_FREE;
            label._handlerIndex = this._billboards.length;

            this._billboards.push(label);

            this._vertexArr = concatTypedArrays(this._vertexArr, data.vertexArr) as Float32Array;
            this._texCoordArr = concatTypedArrays(this._texCoordArr, data.texCoordArr) as Float32Array;
            this._gliphParamArr = concatTypedArrays(this._gliphParamArr, data.gliphParamArr) as Float32Array;
            this._positionHighArr = concatTypedArrays(this._positionHighArr, data.positionHighArr) as Float32Array;
            this._positionLowArr = concatTypedArrays(this._positionLowArr, data.positionLowArr) as Float32Array;
            this._sizeArr = concatTypedArrays(this._sizeArr, data.sizeArr) as Float32Array;
            this._offsetArr = concatTypedArrays(this._offsetArr, data.offsetArr) as Float32Array;
            this._rgbaArr = concatTypedArrays(this._rgbaArr, data.rgbaArr) as Float32Array;
            this._rotationArr = concatTypedArrays(this._rotationArr, data.rotationArr) as Float32Array;
            this._fontIndexArr = concatTypedArrays(this._fontIndexArr, data.fontIndexArr) as Float32Array;
            this._outlineArr = concatTypedArrays(this._outlineArr, data.outlineArr) as Float32Array;
            this._outlineColorArr = concatTypedArrays(this._outlineColorArr, data.outlineColorArr) as Float32Array;
            this._pickingColorArr = concatTypedArrays(this._pickingColorArr, data.pickingColorArr) as Float32Array;

            this._insertBillboardByOpacity(label._handlerIndex, this._isBillboardOpaque(label));

            label.update();

            this.refresh();
        }
    }

    protected override _isBillboardOpaque(billboard: BaseBillboard): boolean {
        const label = billboard as Label;
        return label._color.w >= 1.0 && label.getOutlineOpacity() >= 1.0;
    }

    protected override _swapBillboardData(firstIndex: number, secondIndex: number) {
        if (firstIndex === secondIndex) {
            return;
        }

        this._swapArrayItems(this._rgbaArr, 24 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._outlineColorArr, 24 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._texCoordArr, 24 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._gliphParamArr, 24 * this._maxLetters, firstIndex, secondIndex);

        this._swapArrayItems(this._positionHighArr, 18 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._positionLowArr, 18 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._offsetArr, 18 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._pickingColorArr, 18 * this._maxLetters, firstIndex, secondIndex);

        this._swapArrayItems(this._vertexArr, 12 * this._maxLetters, firstIndex, secondIndex);

        this._swapArrayItems(this._sizeArr, 6 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._rotationArr, 6 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._fontIndexArr, 6 * this._maxLetters, firstIndex, secondIndex);
        this._swapArrayItems(this._outlineArr, 6 * this._maxLetters, firstIndex, secondIndex);

        const firstLabel = this._billboards[firstIndex];
        const secondLabel = this._billboards[secondIndex];
        this._billboards[firstIndex] = secondLabel;
        this._billboards[secondIndex] = firstLabel;
        firstLabel._handlerIndex = secondIndex;
        secondLabel._handlerIndex = firstIndex;
    }

    public override clear() {
        // @ts-ignore
        this._texCoordArr = null;
        // @ts-ignore
        this._gliphParamArr = null;
        // @ts-ignore
        this._vertexArr = null;
        // @ts-ignore
        this._positionHighArr = null;
        // @ts-ignore
        this._positionLowArr = null;
        // @ts-ignore
        this._sizeArr = null;
        // @ts-ignore
        this._offsetArr = null;
        // @ts-ignore
        this._rgbaArr = null;
        // @ts-ignore
        this._rotationArr = null;
        // @ts-ignore
        this._fontIndexArr = null;
        // @ts-ignore
        this._outlineArr = null;
        // @ts-ignore
        this._outlineColorArr = null;

        this._texCoordArr = new Float32Array([]);
        this._gliphParamArr = new Float32Array([]);
        this._vertexArr = new Float32Array([]);
        this._positionHighArr = new Float32Array([]);
        this._positionLowArr = new Float32Array([]);
        this._sizeArr = new Float32Array([]);
        this._offsetArr = new Float32Array([]);
        this._rgbaArr = new Float32Array([]);
        this._rotationArr = new Float32Array([]);
        this._fontIndexArr = new Float32Array([]);
        this._outlineArr = new Float32Array([]);
        this._outlineColorArr = new Float32Array([]);

        this._removeBillboards();
        this._deleteBuffers();
        this.refresh();
    }

    protected override _deleteBuffers() {
        if (this._renderer) {
            let gl = this._renderer.handler.gl!;
            gl.deleteBuffer(this._gliphParamBuffer!);
            gl.deleteBuffer(this._sizeBuffer!);
            gl.deleteBuffer(this._fontIndexBuffer!);
            gl.deleteBuffer(this._texCoordBuffer!);
            gl.deleteBuffer(this._outlineBuffer!);
            gl.deleteBuffer(this._outlineColorBuffer!);
            gl.deleteBuffer(this._positionHighBuffer!);
            gl.deleteBuffer(this._positionLowBuffer!);
            gl.deleteBuffer(this._sizeBuffer!);
            gl.deleteBuffer(this._offsetBuffer!);
            gl.deleteBuffer(this._rgbaBuffer!);
            gl.deleteBuffer(this._rotationBuffer!);
            gl.deleteBuffer(this._vertexBuffer!);
            gl.deleteBuffer(this._texCoordBuffer!);
            gl.deleteBuffer(this._pickingColorBuffer!);

            this._gliphParamBuffer = null;
            this._sizeBuffer = null;
            this._fontIndexBuffer = null;
            this._texCoordBuffer = null;
            this._outlineBuffer = null;
            this._outlineColorBuffer = null;
            this._positionHighBuffer = null;
            this._positionLowBuffer = null;
            this._sizeBuffer = null;
            this._offsetBuffer = null;
            this._rgbaBuffer = null;
            this._rotationBuffer = null;
            this._vertexBuffer = null;
            this._texCoordBuffer = null;
            this._pickingColorBuffer = null;
        }
    }

    protected override _getOpaqueProgram(): ProgramController {
        return this._renderer!.handler.programs.label;
    }

    protected override _getTransparentProgram(): ProgramController {
        return this._renderer!.handler.programs.labelWoit;
    }

    public override drawOpaque() {
        if (this._billboards.length) {
            this.update();
            this.outlineLabelHandler.drawOpaque();
            this.fillLabelHandler.drawOpaque();
        }
    }

    public override drawTransparent() {
        if (this._billboards.length) {
            this.outlineLabelHandler.drawTransparent();
            this.fillLabelHandler.drawTransparent();
        }
    }

    public override drawTransparentForward() {
        if (this._billboards.length) {
            this.outlineLabelHandler.drawTransparentForward();
            this.fillLabelHandler.drawTransparentForward();
        }
    }

    public drawPass(isOutlinePass: boolean, opaquePass: boolean, drawInForward: boolean = false) {
        if (!this._billboards.length) {
            return;
        }

        const startBillboardIndex = opaquePass ? 0 : this._opaqueCounterIndex;
        const endBillboardIndex = opaquePass ? this._opaqueCounterIndex : this._billboards.length;
        if (endBillboardIndex <= startBillboardIndex) {
            return;
        }

        const labelProgram = opaquePass || drawInForward ? this._getOpaqueProgram() : this._getTransparentProgram();
        const depthWrite = opaquePass && !drawInForward;
        this._drawLabelPass(startBillboardIndex, endBillboardIndex, labelProgram, isOutlinePass, depthWrite);
    }

    protected _displayOutlinePASS(startBillboardIndex: number, endBillboardIndex: number, labelProgram: ProgramController) {
        this._drawLabelPass(startBillboardIndex, endBillboardIndex, labelProgram, true);
    }

    protected _displayFillPASS(startBillboardIndex: number, endBillboardIndex: number, labelProgram: ProgramController) {
        this._drawLabelPass(startBillboardIndex, endBillboardIndex, labelProgram, false);
    }

    protected _drawLabelPass(startBillboardIndex: number, endBillboardIndex: number, labelProgram: ProgramController, isOutlinePass: boolean, depthWrite: boolean = true) {
        let r = this._renderer!;
        let h = r.handler;
        labelProgram.activate();
        let sh = labelProgram._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        let gl = h.gl!,
            ec = this._entityCollection;

        let fontTextureArray = r.fontAtlas.textureArray;
        if (!fontTextureArray) {
            return;
        }

        gl.disable(gl.CULL_FACE);
        const depthState = this._configureDepthPass(depthWrite);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, fontTextureArray);
        gl.uniform1i(shu.fontTextureArr, 0);
        gl.uniform4fv(shu.sdfParamsArr, r.fontAtlas.sdfParamsArr);
        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);
        gl.uniform3fv(shu.scaleByDistance, ec.scaleByDistance);
        gl.uniform1f(shu.opacity, ec._fadingOpacity);
        gl.uniform1f(shu.planetRadius, (ec.renderNode as Planet)._planetRadius2 || 0);
        gl.uniform2fv(shu.viewport, [h.canvas!.clientWidth, h.canvas!.clientHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
        gl.vertexAttribPointer(sha.a_texCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gliphParamBuffer!);
        gl.vertexAttribPointer(sha.a_gliphParam, this._gliphParamBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer!);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer!);
        gl.vertexAttribPointer(sha.a_positionsHigh, this._positionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer!);
        gl.vertexAttribPointer(sha.a_positionsLow, this._positionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer!);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer!);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._fontIndexBuffer!);
        gl.vertexAttribPointer(sha.a_fontIndex, this._fontIndexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        const numLabels = endBillboardIndex - startBillboardIndex;
        if (numLabels <= 0) {
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
            this._restoreDepthPass(depthState);
            gl.enable(gl.CULL_FACE);
            return;
        }

        const startVertexIndex = startBillboardIndex * 6 * this._maxLetters;
        const vertexCount = numLabels * 6 * this._maxLetters;

        gl.uniform1i(shu.isOutlinePass, isOutlinePass ? 1 : 0);
        gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

        if (isOutlinePass) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._outlineColorBuffer!);
            gl.vertexAttribPointer(sha.a_rgba, this._outlineColorBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._outlineBuffer!);
            gl.vertexAttribPointer(sha.a_outline, this._outlineBuffer!.itemSize, gl.FLOAT, false, 0, 0);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
            gl.vertexAttribPointer(sha.a_rgba, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._outlineBuffer!);
            gl.vertexAttribPointer(sha.a_outline, this._outlineBuffer!.itemSize, gl.FLOAT, false, 0, 0);
        }

        gl.drawArrays(gl.TRIANGLES, startVertexIndex, vertexCount);

        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
        this._restoreDepthPass(depthState);
        gl.enable(gl.CULL_FACE);
    }

    protected override _displayPASS(startBillboardIndex: number, endBillboardIndex: number, labelProgram: ProgramController) {
        this._displayOutlinePASS(startBillboardIndex, endBillboardIndex, labelProgram);
        this._displayFillPASS(startBillboardIndex, endBillboardIndex, labelProgram);
    }

    protected override _pickingPASS() {
        let r = this._renderer!;
        let h = r.handler;
        h.programs.labelPicking.activate();
        let sh = h.programs.labelPicking._program;
        let sha = sh.attributes,
            shu = sh.uniforms;

        let gl = h.gl!,
            ec = this._entityCollection;

        let rn = ec.renderNode;

        const disableDepthTest = (r.activeCamera as any).slope > 0.5;
        if (disableDepthTest) {
            gl.disable(gl.DEPTH_TEST);
        }

        gl.disable(gl.CULL_FACE);

        gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera.getViewMatrix());
        gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniform3fv(shu.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(shu.eyePositionLow, r.activeCamera.eyeLow);
        gl.uniform3fv(shu.scaleByDistance, ec.scaleByDistance);
        gl.uniform1f(shu.opacity, ec._fadingOpacity);
        gl.uniform1f(shu.planetRadius, (rn as Planet)._planetRadius2 || 0);
        gl.uniform2fv(shu.viewport, [h.canvas!.clientWidth, h.canvas!.clientHeight]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
        gl.vertexAttribPointer(sha.a_texCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._gliphParamBuffer!);
        gl.vertexAttribPointer(sha.a_gliphParam, this._gliphParamBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer!);
        gl.vertexAttribPointer(sha.a_vertices, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer!);
        gl.vertexAttribPointer(sha.a_positionsHigh, this._positionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer!);
        gl.vertexAttribPointer(sha.a_positionsLow, this._positionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(sha.a_size, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rotationBuffer!);
        gl.vertexAttribPointer(sha.a_rotation, this._rotationBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._offsetBuffer!);
        gl.vertexAttribPointer(sha.a_offset, this._offsetBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingColorBuffer!);
        gl.vertexAttribPointer(sha.a_rgba, this._pickingColorBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(shu.depthOffset, ec.polygonOffsetUnits);

        gl.drawArrays(gl.TRIANGLES, 0, this._vertexBuffer!.numItems);

        if (disableDepthTest) {
            gl.enable(gl.DEPTH_TEST);
        }
        gl.enable(gl.CULL_FACE);
    }

    protected override _removeBillboard(label: Label) {

        let removeIndex = label._handlerIndex;

        if (removeIndex < this._opaqueCounterIndex) {
            this._opaqueCounterIndex--;
            this._swapBillboardData(removeIndex, this._opaqueCounterIndex);
            removeIndex = this._opaqueCounterIndex;
        }

        const lastIndex = this._billboards.length - 1;
        this._swapBillboardData(removeIndex, lastIndex);
        this._billboards.pop();

        let ml = 24 * this._maxLetters;
        let i = lastIndex * ml;
        this._rgbaArr = spliceTypedArray<Float32Array>(this._rgbaArr, i, ml);
        this._outlineColorArr = spliceTypedArray<Float32Array>(this._outlineColorArr, i, ml);
        this._texCoordArr = spliceTypedArray<Float32Array>(this._texCoordArr, i, ml);
        this._gliphParamArr = spliceTypedArray<Float32Array>(this._gliphParamArr, i, ml);

        ml = 18 * this._maxLetters;
        i = lastIndex * ml;
        this._positionHighArr = spliceTypedArray<Float32Array>(this._positionHighArr, i, ml);
        this._positionLowArr = spliceTypedArray<Float32Array>(this._positionLowArr, i, ml);
        this._offsetArr = spliceTypedArray<Float32Array>(this._offsetArr, i, ml);
        this._pickingColorArr = spliceTypedArray<Float32Array>(this._pickingColorArr, i, ml);

        ml = 12 * this._maxLetters;
        i = lastIndex * ml;
        this._vertexArr = spliceTypedArray<Float32Array>(this._vertexArr, i, ml);

        ml = 6 * this._maxLetters;
        i = lastIndex * ml;
        this._sizeArr = spliceTypedArray<Float32Array>(this._sizeArr, i, ml);
        this._rotationArr = spliceTypedArray<Float32Array>(this._rotationArr, i, ml);
        this._fontIndexArr = spliceTypedArray<Float32Array>(this._fontIndexArr, i, ml);
        this._outlineArr = spliceTypedArray<Float32Array>(this._outlineArr, i, ml);

        this.refresh();

        label._handlerIndex = -1;
        label._handler = null;
        label._isReady = false;
    }

    public setText(index: number, text: string, fontIndex: number, align: number, letterSpacing: number = 0, isRTL: boolean = false) {

        text = text.normalize('NFKC');

        let fa = this._renderer!.fontAtlas.atlasesArr[fontIndex];

        if (!fa) return;

        let i = index * 24 * this._maxLetters;
        let a = this._texCoordArr,
            g = this._gliphParamArr;

        let c = 0;

        let len = Math.min(this._maxLetters, text.length);
        let _rtl_ = 0.0;
        if (isRTL) {
            _rtl_ = RTL;
        }

        let offset = 0.0;
        let kern = fa.kernings;

        for (c = 0; c < len; c++) {
            let j = i + c * 24;
            let char = text[c];
            let n = fa.get(char.charCodeAt(0)) || fa.get(" ".charCodeAt(0))!;
            if (!n) continue;
            let tc = n.texCoords;

            let m = n.metrics;

            a[j] = tc[0];
            a[j + 1] = tc[1];
            a[j + 2] = offset;
            a[j + 3] = _rtl_;

            a[j + 4] = tc[2];
            a[j + 5] = tc[3];
            a[j + 6] = offset;
            a[j + 7] = _rtl_;

            a[j + 8] = tc[4];
            a[j + 9] = tc[5];
            a[j + 10] = offset;
            a[j + 11] = _rtl_;

            a[j + 12] = tc[6];
            a[j + 13] = tc[7];
            a[j + 14] = offset;
            a[j + 15] = _rtl_;

            a[j + 16] = tc[8];
            a[j + 17] = tc[9];
            a[j + 18] = offset;
            a[j + 19] = _rtl_;

            a[j + 20] = tc[10];
            a[j + 21] = tc[11];
            a[j + 22] = offset;
            a[j + 23] = _rtl_;

            //
            // Gliph
            //
            g[j] = m.nWidth;
            g[j + 1] = m.nHeight;
            g[j + 2] = m.nXOffset;
            g[j + 3] = m.nYOffset;

            g[j + 4] = m.nWidth;
            g[j + 5] = m.nHeight;
            g[j + 6] = m.nXOffset;
            g[j + 7] = m.nYOffset;

            g[j + 8] = m.nWidth;
            g[j + 9] = m.nHeight;
            g[j + 10] = m.nXOffset;
            g[j + 11] = m.nYOffset;

            g[j + 12] = m.nWidth;
            g[j + 13] = m.nHeight;
            g[j + 14] = m.nXOffset;
            g[j + 15] = m.nYOffset;

            g[j + 16] = m.nWidth;
            g[j + 17] = m.nHeight;
            g[j + 18] = m.nXOffset;
            g[j + 19] = m.nYOffset;

            g[j + 20] = m.nWidth;
            g[j + 21] = m.nHeight;
            g[j + 22] = m.nXOffset;
            g[j + 23] = m.nYOffset;

            let k = kern[char.charCodeAt(0)];
            if (k && text[c + 1]) {
                let kk = k[text[c + 1].charCodeAt(0)];
                if (kk) {
                    offset += m.nAdvance + kk + letterSpacing;
                } else {
                    offset += m.nAdvance + letterSpacing;
                }
            } else {
                offset += m.nAdvance + letterSpacing;
            }
        }

        // 49/512 - font atlas left border letter offset
        if (align === ALIGN.CENTER) {
            offset *= -0.5;
            for (c = 0; c < len; c++) {
                let j = i + c * 24;
                a[j + 2] += offset;
                a[j + 6] += offset;
                a[j + 10] += offset;
                a[j + 14] += offset;
                a[j + 18] += offset;
                a[j + 22] += offset;
            }
        }

        for (; c < this._maxLetters; c++) {
            let j = i + c * 24;
            a[j + 3] = EMPTY;
            a[j + 7] = EMPTY;
            a[j + 11] = EMPTY;
            a[j + 15] = EMPTY;
            a[j + 19] = EMPTY;
            a[j + 23] = EMPTY;
        }

        this._changedBuffers[TEXCOORD_BUFFER] = true;
    }

    public override setPositionArr(index: number, positionHigh: Vec3, positionLow: Vec3) {
        let i = index * 18 * this._maxLetters;
        let a = this._positionHighArr,
            x = positionHigh.x,
            y = positionHigh.y,
            z = positionHigh.z,
            b = this._positionLowArr,
            xl = positionLow.x,
            yl = positionLow.y,
            zl = positionLow.z;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 18;
            a[j] = x;
            a[j + 1] = y;
            a[j + 2] = z;

            a[j + 3] = x;
            a[j + 4] = y;
            a[j + 5] = z;

            a[j + 6] = x;
            a[j + 7] = y;
            a[j + 8] = z;

            a[j + 9] = x;
            a[j + 10] = y;
            a[j + 11] = z;

            a[j + 12] = x;
            a[j + 13] = y;
            a[j + 14] = z;

            a[j + 15] = x;
            a[j + 16] = y;
            a[j + 17] = z;

            // low
            b[j] = xl;
            b[j + 1] = yl;
            b[j + 2] = zl;

            b[j + 3] = xl;
            b[j + 4] = yl;
            b[j + 5] = zl;

            b[j + 6] = xl;
            b[j + 7] = yl;
            b[j + 8] = zl;

            b[j + 9] = xl;
            b[j + 10] = yl;
            b[j + 11] = zl;

            b[j + 12] = xl;
            b[j + 13] = yl;
            b[j + 14] = zl;

            b[j + 15] = xl;
            b[j + 16] = yl;
            b[j + 17] = zl;
        }

        this._changedBuffers[POSITION_BUFFER] = true;
    }

    public override setPickingColorArr(index: number, color: Vec3) {
        let i = index * 18 * this._maxLetters;
        let a = this._pickingColorArr,
            x = color.x / 255,
            y = color.y / 255,
            z = color.z / 255;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 18;
            a[j] = x;
            a[j + 1] = y;
            a[j + 2] = z;

            a[j + 3] = x;
            a[j + 4] = y;
            a[j + 5] = z;

            a[j + 6] = x;
            a[j + 7] = y;
            a[j + 8] = z;

            a[j + 9] = x;
            a[j + 10] = y;
            a[j + 11] = z;

            a[j + 12] = x;
            a[j + 13] = y;
            a[j + 14] = z;

            a[j + 15] = x;
            a[j + 16] = y;
            a[j + 17] = z;
        }

        this._changedBuffers[PICKINGCOLOR_BUFFER] = true;
    }

    public override setSizeArr(index: number, size: number) {
        let i = index * 6 * this._maxLetters;
        let a = this._sizeArr;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 6;
            a[j] = size;
            a[j + 1] = size;
            a[j + 2] = size;
            a[j + 3] = size;
            a[j + 4] = size;
            a[j + 5] = size;
        }

        this._changedBuffers[SIZE_BUFFER] = true;
    }

    public override setOffsetArr(index: number, offset: Vec3) {
        let i = index * 18 * this._maxLetters;
        let a = this._offsetArr,
            x = offset.x,
            y = offset.y,
            z = offset.z;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 18;
            a[j] = x;
            a[j + 1] = y;
            a[j + 2] = z;

            a[j + 3] = x;
            a[j + 4] = y;
            a[j + 5] = z;

            a[j + 6] = x;
            a[j + 7] = y;
            a[j + 8] = z;

            a[j + 9] = x;
            a[j + 10] = y;
            a[j + 11] = z;

            a[j + 12] = x;
            a[j + 13] = y;
            a[j + 14] = z;

            a[j + 15] = x;
            a[j + 16] = y;
            a[j + 17] = z;
        }

        this._changedBuffers[OFFSET_BUFFER] = true;
    }

    public override setRgbaArr(index: number, rgba: Vec4) {
        let i = index * 24 * this._maxLetters;
        let a = this._rgbaArr,
            x = rgba.x,
            y = rgba.y,
            z = rgba.z,
            w = rgba.w;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 24;

            a[j] = x;
            a[j + 1] = y;
            a[j + 2] = z;
            a[j + 3] = w;

            a[j + 4] = x;
            a[j + 5] = y;
            a[j + 6] = z;
            a[j + 7] = w;

            a[j + 8] = x;
            a[j + 9] = y;
            a[j + 10] = z;
            a[j + 11] = w;

            a[j + 12] = x;
            a[j + 13] = y;
            a[j + 14] = z;
            a[j + 15] = w;

            a[j + 16] = x;
            a[j + 17] = y;
            a[j + 18] = z;
            a[j + 19] = w;

            a[j + 20] = x;
            a[j + 21] = y;
            a[j + 22] = z;
            a[j + 23] = w;
        }

        const opacityOffset = index * 24 * this._maxLetters + 3;
        const outlineAlpha = this._outlineColorArr[opacityOffset];
        const opacityChanged = this._updateBillboardOpacityState(index, w >= 1.0 && outlineAlpha >= 1.0);
        if (opacityChanged) {
            this.refresh();
        } else {
            this._changedBuffers[RGBA_BUFFER] = true;
        }
    }

    public setOutlineColorArr(index: number, rgba: Vec4) {
        let i = index * 24 * this._maxLetters;
        let a = this._outlineColorArr,
            x = rgba.x,
            y = rgba.y,
            z = rgba.z,
            w = rgba.w;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 24;

            a[j] = x;
            a[j + 1] = y;
            a[j + 2] = z;
            a[j + 3] = w;

            a[j + 4] = x;
            a[j + 5] = y;
            a[j + 6] = z;
            a[j + 7] = w;

            a[j + 8] = x;
            a[j + 9] = y;
            a[j + 10] = z;
            a[j + 11] = w;

            a[j + 12] = x;
            a[j + 13] = y;
            a[j + 14] = z;
            a[j + 15] = w;

            a[j + 16] = x;
            a[j + 17] = y;
            a[j + 18] = z;
            a[j + 19] = w;

            a[j + 20] = x;
            a[j + 21] = y;
            a[j + 22] = z;
            a[j + 23] = w;
        }

        const opacityOffset = index * 24 * this._maxLetters + 3;
        const fillAlpha = this._rgbaArr[opacityOffset];
        const opacityChanged = this._updateBillboardOpacityState(index, fillAlpha >= 1.0 && w >= 1.0);
        if (opacityChanged) {
            this.refresh();
        } else {
            this._changedBuffers[OUTLINECOLOR_BUFFER] = true;
        }
    }

    public setOutlineArr(index: number, outline: number) {
        let i = index * 6 * this._maxLetters;
        let a = this._outlineArr;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 6;
            a[j] = outline;
            a[j + 1] = outline;
            a[j + 2] = outline;
            a[j + 3] = outline;
            a[j + 4] = outline;
            a[j + 5] = outline;
        }

        this._changedBuffers[OUTLINE_BUFFER] = true;
    }

    public override setRotationArr(index: number, rotation: number) {
        let i = index * 6 * this._maxLetters;
        let a = this._rotationArr;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 6;
            a[j] = rotation;
            a[j + 1] = rotation;
            a[j + 2] = rotation;
            a[j + 3] = rotation;
            a[j + 4] = rotation;
            a[j + 5] = rotation;
        }

        this._changedBuffers[ROTATION_BUFFER] = true;
    }

    public override setVisibility(index: number, visibility: boolean) {
        let vArr;
        if (visibility) {
            vArr = [0, 0, 0, -1, 1, -1, 1, -1, 1, 0, 0, 0];
        } else {
            vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        this.setVertexArr(index, vArr);
    }

    public override setVertexArr(index: number, vertexArr: number[] | Float32Array) {
        let i = index * 12 * this._maxLetters;
        let a = this._vertexArr;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 12;

            a[j] = vertexArr[0];
            a[j + 1] = vertexArr[1];

            a[j + 2] = vertexArr[2];
            a[j + 3] = vertexArr[3];

            a[j + 4] = vertexArr[4];
            a[j + 5] = vertexArr[5];

            a[j + 6] = vertexArr[6];
            a[j + 7] = vertexArr[7];

            a[j + 8] = vertexArr[8];
            a[j + 9] = vertexArr[9];

            a[j + 10] = vertexArr[10];
            a[j + 11] = vertexArr[11];
        }

        this._changedBuffers[VERTEX_BUFFER] = true;
    }

    public setFontIndexArr(index: number, fontIndex: number) {
        let i = index * 6 * this._maxLetters;
        let a = this._fontIndexArr;

        for (let q = 0; q < this._maxLetters; q++) {
            let j = i + q * 6;
            a[j] = fontIndex;
            a[j + 1] = fontIndex;
            a[j + 2] = fontIndex;
            a[j + 3] = fontIndex;
            a[j + 4] = fontIndex;
            a[j + 5] = fontIndex;
        }

        this._changedBuffers[FONTINDEX_BUFFER] = true;
    }

    public override createSizeBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._sizeBuffer as WebGLBuffer);
        this._sizeBuffer = h.createArrayBuffer(this._sizeArr, 1, this._sizeArr.length);
    }

    public createFontIndexBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._fontIndexBuffer as WebGLBuffer);
        this._fontIndexBuffer = h.createArrayBuffer(this._fontIndexArr, 1, this._fontIndexArr.length);
    }

    public override createTexCoordBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer as WebGLBuffer);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr, 4, this._texCoordArr.length / 4);

        h.gl!.deleteBuffer(this._gliphParamBuffer as WebGLBuffer);
        this._gliphParamBuffer = h.createArrayBuffer(this._gliphParamArr, 4, this._gliphParamArr.length / 4);
    }

    public createOutlineBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._outlineBuffer as WebGLBuffer);
        this._outlineBuffer = h.createArrayBuffer(this._outlineArr, 1, this._outlineArr.length);
    }

    public createOutlineColorBuffer() {
        let h = this._renderer!.handler;
        h.gl!.deleteBuffer(this._outlineColorBuffer as WebGLBuffer);
        this._outlineColorBuffer = h.createArrayBuffer(this._outlineColorArr, 4, this._outlineColorArr.length / 4);
    }

    public setMaxLetters(c: number) {
        this._maxLetters = c;
        // TODO: ...
    }
}

export {LabelHandler};
