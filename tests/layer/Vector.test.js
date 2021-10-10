import { Vector } from '../../src/og/layer/Vector';
import { Worker } from '../worker';
import { JSDOM } from 'jsdom';

window.Worker = Worker;

const dom = new JSDOM('<html><div id="globus_viewport_0"></p>');
global.document = dom.window.document;
global.window = dom.window;

global.URL.createObjectURL = jest.fn(() => '');

test('Testing Vector', () => {
    const vector = new Vector('name', {});
    expect(vector).toBeTruthy();
});
