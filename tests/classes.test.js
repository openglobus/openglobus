import { Planet } from '../src/og/scene/Planet.js';
import { SegmentLonLat } from '../src/og/segment/SegmentLonLat.js';
import { Worker } from './worker';

window.Worker = Worker;
global.URL.createObjectURL = jest.fn(() => '');

const mockPlanet = () => {
    const planet = new Planet();
    planet.renderer = {};
    planet.terrain = { gridSizeByZoom: {} };
    return planet;
}

const mockExtent = () => {
    return { southWest: { forwardMercatorEPS01: () => { } }, northEast: { forwardMercatorEPS01: () => { } } };
}

test('Testing SegmentLonLat', () => {
    const segmentLonLat = new SegmentLonLat({}, mockPlanet(), {}, mockExtent());
    expect(segmentLonLat).toBeTruthy();
});