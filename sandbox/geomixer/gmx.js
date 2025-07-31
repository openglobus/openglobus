import { Globe, control, OpenStreetMap,} from "/src/index.ts";

const nsGmx = window.nsGmx || {};
const now = String(Date.now());
const sn = 'gmxSession';
nsGmx.gmxSession = sessionStorage.getItem(sn);
if (!nsGmx.gmxSession) {
	sessionStorage.setItem(sn, now);
	localStorage.setItem(sn, now);
	nsGmx.gmxSession = now;
}
nsGmx.headers = {
    'X-Gmx-Sess': [nsGmx.gmxSession].join(':')
};

window.nsGmx = nsGmx;

navigator.serviceWorker.register('sw.js', { scope: '/' })
    .then(reg => {
        console.log('ServiceWorker registration successful with scope: ', reg.scope);
    })
    .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
    });

const globus = new Globe({
    target: "earth",
    name: "Earth",
    // terrain: new GlobusRgbTerrain(),
    // layers: [new OpenStreetMap(), new Bing()],
    layers: [new OpenStreetMap()],
    atmosphereEnabled: false,
    fontsSrc: "../../res/fonts",
});

globus.planet.addControl(new control.TimelineControl());
globus.planet.addControl(new control.CompassButton());
globus.planet.addControl(new control.DebugInfo());
globus.planet.addControl(new control.LayerSwitcher());
globus.planet.addControl(new control.DrawingSwitcher());


globus.planet.renderer.controls.SimpleSkyBackground.colorOne = "black";
