import { RulerSwitcher } from "../RulerSwitcher";
import { HeightRuler } from "./HeightRuler";

export class HeightRulerSwitcher extends RulerSwitcher {
    constructor(options: { ignoreTerrain?: boolean } = {}) {
        super({
            name: `HeightRulerSwitcher`,
            ...options
        });
        this.ruler = new HeightRuler({
            ignoreTerrain: options.ignoreTerrain
        });
    }

}