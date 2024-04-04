import {Entity} from '../../entity/Entity';
import {LonLat} from "../../LonLat";
import {Object3d} from "../../Object3d";
import {RulerScene, IRulerSceneParams} from "../ruler/RulerScene";
import {Vector} from "../../layer/Vector";
import {Vec3} from "../../math/Vec3";
import {ILabelParams} from "../../entity/Label";
import {IRayParams} from "../../entity/Ray";

let obj3d = Object3d.createCylinder(1.1, 0, 2, 6, 1, true, true, 0, 0, 0);

const RAYS_OPTIONS: IRayParams = {
    startColor: "rgb(255,131,0)",
    endColor: "rgb(255,131,0)",
    thickness: 5
}
const LABEL_OPTIONS: ILabelParams = {
    text: "",
    size: 11,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "center",
    offset: [0, 18, 0]
};

const RULER_CORNER_OPTIONS = {
    scale: 1,
    instanced: true,
    tag: "height-ruler",
    color: "rgb(255,131,0)",
    object3d: obj3d
};

interface IHeightRulerSceneParams extends IRulerSceneParams {

}

class HeightRulerScene extends RulerScene {
    protected _geoRulerLayer: Vector;
    protected _heightLabels: Entity[];
    protected _rayH: Entity;
    protected _rayV: Entity;

    constructor(options: IHeightRulerSceneParams = {}) {
        super(options);

        this._geoRulerLayer = new Vector("rayHeightRuler", {
            entities: [],
            pickingEnabled: false,
            polygonOffsetUnits: -2.0,
            relativeToGround: false,
            hideInLayerSwitcher: true
        });

        this._rayV = new Entity({
            name: 'verticalRay',
            ray: RAYS_OPTIONS
        });

        this._rayH = new Entity({
            name: 'heightRay',
            ray: RAYS_OPTIONS
        });

        this._heightLabels = [
            new Entity({
                name: 'startCornerLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            }),
            new Entity({
                name: 'endCornerLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            }),
            new Entity({
                name: 'deltaLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            })
        ];
    }

    public override setVisibility(visibility: boolean) {
        super.setVisibility(visibility);
        this._geoRulerLayer.setVisibility(visibility);
    }

    public get deltaLabel(): Entity {
        return this._heightLabels[2];
    }

    public get startLabel(): Entity {
        return this._heightLabels[0]
    }

    public get endLabel(): Entity {
        return this._heightLabels[1]
    }

    public get corners(): Entity[] {
        return this._cornerEntity;
    }

    public get startCorner(): Entity {
        return this.corners[0];
    }

    public get endCorner(): Entity {
        return this.corners[1];
    }

    public get startCornerLonLat(): LonLat {
        return this.startCorner.getLonLat();
    }

    public get startCornerHeight(): number {
        return this.startCornerLonLat.height;
    }

    public get endCornerLonLat(): LonLat {
        return this.endCorner.getLonLat();
    }

    public get endCornerHeight(): number {
        return this.endCornerLonLat.height;
    }

    public get maxHeightCornerLonLat(): LonLat {
        if (this.startCornerHeight <= this.endCornerHeight) {
            return this.endCornerLonLat;
        } else {
            return this.startCornerLonLat;
        }
    }

    public get minHeightCornerLonLat(): LonLat {
        if (this.startCornerHeight > this.endCornerHeight) {
            return this.endCornerLonLat;
        } else {
            return this.startCornerLonLat;
        }
    }

    public get deltaHeight(): number {
        return Math.abs(this.startCornerHeight - this.endCornerHeight);
    }

    public override _drawLine(startLonLat: LonLat, endLonLat: LonLat, startPos?: Vec3) {
        super._drawLine(startLonLat, endLonLat, startPos);
        this._updateHeightRaysAndLabels();
    }

    protected async _updateHeightRaysAndLabels() {
        const middleLonLat = this.minHeightCornerLonLat.clone();
        middleLonLat.height = this.maxHeightCornerLonLat.height;

        this._rayH.ray!.setStartPosition3v(this._planet!.ellipsoid.lonLatToCartesian(this.maxHeightCornerLonLat))
        this._rayH.ray!.setEndPosition3v(this._planet!.ellipsoid.lonLatToCartesian(middleLonLat))
        this._rayV.ray!.setStartPosition3v(this._planet!.ellipsoid.lonLatToCartesian(this.minHeightCornerLonLat));
        this._rayV.ray!.setEndPosition3v(this._planet!.ellipsoid.lonLatToCartesian(middleLonLat));

        middleLonLat.height = this.minHeightCornerLonLat.height + this.deltaHeight / 2;

        this.deltaLabel.setLonLat(middleLonLat);
        this.startLabel.setLonLat(this.startCornerLonLat);
        this.endLabel.setLonLat(this.endCornerLonLat);

        const startHeight = await this._planet!.getHeightDefault(this.startCornerLonLat),
            endHeight = await this._planet!.getHeightDefault(this.endCornerLonLat)

        this.deltaLabel.label!.setText(`\u0394 ${Math.abs(startHeight - endHeight).toFixed(1)} m`);
        this.startLabel.label!.setText(`P1 ${startHeight.toFixed(1)} m`)
        this.endLabel.label!.setText(`P2 ${endHeight.toFixed(1)} m`)
    }

    public override clear() {
        this._rayH.remove();
        this._rayV.remove();
        this.startCorner.remove();
        this.endCorner.remove();
        this.startLabel.remove();
        this.endLabel.remove();
        this.deltaLabel.remove();
        super.clear();

        // this._rayH = null;
        // this._rayV = null;

        this._planet!.removeLayer(this._geoRulerLayer);
    }

    public override _createCorners() {
        this._cornerEntity = [
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "start"
                }
            }),
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "end"
                }
            })
        ];

        this._cornersLayer.setEntities(this._cornerEntity);
    }

    public override init() {
        super.init();
        this._createCorners();

        this._labelLayer.addEntities(this._heightLabels);
        this._geoRulerLayer.addEntities([this._rayH, this._rayV]);

        this._planet!.addLayer(this._geoRulerLayer);
    }

    public override frame() {
        super.frame()
        this._updateHeightRaysAndLabels();
    }
}


export {HeightRulerScene};
