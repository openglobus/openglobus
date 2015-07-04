goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.shaderProgram');
goog.require('og.node.Axes');
goog.require('my.Billboard');
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

    context = new og.webgl.Handler("canvas");
    context.addShaderProgram(flatShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.node.Axes(10000);

    bb = new my.Billboard("Billboard");
    renderer.addRenderNode(axes);
    renderer.addRenderNode(bb);

    renderer.addControls([
        new og.control.SimpleNavigation({ autoActivate: true }),
    ]);

    renderer.start();

    renderer.activeCamera.eye.x = 1114.1424013103258;
    renderer.activeCamera.eye.y = 2086.749969128237;
    renderer.activeCamera.eye.z = 8824.474084480114;
    renderer.activeCamera.refresh();
};