export default class MockWorker {
    constructor() {
        this.postMessage = jest.fn();
        this.terminate = jest.fn();
        this.addEventListener = jest.fn();
        this.removeEventListener = jest.fn();
        this.onmessage = null;
        this.onerror = null;
    }
}