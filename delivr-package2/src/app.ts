import { Page, Role, MenuItem, CartItem, Order, AdminTab } from './types';
import {
  PROMOTIONS, MENU_ITEMS, CATEGORIES, MOCK_ORDERS, ADMIN_ORDERS,
  SAVED_ADDRESSES
} from './data';

// ── State ────────────────────────────────────────────
let role: Role = null;
let authMode: 'login' | 'signup' = 'login';
let currentPage: Page = 'home';
let currentAdminTab: AdminTab = 'orders';
let cart: CartItem[] = [];
let selectedCat = 'All';
let menuSearch = '';

const EMOJI: Record<string, string> = {
  'Butter Chicken':'🍛','Paneer Tikka Masala':'🧆','Dal Tadka':'🥣',
  'Chicken Biryani':'🍚','Veg Pulao':'🌾','Garlic Naan':'🫓',
  'Tandoori Roti':'🫓','Raita':'🥛','Gulab Jamun':'🟤',
  'Mango Lassi':'🥭','Mutton Rogan Josh':'🍖','Fish Curry':'🐟',
};
const emo = (n: string) => EMOJI[n] ?? '🍽️';

// ── Helpers ──────────────────────────────────────────
function $<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as T; }

function toast(msg: string) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout((el as any)._t);
  (el as any)._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function openSheet(html: string) {
  $('sheet-body').innerHTML = html;
  $('overlay').classList.add('open');
}
function closeSheet() { $('overlay').classList.remove('open'); }

// ── Auth ─────────────────────────────────────────────
function setRole(r: 'user' | 'admin') {
  role = r;
  $('role-user').classList.toggle('active', r === 'user');
  $('role-admin').classList.toggle('active', r === 'admin');
  renderLoginFields();
}

function setAuthMode(m: 'login' | 'signup') {
  authMode = m;
  $('at-login').classList.toggle('active', m === 'login');
  $('at-signup').classList.toggle('active', m === 'signup');
  $('login-btn').textContent = m === 'login' ? 'Sign In' : 'Create Account';
  renderLoginFields();
}

function renderLoginFields() {
  const f = $('login-fields');
  f.innerHTML = `
    ${authMode === 'signup' ? `<div class="field"><label>Full Name</label><input type="text" placeholder="Your name"/></div>` : ''}
    ${role === 'admin'
      ? `<div class="field"><label>Admin ID</label><input type="text" placeholder="admin@delivr"/></div>
         <div class="field"><label>Password</label><input type="password" placeholder="••••••••"/></div>`
      : `<div class="field"><label>Phone number</label><input type="tel" placeholder="+91 00000 00000"/></div>
         <div class="field"><label>Password</label><input type="password" placeholder="••••••••"/></div>
         ${authMode === 'signup' ? `<div class="field"><label>Delivery address</label><textarea placeholder="House no, street, area…" rows="2"></textarea></div>` : ''}`
    }
  `;
}

function doLogin() {
  if (!role) role = 'user';
  // Show correct screen
  $('screen-login').classList.remove('active');
  $('screen-login').style.display = 'none';
  if (role === 'admin') {
    $('screen-admin').classList.add('active');
    renderAdminTab('orders');
  } else {
    $('screen-user').classList.add('active');
    nav('home');
  }
}

function doLogout() {
  ['screen-user','screen-admin'].forEach(id => {
    $(id).classList.remove('active');
  });
  $('screen-login').style.display = 'flex';
  $('screen-login').classList.add('active');
  cart = [];
  role = null;
  selectedCat = 'All';
  renderLoginFields();
}

// ── User nav ─────────────────────────────────────────
function nav(page: Page) {
  currentPage = page;
  ['home','menu','cart','tracker','account'].forEach(p => {
    const el = $(`page-${p}`);
    if (el) el.style.display = p === page ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = $(`t-${page}`);
  if (tab) tab.classList.add('active');
  $('user-scroller').scrollTop = 0;
  renderPage(page);
}

function renderPage(page: Page) {
  if (page === 'home') renderHome();
  else if (page === 'menu') renderMenu();
  else if (page === 'cart') renderCart();
  else if (page === 'tracker') renderTracker();
  else if (page === 'account') renderAccount();
}

// ── Cart ─────────────────────────────────────────────
const getQty = (id: string) => cart.find(i => i.id === id)?.qty ?? 0;

function addToCart(id: string, fromSheet = false) {
  const item = MENU_ITEMS.find(i => i.id === id)!;
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++; else cart.push({ ...item, qty: 1 });
  updateBadge();
  toast(`Added ${item.name} ✓`);
  if (!fromSheet) { if (currentPage === 'menu') renderMenu(); if (currentPage === 'home') renderHome(); }
  else openItemSheet(item); // re-render sheet with updated qty
}

function removeFromCart(id: string, fromSheet = false) {
  const ex = cart.find(i => i.id === id);
  if (!ex) return;
  if (ex.qty > 1) ex.qty--; else cart = cart.filter(i => i.id !== id);
  updateBadge();
  if (!fromSheet) { if (currentPage === 'menu') renderMenu(); if (currentPage === 'home') renderHome(); }
  else openItemSheet(MENU_ITEMS.find(i => i.id === id)!);
}

function updateBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const b = $('cart-badge');
  b.textContent = String(total);
  b.style.display = total > 0 ? 'flex' : 'none';
}

// ── Item detail sheet ─────────────────────────────────
function openItemSheet(item: MenuItem) {
  const qty = getQty(item.id);
  const avail = item.available;
  openSheet(`
    <div class="item-sheet-hero">${emo(item.name)}</div>
    <div style="padding-top:18px">
      <div class="item-sheet-meta">
        <span class="pill ${item.isVeg ? 'p-green' : 'p-accent'}">${item.isVeg ? '🟢 Veg' : '🔴 Non-veg'}</span>
        ${item.tag ? `<span class="pill p-amber">${item.tag}</span>` : ''}
        ${!avail ? `<span class="pill p-muted">Unavailable</span>` : ''}
        <span class="pill p-muted">⏱ ${item.prepTime}</span>
        <span class="pill p-muted">🔥 ${item.calories}</span>
      </div>
      <div class="item-sheet-name">${item.name}</div>
      <div class="item-sheet-desc">${item.longDescription}</div>
      <div style="font-family:var(--font-h);font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Ingredients</div>
      <div class="item-sheet-ingredients">
        ${item.ingredients.map(i => `<span class="ing-tag">${i}</span>`).join('')}
      </div>
      ${avail ? `
      <div class="item-sheet-footer">
        <div class="isf-price">₹${item.price} <span>/ serving</span></div>
        ${qty > 0
          ? `<div class="qty-ctrl">
              <button class="qty-btn" onclick="removeFromCart('${item.id}',true)">−</button>
              <span class="qty-n">${qty}</span>
              <button class="qty-btn" onclick="addToCart('${item.id}',true)">+</button>
            </div>`
          : `<button class="btn btn-primary" style="width:auto;padding:14px 28px" onclick="addToCart('${item.id}',true)">Add to cart</button>`
        }
      </div>` : ''}
    </div>
  `);
}

// ── HOME ─────────────────────────────────────────────
function renderHome() {
  const el = $('page-home');
  el.innerHTML = `
    <div class="home-header">
      <div class="home-greeting">Good afternoon, <strong>Arjun 👋</strong></div>
      <div class="home-title">What are you<br>craving <em>today?</em></div>
    </div>

    <div class="active-bar" onclick="nav('tracker')" style="margin:18px 18px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="ab-dot"></div>
        <div>
          <div style="font-family:var(--font-h);font-size:13px;font-weight:700">Order on the way</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">ORD-4821 · Ramesh K.</div>
        </div>
      </div>
      <span style="color:var(--green);font-size:18px">→</span>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Deals & Packs</div>
        <div class="see-all">See all</div>
      </div>
      <div class="promo-rail">
        ${PROMOTIONS.map(p => `
        <div class="promo-card" style="background:${p.color}">
          <div class="promo-tag">${p.tag}</div>
          <div><div class="promo-title">${p.title}</div><div class="promo-sub">${p.subtitle}</div></div>
        </div>`).join('')}
      </div>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Browse</div>
      </div>
      <div class="cat-rail">
        ${CATEGORIES.map(c => `<div class="cat-chip ${c === selectedCat ? 'active' : ''}" onclick="setHomeCat('${c}')">${c}</div>`).join('')}
      </div>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Popular now</div>
        <div class="see-all" onclick="nav('menu')">Menu →</div>
      </div>
      <div class="feat-rail">
        ${getFeatItems().map(i => {
          const qty = getQty(i.id);
          return `
          <div class="feat-card" onclick="openItemSheet_id('${i.id}')">
            <div class="feat-img">${emo(i.name)}</div>
            <div class="feat-body">
              <div class="feat-name">${i.name}</div>
              <div class="feat-foot">
                <div class="feat-price">₹${i.price}</div>
                ${qty > 0
                  ? `<div class="qty-ctrl" onclick="event.stopPropagation()">
                      <button class="qty-btn" onclick="removeFromCart('${i.id}')">−</button>
                      <span class="qty-n">${qty}</span>
                      <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
                    </div>`
                  : `<button class="add-btn" onclick="event.stopPropagation();addToCart('${i.id}')">+</button>`
                }
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function getFeatItems() {
  const items = selectedCat === 'All'
    ? MENU_ITEMS.filter(i => i.available)
    : MENU_ITEMS.filter(i => i.available && i.category === selectedCat);
  return items.slice(0, 8);
}

// ── MENU ─────────────────────────────────────────────
function renderMenu() {
  const el = $('page-menu');
  const query = menuSearch.toLowerCase();
  let items = MENU_ITEMS;
  if (selectedCat !== 'All') items = items.filter(i => i.category === selectedCat);
  if (query) items = items.filter(i => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query));

  const groups: Record<string, MenuItem[]> = {};
  items.forEach(i => { (groups[i.category] = groups[i.category] || []).push(i); });

  el.innerHTML = `
    <div class="menu-top">
      <div class="section-title">Our Menu</div>
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Search dishes…" value="${menuSearch}" oninput="setMenuSearch(this.value)"/>
      </div>
    </div>
    <div class="cat-rail" style="padding:12px 18px 0">
      ${CATEGORIES.map(c => `<div class="cat-chip ${c === selectedCat ? 'active' : ''}" onclick="setMenuCat('${c}')">${c}</div>`).join('')}
    </div>
    ${!items.length
      ? `<div style="padding:60px 0;text-align:center;color:var(--muted)">🔍<br><br>No dishes found</div>`
      : Object.entries(groups).map(([cat, its]) => `
        <div class="menu-group">
          <div class="mg-title">${cat}</div>
          ${its.map(i => {
            const qty = getQty(i.id);
            return `
            <div class="menu-row ${!i.available ? 'unavail' : ''}" onclick="openItemSheet_id('${i.id}')">
              <div class="menu-row-img">
                ${emo(i.name)}
                <div class="veg-dot ${i.isVeg ? 'veg' : 'nonveg'}"></div>
              </div>
              <div class="menu-row-info">
                <div class="menu-row-name">${i.name}${i.tag ? ` <span class="pill p-accent" style="font-size:8px;padding:2px 7px">${i.tag}</span>` : ''}</div>
                <div class="menu-row-desc">${i.description}</div>
                <div class="menu-row-price">₹${i.price}</div>
              </div>
              ${i.available
                ? qty > 0
                  ? `<div class="qty-ctrl" onclick="event.stopPropagation()">
                      <button class="qty-btn" onclick="removeFromCart('${i.id}')">−</button>
                      <span class="qty-n">${qty}</span>
                      <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
                    </div>`
                  : `<button class="add-btn" onclick="event.stopPropagation();addToCart('${i.id}')">+</button>`
                : `<span class="pill p-muted">Unavail.</span>`
              }
            </div>`;
          }).join('')}
        </div>`).join('')
    }
  `;
}

// ── CART ─────────────────────────────────────────────
function renderCart() {
  const el = $('page-cart');
  if (!cart.length) {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;color:var(--muted);text-align:center">
        <div style="font-size:52px">🛒</div>
        <div style="font-size:14px;line-height:1.6">Your cart is empty.<br>Add something from the menu!</div>
        <button class="btn btn-primary" style="margin-top:8px" onclick="nav('menu')">Browse Menu</button>
      </div>`;
    return;
  }
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = 30;
  el.innerHTML = `
    <div class="cart-wrap">
      <div class="section-title">Your Order</div>
      <div class="addr-card">
        <span style="font-size:18px">📍</span>
        <div class="addr-text"><strong>Delivering to</strong>14B, Sector 9, Rohini, Delhi — 110085</div>
        <div class="addr-change">Change</div>
      </div>
      ${cart.map(i => `
      <div class="cart-row">
        <div class="cart-img">${emo(i.name)}</div>
        <div class="cart-info">
          <div class="cart-name">${i.name}</div>
          <div class="cart-price">₹${i.price} × ${i.qty} = ₹${i.price * i.qty}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="removeFromCart('${i.id}')">−</button>
          <span class="qty-n">${i.qty}</span>
          <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
        </div>
      </div>`).join('')}
      <div class="summary-card">
        <div class="s-row"><span>Subtotal</span><span>₹${sub}</span></div>
        <div class="s-row"><span>Delivery fee</span><span>₹${fee}</span></div>
        <div class="s-row total"><span>Total</span><span>₹${sub + fee}</span></div>
      </div>
      <button class="btn btn-primary" onclick="placeOrder()">Place Order · ₹${sub + fee}</button>
    </div>`;
}

function placeOrder() {
  cart = [];
  updateBadge();
  toast('Order placed! 🎉');
  nav('tracker');
}

// ── TRACKER ──────────────────────────────────────────
const STEPS = [
  { key: 'placed', label: 'Order placed', time: '12:34 PM' },
  { key: 'confirmed', label: 'Confirmed', time: '12:36 PM' },
  { key: 'preparing', label: 'Being prepared', time: '12:40 PM' },
  { key: 'out_for_delivery', label: 'Out for delivery', time: '12:58 PM' },
  { key: 'delivered', label: 'Delivered', time: '' },
];
const STATUS_IDX: Record<string, number> = {
  placed:0, confirmed:1, preparing:2, out_for_delivery:3, delivered:4
};

function renderTracker() {
  const active = MOCK_ORDERS[0];
  const idx = STATUS_IDX[active.status];
  const el = $('page-tracker');
  el.innerHTML = `
    <div class="tracker-wrap">
      <div style="font-family:var(--font-h);font-size:11px;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px">Active order</div>
      <div style="font-family:var(--font-h);font-size:22px;font-weight:800;letter-spacing:-.3px;margin-bottom:20px">${active.id}</div>

      <div style="margin-bottom:22px">
        ${STEPS.map((s, i) => {
          const done = i < idx, act = i === idx, last = i === STEPS.length - 1;
          return `
          <div class="tl-step">
            <div class="tl-left">
              <div class="tl-dot ${done?'done':act?'active':'pend'}">${done?'✓':''}</div>
              ${!last ? `<div class="tl-line ${done?'done':''}"></div>` : ''}
            </div>
            <div class="tl-right">
              <div class="tl-label ${i>idx?'pend':''}">${s.label}</div>
              <div class="tl-time">${act ? 'In progress…' : (done && s.time ? s.time : '')}</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="driver-card" style="margin-bottom:20px">
        <div class="drv-av">🛵</div>
        <div style="flex:1">
          <div style="font-family:var(--font-h);font-size:15px;font-weight:700">Ramesh K.</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Your delivery partner</div>
        </div>
        <button class="drv-call">📞</button>
      </div>

      <div class="section-title" style="margin-bottom:12px">Items</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:24px">
        ${active.items.map(i => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span>${i.name} × ${i.qty}</span><span>₹${i.price * i.qty}</span>
        </div>`).join('')}
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;font-family:var(--font-h);font-weight:700">
          <span>Total</span><span style="color:var(--accent)">₹${active.total}</span>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:12px">Past orders</div>
      ${MOCK_ORDERS.slice(1).map(o => `
      <div class="past-order">
        <div class="po-row">
          <div class="po-id">${o.id}</div>
          <div class="po-total">₹${o.total}</div>
        </div>
        <div class="po-sub">${o.date} · ${o.time} · ${o.items.map(i => i.name).join(', ')}</div>
        <div style="margin-top:7px"><span class="sp sp-${o.status}">${o.status.replace(/_/g,' ')}</span></div>
      </div>`).join('')}
    </div>`;
}

// ── ACCOUNT ──────────────────────────────────────────
function renderAccount() {
  const el = $('page-account');
  el.innerHTML = `
    <div class="acct-wrap">
      <div class="acct-hero">
        <div class="acct-av">🧑</div>
        <div>
          <div class="acct-name">Arjun Sharma</div>
          <div class="acct-phone">+91 98765 43210</div>
          <div class="acct-edit" onclick="openEditProfile()">Edit profile →</div>
        </div>
      </div>

      <div class="acct-menu">
        ${[
          ['📦','My Orders','View full order history','openOrderHistory'],
          ['📍','Saved Addresses','Home, Office…','openAddresses'],
          ['💳','Payment Methods','Add card or UPI','openPayments'],
          ['🎁','Refer & Earn','Invite friends, get ₹50','openRefer'],
          ['❓','Help & Support','FAQs & chat','openHelp'],
        ].map(([icon,label,sub,fn]) => `
        <div class="acct-item" onclick="${fn}()">
          <div class="ai-icon">${icon}</div>
          <div class="ai-text">
            <div class="ai-label">${label}</div>
            <div class="ai-sub">${sub}</div>
          </div>
          <div class="ai-arrow">›</div>
        </div>`).join('')}
      </div>

      <div class="divider"></div>
      <button class="btn btn-ghost" style="width:100%" onclick="doLogout()">Sign out</button>
    </div>`;
}

function openEditProfile() {
  openSheet(`
    <div class="sheet-title">Edit Profile</div>
    <div class="field"><label>Full Name</label><input type="text" value="Arjun Sharma"/></div>
    <div class="field"><label>Phone</label><input type="tel" value="+91 98765 43210"/></div>
    <div class="field"><label>Email</label><input type="email" placeholder="your@email.com"/></div>
    <div style="margin-top:8px"><button class="btn btn-primary" onclick="toast('Profile saved ✓');closeSheet()">Save changes</button></div>
  `);
}

function openOrderHistory() {
  openSheet(`
    <div class="sheet-title">My Orders</div>
    ${MOCK_ORDERS.map(o => `
    <div class="order-hist-card">
      <div class="ohc-top">
        <div class="ohc-id">${o.id}</div>
        <div class="ohc-total">₹${o.total}</div>
      </div>
      <div class="ohc-items">${o.items.length ? o.items.map(i => `${i.name} ×${i.qty}`).join(' · ') : 'Chicken Biryani ×2'}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="sp sp-${o.status}">${o.status.replace(/_/g,' ')}</span>
        <span style="font-size:11px;color:var(--muted)">${o.date} · ${o.time}</span>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:12px;padding:10px" onclick="toast('Reorder placed!')">Reorder</button>
    </div>`).join('')}
  `);
}

function openAddresses() {
  openSheet(`
    <div class="sheet-title">Saved Addresses</div>
    ${SAVED_ADDRESSES.map(a => `
    <div class="addr-saved">
      <span style="font-size:20px">📍</span>
      <div>
        <div class="addr-lbl">${a.label}</div>
        <div class="addr-full">${a.full}</div>
      </div>
    </div>`).join('')}
    <button class="btn btn-outline" style="width:100%;margin-top:4px" onclick="toast('Add address (demo)')">+ Add new address</button>
  `);
}

function openPayments() {
  openSheet(`
    <div class="sheet-title">Payment Methods</div>
    ${[['💳','HDFC Debit Card','•••• 4821'],['📱','Google Pay UPI','arjun@oksbi'],['💵','Cash on Delivery','Always available']].map(([icon,label,sub]) => `
    <div class="payment-card">
      <div class="pay-icon">${icon}</div>
      <div>
        <div class="pay-label">${label}</div>
        <div class="pay-sub">${sub}</div>
      </div>
    </div>`).join('')}
    <button class="btn btn-outline" style="width:100%;margin-top:4px" onclick="toast('Add method (demo)')">+ Add payment method</button>
  `);
}

function openRefer() {
  openSheet(`
    <div class="sheet-title">Refer & Earn</div>
    <div style="background:var(--bg3);border-radius:14px;padding:20px;text-align:center;margin-bottom:16px">
      <div style="font-size:40px;margin-bottom:10px">🎁</div>
      <div style="font-family:var(--font-h);font-size:20px;font-weight:800;margin-bottom:4px">Earn ₹50 per referral</div>
      <div style="font-size:13px;color:var(--muted)">Share your code. When a friend orders, you both get ₹50 off.</div>
    </div>
    <div style="background:var(--accent-dim);border:1px dashed var(--accent);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-family:var(--font-h);letter-spacing:.06em">YOUR CODE</div>
      <div style="font-family:var(--font-h);font-size:24px;font-weight:800;letter-spacing:.1em;color:var(--accent)">ARJUN50</div>
    </div>
    <button class="btn btn-primary" onclick="toast('Link copied!')">Copy referral link</button>
  `);
}

function openHelp() {
  const faqs = [
    ['How do I track my order?', 'Go to the Track tab in the bottom navigation. You\'ll see the live status of your active order and the assigned delivery partner.'],
    ['Can I cancel an order?', 'You can cancel within 2 minutes of placing an order by contacting our support. Once the restaurant starts preparing, cancellation is not possible.'],
    ['What are the delivery hours?', 'We deliver from 11:00 AM to 10:00 PM daily, including weekends and holidays.'],
    ['Is there a minimum order value?', 'Yes, the minimum order value is ₹100. A delivery fee of ₹30 applies to all orders.'],
    ['How do I report a missing item?', 'Use the Help chat below and share your order ID. We\'ll resolve it within 30 minutes.'],
  ];
  openSheet(`
    <div class="sheet-title">Help & Support</div>
    <div style="display:flex;gap:10px;margin-bottom:18px">
      <button class="btn btn-primary" style="font-size:12px;padding:12px" onclick="toast('Opening chat…')">💬 Live Chat</button>
      <button class="btn btn-ghost" style="font-size:12px;padding:12px;flex:1" onclick="toast('Calling support…')">📞 Call Us</button>
    </div>
    <div style="font-family:var(--font-h);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">FAQs</div>
    ${faqs.map(([q,a]) => `
    <div class="faq-item" onclick="this.classList.toggle('open')">
      <div class="faq-q">${q} <span>+</span></div>
      <div class="faq-a">${a}</div>
    </div>`).join('')}
  `);
}

// ── ADMIN ─────────────────────────────────────────────
function switchAdminTab(tab: string, el: HTMLElement) {
  currentAdminTab = tab as AdminTab;
  document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAdminTab(tab);
}

function renderAdminTab(tab: string) {
  const el = $('adm-content');
  if (tab === 'orders') {
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-v">18</div><div class="stat-l">Orders today</div></div>
        <div class="stat-card"><div class="stat-v">₹5,240</div><div class="stat-l">Revenue today</div></div>
        <div class="stat-card"><div class="stat-v">3</div><div class="stat-l">Active deliveries</div></div>
        <div class="stat-card"><div class="stat-v">28 min</div><div class="stat-l">Avg. delivery</div></div>
      </div>
      <div style="font-family:var(--font-h);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Live orders</div>
      ${ADMIN_ORDERS.map(o => `
      <div class="adm-order">
        <div class="ao-top">
          <div class="ao-id">${o.id}</div>
          <span class="sp sp-${o.status}">${o.status.replace(/_/g,' ')}</span>
        </div>
        <div class="ao-addr">📍 ${o.address}</div>
        <div class="ao-foot">
          <div class="ao-drv">${o.driver ? `🛵 ${o.driver}` : `<span style="color:var(--accent)">⚠ Unassigned</span>`}</div>
          <div class="ao-total">₹${o.total}</div>
        </div>
        ${!o.driver ? `<button class="btn btn-primary" style="margin-top:10px;height:36px;font-size:12px" onclick="toast('Driver assigned ✓')">Assign driver</button>` : ''}
      </div>`).join('')}
    `;
  } else if (tab === 'menu') {
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span class="pill p-muted">${MENU_ITEMS.length} items</span>
        <button class="btn btn-primary" style="width:auto;padding:10px 18px;font-size:12px" onclick="openAdminAddItem()">+ Add item</button>
      </div>
      ${MENU_ITEMS.map(i => `
      <div class="adm-menu-item">
        <div class="ami-img">${emo(i.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="ami-name">${i.name}</div>
          <div class="ami-cat">${i.category}</div>
          <div class="ami-price">₹${i.price}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <button class="toggle ${i.available ? 'on' : 'off'}" onclick="this.className='toggle '+(this.className.includes(' on')?'off':'on');toast('Availability updated')"></button>
          <span style="font-size:10px;color:var(--muted);cursor:pointer;font-family:var(--font-h)" onclick="toast('Edit (demo)')">Edit</span>
        </div>
      </div>`).join('')}
    `;
  } else if (tab === 'staff') {
    const staff = [
      { name: 'Ramesh K.', orders: 6, status: 'On delivery', online: true },
      { name: 'Sunil P.', orders: 4, status: 'On delivery', online: true },
      { name: 'Arun M.', orders: 8, status: 'Available', online: true },
      { name: 'Deepak V.', orders: 3, status: 'Off shift', online: false },
    ];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span class="pill p-green">${staff.filter(s => s.online).length} online</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:10px 16px" onclick="toast('Add staff (demo)')">+ Add staff</button>
      </div>
      ${staff.map(s => `
      <div class="staff-card">
        <div class="staff-av">${s.online ? '🟢' : '⚫'}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-h);font-size:14px;font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.status}</div>
        </div>
        <div style="font-family:var(--font-h);font-size:12px;color:var(--accent)">${s.orders} orders</div>
      </div>`).join('')}
    `;
  } else if (tab === 'settings') {
    el.innerHTML = `
      <div class="field"><label>Restaurant name</label><input type="text" value="Delivr Kitchen"/></div>
      <div class="field"><label>Contact phone</label><input type="tel" value="+91 98110 00000"/></div>
      <div class="field"><label>Opening hours</label><input type="text" value="11:00 AM – 10:00 PM"/></div>
      <div class="field"><label>Delivery radius (km)</label><input type="number" value="5"/></div>
      <div class="field"><label>Min. order (₹)</label><input type="number" value="100"/></div>
      <div class="field"><label>Delivery fee (₹)</label><input type="number" value="30"/></div>
      <div class="divider"></div>
      <div style="margin-bottom:14px;font-family:var(--font-h);font-size:13px;font-weight:700">Promo Banners</div>
      ${PROMOTIONS.map((p,i) => `
      <div style="background:var(--bg3);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:center">
        <div style="width:10px;height:10px;border-radius:2px;background:${p.color};flex-shrink:0"></div>
        <div style="flex:1;font-family:var(--font-h);font-size:12px;font-weight:700">${p.title}</div>
        <span style="font-size:10px;color:var(--accent);cursor:pointer;font-family:var(--font-h)" onclick="toast('Edit promo (demo)')">Edit</span>
      </div>`).join('')}
      <div class="divider"></div>
      <button class="btn btn-primary" onclick="toast('Settings saved ✓')">Save settings</button>
    `;
  }
}

function openAdminAddItem() {
  openSheet(`
    <div class="sheet-title">Add Menu Item</div>
    <div class="field"><label>Item name</label><input type="text" placeholder="e.g. Butter Chicken"/></div>
    <div class="field"><label>Category</label>
      <select><option>Mains</option><option>Rice & Biryani</option><option>Breads</option><option>Sides</option><option>Desserts</option><option>Drinks</option></select>
    </div>
    <div class="field"><label>Price (₹)</label><input type="number" placeholder="200"/></div>
    <div class="field"><label>Short description</label><input type="text" placeholder="Brief tagline"/></div>
    <div class="field"><label>Full description</label><textarea rows="3" placeholder="Detailed description for customers…"></textarea></div>
    <div class="field"><label>Prep time</label><input type="text" placeholder="20–25 min"/></div>
    <div class="field"><label>Calories</label><input type="text" placeholder="380 kcal"/></div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;text-transform:none;letter-spacing:0">
        <input type="radio" name="veg" value="veg"/> Veg
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;text-transform:none;letter-spacing:0">
        <input type="radio" name="veg" value="nonveg" checked/> Non-veg
      </label>
    </div>
    <button class="btn btn-primary" onclick="toast('Item added ✓');closeSheet()">Add to menu</button>
  `);
}

// ── Expose globals ────────────────────────────────────
const g = window as any;
g.setRole = setRole;
g.setAuthMode = setAuthMode;
g.doLogin = doLogin;
g.doLogout = doLogout;
g.nav = nav;
g.addToCart = addToCart;
g.removeFromCart = removeFromCart;
g.openItemSheet_id = (id: string) => openItemSheet(MENU_ITEMS.find(i => i.id === id)!);
g.setHomeCat = (c: string) => { selectedCat = c; renderHome(); };
g.setMenuCat = (c: string) => { selectedCat = c; renderMenu(); };
g.setMenuSearch = (v: string) => { menuSearch = v; renderMenu(); };
g.placeOrder = placeOrder;
g.closeSheet = closeSheet;
g.switchAdminTab = switchAdminTab;
g.openEditProfile = openEditProfile;
g.openOrderHistory = openOrderHistory;
g.openAddresses = openAddresses;
g.openPayments = openPayments;
g.openRefer = openRefer;
g.openHelp = openHelp;
g.openAdminAddItem = openAdminAddItem;
g.toast = toast;

// ── Boot ──────────────────────────────────────────────
renderLoginFields();
