goog.provide('og.Stack');

og.Stack = function (size) {

    size = size || 256;

    var Node = function () {
        this.next = null;
        this.prev = null;
        this.data = null;
    };

    var _current = new Node(),
        _head = _current;
    for (var i = 0; i < size; i++) {
        var n = new Node();
        n.prev = _current;
        _current.next = n;
        _current = n;
    }
    _current = _head;

    this.push = function (data) {
        _current = _current.next;
        _current.data = data;
    };

    this.pop = function (data) {
        _current = _current.prev;
        return _current.next.data;        
    };

    this.popPrev = function (data) {
        _current = _current.prev;
        return _current.data;
    };
};
