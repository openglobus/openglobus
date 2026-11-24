import { Loader } from "../../src/utils/Loader";

const flush = async () => {
    for (let i = 0; i < 4; i++) {
        await Promise.resolve();
    }
};

afterEach(() => {
    vi.unstubAllGlobals();
});

const RESPONSES = {
    "./ok": () => Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }),
    "./missing": () => Promise.resolve({ ok: false, status: 404 }),
    "./busy": () => Promise.resolve({ ok: false, status: 503 }),
    "./offline": () => Promise.reject(new TypeError("Failed to fetch"))
};

test("the error of a request the server answered has its HTTP status, a failed request has none", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn((src) => RESPONSES[src]())
    );

    const loader = new Loader(),
        loaded = {};

    for (const src of Object.keys(RESPONSES)) {
        loader.load({ src, type: "arrayBuffer" }, (response) => (loaded[src] = response));
    }
    await flush();
    await flush();

    expect(loaded["./ok"].status).toBe("ready");
    expect(loaded["./missing"]).toMatchObject({ status: "error", statusCode: 404 });
    expect(loaded["./busy"]).toMatchObject({ status: "error", statusCode: 503 });
    expect(loaded["./offline"].status).toBe("error");
    expect(loaded["./offline"].statusCode).toBe(undefined);

    expect(await loader.fetch({ src: "./missing" })).toMatchObject({ status: "error", statusCode: 404 });
    expect((await loader.fetch({ src: "./offline" })).statusCode).toBe(undefined);
});
