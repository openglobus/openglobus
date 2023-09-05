export class BaseWorker<T> {
    protected _sourceId: number;
    protected _source: Map<number, T>;
    protected _pendingQueue: T[];
    protected _numWorkers: number;
    protected _workerQueue: Worker[];

    constructor(numWorkers: number = 2, program?: string) {
        this._sourceId = 0;
        this._source = new Map<number, T>();
        this._pendingQueue = [];
        this._numWorkers = numWorkers;
        this._workerQueue = [];
        if (program) {
            this.setProgram(program);
        }
    }

    public check() {
        if (this._pendingQueue.length) {
            this.make(this._pendingQueue.pop()!);
        }
    }

    public setProgram(program: string) {
        let p = new Blob([program], {type: "application/javascript"});
        for (let i = 0; i < this._numWorkers; i++) {
            let w = new Worker(URL.createObjectURL(p));
            w.onmessage = (e: MessageEvent) => {
                this._onMessage(e);
                this._workerQueue && this._workerQueue.unshift(e.target as Worker);
                this.check();
            }
            this._workerQueue.push(w);
        }
    }

    public make(data: T) {
    }

    protected _onMessage(e: MessageEvent) {

    }

    public destroy() {
        for (let i = 0; i < this._workerQueue.length; i++) {
            const w = this._workerQueue[i];
            w.onmessage = null;
            w.terminate();
        }
        //@ts-ignore
        this._pendingQueue = null;
        //@ts-ignore
        this._workerQueue = null;
    }

    public get pendingQueue(): T[] {
        return this._pendingQueue;
    }
}