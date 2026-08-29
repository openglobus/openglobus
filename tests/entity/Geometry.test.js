import { Geometry } from "../../src/entity/geometry/Geometry";

const makeGeometry = (style) =>
    new Geometry({
        type: "POINT",
        coordinates: [0, 0],
        style
    });

test("Geometry color getters return the normalized colors stored in the style", () => {
    const geometry = makeGeometry({
        fillColor: [0.1, 0.2, 0.3, 0.4],
        lineColor: [0.5, 0.6, 0.7, 0.8],
        strokeColor: [0.9, 1.0, 0.0, 0.25]
    });

    expect(geometry.getFillColor4v().toArray()).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(geometry.getLineColor4v().toArray()).toEqual([0.5, 0.6, 0.7, 0.8]);
    expect(geometry.getStrokeColor4v().toArray()).toEqual([0.9, 1.0, 0.0, 0.25]);
});

test("Geometry color getters return the default style colors", () => {
    const geometry = makeGeometry();

    expect(geometry.getFillColor4v().toArray()).toEqual([0.19, 0.62, 0.85, 0.4]);
    expect(geometry.getLineColor4v().toArray()).toEqual([0.19, 0.62, 0.85, 1]);
    expect(geometry.getStrokeColor4v().toArray()).toEqual([1, 1, 1, 0.95]);
});

test("Geometry color getters return copies of the internal style colors", () => {
    const geometry = makeGeometry({
        fillColor: [0.1, 0.2, 0.3, 0.4],
        lineColor: [0.5, 0.6, 0.7, 0.8],
        strokeColor: [0.9, 1.0, 0.0, 0.25]
    });

    const fill = geometry.getFillColor4v();
    const line = geometry.getLineColor4v();
    const stroke = geometry.getStrokeColor4v();

    expect(fill).not.toBe(geometry._style.fillColor);
    expect(line).not.toBe(geometry._style.lineColor);
    expect(stroke).not.toBe(geometry._style.strokeColor);

    fill.x = 1;
    line.y = 1;
    stroke.w = 1;

    expect(geometry.getFillColor4v().toArray()).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(geometry.getLineColor4v().toArray()).toEqual([0.5, 0.6, 0.7, 0.8]);
    expect(geometry.getStrokeColor4v().toArray()).toEqual([0.9, 1.0, 0.0, 0.25]);
});

test("Geometry color getters reflect the setters", () => {
    const geometry = makeGeometry();

    geometry.setFillColor(0.1, 0.2, 0.3, 0.4);
    geometry.setLineColor(0.5, 0.6, 0.7, 0.8);
    geometry.setStrokeColor(0.9, 1.0, 0.0, 0.25);

    expect(geometry.getFillColor4v().toArray()).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(geometry.getLineColor4v().toArray()).toEqual([0.5, 0.6, 0.7, 0.8]);
    expect(geometry.getStrokeColor4v().toArray()).toEqual([0.9, 1.0, 0.0, 0.25]);
});
