import { Globe } from '../src/og/Globe';

test('Testing Globe', () => {
    const globe = new Globe({ target: 'div' });
    expect(globe).toBeTruthy();
});
