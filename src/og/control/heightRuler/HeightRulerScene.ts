

import { Object3d } from "../../Object3d.js";
import { Entity } from '../../entity/Entity.js';
import { Vector } from "../../layer/Vector.js";
import { RulerScene } from "../ruler/RulerScene.js";

let obj3d = Object3d.createCylinder(1.1, 0, 2, 6, 1, true, true, 0, 0, 0)

const RAYS_OPTIONS = {
    startColor: "rgb(255,131,0)",
    endColor: "rgb(255,131,0)",
    thickness: 5
}
const LABEL_OPTIONS = {
    text: "",
    size: 11,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "center",
    offset: [0, 18]
};

const RULER_CORNER_OPTIONS = {
    scale: 1,
    instanced: true,
    tag: "height-ruler",
    color: "rgb(255,131,0)",
    object3d: obj3d
};

class HeightRulerScene extends RulerScene {
    _geoRulerLayer: Vector;
    _heightLabels: any;
    _rayH: any;
    _rayV: any;
    constructor(options = {}) {
        super(options);


        this._cornersLayer = new Vector("corners", {
            entities: [],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [100, 4000000, 1.0],
            pickingScale: 2
        });


        this._geoRulerLayer = new Vector("rayHeightRuler", {
            entities: [],
            pickingEnabled: false,
            polygonOffsetUnits: -2.0,
            relativeToGround: false,
            displayInLayerSwitcher: false
        });
    }

    override setVisibility(visibility: boolean) {
        super.setVisibility(visibility);
        this._geoRulerLayer.setVisibility(visibility);
    }

    get deltaLabel() {
        return this._heightLabels[2]
    }

    get startLabel() {
        return this._heightLabels[0]
    }

    get endLabel() {
        return this._heightLabels[1]
    }

    get corners() {
        return this._cornerEntity;
    }

    get startCorner() {
        return this.corners[0];
    }

    get endCorner() {
        return this.corners[1];
    }

    get startCornerLonLat() {
        return this.startCorner.getLonLat();
    }

    get startCornerHeight() {
        return this.startCornerLonLat.height;
    }

    get endCornerLonLat() {
        return this.endCorner.getLonLat();
    }

    get endCornerHeight() {
        return this.endCornerLonLat.height;
    }

    get maxHeightCornerLonLat() {
        if (this.startCornerHeight <= this.endCornerHeight) {
            return this.endCornerLonLat;
        } else {
            return this.startCornerLonLat;
        }
    }

    get minHeightCornerLonLat() {
        if (this.startCornerHeight > this.endCornerHeight) {
            return this.endCornerLonLat;
        } else {
            return this.startCornerLonLat;
        }
    }

    get deltaHeight() {
        return Math.abs(this.startCornerHeight - this.endCornerHeight);
    }

    override _drawLine(startLonLat: any, endLonLat: any, startPos: any) {
        super._drawLine(startLonLat, endLonLat, startPos);
        this._updateHeightRaysAndLabels();
    }

    async _updateHeightRaysAndLabels() {
        const middleLonLat = this.minHeightCornerLonLat.clone();
        middleLonLat.height = this.maxHeightCornerLonLat.height;

        this._rayH.ray.setStartPosition3v(this._planet.ellipsoid.lonLatToCartesian(this.maxHeightCornerLonLat))
        this._rayH.ray.setEndPosition3v(this._planet.ellipsoid.lonLatToCartesian(middleLonLat))
        this._rayV.ray.setStartPosition3v(this._planet.ellipsoid.lonLatToCartesian(this.minHeightCornerLonLat));
        this._rayV.ray.setEndPosition3v(this._planet.ellipsoid.lonLatToCartesian(middleLonLat));

        middleLonLat.height = this.minHeightCornerLonLat.height + this.deltaHeight / 2;

        this.deltaLabel.setLonLat(middleLonLat);
        this.startLabel.setLonLat(this.startCornerLonLat);
        this.endLabel.setLonLat(this.endCornerLonLat);

        const startHeight = await this._planet.getHeightDefault(this.startCornerLonLat),
            endHeight = await this._planet.getHeightDefault(this.endCornerLonLat)

        this.deltaLabel.label.setText(`\u0394 ${Math.abs(startHeight - endHeight).toFixed(1)} m`);
        this.startLabel.label.setText(`P1 ${startHeight.toFixed(1)} m`)
        this.endLabel.label.setText(`P2 ${endHeight.toFixed(1)} m`)
    }

    override clear() {
        this._rayH.remove();
        this._rayV.remove();
        this.startCorner.remove();
        this.endCorner.remove();
        this.startLabel.remove();
        this.endLabel.remove();
        this.deltaLabel.remove();
        super.clear()
        this._rayH = undefined;
        this._rayV = undefined;

        this._planet.removeLayer(this._geoRulerLayer);
    }

    override _createCorners() {
        this._cornerEntity = [
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "start"
                }
            } as any),
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "end"
                }
            } as any)
        ];

        this._cornersLayer.setEntities(this._cornerEntity);
    }

    override init() {

        super.init();
        this._createCorners();
        this._rayV = new Entity({
            name: 'verticalRay',
            ray: RAYS_OPTIONS
        } as any);
        this._rayH = new Entity({
            name: 'heightRay',
            ray: RAYS_OPTIONS
        } as any);
        this._heightLabels = [
            new Entity({
                name: 'startCornerLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            } as any),
            new Entity({
                name: 'endCornerLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            } as any),
            new Entity({
                name: 'deltaLabel',
                label: {
                    ...LABEL_OPTIONS
                }
            } as any)
        ];
        this._labelLayer.addEntities(this._heightLabels);
        this._geoRulerLayer.addEntities([this._rayH, this._rayV]);

        this._planet.addLayer(this._geoRulerLayer);
    }

    override frame() {
        super.frame()
        this._updateHeightRaysAndLabels();
    }
}


export { HeightRulerScene };
