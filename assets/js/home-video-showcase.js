(function () {
  "use strict";

  document.querySelectorAll("[data-home-video-carousel]").forEach(function (carousel) {
    var viewport = carousel.querySelector("[data-home-video-viewport]");
    var cards = Array.prototype.slice.call(carousel.querySelectorAll("[data-home-video-card]"));
    var previous = carousel.querySelector("[data-home-video-prev]");
    var next = carousel.querySelector("[data-home-video-next]");
    var controls = carousel.querySelector("[data-home-video-controls]");

    if (!viewport || cards.length < 2 || !previous || !next) return;

    function cardStep() {
      return cards[1].offsetLeft - cards[0].offsetLeft;
    }

    function update() {
      var maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      previous.disabled = viewport.scrollLeft <= 4;
      next.disabled = viewport.scrollLeft >= maximum - 4;
      if (controls) controls.hidden = maximum <= 4;
    }

    previous.addEventListener("click", function () {
      viewport.scrollBy({ left: -cardStep(), behavior: "smooth" });
    });

    next.addEventListener("click", function () {
      viewport.scrollBy({ left: cardStep(), behavior: "smooth" });
    });

    viewport.addEventListener("scroll", function () {
      window.requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener("resize", update);
    update();
  });
}());
