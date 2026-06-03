/* ============================================================
   CALAPRES — shared behaviour + Shopify AJAX cart
   Language (AR/EN + RTL), scroll motion, header, drawer, cart
   ============================================================ */
(function () {
  var root = document.documentElement;

  /* ---- Language ---- */
  function setLang(lang, persist) {
    var isAr = lang === "ar";
    root.lang = lang;
    root.dir = isAr ? "rtl" : "ltr";
    if (persist !== false) {
      try { localStorage.setItem("calapres-lang", lang); } catch (e) {}
    }
    document.querySelectorAll("[data-lang-label]").forEach(function (el) {
      el.textContent = isAr ? "EN" : "العربية";
    });
    document.dispatchEvent(new CustomEvent("calapres:lang", { detail: { lang: lang } }));
  }
  window.calapresSetLang = setLang;

  var stored = "ar";
  try { stored = localStorage.getItem("calapres-lang") || "ar"; } catch (e) {}
  setLang(stored, false);

  function bindToggles() {
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(root.lang === "ar" ? "en" : "ar");
      });
    });
  }

  /* ---- Header: transparent over hero, solid on scroll ---- */
  function header() {
    var h = document.querySelector(".site-header");
    if (!h) return;
    if (h.hasAttribute("data-header-solid")) { h.classList.add("solid"); return; }
    var hero = document.querySelector("[data-hero-sentinel]");
    function onScroll() {
      var threshold = hero ? hero.offsetHeight - 90 : 90;
      h.classList.toggle("solid", window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Reveal on scroll ---- */
  function reveal() {
    var els = [].slice.call(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    function show(el) {
      el.style.opacity = "1"; el.style.transform = "none";
      setTimeout(function () { el.style.transition = "none"; }, 1000);
    }
    function revealAll() { els.forEach(show); els.length = 0; }
    function check() {
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!vh) { revealAll(); return; }
      for (var i = els.length - 1; i >= 0; i--) {
        var r = els[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > -40) { show(els[i]); els.splice(i, 1); }
      }
    }
    check();
    requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    setTimeout(revealAll, 2200);
  }

  /* ---- Mobile drawer ---- */
  function drawer() {
    var openBtn = document.querySelector("[data-drawer-open]");
    var d = document.querySelector(".drawer");
    if (!openBtn || !d) return;
    function open() { d.classList.add("open"); document.body.style.overflow = "hidden"; }
    function close() { d.classList.remove("open"); document.body.style.overflow = ""; }
    openBtn.addEventListener("click", open);
    d.querySelectorAll("[data-drawer-close]").forEach(function (b) { b.addEventListener("click", close); });
    d.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---- Horizontal rail ---- */
  function rails() {
    document.querySelectorAll("[data-rail]").forEach(function (wrap) {
      var track = wrap.querySelector(".rail");
      if (!track) return;
      var prev = wrap.querySelector("[data-rail-prev]");
      var next = wrap.querySelector("[data-rail-next]");
      function step() { return Math.max(track.clientWidth * 0.8, 320); }
      function dir() { return document.documentElement.dir === "rtl" ? -1 : 1; }
      if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step() * dir(), behavior: "smooth" }); });
      if (next) next.addEventListener("click", function () { track.scrollBy({ left: step() * dir(), behavior: "smooth" }); });
    });
  }

  /* ---- Shopify AJAX Cart ---- */
  function toArabicDigits(str) {
    var map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(str).replace(/[0-9]/g, function (d) { return map[+d]; });
  }
  function groupThousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function money(cents) {
    var amount = Math.round(cents / 100);
    var isAr = root.lang === "ar";
    if (isAr) {
      var s = groupThousands(amount).replace(/,/g, "٬");
      return toArabicDigits(s) + " ر.س";
    }
    return "SAR " + groupThousands(amount);
  }

  function updateCartCount(count) {
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = root.lang === "ar" ? toArabicDigits(count) : count;
      el.style.display = count > 0 ? "" : "none";
    });
  }

  async function fetchCart() {
    try {
      var res = await fetch("/cart.js");
      var cart = await res.json();
      updateCartCount(cart.item_count);
      renderCartPanel(cart);
      return cart;
    } catch (e) { console.error("Cart fetch:", e); }
  }

  function renderCartPanel(cart) {
    var body = document.querySelector("[data-cart-body]");
    var emptyEl = document.querySelector("[data-cart-empty]");
    var footEl = document.querySelector("[data-cart-foot]");
    var subtotalEl = document.querySelector("[data-subtotal]");
    var totalEl = document.querySelector("[data-total]");
    if (!body) return;

    if (cart.item_count === 0) {
      body.innerHTML = "";
      if (emptyEl) emptyEl.classList.add("show");
      if (footEl) footEl.style.display = "none";
      return;
    }
    if (emptyEl) emptyEl.classList.remove("show");
    if (footEl) footEl.style.display = "";

    body.innerHTML = cart.items.map(function (item) {
      var img = item.featured_image && item.featured_image.url
        ? '<img src="' + item.featured_image.url + '" alt="" />'
        : '';
      return '<div class="cart-item" data-ci data-key="' + item.key + '" data-price="' + item.final_price + '" data-qty="' + item.quantity + '">' +
        '<div class="ci-img">' + img + '</div>' +
        '<div class="ci-meta">' +
          '<div class="ci-top">' +
            '<div>' +
              '<div class="ci-brand">' + (item.vendor || '') + '</div>' +
              '<div class="name">' + item.product_title + '</div>' +
              (item.variant_title && item.variant_title !== 'Default Title' ? '<div class="ci-size">' + item.variant_title + '</div>' : '') +
            '</div>' +
            '<button class="ci-remove" data-remove aria-label="إزالة"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
          '</div>' +
          '<div class="ci-bottom">' +
            '<div class="qty"><button data-dec aria-label="إنقاص">−</button><span data-qv>' + (root.lang === 'ar' ? toArabicDigits(item.quantity) : item.quantity) + '</span><button data-inc aria-label="زيادة">+</button></div>' +
            '<div class="ci-price" data-line>' + money(item.final_line_price) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
    '<div class="cart-addon">' +
      '<div class="addon-row"><span><span data-ar>عيّنة اكتشاف ٢ مل مرفقة</span><span data-en>2ml discovery sample included</span></span><span class="muted small"><span data-ar>مجانًا</span><span data-en>Free</span></span></div>' +
      '<div class="addon-row"><span><span data-ar>بطاقة الأصالة مرفقة</span><span data-en>Authenticity card included</span></span><span class="muted small"><span data-ar>مجانًا</span><span data-en>Free</span></span></div>' +
    '</div>';

    if (subtotalEl) subtotalEl.textContent = money(cart.total_price);
    if (totalEl) totalEl.textContent = money(cart.total_price);

    // Re-run lang swap for newly inserted data-ar/data-en spans
    setLang(root.lang, false);
  }

  async function addToCart(variantId, qty) {
    try {
      var res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: qty || 1 })
      });
      if (!res.ok) { var err = await res.json(); throw new Error(err.description || "Add failed"); }
      var cart = await fetchCart();
      openCart();
      return cart;
    } catch (e) {
      alert(root.lang === "ar" ? "حدث خطأ: " + e.message : "Error: " + e.message);
    }
  }

  async function changeCart(key, qty) {
    try {
      var res = await fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key, quantity: qty })
      });
      if (!res.ok) throw new Error("Change failed");
      await fetchCart();
    } catch (e) { console.error("Cart change:", e); }
  }

  /* ---- Cart slide-over open/close ---- */
  function openCart() {
    var overlay = document.querySelector("[data-cart]");
    if (overlay) { overlay.classList.add("open"); document.body.style.overflow = "hidden"; }
  }
  function closeCart() {
    var overlay = document.querySelector("[data-cart]");
    if (overlay) { overlay.classList.remove("open"); document.body.style.overflow = ""; }
  }

  function cart() {
    var cartEl = document.querySelector("[data-cart]");
    if (!cartEl) return;
    document.querySelectorAll("[data-cart-open]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); openCart(); });
    });
    cartEl.querySelectorAll("[data-cart-close]").forEach(function (b) {
      b.addEventListener("click", closeCart);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });

    /* delegated qty / remove */
    var body = cartEl.querySelector("[data-cart-body]");
    if (body) {
      body.addEventListener("click", async function (e) {
        var item = e.target.closest("[data-ci]");
        if (!item) return;
        var key = item.dataset.key;
        var qty = +item.dataset.qty;
        if (e.target.closest("[data-inc]")) { item.dataset.qty = qty + 1; await changeCart(key, qty + 1); }
        else if (e.target.closest("[data-dec]")) { item.dataset.qty = Math.max(1, qty - 1); await changeCart(key, Math.max(1, qty - 1)); }
        else if (e.target.closest("[data-remove]")) { await changeCart(key, 0); }
      });
    }
  }

  /* ---- "Add to bag" delegated handler ---- */
  function addToBagListeners() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-add-to-bag]");
      if (!btn) return;
      e.preventDefault();
      var variantId = btn.dataset.variantId || btn.dataset.addToBag;
      if (variantId) addToCart(variantId, 1);
    });

    document.addEventListener("submit", function (e) {
      var form = e.target.closest("[data-product-form]");
      if (!form) return;
      e.preventDefault();
      var vid = form.querySelector("[name='id']");
      var qty = form.querySelector("[name='quantity']");
      if (vid) addToCart(vid.value, qty ? parseInt(qty.value, 10) : 1);
    });
  }

  /* ---- Collection page ---- */
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
      var list = original.slice();
      if (state.sort === "low") list.sort(function (a, b) { return +a.dataset.price - +b.dataset.price; });
      else if (state.sort === "high") list.sort(function (a, b) { return +b.dataset.price - +a.dataset.price; });
      list.forEach(function (c) { grid.appendChild(c); });
      var matches = list.filter(cardMatches);
      var showAll = (activeFilterCount() > 0) || state.expanded;
      var shown = 0;
      list.forEach(function (c) {
        var ok = cardMatches(c);
        var within = showAll ? ok : (ok && shown < INITIAL);
        if (ok && (showAll || shown < INITIAL)) shown++;
        c.classList.toggle("hidden", !within);
      });
      if (countEl) {
        var isAr = root.lang === "ar";
        countEl.textContent = isAr
          ? toArabicDigits(matches.length) + " عطر"
          : matches.length + (matches.length === 1 ? " perfume" : " perfumes");
      }
      if (emptyEl) emptyEl.classList.toggle("show", matches.length === 0);
      grid.style.display = matches.length === 0 ? "none" : "";
      if (moreWrap) moreWrap.classList.toggle("hide", !((!showAll) && matches.length > INITIAL));
    }
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
    var clearBtn = document.querySelector("[data-clear]");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      Object.keys(state.filters).forEach(function (g) { state.filters[g] = []; });
      document.querySelectorAll(".chip.on").forEach(function (c) { c.classList.remove("on"); });
      apply();
    });
    if (sortSel) sortSel.addEventListener("change", function () { state.sort = sortSel.value; apply(); });
    if (loadMoreBtn) loadMoreBtn.addEventListener("click", function () { state.expanded = true; apply(); });
    var fToggle = document.querySelector("[data-filter-toggle]");
    var fPanel = document.querySelector("[data-filters]");
    if (fToggle && fPanel) fToggle.addEventListener("click", function () { fPanel.classList.toggle("open"); });
    grid.querySelectorAll(".fav").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        b.classList.toggle("on");
        var svg = b.querySelector("svg");
        if (svg) svg.style.fill = b.classList.contains("on") ? "currentColor" : "none";
      });
    });
    function localiseSort() {
      if (!sortSel) return;
      var isAr = root.lang === "ar";
      [].slice.call(sortSel.options).forEach(function (o) {
        o.textContent = isAr ? o.getAttribute("data-ar-text") : o.getAttribute("data-en-text");
      });
    }
    document.addEventListener("calapres:lang", localiseSort);
    document.addEventListener("calapres:lang", apply);
    localiseSort();
    apply();
  }

  /* ---- Product page: thumbnails + size selector + accordion ---- */
  function productPage() {
    var mainImg = document.getElementById("main-img");
    document.querySelectorAll(".thumbs button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".thumbs button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        if (mainImg) mainImg.src = b.getAttribute("data-src");
      });
    });

    document.querySelectorAll(".size-opt").forEach(function (o) {
      o.addEventListener("click", function () {
        document.querySelectorAll(".size-opt").forEach(function (x) { x.classList.remove("on"); });
        o.classList.add("on");
        var priceAr = o.dataset.priceAr;
        var priceEn = o.dataset.priceEn;
        var priceEl = document.getElementById("pdp-price");
        if (priceEl && priceAr) {
          priceEl.innerHTML = '<span data-ar>' + priceAr + '</span><span data-en>' + priceEn + '</span>';
          setLang(root.lang, false);
        }
        var vidInput = document.querySelector("[name='id']");
        if (vidInput && o.dataset.variantId) vidInput.value = o.dataset.variantId;
      });
    });

    var acc = document.querySelector("[data-accordion]");
    if (acc) {
      var items = [].slice.call(acc.querySelectorAll(".acc-item"));
      items.forEach(function (item) {
        item.querySelector(".acc-head").addEventListener("click", function () {
          var isOpen = item.classList.contains("open");
          items.forEach(function (o) { o.classList.remove("open"); });
          if (!isOpen) item.classList.add("open");
        });
      });
    }
  }

  function init() {
    bindToggles(); header(); reveal(); drawer(); rails(); cart();
    addToBagListeners(); collection(); productPage();
    fetchCart();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
