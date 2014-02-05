goog.provide('og.Events');

og.Events = function () { };

og.Events.prototype.registerNames = function (eventNames) {
    for (var i = 0; i < eventNames.length; i++) {
        this[eventNames[i]] = [];
    }
};

og.Events.prototype.addEvent = function (name, sender, callback) {
    this[name].push({ sender: sender, callback: callback });
};

og.Events.prototype.callEvents = function (events, obj) {
    var i = events.length;
    while (i--) {
        var e = events[i];
        e.callback.call(e.sender, obj);
    }
};