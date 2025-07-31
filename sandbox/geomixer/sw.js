const CACHE_NAME = 'Geomixer';
const OFFLINE_TILE = './offline.png';
let offlineVersion = false;

self.addEventListener('install', (ev) => { // Store the «offline tile» on startup.
  return fetchAndCache(OFFLINE_TILE).then(() => {
      // console.log("SW installed");
  });
});

self.addEventListener('activate', (ev) => {
  // console.log("SW activated");
});

self.addEventListener('message', (ev) => {
  const data = ev.data;
  if ('offlineVersion' in data) offlineVersion = data.offlineVersion;
  // console.log("SW message", data);
});

//
// Intercept download of map tiles: read from cache or download.
//
self.addEventListener('fetch', function(event) {
  const request = event.request;
  if (request.headers.get('X-Gmx-Sess')) {
  
  // if (/\bsw=1\b/.test(request.url)) {
    const cached = caches.match(request)
      .then(function (r) {
        if (r) return r;
        return offlineVersion ? null : fetchAndCache(request);
      })
      // Fallback to offline tile if never cached.
      .catch(function(e) {
        console.log('Fetch failed', e);
        return fetch(OFFLINE_TILE);
      });
    event.respondWith(cached);
  }
});

//
// Helper to fetch and store in cache.
//
function fetchAndCache(req) {
  return fetch(req)
    .then(resp => {
        return resp.status === 404 ? resp : caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resp.clone()); // console.log('Store in cache', response);
          return resp;
        });
    });
}
