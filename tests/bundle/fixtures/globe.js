import { Globe, XYZ } from "@openglobus/og";

window.globe = new Globe({ target: "globus", layers: [new XYZ("xyz", { url: "https://tile/{z}/{x}/{y}.png" })] });
