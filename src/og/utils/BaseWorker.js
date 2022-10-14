export class BaseWorker {
    constructor(numWorkers = 2, program) {
        this._id = 0;
        this._pendingQueue = [];
        this._numWorkers = numWorkers;
        this._workerQueue = [];
        if (program) this.setProgram(program);
    }

    make() {
    }

    check() {
        if (this._pendingQueue && this._pendingQueue.length) {
            this.make(this._pendingQueue.pop());
        }
    }

    _onMessage(e) {
        this._workerQueue && this._workerQueue.unshift(e.target);
    }

    setProgram(program) {
        var elevationProgramm = new Blob([program], { type: "application/javascript" });

        for (let i = 0; i < this._numWorkers; i++) {
            let w = new Worker(URL.createObjectURL(elevationProgramm));
            this._onMessage = this._onMessage.bind(this);
            w.onmessage = this._onMessage

            this._workerQueue.push(w);
        }

        elevationProgramm = undefined;
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