import { EarthQuadTreeStrategy } from "./EarthQuadTreeStrategy.js";
import { MarsQuadTreeStrategy } from "./MarsQuadTreeStrategy.js";
import { Wgs84QuadTreeStrategy } from "./Wgs84QuadTreeStrategy.js";
import { QuadTreeStrategy } from "./QuadTreeStrategy.js";

const quadTreeStrategyType = {
    earth: EarthQuadTreeStrategy,
    mars: MarsQuadTreeStrategy,
    wgs84: Wgs84QuadTreeStrategy
}

export { quadTreeStrategyType, QuadTreeStrategy,  Wgs84QuadTreeStrategy, MarsQuadTreeStrategy, EarthQuadTreeStrategy };