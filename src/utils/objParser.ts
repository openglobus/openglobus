import {NumberArray3} from "../math/Vec3";

export interface IObjGeometryData {
    vertices: number[];
    texCoords: number[];
    normals: number[];
}

export interface IObjGeometry {
    object: string;
    groups: string[];
    material: string;
    data: IObjGeometryData
}

export interface IObjMaterial {
    ambient?: NumberArray3;
    diffuse?: NumberArray3; // baseDiffuseFactor
    specular?: NumberArray3; // metalicFactor, specularFactor
    shininess?: number; // roughnessFactor, glossinessFactor
    color?: NumberArray3; // baseColorFactor
    opacity?: number;
    illum?: number
    colorTexture?: string; // baseColorTexture
    normalTexture?: string; // normalTexture
    metallicRoughnessTexture?: string;//R - roughness, B - metallic; specular glossiness or glossinessTexture
}

type MaterialMap = Record<string, IObjMaterial>;

export interface IObj {
    geometries: IObjGeometry[];
    materials: MaterialMap;
}

export class Obj {

    public objPositions: number[][];
    public objTexcoords: number[][];
    public objNormals: number[][];
    public objVertexData: [number[][], number[][], number[][]];
    public vertexData: [number[], number[], number[]];

    public _materialLibs: string[];
    public geometries: IObjGeometry[];
    public geometry: IObjGeometry | null;
    public materials: MaterialMap;
    public material: IObjMaterial;

    public object: string;
    public groups: string[];

    public keywords: Record<string, (parts: string[], unparsedArgs: string) => void>;

    protected _path: string;

    constructor() {

        this.objPositions = [];
        this.objTexcoords = [];
        this.objNormals = [];

        // same order as `f` indices
        this.objVertexData = [
            this.objPositions,
            this.objTexcoords,
            this.objNormals,
        ];

        // same order as `f` indices
        this.vertexData = [
            [],   // positions
            [],   // texcoords
            [],   // normals
        ];

        this._materialLibs = [];
        this.geometries = [];
        this.geometry = null;
        this.materials = {};
        this.material = {};

        this.object = 'default';
        this.groups = ['default'];

        this._path = "";

        this.keywords = {
            v: (parts: string[]) => {
                this.objPositions.push(parts.map(parseFloat));
            },
            vn: (parts: string[]) => {
                this.objNormals.push(parts.map(parseFloat));
            },
            vt: (parts: string[]) => {
                // should check for missing v and extra w?
                this.objTexcoords.push([parseFloat(parts[0]), 1.0 - parseFloat(parts[1])]);
            },
            f: (parts: string[]) => {
                this.setGeometry();
                const numTriangles = parts.length - 2;
                for (let tri = 0; tri < numTriangles; ++tri) {
                    this.addVertex(parts[0]);
                    this.addVertex(parts[tri + 1]);
                    this.addVertex(parts[tri + 2]);
                }
            },
            s: () => {
                // skip texture scale
            },
            mtllib: (parts: string[], unparsedArgs: string) => {
                // the spec says there can be multiple filenames here
                // but many exist with spaces in a single filename
                this._materialLibs.push(unparsedArgs);
            },
            usemtl: (parts: string[], unparsedArgs: string) => {
                this.newGeometry();
                this.setGeometry();
                if (this.geometry) {
                    this.geometry.material = unparsedArgs;
                }
            },
            g: (parts: string[]) => {
                this.groups = parts;
                this.newGeometry();
            },
            o: (parts: string[], unparsedArgs: string) => {
                this.object = unparsedArgs;
                this.newGeometry();
            },
            newmtl: (parts: string[], unparsedArgs: string) => {
                const material = {};
                this.material = material;
                this.materials[unparsedArgs] = material;
            },
            Ns: (parts: string[], unparsedArgs: string) => {
                this.material.shininess = parseFloat(unparsedArgs);
            },
            Ni: (parts: string[], unparsedArgs: string) => {
                // skip refraction
            },
            Ka: (parts: string[], unparsedArgs: string) => {
                this.material.ambient = parts.map(v => parseFloat(v)) as NumberArray3;
            },
            Kd: (parts: string[], unparsedArgs: string) => {
                this.material.diffuse = parts.map(v => parseFloat(v)) as NumberArray3;
            },
            Ks: (parts: string[], unparsedArgs: string) => {
                this.material.specular = parts.map(v => parseFloat(v)) as NumberArray3;
            },
            Ke: (parts: string[], unparsedArgs: string) => {
                this.material.color = parts.map(v => parseFloat(v)) as NumberArray3;
            },
            illum: (parts: string[], unparsedArgs: string) => {
                this.material.illum = parseFloat(unparsedArgs);
            },
            d: (parts: string[], unparsedArgs: string) => {
                this.material.opacity = parseFloat(unparsedArgs);
            },
            Tr: (parts: string[], unparsedArgs: string) => {
                this.material.opacity = parseFloat(unparsedArgs);
            },
            Tf: (parts: string[], unparsedArgs: string) => {
                // skip transmission filter
            },
            map_Ka: (parts: string[], unparsedArgs: string) => {
                // skip ambient texture
            },
            map_Kd: (parts: string[], unparsedArgs: string) => {
                this.material.colorTexture = `${this._path}/${unparsedArgs}`;
            },
            map_Bump: (parts: string[], unparsedArgs: string) => {
                this.material.normalTexture = `${this._path}/${unparsedArgs}`;
            },
            map_Ns: (parts: string[], unparsedArgs: string) => {
                this.material.metallicRoughnessTexture = `${this._path}/${unparsedArgs}`;
            },
        };
    }

    public newGeometry() {
        // If there is an existing geometry and it's
        // not empty then start a new one.
        if (this.geometry && this.geometry.data.vertices.length) {
            this.geometry = null;
        }
    }

    public setGeometry() {
        if (!this.geometry) {

            const vertices: number[] = [];
            const texCoords: number[] = [];
            const normals: number[] = [];

            this.vertexData = [
                vertices,
                texCoords,
                normals,
            ];

            this.geometry = {
                object: this.object,
                groups: this.groups,
                material: "",
                data: {
                    vertices,
                    texCoords,
                    normals,
                },
            };

            this.geometries.push(this.geometry!);
        }
    }

    public addVertex(vert: string) {
        const ptn = vert.split('/');
        ptn.forEach((objIndexStr: string, i: number) => {
            if (!objIndexStr) {
                return;
            }
            const index = parseInt(objIndexStr) - 1;
            this.vertexData[i].push(...this.objVertexData[i][index]);
        });
    }

    protected _innerParser(text: string, fileName: string) {
        const keywordRE = /(\w*)(?: )*(.*)/;
        const lines = text.split('\n');
        for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
            const line = lines[lineNo].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const m = keywordRE.exec(line);
            if (!m) {
                continue;
            }
            const [, keyword, unparsedArgs] = m;
            const parts = line.split(/\s+/).slice(1);
            const handler = this.keywords[keyword];
            if (!handler) {
                console.warn(`Unknown keyword '${keyword}' in '${fileName}:${lineNo}'`);  // eslint-disable-line no-console
                continue;
            }
            handler(parts, unparsedArgs);
        }
    }

    get data(): IObj {
        return {
            geometries: this.geometries,
            materials: this.materials
        }
    }

    public async load(src: string) {

        this._path = src.substring(0, src.lastIndexOf("/"));

        // Fetch geometry
        await fetch(src, {mode: "cors",})
            .then((response) => {
                if (!response.ok) {
                    throw Error(`Unable to load '${src}'`);
                }
                return response.text();
            }).then((data) => {
                this._innerParser(data, src);
                this._cleanupGeometryArrays();
            })
            .catch(() => null);

        // fetch materials
        let defArr = this._materialLibs.map(filename => {
            filename = `${this._path}/${filename}`;
            return fetch(filename)
                .then((response) => response.text())
                .then((text: string) => {
                    return {text, filename}
                })
        });

        await Promise.all(defArr).then((mtlArr) => {
            mtlArr.forEach(mtl => this._innerParser(mtl.text, mtl.filename));
        });

        return this.data;
    }

    protected _cleanupGeometryArrays() {
        for (const geometry of this.geometries) {
            geometry.data = Object.fromEntries(
                Object.entries(geometry.data).filter(([key, array]) => array.length > 0)
            ) as IObjGeometryData;
        }
    }
}


function rotateObject(obj: IObjGeometryData, angle: number): { vertices: number[], normals: number[] } {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const vertices = obj.vertices;
    const normals = obj.normals;

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        vertices[i] = x * cosA + z * sinA;
        vertices[i + 1] = y;
        vertices[i + 2] = -x * sinA + z * cosA;

        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];

        normals[i] = nx * cosA + nz * sinA;
        normals[i + 1] = ny;
        normals[i + 2] = -nx * sinA + nz * cosA;
    }

    return {
        vertices: vertices,
        normals: normals
    };
}

