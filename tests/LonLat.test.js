import { LonLat } from '../src/og/LonLat';

test('Testing LonLat', () => {
    const lonlat = new LonLat();
    expect(lonlat).toBeTruthy();
    expect(lonlat.isZero()).toBeTruthy();

    const lonlat2 = LonLat.createFromArray([1, 1, 1]);
    expect(lonlat2).toBeTruthy();

    expect(lonlat2.set(2, 2, 2)).toBeTruthy();
    expect(lonlat.copy(lonlat2)).toBeTruthy();
    expect(lonlat.equal(lonlat2)).toBeTruthy();
    expect(lonlat2.set()).toBeTruthy();

    let cooArray = [
        [1, 1, 3],
        [1, 1, 0]
    ];
    let lonlatArray = LonLat.join(cooArray);
    expect(lonlatArray).toBeTruthy();
    expect(lonlatArray[0].equal(lonlatArray[1])).toBeTruthy();
});
