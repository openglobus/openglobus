import { Checkbox } from '../../src/ui/Checkbox';
import { Color } from '../../src/ui/Color';
import { Input } from '../../src/ui/Input';
import { Slider } from '../../src/ui/Slider';

// jsdom has no ResizeObserver, and Slider creates one in its constructor.
beforeAll(() => {
    if (typeof globalThis.ResizeObserver === "undefined") {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
});

// A view that was constructed but never appended has no `el`, so `remove()` used to throw
// "Cannot read properties of null (reading 'removeEventListener')". EntityEditorView hits this
// on a scene without a planet, where the lon/lat/height inputs are never rendered.
test.each([
    ['Input', () => new Input()],
    ['Slider', () => new Slider()],
    ['Checkbox', () => new Checkbox()],
    ['Color', () => new Color()]
])('%s.remove() is safe before render', (_name, create) => {
    let view = create();
    expect(view.el).toBeNull();
    expect(() => view.remove()).not.toThrow();
});

test('Input.remove() is safe after render and twice in a row', () => {
    let host = document.createElement("div");
    let input = new Input();
    input.appendTo(host);

    expect(input.el).not.toBeNull();
    expect(() => input.remove()).not.toThrow();
    expect(() => input.remove()).not.toThrow();
});

test('Input still reacts to DOM events after remove() and appendTo() again', () => {
    let host = document.createElement("div");
    document.body.appendChild(host);

    let input = new Input();
    input.appendTo(host);

    let changes = [];
    input.events.on("change", (value) => changes.push(value));

    input.$input.value = "first";
    input.$input.dispatchEvent(new Event("blur"));
    expect(changes).toEqual(["first"]);

    // remove() strips the listeners; appendTo() must bring them back.
    input.remove();
    input.appendTo(host);

    input.$input.value = "second";
    input.$input.dispatchEvent(new Event("blur"));
    expect(changes).toEqual(["first", "second"]);
});

test('appendTo() twice does not register duplicate listeners', () => {
    let host = document.createElement("div");
    document.body.appendChild(host);

    let input = new Input();
    input.appendTo(host);
    input.appendTo(host);

    let changes = [];
    input.events.on("change", (value) => changes.push(value));

    input.$input.value = "once";
    input.$input.dispatchEvent(new Event("blur"));
    expect(changes).toEqual(["once"]);
});
