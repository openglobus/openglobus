import { KML } from '../../src/og/layer/KML.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';

let dieppeRouen, globus;

document.getElementById('upload').onchange = async e => {
    const color = document.getElementById('color').value;
    dieppeRouen.setColor(color);
    const KMLs = Array.from(e.target.files);
    const { entities, extent } = await dieppeRouen.addKmlFromFiles(KMLs);
    globus.planet.flyExtent(extent);
};

document.getElementById('viewExtent').onclick = () => {
    globus.planet.flyExtent(dieppeRouen.getExtent());
};

(async () => {
    dieppeRouen = new KML('dieppeRouenVector', {});
    const { entities, extent } = await dieppeRouen.addKmlFromUrl('./dieppe-rouen.kml');

    const osm = new XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
    globus = new Globe({
        target: 'globus',
        terrain: new GlobusTerrain(),
        layers: [osm]
    });
    globus.planet.addLayer(dieppeRouen);
    globus.planet.flyExtent(extent);
})();
