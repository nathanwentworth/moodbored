var cta = document.getElementById('fixed-cta');
var ctaTop;

window.addEventListener('load', function () {
  ctaTop = GetElementTop(cta);
});

function GetElementTop(el) {
  var top = el.getBoundingClientRect().top + window.scrollY;
  console.log(top);
  return top;
}

window.addEventListener('resize', function() {
  requestAnimationFrame(function () {
    ctaTop = GetElementTop(cta);
  });
})

document.addEventListener('scroll', function() {
  requestAnimationFrame(function () {
    ScrollPos();
  });
})

function ScrollPos() {
  var scrollPos = window.scrollY;
  if (scrollPos >= ctaTop) {
    cta.classList.add('fixed');
  } else {
    cta.classList.remove('fixed');
  }
}
