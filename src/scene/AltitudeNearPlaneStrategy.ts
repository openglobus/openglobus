import type { Camera } from "../camera/Camera";

export interface INearPlaneStrategy {
    applyNear(camera: Camera): void;
}

export interface IAltitudeNearPlaneRule {
    maxAltitude: number;
    near: number;
}

export interface IAltitudeNearPlaneStrategyParams {
    rules?: IAltitudeNearPlaneRule[];
}

const DEFAULT_RULES: IAltitudeNearPlaneRule[] = [
    { maxAltitude: 100, near: 0.1 },
    { maxAltitude: 1000, near: 1.0 },
    { maxAltitude: 10000, near: 50.0 },
    { maxAltitude: 100000, near: 100.0 },
    { maxAltitude: Number.POSITIVE_INFINITY, near: 1500.0 }
];

export class AltitudeNearPlaneStrategy implements INearPlaneStrategy {
    protected readonly _rules: IAltitudeNearPlaneRule[];

    constructor(params: IAltitudeNearPlaneStrategyParams = {}) {
        this._rules = (params.rules || DEFAULT_RULES).slice().sort((a, b) => a.maxAltitude - b.maxAltitude);
    }

    public applyNear(camera: Camera): void {
        if (camera.frustums.length !== 1) {
            return;
        }

        const firstFrustum = camera.frustums[0];
        const altitude = Math.max(0.0, camera.getAltitude());
        const targetNear = this._resolveNear(altitude);

        if (firstFrustum.near === targetNear) {
            return;
        }

        camera.setNearFar(targetNear);
    }

    protected _resolveNear(altitude: number): number {
        for (let i = 0; i < this._rules.length; i++) {
            if (altitude <= this._rules[i].maxAltitude) {
                return this._rules[i].near;
            }
        }

        return this._rules[this._rules.length - 1].near;
    }
}
