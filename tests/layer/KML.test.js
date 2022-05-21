import { KML } from "../../src/og/layer/KML";
import fs from 'fs';

const readFile = (name) => {
    return new Promise((resolve) => {
        fs.readFile(name, 'utf8', (err, data) => {
            resolve(data)
        });
    });
}

describe('kml files', () => {

    it('no kml files', async () => {
        const kml = new KML("name", {});
        const result = await kml.addKmlFromFiles()
        expect(result).toBeFalsy();
    });

    it('styled kml', async () => {
        const kml = new KML("name", {});
        const file = await readFile('./tests/layer/KML.styled.kml')
        expect(file).toBeTruthy();
    });

})