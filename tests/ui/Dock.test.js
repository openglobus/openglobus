import { Dialog } from "../../src/ui/Dialog";
import { DockManager } from "../../src/ui/Dock";

class FakeResizeObserver {
    observe() {}
    disconnect() {}
}

/** Lets the manager's DOM observer run: its callbacks are queued, not immediate. */
function tick() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function mount() {
    const host = document.createElement("div");

    document.body.appendChild(host);

    Object.defineProperty(host, "clientWidth", { value: 1000, configurable: true });
    Object.defineProperty(host, "clientHeight", { value: 800, configurable: true });

    // jsdom lays nothing out, and the drop target is read off the host rectangle
    host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800 });

    const dock = new DockManager({ host });

    // The resize observer is a stub here, so the first layout has to be asked for
    dock.layout();

    return { host, dock };
}

function makeDialog(host, title) {
    const dialog = new Dialog({ title, visible: true, useHide: true, width: 200, height: 100 });

    dialog.appendTo(host);

    return dialog;
}

describe("DockManager", () => {
    beforeAll(() => {
        global.ResizeObserver = FakeResizeObserver;
    });

    // Hiding a docked dialog used to take its element out of the zone, which the manager
    // read as a dialog closed for good: it was dropped from the side and never put back, so
    // pressing the button again showed nothing.
    test("a docked dialog hidden by its owner comes back when shown", async () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");

        dock.attach(dialog);
        dock.dock(dialog, "left");

        expect(dock.getSide(dialog)).toBe("left");

        dialog.hide();

        expect(dialog.el.isConnected, "the element stays in the document").toBe(true);

        await tick();

        expect(dock.getSide(dialog), "and stays a member of the side").toBe("left");

        dialog.show();

        expect(dialog.el.isConnected).toBe(true);
        expect(dialog.el.style.display).toBe("flex");
        expect(dock.getSide(dialog)).toBe("left");
    });

    // A side whose only panel was hidden kept its zone, and the zone kept a rectangle of
    // nothing: the side counted as in use, so the edge stopped offering it, and its band was
    // too thin to point at. Nothing could be docked to that side again for the rest of the
    // session.
    test("a side whose panels are all hidden can be docked to again", async () => {
        const { host, dock } = mount();
        const panel = makeDialog(host, "Panel");
        const other = makeDialog(host, "Other");

        dock.attach(panel);
        dock.attach(other);
        dock.dock(panel, "left");

        expect(dock._dropAt(10, 400)?.side, "the left band answers while it is shown").toBe("left");

        panel.hide();
        await tick();

        expect(dock.freeRect.width, "and gives its room back when hidden").toBe(1000);
        expect(dock._dropAt(10, 400)?.side, "the free left edge offers itself again").toBe("left");

        const hint = dock._sideRect("left");

        expect(hint.width, "and the hint keeps the thickness the side was left at").toBe(200);
        expect(hint.height).toBe(800);

        dock.dock(other, "left");

        expect(dock.getSide(other)).toBe("left");
        expect(dock.getSide(panel), "the hidden one keeps its place in the side").toBe("left");
    });

    test("a dialog removed for good leaves the side", async () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");

        dock.attach(dialog);
        dock.dock(dialog, "right");

        expect(dock.getSide(dialog)).toBe("right");

        dialog.el.remove();
        await tick();

        expect(dock.getSide(dialog)).toBeNull();
    });

    // The seam between two stacked panels used to be found by reading the first panel's
    // offsetTop, which forces the page to lay itself out on every move of the drag.
    test("the seam between stacked panels sits on their share boundary", async () => {
        const { host, dock } = mount();
        const top = makeDialog(host, "Top");
        const bottom = makeDialog(host, "Bottom");

        dock.attach(top);
        dock.attach(bottom);
        dock.dock(top, "left");
        dock.dock(bottom, "left");

        const splitters = [...host.querySelector(".og-dock-splitters").children];
        const seam = splitters.find((el) => el.className.includes("__h"));

        expect(seam, "the stack has an inner seam").toBeDefined();

        const center = parseFloat(seam.style.top) + parseFloat(seam.style.height) / 2;

        expect(center, "halfway down an 800px side shared evenly").toBeCloseTo(400, 1);
    });

    // Flex grow factors adding up to less than one leave the rest of the side empty, so a
    // panel left alone in a stack kept the half it had while its neighbour was shown.
    test("a panel left alone in a stack takes the whole side", async () => {
        const { host, dock } = mount();
        const top = makeDialog(host, "Top");
        const bottom = makeDialog(host, "Bottom");

        dock.attach(top);
        dock.attach(bottom);
        dock.dock(top, "left");
        dock.dock(bottom, "left");

        expect(parseFloat(top.el.style.flex), "half each while both are shown").toBeCloseTo(0.5, 2);

        bottom.hide();
        await tick();

        expect(parseFloat(top.el.style.flex), "all of it once alone").toBeCloseTo(1, 2);

        bottom.show();
        await tick();

        expect(parseFloat(top.el.style.flex), "half again when the other is back").toBeCloseTo(0.5, 2);
    });
});
