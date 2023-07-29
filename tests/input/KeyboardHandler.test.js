import { KeyboardHandler } from "../../src/og/input/KeyboardHandler.js";
import { input } from "../../src/og/input/input.js";

test('Testing KeyboardHadler instantiating', () => {
    let kb = new KeyboardHandler();
    expect(true).toBe(true);
});

test('Testing KeyboardHadler add/remove keypress event', () => {
    let kb = new KeyboardHandler();
    const _onPressKey_W = () => {
    };

    kb.addEvent("keypress", input.KEY_W, _onPressKey_W);
    let callbacks = kb.getPressedKeysCallbacks();

    expect(callbacks[input.KEY_W].length).toBe(1);
    expect(callbacks[input.KEY_W][0].callback).toBe(_onPressKey_W);

    kb.removeEvent("keypress", input.KEY_W, _onPressKey_W);
    callbacks = kb.getPressedKeysCallbacks();

    expect(callbacks[input.KEY_W].length).toBe(0);
});

test('Testing KeyboardHadler multiple add/remove callbacks binding on the same key for keypress event', () => {
    let kb = new KeyboardHandler();

    const _onPressKey_W_test1 = () => {
    };

    const _onPressKey_W_test2 = () => {
    };

    kb.addEvent("keypress", input.KEY_W, _onPressKey_W_test1);
    kb.addEvent("keypress", input.KEY_W, _onPressKey_W_test2);

    let callbacks = kb.getPressedKeysCallbacks();

    expect(callbacks[input.KEY_W].length).toBe(2);

    kb.removeEvent("keypress", input.KEY_W, _onPressKey_W_test1);
    callbacks = kb.getPressedKeysCallbacks();

    expect(callbacks[input.KEY_W].length).toBe(1);
    expect(callbacks[input.KEY_W][0].callback).toBe(_onPressKey_W_test2);

    kb.removeEvent("keypress", input.KEY_W, _onPressKey_W_test2);
    callbacks = kb.getPressedKeysCallbacks();
    expect(callbacks[input.KEY_W].length).toBe(0);
});