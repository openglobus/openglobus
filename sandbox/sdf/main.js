goog.require('og.webgl.Handler');
goog.require('og.Renderer');
goog.require('og.control.SimpleNavigation');
goog.require('og.control.ShowFps');
goog.require('og.shaderProgram');
goog.require('og.scene.Axes');
goog.require('my.SDF');
goog.require('og.math.Vector3');

function start() {

    og.webgl.MAX_FRAME_DELAY = 15;

    context = new og.webgl.Handler("canvas", { alpha: false });
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    s = new my.SDF("SDF");
    renderer.addRenderNode(s);

    renderer.addControls([
        new og.control.ShowFps({ autoActivate: true })
    ]);

    renderer.start();
};