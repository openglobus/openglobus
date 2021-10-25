import { XYZ } from '../../src/og/layer/XYZ';
import { Worker } from '../worker';
import { JSDOM } from 'jsdom';

window.Worker = Worker;

const dom = new JSDOM('<html><div id="globus_viewport_0"></p>');
global.document = dom.window.document;
global.window = dom.window;

global.URL.createObjectURL = jest.fn(() => '');

test('Testing Extent', () => {
    const xyz = new XYZ('name', {});
    expect(xyz).toBeTruthy();
});