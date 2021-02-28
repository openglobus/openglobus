'use strict';

import { Globe } from '../../src/og/Globe.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { SkyBox } from '../../src/og/scene/SkyBox.js';

var osm = new XYZ("OpenStreetMap", {
	    isBaseLayer: true,
	    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
	    visibility: true,
	    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});


var globus = new Globe({
	    "target": "globus",
	    "skybox": SkyBox.createDefault('../../res/'),
	    "name": "Earth",
	    "terrain": new GlobusTerrain(),
	    "layers": [osm],
	    "sun": {
		            "active": true
		        }
});
