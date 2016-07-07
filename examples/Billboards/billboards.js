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

    var billboards = [];

    for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 10; j++) {

            var blb = new og.Billboard();

            if (!billboards[i])
                billboards[i] = [];

            blb.setSize(35, 35);
            blb.setSrc("ship.png");

            var eee = new og.Entity();
            eee.setPosition3v(new og.math.Vector3(j * 200, 0, i * 200));
            eee.setBillboard(blb);
            eee.addTo(ec);

            billboards[i][j] = eee;
        }
    }

    document.getElementById("inp").oninput = function () {
        var v = parseInt(this.value);

        if (v > billboards.length) {
            billboards[v - 1] = [];
            for (var l = 0; l < v; l++) {
                if (!billboards[l][v - 1]) {
                    var blbl = new og.Billboard();
                    blbl.setSize(35, 35);
                    blbl.setSrc("ship.png");
                    var eeel = new og.Entity();
                    eeel.setPosition3v(new og.math.Vector3((v - 1) * 200, 0, l * 200));
                    eeel.setBillboard(blbl);
                    eeel.addTo(ec);
                    billboards[l][v - 1] = eeel;
                }

                if (!billboards[v - 1][l]) {
                    var blbv = new og.Billboard();
                    blbv.setSize(35, 35);
                    blbv.setSrc("ship.png");
                    var eeev = new og.Entity();
                    eeev.setPosition3v(new og.math.Vector3(l * 200, 0, (v - 1) * 200));
                    eeev.setBillboard(blbv);
                    eeev.addTo(ec);

                    billboards[v - 1][l] = eeev;
                }
            }
        } else {
            v = billboards.length;
            for (var l = 0; l < v; l++) {
                billboards[l][v - 1].remove();
                billboards[v - 1][l].remove();
                billboards[l].length = v - 1;
            }
            billboards.length = v - 1;
        }
    }
};

MyScene.prototype.frame = function () {

};