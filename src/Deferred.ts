export class Deferred<T> {
    resolve: ((value: T | PromiseLike<T>) => void);
    reject: ((reason?: any) => void);
    promise: Promise<T>;

    constructor() {
        this.resolve = () => {
        };
        this.reject = () => {
        };
        this.promise = new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        Object.freeze(this);
    }
}