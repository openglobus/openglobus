import { Billboard } from '../../src/og/entity/Billboard';
import { Entity } from '../../src/og/entity/Entity';
import { EntityCollection } from '../../src/og/entity/EntityCollection';
import { Geometry } from '../../src/og/entity/Geometry';
import { PointCloud } from '../../src/og/entity/PointCloud';
import { Polyline } from '../../src/og/entity/Polyline';
import { Ray } from '../../src/og/entity/Ray';
import { Strip } from '../../src/og/entity/Strip';
import { LonLat } from '../../src/og/LonLat';
import { Vec3 } from '../../src/og/math/Vec3';

test('Testing Entity', () => {
    let entity1 = new Entity({
        'label': {},
        'polyline': {},
        'billboard': {},
        'label': {},
        'ray': {},
        'strip': {},
        'visibility': true
    });

    let entity2 = new Entity();
    entity1.appendChild(entity2);

    expect(entity1).toBeTruthy();
    expect(entity1.getExtent()).toBeTruthy();
    expect(entity1.isEqual(entity1)).toBe(true);
    expect(entity1.isEqual(entity2)).toBe(false);


    entity1.setAltitude(100);
    expect(entity1.getAltitude()).toBe(100);

    entity1.setVisibility(false);
    expect(entity1.getVisibility()).toBe(false);

    expect(entity1.instanceName).toBe("Entity");
    expect(entity1.getCollectionIndex()).toBe(-1);


    let entityCollection = new EntityCollection();

    entity1.addTo(entityCollection, false);
    expect(entityCollection.getEntities().length).toBe(1);
    entity1.remove();
    expect(entityCollection.getEntities().length).toBe(0);

    let polyline = new Polyline();
    expect(entity1.setPolyline(polyline)).toBe(polyline);


    let vec3 = new Vec3(1, 1, 1);
    entity1.setCartesian3v(vec3);
    expect(entity1.getCartesian()).toStrictEqual(vec3);
    entity1.setCartesian(0, 0, 0);
    expect(entity1.getCartesian()).toStrictEqual(new Vec3(0, 0, 0));

    let lonlat = new LonLat(1, 1);
    entity1.setLonLat(lonlat);
    expect(entity1.getLonLat()).toStrictEqual(lonlat);

    let billboard = new Billboard();
    expect(entity1.setBillboard(billboard)).toStrictEqual(billboard);

    let ray = new Ray();
    expect(entity1.setRay(ray)).toStrictEqual(ray);


    let pointCloud = new PointCloud({
        'points': [
            [0, 0, 0, 255, 255, 255, 255, { 'name': 'White point' }],
            [100, 100, 0, 255, 0, 0, 255, { 'name': 'Red point' }]
        ]
    });
    expect(entity1.setPointCloud(pointCloud)).toStrictEqual(pointCloud);

    let strip = new Strip();
    expect(entity1.setStrip(strip)).toStrictEqual(strip);

});