import { Extent } from '../src/og/Extent';
import { Planet } from '../src/og/scene/Planet';
import { SegmentLonLat } from '../src/og/segment/SegmentLonLat';
import { Worker } from './worker';

window.Worker = Worker;
global.URL.createObjectURL = jest.fn(() => '');

const mockPlanet = () => {
    const planet = new Planet();
    planet.renderer = {};
    planet.terrain = { gridSizeByZoom: {} };
    return planet;
}

test('Testing SegmentLonLat', () => {
    const segmentLonLat = new SegmentLonLat({}, mockPlanet(), {}, new Extent());
    expect(segmentLonLat).toBeTruthy();
});