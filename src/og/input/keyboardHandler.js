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

    var _sortByPriority = function (a, b) {
        return a.priority < b.priority;
    };

    this.addEvent = function (event, sender, callback, keyCode, priority) {
        if (priority === undefined) {
            priority = 1600;
        }
        switch (event) {
            case "onkeypressed": {
                if (!_pressedKeysCallbacks[keyCode]) {
                    _pressedKeysCallbacks[keyCode] = [];
                }
                _pressedKeysCallbacks[keyCode].push({ callback: callback, sender: sender, priority: priority });
                _pressedKeysCallbacks[keyCode].sort(_sortByPriority);
            } break;
            case "oncharkeypressed": {
                if (!_charkeysCallbacks[keyCode]) {
                    _charkeysCallbacks[keyCode] = [];
                }
                _charkeysCallbacks[keyCode].push({ callback: callback, sender: sender, priority: priority });
                _charkeysCallbacks[keyCode].sort(_sortByPriority);
            } break;
        }
    };

    this.isKeyPressed = function (keyCode) {
        return _currentlyPressedKeys[keyCode];
    };

    this.handleKeyDown = function (event) {
        _currentlyPressedKeys[event.keyCode] = true;
        for (var ch in _charkeysCallbacks) {
            if (String.fromCharCode(event.keyCode) == String.fromCharCode(ch)) {
                var ccl = _charkeysCallbacks[ch];
                for (var i = 0; i < ccl.length; i++) {
                    ccl[i].callback.call(ccl[i].sender);
                }
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
                for (var i = 0; i < cpk.length; i++) {
                    cpk[i].callback.call(cpk[i].sender);
                }
            }
        }
    };
};