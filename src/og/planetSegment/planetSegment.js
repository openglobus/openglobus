goog.provide('og.planetSegment');
goog.provide('og.planetSegment.PlanetSegment');

goog.require('og.planetSegment.PlanetSegmentHelper');
goog.require('og.math');
goog.require('og.math.Vector3');
goog.require('og.layer');
goog.require('og.Extent');
goog.require('og.bv.Box');
goog.require('og.bv.Sphere');
goog.require('og.mercator');
goog.require('og.LonLat');
goog.require('og.proj.EPSG3857');

/**
 * Planet segment Web Mercator tile class
 * @class
 * @api
 */
og.planetSegment.PlanetSegment = function () {
    this._projection = og.proj.EPSG3857;

    this.plainVertices = [];
    this.plainNormals = [];
    this.terrainNormals = [];
    this.terrainVertices = [];
    this.tempVertices = [];

    this.normalMapTexture = null;
    this.normalMapTextureBias = [];
    this.normalMapVertices = [];
    this.normalMapNormals = [];

    this.plainIndexes = [];

    this.bbox = new og.bv.Box();
    this.bsphere = new og.bv.Sphere();

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;
    this.vertexTextureCoordBuffer = null;

    this.extent;
    this.gridSize;

    this.zoomIndex;
    this.tileX;
    this.tileY;

    this.planet;
    this.handler = null;

    this.ready = false;

    this.materials = [];

    this._inTheQueue = false;
    this.normalMapReady = false;
    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.terrainExists = false;

    this.texBiasArr = new Float32Array(og.layer.MAX_OVERLAYS * 3);
    this.samplerArr = new Int32Array(og.layer.MAX_OVERLAYS);
    this.alfaArr = new Float32Array(og.layer.MAX_OVERLAYS);

    this.node;
};

og.planetSegment.PlanetSegment.RATIO_LOD = 1.12;
//og.planetSegment.PlanetSegment.RATIO_LOD = 1.8;//the best for lighting

og.planetSegment.PlanetSegment.prototype.acceptForRendering = function (camera) {
    var sphere = this.bsphere;
    return camera.projectedSize(sphere.center) > og.planetSegment.PlanetSegment.RATIO_LOD * sphere.radius;
};

og.planetSegment.PlanetSegment.prototype.getEarthPoint = function (lonlat, camera) {
    var ne = this.extent.northEast,
        sw = this.extent.southWest,
        size = this.gridSize,
        xyz = camera.eye;

    var xmax = ne.lon,
        ymax = ne.lat,
        xmin = sw.lon,
        ymin = sw.lat,
        x = lonlat.lon,
        y = lonlat.lat;

    var sxn = xmax - xmin,
        syn = ymax - ymin;

    var qx = sxn / size,
        qy = syn / size;

    var xn = x - xmin,
        yn = y - ymin;

    var indX = Math.floor(xn / qx),
        indY = Math.floor(size - yn / qy);

    var verts = this.terrainReady ? this.terrainVertices : this.tempVertices,
        ray = new og.math.Ray(xyz, xyz.getNegate());

    if (verts.length) {
        var ind_v0 = ((size + 1) * indY + indX) * 3;
        var ind_v2 = ((size + 1) * (indY + 1) + indX) * 3;

        var v0 = new og.math.Vector3(verts[ind_v0], verts[ind_v0 + 1], verts[ind_v0 + 2]),
            v1 = new og.math.Vector3(verts[ind_v0 + 3], verts[ind_v0 + 4], verts[ind_v0 + 5]),
            v2 = new og.math.Vector3(verts[ind_v2], verts[ind_v2 + 1], verts[ind_v2 + 2]),
            v3 = new og.math.Vector3(verts[ind_v2 + 3], verts[ind_v2 + 4], verts[ind_v2 + 5]);

        var res = new og.math.Vector3();

        var d = ray.hitTriangle(v0, v1, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return { "distance": xyz.distance(res), "earth": res };
        }

        d = ray.hitTriangle(v1, v3, v2, res);
        if (d == og.math.Ray.INSIDE) {
            return { "distance": xyz.distance(res), "earth": res };
        }

        if (d == og.math.Ray.AWAY) {
            return { "distance": -xyz.distance(res), "earth": res };
        }

        return { "distance": xyz.distance(res), "earth": res };
    }

    return { "distance": camera.lonLat.height, "earth": this.planet.hitRayEllipsoid(ray.origin, ray.direction) };
};

og.planetSegment.PlanetSegment.prototype.loadTerrain = function () {
    if (this.zoomIndex >= this.planet.terrainProvider.minZoom) {
        if (!this.terrainIsLoading && !this.terrainReady) {
            this.terrainReady = false;
            this.terrainIsLoading = true;
            this.planet.terrainProvider.handleSegmentTerrain(this);
        }
    } else {
        this.terrainReady = true;
    }
};

og.planetSegment.PlanetSegment.prototype.elevationsExists = function (elevations) {
    //terrain exists
    if (this.ready && this.terrainIsLoading) {
        this.terrainExists = true;

        var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
        var tgs = this.planet.terrainProvider.gridSizeByZoom[this.zoomIndex];
        var fileGridSize = this.planet.terrainProvider.fileGridSize || (Math.sqrt(elevations.length) - 1);
        var fileGridSize_one = fileGridSize + 1;
        var gs = tgs + 1;
        var hf = this.planet.heightFactor;
        var terrainVertices = [];
        var normalMapVertices = [];

        var nmvInd = 0;
        var vInd = 0;
        var dg = 32 / tgs;

        var normalMapNormals = new Float64Array(fileGridSize_one * fileGridSize_one * 3);

        if (fileGridSize >= tgs) {
            for (var i = 0; i < fileGridSize_one; i++) {
                for (var j = 0; j < fileGridSize_one; j++) {
                    var h = hf * elevations[Math.round(nmvInd / 3)];
                    var x = this.normalMapVertices[nmvInd] + h * this.normalMapNormals[nmvInd],
                        y = this.normalMapVertices[nmvInd + 1] + h * this.normalMapNormals[nmvInd + 1],
                        z = this.normalMapVertices[nmvInd + 2] + h * this.normalMapNormals[nmvInd + 2];

                    normalMapVertices[nmvInd++] = x;
                    normalMapVertices[nmvInd++] = y;
                    normalMapVertices[nmvInd++] = z;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;

                    if (i % dg == 0 && j % dg == 0) {
                        terrainVertices[vInd++] = x;
                        terrainVertices[vInd++] = y;
                        terrainVertices[vInd++] = z;
                    }
                }
            }

            for (var i = 0; i < fileGridSize; i++) {
                for (var j = 0; j < fileGridSize; j++) {

                    var vInd0 = (i * fileGridSize_one + j) * 3;
                    var vInd1 = (i * fileGridSize_one + j + 1) * 3;
                    var vInd2 = ((i + 1) * fileGridSize_one + j) * 3;
                    var vInd3 = ((i + 1) * fileGridSize_one + (j + 1)) * 3;

                    var v0 = new og.math.Vector3(normalMapVertices[vInd0], normalMapVertices[vInd0 + 1], normalMapVertices[vInd0 + 2]),
                        v1 = new og.math.Vector3(normalMapVertices[vInd1], normalMapVertices[vInd1 + 1], normalMapVertices[vInd1 + 2]),
                        v2 = new og.math.Vector3(normalMapVertices[vInd2], normalMapVertices[vInd2 + 1], normalMapVertices[vInd2 + 2]),
                        v3 = new og.math.Vector3(normalMapVertices[vInd3], normalMapVertices[vInd3 + 1], normalMapVertices[vInd3 + 2]);

                    var e10 = og.math.Vector3.sub(v1, v0),
                        e20 = og.math.Vector3.sub(v2, v0),
                        e30 = og.math.Vector3.sub(v3, v0);

                    var sw = e20.cross(e30).normalize();
                    var ne = e30.cross(e10).normalize();

                    var n0 = og.math.Vector3.add(ne, sw).normalize();

                    normalMapNormals[vInd0] += n0.x;
                    normalMapNormals[vInd0 + 1] += n0.y;
                    normalMapNormals[vInd0 + 2] += n0.z;

                    normalMapNormals[vInd1] += ne.x;
                    normalMapNormals[vInd1 + 1] += ne.y;
                    normalMapNormals[vInd1 + 2] += ne.z;

                    normalMapNormals[vInd2] += sw.x;
                    normalMapNormals[vInd2 + 1] += sw.y;
                    normalMapNormals[vInd2 + 2] += sw.z;

                    normalMapNormals[vInd3] += n0.x;
                    normalMapNormals[vInd3 + 1] += n0.y;
                    normalMapNormals[vInd3 + 2] += n0.z;
                }
            }

        } else {

            var plain_verts = this.plainVertices;
            var plainNormals = this.plainNormals;

            var oneSize = tgs / fileGridSize;
            var h, inside_i, inside_j, v_i, v_j;

            for (var i = 0; i < gs; i++) {
                if (i == gs - 1) {
                    inside_i = oneSize;
                    v_i = Math.floor(i / oneSize) - 1;
                } else {
                    inside_i = i % oneSize;
                    v_i = Math.floor(i / oneSize);
                }

                for (var j = 0; j < gs; j++) {
                    if (j == gs - 1) {
                        inside_j = oneSize;
                        v_j = Math.floor(j / oneSize) - 1;
                    } else {
                        inside_j = j % oneSize;
                        v_j = Math.floor(j / oneSize);
                    }

                    var hvlt = elevations[v_i * fileGridSize_one + v_j],
                        hvrt = elevations[v_i * fileGridSize_one + v_j + 1],
                        hvlb = elevations[(v_i + 1) * fileGridSize_one + v_j],
                        hvrb = elevations[(v_i + 1) * fileGridSize_one + v_j + 1];

                    if (inside_i + inside_j < oneSize) {
                        h = hf * (hvlt + og.math.slice(inside_j / oneSize, hvrt, hvlt) + og.math.slice(inside_i / oneSize, hvlb, hvlt));
                    } else {
                        h = hf * (hvrb + og.math.slice((oneSize - inside_j) / oneSize, hvlb, hvrb) + og.math.slice((oneSize - inside_i) / oneSize, hvrt, hvrb));
                    }

                    var x = plain_verts[vInd] + h * plainNormals[vInd],
                        y = plain_verts[vInd + 1] + h * plainNormals[vInd + 1],
                        z = plain_verts[vInd + 2] + h * plainNormals[vInd + 2];

                    terrainVertices[vInd] = x;
                    terrainVertices[vInd + 1] = y;
                    terrainVertices[vInd + 2] = z;

                    vInd += 3;

                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;

                }
            }

            normalMapNormals = this.plainNormals;
        }

        this.normalMapNormals = normalMapNormals;
        this.normalMapVertices = normalMapVertices;
        //this.terrainNormals = normals;
        this.terrainNormals = this.plainNormals;
        this.terrainVertices.length = 0;
        this.terrainVertices = terrainVertices;

        this.deleteBuffers();
        this.planet.normalMapCreator.queue(this);
        this.createCoordsBuffers(terrainVertices, this.terrainNormals, tgs);
        this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
        this.gridSize = tgs;
        this.terrainReady = true;
        this.terrainIsLoading = false;
        this.node.appliedTerrainNodeId = this.node.nodeId;
        elevations.length = 0;
    }
};

og.planetSegment.PlanetSegment.prototype.equalZoomSum = function (neighborId, i_a, vert) {
    if (this.node.neighbors[neighborId] &&
        this.node.neighbors[neighborId].planetSegment.terrainReady &&
        this.zoomIndex == this.node.neighbors[neighborId].planetSegment.zoomIndex) {

        var size = this.planet.terrainProvider.fileGridSize;
        var i_b = size - i_a;

        var seg_a = this.normalMapNormals,
            seg_b = this.node.neighbors[neighborId].planetSegment.normalMapNormals;

        if (vert) {
            for (var k = 0 ; k <= size; k++) {
                var vInd_a = (k * (size + 1) + i_a) * 3,
                    vInd_b = (k * (size + 1) + i_b) * 3;

                seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
            }
        } else {
            for (var k = 0 ; k <= size; k++) {
                var vInd_a = (i_a * (size + 1) + k) * 3,
                    vInd_b = (i_b * (size + 1) + k) * 3;

                seg_b[vInd_b] = (seg_a[vInd_a] += seg_b[vInd_b]);
                seg_b[vInd_b + 1] = (seg_a[vInd_a + 1] += seg_b[vInd_b + 1]);
                seg_b[vInd_b + 2] = (seg_a[vInd_a + 2] += seg_b[vInd_b + 2]);
            }
        }
    }
};

og.planetSegment.PlanetSegment.prototype.createNormalMapTexture = function () {
    if (this.normalMapNormals.length) {

        var tr = { terrainReady: true };
        var nb = this.node.neighbors;
        var nn = nb[og.quadTree.N] ? nb[og.quadTree.N].planetSegment.terrainReady : true,
            en = nb[og.quadTree.E] ? nb[og.quadTree.E].planetSegment.terrainReady : true,
            sn = nb[og.quadTree.S] ? nb[og.quadTree.S].planetSegment.terrainReady : true,
            wb = nb[og.quadTree.W] ? nb[og.quadTree.W].planetSegment.terrainReady : true;

        if (!nn || !en || !sn || !wb) {
            this.planet.normalMapCreator.shift(this);
            return;
        }

        this.equalZoomSum(og.quadTree.N, 0);
        this.equalZoomSum(og.quadTree.S, 32);
        this.equalZoomSum(og.quadTree.W, 0, true);
        this.equalZoomSum(og.quadTree.E, 32, true);

        var cnv = this.planet.normalMapCreator.draw(this.normalMapNormals);
        this.normalMapTexture = this.handler.createTexture(cnv);
        this.normalMapReady = true;
    }
};

og.planetSegment.PlanetSegment.prototype.elevationsNotExists = function () {
    if (this.zoomIndex <= this.planet.terrainProvider.maxZoom) {
        if (this.ready && this.terrainIsLoading) {
            this.terrainIsLoading = false;
            this.terrainReady = true;
            this.terrainExists = false;
            this.node.appliedTerrainNodeId = this.node.nodeId;
            this.gridSize = this.planet.terrainProvider.gridSizeByZoom[this.zoomIndex];

            this.deleteBuffers();

            if (this.zoomIndex > 5) {
                var step = 3 * this.gridSize;
                var step2 = step * 0.5;
                var lb = step * (this.gridSize + 1);
                var ml = step2 * (this.gridSize + 1);

                var v = this.terrainVertices;
                this.terrainVertices = [v[0], v[1], v[2], v[step2], v[step2 + 1], v[step2 + 2], v[step], v[step + 1], v[step + 2],
                        v[ml], v[ml + 1], v[ml + 2], v[ml + step2], v[ml + step2 + 1], v[ml + step2 + 2], v[ml + step], v[ml + step + 1], v[ml + step + 2],
                        v[lb], v[lb + 1], v[lb + 2], v[lb + step2], v[lb + step2 + 1], v[lb + step2 + 2], v[lb + step], v[lb + step + 1], v[lb + step + 2]];

                v = this.terrainNormals;
                this.terrainNormals = [v[0], v[1], v[2], v[step2], v[step2 + 1], v[step2 + 2], v[step], v[step + 1], v[step + 2],
                        v[ml], v[ml + 1], v[ml + 2], v[ml + step2], v[ml + step2 + 1], v[ml + step2 + 2], v[ml + step], v[ml + step + 1], v[ml + step + 2],
                        v[lb], v[lb + 1], v[lb + 2], v[lb + step2], v[lb + step2 + 1], v[lb + step2 + 2], v[lb + step], v[lb + step + 1], v[lb + step + 2]];

                this.createCoordsBuffers(this.terrainVertices, this.terrainNormals, 2);
                this.gridSize = 2;
            } else {
                this.createCoordsBuffers(this.terrainVertices, this.terrainNormals, this.gridSize);
            }
        }
    }
};

og.planetSegment.PlanetSegment.prototype.applyTerrain = function (elevations) {
    if (elevations.length) {
        this.elevationsExists(elevations);
    } else {
        this.elevationsNotExists();
    }
};

og.planetSegment.PlanetSegment.prototype.deleteBuffers = function () {
    var gl = this.handler.gl;
    gl.deleteBuffer(this.vertexNormalBuffer);
    gl.deleteBuffer(this.vertexPositionBuffer);
    gl.deleteBuffer(this.vertexIndexBuffer);
    gl.deleteBuffer(this.vertexTextureCoordBuffer);

    this.vertexNormalBuffer = null;
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;
    this.vertexTextureCoordBuffer = null;
};

og.planetSegment.PlanetSegment.prototype.clearBuffers = function () {
    this.ready = false;
    this.deleteBuffers();
};

og.planetSegment.PlanetSegment.prototype.deleteElevations = function () {
    this._inTheQueue = false;
    this.normalMapReady = false;
    this.terrainReady = false;
    this.terrainIsLoading = false;
    this.tempVertices.length = 0;
    this.terrainVertices.length = 0;
    this.plainVertices.length = 0;
    this.plainNormals.length = 0;
    this.terrainNormals.length = 0;
    if (this.normalMapTexture && !this.normalMapTexture.default)
        this.handler.gl.deleteTexture(this.normalMapTexture);
    this.normalMapVertices.length = 0;
    this.normalMapNormals.length = 0;
};

og.planetSegment.PlanetSegment.prototype.getMaterialByLayer = function (layer) {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        if (m[i].layer == layer) {
            return m[i];
        }
    }
};

og.planetSegment.PlanetSegment.prototype.getMaterialByLayerName = function (name) {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        if (m[i].layer.name == name) {
            return m[i];
        }
    }
};

og.planetSegment.PlanetSegment.prototype.clearSegment = function () {
    this.clearBuffers();
    this.deleteMaterials();
    this.deleteElevations();
};

og.planetSegment.PlanetSegment.prototype.deleteMaterials = function () {
    var m = this.materials;
    for (var i = 0; i < m.length; i++) {
        var mi = m[i];
        if (mi) {
            mi.clear();
        }
    }
    m.length = 0;
};

og.planetSegment.PlanetSegment.prototype.createBoundsByExtent = function () {
    var ellipsoid = this.planet.ellipsoid,
        extent = this.extent;

    var xmin = og.math.MAX, xmax = og.math.MIN, ymin = og.math.MAX, ymax = og.math.MIN, zmin = og.math.MAX, zmax = og.math.MIN;
    var v = [];
    v.push(og.LonLat.inverseMercator(extent.southWest.lon, extent.southWest.lat),
        og.LonLat.inverseMercator(extent.southWest.lon, extent.northEast.lat),
        og.LonLat.inverseMercator(extent.northEast.lon, extent.northEast.lat),
        og.LonLat.inverseMercator(extent.northEast.lon, extent.southWest.lat));

    for (var i = 0; i < v.length; i++) {
        var coord = ellipsoid.LonLat2ECEF(v[i]);
        var x = coord.x, y = coord.y, z = coord.z;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    this.bsphere.setFromBounds([xmin, xmax, ymin, ymax, zmin, zmax]);
};

og.planetSegment.PlanetSegment.prototype.destroySegment = function () {
    this.clearSegment();
    this.extent = null;
};

og.planetSegment.PlanetSegment.prototype.createCoordsBuffers = function (vertices, normals, gridSize) {
    var gsgs = (gridSize + 1) * (gridSize + 1);
    this.vertexTextureCoordBuffer = this.handler.createArrayBuffer(new Float32Array(og.planetSegment.PlanetSegmentHelper.textureCoordsTable[gridSize]), 2, gsgs);
    this.vertexPositionBuffer = this.handler.createArrayBuffer(new Float32Array(vertices), 3, gsgs);
    this.vertexNormalBuffer = this.handler.createArrayBuffer(new Float32Array(normals), 3, gsgs);
};

og.planetSegment.PlanetSegment.prototype.createIndexesBuffer = function (sidesSizes, gridSize) {
    var indexes = og.planetSegment.PlanetSegmentHelper.createSegmentIndexes(gridSize, sidesSizes);
    this.vertexIndexBuffer = this.handler.createElementArrayBuffer(indexes, 1, indexes.length);
};

og.planetSegment.PlanetSegment.prototype.assignTileIndexes = function (zoomIndex, extent) {
    this.zoomIndex = zoomIndex;
    this.extent = extent;
    var pole = og.mercator.POLE;
    this.tileX = Math.round(Math.abs(-pole - extent.southWest.lon) / (extent.northEast.lon - extent.southWest.lon));
    this.tileY = Math.round(Math.abs(pole - extent.northEast.lat) / (extent.northEast.lat - extent.southWest.lat));
};

og.planetSegment.PlanetSegment.prototype.createPlainVertices = function (gridSize) {
    var verts = this.plainVertices,
        norms = this.plainNormals,
        nmVerts = this.normalMapVertices,
        nmNorms = this.normalMapNormals;

    var e = this.extent,
        fgs = this.planet.terrainProvider.fileGridSize;
    var lonSize = e.getWidth();
    var llStep = lonSize / Math.max(fgs, gridSize);
    var esw_lon = e.southWest.lon,
        ene_lat = e.northEast.lat;
    var dg = Math.max(fgs / gridSize, 1),
        gs = Math.max(fgs, gridSize) + 1;
    var r2 = this.planet.ellipsoid._invRadii2;
    var ind = 0,
        nmInd = 0;
    for (var i = 0; i < gs; i++) {
        for (var j = 0; j < gs; j++) {
            var v = this.planet.ellipsoid.LonLat2ECEF(og.LonLat.inverseMercator(esw_lon + j * llStep, ene_lat - i * llStep));
            var nx = v.x * r2.x, ny = v.y * r2.y, nz = v.z * r2.z;
            var l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
            var nxl = nx * l, nyl = ny * l, nzl = nz * l;

            nmVerts[nmInd] = v.x;
            nmNorms[nmInd++] = nxl;

            nmVerts[nmInd] = v.y;
            nmNorms[nmInd++] = nyl;

            nmVerts[nmInd] = v.z;
            nmNorms[nmInd++] = nzl;

            if (i % dg == 0 && j % dg == 0) {
                verts[ind] = v.x;
                norms[ind++] = nxl;

                verts[ind] = v.y;
                norms[ind++] = nyl;

                verts[ind] = v.z;
                norms[ind++] = nzl;
            }
        }
    }

    this.normalMapTexture = this.planet.transparentTexture;
};

og.planetSegment.drawSingle = function (sh, segment) {
    if (segment.ready) {
        var gl = segment.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleLayers;
        if (layers.length) {
            var baseMat = segment.materials[layers[0].id];
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, baseMat.texture);
            gl.uniform3fv(shu.texBias._pName, baseMat.texBias);
            gl.uniform1i(shu.uSampler._pName, 0);

            if (segment.planet.lightEnabled) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, segment.normalMapTexture);
                gl.uniform1i(shu.uNormalMap._pName, 1);
            }
        }
        segment.draw(sh);
    }
};

og.planetSegment.drawOverlays = function (sh, segment) {
    if (segment.ready) {
        var gl = segment.handler.gl;
        var sha = sh.attributes,
            shu = sh.uniforms;
        var layers = segment.planet.visibleLayers;

        for (var l = 0; l < layers.length; l++) {
            var ll = layers[l];
            var mat = segment.materials[ll.id];
            var nt3 = l * 3;
            //var nt4 = l * 4;

            segment.texBiasArr[nt3] = mat.texBias[0];
            segment.texBiasArr[nt3 + 1] = mat.texBias[1];
            segment.texBiasArr[nt3 + 2] = mat.texBias[2];

            segment.samplerArr[l] = l;

            gl.activeTexture(gl.TEXTURE0 + sh._textureID + l);
            gl.bindTexture(gl.TEXTURE_2D, mat.texture);
        }

        gl.uniform3fv(shu.texBiasArr._pName, segment.texBiasArr);
        gl.uniform1iv(shu.uSamplerArr._pName, segment.samplerArr);

        segment.draw(sh);
    }
};

og.planetSegment.PlanetSegment.prototype.draw = function (sh) {
    var gl = this.handler.gl;
    var sha = sh.attributes;

    if (this.planet.lightEnabled) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.vertexAttribPointer(sha.aVertexNormal._pName, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    gl.vertexAttribPointer(sha.aTextureCoord._pName, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    this._setVIb();
    sh.drawIndexBuffer(this.planet.drawMode, this._vib);
    this.node.hasNeighbor = [false, false, false, false];
};

og.planetSegment.PlanetSegment.prototype._setVIb = function () {
    if (this.node.sideSize[og.quadTree.N] & this.node.sideSize[og.quadTree.W] &
        this.node.sideSize[og.quadTree.S] & this.node.sideSize[og.quadTree.E]) {
        this._vib = this.planet.indexesBuffers[this.gridSize];
    } else {
        this.createIndexesBuffer(this.node.sideSize, this.gridSize);
        this._vib = this.vertexIndexBuffer;
    }
};

og.planetSegment.PlanetSegment.prototype.drawPicking = function () {
    if (this.ready) {
        var gl = this.handler.gl;
        var sh = this.handler.shaderPrograms.picking._program;
        var sha = sh.attributes,
            shu = sh.uniforms;

        var cam = this.node.planet.renderer.activeCamera;
        gl.uniformMatrix4fv(shu.uPMVMatrix._pName, false, cam.pmvMatrix._m);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(sha.aVertexPosition._pName, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        this._setVIb();

        sh.drawIndexBuffer(gl.TRIANGLE_STRIP, this._vib);

        this.node.sideSize = [this.gridSize, this.gridSize, this.gridSize, this.gridSize];
        //this.node.hasNeighbor = [false, false, false, false];
    }
};