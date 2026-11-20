// Общие эффекты: появление при прокрутке, параллакс, счётчики. Уважает «уменьшить движение».
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function (e) { e.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e, i) {
      if (!e.style.getPropertyValue("--d")) e.style.setProperty("--d", (e.dataset.reveal || 0) + "ms");
      io.observe(e);
    });
  }

  var counters = document.querySelectorAll("[data-count]");
  var co = "IntersectionObserver" in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; co.unobserve(e.target);
      var el = e.target, to = +el.dataset.count, t0 = performance.now();
      if (reduce) { el.textContent = to; return; }
      (function step(t) { var k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
    });
  });
  counters.forEach(function (c) { co ? co.observe(c) : (c.textContent = c.dataset.count); });

  if (reduce) return;
  var px = [].slice.call(document.querySelectorAll("[data-parallax]"));
  if (!px.length) return;
  var ticking = false;
  function update() {
    var vh = innerHeight;
    px.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var k = parseFloat(el.dataset.parallax) || 0.1;
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -k).toFixed(1) + "px,0)" + (el.dataset.rot ? " rotate(" + el.dataset.rot + "deg)" : "");
    });
    ticking = false;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update); update();
})();
