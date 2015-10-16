var width = 256;
var height = 256;

var canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');

var canvasDst = document.createElement("canvas");
canvasDst.width = width;
canvasDst.height = height;
var contextDst = canvasDst.getContext('2d');

var img = new Image();

function main() {

    img.onload = function () {
        proceed();
    }

    img.src = "test.bmp";
};

function proceed() {
    context.drawImage(img, 0, 0);
    var imgd = context.getImageData(0, 0, width, height);

    var dest = new Array(width * height * 4);
    makeSDF(imgd.data, dest);

    var imageData = contextDst.createImageData(width, height);
    imageData.data.set(dest);
    contextDst.putImageData(imageData, 0, 0);

    document.body.appendChild(canvas);
    document.body.appendChild(canvasDst);
    
}
