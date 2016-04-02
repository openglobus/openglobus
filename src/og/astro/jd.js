goog.provide('og.jd');

goog.require('og.utils');

og.jd.SECONDS_PER_MILLISECOND = 0.001;
og.jd.MILLISECONDS_PER_SECOND = 1000.0;
og.jd.SECONDS_PER_MINUTE = 60.0;
og.jd.ONE_BY_SECONDS_PER_MINUTE = 1.0 / og.jd.SECONDS_PER_MINUTE;
og.jd.MINUTES_PER_HOUR = 60.0;
og.jd.HOURS_PER_DAY = 24.0;
og.jd.ONE_BY_HOURS_PER_DAY = 1.0 / og.jd.HOURS_PER_DAY;
og.jd.SECONDS_PER_HOUR = 3600.0;
og.jd.ONE_BY_SECONDS_PER_HOUR = 1.0 / og.jd.SECONDS_PER_HOUR;
og.jd.SECONDS_PER_12_HOURS = 12.0 * og.jd.SECONDS_PER_HOUR;
og.jd.MINUTES_PER_DAY = 1440.0;
og.jd.ONE_BY_MINUTES_PER_DAY = 1.0 / og.jd.MINUTES_PER_DAY;
og.jd.SECONDS_PER_DAY = 86400.0;
og.jd.MILLISECONDS_PER_DAY = 86400000.0;
og.jd.ONE_BY_MILLISECONDS_PER_DAY = 1.0 / og.jd.MILLISECONDS_PER_DAY;
og.jd.ONE_BY_SECONDS_PER_DAY = 1.0 / og.jd.SECONDS_PER_DAY;
og.jd.DAYS_PER_JULIAN_CENTURY = 36525.0;
og.jd.DAYS_PER_JULIAN_YEAR = 365.25;
og.jd.PICOSECOND = 0.000000001;
og.jd.MODIFIED_JULIAN_DATE_DIFFERENCE = 2400000.5;
og.jd.J2000 = 2451545.0;

og.jd.T = function (jd) {
    return (jd - og.jd.J2000) / og.jd.DAYS_PER_JULIAN_CENTURY;
};

og.jd.getDayNumber = function (year, month, day) {
    var a = ((month - 14) / 12) | 0;
    var b = year + 4800 + a;
    return (((1461 * b) / 4) | 0) + (((367 * (month - 2 - 12 * a)) / 12) | 0) -
        (((3 * (((b + 100) / 100) | 0)) / 4) | 0) + day - 32075;
};

og.jd.DateToUTC = function (date) {
    var dayNumber = og.jd.getDayNumber(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

    var hour = date.getUTCHours() - 12;
    if (hour < 0) {
        hour += 24;
    }

    var secondsOfDay =
        date.getUTCSeconds() + hour * og.jd.SECONDS_PER_HOUR +
        date.getUTCMinutes() * og.jd.SECONDS_PER_MINUTE +
        date.getUTCMilliseconds() * og.jd.SECONDS_PER_MILLISECOND;

    if (secondsOfDay >= og.jd.SECONDS_PER_12_HOURS) {
        dayNumber--;
    }

    var extraDays = secondsOfDay * og.jd.ONE_BY_SECONDS_PER_DAY | 0;
    dayNumber += extraDays;
    secondsOfDay -= og.jd.SECONDS_PER_DAY * extraDays;

    if (secondsOfDay < 0) {
        dayNumber--;
        secondsOfDay += og.jd.SECONDS_PER_DAY;
    }

    return dayNumber + secondsOfDay * og.jd.ONE_BY_SECONDS_PER_DAY;
};

og.jd.UTCtoTAI = function (jd) {
    var leapSeconds = og.jd.leapSecondsTable;

    var index = og.utils.binarySearch(leapSeconds, jd, function (a, b) {
        return a - b.jd;
    });

    if (index < 0) {
        index = ~index;
    }

    if (index >= leapSeconds.length) {
        index = leapSeconds.length - 1;
    }

    var offset = leapSeconds[index].leapSeconds;

    if (index !== 0) {
        if ((leapSeconds[index].jd - jd) * og.jd.SECONDS_PER_DAY > offset) {
            offset = leapSeconds[index - 1].leapSeconds;
        }
    }

    return jd + offset * og.jd.ONE_BY_SECONDS_PER_DAY;
};

og.jd.DateToTAI = function (date) {
    return og.jd.UTCtoTAI(og.jd.DateToUTC(date));
};

og.jd.UTCtoDate = function (utc) {
    var julianDayNumber = utc | 0;
    var secondsOfDay = (utc - julianDayNumber) * og.jd.SECONDS_PER_DAY;

    if (secondsOfDay >= og.jd.SECONDS_PER_12_HOURS) {
        julianDayNumber++;
    }

    var L = (julianDayNumber + 68569) | 0;
    var N = (4 * L / 146097) | 0;
    L = (L - (((146097 * N + 3) / 4) | 0)) | 0;
    var I = ((4000 * (L + 1)) / 1461001) | 0;
    L = (L - (((1461 * I) / 4) | 0) + 31) | 0;
    var J = ((80 * L) / 2447) | 0;
    var day = (L - (((2447 * J) / 80) | 0)) | 0;
    L = (J / 11) | 0;
    var month = (J + 2 - 12 * L) | 0;
    var year = (100 * (N - 49) + I + L) | 0;

    var hour = secondsOfDay * og.jd.ONE_BY_SECONDS_PER_HOUR | 0;
    var remainingSeconds = secondsOfDay - hour * og.jd.SECONDS_PER_HOUR;
    var minute = remainingSeconds * og.jd.ONE_BY_SECONDS_PER_MINUTE | 0;
    remainingSeconds = remainingSeconds - minute * og.jd.SECONDS_PER_MINUTE;
    var second = remainingSeconds | 0;
    var millisecond = (remainingSeconds - second) * og.jd.MILLISECONDS_PER_SECOND | 0;

    hour += 12;
    if (hour > 23) {
        hour -= 24;
    }

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
};

og.jd.TAItoDate = function (tai) {

    var utc = og.jd.TAItoUTC(tai);
    if (!utc) {
        utc = og.jd.TAItoUTC(og.jd.addSeconds(tai, -1));
        alert("cant conv utc")
    }

    return og.jd.UTCtoDate(utc);
};

og.jd.TAItoUTC = function (tai) {
    var leapSeconds = og.jd.leapSecondsTable;
    var index = og.utils.binarySearch(leapSeconds, tai, function (a, b) {
        return a - b.jd;
    });

    if (index < 0) {
        index = ~index;
    }

    if (index >= leapSeconds.length) {
        return tai - leapSeconds[index - 1].leapSeconds * og.jd.ONE_BY_SECONDS_PER_DAY;
    }

    if (index === 0) {
        return tai - leapSeconds[0].leapSeconds * og.jd.ONE_BY_SECONDS_PER_DAY;
    }

    var diff = (leapSeconds[index].jd - tai) * og.jd.SECONDS_PER_DAY;

    if (diff === 0) {
        return tai - leapSeconds[index].leapSeconds * og.jd.ONE_BY_SECONDS_PER_DAY;
    }

    if (diff <= 1.0) {
        return null;
    }

    return tai - leapSeconds[index - 1].leapSeconds * og.jd.ONE_BY_SECONDS_PER_DAY;
};

og.jd.addMilliseconds = function (jd, milliseconds) {
    return jd + milliseconds * og.jd.ONE_BY_MILLISECONDS_PER_DAY;
};

og.jd.addSeconds = function (jd, seconds) {
    return jd + seconds * og.jd.ONE_BY_SECONDS_PER_DAY;
};

og.jd.addHours = function (jd, hours) {
    return jd + hours * og.jd.ONE_BY_HOURS_PER_DAY;
};

og.jd.addMinutes = function (jd, minutes) {
    return jd + minutes * og.jd.MINUTES_PER_DAY;
};

og.jd.addDays = function (jd, days) {
    return jd + days;
};

og.jd.getMilliseconds = function (jd) {
    var s = jd - (jd | 0);
    s *= og.jd.SECONDS_PER_DAY;
    return (s - (s | 0)) * og.jd.MILLISECONDS_PER_SECOND | 0;
};

og.jd.getSeconds = function (jd) {
    var s = jd - (jd | 0);
    return s * og.jd.SECONDS_PER_DAY;
};

og.jd.getHours = function (jd) {
    var julianDayNumber = jd | 0;
    var secondsOfDay = (jd - julianDayNumber) * og.jd.SECONDS_PER_DAY;

    var hour = secondsOfDay * og.jd.ONE_BY_SECONDS_PER_HOUR | 0;
    var remainingSeconds = secondsOfDay - hour * og.jd.SECONDS_PER_HOUR;
    var minute = remainingSeconds * og.jd.ONE_BY_SECONDS_PER_MINUTE | 0;
    remainingSeconds = remainingSeconds - minute * og.jd.SECONDS_PER_MINUTE;
    var second = remainingSeconds | 0;
    var millisecond = (remainingSeconds - second) * og.jd.MILLISECONDS_PER_SECOND | 0;

    hour += 12 + minute / 60 + second / 3600 + millisecond / 1000;
    if (hour > 23) {
        hour -= 24;
    }

    return hour;
};

og.jd.getMinutes = function (jd) {
    var s = jd - (jd | 0);
    return s * og.jd.MINUTES_PER_DAY | 0;
};

og.jd.getDays = function (jd) {
    return jd | 0;
};

og.jd.secondsToDays = function (s) {
    return s * og.jd.ONE_BY_SECONDS_PER_DAY;
};

og.jd.daysToSeconds = function (d) {
    return d * og.jd.SECONDS_PER_DAY;
};

og.jd.__ls = function (jd, leapSeconds) {
    return {
        "jd": jd,
        "leapSeconds": leapSeconds
    };
};

og.jd.leapSecondsTable = [
  og.jd.__ls(2441317.5, 10.0),  // 1972-01-01T00:00:00.000Z
  og.jd.__ls(2441499.5, 11.0),  // 1972-07-01T00:00:00.000Z
  og.jd.__ls(2441683.5, 12.0),  // 1973-01-01T00:00:00.000Z
  og.jd.__ls(2442048.5, 13.0),  // 1974-01-01T00:00:00.000Z
  og.jd.__ls(2442413.5, 14.0),  // 1975-01-01T00:00:00.000Z
  og.jd.__ls(2442778.5, 15.0),  // 1976-01-01T00:00:00.000Z
  og.jd.__ls(2443144.5, 16.0),  // 1977-01-01T00:00:00.000Z
  og.jd.__ls(2443509.5, 17.0),  // 1978-01-01T00:00:00.000Z
  og.jd.__ls(2443874.5, 18.0),  // 1979-01-01T00:00:00.000Z
  og.jd.__ls(2444239.5, 19.0),  // 1980-01-01T00:00:00.000Z
  og.jd.__ls(2444786.5, 20.0),  // 1981-07-01T00:00:00.000Z
  og.jd.__ls(2445151.5, 21.0),  // 1982-07-01T00:00:00.000Z
  og.jd.__ls(2445516.5, 22.0),  // 1983-01-01T00:00:00.000Z
  og.jd.__ls(2446247.5, 23.0),  // 1985-07-01T00:00:00.000Z
  og.jd.__ls(2447161.5, 24.0),  // 1988-01-01T00:00:00.000Z
  og.jd.__ls(2447892.5, 25.0),  // 1990-01-01T00:00:00.000Z
  og.jd.__ls(2448257.5, 26.0),  // 1991-01-01T00:00:00.000Z
  og.jd.__ls(2448804.5, 27.0),  // 1992-07-01T00:00:00.000Z
  og.jd.__ls(2449169.5, 28.0),  // 1993-07-01T00:00:00.000Z
  og.jd.__ls(2449534.5, 29.0),  // 1994-07-01T00:00:00.000Z
  og.jd.__ls(2450083.5, 30.0),  // 1996-01-01T00:00:00.000Z
  og.jd.__ls(2450630.5, 31.0),  // 1997-07-01T00:00:00.000Z
  og.jd.__ls(2451179.5, 32.0),  // 1999-01-01T00:00:00.000Z
  og.jd.__ls(2453736.5, 33.0),  // 2006-01-01T00:00:00.000Z
  og.jd.__ls(2454832.5, 34.0),  // 2009-01-01T00:00:00.000Z
  og.jd.__ls(2456109.5, 35.0),  // 2012-07-01T00:00:00.000Z
  og.jd.__ls(2457204.5, 36.0)   // 2015-07-01T00:00:00.000Z
];

og.jd.J2000TAI = og.jd.UTCtoTAI(og.jd.J2000);
