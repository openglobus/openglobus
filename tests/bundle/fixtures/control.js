import { Globe, XYZ, LayerSwitcher } from "@openglobus/og";

const globe = new Globe({ target: "globus", layers: [new XYZ("xyz", { url: "https://tile/{z}/{x}/{y}.png" })] });
globe.planet.addControl(new LayerSwitcher());
window.globe = globe;
