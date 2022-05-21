import fs from 'fs'
import { KML } from '../../src/og/layer/KML'

const readFile = (name) => {
    return new Promise((resolve) => {
        fs.readFile(name, 'utf8', (err, xmlString) => {
            const parser = new DOMParser();
            resolve(parser.parseFromString(xmlString, 'text/xml'))
        })
    })
}

describe('kml files', () => {

    it('no kml files', async () => {
        const kml = new KML('name', {})
        const result = await kml.addKmlFromFiles()
        expect(result).toBeFalsy()
    })

    it('styled kml', async () => {
        const kml = new KML('name', {})
        const xmlDoc = await readFile('./tests/layer/KML.styled.kml')
        const { entities, extent } = kml._convertKMLintoEntities(xmlDoc)
        expect(entities.length).toBe(1)
    })

})