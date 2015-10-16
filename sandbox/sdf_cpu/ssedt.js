var WIDTH = 256,
    HEIGHT = 256;

function DistSq(point) {
    return point.dx * point.dx + point.dy * point.dy;
};

var Point = function (x, y) {
    this.dx = x;
    this.dy = y;
    this.clone = function () {
        return new Point(this.dx, this.dy);
    }
};

var Grid = function () {
    this.grid = [];
    for (var y = 0; y < HEIGHT; y++) {
        this.grid[y] = [];
    }
};

var inside = new Point(0, 0);
var empty = new Point(9999, 9999);
var grid1 = new Grid();
var grid2 = new Grid();

var Get = function (g, x, y) {
    if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT)
        return g.grid[y][x].clone();
    else
        return empty.clone();
};

var Put = function (g, x, y, p) {
    g.grid[y][x] = p;
};

var Compare = function (g, p, x, y, offsetx, offsety) {
    var other = Get(g, x + offsetx, y + offsety);
    other.dx += offsetx;
    other.dy += offsety;

    if (DistSq(other) < DistSq(p)) {
        p.dx = other.dx;
        p.dy = other.dy;
    }
};

var GenerateSDF = function (g) {
    // Pass 0
    for (var y = 0; y < HEIGHT; y++) {
        for (var x = 0; x < WIDTH; x++) {
            var p = Get(g, x, y);
            Compare(g, p, x, y, -1, 0);
            Compare(g, p, x, y, 0, -1);
            Compare(g, p, x, y, -1, -1);
            Compare(g, p, x, y, 1, -1);
            Put(g, x, y, p);
        }

        for (var x = WIDTH - 1; x >= 0; x--) {
            var p = Get(g, x, y);
            Compare(g, p, x, y, 1, 0);
            Put(g, x, y, p);
        }
    }

    // Pass 1
    for (var y = HEIGHT - 1; y >= 0; y--) {
        for (var x = WIDTH - 1; x >= 0; x--) {
            var p = Get(g, x, y);
            Compare(g, p, x, y, 1, 0);
            Compare(g, p, x, y, 0, 1);
            Compare(g, p, x, y, -1, 1);
            Compare(g, p, x, y, 1, 1);
            Put(g, x, y, p);
        }

        for (var x = 0; x < WIDTH; x++) {
            var p = Get(g, x, y);
            Compare(g, p, x, y, -1, 0);
            Put(g, x, y, p);
        }
    }
}

function makeSDF(data, dest) {

    for (var y = 0; y < HEIGHT; y++) {
        for (var x = 0; x < WIDTH; x++) {
            var r, g, b;

            g = data[(y * WIDTH + x) * 4 + 1];

            if (g < 128) {
                Put(grid1, x, y, inside);
                Put(grid2, x, y, empty);
            } else {
                Put(grid2, x, y, inside);
                Put(grid1, x, y, empty);
            }
        }
    }

    GenerateSDF(grid1);
    GenerateSDF(grid2);

    for (var y = 0; y < HEIGHT; y++) {
        for (var x = 0; x < WIDTH; x++) {

            // Calculate the actual distance from the dx/dy
            var dist1 = parseInt(Math.sqrt(DistSq(Get(grid1, x, y))));
            var dist2 = parseInt(Math.sqrt(DistSq(Get(grid2, x, y))));
            var dist = dist1 - dist2;

            // Clamp and scale it, just for display purposes.
            var c = dist * 3 + 128;
            if (c < 0) c = 0;
            if (c > 255) c = 255;

            var ind = (y * WIDTH + x) * 4;
            dest[ind] = c;
            dest[ind + 1] = c;
            dest[ind + 2] = c;
            dest[ind + 3] = 255;
        }
    }
};
