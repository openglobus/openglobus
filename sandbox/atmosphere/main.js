goog.require('og');
goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.shaderProgram.shape_wl');
goog.require('og.shaderProgram.shape_nl');
goog.require('og.scene.Axes');
goog.require('Atmosphere');
goog.require('og.math.Vector3');

function start() {

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
    context.addShaderProgram(og.shaderProgram.shape_wl());
    context.addShaderProgram(og.shaderProgram.shape_nl());
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.scene.Axes(10000);

    atmosphere = new Atmosphere();
    renderer.addRenderNode(axes);
    renderer.addRenderNode(atmosphere);

    renderer.addControls([
        new og.control.SimpleNavigation({ autoActivate: true }),
    ]);

    renderer.activeCamera.eye.set(50.0050415860476, 100.7441933678265, 200.429889299481);
    renderer.activeCamera.refresh();

    renderer.start();
};