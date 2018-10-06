module.exports = {
  elem: document.getElementById('lightbox'),
  img: document.getElementById('lightboxImg'),
  index: 0,
  setImg: function (_img) {
    this.img.src = _img.src;
    ToggleSection(this.elem);
  },
  increment: function (amount) {
    this.index += amount;
    if (this.index < 0) {
      this.index = imageElements.length - 1;
    } else if (this.index >= imageElements.length) {
      this.index = 0;
    }
    this.img.src = imageElements[this.index].src;
  }
}
