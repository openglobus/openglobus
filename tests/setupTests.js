import { Worker } from "./worker";


window.Worker = Worker;


global.URL.createObjectURL = vi.fn(() => "");

const mockCanvas2DContext = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setTransform: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    measureText: () => ({ width: 0 }),
    createImageData: (width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
    }),
    getImageData: (_x, _y, width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
    }),
    putImageData: () => {}
};

if (typeof HTMLCanvasElement !== "undefined") {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        writable: true,
        value: (contextType) => {
            return contextType === "2d" ? mockCanvas2DContext : null;
        }
    });

    Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
        configurable: true,
        writable: true,
        value: () => "data:image/png;base64,"
    });
}
