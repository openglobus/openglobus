import { KML } from '../../src/og/layer/KML.js';

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
  dieppeRouen = new KML('dieppeRouenVector', {
  });
  const { entities, extent } = await dieppeRouen.addKmlFromUrl('./dieppe-rouen.kml');

  const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
  globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
  globus.planet.addLayer(dieppeRouen);
  globus.planet.flyExtent(extent);
})();
