import {BaseBillboardHandler} from "./BaseBillboardHandler";
import {Billboard} from "./Billboard";
import {concatTypedArrays} from "../utils/shared";
import {EntityCollection} from "./EntityCollection";

/**
 * @class BillboardHandler
 */
class BillboardHandler extends BaseBillboardHandler {

    protected override _billboards: Billboard[];

    constructor(props: EntityCollection) {
        super(props);

        this._billboards = [];
    }

    public override add(billboard: Billboard) {
        if (billboard._handlerIndex == -1) {
            super.add(billboard);

            this._addBillboardToArrays(billboard);
            this.refresh();
            let src = billboard.getSrc() || (billboard.getImage() && billboard.getImage()!.src);
            if (src) {
                billboard.setSrc(src);
            }
        }
    }

    protected _addBillboardToArrays(billboard: Billboard) {
        if (billboard.getVisibility()) {
            this._vertexArr = concatTypedArrays(
                this._vertexArr,
                [-0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]
            ) as Float32Array;
        } else {
            this._vertexArr = concatTypedArrays(
                this._vertexArr,
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ) as Float32Array;
        }

        this._texCoordArr = concatTypedArrays(
            this._texCoordArr,
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ) as Float32Array;

        let x = billboard._positionHigh.x,
            y = billboard._positionHigh.y,
            z = billboard._positionHigh.z,
            w;
        this._positionHighArr = concatTypedArrays(this._positionHighArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        x = billboard._positionLow.x;
        y = billboard._positionLow.y;
        z = billboard._positionLow.z;
        this._positionLowArr = concatTypedArrays(this._positionLowArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        x = billboard._width;
        y = billboard._height;
        this._sizeArr = concatTypedArrays(this._sizeArr, [x, y, x, y, x, y, x, y, x, y, x, y]) as Float32Array;

        x = billboard._offset.x;
        y = billboard._offset.y;
        z = billboard._offset.z;
        this._offsetArr = concatTypedArrays(this._offsetArr, [
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z,
            x, y, z
        ]) as Float32Array;

        x = billboard._color.x;
        y = billboard._color.y;
        z = billboard._color.z;
        w = billboard._color.w;
        this._rgbaArr = concatTypedArrays(this._rgbaArr, [
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w,
            x, y, z, w
        ]) as Float32Array;

        x = billboard._rotation;
        this._rotationArr = concatTypedArrays(this._rotationArr, [x, x, x, x, x, x]) as Float32Array;

        x = billboard._entity!._pickingColor.x / 255;
        y = billboard._entity!._pickingColor.y / 255;
        z = billboard._entity!._pickingColor.z / 255;
        this._pickingColorArr = concatTypedArrays(this._pickingColorArr, [x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z]) as Float32Array;
    }

    public get billboards(): Billboard[] {
        return this._billboards
    }

    public override refreshTexCoordsArr() {
        let bc = this._entityCollection;
        if (bc && this._renderer) {
            let ta = this._renderer.billboardsTextureAtlas;
            for (let i = 0; i < this._billboards.length; i++) {
                let bi = this._billboards[i];
                let img = bi.getImage();
                if (img) {
                    let imageNode = ta.get(img.__nodeIndex!);
                    if (imageNode) {
                        this.setTexCoordArr(bi._handlerIndex, imageNode.texCoords);
                    }
                }
            }
        }
    }
}

export {BillboardHandler};
