goog.require('og');
goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.scene.Axes');
goog.require('MBuff');
goog.require('og.math.Vector3');

function start() {

    var axesShader = new og.shaderProgram.ShaderProgram("flat", {
        uniforms: {
            projectionViewMatrix: { type: og.shaderProgram.types.MAT4 }
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
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.scene.Axes(10000);

    buffScene = new MBuff();
    renderer.addRenderNode(buffScene);
    renderer.addRenderNode(axes);

    renderer.addControls([
        new og.control.SimpleNavigation({ autoActivate: true }),
    ]);

    renderer.activeCamera.eye.set(1277.0050415860476, 2307.7441933678265, 4553.429889299481);
    renderer.activeCamera.refresh();

    renderer.start();
};