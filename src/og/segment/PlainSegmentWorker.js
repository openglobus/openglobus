// /**
//  * @module og/segment/PlainSegmentWorker
//  */

// 'use sctrict';

// import { QueueArray } from '../QueueArray.js';

// class PlainSegmentWorker {
//     constructor(numWorkers = 2) {
//         this._id = 0;
//         this._segments = {};

//         this._workerQueue = new QueueArray(numWorkers);
//         var elevationProgramm = new Blob([_programm], { type: 'application/javascript' });

//         var _this = this;
//         for (let i = 0; i < numWorkers; i++) {

//             var w = new Worker(URL.createObjectURL(elevationProgramm));

//             w.onmessage = function (e) {

//                 _this._segments[e.data.id]._terrainWorkerCallback(e.data);
//                 _this._segments[e.data.id] = null;
//                 delete _this._segments[e.data.id];

//                 _this._workerQueue.unshift(this);
//                 _this.check();
//             };

//             this._workerQueue.push(w);
//         }

//         this._pendingQueue = new QueueArray(512);
//     }

//     check() {
//         if (this._pendingQueue.length) {
//             var p = this._pendingQueue.pop();
//             this.make(p.segment, p.elevations);
//         }
//     }

//     make(segment) {

//         if (segment.initialized) {

//             if (this._workerQueue.length) {

//                 var w = this._workerQueue.pop();

//                 this._segments[this._id] = segment;

//                 w.postMessage({                  
//                     'id': this._id++
//                 }, []);

//             } else {
//                 this._pendingQueue.push(segment);
//             }
//         } else {
//             this.check();
//         }
//     }
// };



// const POLE = 20037508.34;

//     function inverseMercator(lon,lat){
//         var lon = 180.0 * x / POLE;
//         var lat = 180.0 / Math.PI * (2 * Math.atan(Math.exp((y / POLE) * Math.PI)) - Math.PI / 2);
//         return new LonLat(lon, lat, height);
//     };

//     function lonLatToCartesian(lon, lat){

//     };

//     let gridSize = e.data.params[GRIDSIZE],//this.planet.terrain.gridSizeByZoom[this.tileZoom];
//         fgs = e.data.params[FILEGRIDSIZE],//this.planet.terrain.fileGridSize
//         e = e.data.params[SWLON, SWLAT, NELON, NELAT],
//         r2 = e.data.params[INVRADII2],//this.planet.ellipsoid._invRadii2

//     var e = this._extent,
//         fgs = this.planet.terrain.fileGridSize;
//     var lonSize = e.getWidth();
//     var llStep = lonSize / Math.max(fgs, gridSize);
//     var esw_lon = e.southWest.lon,
//         ene_lat = e.northEast.lat;
//     var dg = Math.max(fgs / gridSize, 1),
//         gs = Math.max(fgs, gridSize) + 1;
//     var r2 = this.planet.ellipsoid._invRadii2;
//     var ind = 0,
//         nmInd = 0;
//     const gsgs = gs * gs;

//     var gridSize3 = (gridSize + 1) * (gridSize + 1) * 3;

//     var plainNormals = new Float32Array(gridSize3);
//     var plainVertices = new Float32Array(gridSize3);

//     var normalMapNormals = new Float32Array(gsgs * 3);
//     var normalMapVertices = new Float32Array(gsgs * 3);

//     var verts = plainVertices,
//         norms = plainNormals,
//         nmVerts = normalMapVertices,
//         nmNorms = normalMapNormals;

//     for (var k = 0; k < gsgs; k++) {

//         let j = k % gs,
//             i = ~~(k / gs);

//         let v = lonLatToCartesian(inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep));
//         let nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
//         let l = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
//         let nxl = nx * l, nyl = ny * l, nzl = nz * l;

//         nmVerts[nmInd] = v.x;
//         nmNorms[nmInd++] = nxl;

//         nmVerts[nmInd] = v.y;
//         nmNorms[nmInd++] = nyl;

//         nmVerts[nmInd] = v.z;
//         nmNorms[nmInd++] = nzl;

//         if (i % dg === 0 && j % dg === 0) {
//             verts[ind] = v.x;
//             norms[ind++] = nxl;

//             verts[ind] = v.y;
//             norms[ind++] = nyl;

//             verts[ind] = v.z;
//             norms[ind++] = nzl;
//         }
//     }

//     let terrainVertices = verts;

//     //store raw normals
//     let normalMapNormalsRaw = new Float32Array(nmNorms.length);
//     normalMapNormalsRaw.set(nmNorms);



// const _programm =
//     `
//     'use strict';

//     self.onmessage = function (msg) {

//         var id = e.data.id;

//         self.postMessage({
//             'id': id
//         });
//     }`;

// export { PlainSegmentWorker };