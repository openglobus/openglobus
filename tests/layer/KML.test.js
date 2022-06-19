import fs from 'fs'
import { KML } from '../../src/og/layer/KML'

const readKml = (name) => {
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
        const xmlDoc = await readKml('./tests/layer/KML.styled.kml')
        const { entities, extent } = kml._convertKMLintoEntities(xmlDoc)
        expect(entities.length).toBe(1)
        expect(extent.northEast.lon).toBe(138.64)
        expect(extent.northEast.lat).toBe(-34.93)
        expect(extent.southWest.lon).toBe(138.62)
        expect(extent.southWest.lat).toBe(-34.94)
        const entity = entitie[0]
        expect(entity.properties.name).toBe('')
        expect(entity.polyline.thickness).toBe(5)
        const [c0, c1, c2, c3] = entity.polyline._defaultColor
        expect(c0).toBe(0.8784313797950745)
    })

})
