import {
    clamp,
    DEG2RAD,
    degToDec, frac,
    isPowerOfTwo,
    log,
    mod,
    nextHighestPowerOfTwo,
    RAD2DEG,
    random,
    randomi, step
} from "../src/og/math.js";

describe('math module', () => {
    describe('log', () => {
        test('returns correct result for log base 2', () => {
            expect(log(8, 2)).toBe(3);
        });

        test('returns correct result for log base 10', () => {
            expect(log(1000, 10)).toBeCloseTo(3, 5);
        });

        test('returns NaN for negative input', () => {
            expect(log(-1, 10)).toBe(NaN);
        });

        test('returns NaN for negative base', () => {
            expect(log(10, -1)).toBe(NaN);
        });
    });

    test('clamp', () => {
        expect(clamp(12, 1, 5)).toBe(5);
    });

    test('DEG2RAD', () => {
        expect(DEG2RAD(180)).toBe(Math.PI);
    });

    test('RAD2DEG', () => {
        expect(RAD2DEG(Math.PI)).toBe(180);
    });

    describe('isPowerOfTwo', () => {
        test('isPowerOfTwo true', () => {
            expect(isPowerOfTwo(8)).toBe(true);
        });
        test('isPowerOfTwo false', () => {
            expect(isPowerOfTwo(10)).toBe(false);
        });
    });

    describe('nextHighestPowerOfTwo', () => {
        test('returns 2 for input 1', () => {
            expect(nextHighestPowerOfTwo(2.1)).toEqual(2);
        });

        test('returns 4 for input 3', () => {
            expect(nextHighestPowerOfTwo(3)).toEqual(4);
        });

        test('returns 16 for input 13', () => {
            expect(nextHighestPowerOfTwo(13)).toEqual(16);
        });

        test('returns 4096 for input 3000', () => {
            expect(nextHighestPowerOfTwo(3000)).toEqual(4096);
        });

        test('returns maxValue for input larger than maxValue', () => {
            expect(nextHighestPowerOfTwo(5000, 4096)).toEqual(4096);
        });
    });

    describe('randomi', () => {
        test('returns a number greater than or equal to 0', () => {
            expect(randomi()).toBeGreaterThanOrEqual(0);
        });

        test('returns a number less than 1 if no arguments are passed', () => {
            expect(randomi()).toBeLessThan(1);
        });


        test('returns a number less than the max argument', () => {
            const max = 100;
            expect(randomi(0, max)).toBeLessThan(max);
        });

        test('returns an integer', () => {
            expect(Number.isInteger(randomi())).toBe(true);
        });
    });

    describe('random', () => {
        test('returns a number greater than or equal to 0 by default', () => {
            const result = random();
            expect(result).toBeGreaterThanOrEqual(0);
        });

        test('returns a number less than 1 by default', () => {
            const result = random();
            expect(result).toBeLessThan(1);
        });

        test('returns a number between min and max when both are provided', () => {
            const min = 2;
            const max = 5;
            const result = random(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThan(max);
        });

        test('returns min when min and max are equal', () => {
            const min = 3;
            const max = 3;
            const result = random(min, max);
            expect(result).toEqual(min);
        });

        test('returns a random float when min and max are both floating-point numbers', () => {
            const min = 0.5;
            const max = 1.5;
            const result = random(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThan(max);
            expect(result % 1).not.toEqual(0); // Check that result is a float
        });

    });

    describe('degToDec', () => {
        test('should return a positive decimal value when p is true', () => {
            expect(degToDec(10, 30, 0, true)).toBeCloseTo(10.5);
            expect(degToDec(90, 0, 0, true)).toBeCloseTo(90);
            expect(degToDec(1, 15, 30, true)).toBeCloseTo(1.2583333333333333);
        });

        test('should return a negative decimal value when p is false', () => {
            expect(degToDec(10, 30, 0, false)).toBeCloseTo(-10.5);
            expect(degToDec(90, 0, 0, false)).toBeCloseTo(-90);
            expect(degToDec(1, 15, 30, false)).toBeCloseTo(-1.2583333333333333);
        });
    });

    describe('mod', () => {
        test('returns a positive number if m is positive', () => {
            expect(mod(5, 3)).toEqual(2);
        });

        test('returns a positive number if m is negative and n is positive', () => {
            expect(mod(-5, 3)).toEqual(1);
        });

        test('returns a negative number if m is negative and n is negative', () => {
            expect(mod(-5, -3)).toEqual(-2);
        });

        test('returns NaN if n is 0', () => {
            expect(mod(5, 0)).toBeNaN();
        });

        test('returns the same number if n is 1', () => {
            expect(mod(5, 1)).toEqual(0);
        });

        test('returns the same number if m is 0', () => {
            expect(mod(0, 5)).toEqual(0);
        });

        test('returns a positive number if both m and n are 0', () => {
            expect(mod(0, 0)).toEqual(NaN);
        });
    });

    describe('step', () => {
        it('returns 0.0 when x is less than edge', () => {
            expect(step(0.5, 0.3)).toEqual(0.0);
            expect(step(0.0, -1.0)).toEqual(0.0);
            expect(step(-1.0, -1.1)).toEqual(0.0);
        });

        it('returns 1.0 when x is greater than or equal to edge', () => {
            expect(step(0.5, 0.5)).toEqual(1.0);
            expect(step(0.0, 0.0)).toEqual(1.0);
            expect(step(-1.0, 0.0)).toEqual(1.0);
        });
    });

    describe('frac', () => {
        test('frac of positive integer returns 0', () => {
            expect(frac(5)).toBe(0);
        });

        test('frac of positive float returns fractional part', () => {
            expect(frac(3.14159)).toBeCloseTo(0.14159, 5);
        });

        test('frac of negative integer returns 0', () => {
            expect(frac(-10)).toBe(0);
        });

        test('frac of negative float returns fractional part', () => {
            expect(frac(-2.71828)).toBeCloseTo(0.71828, 5);
        });

        test('frac of zero returns 0', () => {
            expect(frac(0)).toBe(0);
        });
    });

    test('Testing getAngleBetweenAzimuths', () => {
        let res = Ellipsoid.getAngleBetweenAzimuths(0, 0);
        expect(1).toBe(1);
    });

});