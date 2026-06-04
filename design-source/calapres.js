/* ============================================================
   CALAPRES — shared behaviour
   Language (AR/EN + RTL), scroll motion, header, drawer
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

  /* ---- Reveal on scroll (rect-based; deterministic) ---- */
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
      if (!vh) { revealAll(); return; } // offscreen/capture context: show everything
      for (var i = els.length - 1; i >= 0; i--) {
        var r = els[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > -40) { show(els[i]); els.splice(i, 1); }
      }
    }
    check();
    requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    // safety: never leave content hidden
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
  }

  /* ---- Mega menu (click/hover via JS for reliability) ---- */
  function megaMenu() {
    document.querySelectorAll("[data-mega]").forEach(function (item) {
      var panel = item.querySelector(".mega-panel");
      if (!panel) return;
      var t;
      item.addEventListener("mouseenter", function () { clearTimeout(t); item.classList.add("open"); });
      item.addEventListener("mouseleave", function () { t = setTimeout(function(){ item.classList.remove("open"); }, 120); });
    });
  }

  /* ---- Cart slide-over (optional, present if markup exists) ---- */
  function cart() {
    var cartEl = document.querySelector("[data-cart]");
    if (!cartEl) return;
    function open() { cartEl.classList.add("open"); document.body.style.overflow = "hidden"; }
    function close() { cartEl.classList.remove("open"); document.body.style.overflow = ""; }
    document.querySelectorAll("[data-cart-open]").forEach(function (b){ b.addEventListener("click", function(e){ e.preventDefault(); open(); }); });
    cartEl.querySelectorAll("[data-cart-close]").forEach(function (b){ b.addEventListener("click", close); });
  }

  /* ---- Horizontal rail (new arrivals) ---- */
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

  function init() {
    bindToggles(); header(); reveal(); drawer(); megaMenu(); cart(); rails();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
