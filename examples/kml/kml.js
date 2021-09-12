
const osm = new og.layer.XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
const globus = new og.Globe({ target: 'globus', terrain: new og.terrain.GlobusTerrain(), layers: [osm] });
const billboard = { src: './carrot.png', color: 'red' };
let kmlExtent;

/**
 * Read the kml files as xml files and extract the coordinates tags.
 * @param {File} file 
 * @returns {Promise<Array>}
 */
const extractCoordonatesFromKml = file => {
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
 * Creates billboards or polylines from array of lonlat.
 * @param {Array} coordonates
 * @param {string} color 
 * @returns {Array<og.Entity>}
 */
const convertCoordonatesIntoEntities = (coordinates, color) => {
  const extent = new og.Extent(new og.LonLat(180.0, 90.0), new og.LonLat(-180.0, -90.0));
  const addToExtent = (c) => {
    const lon = c[0], lat = c[1];
    if (lon < extent.southWest.lon) extent.southWest.lon = lon;
    if (lat < extent.southWest.lat) extent.southWest.lat = lat;
    if (lon > extent.northEast.lon) extent.northEast.lon = lon;
    if (lat > extent.northEast.lat) extent.northEast.lat = lat;
  };
  const _pathes = [];
  coordinates.forEach(kmlFile => kmlFile.forEach(p => _pathes.push(p)));
  const entities = _pathes.map(path => {
    if (path.length === 1) {
      const lonlat = path[0];
      const _entity = new og.Entity({ lonlat, billboard });
      addToExtent(lonlat);
      return _entity;
    } else if (path.length > 1) {
      const pathLonLat = path.map(item => {
        addToExtent(item);
        return new og.LonLat(item[0], item[1], item[2]);
      });
      const _entity = new og.Entity({ polyline: { pathLonLat: [pathLonLat], thickness: 3, color, isClosed: false } });
      return _entity;
    }
  });
  return { entities, extent };
};

document.getElementById('upload').onchange = async e => {
  const color = document.getElementById('color').value;
  billboard.color = color;
  const files = Array.from(e.target.files);
  const coordonates = await Promise.all(files.map(f => extractCoordonatesFromKml(f)));
  const { entities, extent } = convertCoordonatesIntoEntities(coordonates, color);
  const ptsLayer = new og.layer.Vector('kmls', { entities });
  globus.planet.addLayer(ptsLayer);
  kmlExtent = extent;
  globus.planet.flyExtent(extent);
  document.getElementById('viewExtent').style.display = 'inline';
};

document.getElementById('viewExtent').onclick = () => {
  globus.planet.flyExtent(kmlExtent);
};
