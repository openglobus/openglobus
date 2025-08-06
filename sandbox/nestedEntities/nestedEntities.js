/* eslint-disable no-undef */
import {
    control,
    Entity,
    Object3d,
    Renderer,
    Vec3,
    Mat4,
    RenderNode,
    EntityCollection,
    scene,
} from "../../lib/og.es.js";

let renderer = new Renderer("frame", {
    msaa: 8,
    controls: [new control.SimpleNavigation({ speed: 0.01 }), new control.GeoObjectEditor()],
    autoActivate: true
});

// Создаем слайдеры для управления камерой
function createCameraControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 1000;
        min-width: 280px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;

    // Заголовок
    const title = document.createElement('h3');
    title.textContent = 'Camera Controls';
    title.style.cssText = `
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #fff;
    `;
    controlsContainer.appendChild(title);

    // Слайдер для perspectiveToOrtho (0 до 1)
    const perspectiveToOrthoContainer = document.createElement('div');
    perspectiveToOrthoContainer.style.cssText = `
        margin-bottom: 15px;
    `;

    const perspectiveToOrthoLabel = document.createElement('label');
    perspectiveToOrthoLabel.textContent = 'Perspective to Ortho: ';
    perspectiveToOrthoLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
    `;

    const perspectiveToOrthoSlider = document.createElement('input');
    perspectiveToOrthoSlider.type = 'range';
    perspectiveToOrthoSlider.min = '0';
    perspectiveToOrthoSlider.max = '1';
    perspectiveToOrthoSlider.step = '0.01';
    perspectiveToOrthoSlider.value = '0';
    perspectiveToOrthoSlider.style.cssText = `
        width: 100%;
        margin-bottom: 5px;
    `;

    const perspectiveToOrthoValue = document.createElement('span');
    perspectiveToOrthoValue.textContent = '0';
    perspectiveToOrthoValue.style.cssText = `
        font-size: 12px;
        color: #ccc;
    `;

    perspectiveToOrthoSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        perspectiveToOrthoValue.textContent = value.toFixed(2);
        renderer.activeCamera.perspectiveToOrtho = value;
    });

    perspectiveToOrthoContainer.appendChild(perspectiveToOrthoLabel);
    perspectiveToOrthoContainer.appendChild(perspectiveToOrthoSlider);
    perspectiveToOrthoContainer.appendChild(perspectiveToOrthoValue);

    // Слайдер для orthoFocusDistance (0 до 1000)
    const orthoFocusDistanceContainer = document.createElement('div');
    orthoFocusDistanceContainer.style.cssText = `
        margin-bottom: 15px;
    `;

    const orthoFocusDistanceLabel = document.createElement('label');
    orthoFocusDistanceLabel.textContent = 'Ortho Focus Distance: ';
    orthoFocusDistanceLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
    `;

    const orthoFocusDistanceSlider = document.createElement('input');
    orthoFocusDistanceSlider.type = 'range';
    orthoFocusDistanceSlider.min = '0.1';
    orthoFocusDistanceSlider.max = '100';
    orthoFocusDistanceSlider.step = '0.1';
    orthoFocusDistanceSlider.value = '10';
    orthoFocusDistanceSlider.style.cssText = `
        width: 100%;
        margin-bottom: 5px;
    `;

    const orthoFocusDistanceValue = document.createElement('span');
    orthoFocusDistanceValue.textContent = '10';
    orthoFocusDistanceValue.style.cssText = `
        font-size: 12px;
        color: #ccc;
    `;

    orthoFocusDistanceSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        orthoFocusDistanceValue.textContent = value;
        renderer.activeCamera.orthoDistance = value;
    });

    orthoFocusDistanceContainer.appendChild(orthoFocusDistanceLabel);
    orthoFocusDistanceContainer.appendChild(orthoFocusDistanceSlider);
    orthoFocusDistanceContainer.appendChild(orthoFocusDistanceValue);

    // Добавляем все элементы в контейнер
    controlsContainer.appendChild(perspectiveToOrthoContainer);
    controlsContainer.appendChild(orthoFocusDistanceContainer);

    // Добавляем контейнер на страницу
    document.body.appendChild(controlsContainer);
}

class MyScene extends RenderNode {
    constructor() {
        super("MyScene");
    }

    init() {
        const baseObj = Object3d.createCube(1, 1, 1).setMaterial({
            ambient: "#c2c2c2",
            diffuse: "#ffffff",
            shininess: 1
        });

        let parentEntity = new Entity({
            cartesian: new Vec3(0, 0, 0),
            independentPicking: true,
            geoObject: {
                color: "rgb(90,90,90)",
                scale: 1,
                instanced: true,
                tag: `baseObj`,
                object3d: baseObj
            }
        });

        let collection = new EntityCollection({
            entities: [parentEntity]
        });

        collection.addTo(this);

        this.renderer.activeCamera.set(new Vec3(10, 0, 0), new Vec3(0, 0, 0));

        //this.renderer.activeCamera.update();
    }
}

renderer.addNodes([new scene.Axes(), new MyScene()]);

window.renderer = renderer;

// Создаем элементы управления камерой после инициализации рендерера
createCameraControls();

