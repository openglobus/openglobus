goog.provide('og.input.KeyboardHandler');

og.input.KeyboardHandler = function () {
    var _currentlyPressedKeys = {};
    var _pressedKeysCallbacks = {};
    var _charkeysCallbacks = {};
    var _that = this;

    if (og.input.KeyboardHandler.prototype._instance) {
        return og.input.KeyboardHandler.prototype._instance;
    } else {
        og.input.KeyboardHandler.prototype._instance = this;

        document.onkeydown = function (event) { _that.handleKeyDown.call(_that, event) };
        document.onkeyup = function (event) { _that.handleKeyUp.call(_that, event) };
    }

    this.setEvent = function (event, sender, callback, keyCode) {
        switch (event) {
            case "onkeypressed":
                _pressedKeysCallbacks[keyCode] = { callback: callback, sender: sender };
                break;
            case "oncharkeypressed":
                _charkeysCallbacks[keyCode] = { callback: callback, sender: sender, ch: String.fromCharCode(keyCode) };
                break;
        }
    };

    this.isKeyPressed = function (keyCode) {
        return _currentlyPressedKeys[keyCode];
    };

    this.handleKeyDown = function (event) {
        _currentlyPressedKeys[event.keyCode] = true;
        for (var ch in _charkeysCallbacks) {
            if (String.fromCharCode(event.keyCode) == _charkeysCallbacks[ch].ch) {
                var ccl = _charkeysCallbacks[ch];
                ccl.callback.call(ccl.sender);
            }
        }
    };

    this.handleKeyUp = function (event) {
        _currentlyPressedKeys[event.keyCode] = false;
    };

    this.handleEvents = function () {
        for (var pk in _pressedKeysCallbacks) {
            if (_currentlyPressedKeys[pk]) {
                var cpk = _pressedKeysCallbacks[pk];
                cpk.callback.call(cpk.sender);
            }
        }
    };
};