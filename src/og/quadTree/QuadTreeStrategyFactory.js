"use strict";

import { EarthQuadTreeStrategy } from "./EarthQuadTreeStrategy.js";
import { MarsQuadTreeStrategy } from "./MarsQuadTreeStrategy.js";

export class QuadTreeStrategyFactory {

    create(planet, planetKey) {
        switch (planetKey) {
            case 'Mars':
            case 'mars':
                return new MarsQuadTreeStrategy({ planet: planet });
            case 'Earth':
            default:
                return new EarthQuadTreeStrategy({ planet: planet });
        }

    }
}