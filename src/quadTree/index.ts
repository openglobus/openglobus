import {EarthQuadTreeStrategy} from "./earth/EarthQuadTreeStrategy";
import {EquiQuadTreeStrategy} from "./equi/EquiQuadTreeStrategy";
import {EPSG4326QuadTreeStrategy} from "./EPSG4326/EPSG4326QuadTreeStrategy";
import {QuadTreeStrategy} from "./QuadTreeStrategy";
import {Wgs84QuadTreeStrategy} from "./wgs84/Wgs84QuadTreeStrategy";

const quadTreeStrategyType = {
    epsg4326: EPSG4326QuadTreeStrategy,
    earth: EarthQuadTreeStrategy,
    equi: EquiQuadTreeStrategy,
    wgs84: Wgs84QuadTreeStrategy
}

export {
    quadTreeStrategyType,
    QuadTreeStrategy,
    Wgs84QuadTreeStrategy,
    EquiQuadTreeStrategy,
    EarthQuadTreeStrategy
};
