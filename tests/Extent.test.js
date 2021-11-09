import { Extent } from '../src/og/Extent';

test('Testing Extent', () => {
    const extent = new Extent();
    Extent.createByCoordinates([]);
    Extent.FULL_MERC;
    Extent.NORTH_POLE_DEG;
    Extent.SOUTH_POLE_DEG;
    expect(extent).toBeTruthy();
});
