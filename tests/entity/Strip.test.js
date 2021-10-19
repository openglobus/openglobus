import { Strip } from "../../src/og/entity/Strip";


test('Testing Strip', () => {
    let strip = new Strip({
        'color': [0, 0, 0, 0],
        'opacity': 1,
        'visibility': true
    });
    strip.setColor(255, 255, 255, 255);
    strip.clear();

    expect(strip.getVisibility()).toBe(true);
});