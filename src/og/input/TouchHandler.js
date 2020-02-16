/**
 * @module og/input/TouchHandler
 */

'use strict';

const TouchHandler = function (htmlObject) {
    this._htmlObject = htmlObject;
};

TouchHandler.prototype.setEvent = function (event, sender, callback) {
    switch (event) {
        case "touchcancel":
            this._htmlObject.addEventListener('touchcancel', function (event) {
                event.preventDefault();
                var rect = this.getBoundingClientRect();
                event.offsetLeft = rect.left;
                event.offsetTop = rect.top;
                callback.call(sender, event);
                event.preventDefault();
            });
            break;

        case "touchstart":
            this._htmlObject.addEventListener('touchstart', function (event) {
                event.preventDefault();
                var rect = this.getBoundingClientRect();
                event.offsetLeft = rect.left;
                event.offsetTop = rect.top;
                callback.call(sender, event);
                event.preventDefault();
            });
            break;

        case "touchend":
            this._htmlObject.addEventListener('touchend', function (event) {
                event.preventDefault();
                var rect = this.getBoundingClientRect();
                event.offsetLeft = rect.left;
                event.offsetTop = rect.top;
                callback.call(sender, event);
                event.preventDefault();
            });
            break;

        case "touchmove":
            this._htmlObject.addEventListener('touchmove', function (event) {
                event.preventDefault();
                var rect = this.getBoundingClientRect();
                event.offsetLeft = rect.left;
                event.offsetTop = rect.top;
                callback.call(sender, event);
                event.preventDefault();
            });
            break;
    }
};

export { TouchHandler };