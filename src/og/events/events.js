goog.provide('og.Events');

og.Events = function () { };

og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = { "active": true, "handlers": [] };
    }
};

og.Events.prototype.on = function (name, sender, callback) {
    this[name].handlers.unshift({ sender: sender, callback: callback });
};

og.Events.prototype.dispatch = function (event, obj) {
    if (event && event.active) {
        var h = event.handlers;
        var i = h.length;
        while (i--) {
            var e = h[i];
            e.callback.call(e.sender, obj);
        }
    }
};