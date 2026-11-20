// Общий помощник: превращает <div data-photo="имя"> в адаптивный <picture> (AVIF → WebP → JPEG)
// и строит галерею с фильтром по категориям. Работает и с file://, и на хостинге.
(function () {
  var base = document.currentScript.dataset.base || "photos/web/";
  var byName = {};
  (window.PHOTOS || []).forEach(function (p) { byName[p.name] = p; });

  function srcset(p, fmt) {
    return p.widths.map(function (w) { return base + p.name + "-" + w + "." + fmt + " " + w + "w"; }).join(", ");
  }
  function picture(p, sizes, alt, eager) {
    var jw = Math.min(960, p.widths[p.widths.length - 1]);
    return '<picture style="background-image:url(' + p.lqip + ')">' +
      '<source type="image/avif" srcset="' + srcset(p, "avif") + '" sizes="' + sizes + '">' +
      '<source type="image/webp" srcset="' + srcset(p, "webp") + '" sizes="' + sizes + '">' +
      '<img src="' + base + p.name + "-" + jw + '.jpg" sizes="' + sizes +
      '" width="' + p.w + '" height="' + p.h + '" alt="' + (alt || "") + '" ' +
      (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async" onload="this.parentNode.classList.add(\'is-loaded\')">' +
      "</picture>";
  }
  window.fzPicture = function (name, sizes, alt, eager) {
    var p = byName[name]; return p ? picture(p, sizes || "100vw", alt, eager) : "";
  };

  document.querySelectorAll("[data-photo]").forEach(function (el) {
    el.innerHTML = window.fzPicture(el.dataset.photo, el.dataset.sizes, el.dataset.alt || el.getAttribute("aria-label"), el.hasAttribute("data-eager"));
  });

  // Галерея: <div data-gallery data-sizes="..."></div> + <nav data-filters></nav>
  var g = document.querySelector("[data-gallery]");
  if (!g) return;
  var nav = document.querySelector("[data-filters]");
  var cats = window.CATEGORIES || {};
  function render(cat) {
    g.innerHTML = (window.PHOTOS || []).filter(function (p) { return cat === "all" ? !!cats[p.cat] : p.cat === cat; })
      .map(function (p) {
        return '<figure class="g-item" data-cat="' + p.cat + '">' + picture(p, g.dataset.sizes || "33vw", cats[p.cat]) +
          "<figcaption>" + (cats[p.cat] || "") + "</figcaption></figure>";
      }).join("");
  }
  if (nav) {
    var keys = ["all"].concat(Object.keys(cats));
    nav.innerHTML = keys.map(function (k, i) {
      return '<button type="button" data-cat="' + k + '" aria-pressed="' + (i === 0) + '">' + (k === "all" ? "Все" : cats[k]) + "</button>";
    }).join("");
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      nav.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      render(b.dataset.cat);
    });
  }
  render("all");
})();
