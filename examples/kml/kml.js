
const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
const globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
const billboard = { src: './carrot.png', color: 'red' };
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
  const files = Array.from(e.target.files);
  const kmls = await Promise.all(files.map(f => getXmlContent(f)));
  const ptsLayer = new og.layer.KML('myKmlFiles', { kmls });
  globus.planet.addLayer(ptsLayer);
  kmlExtent = ptsLayer.getExtent();
  globus.planet.flyExtent(kmlExtent);
  document.getElementById('viewExtent').style.display = 'inline';
};

document.getElementById('viewExtent').onclick = () => {
  globus.planet.flyExtent(kmlExtent);
};
