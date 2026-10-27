import bundledProj4 from "proj4";

function current(): any {
    const pageProj4 = (globalThis as any).proj4;
    return typeof pageProj4 === "function" ? pageProj4 : bundledProj4;
}

export const proj4: any = new Proxy(bundledProj4, {
    apply: (_target, _thisArg, args: any[]) => current()(...args),
    get: (_target, prop) => {
        const instance = current();
        const value = instance[prop];
        // Keep a method bound to the instance it was taken from
        return typeof value === "function" ? value.bind(instance) : value;
    }
});
