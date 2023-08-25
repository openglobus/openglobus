export class BaseWorker {
    constructor(numWorkers = 2, program) {
        this._id = 0;
        this._pendingQueue = [];
        this._numWorkers = numWorkers;
        this._workerQueue = [];
        if (program) this.setProgram(program);
    }

    /**
     * @virtual
     */
    make() {
    }

    check() {
        if (this._pendingQueue && this._pendingQueue.length) {
            this.make(this._pendingQueue.pop());
        }
    }

    setProgram(program) {
        let elevationProgramm = new Blob([program], { type: "application/javascript" });

        for (let i = 0; i < this._numWorkers; i++) {
            let w = new Worker(URL.createObjectURL(elevationProgramm));
            w.onmessage = (e) => {
                this._onMessage(e);
                this._workerQueue && this._workerQueue.unshift(e.target);
                this.check();
            }
            this._workerQueue.push(w);
        }
    }

    destroy() {
        for (let i = 0; i < this._workerQueue.length; i++) {
            const w = this._workerQueue[i];
            w.onmessage = undefined;
            w.terminate();
        }
        this._pendingQueue = undefined;
        this._numWorkers = undefined;
        this._workerQueue = undefined;
    }
}