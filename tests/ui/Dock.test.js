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

function makeDialog(host, title, options = {}) {
    const dialog = new Dialog({ title, visible: true, useHide: true, width: 200, height: 100, ...options });

    dialog.appendTo(host);

    return dialog;
}

function floatingStyle(dialog) {
    const style = dialog.el.style;

    return { left: style.left, top: style.top, width: style.width, height: style.height };
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

    // Registration used to ride along with attach() alone, and the DOM observer that calls
    // it runs a tick late. A dialog docked in the meantime was in a side the manager had no
    // record of holding, so tearing the manager down walked straight past it and left it
    // sitting inside a zone element that was never taken apart.
    test("a dialog docked without attach() is put back by destroy()", () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");
        const floating = floatingStyle(dialog);

        dock.dock(dialog, "left");

        expect(dock.isDocked(dialog)).toBe(true);
        expect(dialog.el.parentElement.className, "it moved into the side").toContain("og-dock");

        dock.destroy();

        expect(dock.isDocked(dialog)).toBe(false);
        expect(dock.getSide(dialog)).toBeNull();
        expect(host.querySelector(".og-dock"), "the side went with it").toBeNull();
        expect(dialog.el.parentElement, "and the dialog is a child of the host again").toBe(host);
        expect(floatingStyle(dialog), "at the rectangle it floated at").toEqual(floating);
    });

    // Same root cause seen from the other end: no registration meant no drag subscription,
    // so the dialog could be docked but never dragged back out.
    test("a dialog docked without attach() can still be dragged out", () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");

        dock.dock(dialog, "left");

        expect(dock.getSide(dialog)).toBe("left");

        dialog.events.dispatch(dialog.events.dragstart, dialog);

        expect(dock.getSide(dialog), "the drag took it out of the side").toBeNull();

        dialog.events.dispatch(dialog.events.dragend, dialog);
    });

    test("attach() twice subscribes each dialog event once", () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");

        const seen = [];
        const onVisibility = dock._onDialogVisibility;

        dock._onDialogVisibility = (visible, sender) => {
            seen.push(visible);
            onVisibility(visible, sender);
        };

        dock.attach(dialog);
        dock.attach(dialog);

        dialog.hide();

        expect(seen, "one subscription, so one call per dispatch").toEqual([false]);
    });

    // The dialog's `dock` option is what it asks for, not what it gets: docking it somewhere
    // else before the observer has seen it used to be undone the moment attach() caught up.
    test("an explicit dock() outranks the dialog's own dock option", async () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel", { dock: "left" });
        const docked = [];

        dock.events.on("dock", (sender, side) => docked.push(side));

        dock.dock(dialog, "right");

        await tick();

        expect(dock.getSide(dialog)).toBe("right");
        expect(docked, "docked once, to the side it was told").toEqual(["right"]);
    });

    test("destroy() puts every dialog back and leaves nothing of the dock behind", () => {
        const addSpy = vi.spyOn(document, "addEventListener");
        const removeSpy = vi.spyOn(document, "removeEventListener");

        const { host, dock } = mount();

        const listened = addSpy.mock.calls.filter(([name]) => name === "pointerdown");

        expect(listened.length, "the manager watches the pointer while it lives").toBe(1);

        const left = makeDialog(host, "Left");
        const right = makeDialog(host, "Right");
        const free = makeDialog(host, "Free");

        dock.attach(left);
        dock.attach(right);
        dock.attach(free);
        dock.dock(left, "left");
        dock.dock(right, "right");

        expect(dock.getSide(left)).toBe("left");
        expect(dock.getSide(right)).toBe("right");
        expect(dock.getSide(free), "the third one was never docked").toBeNull();

        dock.destroy();

        for (const dialog of [left, right, free]) {
            expect(dock.isDocked(dialog)).toBe(false);
            expect(dock.getSide(dialog)).toBeNull();
            expect(dialog.el.parentElement).toBe(host);
            expect(dialog.el.classList.contains("og-ddialog__docked")).toBe(false);
        }

        expect(host.querySelector(".og-dock")).toBeNull();
        expect(host.querySelector(".og-dock-splitters")).toBeNull();
        expect(host.querySelector(".og-dock-hint")).toBeNull();

        expect(
            removeSpy.mock.calls.some(([name, fn]) => name === "pointerdown" && fn === listened[0][1]),
            "and stops watching once it is gone"
        ).toBe(true);

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });

    test("undock() gives the side's room back and reports the free rectangle", () => {
        const { host, dock } = mount();
        const dialog = makeDialog(host, "Panel");

        dock.attach(dialog);
        dock.dock(dialog, "left");

        expect(dock.freeRect.width, "the side took its band").toBe(800);

        const rects = [];

        dock.events.on("layout", (rect) => rects.push({ ...rect }));

        dock.undock(dialog);

        expect(dock.freeRect.width, "and gave it back").toBe(1000);
        expect(rects.length, "the layout was reported").toBeGreaterThan(0);
        expect(rects.at(-1), "with the whole host free again").toMatchObject({ width: 1000, height: 800 });
    });
});
