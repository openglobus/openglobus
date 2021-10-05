import { Entity } from '../../src/og/entity/Entity.js';
import { Globe } from '../../src/og/Globe.js';
import { Vector } from '../../src/og/layer/Vector.js';
import { XYZ } from '../../src/og/layer/XYZ.js';
import { LonLat } from '../../src/og/LonLat.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';


function goTo(globus, lat, lon, cameraLat, cameraLng, cameraAlt) {
  if (document.visibilityState === 'hidden') { return Promise.resolve(''); }
  const ell = globus.planet.ellipsoid;
  const destPos = new LonLat(cameraLng, cameraLat, cameraAlt);
  const viewPoi = new LonLat(lon, lat);
  const lookCart = ell.lonLatToCartesian(viewPoi);
  const upVec = ell.lonLatToCartesian(destPos).normalize();
  return new Promise(res => globus.planet.camera.flyLonLat(destPos, lookCart, upVec, 0, res));
}

function wait(t = 1) {
  return new Promise(res => setTimeout(res, t * 1000));
}

(async () => {
  const osm = new XYZ('osm', { isBaseLayer: true, url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
  const globus = new Globe({ target: 'globus', terrain: new GlobusTerrain(), layers: [osm] });
  await goTo(globus, 43.543129, 7.035927, 43.10, 7.1, 4000000);
  await wait(7);
  await goTo(globus, 43.543129, 7.035927, 43.10, 7.1, 360000);
  await wait(2);
  await goTo(globus, 43.543129, 7.035927, 43.10, 7.1, 160000);
  await wait(2);
  await goTo(globus, 43.543129, 7.035927, 43.40, 7.035927, 3100);
  await wait(3);
  await goTo(globus, 43.543129, 7.035927, 43.44, 7.035927, 2100);
  await wait(3);
  await goTo(globus, 43.543129, 7.035927, 43.48, 7.035927, 2100);
  await wait(3);
  for (let i = 1; i < 10; i++) {
    await goTo(globus, 43.543129 + i * 0.04, 7.035927, 43.48 + i * 0.04, 7.035927, 2100 + i * 100);
    await wait(3);
  }
})();
