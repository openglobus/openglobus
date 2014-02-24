goog.provide('og.Events');

og.Events = function () { };

og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = { "ready": true, "handlers": [] };
    }
};

og.Events.prototype.on = function (name, sender, callback) {
    this[name].handlers.push({ sender: sender, callback: callback });
};

og.Events.prototype.off = function (event) {
    event.ready = false;
};

og.Events.prototype.dispatch = function (event, obj) {
    if (event.ready) {
        var h = event.handlers;
        var i = h.length;
        while (i--) {
            var e = h[i];
            e.callback.call(e.sender, obj);
        }
    }
};