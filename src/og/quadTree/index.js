import { EarthQuadTreeStrategy } from "./EarthQuadTreeStrategy.js";
import { MarsQuadTreeStrategy } from "./MarsQuadTreeStrategy.js";
import { EPSG4326QuadTreeStrategy } from "./EPSG4326QuadTreeStrategy.js";
import { QuadTreeStrategy } from "./QuadTreeStrategy.js";
import { Wgs84QuadTreeStrategy } from "./Wgs84QuadTreeStrategy.js";

const quadTreeStrategyType = {
    epsg4326: EPSG4326QuadTreeStrategy,
    earth: EarthQuadTreeStrategy,
    mars: MarsQuadTreeStrategy,
    wgs84: Wgs84QuadTreeStrategy
}

export { quadTreeStrategyType, QuadTreeStrategy, Wgs84QuadTreeStrategy, MarsQuadTreeStrategy, EarthQuadTreeStrategy };
