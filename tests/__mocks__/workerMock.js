export default class MockWorker {
    constructor() {
        this.postMessage = vi.fn();
        this.terminate = vi.fn();
        this.addEventListener = vi.fn();
        this.removeEventListener = vi.fn();
        this.onmessage = null;
        this.onerror = null;
    }
}