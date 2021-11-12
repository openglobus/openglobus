import { Globe } from "../src/og/Globe";
import { Worker } from "./worker";
import { JSDOM } from "jsdom";

window.Worker = Worker;

const dom = new JSDOM('<html><div id="globus_viewport_0"></p>');
global.document = dom.window.document;
global.window = dom.window;

global.URL.createObjectURL = jest.fn(() => "");
/**
 * TODO
 * mock is not supported webgl2 context?
 *  TypeError: gl.vertexAttribDivisor is not a function
 */
test("Testing Globe", () => {
    //     const globe = new Globe({ target: 'div' });
    //     expect(globe).toBeTruthy();
});
