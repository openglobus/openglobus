import { Extent } from '../src/og/Extent';
import { Worker } from './worker';
import { JSDOM } from 'jsdom';

window.Worker = Worker;

const dom = new JSDOM('<html><div id="globus_viewport_0"></p>');
global.document = dom.window.document;
global.window = dom.window;

global.URL.createObjectURL = jest.fn(() => '');

test('Testing Extent', () => {
    const extent = new Extent();
    Extent.createByCoordinates([]);
    Extent.FULL_MERC;
    Extent.NORTH_POLE_DEG;
    Extent.SOUTH_POLE_DEG;
    expect(extent).toBeTruthy();
});