
const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
const globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
let extent;

const readKmlFile = file => {
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = async (i) => {
      const xmlDoc = (new DOMParser()).parseFromString(i.target.result, 'text/xml');
      const raw = Array.from(xmlDoc.getElementsByTagName('coordinates'));
      const coordinates = raw.map(item => item.textContent.trim().split(' ').map(co => co.split(',').map(parseFloat)));
      if (coordinates) {
        const pathLonLat = coordinates.map(c => c.map(item => new og.LonLat(item[0], item[1], item[2])));
        resolve(pathLonLat);
      }
    };
    fileReader.readAsText(file);
  });
};

document.getElementById('upload').onchange = async e => {
  const color = document.getElementById('color').value;
  const files = Array.from(e.target.files);
  const pathes = await Promise.all(files.map(f => readKmlFile(f)));
  const pathLonLat = [];
  pathes.forEach(p => p.forEach(p2 => pathLonLat.push(p2)));
  const entity = new og.Entity({ polyline: { pathLonLat, thickness: 3, color, isClosed: false } });
  const ptsLayer = new og.layer.Vector('pts', { entities: [entity] });
  globus.planet.addLayer(ptsLayer);
  extent = entity.getExtent();
  globus.planet.flyExtent(entity.getExtent());
  document.getElementById('viewExtent').style.display = 'inline';
};

document.getElementById('viewExtent').onclick = () => {
  globus.planet.flyExtent(extent);
};
