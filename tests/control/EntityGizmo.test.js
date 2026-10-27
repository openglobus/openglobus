import { EntityGizmo } from "../../src/control/entityGizmo/EntityGizmo";
import { Entity } from "../../src/entity/Entity";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Scene } from "../../src/scene/Scene";
import { Ray } from "../../src/math/Ray";
import { Vec2 } from "../../src/math/Vec2";
import { Vec3 } from "../../src/math/Vec3";

beforeAll(() => {
    if (typeof globalThis.ResizeObserver === "undefined") {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
});

// A renderer stub. While the gizmo scene binds its layers it reports itself as not
// initialized, so entity collections skip the WebGL handler binding; everywhere else it
// behaves like a live renderer, so the gizmo scene logic stays fully exercised.
// `view` picks the direction the stub camera looks at: "front" for -Z, "top" for -Y.
function createRendererStub(view = "front") {
    const handlers = {};
    const keyHandlers = {};

    const events = {
        on(name, p0, p1) {
            if (name === "keypress") {
                (keyHandlers[p0] = keyHandlers[p0] || []).push(p1);
            } else {
                (handlers[name] = handlers[name] || []).push(p0);
            }
        },
        off(name, p0, p1) {
            const arr = name === "keypress" ? keyHandlers[p0] || [] : handlers[name] || [];
            const cb = name === "keypress" ? p1 : p0;
            const i = arr.indexOf(cb);
            if (i !== -1) arr.splice(i, 1);
        },
        dispatch(name, ...args) {
            (handlers[name] || []).slice().forEach((cb) => cb(...args));
        },
        dispatchKey(keyCode) {
            (keyHandlers[keyCode] || []).slice().forEach((cb) => cb());
        },
        count(name) {
            return (handlers[name] || []).length;
        },
        isKeyPressed: () => false
    };

    const isTopView = view === "top";

    // A screen position maps to a world ray straight into the scene.
    const camera = {
        eye: isTopView ? new Vec3(0, 1000, 0) : new Vec3(0, 0, 1000),
        isOrthographic: false,
        focusDistance: 1000,
        getRay2v(pos) {
            return isTopView
                ? new Ray(new Vec3(pos.x, 1000, pos.y), new Vec3(0, -1, 0))
                : new Ray(new Vec3(pos.x, -pos.y, 1000), new Vec3(0, 0, -1));
        },
        getRight: () => new Vec3(1, 0, 0),
        getForward: () => (isTopView ? new Vec3(0, -1, 0) : new Vec3(0, 0, -1))
    };

    return {
        events,
        controls: {},
        scenes: {},
        _scenesArr: [],
        activeCamera: camera,
        handler: { canvas: { style: {} }, pixelRatio: 1 },
        _bindingScene: false,
        isInitialized() {
            return !this._bindingScene;
        },
        requestRedraw() {},
        setRelativeCenter() {},
        assignPickingColor() {},
        clearPickingColor() {},
        addPickingCallback: () => 1,
        removePickingCallback() {},
        getUIContainer() {
            return document.body;
        },
        addControl(control) {
            control.addTo(this);
        },
        addScene(scene) {
            this._bindingScene = true;
            scene.assign(this);
            this._scenesArr.unshift(scene);
            this.scenes[scene.name] = scene;
            // A live renderer reaches init() through Scene.initialize().
            scene.init();
            this._bindingScene = false;
        },
        removeNode(scene) {
            scene.remove();
        }
    };
}

function createNavigationStub(active = true) {
    return {
        _active: active,
        stopped: 0,
        isActive() {
            return this._active;
        },
        activate() {
            this._active = true;
        },
        deactivate() {
            this._active = false;
        },
        stop() {
            this.stopped++;
        }
    };
}

function attachEntity(entity) {
    const scene = new Scene("host");
    const collection = new EntityCollection();
    collection.scene = scene;
    collection.add(entity);
    return collection;
}

function mouseState(x, y, extra = {}) {
    return {
        pos: new Vec2(x, y),
        leftButtonHold: true,
        leftButtonDown: false,
        ...extra
    };
}

function pickHandle(opName) {
    return {
        properties: { opName, noEdit: true, style: { color: "#ff0000", selectColor: "#ff0000" } }
    };
}

/** Presses a gizmo handle. The plane handle lives in the plane layer, the axes in the move layer. */
function pressHandle(gizmo, opName) {
    const scene = gizmo._scene;
    const layer = opName === "move_xz" ? scene._planeLayer : scene._moveLayer;
    layer.events.dispatch(layer.events.ldown, { ...mouseState(0, 0), pickingObject: pickHandle(opName) });
}

function dragTo(gizmo, x, y) {
    gizmo.renderer.events.dispatch("mousemove", mouseState(x, y));
}

function releasePointer() {
    window.dispatchEvent(new Event("pointerup"));
}

function recordEvents(gizmo) {
    const log = [];
    gizmo.events.on("transformstart", (e) => log.push(["transformstart", e]));
    gizmo.events.on("transformchange", (e) => log.push(["transformchange", e]));
    gizmo.events.on("transformend", (e) => log.push(["transformend", e]));
    gizmo.events.on("transformcancel", (e) => log.push(["transformcancel", e]));
    return log;
}

function names(log) {
    return log.map(([name]) => name);
}

function setup(options = {}, view = "front") {
    const renderer = createRendererStub(view);
    const gizmo = new EntityGizmo(options);
    gizmo.addTo(renderer);
    return { renderer, gizmo };
}

test("a standalone gizmo needs no dialog and keeps the selection observable", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    expect(document.querySelector(".og-ddialog")).toBeNull();
    expect(gizmo.isActive()).toBe(true);
    expect(gizmo.getSelectedEntity()).toBeNull();

    gizmo.selectEntity(entity);
    expect(gizmo.getSelectedEntity()).toBe(entity);
    expect(document.querySelector(".og-ddialog")).toBeNull();

    gizmo.unselectEntity();
    expect(gizmo.getSelectedEntity()).toBeNull();
});

test("tools: translate shows move axes and planes without rotation rings", () => {
    const { gizmo } = setup({ tools: "translate" });
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    gizmo.selectEntity(entity);

    expect(gizmo.tools).toBe("translate");
    expect(gizmo._scene._moveLayer.getVisibility()).toBe(true);
    expect(gizmo._scene._planeLayer.getVisibility()).toBe(true);
    expect(gizmo._scene._rotateLayer.getVisibility()).toBe(false);
});

test("tools: full keeps the rotation rings available", () => {
    const { gizmo } = setup({ tools: "full" });
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    gizmo.selectEntity(entity);

    expect(gizmo._scene._rotateLayer.getVisibility()).toBe(true);
});

test("tools and editMode are independent and both are public", () => {
    const { gizmo } = setup({ tools: "translate", editMode: "yaw" });
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    // The rotation mode is kept even while no ring is shown.
    expect(gizmo.tools).toBe("translate");
    expect(gizmo.editMode).toBe("yaw");
    expect(gizmo._scene._rotateLayer.getVisibility()).toBe(false);

    gizmo.tools = "full";
    expect(gizmo.editMode).toBe("yaw");
    expect(gizmo._scene._rotateLayer.getVisibility()).toBe(true);

    gizmo.editMode = "native";
    expect(gizmo.editMode).toBe("native");
    expect(gizmo.tools).toBe("full");
});

test("autoSelect: false leaves the selection to the host application", () => {
    const { renderer, gizmo } = setup({ autoSelect: false });
    const selected = new Entity({ cartesian: new Vec3(0, 0, 0) });
    const clicked = new Entity({ cartesian: new Vec3(1, 0, 0) });
    attachEntity(selected);
    attachEntity(clicked);

    gizmo.selectEntity(selected);
    renderer.events.dispatch("lclick", { pickingObject: clicked });

    expect(gizmo.getSelectedEntity()).toBe(selected);

    gizmo.autoSelect = true;
    renderer.events.dispatch("lclick", { pickingObject: clicked });

    expect(gizmo.getSelectedEntity()).toBe(clicked);
});

test("one drag produces one transformstart, changes and one transformend", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    expect(names(log)).toEqual([]);
    expect(gizmo.isTransforming()).toBe(true);

    dragTo(gizmo, 10, 0);
    dragTo(gizmo, 20, 0);
    releasePointer();

    expect(names(log)).toEqual([
        "transformstart",
        "transformchange",
        "transformchange",
        "transformend"
    ]);
    expect(log[0][1].entity).toBe(entity);
    expect(log[0][1].kind).toBe("translate");
    expect(log[0][1].handle).toBe("move_x");
    expect(gizmo.isTransforming()).toBe(false);
    expect(entity.getCartesian().x).toBeCloseTo(20);
});

test("a press without movement produces no gesture events", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    releasePointer();

    expect(names(log)).toEqual([]);
    expect(gizmo.isTransforming()).toBe(false);
    expect(entity.getCartesian().x).toBe(0);
});

test("a programmatic selectEntity produces no gesture events", () => {
    const { gizmo } = setup();
    const a = new Entity({ cartesian: new Vec3(0, 0, 0) });
    const b = new Entity({ cartesian: new Vec3(5, 0, 0) });
    attachEntity(a);
    attachEntity(b);

    const log = recordEvents(gizmo);

    gizmo.selectEntity(a);
    gizmo.selectEntity(b);
    gizmo.unselectEntity();

    expect(names(log)).toEqual([]);
});

test("the gizmo keeps no keyboard shortcut of its own", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);

    // A host application binds its own shortcut and calls cancelTransform() from it.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27 }));

    expect(names(log)).toEqual(["transformstart", "transformchange"]);
    expect(entity.getCartesian().x).toBeCloseTo(10);

    releasePointer();
    expect(names(log)).toEqual(["transformstart", "transformchange", "transformend"]);
});

test("pointercancel cancels the gesture", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);
    window.dispatchEvent(new Event("pointercancel"));

    expect(names(log)).toEqual(["transformstart", "transformchange", "transformcancel"]);
    expect(log[2][1]).toEqual({ entity, kind: "translate", handle: "move_x" });
    expect(entity.getCartesian().x).toBe(0);
});

test("cancelTransform is the public rollback and is a no-op without a gesture", () => {
    const { gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    expect(gizmo.cancelTransform()).toBe(false);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);

    expect(gizmo.cancelTransform()).toBe(true);
    expect(entity.getCartesian().x).toBe(0);
    expect(log[2][1]).toEqual({ entity, kind: "translate", handle: "move_x" });
    expect(gizmo.cancelTransform()).toBe(false);
});

test("a nested relative entity is dragged through its own absolute coordinates", () => {
    const { gizmo } = setup();

    const parent = new Entity({ cartesian: new Vec3(100, 0, 0) });
    const child = new Entity({ cartesian: new Vec3(0, 10, 0), relativePosition: true });
    parent.appendChild(child);
    attachEntity(parent);

    const parentCart = parent.getCartesian().clone();
    gizmo.selectEntity(child);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 7, 0);
    releasePointer();

    // The host reads the result through the public Entity API, no matrices involved.
    expect(child.getAbsoluteCartesian().x).toBeCloseTo(107);
    expect(child.getCartesian().x).toBeCloseTo(7);
    expect(parent.getCartesian().equal(parentCart)).toBe(true);
});

test("an external entity move follows into the gizmo without a reselect", () => {
    const { renderer, gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    renderer.events.dispatch("forwardpass");
    expect(gizmo._scene._axisEntity.getCartesian().x).toBeCloseTo(0);

    entity.setCartesian(50, 0, 0);
    renderer.events.dispatch("forwardpass");

    expect(gizmo._scene._axisEntity.getCartesian().x).toBeCloseTo(50);
    expect(gizmo._scene._planeEntity.getCartesian().x).toBeCloseTo(50);
    expect(gizmo.getSelectedEntity()).toBe(entity);
});

test("removing the selected entity during a gesture cancels it and drops the selection", () => {
    const { renderer, gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);
    let unselected = 0;
    gizmo.events.on("unselect", () => unselected++);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);

    entity.remove();
    dragTo(gizmo, 20, 0);

    expect(names(log)).toEqual(["transformstart", "transformchange", "transformcancel"]);
    expect(log[2][1]).toEqual({ entity, kind: "translate", handle: "move_x" });

    renderer.events.dispatch("forwardpass");
    expect(gizmo.getSelectedEntity()).toBeNull();
    expect(unselected).toBe(1);
});

test("deactivation during a gesture cancels it, cleans up and is idempotent", () => {
    const { renderer, gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);

    gizmo.deactivate();

    expect(names(log)).toEqual(["transformstart", "transformchange", "transformcancel"]);
    expect(log[2][1]).toEqual({ entity, kind: "translate", handle: "move_x" });
    expect(entity.getCartesian().x).toBe(0);
    expect(gizmo.getSelectedEntity()).toBeNull();

    // No renderer handler, no scene and no window listener is left behind.
    expect(renderer.events.count("mousemove")).toBe(0);
    expect(renderer.events.count("lclick")).toBe(0);
    expect(renderer.events.count("lup")).toBe(0);
    expect(renderer.events.count("forwardpass")).toBe(0);
    expect(renderer.events.count("draw")).toBe(0);
    expect(Object.keys(renderer.scenes)).toEqual([]);
    expect(renderer._scenesArr).toEqual([]);

    expect(() => gizmo.deactivate()).not.toThrow();
    expect(() => gizmo._scene.deactivate()).not.toThrow();

    // A late pointer release after cleanup changes nothing.
    releasePointer();
    expect(names(log)).toEqual(["transformstart", "transformchange", "transformcancel"]);
});

test("reactivation after deactivation works and leaves no duplicate handlers", () => {
    const { renderer, gizmo } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    gizmo.deactivate();
    gizmo.activate();

    expect(renderer.events.count("mousemove")).toBe(1);
    expect(renderer.events.count("forwardpass")).toBe(1);

    gizmo.selectEntity(entity);
    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);
    releasePointer();

    expect(entity.getCartesian().x).toBeCloseTo(10);
});

test("navigation is suspended for the gesture and restored to its previous state", () => {
    const { renderer, gizmo } = setup();
    const navigation = createNavigationStub(true);
    const simpleNavigation = createNavigationStub(false);
    renderer.controls.navigation = navigation;
    renderer.controls.SimpleNavigation = simpleNavigation;

    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    pressHandle(gizmo, "move_x");
    expect(navigation.isActive()).toBe(false);
    expect(navigation.stopped).toBe(1);
    expect(simpleNavigation.isActive()).toBe(false);

    dragTo(gizmo, 10, 0);
    releasePointer();

    expect(navigation.isActive()).toBe(true);
    // It was off before the gesture, so it must stay off.
    expect(simpleNavigation.isActive()).toBe(false);
});

test("navigation is restored when the gesture is cancelled", () => {
    const { renderer, gizmo } = setup();
    const navigation = createNavigationStub(true);
    renderer.controls.navigation = navigation;

    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    pressHandle(gizmo, "move_x");
    dragTo(gizmo, 10, 0);
    gizmo.cancelTransform();

    expect(navigation.isActive()).toBe(true);
});

test("two gizmos on two renderers do not interfere", () => {
    const first = setup();
    const second = setup();

    const a = new Entity({ cartesian: new Vec3(0, 0, 0) });
    const b = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(a);
    attachEntity(b);

    first.gizmo.selectEntity(a);
    second.gizmo.selectEntity(b);

    const firstLog = recordEvents(first.gizmo);
    const secondLog = recordEvents(second.gizmo);

    pressHandle(first.gizmo, "move_x");
    dragTo(first.gizmo, 10, 0);
    releasePointer();

    expect(names(firstLog)).toEqual(["transformstart", "transformchange", "transformend"]);
    expect(names(secondLog)).toEqual([]);
    expect(a.getCartesian().x).toBeCloseTo(10);
    expect(b.getCartesian().x).toBe(0);
    expect(second.gizmo.getSelectedEntity()).toBe(b);

    first.gizmo.deactivate();
    expect(second.gizmo.isActive()).toBe(true);
    expect(second.gizmo.getSelectedEntity()).toBe(b);
});

test("the move plane handle drags the entity too", () => {
    const { gizmo } = setup({}, "top");
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    gizmo.selectEntity(entity);

    const log = recordEvents(gizmo);

    pressHandle(gizmo, "move_xz");
    dragTo(gizmo, 10, -4);
    releasePointer();

    expect(names(log)).toEqual(["transformstart", "transformchange", "transformend"]);
    expect(log[0][1].handle).toBe("move_xz");
    expect(entity.getCartesian().x).toBeCloseTo(10);
});
