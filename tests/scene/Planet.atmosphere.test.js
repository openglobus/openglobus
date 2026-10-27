import { Planet } from "../../src/scene/Planet";

function expectOpacityParameters(actual, expected) {
    expected.forEach((value, index) => {
        expect(actual[index]).toBeCloseTo(value);
    });
}

test("atmosphere opacity parameters interpolate linearly with camera altitude", () => {
    const planet = new Planet();

    planet.camera.maxAltitude = 3500000;
    planet.atmosphereMaxOpacity = 1.2;
    planet.atmosphereMinOpacity = 0.5;
    planet.atmosphereOpacityCurveShift = 2.0;

    planet.camera.getHeight = () => 1500000;
    planet._updateAtmosphereMaxMinOpacity();
    expectOpacityParameters(planet._atmosphereCurrentMaxMinOpacity, [1.2, 0.1, 0.0]);

    planet.camera.getHeight = () => 2500000;
    planet._updateAtmosphereMaxMinOpacity();
    expectOpacityParameters(planet._atmosphereCurrentMaxMinOpacity, [1.2, 0.3, 1.0]);

    planet.camera.getHeight = () => 3500000;
    planet._updateAtmosphereMaxMinOpacity();
    expectOpacityParameters(planet._atmosphereCurrentMaxMinOpacity, [1.2, 0.5, 2.0]);
});
