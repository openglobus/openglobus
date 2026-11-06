import { LayerSwitcher } from "../../src/control/LayerSwitcher";
import { EmptyTerrain } from "../../src/terrain/EmptyTerrain";

function addTerrain(terrain) {
    const control = new LayerSwitcher();
    const setTerrain = vi.fn();
    control.planet = { terrain: null, setTerrain };
    control.$terrains = document.createElement("div");
    control.addTerrain(terrain);

    return { button: control.$terrains.querySelector("button"), setTerrain };
}

test("a double click on a terrain button flies to the terrain extent", () => {
    const terrain = new EmptyTerrain();
    const flyExtent = vi.spyOn(terrain, "flyExtent").mockImplementation(() => {});
    const { button } = addTerrain(terrain);

    button.dispatchEvent(new MouseEvent("dblclick"));

    expect(flyExtent).toHaveBeenCalledTimes(1);
});

test("a click on a terrain button activates it and does not fly", () => {
    const terrain = new EmptyTerrain();
    const flyExtent = vi.spyOn(terrain, "flyExtent").mockImplementation(() => {});
    const { button, setTerrain } = addTerrain(terrain);

    button.dispatchEvent(new MouseEvent("click"));

    expect(setTerrain).toHaveBeenCalledWith(terrain);
    expect(flyExtent).not.toHaveBeenCalled();
});
