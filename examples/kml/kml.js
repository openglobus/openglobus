
const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
const globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
const billboard = { src: './carrot.png', color: 'red' };
let extent;

/**
 * Read the kml files as xml files and extract the coordinates tags.
 * @param {File} file 
 * @returns {Promise<Array>}
 */
const readKmlFile = file => {
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = async (i) => {
      const xmlDoc = (new DOMParser()).parseFromString(i.target.result, 'text/xml');
      const raw = Array.from(xmlDoc.getElementsByTagName('coordinates'));
      const coordinates = raw.map(item => item.textContent.trim().replace(/\n/g, ' ').split(' ').map(co => co.split(',').map(parseFloat)));
      resolve(coordinates);
    };
    fileReader.readAsText(file);
  });
};

/**
 * Creates billboard or polyline from array of lonlat.
 * @param {Array} pathes 
 * @param {string} color 
 * @returns {Array<og.Entity>}
 */
const extractPathes = (pathes, color) => {
  const entities = [];
  pathes.forEach(kmlFile => kmlFile.forEach(path => {
    if (path.length === 1) {
      const lonlat = path[0];
      const _entity = new og.Entity({ lonlat, billboard });
      entities.push(_entity);
    } else if (path.length > 1) {
      const pathLonLat = path.map(item => new og.LonLat(item[0], item[1], item[2]));
      const _entity = new og.Entity({ polyline: { pathLonLat: [pathLonLat], thickness: 3, color, isClosed: false } });
      entities.push(_entity);
    }
  }));
  return entities;
};

document.getElementById('upload').onchange = async e => {
  const color = document.getElementById('color').value;
  billboard.color = color;
  const files = Array.from(e.target.files);
  const pathes = await Promise.all(files.map(f => readKmlFile(f)));
  const entities = extractPathes(pathes, color);
  const ptsLayer = new og.layer.Vector('pts', { entities });
  globus.planet.addLayer(ptsLayer);
  // extent = ptsLayer.getExtent(); doesn't work :(
  extent = entities[0].getExtent();
  globus.planet.flyExtent(extent);
  document.getElementById('viewExtent').style.display = 'inline';
};

document.getElementById('viewExtent').onclick = () => {
  globus.planet.flyExtent(extent);
};
