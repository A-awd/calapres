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
    localizeStaticMoney();
    localizeStaticNumbers();
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

  /* ---- Opening delivery popup ---- */
  function announcement() {
    var popup = document.querySelector("[data-announcement-popup]");
    if (!popup) return;
    var seen = false;
    try { seen = sessionStorage.getItem("calapres-delivery-popup") === "seen"; } catch (e) {}
    function close() {
      popup.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { popup.hidden = true; }, 420);
      try { sessionStorage.setItem("calapres-delivery-popup", "seen"); } catch (e) {}
    }
    if (!seen) {
      popup.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(function () { popup.classList.add("open"); });
    }
    popup.querySelectorAll("[data-announcement-close]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && popup.classList.contains("open")) close(); });
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
    var amount = Number(cents || 0) / 100;
    var parts = amount.toFixed(2).split(".");
    var isAr = root.lang === "ar";
    if (isAr) {
      var s = groupThousands(parts[0]).replace(/,/g, "٬") + "٫" + parts[1];
      return toArabicDigits(s) + " ر.س";
    }
    return "SAR " + groupThousands(parts[0]) + "." + parts[1];
  }

  function localizeStaticMoney() {
    document.querySelectorAll("[data-money-cents]").forEach(function (el) {
      el.textContent = money(el.getAttribute("data-money-cents"));
    });
    document.querySelectorAll("[data-product-price-cents]").forEach(function (el) {
      el.dataset.productPrice = money(el.getAttribute("data-product-price-cents"));
    });
  }

  function localizeStaticNumbers() {
    document.querySelectorAll("[data-local-number]").forEach(function (el) {
      var value = el.getAttribute("data-local-number") || el.textContent || "";
      el.textContent = root.lang === "ar" ? toArabicDigits(value) : value;
    });
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
              (item.variant_title && item.variant_title !== 'Default Title' && item.variant_title !== 'Default' ? '<div class="ci-size">' + item.variant_title + '</div>' : '') +
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
          ? toArabicDigits(matches.length) + " منتج"
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

  /* ---- Wishlist: local saved products ---- */
  var WISHLIST_KEY = "calapres-wishlist";
  function wishlistRead() {
    try {
      var parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.url; }) : [];
    } catch (e) { return []; }
  }
  function wishlistWrite(items) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function productFromElement(el) {
    var source = el.closest("[data-product-url]") || el;
    return {
      title: source.dataset.productTitle || source.querySelector(".name")?.textContent?.trim() || "",
      url: source.dataset.productUrl || source.getAttribute("href") || location.pathname,
      image: source.dataset.productImage || "",
      price: source.dataset.productPriceCents ? money(source.dataset.productPriceCents) : source.dataset.productPrice || source.querySelector(".price")?.textContent?.trim() || "",
      priceCents: source.dataset.productPriceCents || "",
      brand: source.dataset.productBrand || source.dataset.brand || source.querySelector(".brand")?.textContent?.trim() || ""
    };
  }
  function wishlistContains(url) {
    return wishlistRead().some(function (item) { return item.url === url; });
  }
  function wishlistSetButton(button, active) {
    button.classList.toggle("on", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    var svg = button.querySelector("svg");
    if (svg) svg.style.fill = active ? "currentColor" : "none";
  }
  function wishlistUpdateButtons() {
    document.querySelectorAll("[data-wishlist-toggle], [data-wishlist-add]").forEach(function (button) {
      wishlistSetButton(button, wishlistContains(productFromElement(button).url));
    });
  }
  function wishlistUpdateCount() {
    var count = wishlistRead().length;
    document.querySelectorAll("[data-wishlist-count]").forEach(function (el) {
      el.textContent = root.lang === "ar" ? toArabicDigits(count) : count;
      el.style.display = count > 0 ? "inline-flex" : "none";
    });
  }
  function wishlistRender() {
    var overlay = document.querySelector("[data-wishlist]");
    if (!overlay) return;
    var body = overlay.querySelector("[data-wishlist-body]");
    var empty = overlay.querySelector("[data-wishlist-empty]");
    var items = wishlistRead();
    if (!body) return;
    if (!items.length) {
      body.innerHTML = "";
      if (empty) empty.classList.add("show");
      return;
    }
    if (empty) empty.classList.remove("show");
    body.innerHTML = items.map(function (item) {
      var url = escapeHtml(item.url || "");
      var image = escapeHtml(item.image || "");
      var brand = escapeHtml(item.brand || "");
      var title = escapeHtml(item.title || "");
      var price = escapeHtml(item.priceCents ? money(item.priceCents) : item.price || "");
      return '<div class="wishlist-item">' +
        '<a class="wishlist-img" href="' + url + '">' + (image ? '<img src="' + image + '" alt="" />' : '') + '</a>' +
        '<div class="wishlist-meta">' +
          '<div class="wishlist-brand">' + brand + '</div>' +
          '<a class="wishlist-name" href="' + url + '">' + title + '</a>' +
          '<div class="wishlist-price">' + price + '</div>' +
        '</div>' +
        '<button class="wishlist-remove" type="button" data-wishlist-remove="' + url + '" aria-label="إزالة"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</div>';
    }).join("");
    setLang(root.lang, false);
  }
  function wishlistOpen() {
    var overlay = document.querySelector("[data-wishlist]");
    if (!overlay) return;
    wishlistRender();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function wishlistClose() {
    var overlay = document.querySelector("[data-wishlist]");
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  function wishlistToggleProduct(product) {
    if (!product.url) return;
    var items = wishlistRead();
    var exists = items.some(function (item) { return item.url === product.url; });
    if (exists) items = items.filter(function (item) { return item.url !== product.url; });
    else items.unshift(product);
    wishlistWrite(items.slice(0, 24));
    wishlistUpdateCount();
    wishlistUpdateButtons();
    wishlistRender();
  }
  function wishlist() {
    document.querySelectorAll("[data-wishlist-open]").forEach(function (button) {
      button.addEventListener("click", function (e) { e.preventDefault(); wishlistOpen(); });
    });
    document.querySelectorAll("[data-wishlist-close]").forEach(function (button) {
      button.addEventListener("click", wishlistClose);
    });
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-wishlist-toggle], [data-wishlist-add]");
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        wishlistToggleProduct(productFromElement(toggle));
        if (toggle.hasAttribute("data-wishlist-add")) wishlistOpen();
        return;
      }
      var remove = e.target.closest("[data-wishlist-remove]");
      if (remove) {
        e.preventDefault();
        wishlistToggleProduct({ url: remove.getAttribute("data-wishlist-remove") });
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") wishlistClose(); });
    document.addEventListener("calapres:lang", wishlistUpdateCount);
    wishlistUpdateCount();
    wishlistUpdateButtons();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
        var priceCents = o.dataset.priceCents;
        var priceEl = document.getElementById("pdp-price");
        if (priceEl && priceCents) {
          priceEl.innerHTML = '<span data-money-cents="' + priceCents + '">' + money(priceCents) + '</span>';
          localizeStaticMoney();
          setLang(root.lang, false);
        }
        var vidInput = document.querySelector("[name='id']");
        if (vidInput && o.dataset.variantId) vidInput.value = o.dataset.variantId;
        document.querySelectorAll("[data-add-to-bag]").forEach(function (btn) {
          if (o.dataset.variantId) {
            btn.dataset.variantId = o.dataset.variantId;
            btn.dataset.addToBag = o.dataset.variantId;
          }
        });
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
    bindToggles(); announcement(); header(); reveal(); drawer(); rails(); cart(); wishlist();
    addToBagListeners(); collection(); productPage();
    fetchCart();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
