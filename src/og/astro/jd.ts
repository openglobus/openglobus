import {binarySearch} from "../utils/shared";

type JulianDate = number;
/**
 * Seconds in millisecond.
 * @const
 */
export const SECONDS_PER_MILLISECOND = 0.001;

/**
 * Milliseconds in second.
 * @const
 */
export const MILLISECONDS_PER_SECOND = 1000.0;

/**
 * Seconds in minute.
 * @const
 */
export const SECONDS_PER_MINUTE = 60.0;

/**
 * One by seconds in minute.
 * @const
 */
export const ONE_BY_SECONDS_PER_MINUTE = 1.0 / SECONDS_PER_MINUTE;

/**
 * Minutes in hour.
 * @const
 */
export const MINUTES_PER_HOUR = 60.0;

/**
 * Hours in day.
 * @const
 */
export const HOURS_PER_DAY = 24.0;

/**
 * One by hours in day.
 * @const
 */
export const ONE_BY_HOURS_PER_DAY = 1.0 / HOURS_PER_DAY;

/**
 * Seconds in hour.
 * @const
 */
export const SECONDS_PER_HOUR = 3600.0;

/**
 * One by seconds in hour.
 * @const
 */
export const ONE_BY_SECONDS_PER_HOUR = 1.0 / SECONDS_PER_HOUR;

/**
 * Seconds in 12 hours.
 * @const
 */
export const SECONDS_PER_12_HOURS = 12.0 * SECONDS_PER_HOUR;

/**
 * Minutes in day.
 * @const
 */
export const MINUTES_PER_DAY = 1440.0;

/**
 * One by minutes in day.
 * @const
 */
export const ONE_BY_MINUTES_PER_DAY = 1.0 / MINUTES_PER_DAY;

/**
 * Seconds in day.
 * @const
 */
export const SECONDS_PER_DAY = 86400.0;

/**
 * Milliseconds in day.
 * @const
 */
export const MILLISECONDS_PER_DAY = 86400000.0;

/**
 * One by milliseconds in day.
 * @const
 */
export const ONE_BY_MILLISECONDS_PER_DAY = 1.0 / MILLISECONDS_PER_DAY;

/**
 * One by seconds in day.
 * @const
 */
export const ONE_BY_SECONDS_PER_DAY = 1.0 / SECONDS_PER_DAY;

/**
 * Days in julian century.
 * @const
 */
export const DAYS_PER_JULIAN_CENTURY = 36525.0;

/**
 * Days in julian year.
 * @const
 */
export const DAYS_PER_JULIAN_YEAR = 365.25;

/**
 * Seconds in picoseconds.
 * @const
 */
export const PICOSECOND = 0.000000001;

/**
 * Modified julian date difference.
 * @const
 */
export const MODIFIED_JULIAN_DATE_DIFFERENCE = 2400000.5;

/**
 * Julian date of 2000 year. Epoch.
 * @const
 */
export const J2000 = 2451545.0;

/**
 * Returns julian days from Epoch.
 * @param {JulianDate} jd - Julian date.
 * @returns {number} Days from epoch
 */
export function T(jd: JulianDate): number {
    return (jd - J2000) / DAYS_PER_JULIAN_CENTURY;
}

/**
 * Gets the date's julian day.
 * @param {number} year - Year.
 * @param {number} month - Month.
 * @param {number} day - Day.
 * @returns {number} Day number
 */
export function getDayNumber(year: number, month: number, day: number): number {
    let a = ((month - 14) / 12) | 0;
    let b = year + 4800 + a;
    return (
        (((1461 * b) / 4) | 0) +
        (((367 * (month - 2 - 12 * a)) / 12) | 0) -
        (((3 * (((b + 100) / 100) | 0)) / 4) | 0) +
        day -
        32075
    );
}

/**
 * Converts javascript date to the universal(UTC) julian date.
 * @param {Date} date - Date.
 * @returns {JulianDate} UTC julian date
 */
export function DateToUTC(date: Date): JulianDate {
    let dayNumber = getDayNumber(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

    let hour = date.getUTCHours() - 12;
    if (hour < 0) {
        hour += 24;
    }

    let secondsOfDay =
        date.getUTCSeconds() +
        hour * SECONDS_PER_HOUR +
        date.getUTCMinutes() * SECONDS_PER_MINUTE +
        date.getUTCMilliseconds() * SECONDS_PER_MILLISECOND;

    if (secondsOfDay >= SECONDS_PER_12_HOURS) {
        dayNumber--;
    }

    let extraDays = (secondsOfDay * ONE_BY_SECONDS_PER_DAY) | 0;
    dayNumber += extraDays;
    secondsOfDay -= SECONDS_PER_DAY * extraDays;

    if (secondsOfDay < 0) {
        dayNumber--;
        secondsOfDay += SECONDS_PER_DAY;
    }

    return dayNumber + secondsOfDay * ONE_BY_SECONDS_PER_DAY;
}

/**
 * Converts javascript date to the atomic(TAI) julian date.
 * @param {Date} date - Date.
 * @returns {JulianDate} TAI julian date
 */
export function DateToTAI(date: Date): JulianDate {
    return UTCtoTAI(DateToUTC(date));
}

/**
 * Converts coordinated universal(UTC) julian date to atomic(TAI) julian date.
 * @param {JulianDate} jd - UTC julian date.
 * @returns {JulianDate} TAI julian date
 */
export function UTCtoTAI(jd: JulianDate): JulianDate {
    let leapSeconds = leapSecondsTable;

    let index = binarySearch(leapSeconds, jd, function (a: number, b: LeapSeconds) {
        return a - b.jd;
    });

    if (index < 0) {
        index = ~index;
    }

    if (index >= leapSeconds.length) {
        index = leapSeconds.length - 1;
    }

    let offset = leapSeconds[index].leapSeconds;

    if (index !== 0) {
        if ((leapSeconds[index].jd - jd) * SECONDS_PER_DAY > offset) {
            offset = leapSeconds[index - 1].leapSeconds;
        }
    }

    return jd + offset * ONE_BY_SECONDS_PER_DAY;
}

/**
 * Converts atomic julian date(TAI) to the coordinated universal(UTC) julian date.
 * @param {JulianDate} tai - TAI julian date.
 * @returns {JulianDate | undefined} UTC julian date
 */
export function TAItoUTC(tai: JulianDate): JulianDate | undefined {
    let leapSeconds = leapSecondsTable;
    let index = binarySearch(leapSeconds, tai, function (a: JulianDate, b: LeapSeconds) {
        return a - b.jd;
    });

    if (index < 0) {
        index = ~index;
    }

    if (index >= leapSeconds.length) {
        return tai - leapSeconds[index - 1].leapSeconds * ONE_BY_SECONDS_PER_DAY;
    }

    if (index === 0) {
        return tai - leapSeconds[0].leapSeconds * ONE_BY_SECONDS_PER_DAY;
    }

    let diff = (leapSeconds[index].jd - tai) * SECONDS_PER_DAY;

    if (diff === 0) {
        return tai - leapSeconds[index].leapSeconds * ONE_BY_SECONDS_PER_DAY;
    }

    if (diff <= 1.0) {
        return;
    }

    return tai - leapSeconds[index - 1].leapSeconds * ONE_BY_SECONDS_PER_DAY;
}

/**
 * Converts UTC julian date to the javascript date object.
 * @param {JulianDate} utc - UTC julian date.
 * @returns {Date} JavaScript Date object
 */
export function UTCtoDate(utc: JulianDate): Date {
    let julianDayNumber = utc | 0;
    let secondsOfDay = (utc - julianDayNumber) * SECONDS_PER_DAY;

    if (secondsOfDay >= SECONDS_PER_12_HOURS) {
        julianDayNumber++;
    }

    let L = (julianDayNumber + 68569) | 0;
    let N = ((4 * L) / 146097) | 0;
    L = (L - (((146097 * N + 3) / 4) | 0)) | 0;
    let I = ((4000 * (L + 1)) / 1461001) | 0;
    L = (L - (((1461 * I) / 4) | 0) + 31) | 0;
    let J = ((80 * L) / 2447) | 0;
    let day = (L - (((2447 * J) / 80) | 0)) | 0;
    L = (J / 11) | 0;
    let month = (J + 2 - 12 * L) | 0;
    let year = (100 * (N - 49) + I + L) | 0;

    let hour = (secondsOfDay * ONE_BY_SECONDS_PER_HOUR) | 0;
    let remainingSeconds = secondsOfDay - hour * SECONDS_PER_HOUR;
    let minute = (remainingSeconds * ONE_BY_SECONDS_PER_MINUTE) | 0;
    remainingSeconds = remainingSeconds - minute * SECONDS_PER_MINUTE;
    let second = remainingSeconds | 0;
    let millisecond = ((remainingSeconds - second) * MILLISECONDS_PER_SECOND) | 0;

    hour += 12;
    if (hour > 23) {
        hour -= 24;
    }

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
}

/**
 * Converts TAI julian date to the javascript date object.
 * @param {JulianDate} tai - TAI julian date.
 * @returns {Date} JavaScript Date object
 */
export function TAItoDate(tai: JulianDate): Date {
    let utc = TAItoUTC(tai);
    if (!utc) {
        utc = TAItoUTC(addSeconds(tai, -1))!;
        console.trace(`TAItoDate - can't convert ${tai.toString()} to utc.`);
    }

    return UTCtoDate(utc);
}

/**
 * Adds milliseconds to the julian date.
 * @param {JulianDate} jd - Julian date.
 * @param {number} milliseconds - Milliseconds to add.
 * @returns {JulianDate} Julian date
 */
export function addMilliseconds(jd: JulianDate, milliseconds: number): JulianDate {
    return jd + milliseconds * ONE_BY_MILLISECONDS_PER_DAY;
}

/**
 * Adds seconds to the julian date.
 * @param {JulianDate} jd - Julian date.
 * @param {number} seconds - Seconds to add.
 * @returns {JulianDate} Julian date
 */
export function addSeconds(jd: JulianDate, seconds: number): JulianDate {
    return jd + seconds * ONE_BY_SECONDS_PER_DAY;
}

/**
 * Adds hours to the julian date.
 * @param {JulianDate} jd - Julian date.
 * @param {number} hours - Hours to add.
 * @returns {JulianDate} Julian date
 */
export function addHours(jd: JulianDate, hours: number): JulianDate {
    return jd + hours * ONE_BY_HOURS_PER_DAY;
}

/**
 * Adds minutes to the julian date.
 * @param {JulianDate} jd - Julian date.
 * @param {number} minutes - Minutes to add.
 * @returns {JulianDate} Julian date
 */
export function addMinutes(jd: JulianDate, minutes: number): JulianDate {
    return jd + minutes * MINUTES_PER_DAY;
}

/**
 * Adds days to the julian date.
 * @param {JulianDate} jd - Julian date.
 * @param {number} days - Days to add.
 * @returns {JulianDate} Julian date
 */
export function addDays(jd: JulianDate, days: number): JulianDate {
    return jd + days;
}

/**
 * Gets milliseconds of a julian date.
 * @param {JulianDate} jd - julian date.
 * @returns {number} Milliseconds
 */
export function getMilliseconds(jd: JulianDate): number {
    let s = jd - (jd | 0);
    s *= SECONDS_PER_DAY;
    return ((s - (s | 0)) * MILLISECONDS_PER_SECOND) | 0;
}

/**
 * Gets seconds of a julian date.
 * @param {JulianDate} jd - julian date.
 * @returns {number} Seconds
 */
export function getSeconds(jd: JulianDate): number {
    let s = jd - (jd | 0);
    return s * SECONDS_PER_DAY;
}

/**
 * Gets hours of a julian date.
 * @param {JulianDate} jd - julian date.
 * @returns {number} Hours
 */
export function getHours(jd: JulianDate): number {
    let julianDayNumber = jd | 0;
    let secondsOfDay = (jd - julianDayNumber) * SECONDS_PER_DAY;

    let hour = (secondsOfDay * ONE_BY_SECONDS_PER_HOUR) | 0;
    let remainingSeconds = secondsOfDay - hour * SECONDS_PER_HOUR;
    let minute = (remainingSeconds * ONE_BY_SECONDS_PER_MINUTE) | 0;
    remainingSeconds = remainingSeconds - minute * SECONDS_PER_MINUTE;
    let second = remainingSeconds | 0;
    let millisecond = ((remainingSeconds - second) * MILLISECONDS_PER_SECOND) | 0;

    hour += 12 + minute / 60 + second / 3600 + millisecond / 1000;
    if (hour > 23) {
        hour -= 24;
    }

    return hour;
}

/**
 * Gets minutes of a julian date.
 * @param {JulianDate} jd - julian date.
 * @returns {number} Minutes
 */
export function getMinutes(jd: JulianDate): number {
    let s = jd - (jd | 0);
    return (s * MINUTES_PER_DAY) | 0;
}

/**
 * Gets days of a julian date.
 * @param {JulianDate} jd - julian date.
 * @returns {number} Days
 */
export function getDays(jd: JulianDate): number {
    return jd | 0;
}

/**
 * Returns days in seconds.
 * @param {number} s - Seconds.
 * @returns {number} Days
 */
export function secondsToDays(s: number): number {
    return s * ONE_BY_SECONDS_PER_DAY;
}

/**
 * Returns seconds in days.
 * @param {number} d - Days.
 * @returns {number} Seconds
 */
export function daysToSeconds(d: number): number {
    return d * SECONDS_PER_DAY;
}

type LeapSeconds = { jd: JulianDate, leapSeconds: number };

function __ls(jd: JulianDate, leapSeconds: number): LeapSeconds {
    return {
        jd: jd,
        leapSeconds: leapSeconds
    };
}

const leapSecondsTable: LeapSeconds[] = [
    __ls(2441317.5, 10.0), // 1972-01-01T00:00:00.000Z
    __ls(2441499.5, 11.0), // 1972-07-01T00:00:00.000Z
    __ls(2441683.5, 12.0), // 1973-01-01T00:00:00.000Z
    __ls(2442048.5, 13.0), // 1974-01-01T00:00:00.000Z
    __ls(2442413.5, 14.0), // 1975-01-01T00:00:00.000Z
    __ls(2442778.5, 15.0), // 1976-01-01T00:00:00.000Z
    __ls(2443144.5, 16.0), // 1977-01-01T00:00:00.000Z
    __ls(2443509.5, 17.0), // 1978-01-01T00:00:00.000Z
    __ls(2443874.5, 18.0), // 1979-01-01T00:00:00.000Z
    __ls(2444239.5, 19.0), // 1980-01-01T00:00:00.000Z
    __ls(2444786.5, 20.0), // 1981-07-01T00:00:00.000Z
    __ls(2445151.5, 21.0), // 1982-07-01T00:00:00.000Z
    __ls(2445516.5, 22.0), // 1983-01-01T00:00:00.000Z
    __ls(2446247.5, 23.0), // 1985-07-01T00:00:00.000Z
    __ls(2447161.5, 24.0), // 1988-01-01T00:00:00.000Z
    __ls(2447892.5, 25.0), // 1990-01-01T00:00:00.000Z
    __ls(2448257.5, 26.0), // 1991-01-01T00:00:00.000Z
    __ls(2448804.5, 27.0), // 1992-07-01T00:00:00.000Z
    __ls(2449169.5, 28.0), // 1993-07-01T00:00:00.000Z
    __ls(2449534.5, 29.0), // 1994-07-01T00:00:00.000Z
    __ls(2450083.5, 30.0), // 1996-01-01T00:00:00.000Z
    __ls(2450630.5, 31.0), // 1997-07-01T00:00:00.000Z
    __ls(2451179.5, 32.0), // 1999-01-01T00:00:00.000Z
    __ls(2453736.5, 33.0), // 2006-01-01T00:00:00.000Z
    __ls(2454832.5, 34.0), // 2009-01-01T00:00:00.000Z
    __ls(2456109.5, 35.0), // 2012-07-01T00:00:00.000Z
    __ls(2457204.5, 36.0) // 2015-07-01T00:00:00.000Z
];

export const J2000TAI = UTCtoTAI(J2000);
