"use strict";
import { EarthQuadTreeStrategy } from "../quadTree/EarthQuadTreeStrategy.js";
import { MarsQuadTreeStrategy } from "../quadTree/MarsQuadTreeStrategy.js";
import { Wgs84QuadTreeStrategy } from "../quadTree/Wgs84QuadTreeStrategy.js";


export const quadTreeStrategyType = {
    earth: EarthQuadTreeStrategy,
    mars: MarsQuadTreeStrategy,
    wgs84: Wgs84QuadTreeStrategy
}