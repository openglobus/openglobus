import { LonLat } from '../src/og/LonLat';

describe('LonLat', () => {
    describe('constructor', () => {
        test('creates instance with default parameters', () => {
            const lonlat = new LonLat();
            expect(lonlat.lon).toBe(0);
            expect(lonlat.lat).toBe(0);
            expect(lonlat.height).toBe(0);
        });

        test('creates instance with specified parameters', () => {
            const lonlat = new LonLat(10, 20, 30);
            expect(lonlat.lon).toBe(10);
            expect(lonlat.lat).toBe(20);
            expect(lonlat.height).toBe(30);
        });
    });

    describe('isZero', () => {
        test('returns true if all coordinates are zero', () => {
            const lonlat = new LonLat();
            expect(lonlat.isZero()).toBe(true);
        });

        test('returns false if any coordinate is not zero', () => {
            const lonlat = new LonLat(0, 0, 1);
            expect(lonlat.isZero()).toBe(false);
        });
    });

    describe('join', () => {
        test('creates array of LonLat instances', () => {
            const arr = [[0, 0, 0],
                [10, 20, 30],
            ];
            const lonlats = LonLat.join(arr);
            expect(lonlats.length).toBe(arr.length);
            expect(lonlats[0]).toBeInstanceOf(LonLat);
            expect(lonlats[0].lon).toBe(0);
            expect(lonlats[0].lat).toBe(0);
            expect(lonlats[0].height).toBe(0);
            expect(lonlats[1]).toBeInstanceOf(LonLat);
            expect(lonlats[1].lon).toBe(10);
            expect(lonlats[1].lat).toBe(20);
            expect(lonlats[1].height).toBe(30);
        });
    });

    describe('createFromArray', () => {
        test('creates instance from array', () => {
            const lonlat = LonLat.createFromArray([10, 20, 30]);
            expect(lonlat).toBeInstanceOf(LonLat);
            expect(lonlat.lon).toBe(10);
            expect(lonlat.lat).toBe(20);
            expect(lonlat.height).toBe(30);
        });
    });

    describe('forwardMercator', () => {
        test('converts degrees to mercator', () => {
            const lonlat = LonLat.forwardMercator(0, 0, 30);
            expect(lonlat).toBeInstanceOf(LonLat);
            expect(lonlat.lon).toBeCloseTo(0, 5);
            expect(lonlat.lat).toBeCloseTo(0, 5);
            expect(lonlat.height).toBe(30);
        });
    });

    describe('forwardMercator and inverseMercator', () => {
        test('converts degrees to mercator', () => {
            const lonlat = new LonLat(10, 20, 30);
            const mercatorLonlat = lonlat.forwardMercator();
            const inversedLonLat = mercatorLonlat.inverseMercator();

            expect(lonlat.lon).toBeCloseTo(inversedLonLat.lon, 5);
            expect(lonlat.lat).toBeCloseTo(inversedLonLat.lat, 5);
            expect(lonlat.height).toBeCloseTo(inversedLonLat.height, 5)
        });
    });
    describe("set", () => {
        it("should correctly set new longitude and latitude values", () => {
            const lonlat = new LonLat(-73.9857, 40.7484);
            lonlat.set(-118.2437, 34.0522);
            expect(lonlat.lon).toBe(-118.2437);
            expect(lonlat.lat).toBe(34.0522);
        });
    });

    describe("copy", () => {
        it("should correctly copy the longitude and latitude values from another LonLat object", () => {
            const nyLonLat = new LonLat(-73.9857, 40.7484);
            const laLonLat = new LonLat(-118.2437, 34.0522);
            laLonLat.copy(nyLonLat);
            expect(laLonLat.lon).toBe(-73.9857);
            expect(laLonLat.lat).toBe(40.7484);
        });
    });

    describe("equal", () => {
        test("should return true when comparing two identical LonLat objects", () => {
            const lonlat1 = new LonLat(10, 20);
            const lonlat2 = new LonLat(10, 20);
            expect(lonlat1.equal(lonlat2)).toBe(true);
        });

        test("should return false when comparing two LonLat objects with different longitude values", () => {
            const lonlat1 = new LonLat(10, 20);
            const lonlat2 = new LonLat(20, 20);
            expect(lonlat1.equal(lonlat2)).toBe(false);
        });

        test("should return false when comparing two LonLat objects with different latitude values", () => {
            const lonlat1 = new LonLat(10, 20);
            const lonlat2 = new LonLat(10, 30);
            expect(lonlat1.equal(lonlat2)).toBe(false);
        });
    });
});