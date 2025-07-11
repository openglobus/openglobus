export type EasingFunction = (t: number) => number;

export class Easing {
    static Linear: EasingFunction = (t: number) => t;
    static QuadIn: EasingFunction = (t: number) => t * t;
    static QuadOut: EasingFunction = (t: number) => 1 - (1 - t) * (1 - t);
    static QuadInOut: EasingFunction = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    static CubicIn: EasingFunction = (t: number) => t * t * t;
    static CubicOut: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 3);
    static CubicInOut: EasingFunction = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    static QuartIn: EasingFunction = (t: number) => t * t * t * t;
    static QuartOut: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 4);
    static QuartInOut: EasingFunction = (t: number) =>
        t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    static QuintIn: EasingFunction = (t: number) => t * t * t * t * t;
    static QuintOut: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 5);
    static QuintInOut: EasingFunction = (t: number) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
    static SineIn: EasingFunction = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
    static SineOut: EasingFunction = (t: number) => Math.sin((t * Math.PI) / 2);
    static SineInOut: EasingFunction = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    static ExpoIn: EasingFunction = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
    static ExpoOut: EasingFunction = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    static ExpoInOut: EasingFunction = (t: number) => {
        return t === 0
            ? 0
            : t === 1
            ? 1
            : t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    };
    static CircIn: EasingFunction = (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2));
    static CircOut: EasingFunction = (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2));
    static CircInOut: EasingFunction = (t: number) => {
        return t < 0.5
            ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
            : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    };
    static BackIn: EasingFunction = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    };
    static BackOut: EasingFunction = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    static BackInOut: EasingFunction = (t: number) => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;

        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    };
    static ElasticIn: EasingFunction = (t: number) => {
        const c4 = (2 * Math.PI) / 3;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    };
    static ElasticOut: EasingFunction = (t: number) => {
        const c4 = (2 * Math.PI) / 3;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };
    static ElasticInOut: EasingFunction = (t: number) => {
        const c5 = (2 * Math.PI) / 4.5;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    };
    static BounceOut: EasingFunction = (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    };
    static BounceIn: EasingFunction = (t: number) => 1 - Easing.BounceOut(1 - t);
    static BounceInOut: EasingFunction = (t: number) =>
        t < 0.5 ? (1 - Easing.BounceOut(1 - t * 2)) * 0.5 : (Easing.BounceOut(t * 2 - 1) + 1) * 0.5;
}
