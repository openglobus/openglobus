import {EarthQuadTreeStrategy} from "./EarthQuadTreeStrategy";
import {MarsQuadTreeStrategy} from "./MarsQuadTreeStrategy";
import {EPSG4326QuadTreeStrategy} from "./EPSG4326QuadTreeStrategy";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {Wgs84QuadTreeStrategy} from "./Wgs84QuadTreeStrategy";

const quadTreeStrategyType = {
    epsg4326: EPSG4326QuadTreeStrategy,
    earth: EarthQuadTreeStrategy,
    mars: MarsQuadTreeStrategy,
    wgs84: Wgs84QuadTreeStrategy
}

export {quadTreeStrategyType, QuadTreeStrategy, Wgs84QuadTreeStrategy, MarsQuadTreeStrategy, EarthQuadTreeStrategy};
