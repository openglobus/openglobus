import { Sun } from "../../src/control/Sun";
import { LonLat } from "../../src/LonLat";

describe("Sun built-in time zones", () => {
    test("are loaded on the first lookup", async () => {
        const sun = new Sun({ useTimeZones: true });
        const moscow = new LonLat(37.62, 55.75);

        // Solar time until the data arrives.
        expect(sun._lookupTimeZone(moscow)).toBe(null);

        await vi.waitFor(() => expect(sun._lookupTimeZone(moscow)).toBe("Europe/Moscow"));
    });
});
