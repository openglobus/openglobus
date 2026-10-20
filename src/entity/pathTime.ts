export const PATH_TIME_SPLIT = 1048576;

// Integer time as [high, low] parts, so shaders compare any two times exactly in int32.
export function splitPathTime(time: number): [number, number] {
    const t = Math.round(time);
    const high = Math.floor(t / PATH_TIME_SPLIT);
    return [high, t - high * PATH_TIME_SPLIT];
}
