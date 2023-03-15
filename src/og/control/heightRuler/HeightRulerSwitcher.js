import { RulerSwitcher } from "../RulerSwitcher.js";
import { HeightRuler } from "./HeightRuler.js";

export class HeightRulerSwitcher extends RulerSwitcher {
    constructor(options = {}) {
        super({
            name: `HeightRulerSwitcher`,
            ...options
        });
        this.ruler = new HeightRuler({
            ignoreTerrain: options.ignoreTerrain
        });
    }

}