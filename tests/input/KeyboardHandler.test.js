import { KeyboardHandler } from "../../src/input/KeyboardHandler";
import { input } from "../../src/input/input";

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

test('Testing KeyboardHadler removeEvent after destroy does not throw', () => {
    let kb = new KeyboardHandler();

    const _onFreeKey_F = () => {
    };

    const _onPressKey_W = () => {
    };

    kb.addEvent("keyfree", input.KEY_F, _onFreeKey_F);
    kb.addEvent("keypress", input.KEY_W, _onPressKey_W);

    expect(kb.getUnpressedKeysCallbacks()[input.KEY_F].length).toBe(1);
    expect(kb.getPressedKeysCallbacks()[input.KEY_W].length).toBe(1);

    kb.destroy();

    // Controls may unbind their key events after the handler has been destroyed
    expect(() => kb.removeEvent("keyfree", input.KEY_F, _onFreeKey_F)).not.toThrow();
    expect(() => kb.removeEvent("keypress", input.KEY_W, _onPressKey_W)).not.toThrow();

    expect(kb.getUnpressedKeysCallbacks()).toEqual({});
    expect(kb.getPressedKeysCallbacks()).toEqual({});
});

test('Testing KeyboardHadler removeEvent with a missing callbacks map does not throw', () => {
    let kb = new KeyboardHandler();

    const _onFreeKey_F = () => {
    };

    kb.addEvent("keyfree", input.KEY_F, _onFreeKey_F);

    // The stamp is still cached, but the callbacks map for the key code is gone
    delete kb.getUnpressedKeysCallbacks()[input.KEY_F];

    expect(() => kb.removeEvent("keyfree", input.KEY_F, _onFreeKey_F)).not.toThrow();
});