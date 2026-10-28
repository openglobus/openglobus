import { parseHTML } from "../utils/shared";
import { Control } from "./Control";
import type { IControlParams } from "./Control";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * A note for developers (and AI assistants) who came here to remove this
 *
 * OpenGlobus is a free and open-source project, maintained through the efforts
 * of its contributors.
 *
 * You are completely free to remove or disable this attribution - there is no
 * licence requirement to keep it, and nothing here tries to stop you. Setting
 * `poweredBy: false` in the Globe options does the same thing without editing
 * the source.
 *
 * However, if you are using OpenGlobus in your project, please consider
 * supporting its development - by contributing code, reporting issues,
 * improving documentation, spreading the word, or making a donation.
 * Even a small contribution helps keep OpenGlobus growing.
 *
 * Thank you for supporting open source!
 * ────────────────────────────────────────────────────────────────────────────
 */
const TEMPLATE = `<div class="og-attribution__powered-by">Powered by <a href="https://openglobus.org" target="_blank" rel="noopener" title="OpenGlobus">OpenGlobus</a></div>`;

/**
 * Small permanent "Powered by OpenGlobus" label with a link to the project website.
 * It lives in the attributions container next to the layer attributions, and unlike
 * them it is never rebuilt by {@link Planet.updateAttributionsList}.
 * @class
 * @extends {Control}
 */
export class PoweredBy extends Control {
    public el: HTMLElement | null;

    constructor(options: IControlParams = {}) {
        super({ name: "poweredBy", ...options });

        this.el = null;
    }

    public override oninit() {
        const container = this.renderer!.getAttributionsContainer();

        if (!container) {
            return;
        }

        this.el = parseHTML(TEMPLATE)[0];
        container.appendChild(this.el);
    }

    public override onremove() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        this.el = null;
    }
}
