goog.provide('og.class');

og.class.extend = function(Child, Parent) {
    var F = function () { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.superclass.constructor = Parent;
};

og.class.base = function (me) {
    var caller = arguments.callee.caller;    
    caller.superclass.constructor.apply(me, Array.prototype.slice.call(arguments, 1));
};