/* ============================================================
   CALAPRES — collection + cart behaviour
   (loads after calapres.js)
   ============================================================ */
(function () {
  /* ---------- Arabic-Indic numeral helpers ---------- */
  function toArabicDigits(str) {
    var map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(str).replace(/[0-9]/g, function (d) { return map[+d]; });
  }
  function groupThousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function money(amount) {
    var isAr = document.documentElement.lang === "ar";
    if (isAr) {
      var s = groupThousands(amount).replace(/,/g, "٬"); /* Arabic thousands sep */
      return toArabicDigits(s) + " ر.س";
    }
    return "SAR " + groupThousands(amount);
  }

  /* ============================================================
     COLLECTION FILTERING
     ============================================================ */
  function collection() {
    var grid = document.querySelector("[data-grid]");
    if (!grid) return;
    var cards = [].slice.call(grid.querySelectorAll(".pcard"));
    var original = cards.slice();
    var countEl = document.querySelector("[data-count]");
    var emptyEl = document.querySelector("[data-empty]");
    var moreWrap = document.querySelector("[data-more-wrap]");
    var loadMoreBtn = document.querySelector("[data-load-more]");
    var sortSel = document.querySelector("[data-sort]");
    var INITIAL = 6;
    var state = { expanded: false, sort: "featured", filters: {} };

    function activeFilterCount() {
      var n = 0;
      Object.keys(state.filters).forEach(function (g) { n += state.filters[g].length; });
      return n;
    }
    function matchesPrice(price, ranges) {
      return ranges.some(function (r) {
        var p = r.split("-"); var lo = +p[0], hi = +p[1];
        if (lo === 0) return price < 500;
        if (hi >= 99999) return price > 800;
        return price >= lo && price <= hi;
      });
    }
    function cardMatches(card) {
      var f = state.filters;
      for (var g in f) {
        if (!f[g].length) continue;
        if (g === "price") { if (!matchesPrice(+card.dataset.price, f[g])) return false; }
        else { if (f[g].indexOf(card.dataset[g]) === -1) return false; }
      }
      return true;
    }

    function apply() {
      /* sort the working list */
      var list = original.slice();
      if (state.sort === "low") list.sort(function (a, b) { return +a.dataset.price - +b.dataset.price; });
      else if (state.sort === "high") list.sort(function (a, b) { return +b.dataset.price - +a.dataset.price; });
      list.forEach(function (c) { grid.appendChild(c); });

      var matches = list.filter(cardMatches);
      var filtersOn = activeFilterCount() > 0;
      var showAll = filtersOn || state.expanded;
      var shown = 0;
      list.forEach(function (c) {
        var ok = cardMatches(c);
        var within = showAll ? ok : (ok && shown < INITIAL);
        if (ok && (showAll || shown < INITIAL)) shown++;
        c.classList.toggle("hidden", !within);
      });

      /* count */
      if (countEl) {
        var isAr = document.documentElement.lang === "ar";
        countEl.textContent = isAr
          ? toArabicDigits(matches.length) + " عطر"
          : matches.length + (matches.length === 1 ? " perfume" : " perfumes");
      }
      /* empty state */
      if (emptyEl) emptyEl.classList.toggle("show", matches.length === 0);
      grid.style.display = matches.length === 0 ? "none" : "";
      /* load-more visibility */
      var needMore = !showAll && matches.length > INITIAL;
      if (moreWrap) moreWrap.classList.toggle("hide", !needMore);
    }

    /* chip toggles */
    document.querySelectorAll(".chips").forEach(function (group) {
      var g = group.dataset.group;
      state.filters[g] = state.filters[g] || [];
      group.querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var v = chip.dataset.value;
          var arr = state.filters[g];
          var i = arr.indexOf(v);
          if (i === -1) { arr.push(v); chip.classList.add("on"); }
          else { arr.splice(i, 1); chip.classList.remove("on"); }
          apply();
        });
      });
    });

    /* clear all */
    var clearBtn = document.querySelector("[data-clear]");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      Object.keys(state.filters).forEach(function (g) { state.filters[g] = []; });
      document.querySelectorAll(".chip.on").forEach(function (c) { c.classList.remove("on"); });
      apply();
    });

    /* sort */
    if (sortSel) sortSel.addEventListener("change", function () { state.sort = sortSel.value; apply(); });

    /* load more */
    if (loadMoreBtn) loadMoreBtn.addEventListener("click", function () { state.expanded = true; apply(); });

    /* mobile filter toggle */
    var fToggle = document.querySelector("[data-filter-toggle]");
    var fPanel = document.querySelector("[data-filters]");
    if (fToggle && fPanel) fToggle.addEventListener("click", function () { fPanel.classList.toggle("open"); });

    /* favourite buttons (visual toggle, no navigation) */
    grid.querySelectorAll(".fav").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        b.classList.toggle("on");
        var svg = b.querySelector("svg");
        svg.style.fill = b.classList.contains("on") ? "currentColor" : "none";
      });
    });

    /* re-render localised count when language flips */
    document.addEventListener("calapres:lang", apply);

    /* localise the <select> option labels per language */
    function localiseSort() {
      var isAr = document.documentElement.lang === "ar";
      if (!sortSel) return;
      [].slice.call(sortSel.options).forEach(function (o) {
        o.textContent = isAr ? o.getAttribute("data-ar-text") : o.getAttribute("data-en-text");
      });
    }
    document.addEventListener("calapres:lang", localiseSort);
    localiseSort();

    apply();
  }

  /* ============================================================
     CART — qty steppers, remove, subtotal, empty state
     ============================================================ */
  function cartLogic() {
    var body = document.querySelector("[data-cart-body]");
    var empty = document.querySelector("[data-cart-empty]");
    var foot = document.querySelector("[data-cart-foot]");
    if (!body) return;

    function render() {
      var items = [].slice.call(body.querySelectorAll("[data-ci]"));
      var subtotal = 0;
      items.forEach(function (item) {
        var price = +item.dataset.price;
        var qty = +item.dataset.qty;
        var line = price * qty;
        subtotal += line;
        var qv = item.querySelector("[data-qv]");
        var lineEl = item.querySelector("[data-line]");
        if (qv) qv.textContent = document.documentElement.lang === "ar" ? toArabicDigits(qty) : qty;
        if (lineEl) lineEl.textContent = money(line);
      });
      var subEl = document.querySelector("[data-subtotal]");
      var totEl = document.querySelector("[data-total]");
      if (subEl) subEl.textContent = money(subtotal);
      if (totEl) totEl.textContent = money(subtotal);

      var isEmpty = items.length === 0;
      if (empty) empty.classList.toggle("show", isEmpty);
      if (foot) foot.style.display = isEmpty ? "none" : "";
      body.style.display = isEmpty ? "none" : "";
    }

    body.addEventListener("click", function (e) {
      var item = e.target.closest("[data-ci]");
      if (!item) return;
      if (e.target.closest("[data-inc]")) { item.dataset.qty = +item.dataset.qty + 1; render(); }
      else if (e.target.closest("[data-dec]")) { item.dataset.qty = Math.max(1, +item.dataset.qty - 1); render(); }
      else if (e.target.closest("[data-remove]")) { item.remove(); render(); }
    });

    document.addEventListener("calapres:lang", render);
    render();
  }

  function init() { collection(); cartLogic(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
