import { beforeEach, describe, expect, test, vi } from "vitest";
import { createEvents } from "../../src/Events";
import { LonLat } from "../../src/LonLat";
import { GeoImageDragControl } from "../../src/control/GeoImageDragControl";

// A control with a renderer and a planet that give the ground point the test sets
function setup() {
    const control = new GeoImageDragControl();
    const navigation = { activate: vi.fn(), deactivate: vi.fn() };
    const renderer = {
        events: createEvents(["mousemove", "lup", "mouseleave"]),
        controls: { navigation }
    };
    const planet = { ground: new LonLat(10, 10), getLonLatFromPixelTerrain: () => planet.ground };
    const layer = {
        corners: [new LonLat(0, 1), new LonLat(1, 1), new LonLat(1, 0), new LonLat(0, 0)],
        getCornersLonLat() {
            return this.corners.map((c) => c.clone());
        },
        setCornersLonLat: vi.fn(function (corners) {
            this.corners = corners;
        })
    };

    control.renderer = renderer;
    control.planet = planet;

    // The mouse is down on the first corner of the image
    control._cornerIndex = 0;
    control._onLDown({ pickingObject: layer });

    return { control, renderer, planet, layer, navigation };
}

describe("GeoImageDragControl", () => {
    beforeEach(() => {
        document.body.style.cursor = "auto";
    });

    test("the corner goes with the mouse on the globe, off the image too", () => {
        const { renderer, planet, layer, navigation } = setup();

        expect(navigation.deactivate).toHaveBeenCalled();

        planet.ground = new LonLat(2, 3);
        renderer.events.dispatch(renderer.events.mousemove, {});

        expect(layer.corners[0].lon).toBe(2);
        expect(layer.corners[0].lat).toBe(3);
    });

    test("off the globe the corner stays where it was", () => {
        const { renderer, planet, layer } = setup();

        planet.ground = undefined;
        renderer.events.dispatch(renderer.events.mousemove, {});

        expect(layer.setCornersLonLat).not.toHaveBeenCalled();
        expect(layer.corners[0].lon).toBe(0);
    });

    test.each(["lup", "mouseleave"])("%s anywhere on the canvas lets the corner go", (name) => {
        const { control, renderer, planet, layer, navigation } = setup();

        renderer.events.dispatch(renderer.events[name], {});

        expect(control._catchCorner).toBe(false);
        expect(navigation.activate).toHaveBeenCalledTimes(1);

        // The mouse goes on without the corner
        planet.ground = new LonLat(5, 5);
        renderer.events.dispatch(renderer.events.mousemove, {});
        expect(layer.setCornersLonLat).not.toHaveBeenCalled();
    });

    test("turning the control off lets the corner go", () => {
        const { control, navigation } = setup();

        control.planet.layers = [];
        control.ondeactivate();
        control._release();

        expect(control._catchCorner).toBe(false);
        expect(navigation.activate).toHaveBeenCalledTimes(1);
    });
});
