"use strict";

import { quadTreeType } from "../utils/quadTreeType.js";
import { EarthQuadTreeStrategy } from "./EarthQuadTreeStrategy.js";
import { MarsQuadTreeStrategy } from "./MarsQuadTreeStrategy.js";
import { Wgs84QuadTreeStrategy } from "./Wgs84QuadTreeStrategy.js";

export class QuadTreeStrategyFactory {

    constructor(option) {
        this._quadTreeType = option.quadTreeType;
        console.log(`constructor - quadTreeType: ${this._quadTreeType}`);
    }

    create(planet) {
        console.log(`create - quadTreeType: ${this._quadTreeType}`);
        switch (this._quadTreeType) {
            case quadTreeType.mars:
                return new MarsQuadTreeStrategy({ planet: planet });
            case quadTreeType.wgs84:
                return new Wgs84QuadTreeStrategy({ planet: planet });
            case quadTreeType.earth:
            default:
                return new EarthQuadTreeStrategy({ planet: planet });
        }

    }
}