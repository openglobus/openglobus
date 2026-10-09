import { EntityEditor } from "../../src/control/entityEditor/EntityEditor";
import { Entity } from "../../src/entity/Entity";
import { EntityCollection } from "../../src/entity/EntityCollection";
import { Scene } from "../../src/scene/Scene";
import { Ray } from "../../src/math/Ray";
import { Vec3 } from "../../src/math/Vec3";

// jsdom has neither ResizeObserver nor IntersectionObserver; Slider and Dialog need them.
beforeAll(() => {
    class ObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    if (typeof globalThis.ResizeObserver === "undefined") {
        globalThis.ResizeObserver = ObserverStub;
    }
    if (typeof globalThis.IntersectionObserver === "undefined") {
        globalThis.IntersectionObserver = ObserverStub;
    }
});

afterEach(() => {
    document.body.innerHTML = "";
});

function createRendererStub() {
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
        isKeyPressed: () => false
    };

    return {
        events,
        controls: {},
        scenes: {},
        _scenesArr: [],
        projectors: { getByDepthCamera: () => null },
        activeCamera: {
            eye: new Vec3(0, 0, 1000),
            isOrthographic: false,
            focusDistance: 1000,
            getRay2v: (pos) => new Ray(new Vec3(pos.x, -pos.y, 1000), new Vec3(0, 0, -1)),
            getRight: () => new Vec3(1, 0, 0),
            getForward: () => new Vec3(0, 0, -1)
        },
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
            scene.init();
            this._bindingScene = false;
        },
        removeNode(scene) {
            scene.remove();
        }
    };
}

function attachEntity(entity) {
    const collection = new EntityCollection();
    collection.scene = new Scene("host");
    collection.add(entity);
    return collection;
}

function setup() {
    const renderer = createRendererStub();
    const editor = new EntityEditor();
    editor.addTo(renderer);
    return { renderer, editor };
}

test("the editor keeps its dialog, its camera lock and the rotation rings", () => {
    const { renderer, editor } = setup();

    expect(editor.name).toBe("EntityEditor");
    expect(editor.tools).toBe("full");
    expect(editor.isActive()).toBe(true);
    expect(renderer.controls.EntityEditor).toBe(editor);
    expect(renderer.controls.CameraLock).toBeDefined();
    expect(document.querySelector(".og-ddialog")).not.toBeNull();
});

test("selecting an entity opens the dialog and shows every gizmo layer", () => {
    const { editor } = setup();
    const entity = new Entity({ name: "probe", cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    editor.selectEntity(entity);

    expect(editor.getSelectedEntity()).toBe(entity);
    expect(editor._dialog.getVisibility()).toBe(true);
    expect(document.querySelector(".og-ddialog-header__title").textContent).toBe("probe");
    expect(editor._scene._moveLayer.getVisibility()).toBe(true);
    expect(editor._scene._planeLayer.getVisibility()).toBe(true);
    expect(editor._scene._rotateLayer.getVisibility()).toBe(true);

    editor.unselectEntity();

    expect(editor.getSelectedEntity()).toBeNull();
    expect(editor._dialog.getVisibility()).toBe(false);
    expect(editor._scene._moveLayer.getVisibility()).toBe(false);
});

test("a click on a map entity still drives the editor selection", () => {
    const { renderer, editor } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);

    renderer.events.dispatch("lclick", { pickingObject: entity });

    expect(editor.getSelectedEntity()).toBe(entity);
});

test("an entity marked noEdit stays unselectable", () => {
    const { editor } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0), properties: { noEdit: true } });
    attachEntity(entity);

    editor.selectEntity(entity);

    expect(editor.getSelectedEntity()).toBeNull();
});

test("dragging refreshes the dialog through the legacy position event", () => {
    const { renderer, editor } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    editor.selectEntity(entity);

    const positions = [];
    editor._scene.events.on("position", (pos, movedEntity) => positions.push([pos, movedEntity]));

    const moveLayer = editor._scene._moveLayer;
    moveLayer.events.dispatch(moveLayer.events.ldown, {
        pos: { x: 0, y: 0, clone: () => ({ x: 0, y: 0 }) },
        pickingObject: { properties: { opName: "move_x", style: {} } }
    });
    renderer.events.dispatch("mousemove", {
        pos: { x: 12, y: 0 },
        leftButtonHold: true,
        leftButtonDown: false
    });
    window.dispatchEvent(new Event("pointerup"));

    expect(positions.length).toBe(1);
    expect(positions[0][1]).toBe(entity);
    expect(entity.getCartesian().x).toBeCloseTo(12);
});

test("deactivation hides the dialog and removes the gizmo scene", () => {
    const { renderer, editor } = setup();
    const entity = new Entity({ cartesian: new Vec3(0, 0, 0) });
    attachEntity(entity);
    editor.selectEntity(entity);

    editor.deactivate();

    expect(editor._dialog.getVisibility()).toBe(false);
    expect(Object.keys(renderer.scenes)).toEqual([]);
    expect(editor.getSelectedEntity()).toBeNull();
});
