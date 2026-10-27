import { Control } from "../../src/control/Control";

class TestControl extends Control {
    constructor(options = {}) {
        super({ name: "testControl", ...options });
        this.removed = false;
    }

    onremove() {
        this.removed = true;
    }
}

test("adding a control replaces the registered control with the same name", () => {
    const renderer = {
        controls: {},
        isInitialized: () => true
    };
    const currentControl = new TestControl({ autoActivate: true });
    const replacementControl = new TestControl({ autoActivate: false });

    currentControl.addTo(renderer);
    replacementControl.addTo(renderer);

    expect(currentControl.removed).toBe(true);
    expect(currentControl.renderer).toBeNull();
    expect(currentControl.isActive()).toBe(false);
    expect(renderer.controls.testControl).toBe(replacementControl);
    expect(replacementControl.renderer).toBe(renderer);
    expect(replacementControl.isActive()).toBe(false);
});
