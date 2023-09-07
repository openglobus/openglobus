import { Extent } from "../src/Extent";
import { Planet } from "../src/scene/Planet";
import { SegmentLonLat } from "../src/segment/SegmentLonLat";

const mockPlanet = () => {
    const planet = new Planet();
    planet.renderer = {};
    planet.terrain = { gridSizeByZoom: {} };
    return planet;
};

test("Testing SegmentLonLat", () => {
    const segmentLonLat = new SegmentLonLat({}, mockPlanet(), {}, new Extent());
    expect(segmentLonLat).toBeTruthy();
});
