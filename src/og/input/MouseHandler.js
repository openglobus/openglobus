/**
 * @module og/input/MouseHandler
 */

'use strict';

const MouseHandler = function (htmlObject) {
    this._htmlObject = htmlObject;
};

MouseHandler.prototype.setEvent = function (event, sender, callback) {
    switch (event) {
        case "mousewheel":
            this._htmlObject.addEventListener('mousewheel', function (evt) {
                var delta = evt.deltaY || evt.detail || evt.wheelDelta;
                if (evt.wheelDelta == undefined) {
                    evt.wheelDelta = delta * (-120);
                }
                callback.call(sender, evt);
                evt.preventDefault();
            }, false);

            this._htmlObject.addEventListener('wheel', function (evt) {
                var delta = evt.deltaY || evt.detail || evt.wheelDelta;
                if (evt.wheelDelta == undefined) {
                    evt.wheelDelta = delta * (-120);
                }
                callback.call(sender, evt);
                evt.preventDefault();
            }, false);
            break;

        case "mousedown":
            this._htmlObject.addEventListener('mousedown', function (event) {
                var rect = this.getBoundingClientRect();
                callback.call(sender, {
                    button: event.button,
                    clientX: event.clientX - rect.left,
                    clientY: event.clientY - rect.top
                }, event);
            });
            this._htmlObject.addEventListener('contextmenu', function (event) {
                event.preventDefault();
                return false;
            });
            break;

        case "mouseup":
            this._htmlObject.addEventListener('mouseup', function (event) {
                var rect = this.getBoundingClientRect();
                callback.call(sender, {
                    button: event.button,
                    clientX: event.clientX - rect.left,
                    clientY: event.clientY - rect.top
                }, event);
            });
            break;

        case "mousemove":
            this._htmlObject.addEventListener('mousemove', function (event) {
                var rect = this.getBoundingClientRect();
                callback.call(sender, {
                    clientX: event.clientX - rect.left,
                    clientY: event.clientY - rect.top
                }, event);
            });
            break;

        case "mouseleave":
            this._htmlObject.addEventListener('mouseleave', function (event) {
                callback.call(sender, event);
            });
            break;

        case "mouseout":
            this._htmlObject.addEventListener('mouseout', function (event) {
                callback.call(sender, event);
            });
            break;

        case "mouseover":
            this._htmlObject.addEventListener('mouseover', function (event) {
                callback.call(sender, event);
            });
            break;

        case "mouseenter":
            this._htmlObject.addEventListener('mouseenter', function (event) {
                callback.call(sender, event);
            });
            break;
    }
};

export { MouseHandler };