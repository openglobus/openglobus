import { Worker } from "./worker";

window.Worker = Worker;


global.URL.createObjectURL = vi.fn(() => "");
/**
 * TODO
 * mock is not supported webgl2 context?
 *  TypeError: gl.vertexAttribDivisor is not a function
 */
test("Testing Globe", () => {
    //     const globe = new Globe({ target: 'div' });
    //     expect(globe).toBeTruthy();
});
