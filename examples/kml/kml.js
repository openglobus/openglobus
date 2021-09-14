import { KML } from '../../src/og/layer/KML.js';

const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
const globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
const billboard = { src: './plane.png', color: '#6689db' };
let kmlExtent;

const getXmlContent = file => {
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = async i => resolve((new DOMParser()).parseFromString(i.target.result, 'text/xml'));
    fileReader.readAsText(file);
  });
};

document.getElementById('upload').onchange = async e => {
  const color = document.getElementById('color').value;
  billboard.color = color;
  const kmls = await Promise.all(Array.from(e.target.files).map(getXmlContent));
  const myKmlVector = new KML('myKmlVector', { kmls, billboard, color });
  globus.planet.addLayer(myKmlVector);
  kmlExtent = myKmlVector.getExtent();
  globus.planet.flyExtent(kmlExtent);
  document.getElementById('viewExtent').style.display = 'inline';
};

document.getElementById('viewExtent').onclick = () => {
  globus.planet.flyExtent(kmlExtent);
};

(async () => {
  const dieppeRouen = new KML('dieppeRouenVector', { billboard });
  await dieppeRouen.addKmlFromUrl('./dieppe-rouen.kml');
  globus.planet.addLayer(dieppeRouen);
  kmlExtent = dieppeRouen.getExtent();
  globus.planet.flyExtent(kmlExtent);
})();
