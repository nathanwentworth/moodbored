
var body;

var imageEls;
var lightbox;
var lbImg;
var lightboxVis;

var imgIndex;

window.addEventListener('load', function () {
  body = document.getElementsByTagName('body')[0];
  createLightbox();
});

let lightbox = function () {

  this.createLightbox() {
    lightbox = document.createElement('div');
    lightbox.classList.add('lightbox');
    lightbox.classList.add('lightbox-hidden');
    lightbox.addEventListener('click', function (event) {
      if (event.target == lightbox) {
        lightboxToggle();
      }
    });

    lbImg = document.createElement('img');
    lbImg.classList.add('zoomed-out');
    lbImg.id = 'lightbox-img';
    lbImg.src = '#!';

    var lbBtnL;
    lbBtnL = document.createElement('button');
    lbBtnL.innerText = '←';
    lbBtnL.id = 'lightbox-left';
    lbBtnL.addEventListener('click', function () {
      incrementIndex(1);
    });

    var lbBtnR;
    lbBtnR = document.createElement('button');
    lbBtnR.innerText = '→';
    lbBtnR.id = 'lightbox-right';
    lbBtnR.addEventListener('click', function () {
      incrementIndex(-1);
    });

    var lbBtnC;
    lbBtnC = document.createElement('button');
    lbBtnC.innerText = '╳';
    lbBtnC.id = 'lightbox-close';
    lbBtnC.addEventListener('click', function () {
      lightboxToggle();
    });

    lightbox.appendChild(lbImg);
    lightbox.appendChild(lbBtnL);
    lightbox.appendChild(lbBtnR);
    lightbox.appendChild(lbBtnC);
    body.appendChild(lightbox);

    document.addEventListener('keydown', function (event) {
      if (lightboxVis) {

        if (event.keyCode == 27) {
          lightboxToggle();
          return;
        }

        if (event.keyCode == 37 || event.keyCode == 65) {
          incrementIndex(-1);
        } else if (event.keyCode == 39 || event.keyCode == 68) {
          incrementIndex(1);
        }
      }
    });


  }

  var imageSrcs = []
  function getImages() {

    imageEls = document.getElementById('images').getElementsByTagName('img');
    lightboxVis = lightbox.classList.contains('lightbox-visible');

    for (var i = 0; i < imageEls.length; i++) {
      imageEls[i].addEventListener('click', function (event) {
        imgIndex = getIndex(event);
        console.log('imgIndex: ' + imgIndex + ', i ' + i);
        lightboxToggle();
      });
      imageSrcs[i] = imageEls[i].src;
    }

    console.log('images loaded');
  }

  this.getImage(img) {
    img.addEventListener('click', function (e) {
      imgIndex = getIndex(e);
      lightboxToggle();
      imageSrcs.push(this.src);
    })
  }

  function incrementIndex(amount) {
    imgIndex += amount;

    if (imgIndex < 0) {
      imgIndex = imageEls.length - 1;
    }

    if (imgIndex >= imageEls.length) {
      imgIndex = 0;
    }

    setLightboxImage(imgIndex);
  }

  function getIndex(event) {
    var target = event.target;

    for (var i = 0; i < imageEls.length; i++) {
      if (imageEls[i] == target) {
        console.log("index is " + i);
        return i;
      }
    }
  }

  function lightboxToggle() {
    if (lightboxVis) {
      lightboxVis = !lightbox.classList.toggle('lightbox-hidden');
      body.classList.remove('no-scroll');
    } else {
      lightboxVis = !lightbox.classList.toggle('lightbox-hidden');
      body.classList.add('no-scroll');

      setLightboxImage();
    }

    console.log('lightboxVis: ' + lightboxVis);
  }

  function setLightboxImage() {
    lbImg.src = imageSrcs[imgIndex];
  }

}
