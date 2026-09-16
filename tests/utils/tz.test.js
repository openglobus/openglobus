import { TimeZoneProvider } from '../../src/utils/tz';

const data = {
    features: [
        {
            properties: { tzid: 'Test/Square' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
                    [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
                ]
            }
        },
        {
            properties: { tzid: 'Test/Islands' },
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]],
                    [[[40, 0], [50, 0], [50, 10], [40, 10], [40, 0]]]
                ]
            }
        }
    ]
};

describe('TimeZoneProvider', () => {
    const tz = new TimeZoneProvider({ data });

    test('finds the polygon of a point', () => {
        expect(tz.lookup(5, 8)).toBe('Test/Square');
    });

    test('respects holes', () => {
        expect(tz.lookup(5, 5)).toBe(null);
    });

    test('checks every part of a multipolygon', () => {
        expect(tz.lookup(25, 5)).toBe('Test/Islands');
        expect(tz.lookup(45, 5)).toBe('Test/Islands');
    });

    test('misses outside of the data', () => {
        expect(tz.lookup(35, 5)).toBe(null);
        expect(tz.lookup(-5, -5)).toBe(null);
    });

    test('load resolves without fetching when data is inline', async () => {
        await expect(tz.load()).resolves.toBe(tz);
        expect(tz.data).toBe(data);
    });

    test('load is shared between callers', () => {
        expect(tz.load()).toBe(tz.load());
    });
});

describe('tzOffsetMinutes', () => {
    test('fixed-offset zones', async () => {
        const { tzOffsetMinutes } = await import('../../src/utils/tz');
        expect(tzOffsetMinutes('Europe/Moscow', new Date('2026-01-15T12:00:00Z'))).toBe(180);
        expect(tzOffsetMinutes('Asia/Kathmandu', new Date('2026-07-15T12:00:00Z'))).toBe(345);
    });

    test('applies DST by the date', async () => {
        const { tzOffsetMinutes } = await import('../../src/utils/tz');
        expect(tzOffsetMinutes('America/Chicago', new Date('2026-01-15T12:00:00Z'))).toBe(-360);
        expect(tzOffsetMinutes('America/Chicago', new Date('2026-07-15T12:00:00Z'))).toBe(-300);
    });
});
