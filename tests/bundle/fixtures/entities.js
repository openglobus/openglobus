import { Renderer, EntityCollection, Entity } from "@openglobus/og";

const renderer = new Renderer("canvas");
const collection = new EntityCollection({ entities: [new Entity({ billboard: { src: "marker.png" } })] });
collection.addTo(renderer);
window.renderer = renderer;
