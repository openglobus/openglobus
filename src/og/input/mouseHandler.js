goog.provide('og.input.MouseHandler');

og.input.MouseHandler = function (htmlObject) {
    this._htmlObject = htmlObject;
};

og.input.MouseHandler.prototype.setEvent = function (event, sender, callback, keyCode) {
    switch (event) {
        case "onmousewheel": {
            var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel";
            if (this._htmlObject.attachEvent) //if IE (and Opera depending on user setting)
                this._htmlObject.attachEvent("on" + mousewheelevt, function (evt) { callback.call(sender, evt); })
            else if (this._htmlObject.addEventListener) //WC3 browsers
                this._htmlObject.addEventListener(mousewheelevt, function (evt) { evt.wheelDelta = evt.detail * (-120); callback.call(sender, evt); }, false)
        }
            break;
        case "onmousedown": {
            this._htmlObject.onmousedown = function (event) { callback.call(sender, event); };
            this._htmlObject.oncontextmenu = function (event) { return false; };
        } break;
        case "onmouseup": {
            this._htmlObject.onmouseup = function (event) { callback.call(sender, event); };
        } break;
        case "onmousemove": {
            this._htmlObject.onmousemove = function (event) {
                var rect = this.getBoundingClientRect();
                callback.call(sender, { clientX: event.clientX - rect.left, clientY: event.clientY - rect.top });
            };
        } break;
    }
};