og.shaderProgram.SHADERS_URL = "../../src/og/shaders/";

function main() {

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

    var context = new og.webgl.Handler("canvas", { alpha: false });
    context.addShaderProgram(flatShader);
    context.init();

    renderer = new og.Renderer(context);
    renderer.init();

    var axes = new og.scene.Axes(10000);

    scene = new MyScene("Labels");
    renderer.addRenderNode(axes);
    renderer.addRenderNode(scene);

    renderer.addControls([
        new og.control.SimpleNavigation({ autoActivate: true }),
        new og.control.ShowFps({ autoActivate: true })
    ]);

    renderer.start();

    renderer.activeCamera.eye.x = 1114.1424013103258;
    renderer.activeCamera.eye.y = 2086.749969128237;
    renderer.activeCamera.eye.z = 8824.474084480114;
    renderer.activeCamera.refresh();
};



MyScene = function (name) {
    og.inheritance.base(this, name);
    this.texture = null;
};

og.inheritance.extend(MyScene, og.scene.RenderNode);

MyScene.prototype.initialization = function () {

    ec = new og.EntityCollection();

    ec.addTo(this);

    lbl = new og.Label();
    lbl.setText("Hello World! mmmmmmmmli");
    lbl.setSize(25);
    lbl.setColor4v(new og.math.Vector4(0, 0, 0, 1));
    lbl.setOutlineColor4v(new og.math.Vector4(1, 1, 1, 1));
    lbl.setFace("Verdana");

    eee = new og.Entity();
    eee.setPosition3v(new og.math.Vector3(0, 0, 0));
    eee.setLabel(lbl);
    eee.addTo(ec); 

    document.getElementById('size1').oninput = function () {
        lbl.setSize(this.value);
    };
    document.getElementById('buffer1').oninput = function () {
        lbl.setOutline(this.value);
    };
    document.getElementById('rotation1').oninput = function () {
        lbl.setRotation(this.value * Math.PI / 180.0);
    };
    document.getElementById('text1').oninput = function () {
        lbl.setText(this.value);
    };


};

MyScene.prototype.frame = function () {

};