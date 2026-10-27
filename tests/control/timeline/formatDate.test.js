import { describe, expect, it } from "vitest";
import { formatDate } from "../../../src/control/timeline/timelineUtils";

const d = new Date(Date.UTC(2026, 8, 5, 14, 7, 9, 42));

describe("Timeline formatDate", () => {
    it("formats dates", () => {
        expect(formatDate(d, "MM/dd/yyyy")).toBe("09/05/2026");
        expect(formatDate(d, "d.M.yy")).toBe("5.9.26");
        expect(formatDate(d, "MMM d yyyy")).toBe("Sep 5 2026");
    });

    it("formats time", () => {
        expect(formatDate(d, "hh:mm")).toBe("14:07");
        expect(formatDate(d, "hh:mm:ss.ms")).toBe("14:07:09.042");
        expect(formatDate(d, "h:m:s")).toBe("14:7:9");
    });

    it("appends am/pm on a 12-hour clock", () => {
        expect(formatDate(d, "hh:mm", false)).toBe("02:07 pm");
        expect(formatDate(new Date(Date.UTC(2026, 8, 5, 0, 30)), "hh:mm", false)).toBe("12:30 am");
    });

    it("places am/pm by the token", () => {
        expect(formatDate(d, "hh:mm a", false)).toBe("02:07 pm");
        expect(formatDate(d, "hh:mm A", false)).toBe("02:07 PM");
    });

    it("keeps dates free of am/pm on a 12-hour clock", () => {
        expect(formatDate(d, "MM/dd/yyyy", false)).toBe("09/05/2026");
    });

    it("tells month from minutes by case", () => {
        expect(formatDate(d, "hh:mm MM.dd")).toBe("14:07 09.05");
        expect(formatDate(d, "mm MM")).toBe("07 09");
    });

    it("passes unknown characters through", () => {
        expect(formatDate(d, "yyyy-MM-ddThh:mm:ssZ")).toBe("2026-09-05T14:07:09Z");
    });
});
