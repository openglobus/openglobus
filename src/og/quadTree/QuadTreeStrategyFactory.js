"use strict";

import { EarthQuadTreeStrategy } from "./EarthQuadTreeStrategy.js";

export class QuadTreeStrategyFactory {

    create(planet, planetKey) {
        switch (planetKey) {
            case 'Mars':
            case 'mars':
                return new EarthQuadTreeStrategy({ planet: planet });
            case 'Earth':
            default:
                return new EarthQuadTreeStrategy({ planet: planet });
        }

    }
}