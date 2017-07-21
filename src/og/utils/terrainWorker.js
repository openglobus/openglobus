goog.provide('og.utils.TerrainWorker');

og.utils.TerrainWorker = function (numWorkers) {
    this._workerQueue = new og.QueueArray(numWorkers);
    var elevationProgramm = new Blob([og.utils.TerrainWorker.SegmentElevationProgramm], { type: 'application/javascript' });

    for (var i = 0; i < numWorkers; i++) {
        this._workerQueue.push(new Worker(URL.createObjectURL(elevationProgramm)));
    }

    this._pendingQueue = new og.QueueArray(512);
};

og.utils.TerrainWorker.SegmentElevationProgramm =
    'self.onmessage = function (e) {\n\
        \n\
        var Vector3 = function(x, y, z) {\n\
            this.x = x;\n\
            this.y = y;\n\
            this.z = z;\n\
        };\n\
        Vector3.prototype.sub = function(v) {\n\
            return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);\n\
        };\n\
        Vector3.prototype.add = function(v) {\n\
            return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);\n\
        };\n\
        Vector3.prototype.cross = function(v) {\n\
            return new Vector3(\n\
                this.y * v.z - this.z * v.y,\n\
                this.z * v.x - this.x * v.z,\n\
                this.x * v.y - this.y * v.x\n\
            );\n\
        };\n\
        Vector3.prototype.normalize = function(v) {\n\
            var x = this.x, y = this.y, z = this.z;\n\
            var length = 1.0 / Math.sqrt(x * x + y * y + z * z);\n\
            this.x = x * length;\n\
            this.y = y * length;\n\
            this.z = z * length;\n\
            return this;\n\
        };\n\
        \n\
        var slice = function (t, h1, h0) {\n\
          return t * (h1 - h0);\n\
        };\n\
        \n\
        var elevations = e.data.elevations,\n\
            this_plainVertices = e.data.this_plainVertices,\n\
            this_plainNormals = e.data.this_plainNormals,\n\
            this_normalMapVertices = e.data.this_normalMapVertices,\n\
            this_normalMapNormals = e.data.this_normalMapNormals,\n\
            heightFactor =  e.data.heightFactor,\n\
            fileGridSize = e.data.fileGridSize,\n\
            gridSize = e.data.gridSize;\n\
        \n\
        var xmin = 549755748352, xmax = -549755748352, ymin = 549755748352, ymax = -549755748352, zmin = 549755748352, zmax = -549755748352;\n\
\n\
        fileGridSize = fileGridSize || (Math.sqrt(elevations.length) - 1);\n\
\n\
        var fileGridSize_one = fileGridSize + 1,\n\
            tgs = gridSize,\n\
            dg = fileGridSize / tgs,\n\
            gs = tgs + 1,\n\
            hf = heightFactor;\n\
\n\
        var nmvInd = 0;\n\
        var vInd = 0;\n\
\n\
        var terrainVertices = new Float32Array(gs * gs * 3);\n\
        var normalMapNormals = new Float32Array(fileGridSize_one * fileGridSize_one * 3);\n\
        var normalMapVertices = new Float32Array(fileGridSize_one * fileGridSize_one * 3);\n\
\n\
        var nv = this_normalMapVertices,\n\
            nn = this_normalMapNormals;\n\
\n\
        if (fileGridSize >= tgs) {\n\
            for (var i = 0; i < fileGridSize_one; i++) {\n\
                for (var j = 0; j < fileGridSize_one; j++) {\n\
                    var hInd0 = i * fileGridSize_one + j;\n\
                    var vInd0 = hInd0 * 3;\n\
                    var h0 = hf * elevations[hInd0];\n\
                    var v0 = new Vector3(nv[vInd0] + h0 * nn[vInd0], nv[vInd0 + 1] + h0 * nn[vInd0 + 1], nv[vInd0 + 2] + h0 * nn[vInd0 + 2]);\n\
                    normalMapVertices[vInd0] = v0.x;\n\
                    normalMapVertices[vInd0 + 1] = v0.y;\n\
                    normalMapVertices[vInd0 + 2] = v0.z;\n\
\n\
                    if (i % dg == 0 && j % dg == 0) {\n\
                        terrainVertices[vInd++] = v0.x;\n\
                        terrainVertices[vInd++] = v0.y;\n\
                        terrainVertices[vInd++] = v0.z;\n\
\n\
                        if (v0.x < xmin) xmin = v0.x; if (v0.x > xmax) xmax = v0.x;\n\
                        if (v0.y < ymin) ymin = v0.y; if (v0.y > ymax) ymax = v0.y;\n\
                        if (v0.z < zmin) zmin = v0.z; if (v0.z > zmax) zmax = v0.z;\n\
                    }\n\
\n\
                    if (i != fileGridSize && j != fileGridSize) {\n\
                        var hInd1 = i * fileGridSize_one + j + 1;\n\
                        var vInd1 = hInd1 * 3;\n\
                        var h1 = hf * elevations[hInd1];\n\
                        var v1 = new Vector3(nv[vInd1] + h1 * nn[vInd1], nv[vInd1 + 1] + h1 * nn[vInd1 + 1], nv[vInd1 + 2] + h1 * nn[vInd1 + 2]);\n\
                        normalMapVertices[vInd1] = v1.x;\n\
                        normalMapVertices[vInd1 + 1] = v1.y;\n\
                        normalMapVertices[vInd1 + 2] = v1.z;\n\
\n\
                        var hInd2 = (i + 1) * fileGridSize_one + j;\n\
                        var vInd2 = hInd2 * 3;\n\
                        var h2 = hf * elevations[hInd2];\n\
                        var v2 = new Vector3(\n\
                            nv[vInd2] + h2 * nn[vInd2],\n\
                            nv[vInd2 + 1] + h2 * nn[vInd2 + 1],\n\
                            nv[vInd2 + 2] + h2 * nn[vInd2 + 2]);\n\
                        normalMapVertices[vInd2] = v2.x;\n\
                        normalMapVertices[vInd2 + 1] = v2.y;\n\
                        normalMapVertices[vInd2 + 2] = v2.z;\n\
\n\
                        var hInd3 = (i + 1) * fileGridSize_one + (j + 1);\n\
                        var vInd3 = hInd3 * 3;\n\
                        var h3 = hf * elevations[hInd3];\n\
                        var v3 = new Vector3(nv[vInd3] + h3 * nn[vInd3], nv[vInd3 + 1] + h3 * nn[vInd3 + 1], nv[vInd3 + 2] + h3 * nn[vInd3 + 2]);\n\
                        normalMapVertices[vInd3] = v3.x;\n\
                        normalMapVertices[vInd3 + 1] = v3.y;\n\
                        normalMapVertices[vInd3 + 2] = v3.z;\n\
\n\
                        var e10 = v1.sub(v0),\n\
                            e20 = v2.sub(v0),\n\
                            e30 = v3.sub(v0);\n\
                        var sw = e20.cross(e30).normalize();\n\
                        var ne = e30.cross(e10).normalize();\n\
                        var n0 = ne.add(sw).normalize();\n\
\n\
                        normalMapNormals[vInd0] += n0.x;\n\
                        normalMapNormals[vInd0 + 1] += n0.y;\n\
                        normalMapNormals[vInd0 + 2] += n0.z;\n\
\n\
                        normalMapNormals[vInd1] += ne.x;\n\
                        normalMapNormals[vInd1 + 1] += ne.y;\n\
                        normalMapNormals[vInd1 + 2] += ne.z;\n\
\n\
                        normalMapNormals[vInd2] += sw.x;\n\
                        normalMapNormals[vInd2 + 1] += sw.y;\n\
                        normalMapNormals[vInd2 + 2] += sw.z;\n\
\n\
                        normalMapNormals[vInd3] += n0.x;\n\
                        normalMapNormals[vInd3 + 1] += n0.y;\n\
                        normalMapNormals[vInd3 + 2] += n0.z;\n\
                    }\n\
                }\n\
            }\n\
\n\
        } else {\n\
\n\
            var plain_verts = this_plainVertices;\n\
            var plainNormals = this_plainNormals;\n\
\n\
            var oneSize = tgs / fileGridSize;\n\
            var h, inside_i, inside_j, v_i, v_j;\n\
\n\
            for (var i = 0; i < gs; i++) {\n\
                if (i == gs - 1) {\n\
                    inside_i = oneSize;\n\
                    v_i = Math.floor(i / oneSize) - 1;\n\
                } else {\n\
                    inside_i = i % oneSize;\n\
                    v_i = Math.floor(i / oneSize);\n\
                }\n\
\n\
                for (var j = 0; j < gs; j++) {\n\
                    if (j == gs - 1) {\n\
                        inside_j = oneSize;\n\
                        v_j = Math.floor(j / oneSize) - 1;\n\
                    } else {\n\
                        inside_j = j % oneSize;\n\
                        v_j = Math.floor(j / oneSize);\n\
                    }\n\
\n\
                    var hvlt = elevations[v_i * fileGridSize_one + v_j],\n\
                        hvrt = elevations[v_i * fileGridSize_one + v_j + 1],\n\
                        hvlb = elevations[(v_i + 1) * fileGridSize_one + v_j],\n\
                        hvrb = elevations[(v_i + 1) * fileGridSize_one + v_j + 1];\n\
\n\
                    if (inside_i + inside_j < oneSize) {\n\
                        h = hf * (hvlt + slice(inside_j / oneSize, hvrt, hvlt) + slice(inside_i / oneSize, hvlb, hvlt));\n\
                    } else {\n\
                        h = hf * (hvrb + slice((oneSize - inside_j) / oneSize, hvlb, hvrb) + slice((oneSize - inside_i) / oneSize, hvrt, hvrb));\n\
                    }\n\
\n\
                    var x = plain_verts[vInd] + h * plainNormals[vInd],\n\
                        y = plain_verts[vInd + 1] + h * plainNormals[vInd + 1],\n\
                        z = plain_verts[vInd + 2] + h * plainNormals[vInd + 2];\n\
\n\
                    terrainVertices[vInd] = x;\n\
                    terrainVertices[vInd + 1] = y;\n\
                    terrainVertices[vInd + 2] = z;\n\
\n\
                    vInd += 3;\n\
\n\
                    if (x < xmin) xmin = x; if (x > xmax) xmax = x;\n\
                    if (y < ymin) ymin = y; if (y > ymax) ymax = y;\n\
                    if (z < zmin) zmin = z; if (z > zmax) zmax = z;\n\
\n\
                }\n\
            }\n\
\n\
            normalMapNormals = this_plainNormals;\n\
        }\n\
        self.postMessage({ \n\
                normalMapNormals: normalMapNormals,\n\
                normalMapVertices: normalMapVertices,\n\
                terrainVertices: terrainVertices,\n\
                bounds: [xmin, xmax, ymin, ymax, zmin, zmax],\n\
             }, [normalMapNormals.buffer, normalMapVertices.buffer, terrainVertices.buffer]);\n\
    }';

og.utils.TerrainWorker.prototype.make = function (segment, elevations) {

    if (segment.ready && segment.terrainIsLoading) {

        if (this._workerQueue.length) {

            var that = this;

            var w = this._workerQueue.pop();

            w.onmessage = function (e) {
                segment._terrainWorkerCallback(e.data);
                that._workerQueue.unshift(this);
                if (that._pendingQueue.length) {
                    var p = that._pendingQueue.pop();
                    that.make(p.segment, p.elevations)
                }
            };

            w.postMessage({
                'elevations': elevations,
                'this_plainVertices': segment.plainVertices,
                'this_plainNormals': segment.plainNormals,
                'this_normalMapVertices': segment.normalMapVertices,
                'this_normalMapNormals': segment.normalMapNormals,
                'heightFactor': segment.planet._heightFactor,
                'fileGridSize': segment.planet.terrainProvider.fileGridSize,
                'gridSize': segment.planet.terrainProvider.gridSizeByZoom[segment.tileZoom]
            }, [
                    elevations.buffer,
                    segment.plainVertices.buffer,
                    segment.plainNormals.buffer,
                    segment.normalMapVertices.buffer,
                    segment.normalMapNormals.buffer
                ]);
        } else {
            this._pendingQueue.push({ 'segment': segment, 'elevations': elevations });
        }
    }
};