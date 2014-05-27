goog.require('og');
goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.KeyboardNavigation');
goog.require('og.shaderProgram');
goog.require('og.node.Axes');
goog.require('my.Sphere');
goog.require('og.math.Vector3');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    var axesShader = new og.shaderProgram.ShaderProgram("flat", {
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

    var sphereShader = new og.shaderProgram.ShaderProgram("sphere", {
        uniforms: {
            uPMVMatrix: { type: og.shaderProgram.types.MAT4 },
            uColor: { type: og.shaderProgram.types.VEC4 }
        },
        attributes: {
            aVertexNormal: { type: og.shaderProgram.types.VEC3, enableArray: true },
            aVertexPosition: { type: og.shaderProgram.types.VEC3, enableArray: true }
        },
        vertexShader: "attribute vec3 aVertexNormal; \
                       attribute vec3 aVertexPosition; \
                       uniform mat4 uPMVMatrix; \
                       void main(void) { \
                           vec4 x = vec4(aVertexNormal, 1.0); \
                           gl_Position = uPMVMatrix * vec4(aVertexPosition, 1.0); \
                       }",
        fragmentShader: "precision mediump float; \
                         uniform vec4 uColor; \
                         void main(void) { \
                             gl_FragColor = uColor; \
                         }"
    });

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(axesShader);
    context.addShaderProgram(sphereShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.node.Axes(10000);

    renderer.addRenderNode(new my.Sphere("Sphere", 500, 7, 7));
    renderer.addRenderNode(axes);

    renderer.addControls([
        new og.control.KeyboardNavigation({ autoActivate: true }),
    ]);

    renderer.activeCamera.eye.set(1277.0050415860476, 2307.7441933678265, 4553.429889299481);
    renderer.activeCamera.refresh();

    renderer.start();
};