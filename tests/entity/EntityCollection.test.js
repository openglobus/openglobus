import { Entity } from '../../src/og/entity/Entity';
import { EntityCollection } from '../../src/og/entity/EntityCollection';


test('Testing EntityCollection', () => {
    let entityCollection = new EntityCollection();

    entityCollection.setVisibility(true);
    expect(entityCollection.getVisibility()).toBe(true);


    entityCollection.setOpacity(10);
    expect(entityCollection.getOpacity()).toBe(10);

    let entity = new Entity();

    expect(entityCollection.addEntities([entity])).toBe(entityCollection);
    expect(entityCollection.belongs(entity)).toBe(true);
    entityCollection.removeEntity(entity);
    expect(entityCollection.belongs(entity)).toBeFalsy();
    entityCollection.addEntities([entity]);
    entityCollection.clear();
    expect(entityCollection.belongs(entity)).toBeFalsy();

    entityCollection.setScaleByDistance(1, 1, 1);

});