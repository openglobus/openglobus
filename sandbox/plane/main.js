goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.KeyboardNavigation');
goog.require('og.shaderProgram');
goog.require('og.node.Axes');
goog.require('my.Plane');
goog.require('og.math.Vector3');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    var flatShader = new og.shaderProgram.ShaderProgram("flat", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 }
        },
        attributes: {
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexColor: { type: og.shaderProgram.types.VEC4, enableArray: true }
        },
        vertexShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_vs.txt"),
        fragmentShader: og.utils.readTextFile(og.shaderProgram.SHADERS_URL + "flat_fs.txt")
    });

    var colorShader = new og.shaderProgram.ShaderProgram("colorShader", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uColor: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            vertices: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: "attribute vec3 vertices; \
                    uniform mat4 uPMVMatrix; \
                    void main(void) { \
                        gl_Position = uPMVMatrix * vec4(vertices, 1.0); \
                    }",
        fragmentShader: "precision mediump float; \
                    uniform vec4 uColor; \
                    void main(void) { \
                        gl_FragColor = uColor; \
                    }"
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(flatShader);
    context.addShaderProgram(colorShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.node.Axes(10000);

    renderer.addRenderNode(axes);
    renderer.addRenderNode(new my.Plane("Plane"));

    renderer.addControls([
        new og.control.KeyboardNavigation({ autoActivate: true }),
    ]);

    renderer.start();

    renderer.activeCamera.eye.x = 1114.1424013103258;
    renderer.activeCamera.eye.y = 2086.749969128237;
    renderer.activeCamera.eye.z = 8824.474084480114;
    renderer.activeCamera.refresh();
};