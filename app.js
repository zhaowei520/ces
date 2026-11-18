/* =========================================================
   拾光集市 · 交互
   功能：分类筛选 / 搜索 / 收藏 / 加购 / 购物车抽屉 / 免邮提示 / 结算 Toast
   ========================================================= */
(function () {
  'use strict';

  var FREE_SHIPPING = 199;
  var COUPON_AMOUNT = 30;
  var CART_KEY = 'shiguang.cart.v1';
  var FAV_KEY = 'shiguang.favorites.v1';

  var PRODUCTS = [
    { id: 1, name: '云朵陶瓷马克杯', category: '家居', price: 69, originalPrice: 89, emoji: '☕', badge: '热卖', gradient: 'linear-gradient(135deg,#ffe8d6,#ffc9a8)' },
    { id: 2, name: '木质香薰蜡烛', category: '家居', price: 128, originalPrice: 158, emoji: '🕯️', badge: '', gradient: 'linear-gradient(135deg,#efe4d2,#d9c3a5)' },
    { id: 3, name: '无线降噪耳机', category: '数码', price: 499, originalPrice: 599, emoji: '🎧', badge: '新品', gradient: 'linear-gradient(135deg,#e3ecf7,#c3d6ee)' },
    { id: 4, name: '便携手冲咖啡壶', category: '数码', price: 259, originalPrice: 0, emoji: '🫖', badge: '', gradient: 'linear-gradient(135deg,#e6efe8,#c6ddcc)' },
    { id: 5, name: '亚麻宽松衬衫', category: '穿搭', price: 329, originalPrice: 399, emoji: '👕', badge: '', gradient: 'linear-gradient(135deg,#f1eef8,#d9d2ee)' },
    { id: 6, name: '帆布托特包', category: '穿搭', price: 189, originalPrice: 0, emoji: '👜', badge: '', gradient: 'linear-gradient(135deg,#fbeee0,#eddcc4)' },
    { id: 7, name: '手作曲奇礼盒', category: '食品', price: 89, originalPrice: 109, emoji: '🍪', badge: '限量', gradient: 'linear-gradient(135deg,#fdeede,#f3d6b3)' },
    { id: 8, name: '冷萃咖啡液', category: '食品', price: 99, originalPrice: 0, emoji: '🧊', badge: '', gradient: 'linear-gradient(135deg,#e7eef2,#c9dbe4)' },
    { id: 9, name: '折叠落地阅读灯', category: '家居', price: 239, originalPrice: 299, emoji: '💡', badge: '', gradient: 'linear-gradient(135deg,#fdf3d8,#f0dfa8)' },
    { id: 10, name: '轻薄机械键盘', category: '数码', price: 459, originalPrice: 0, emoji: '⌨️', badge: '新品', gradient: 'linear-gradient(135deg,#e8eaf0,#cdd2df)' }
  ];

  var CATEGORIES = ['全部', '家居', '数码', '穿搭', '食品'];

  var state = {
    category: '全部',
    keyword: '',
    cart: new Map(),
    favorites: new Set()
  };

  var els = {
    grid: document.getElementById('product-grid'),
    chips: document.getElementById('category-chips'),
    count: document.getElementById('result-count'),
    search: document.getElementById('search-input'),
    badge: document.getElementById('cart-badge'),
    cartOpen: document.getElementById('cart-open'),
    drawer: document.getElementById('cart-drawer'),
    overlay: document.getElementById('overlay'),
    cartClose: document.getElementById('cart-close'),
    cartItems: document.getElementById('cart-items'),
    cartTotal: document.getElementById('cart-total'),
    shipHint: document.getElementById('ship-hint'),
    checkout: document.getElementById('checkout'),
    toast: document.getElementById('toast')
  };

  var moneyFormatter = new Intl.NumberFormat('zh-CN');
  var lastFocused = null;
  var toastTimer = null;

  /* ---------------- 工具函数 ---------------- */

  function formatMoney(value) {
    return '¥' + moneyFormatter.format(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* 隐私模式下不可写，忽略即可 */
    }
  }

  function saveCart() {
    var plain = [];
    state.cart.forEach(function (qty, id) {
      plain.push([id, qty]);
    });
    writeJSON(CART_KEY, plain);
  }

  function saveFavorites() {
    writeJSON(FAV_KEY, Array.from(state.favorites));
  }

  function restoreState() {
    var savedCart = readJSON(CART_KEY, []);
    if (Array.isArray(savedCart)) {
      savedCart.forEach(function (entry) {
        if (!Array.isArray(entry)) return;
        var id = Number(entry[0]);
        var qty = Number(entry[1]);
        if (findProduct(id) && qty > 0) state.cart.set(id, qty);
      });
    }

    var savedFavorites = readJSON(FAV_KEY, []);
    if (Array.isArray(savedFavorites)) {
      savedFavorites.forEach(function (id) {
        var numericId = Number(id);
        if (findProduct(numericId)) state.favorites.add(numericId);
      });
    }
  }

  /* ---------------- Toast ---------------- */

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2000);
  }

  /* ---------------- 分类 ---------------- */

  function renderChips() {
    els.chips.innerHTML = CATEGORIES.map(function (category) {
      var active = category === state.category;
      return (
        '<button class="chip' + (active ? ' is-active' : '') + '" type="button" role="tab" ' +
        'aria-selected="' + active + '" data-category="' + escapeHtml(category) + '">' +
        escapeHtml(category) +
        '</button>'
      );
    }).join('');
  }

  /* ---------------- 商品列表 ---------------- */

  function getVisibleProducts() {
    var keyword = state.keyword.toLowerCase();
    return PRODUCTS.filter(function (product) {
      var matchCategory = state.category === '全部' || product.category === state.category;
      if (!matchCategory) return false;
      if (!keyword) return true;
      return (
        product.name.toLowerCase().indexOf(keyword) !== -1 ||
        product.category.toLowerCase().indexOf(keyword) !== -1
      );
    });
  }

  function renderProducts() {
    var list = getVisibleProducts();

    els.count.textContent = list.length
      ? '共 ' + list.length + ' 件商品'
      : '没有符合条件的商品';

    if (!list.length) {
      els.grid.innerHTML =
        '<div class="empty-state">' +
        '<span class="empty-state-emoji" aria-hidden="true">🍃</span>' +
        (state.keyword
          ? '没有找到「' + escapeHtml(state.keyword) + '」相关的商品，换个词试试？'
          : '这个分类还空着，看看其他分类吧。') +
        '</div>';
      return;
    }

    els.grid.innerHTML = list
      .map(function (product) {
        var isFavorite = state.favorites.has(product.id);
        var badge = product.badge
          ? '<span class="card-badge">' + escapeHtml(product.badge) + '</span>'
          : '';
        var originalPrice = product.originalPrice
          ? '<del>' + formatMoney(product.originalPrice) + '</del>'
          : '';

        return (
          '<article class="card">' +
          '<div class="card-media" style="background:' + product.gradient + '">' +
          badge +
          '<button class="fav-button' + (isFavorite ? ' is-active' : '') + '" type="button" ' +
          'data-favorite="' + product.id + '" aria-pressed="' + isFavorite + '" ' +
          'aria-label="收藏 ' + escapeHtml(product.name) + '">♥</button>' +
          '<span class="card-emoji" aria-hidden="true">' + product.emoji + '</span>' +
          '</div>' +
          '<div class="card-body">' +
          '<p class="card-cat">' + escapeHtml(product.category) + '</p>' +
          '<h3 class="card-name">' + escapeHtml(product.name) + '</h3>' +
          '<div class="card-foot">' +
          '<p class="card-price"><span class="currency">¥</span>' +
          moneyFormatter.format(product.price) +
          originalPrice +
          '</p>' +
          '<button class="add-button" type="button" data-add="' + product.id + '" ' +
          'aria-label="将 ' + escapeHtml(product.name) + ' 加入购物车">＋</button>' +
          '</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  /* ---------------- 购物车 ---------------- */

  function getCartSummary() {
    var count = 0;
    var total = 0;
    state.cart.forEach(function (qty, id) {
      var product = findProduct(id);
      if (!product) return;
      count += qty;
      total += product.price * qty;
    });
    return { count: count, total: total };
  }

  function renderCart() {
    var summary = getCartSummary();

    els.badge.textContent = String(summary.count);
    els.badge.hidden = summary.count === 0;
    els.cartTotal.textContent = formatMoney(summary.total);

    if (!state.cart.size) {
      els.cartItems.innerHTML =
        '<div class="cart-empty">' +
        '<span class="cart-empty-emoji" aria-hidden="true">🧺</span>' +
        '购物车还是空的<br>去挑几件喜欢的好物吧' +
        '</div>';
    } else {
      var html = '';
      state.cart.forEach(function (qty, id) {
        var product = findProduct(id);
        if (!product) return;
        html +=
          '<div class="cart-line" data-id="' + id + '">' +
          '<div class="cart-line-thumb" style="background:' + product.gradient + '" aria-hidden="true">' +
          product.emoji +
          '</div>' +
          '<div class="cart-line-info">' +
          '<p class="cart-line-name">' + escapeHtml(product.name) + '</p>' +
          '<p class="cart-line-price">' + formatMoney(product.price) + '</p>' +
          '<div class="cart-line-actions">' +
          '<div class="stepper">' +
          '<button type="button" data-step="-1" data-id="' + id + '" aria-label="减少一件">−</button>' +
          '<span>' + qty + '</span>' +
          '<button type="button" data-step="1" data-id="' + id + '" aria-label="增加一件">＋</button>' +
          '</div>' +
          '<button class="remove-button" type="button" data-remove="' + id + '">删除</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      });
      els.cartItems.innerHTML = html;
    }

    renderShipHint(summary.total);
    els.checkout.disabled = summary.count === 0;
  }

  function renderShipHint(total) {
    if (total >= FREE_SHIPPING) {
      els.shipHint.innerHTML = '🎉 已满 ¥' + FREE_SHIPPING + '，本单免运费';
      return;
    }
    var gap = FREE_SHIPPING - total;
    els.shipHint.innerHTML =
      '再买 <strong>' + formatMoney(gap) + '</strong> 即可免运费（满 ¥' + FREE_SHIPPING + ' 包邮）';
  }

  function addToCart(id) {
    var product = findProduct(id);
    if (!product) return;
    state.cart.set(id, (state.cart.get(id) || 0) + 1);
    saveCart();
    renderCart();
    showToast('已加入购物车：' + product.name);
  }

  function changeQuantity(id, delta) {
    var next = (state.cart.get(id) || 0) + delta;
    if (next <= 0) {
      state.cart.delete(id);
    } else {
      state.cart.set(id, next);
    }
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    var product = findProduct(id);
    state.cart.delete(id);
    saveCart();
    renderCart();
    if (product) showToast('已移除：' + product.name);
  }

  function toggleFavorite(id) {
    var product = findProduct(id);
    if (!product) return;
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      showToast('已取消收藏：' + product.name);
    } else {
      state.favorites.add(id);
      showToast('已收藏：' + product.name);
    }
    saveFavorites();
    renderProducts();
  }

  /* ---------------- 抽屉开关 ---------------- */

  function openCart() {
    lastFocused = document.activeElement;
    els.drawer.classList.add('is-open');
    els.overlay.classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
    els.cartOpen.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    window.setTimeout(function () {
      els.cartClose.focus();
    }, 60);
  }

  function closeCart() {
    if (!els.drawer.classList.contains('is-open')) return;
    els.drawer.classList.remove('is-open');
    els.overlay.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    els.cartOpen.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !els.drawer.classList.contains('is-open')) return;
    var focusables = els.drawer.querySelectorAll('button:not([disabled]), [href], input');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function checkout() {
    var summary = getCartSummary();
    if (!summary.count) {
      showToast('购物车是空的，先去挑几件好物吧');
      return;
    }
    showToast('订单已提交：' + summary.count + ' 件，应付 ' + formatMoney(summary.total) + '（演示）');
    state.cart.clear();
    saveCart();
    renderCart();
    closeCart();
  }

  /* ---------------- 事件绑定 ---------------- */

  function bindEvents() {
    els.chips.addEventListener('click', function (event) {
      var button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.getAttribute('data-category');
      renderChips();
      renderProducts();
    });

    els.grid.addEventListener('click', function (event) {
      var addButton = event.target.closest('[data-add]');
      if (addButton) {
        addToCart(Number(addButton.getAttribute('data-add')));
        return;
      }
      var favButton = event.target.closest('[data-favorite]');
      if (favButton) {
        toggleFavorite(Number(favButton.getAttribute('data-favorite')));
      }
    });

    els.search.addEventListener('input', function (event) {
      state.keyword = event.target.value.trim();
      renderProducts();
    });

    els.cartOpen.addEventListener('click', openCart);
    els.cartClose.addEventListener('click', closeCart);
    els.overlay.addEventListener('click', closeCart);
    els.checkout.addEventListener('click', checkout);

    els.cartItems.addEventListener('click', function (event) {
      var stepButton = event.target.closest('[data-step]');
      if (stepButton) {
        changeQuantity(
          Number(stepButton.getAttribute('data-id')),
          Number(stepButton.getAttribute('data-step'))
        );
        return;
      }
      var removeButton = event.target.closest('[data-remove]');
      if (removeButton) {
        removeFromCart(Number(removeButton.getAttribute('data-remove')));
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeCart();
      trapFocus(event);
    });

    document.querySelectorAll('[data-action="claim-coupon"]').forEach(function (button) {
      button.addEventListener('click', function () {
        showToast('已领取新人券：立减 ¥' + COUPON_AMOUNT + '（演示）');
      });
    });
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    restoreState();
    renderChips();
    renderProducts();
    renderCart();
    bindEvents();
  }

  init();
})();
