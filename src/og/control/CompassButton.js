"use strict";

import { Control } from "./Control.js";
import { parseHTML } from "../utils/shared.js";

let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   viewBox="0 0 110.6 110.3"
   version="1.1"
   id="svg21"
   sodipodi:docname="aaa.svg"
   inkscape:version="0.92.3 (2405546, 2018-03-11)">
  <metadata
     id="metadata11">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <defs
     id="defs25" />
  <sodipodi:namedview
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1"
     objecttolerance="10"
     gridtolerance="10"
     guidetolerance="10"
     inkscape:pageopacity="0"
     inkscape:pageshadow="2"
     inkscape:window-width="1920"
     inkscape:window-height="1001"
     id="namedview23"
     showgrid="false"
     inkscape:zoom="9.4900968"
     inkscape:cx="28.376998"
     inkscape:cy="60.17054"
     inkscape:window-x="-9"
     inkscape:window-y="-9"
     inkscape:window-maximized="1"
     inkscape:current-layer="svg21" />
  <g
     id="Layer_2"
     data-name="Layer 2"
     transform="matrix(1,0,0,-1,0,110.3)">
    <g
       id="Слой_1"
       data-name="Слой 1">
      <g
         id="_Group_"
         data-name="&lt;Group&gt;">
        <g
           id="_Group_7"
           data-name="&lt;Group&gt;">
          <polygon
             id="_Path_7"
             data-name="&lt;Path&gt;"
             points="55.2,97.6 55.3,97.4 55.3,97.6 55.3,97.2 65.3,55.1 55.3,55.1 55.2,55.1 45.3,55.1 55.2,97.2 "
             style="fill:#ff2b45" />
          <polygon
             id="_Path_8"
             data-name="&lt;Path&gt;"
             points="55.3,12.7 55.3,12.9 55.2,12.7 55.2,13.1 45.3,55.1 55.2,55.1 55.3,55.1 65.3,55.1 55.3,13.1 "
             style="fill:#cecece;" />
        </g>
      </g>
    </g>
  </g>
</svg>`;

/**
 * Planet compass button
 * @class
 * @extends {Control}
 * @params {Object} [options] - Control options.
 */
class CompassButton extends Control {
    /**
     *
     * @params {Object} [options] - Control options.
     */
    constructor(options) {
        super(options);

        options = options || {};

        this.planet = null;

        this.compassSvg = options.compassSvg || svg;

        this._heading = null;

        this._svg = null;
    }

    oninit() {
        var btnEl = parseHTML(`<div class="og-compass-button">${this.compassSvg}</div>`)[0];

        this._svg = btnEl.querySelector("svg");

        this.renderer.div.appendChild(btnEl);

        btnEl.addEventListener("click", (e) => this._onClick());

        this.renderer.events.on("draw", this._draw, this);
    }

    _onClick() {
        let c = this.planet.getCartesianFromPixelTerrain(this.renderer.handler.getCenter());
        if (c) {
            this.planet.flyCartesian(
                c.normal().scaleTo(c.length() + c.distance(this.planet.camera.eye)),
                null,
                null,
                0,
                null,
                null,
                () => {
                    this.planet.camera.look(c);
                }
            );
        } else {
            this.planet.flyCartesian(this.planet.camera.eye);
        }
    }

    _draw(e) {
        this.setHeading(e.activeCamera.getHeading());
    }

    setHeading(heading) {
        if (this._heading !== heading) {
            this._heading = heading;
            this._svg.style.transform = `rotateZ(${-heading}deg)`;
        }
    }
}

export function compassButton(options) {
    return new CompassButton(options);
}

export { CompassButton };
