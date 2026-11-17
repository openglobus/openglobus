import { Handler } from "../../src/webgl/Handler";
import { ShaderProgram, variantBit, variantMask } from "../../src/webgl/ShaderProgram";
import { cons } from "../../src/cons";

/**
 * jsdom has no WebGL: the handler gets a fake context that records compiled sources, created,
 * used and deleted programs. Uniforms listed in `inactiveUniforms` have no location, as if the
 * driver optimized them out.
 */
function createGl({ inactiveUniforms = [] } = {}) {
    const log = { sources: [], programs: [], used: [], deleted: [] };
    let nextLocation = 0;
    const gl = Object.assign(Object.create(globalThis.WebGL2RenderingContext.prototype), {
        VERTEX_SHADER: 1,
        FRAGMENT_SHADER: 2,
        COMPILE_STATUS: 3,
        LINK_STATUS: 4,
        FLOAT: 5126,
        createProgram: () => {
            const program = { id: log.programs.length };
            log.programs.push(program);
            return program;
        },
        createShader: (type) => ({ type }),
        shaderSource: (shader, src) => log.sources.push(src),
        compileShader: () => {},
        getShaderParameter: () => true,
        getShaderInfoLog: () => "",
        attachShader: () => {},
        detachShader: () => {},
        deleteShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getProgramInfoLog: () => "",
        useProgram: (program) => log.used.push(program),
        deleteProgram: (program) => log.deleted.push(program),
        getAttribLocation: () => nextLocation++,
        getUniformLocation: (program, name) => (inactiveUniforms.includes(name) ? null : { program, name }),
        enableVertexAttribArray: () => {},
        disableVertexAttribArray: () => {},
        vertexAttribDivisor: () => {},
        drawElementsInstanced: () => {}
    });
    return { gl, log };
}

/**
 * A real Handler on the fake context. The handler activates the first program added to it, so a
 * plain program takes that place and later programs are added the way they are in the engine.
 */
function createHandler(glOptions) {
    const { gl, log } = createGl(glOptions);
    const handler = new Handler(undefined, { autoActivate: false });
    handler.gl = gl;
    handler._initialized = true;
    const first = handler.addProgram(createProgram("first"));
    return { handler, gl, log, first };
}

const VERTEX = "#version 300 es\nin vec3 aPosition;\nvoid main() {}\n";
const FRAGMENT = "#version 300 es\nprecision highp float;\nvoid main() {}\n";

function createProgram(name, defines, extra = {}) {
    return new ShaderProgram(name, {
        defines,
        uniforms: { color: "vec4", u_shadowMapCount: "int", ...extra.uniforms },
        attributes: { aPosition: "vec3", ...extra.attributes },
        vertexShader: extra.vertexShader ?? VERTEX,
        fragmentShader: extra.fragmentShader ?? FRAGMENT
    });
}

const A = variantBit("TEST_SWITCH_A");
const B = variantBit("TEST_SWITCH_B");
const C = variantBit("TEST_SWITCH_C");

const switches = () => ({ TEST_SWITCH_A: false, TEST_SWITCH_B: false, TEST_SWITCH_C: false });

let restoreWebGL2;
beforeAll(() => {
    if (!globalThis.WebGL2RenderingContext) {
        globalThis.WebGL2RenderingContext = class WebGL2RenderingContext {};
        restoreWebGL2 = () => delete globalThis.WebGL2RenderingContext;
    }
});
afterAll(() => restoreWebGL2?.());

describe("variantBit and variantMask", () => {
    test("a name keeps its bit, different names get different bits", () => {
        expect(variantBit("TEST_SWITCH_A")).toBe(A);
        expect(new Set([A, B, C]).size).toBe(3);
        for (const bit of [A, B, C]) {
            expect(bit & (bit - 1)).toBe(0);
        }
    });

    test("a mask has the bits of the switches that are true", () => {
        expect(variantMask({ TEST_SWITCH_A: true, TEST_SWITCH_B: false, TEST_SWITCH_C: true })).toBe(A | C);
        expect(variantMask({})).toBe(0);
    });
});

describe("ShaderProgram defines", () => {
    test("constants and switches that are on are defined right after #version", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(
            createProgram("defines", { TEST_SWITCH_A: true, TEST_SWITCH_B: false, MAX_ITEMS: 4, MODE: "LINEAR" })
        );
        log.sources.length = 0;
        program.activate();

        const fragment = log.sources.find((src) => src.includes("precision highp float"));
        expect(fragment.startsWith("#version 300 es\n#define WEBGL2\n#define TEST_SWITCH_A\n")).toBe(true);
        expect(fragment).toContain("#define MAX_ITEMS 4\n");
        expect(fragment).toContain("#define MODE LINEAR\n");
        expect(fragment).not.toContain("TEST_SWITCH_B");
    });

    test("a source without #version gets the defines on top and no WEBGL2", () => {
        const { handler, log } = createHandler();
        const fragmentShader = "precision highp float;\nvoid main() {}\n";
        handler.addProgram(createProgram("noVersion", { MAX_ITEMS: 2 }, { fragmentShader }));

        expect(log.sources).toContain(`#define MAX_ITEMS 2\n${fragmentShader}`);
    });

    test("a program without defines compiles the source as it is", () => {
        const { handler, log } = createHandler();
        handler.addProgram(createProgram("plain"));

        expect(log.sources.filter((src) => src.includes("precision highp float"))).toEqual([
            FRAGMENT.replace("#version 300 es\n", "#version 300 es\n#define WEBGL2\n"),
            FRAGMENT.replace("#version 300 es\n", "#version 300 es\n#define WEBGL2\n")
        ]);
    });
});

describe("ShaderProgram lazy compilation", () => {
    test("a program without switches compiles when it is added", () => {
        const { handler, log } = createHandler();
        const before = log.programs.length;
        handler.addProgram(createProgram("constantsOnly", { MAX_ITEMS: 4 }));
        expect(log.programs.length).toBe(before + 1);
    });

    test("a program with switches compiles on first use, once", () => {
        const { handler, log } = createHandler();
        const before = log.programs.length;
        const program = handler.addProgram(createProgram("lazy", switches()));
        expect(log.programs.length).toBe(before);

        expect(program.variant(0)).toBe(program);
        expect(log.programs.length).toBe(before + 1);

        program.variant(0);
        program.activate();
        expect(log.programs.length).toBe(before + 1);
    });

    test("activate() compiles a program nobody asked a variant of", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(createProgram("lazyActivate", switches()));
        const before = log.programs.length;

        program.activate();

        expect(log.programs.length).toBe(before + 1);
        expect(handler.activeProgram).toBe(program);
        expect(program.uniforms.color).toBeDefined();
    });

    test("compiling a variant gives the GL state back to the active program", () => {
        const { handler, log, first } = createHandler();
        const program = handler.addProgram(createProgram("restore", switches()));
        first.activate();

        const variant = program.variant(A);

        expect(variant).not.toBe(program);
        expect(handler.activeProgram).toBe(first);
        expect(log.used[log.used.length - 1]).toBe(first._p);
    });
});

describe("ShaderProgram.variant", () => {
    test("each combination is built and compiled once, then the same program is returned", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(createProgram("cache", switches()));
        const before = log.programs.length;

        const a = program.variant(A);
        expect(program.variant(A)).toBe(a);
        expect(log.programs.length).toBe(before + 1);

        const ab = program.variant(A | B);
        expect(ab).not.toBe(a);
        expect(program.variant(B | A)).toBe(ab);
        expect(log.programs.length).toBe(before + 2);
    });

    test("a variant has its switches resolved in the source", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(createProgram("sources", switches()));

        log.sources.length = 0;
        program.variant(A | C);

        expect(log.sources.length).toBe(2);
        for (const src of log.sources) {
            expect(src).toContain("#define TEST_SWITCH_A\n");
            expect(src).toContain("#define TEST_SWITCH_C\n");
            expect(src).not.toContain("TEST_SWITCH_B");
        }
    });

    test("switches the program doesn't declare are ignored", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(createProgram("partial", { TEST_SWITCH_B: false }));

        expect(program.variant(A)).toBe(program);
        expect(program.variant(A | B)).toBe(program.variant(B));

        const before = log.programs.length;
        program.variant(A | C);
        expect(log.programs.length).toBe(before);
    });

    test("the declared switch values are the program itself", () => {
        const { handler } = createHandler();
        const program = handler.addProgram(createProgram("declared", { TEST_SWITCH_A: true, TEST_SWITCH_B: false }));

        expect(program.variant(A)).toBe(program);
        expect(program.variant(0)).not.toBe(program);
    });

    test("switch values by name give the same program as the mask", () => {
        const { handler } = createHandler();
        const program = handler.addProgram(createProgram("byName", switches()));

        expect(program.variant({ TEST_SWITCH_A: true, TEST_SWITCH_B: false })).toBe(program.variant(A));
        expect(program.variant({ TEST_SWITCH_A: true, TEST_SWITCH_C: true, UNKNOWN_SWITCH: true })).toBe(
            program.variant(A | C)
        );
        expect(program.variant({})).toBe(program);
    });

    test("asking a variant for a variant goes through the program", () => {
        const { handler } = createHandler();
        const program = handler.addProgram(createProgram("nested", switches()));
        const a = program.variant(A);

        expect(a.variant(0)).toBe(program);
        expect(a.variant(A)).toBe(a);
        expect(a.variant(B)).toBe(program.variant(B));
    });

    test("variants asked for before the program is added compile once it is", () => {
        const { handler, log } = createHandler();
        const program = createProgram("detached", switches());
        const a = program.variant(A);
        const before = log.programs.length;

        handler.addProgram(program);
        a.activate();

        expect(log.programs.length).toBe(before + 1);
        expect(handler.activeProgram).toBe(a);
    });

    test("variants share the material, not its declarations", () => {
        const { handler } = createHandler();
        const material = {
            defines: switches(),
            uniforms: { color: "vec4", scale: { type: "float" } },
            attributes: { aPosition: "vec3", aOffset: { type: "vec3", divisor: 1 } },
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT
        };
        const program = handler.addProgram(new ShaderProgram("shared", material));

        program.variant(0);
        const a = program.variant(A);

        expect(a.attributes.aOffset).toBeDefined();
        expect(material.attributes.aOffset).toEqual({ type: "vec3", divisor: 1 });
        expect(material.uniforms.scale).toEqual({ type: "float" });
    });
});

describe("ShaderProgram variants lifetime", () => {
    test("variants are not in the handler's programs and are removed with the program", () => {
        const { handler, log } = createHandler();
        const program = handler.addProgram(createProgram("owned", switches()));
        const compiled = [program.variant(0), program.variant(A), program.variant(A | B)].map((p) => p._p);

        expect(Object.keys(handler.programs).sort()).toEqual(["first", "owned"]);

        handler.removeProgram("owned");

        expect(handler.programs.owned).toBeUndefined();
        for (const p of compiled) {
            expect(log.deleted).toContain(p);
        }
    });

    test("removing the program clears the handler's active program when a variant is active", () => {
        const { handler } = createHandler();
        const program = handler.addProgram(createProgram("activeVariant", switches()));
        const a = program.variant(A);
        a.activate();
        expect(handler.activeProgram).toBe(a);

        program.remove();

        expect(handler.activeProgram).toBeNull();
    });

    test("a program added again after removal builds its variants anew", () => {
        const { handler } = createHandler();
        const program = handler.addProgram(createProgram("again", switches()));
        const a = program.variant(A);
        program.remove();

        const next = handler.addProgram(createProgram("again", switches()));
        expect(next.variant(A)).not.toBe(a);
    });
});

describe("ShaderProgram inactive uniforms", () => {
    test("don't warn for a program with switches, still warn for others", () => {
        const warn = vi.spyOn(cons, "logWrn").mockImplementation(() => {});
        try {
            const { handler } = createHandler({ inactiveUniforms: ["u_shadowMapCount"] });
            warn.mockClear();

            handler.addProgram(createProgram("switched", switches())).variant(A);
            expect(warn).not.toHaveBeenCalled();

            handler.addProgram(createProgram("unswitched"));
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain("u_shadowMapCount");
        } finally {
            warn.mockRestore();
        }
    });
});
