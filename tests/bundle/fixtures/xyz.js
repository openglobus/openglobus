import { XYZ } from "@openglobus/og";

window.layer = new XYZ("xyz", { url: "https://tile/{z}/{x}/{y}.png" });
