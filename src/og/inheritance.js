goog.provide('og.inheritance');

/**
 * JavaScript objects inheritage functions.
 * @namespace og.inheritance
 */

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { };
 *
 * function ChildClass(a, b, c) {
 *   og.inheritance.base(this, a, b);
 * }
 * og.inheritance.extend(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // This works.
 * </pre>
 *
 * @param {!Function} Child - Child class.
 * @param {!Function} Parent - Parent class.
 */
og.inheritance.extend = function (Child, Parent) {
    var F = function () { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
    Child.superclass.constructor = Parent;
};

/**
 * Call up to the superclass.
 *
 * This function only works if you use og.inheritance.extend to express inheritance
 * relationships between your classes.
 *
 * See {@link og.inheritance.extend}
 */
og.inheritance.base = function (me) {
    var caller = arguments.callee.caller;
    caller.superclass.constructor.apply(me, Array.prototype.slice.call(arguments, 1));
};