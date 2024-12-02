import {NumberArray3} from "../math/Vec3";

export interface IObjGeometryData {
    vertices: number[];
    textures: number[];
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
    diffuseSrc?: string; // baseColorTexture
    bumpSrc?: string; // normalTexture
}

interface IObjData {
    geometries: IObjGeometry[];
    materials: any;
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
    public materials: Record<string, IObjMaterial>;
    public material: IObjMaterial;

    public object: string;
    public groups: string[];

    public keywords: Record<string, (parts: string[], unparsedArgs: string) => void>;

    constructor() {

        this.objPositions = [[0, 0, 0]];
        this.objTexcoords = [[0, 0]];
        this.objNormals = [[0, 0, 0]];

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

        this.keywords = {
            v: (parts: string[]) => {
                this.objPositions.push(parts.map(parseFloat));
            },
            vn: (parts: string[]) => {
                this.objNormals.push(parts.map(parseFloat));
            },
            vt: (parts: string[]) => {
                // should check for missing v and extra w?
                this.objTexcoords.push(parts.map(parseFloat));
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
                this.material.diffuseSrc = unparsedArgs;
            },
            map_Bump: (parts: string[], unparsedArgs: string) => {
                this.material.bumpSrc = unparsedArgs;
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
            const textures: number[] = [];
            const normals: number[] = [];

            this.vertexData = [
                vertices,
                textures,
                normals,
            ];

            this.geometry = {
                object: this.object,
                groups: this.groups,
                material: "",
                data: {
                    vertices,
                    textures,
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
            const objIndex = parseInt(objIndexStr);
            const index = objIndex + (objIndex >= 0 ? 0 : this.objVertexData[i].length);
            this.vertexData[i].push(...this.objVertexData[i][index]);
        });
    }

    protected _innerParser(text: string) {
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
                console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
                continue;
            }
            handler(parts, unparsedArgs);
        }
    }

    public parse(text: string): Promise<any> {

        this._innerParser(text);

        // remove any arrays that have no entries.
        for (const geometry of this.geometries) {
            geometry.data = Object.fromEntries(
                Object.entries(geometry.data).filter(([key, array]) => array.length > 0)
            ) as IObjGeometryData;
        }

        // fetch materials
        let defArr = this._materialLibs.map(url => fetch(url).then((response) => response.text()));
        return Promise.all(defArr).then((mtlArr) => {
            mtlArr.forEach(mtlStr => this._innerParser(mtlStr));
            return {
                geometries: this.geometries,
                materials: this.materials
            };
        });
    }
}

export function transformLeftToRightCoordinateSystem(objData: IObjData): {
    geometries: IObjGeometry[],
    materials: Record<string, any>
} {

    const convertedGeometries: IObjGeometry[] = objData.geometries.map(geometry => {
        const vertices = geometry.data.vertices;
        const normals = geometry.data.normals;
        const textures = geometry.data.textures || [];

        rotateObject(geometry.data, 0);

        let convertedVertices: number[] = [];
        let convertedNormals: number[] = [];
        let convertedTextures: number[] = [];

        // Convert positions
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            convertedVertices.push(x, y, z);
        }

        // Convert normals
        for (let i = 0; i < normals.length; i += 3) {
            const x = normals[i];
            const y = normals[i + 1];
            const z = normals[i + 2];
            convertedNormals.push(x, y, -z);
        }

        // Convert textures
        for (let i = 0; i < textures.length; i += 2) {
            const s = textures[i];
            const t = 1 - textures[i + 1];
            convertedTextures.push(s, t);
        }

        return {
            object: geometry.object,
            groups: geometry.groups,
            material: geometry.material,
            data: {
                vertices: convertedVertices,
                normals: convertedNormals,
                textures: convertedTextures
            }
        };
    });

    return {
        geometries: convertedGeometries,
        materials: objData.materials
    };
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

