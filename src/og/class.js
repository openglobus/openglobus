og._class_ = { };

og._class_.extend = function(Child, Parent) {
    var F = function () { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.superclass.constructor = Parent;
}