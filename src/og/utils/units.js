'use strict';

export const ELL = 0;
export const MSL = 1;
export const GND = 2;

export const heightMode = {
    "ell": ELL,
    "msl": MSL,
    "gnd": GND
};

const KM_to_M = 1000.0;
const M_to_KM = 1.0 / KM_to_M;
const FT_to_M = 0.3048;
const M_to_FT = 1.0 / FT_to_M;
const MS_to_KMH = 3.6;
const KMH_to_MS = 1.0 / MS_to_KMH;
const MS_to_FTS = 3.28084;
const FT_to_KM = FT_to_M * M_to_KM;
const KM_to_FT = 1.0 / FT_to_KM;

export const m = 0;
export const km = 1;
export const ft = 2;
export const s = 3;
export const h = 4;
export const ms = 5;
export const kmh = 6;
export const fts = 7;

const DEFAULT_NAN = "--";

const _abbr = ["m", "km", "ft", "s", "h", "m/s", "km/h", "ft/s"];

export const _tenth = [0, 2, 0, 0, 0, 0, 0, 0];

let _convFn = [];

_convFn[m] = [];
_convFn[m][m] = (v) => v;
_convFn[m][km] = (v) => v * M_to_KM;
_convFn[m][ft] = (v) => v * M_to_FT;

_convFn[ft] = [];
_convFn[ft][m] = (v) => v * FT_to_M;
_convFn[ft][km] = (v) => v * FT_to_KM;
_convFn[ft][ft] = (v) => v;

_convFn[km] = [];
_convFn[km][m] = (v) => v * KM_to_M;
_convFn[km][km] = (v) => v;
_convFn[km][ft] = (v) => v * KM_to_FT;

_convFn[ms] = [];
_convFn[ms][ms] = (v) => v;
_convFn[ms][kmh] = (v) => v * MS_to_KMH;
_convFn[ms][fts] = (v) => v * MS_to_FTS;

_convFn[kmh] = [];
_convFn[kmh][ms] = (v) => v * KMH_to_MS;
_convFn[kmh][kmh] = (v) => v;
//_convFn[kmh][fts] = (v) => v * KMH_to_FTS;

export function convert(from, to, val) {
    return _convFn[from][to](val);
}

export function convertExt(isNotNaN, unitFrom, unitTo, val, fixed) {
    if (isNotNaN) {
        return convert(unitFrom, unitTo, val).toFixed(fixed || _tenth[unitTo]);
    }
    return DEFAULT_NAN;
}

export function toString(u) {
    return _abbr[u];
}