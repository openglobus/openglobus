import { Material } from '../../src/og/layer/Material';

test('Testing Material', () => {
    const material = new Material('name', {});
    expect(material).toBeTruthy();
});
