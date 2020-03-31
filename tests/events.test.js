import { Events } from '../src/og/Events.js';

test('Test multiple event handlers for one function', () => {

    let e = new Events(["one", "two", "three"]);

    let resultA = "";

    let _onOneA = function (a) {
        resultA = "A:" + a;
    };

    e.on("one", _onOneA);
    e.on("two", _onOneA);
    e.on("three", _onOneA);

    e.dispatch(e.one, "one");
    expect(resultA).toEqual("A:one");

    e.dispatch(e.two, "two");
    expect(resultA).toEqual("A:two");

    e.dispatch(e.three, "three");
    expect(resultA).toEqual("A:three");
});