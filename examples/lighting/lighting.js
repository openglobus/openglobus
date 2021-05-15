'use strict';

import { Globe } from '../../src/og/Globe.js';
import { GlobusTerrain } from '../../src/og/terrain/GlobusTerrain.js';
import { XYZ } from '../../src/og/layer/XYZ.js';

 document.getElementById("ambient-r").addEventListener("input", function (e) {
     osm.ambient.x = this.value;
     document.querySelector(".value.ambient-r").innerHTML = this.value;
 });
 document.getElementById("ambient-g").addEventListener("input", function (e) {
     osm.ambient.y = this.value;
     document.querySelector(".value.ambient-g").innerHTML = this.value;
 });
 document.getElementById("ambient-b").addEventListener("input", function (e) {
     osm.ambient.z = this.value;
     document.querySelector(".value.ambient-b").innerHTML = this.value;
 });

 document.getElementById("diffuse-r").addEventListener("input", function (e) {
     osm.diffuse.x = this.value;
     document.querySelector(".value.diffuse-r").innerHTML = this.value;
 });
 document.getElementById("diffuse-g").addEventListener("input", function (e) {
     osm.diffuse.y = this.value;
     document.querySelector(".value.diffuse-g").innerHTML = this.value;
 });
 document.getElementById("diffuse-b").addEventListener("input", function (e) {
     osm.diffuse.z = this.value;
     document.querySelector(".value.diffuse-b").innerHTML = this.value;
 });

 document.getElementById("specular-r").addEventListener("input", function (e) {
     osm.specular.x = this.value;
     document.querySelector(".value.specular-r").innerHTML = this.value;
 });
 document.getElementById("specular-g").addEventListener("input", function (e) {
     osm.specular.y = this.value;
     document.querySelector(".value.specular-g").innerHTML = this.value;
 });
 document.getElementById("specular-b").addEventListener("input", function (e) {
     osm.specular.z = this.value;
     document.querySelector(".value.specular-b").innerHTML = this.value;
 });

 document.getElementById("shininess").addEventListener("input", function (e) {
     osm.shininess = this.value;
     document.querySelector(".value.shininess").innerHTML = this.value;
 });

var osm = new XYZ("OpenStreetMap", {
    isBaseLayer: true,
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    visibility: true,
    attribution: 'Data @ OpenStreetMap contributors, ODbL'
});

var globe = new Globe({
    "target": "earth",
    "name": "Earth",
    "terrain":new GlobusTerrain(),
    "layers": [osm]
});

window.globe = globe;