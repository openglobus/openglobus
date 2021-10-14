import { Label } from "../../src/og/entity/Label";
import { Vec4 } from "../../src/og/math/Vec4";
import { FontAtlas } from "../../src/og/utils/FontAtlas";
test('Testing Label', () => {
    let label = new Label();

    label.setText("test");
    expect(label.getText()).toBe("test");

    label.setAlign('left');
    expect(label.getAlign()).toBe(1);

    label.setFace('arial');
    expect(label.getFace()).toBe('arial');

    label.setSize(200);
    expect(label.getSize()).toBe(200);

    label.setOutline(0.5);
    expect(label.getOutline()).toBe(0.5);

    label.setOpacity(0);
    label.setOutlineColor(255, 255, 255, 255);
    label.setOutlineColor4v(new Vec4(0, 0, 0, 0));
    label.setOutlineColorHTML('red');
    expect(label.getOutlineColor()).toStrictEqual(new Vec4(1, 0, 0, 1));

    label.setOutlineOpacity(1);
    expect(label.getOutlineOpacity()).toBe(1);

    label.assignFontAtlas(new FontAtlas());
    label.update();
});