/* =============================================
   كالابريز (Calapres) — Theme JavaScript
   ============================================= */

'use strict';

// ---------- Mobile Menu ----------
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-menu-drawer');
  const overlay = document.querySelector('.mobile-menu-overlay');
  const closeBtn = document.querySelector('.mobile-menu-close');

  function openMenu() {
    drawer && drawer.classList.add('active');
    overlay && overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    toggle && toggle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    drawer && drawer.classList.remove('active');
    overlay && overlay.classList.remove('active');
    document.body.style.overflow = '';
    toggle && toggle.setAttribute('aria-expanded', 'false');
  }

  toggle && toggle.addEventListener('click', openMenu);
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  overlay && overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ---------- Cart AJAX ----------
(function () {
  function updateCartCount(count) {
    const counters = document.querySelectorAll('.cart-count');
    counters.forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  async function fetchCart() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      updateCartCount(cart.item_count);
      return cart;
    } catch (e) {
      console.error('Cart fetch error:', e);
    }
  }

  async function addToCart(variantId, quantity) {
    const btn = document.querySelector(`[data-variant-id="${variantId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: quantity || 1 }),
      });

      if (!res.ok) throw new Error('Add to cart failed');

      const cart = await fetchCart();
      showCartNotification();
      return cart;
    } catch (e) {
      console.error('Add to cart error:', e);
      showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.getAttribute('data-label') || 'أضف إلى السلة';
      }
    }
  }

  // Delegated add-to-cart
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const variantId = btn.dataset.variantId || btn.dataset.addToCart;
    if (variantId) addToCart(variantId, 1);
  });

  // Product form submit
  document.addEventListener('submit', function (e) {
    const form = e.target.closest('[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const variantInput = form.querySelector('[name="id"]');
    const qtyInput = form.querySelector('[name="quantity"]');
    if (variantInput) {
      addToCart(variantInput.value, qtyInput ? parseInt(qtyInput.value, 10) : 1);
    }
  });

  fetchCart();
})();

// ---------- Toast Notification ----------
function showToast(message, type) {
  const existing = document.querySelector('.calapres-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `calapres-toast calapres-toast--${type || 'success'}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: ${type === 'error' ? '#c0392b' : '#2d3a1e'};
    color: #f5f0e8;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: toastIn 0.3s ease;
    direction: rtl;
  `;

  const style = document.createElement('style');
  style.textContent = '@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3500);
}

function showCartNotification() {
  showToast('تمت إضافة المنتج إلى سلتك ✓', 'success');
}

// ---------- Cart Quantity Controls ----------
(function () {
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('[data-qty-change]');
    if (!btn) return;

    const input = btn.closest('.cart-item-qty')?.querySelector('.qty-input');
    if (!input) return;

    const lineItem = btn.closest('[data-line-key]');
    if (!lineItem) return;

    const key = lineItem.dataset.lineKey;
    let qty = parseInt(input.value, 10) || 1;
    const delta = parseInt(btn.dataset.qtyChange, 10);
    qty = Math.max(0, qty + delta);

    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty }),
      });
      if (res.ok) window.location.reload();
    } catch (e) {
      console.error('Cart change error:', e);
    }
  });
})();

// ---------- Product Image Gallery ----------
(function () {
  const mainImg = document.querySelector('[data-main-image]');
  const thumbnails = document.querySelectorAll('[data-thumbnail]');

  thumbnails.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      const src = thumb.dataset.thumbnail;
      const alt = thumb.querySelector('img')?.alt || '';
      if (mainImg && src) {
        mainImg.src = src;
        mainImg.alt = alt;
      }
      thumbnails.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
    });
  });
})();

// ---------- Variant Selector ----------
(function () {
  const variantButtons = document.querySelectorAll('[data-variant-option]');
  const variantIdInput = document.querySelector('[data-selected-variant]');
  const addBtn = document.querySelector('[data-add-to-cart-btn]');

  if (!variantButtons.length) return;

  variantButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const group = btn.dataset.optionGroup;
      document.querySelectorAll(`[data-option-group="${group}"]`).forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      updateSelectedVariant();
    });
  });

  function updateSelectedVariant() {
    const selected = {};
    document.querySelectorAll('[data-variant-option].active').forEach(function (btn) {
      selected[btn.dataset.optionGroup] = btn.dataset.optionValue;
    });

    const variantsData = document.querySelector('[data-variants-json]');
    if (!variantsData) return;

    let variants;
    try { variants = JSON.parse(variantsData.textContent); } catch (e) { return; }

    const match = variants.find(function (v) {
      return v.options.every(function (opt, i) {
        return selected[`option${i + 1}`] === opt;
      });
    });

    if (match) {
      if (variantIdInput) variantIdInput.value = match.id;
      if (addBtn) {
        addBtn.disabled = !match.available;
        addBtn.dataset.variantId = match.id;
        if (!match.available) {
          addBtn.textContent = 'نفذت الكمية';
        } else {
          addBtn.textContent = addBtn.dataset.label || 'أضف إلى السلة';
        }
      }

      const priceEl = document.querySelector('[data-product-price]');
      if (priceEl && match.price) {
        priceEl.textContent = (match.price / 100).toFixed(0) + ' ر.س';
      }
    }
  }
})();

// ---------- Filter Sidebar (Collection) ----------
(function () {
  const filterForm = document.querySelector('[data-filter-form]');
  if (!filterForm) return;

  filterForm.addEventListener('change', function () {
    const url = new URL(window.location.href);
    const formData = new FormData(filterForm);

    // Clear existing filter params
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('filter.') || key === 'sort_by') {
        url.searchParams.delete(key);
      }
    }

    for (const [key, value] of formData.entries()) {
      if (value) url.searchParams.append(key, value);
    }

    window.location.href = url.toString();
  });
})();

// ---------- Announcement Bar Close ----------
(function () {
  const bar = document.querySelector('.announcement-bar');
  const close = document.querySelector('.announcement-close');
  if (close && bar) {
    close.addEventListener('click', function () {
      bar.style.display = 'none';
      sessionStorage.setItem('announcement-closed', '1');
    });

    if (sessionStorage.getItem('announcement-closed')) {
      bar.style.display = 'none';
    }
  }
})();
