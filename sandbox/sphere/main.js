goog.require('og');
goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.KeyboardNavigation');
goog.require('og.shaderProgram.shape');
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

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(axesShader);
    context.addShaderProgram(og.shaderProgram.shape());
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.node.Axes(10000);

    mySphere = new my.Sphere();
    renderer.addRenderNode(mySphere);
    renderer.addRenderNode(axes);

    renderer.addControls([
        new og.control.KeyboardNavigation({ autoActivate: true }),
    ]);

    renderer.activeCamera.eye.set(1277.0050415860476, 2307.7441933678265, 4553.429889299481);
    renderer.activeCamera.refresh();

    renderer.start();
};