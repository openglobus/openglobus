goog.provide('og.input.TouchHandler');

og.input.TouchHandler = function (htmlObject) {
    this._htmlObject = htmlObject;
};

og.input.TouchHandler.prototype.setEvent = function (event, sender, callback) {
    switch (event) {
        case "touchcancel": {
            this._htmlObject.ontouchcancel = function (event) {
                event.preventDefault();
                callback.call(sender, event);
            };
        }
            break;
        case "touchstart": {
            this._htmlObject.ontouchstart = function (event) {
                event.preventDefault();
                callback.call(sender, event);
            };
        } break;
        case "touchend": {
            this._htmlObject.ontouchend = function (event) {
                event.preventDefault();
                callback.call(sender, event);
            };
        } break;
        case "touchmove": {
            this._htmlObject.ontouchmove = function (event) {
                event.preventDefault();
                var rect = this.getBoundingClientRect();
                callback.call(sender, event/*{ clientX: event.clientX - rect.left, clientY: event.clientY - rect.top }*/);
            };
        } break;
    }
};