import { Globe } from "../src/Globe";
import { Sun } from "../src/control/Sun";

// Keep real Globe and Sun option handling, without initializing WebGL.
vi.mock("../src/webgl/Handler", () => ({ Handler: class {} }));
vi.mock("../src/renderer/Renderer", () => ({
    Renderer: class {
        controls = {};
        addScene(scene) { scene.renderer = this; }
    }
}));
vi.mock("../src/scene/Planet", () => ({
    Planet: class {
        setTerrain() {}
        addControl(control) {
            this.renderer.controls[Object.keys(this.renderer.controls).length] = control;
        }
        addControls(controls) { controls.forEach(control => this.addControl(control)); }
    }
}));

const dateTime = new Date("2026-10-21T11:00:00Z");
const localDateTime = new Date("2026-10-21T07:00:00Z");

describe("Globe sun time options", () => {
    test.each([
        ["UTC time", { dateTime }, dateTime, null],
        ["local time", { localDateTime }, null, localDateTime],
        ["local time wins", { dateTime, localDateTime }, null, localDateTime],
        ["undefined local time keeps UTC", { dateTime, localDateTime: undefined }, dateTime, null],
        ["explicit local reset wins", { dateTime, localDateTime: null }, null, null],
        ["UTC reset", { dateTime: null }, null, null],
        ["no fixed time", {}, null, null]
    ])("%s", (_name, sun, expectedUtc, expectedLocal) => {
        const globe = new Globe({ autoActivate: false, controls: [], sun });
        expect(globe.sun.dateTime).toBe(expectedUtc);
        expect(globe.sun.localDateTime).toBe(expectedLocal);
        delete window[globe._instanceID];
    });

    test("local time also overrides UTC on an existing Sun control", () => {
        const sun = new Sun({ dateTime });
        const globe = new Globe({ autoActivate: false, controls: [sun], sun: { dateTime, localDateTime } });
        expect(globe.sun).toBe(sun);
        expect(sun.dateTime).toBeNull();
        expect(sun.localDateTime).toBe(localDateTime);
        delete window[globe._instanceID];
    });
});
