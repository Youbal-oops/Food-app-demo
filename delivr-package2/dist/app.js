"use strict";
(() => {
  // src/data.ts
  var PROMOTIONS = [
    { id: "p1", title: "Family Feast Pack", subtitle: "Feeds 4 \xB7 Save \u20B9200", tag: "LIMITED", color: "#C0392B" },
    { id: "p2", title: "Office Lunch Bundle", subtitle: "10 meals \xB7 Free delivery", tag: "POPULAR", color: "#1A56A0" },
    { id: "p3", title: "Weekend Thali Deal", subtitle: "Full meal \xB7 Only \u20B9149", tag: "NEW", color: "#166534" }
  ];
  var MENU_ITEMS = [
    {
      id: "m1",
      name: "Butter Chicken",
      category: "Mains",
      price: 220,
      tag: "Bestseller",
      available: true,
      isVeg: false,
      prepTime: "20\u201325 min",
      calories: "380 kcal",
      description: "Creamy tomato-based curry with tender chicken",
      longDescription: "Our signature Butter Chicken is slow-cooked in a rich, velvety tomato and cream gravy, infused with whole spices and finished with a generous knob of butter. The chicken is marinated overnight in yoghurt and tandoor-roasted before being folded into the sauce \u2014 giving it that signature smoky depth. Pairs perfectly with naan or steamed rice.",
      ingredients: ["Chicken", "Tomatoes", "Fresh cream", "Butter", "Ginger", "Garlic", "Kashmiri chilli", "Fenugreek leaves"]
    },
    {
      id: "m2",
      name: "Paneer Tikka Masala",
      category: "Mains",
      price: 200,
      available: true,
      isVeg: true,
      prepTime: "18\u201322 min",
      calories: "340 kcal",
      description: "Chargrilled paneer in spiced gravy",
      longDescription: "Thick cubes of fresh cottage cheese are marinated in a spiced yoghurt mix, grilled in the tandoor till charred at the edges, then simmered in a vibrant onion-tomato masala. The result is a smoky, tangy curry with a satisfying bite. A vegetarian crowd-pleaser that never disappoints.",
      ingredients: ["Paneer", "Onions", "Tomatoes", "Capsicum", "Yoghurt", "Cream", "Spice blend"]
    },
    {
      id: "m3",
      name: "Dal Tadka",
      category: "Mains",
      price: 140,
      available: true,
      isVeg: true,
      prepTime: "15 min",
      calories: "210 kcal",
      description: "Tempered yellow lentils with ghee",
      longDescription: "A soul-warming bowl of yellow lentils cooked to a silky consistency, finished with a sizzling tadka of ghee, cumin seeds, garlic, dried red chillies, and a pinch of asafoetida. Simple, honest, and deeply comforting \u2014 the kind of dal that tastes like home.",
      ingredients: ["Yellow lentils", "Ghee", "Cumin", "Garlic", "Dried red chilli", "Asafoetida", "Coriander"]
    },
    {
      id: "m4",
      name: "Chicken Biryani",
      category: "Rice & Biryani",
      price: 260,
      tag: "Chef's Pick",
      available: true,
      isVeg: false,
      prepTime: "30\u201335 min",
      calories: "520 kcal",
      description: "Fragrant basmati rice with marinated chicken",
      longDescription: "Layers of aged basmati rice and bone-in chicken marinated in yoghurt and aromatic spices, slow-cooked (dum) in a sealed pot so every grain absorbs the flavour. Finished with saffron milk, caramelised onions, and fresh mint. A full meal in one pot.",
      ingredients: ["Basmati rice", "Chicken", "Saffron", "Fried onions", "Mint", "Yoghurt", "Whole spices"]
    },
    {
      id: "m5",
      name: "Veg Pulao",
      category: "Rice & Biryani",
      price: 160,
      available: true,
      isVeg: true,
      prepTime: "20 min",
      calories: "310 kcal",
      description: "Mildly spiced rice with seasonal vegetables",
      longDescription: "Fragrant long-grain rice cooked with seasonal vegetables \u2014 carrots, peas, beans, and corn \u2014 in a light whole-spice broth. Mild enough for all palates, and perfect alongside a bowl of raita. Satisfying without being heavy.",
      ingredients: ["Basmati rice", "Mixed vegetables", "Bay leaf", "Cloves", "Cardamom", "Ghee"]
    },
    {
      id: "m6",
      name: "Garlic Naan",
      category: "Breads",
      price: 50,
      available: true,
      isVeg: true,
      prepTime: "8 min",
      calories: "160 kcal",
      description: "Soft leavened bread with garlic butter",
      longDescription: "Hand-stretched leavened dough baked to a light char in our clay tandoor, then brushed generously with garlic-infused butter and fresh coriander. Fluffy on the inside, slightly crisp at the edges \u2014 the ideal accompaniment to any curry.",
      ingredients: ["Refined flour", "Yeast", "Butter", "Garlic", "Coriander", "Salt"]
    },
    {
      id: "m7",
      name: "Tandoori Roti",
      category: "Breads",
      price: 35,
      available: true,
      isVeg: true,
      prepTime: "6 min",
      calories: "110 kcal",
      description: "Whole wheat bread from clay oven",
      longDescription: "Unleavened whole wheat flatbread rolled thin and cooked directly on the walls of the tandoor. Light, slightly charred, and wholesome \u2014 a healthier companion to your meal.",
      ingredients: ["Whole wheat flour", "Water", "Salt"]
    },
    {
      id: "m8",
      name: "Raita",
      category: "Sides",
      price: 60,
      available: true,
      isVeg: true,
      prepTime: "5 min",
      calories: "90 kcal",
      description: "Yoghurt with cucumber and spices",
      longDescription: "Chilled hung curd whisked smooth and folded with grated cucumber, roasted cumin powder, chaat masala, and fresh coriander. A cooling counterpoint to spicy mains \u2014 essential alongside biryani.",
      ingredients: ["Yoghurt", "Cucumber", "Cumin", "Chaat masala", "Coriander"]
    },
    {
      id: "m9",
      name: "Gulab Jamun",
      category: "Desserts",
      price: 80,
      available: true,
      isVeg: true,
      prepTime: "10 min",
      calories: "280 kcal",
      description: "Soft milk dumplings in rose syrup",
      longDescription: "Melt-in-the-mouth khoya dumplings fried to a deep golden brown and soaked overnight in rose-cardamom sugar syrup. Served warm. An indulgent classic that bookmarks any good meal.",
      ingredients: ["Khoya", "Refined flour", "Sugar", "Rose water", "Cardamom"]
    },
    {
      id: "m10",
      name: "Mango Lassi",
      category: "Drinks",
      price: 90,
      tag: "New",
      available: true,
      isVeg: true,
      prepTime: "5 min",
      calories: "200 kcal",
      description: "Chilled mango yoghurt drink",
      longDescription: "Thick Alphonso mango pulp blended with chilled yoghurt, a touch of sugar, and a pinch of cardamom. Served cold in a tall glass. Refreshing, filling, and the perfect antidote to a spicy meal.",
      ingredients: ["Alphonso mango pulp", "Yoghurt", "Sugar", "Cardamom", "Ice"]
    },
    {
      id: "m11",
      name: "Mutton Rogan Josh",
      category: "Mains",
      price: 320,
      available: false,
      isVeg: false,
      prepTime: "45 min",
      calories: "480 kcal",
      description: "Slow cooked Kashmiri lamb curry",
      longDescription: "A Kashmiri heirloom \u2014 bone-in mutton braised low and slow in an aromatic gravy of dried Kashmiri chillies, fennel, ginger powder, and whole spices. The result is deeply flavoured, fall-off-the-bone tender meat in a brick-red sauce. Currently unavailable \u2014 check back tomorrow.",
      ingredients: ["Mutton", "Kashmiri chilli", "Fennel", "Ginger powder", "Cloves", "Bay leaf"]
    },
    {
      id: "m12",
      name: "Fish Curry",
      category: "Mains",
      price: 280,
      available: true,
      isVeg: false,
      prepTime: "25 min",
      calories: "320 kcal",
      description: "Coastal style fish in coconut gravy",
      longDescription: "Fresh catch of the day simmered in a tangy, coconut-based gravy with raw mango, curry leaves, and mustard seeds \u2014 inspired by the coastal kitchens of Goa and Kerala. Light yet packed with flavour. Best with steamed rice.",
      ingredients: ["Fish", "Coconut milk", "Raw mango", "Curry leaves", "Mustard seeds", "Turmeric"]
    }
  ];
  var CATEGORIES = ["All", ...Array.from(new Set(MENU_ITEMS.map((i) => i.category)))];
  var MOCK_ORDERS = [
    {
      id: "ORD-4821",
      status: "out_for_delivery",
      total: 320,
      time: "12:34 PM",
      date: "Today",
      address: "14B, Sector 9, Rohini, Delhi",
      driver: "Ramesh K.",
      items: [
        { ...MENU_ITEMS[0], qty: 1 },
        { ...MENU_ITEMS[5], qty: 2 }
      ]
    },
    {
      id: "ORD-4798",
      status: "delivered",
      total: 520,
      time: "11:10 AM",
      date: "Today",
      address: "14B, Sector 9, Rohini, Delhi",
      driver: "Sunil P.",
      items: [{ ...MENU_ITEMS[3], qty: 2 }]
    },
    {
      id: "ORD-4750",
      status: "delivered",
      total: 390,
      time: "7:45 PM",
      date: "Yesterday",
      address: "14B, Sector 9, Rohini, Delhi",
      driver: "Arun M.",
      items: [{ ...MENU_ITEMS[1], qty: 1 }, { ...MENU_ITEMS[7], qty: 1 }, { ...MENU_ITEMS[6], qty: 2 }]
    }
  ];
  var SAVED_ADDRESSES = [
    { id: "a1", label: "Home \u{1F3E0}", full: "14B, Sector 9, Rohini, Delhi \u2014 110085" },
    { id: "a2", label: "Office \u{1F3E2}", full: "Plot 7, Netaji Subhash Place, Pitampura, Delhi \u2014 110034" }
  ];
  var ADMIN_ORDERS = [
    { id: "ORD-4825", items: [], status: "placed", total: 440, time: "1:02 PM", date: "Today", address: "A-12, Pitampura", driver: void 0 },
    { id: "ORD-4824", items: [], status: "preparing", total: 280, time: "12:55 PM", date: "Today", address: "C-8, Shalimar Bagh", driver: "Ramesh K." },
    { id: "ORD-4823", items: [], status: "out_for_delivery", total: 360, time: "12:40 PM", date: "Today", address: "77, Ashok Vihar", driver: "Sunil P." },
    { id: "ORD-4822", items: [], status: "delivered", total: 190, time: "12:10 PM", date: "Today", address: "3B, Model Town", driver: "Arun M." },
    { id: "ORD-4821", items: [], status: "out_for_delivery", total: 320, time: "12:34 PM", date: "Today", address: "14B, Sector 9, Rohini", driver: "Ramesh K." }
  ];

  // src/app.ts
  var role = null;
  var authMode = "login";
  var currentPage = "home";
  var currentAdminTab = "orders";
  var cart = [];
  var selectedCat = "All";
  var menuSearch = "";
  var EMOJI = {
    "Butter Chicken": "\u{1F35B}",
    "Paneer Tikka Masala": "\u{1F9C6}",
    "Dal Tadka": "\u{1F963}",
    "Chicken Biryani": "\u{1F35A}",
    "Veg Pulao": "\u{1F33E}",
    "Garlic Naan": "\u{1FAD3}",
    "Tandoori Roti": "\u{1FAD3}",
    "Raita": "\u{1F95B}",
    "Gulab Jamun": "\u{1F7E4}",
    "Mango Lassi": "\u{1F96D}",
    "Mutton Rogan Josh": "\u{1F356}",
    "Fish Curry": "\u{1F41F}"
  };
  var emo = (n) => EMOJI[n] ?? "\u{1F37D}\uFE0F";
  function $(id) {
    return document.getElementById(id);
  }
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }
  function openSheet(html) {
    $("sheet-body").innerHTML = html;
    $("overlay").classList.add("open");
  }
  function closeSheet() {
    $("overlay").classList.remove("open");
  }
  function setRole(r) {
    role = r;
    $("role-user").classList.toggle("active", r === "user");
    $("role-admin").classList.toggle("active", r === "admin");
    renderLoginFields();
  }
  function setAuthMode(m) {
    authMode = m;
    $("at-login").classList.toggle("active", m === "login");
    $("at-signup").classList.toggle("active", m === "signup");
    $("login-btn").textContent = m === "login" ? "Sign In" : "Create Account";
    renderLoginFields();
  }
  function renderLoginFields() {
    const f = $("login-fields");
    f.innerHTML = `
    ${authMode === "signup" ? `<div class="field"><label>Full Name</label><input type="text" placeholder="Your name"/></div>` : ""}
    ${role === "admin" ? `<div class="field"><label>Admin ID</label><input type="text" placeholder="admin@delivr"/></div>
         <div class="field"><label>Password</label><input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"/></div>` : `<div class="field"><label>Phone number</label><input type="tel" placeholder="+91 00000 00000"/></div>
         <div class="field"><label>Password</label><input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"/></div>
         ${authMode === "signup" ? `<div class="field"><label>Delivery address</label><textarea placeholder="House no, street, area\u2026" rows="2"></textarea></div>` : ""}`}
  `;
  }
  function doLogin() {
    if (!role) role = "user";
    $("screen-login").classList.remove("active");
    $("screen-login").style.display = "none";
    if (role === "admin") {
      $("screen-admin").classList.add("active");
      renderAdminTab("orders");
    } else {
      $("screen-user").classList.add("active");
      nav("home");
    }
  }
  function doLogout() {
    ["screen-user", "screen-admin"].forEach((id) => {
      $(id).classList.remove("active");
    });
    $("screen-login").style.display = "flex";
    $("screen-login").classList.add("active");
    cart = [];
    role = null;
    selectedCat = "All";
    renderLoginFields();
  }
  function nav(page) {
    currentPage = page;
    ["home", "menu", "cart", "tracker", "account"].forEach((p) => {
      const el = $(`page-${p}`);
      if (el) el.style.display = p === page ? "block" : "none";
    });
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    const tab = $(`t-${page}`);
    if (tab) tab.classList.add("active");
    $("user-scroller").scrollTop = 0;
    renderPage(page);
  }
  function renderPage(page) {
    if (page === "home") renderHome();
    else if (page === "menu") renderMenu();
    else if (page === "cart") renderCart();
    else if (page === "tracker") renderTracker();
    else if (page === "account") renderAccount();
  }
  var getQty = (id) => cart.find((i) => i.id === id)?.qty ?? 0;
  function addToCart(id, fromSheet = false) {
    const item = MENU_ITEMS.find((i) => i.id === id);
    const ex = cart.find((i) => i.id === id);
    if (ex) ex.qty++;
    else cart.push({ ...item, qty: 1 });
    updateBadge();
    toast(`Added ${item.name} \u2713`);
    if (!fromSheet) {
      if (currentPage === "menu") renderMenu();
      if (currentPage === "home") renderHome();
    } else openItemSheet(item);
  }
  function removeFromCart(id, fromSheet = false) {
    const ex = cart.find((i) => i.id === id);
    if (!ex) return;
    if (ex.qty > 1) ex.qty--;
    else cart = cart.filter((i) => i.id !== id);
    updateBadge();
    if (!fromSheet) {
      if (currentPage === "menu") renderMenu();
      if (currentPage === "home") renderHome();
    } else openItemSheet(MENU_ITEMS.find((i) => i.id === id));
  }
  function updateBadge() {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const b = $("cart-badge");
    b.textContent = String(total);
    b.style.display = total > 0 ? "flex" : "none";
  }
  function openItemSheet(item) {
    const qty = getQty(item.id);
    const avail = item.available;
    openSheet(`
    <div class="item-sheet-hero">${emo(item.name)}</div>
    <div style="padding-top:18px">
      <div class="item-sheet-meta">
        <span class="pill ${item.isVeg ? "p-green" : "p-accent"}">${item.isVeg ? "\u{1F7E2} Veg" : "\u{1F534} Non-veg"}</span>
        ${item.tag ? `<span class="pill p-amber">${item.tag}</span>` : ""}
        ${!avail ? `<span class="pill p-muted">Unavailable</span>` : ""}
        <span class="pill p-muted">\u23F1 ${item.prepTime}</span>
        <span class="pill p-muted">\u{1F525} ${item.calories}</span>
      </div>
      <div class="item-sheet-name">${item.name}</div>
      <div class="item-sheet-desc">${item.longDescription}</div>
      <div style="font-family:var(--font-h);font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Ingredients</div>
      <div class="item-sheet-ingredients">
        ${item.ingredients.map((i) => `<span class="ing-tag">${i}</span>`).join("")}
      </div>
      ${avail ? `
      <div class="item-sheet-footer">
        <div class="isf-price">\u20B9${item.price} <span>/ serving</span></div>
        ${qty > 0 ? `<div class="qty-ctrl">
              <button class="qty-btn" onclick="removeFromCart('${item.id}',true)">\u2212</button>
              <span class="qty-n">${qty}</span>
              <button class="qty-btn" onclick="addToCart('${item.id}',true)">+</button>
            </div>` : `<button class="btn btn-primary" style="width:auto;padding:14px 28px" onclick="addToCart('${item.id}',true)">Add to cart</button>`}
      </div>` : ""}
    </div>
  `);
  }
  function renderHome() {
    const el = $("page-home");
    el.innerHTML = `
    <div class="home-header">
      <div class="home-greeting">Good afternoon, <strong>Arjun \u{1F44B}</strong></div>
      <div class="home-title">What are you<br>craving <em>today?</em></div>
    </div>

    <div class="active-bar" onclick="nav('tracker')" style="margin:18px 18px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="ab-dot"></div>
        <div>
          <div style="font-family:var(--font-h);font-size:13px;font-weight:700">Order on the way</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">ORD-4821 \xB7 Ramesh K.</div>
        </div>
      </div>
      <span style="color:var(--green);font-size:18px">\u2192</span>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Deals & Packs</div>
        <div class="see-all">See all</div>
      </div>
      <div class="promo-rail">
        ${PROMOTIONS.map((p) => `
        <div class="promo-card" style="background:${p.color}">
          <div class="promo-tag">${p.tag}</div>
          <div><div class="promo-title">${p.title}</div><div class="promo-sub">${p.subtitle}</div></div>
        </div>`).join("")}
      </div>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Browse</div>
      </div>
      <div class="cat-rail">
        ${CATEGORIES.map((c) => `<div class="cat-chip ${c === selectedCat ? "active" : ""}" onclick="setHomeCat('${c}')">${c}</div>`).join("")}
      </div>
    </div>

    <div style="margin-top:24px">
      <div class="h-row" style="padding:0 18px;margin-bottom:12px">
        <div class="section-title">Popular now</div>
        <div class="see-all" onclick="nav('menu')">Menu \u2192</div>
      </div>
      <div class="feat-rail">
        ${getFeatItems().map((i) => {
      const qty = getQty(i.id);
      return `
          <div class="feat-card" onclick="openItemSheet_id('${i.id}')">
            <div class="feat-img">${emo(i.name)}</div>
            <div class="feat-body">
              <div class="feat-name">${i.name}</div>
              <div class="feat-foot">
                <div class="feat-price">\u20B9${i.price}</div>
                ${qty > 0 ? `<div class="qty-ctrl" onclick="event.stopPropagation()">
                      <button class="qty-btn" onclick="removeFromCart('${i.id}')">\u2212</button>
                      <span class="qty-n">${qty}</span>
                      <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
                    </div>` : `<button class="add-btn" onclick="event.stopPropagation();addToCart('${i.id}')">+</button>`}
              </div>
            </div>
          </div>`;
    }).join("")}
      </div>
    </div>
  `;
  }
  function getFeatItems() {
    const items = selectedCat === "All" ? MENU_ITEMS.filter((i) => i.available) : MENU_ITEMS.filter((i) => i.available && i.category === selectedCat);
    return items.slice(0, 8);
  }
  function renderMenu() {
    const el = $("page-menu");
    const query = menuSearch.toLowerCase();
    let items = MENU_ITEMS;
    if (selectedCat !== "All") items = items.filter((i) => i.category === selectedCat);
    if (query) items = items.filter((i) => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query));
    const groups = {};
    items.forEach((i) => {
      (groups[i.category] = groups[i.category] || []).push(i);
    });
    el.innerHTML = `
    <div class="menu-top">
      <div class="section-title">Our Menu</div>
      <div class="search-wrap">
        <span class="search-icon">\u{1F50D}</span>
        <input type="text" placeholder="Search dishes\u2026" value="${menuSearch}" oninput="setMenuSearch(this.value)"/>
      </div>
    </div>
    <div class="cat-rail" style="padding:12px 18px 0">
      ${CATEGORIES.map((c) => `<div class="cat-chip ${c === selectedCat ? "active" : ""}" onclick="setMenuCat('${c}')">${c}</div>`).join("")}
    </div>
    ${!items.length ? `<div style="padding:60px 0;text-align:center;color:var(--muted)">\u{1F50D}<br><br>No dishes found</div>` : Object.entries(groups).map(([cat, its]) => `
        <div class="menu-group">
          <div class="mg-title">${cat}</div>
          ${its.map((i) => {
      const qty = getQty(i.id);
      return `
            <div class="menu-row ${!i.available ? "unavail" : ""}" onclick="openItemSheet_id('${i.id}')">
              <div class="menu-row-img">
                ${emo(i.name)}
                <div class="veg-dot ${i.isVeg ? "veg" : "nonveg"}"></div>
              </div>
              <div class="menu-row-info">
                <div class="menu-row-name">${i.name}${i.tag ? ` <span class="pill p-accent" style="font-size:8px;padding:2px 7px">${i.tag}</span>` : ""}</div>
                <div class="menu-row-desc">${i.description}</div>
                <div class="menu-row-price">\u20B9${i.price}</div>
              </div>
              ${i.available ? qty > 0 ? `<div class="qty-ctrl" onclick="event.stopPropagation()">
                      <button class="qty-btn" onclick="removeFromCart('${i.id}')">\u2212</button>
                      <span class="qty-n">${qty}</span>
                      <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
                    </div>` : `<button class="add-btn" onclick="event.stopPropagation();addToCart('${i.id}')">+</button>` : `<span class="pill p-muted">Unavail.</span>`}
            </div>`;
    }).join("")}
        </div>`).join("")}
  `;
  }
  function renderCart() {
    const el = $("page-cart");
    if (!cart.length) {
      el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;gap:14px;color:var(--muted);text-align:center">
        <div style="font-size:52px">\u{1F6D2}</div>
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
        <span style="font-size:18px">\u{1F4CD}</span>
        <div class="addr-text"><strong>Delivering to</strong>14B, Sector 9, Rohini, Delhi \u2014 110085</div>
        <div class="addr-change">Change</div>
      </div>
      ${cart.map((i) => `
      <div class="cart-row">
        <div class="cart-img">${emo(i.name)}</div>
        <div class="cart-info">
          <div class="cart-name">${i.name}</div>
          <div class="cart-price">\u20B9${i.price} \xD7 ${i.qty} = \u20B9${i.price * i.qty}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="removeFromCart('${i.id}')">\u2212</button>
          <span class="qty-n">${i.qty}</span>
          <button class="qty-btn" onclick="addToCart('${i.id}')">+</button>
        </div>
      </div>`).join("")}
      <div class="summary-card">
        <div class="s-row"><span>Subtotal</span><span>\u20B9${sub}</span></div>
        <div class="s-row"><span>Delivery fee</span><span>\u20B9${fee}</span></div>
        <div class="s-row total"><span>Total</span><span>\u20B9${sub + fee}</span></div>
      </div>
      <button class="btn btn-primary" onclick="placeOrder()">Place Order \xB7 \u20B9${sub + fee}</button>
    </div>`;
  }
  function placeOrder() {
    cart = [];
    updateBadge();
    toast("Order placed! \u{1F389}");
    nav("tracker");
  }
  var STEPS = [
    { key: "placed", label: "Order placed", time: "12:34 PM" },
    { key: "confirmed", label: "Confirmed", time: "12:36 PM" },
    { key: "preparing", label: "Being prepared", time: "12:40 PM" },
    { key: "out_for_delivery", label: "Out for delivery", time: "12:58 PM" },
    { key: "delivered", label: "Delivered", time: "" }
  ];
  var STATUS_IDX = {
    placed: 0,
    confirmed: 1,
    preparing: 2,
    out_for_delivery: 3,
    delivered: 4
  };
  function renderTracker() {
    const active = MOCK_ORDERS[0];
    const idx = STATUS_IDX[active.status];
    const el = $("page-tracker");
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
              <div class="tl-dot ${done ? "done" : act ? "active" : "pend"}">${done ? "\u2713" : ""}</div>
              ${!last ? `<div class="tl-line ${done ? "done" : ""}"></div>` : ""}
            </div>
            <div class="tl-right">
              <div class="tl-label ${i > idx ? "pend" : ""}">${s.label}</div>
              <div class="tl-time">${act ? "In progress\u2026" : done && s.time ? s.time : ""}</div>
            </div>
          </div>`;
    }).join("")}
      </div>

      <div class="driver-card" style="margin-bottom:20px">
        <div class="drv-av">\u{1F6F5}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-h);font-size:15px;font-weight:700">Ramesh K.</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Your delivery partner</div>
        </div>
        <button class="drv-call">\u{1F4DE}</button>
      </div>

      <div class="section-title" style="margin-bottom:12px">Items</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:24px">
        ${active.items.map((i) => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span>${i.name} \xD7 ${i.qty}</span><span>\u20B9${i.price * i.qty}</span>
        </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;font-family:var(--font-h);font-weight:700">
          <span>Total</span><span style="color:var(--accent)">\u20B9${active.total}</span>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:12px">Past orders</div>
      ${MOCK_ORDERS.slice(1).map((o) => `
      <div class="past-order">
        <div class="po-row">
          <div class="po-id">${o.id}</div>
          <div class="po-total">\u20B9${o.total}</div>
        </div>
        <div class="po-sub">${o.date} \xB7 ${o.time} \xB7 ${o.items.map((i) => i.name).join(", ")}</div>
        <div style="margin-top:7px"><span class="sp sp-${o.status}">${o.status.replace(/_/g, " ")}</span></div>
      </div>`).join("")}
    </div>`;
  }
  function renderAccount() {
    const el = $("page-account");
    el.innerHTML = `
    <div class="acct-wrap">
      <div class="acct-hero">
        <div class="acct-av">\u{1F9D1}</div>
        <div>
          <div class="acct-name">Arjun Sharma</div>
          <div class="acct-phone">+91 98765 43210</div>
          <div class="acct-edit" onclick="openEditProfile()">Edit profile \u2192</div>
        </div>
      </div>

      <div class="acct-menu">
        ${[
      ["\u{1F4E6}", "My Orders", "View full order history", "openOrderHistory"],
      ["\u{1F4CD}", "Saved Addresses", "Home, Office\u2026", "openAddresses"],
      ["\u{1F4B3}", "Payment Methods", "Add card or UPI", "openPayments"],
      ["\u{1F381}", "Refer & Earn", "Invite friends, get \u20B950", "openRefer"],
      ["\u2753", "Help & Support", "FAQs & chat", "openHelp"]
    ].map(([icon, label, sub, fn]) => `
        <div class="acct-item" onclick="${fn}()">
          <div class="ai-icon">${icon}</div>
          <div class="ai-text">
            <div class="ai-label">${label}</div>
            <div class="ai-sub">${sub}</div>
          </div>
          <div class="ai-arrow">\u203A</div>
        </div>`).join("")}
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
    <div style="margin-top:8px"><button class="btn btn-primary" onclick="toast('Profile saved \u2713');closeSheet()">Save changes</button></div>
  `);
  }
  function openOrderHistory() {
    openSheet(`
    <div class="sheet-title">My Orders</div>
    ${MOCK_ORDERS.map((o) => `
    <div class="order-hist-card">
      <div class="ohc-top">
        <div class="ohc-id">${o.id}</div>
        <div class="ohc-total">\u20B9${o.total}</div>
      </div>
      <div class="ohc-items">${o.items.length ? o.items.map((i) => `${i.name} \xD7${i.qty}`).join(" \xB7 ") : "Chicken Biryani \xD72"}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="sp sp-${o.status}">${o.status.replace(/_/g, " ")}</span>
        <span style="font-size:11px;color:var(--muted)">${o.date} \xB7 ${o.time}</span>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:12px;padding:10px" onclick="toast('Reorder placed!')">Reorder</button>
    </div>`).join("")}
  `);
  }
  function openAddresses() {
    openSheet(`
    <div class="sheet-title">Saved Addresses</div>
    ${SAVED_ADDRESSES.map((a) => `
    <div class="addr-saved">
      <span style="font-size:20px">\u{1F4CD}</span>
      <div>
        <div class="addr-lbl">${a.label}</div>
        <div class="addr-full">${a.full}</div>
      </div>
    </div>`).join("")}
    <button class="btn btn-outline" style="width:100%;margin-top:4px" onclick="toast('Add address (demo)')">+ Add new address</button>
  `);
  }
  function openPayments() {
    openSheet(`
    <div class="sheet-title">Payment Methods</div>
    ${[["\u{1F4B3}", "HDFC Debit Card", "\u2022\u2022\u2022\u2022 4821"], ["\u{1F4F1}", "Google Pay UPI", "arjun@oksbi"], ["\u{1F4B5}", "Cash on Delivery", "Always available"]].map(([icon, label, sub]) => `
    <div class="payment-card">
      <div class="pay-icon">${icon}</div>
      <div>
        <div class="pay-label">${label}</div>
        <div class="pay-sub">${sub}</div>
      </div>
    </div>`).join("")}
    <button class="btn btn-outline" style="width:100%;margin-top:4px" onclick="toast('Add method (demo)')">+ Add payment method</button>
  `);
  }
  function openRefer() {
    openSheet(`
    <div class="sheet-title">Refer & Earn</div>
    <div style="background:var(--bg3);border-radius:14px;padding:20px;text-align:center;margin-bottom:16px">
      <div style="font-size:40px;margin-bottom:10px">\u{1F381}</div>
      <div style="font-family:var(--font-h);font-size:20px;font-weight:800;margin-bottom:4px">Earn \u20B950 per referral</div>
      <div style="font-size:13px;color:var(--muted)">Share your code. When a friend orders, you both get \u20B950 off.</div>
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
      ["How do I track my order?", "Go to the Track tab in the bottom navigation. You'll see the live status of your active order and the assigned delivery partner."],
      ["Can I cancel an order?", "You can cancel within 2 minutes of placing an order by contacting our support. Once the restaurant starts preparing, cancellation is not possible."],
      ["What are the delivery hours?", "We deliver from 11:00 AM to 10:00 PM daily, including weekends and holidays."],
      ["Is there a minimum order value?", "Yes, the minimum order value is \u20B9100. A delivery fee of \u20B930 applies to all orders."],
      ["How do I report a missing item?", "Use the Help chat below and share your order ID. We'll resolve it within 30 minutes."]
    ];
    openSheet(`
    <div class="sheet-title">Help & Support</div>
    <div style="display:flex;gap:10px;margin-bottom:18px">
      <button class="btn btn-primary" style="font-size:12px;padding:12px" onclick="toast('Opening chat\u2026')">\u{1F4AC} Live Chat</button>
      <button class="btn btn-ghost" style="font-size:12px;padding:12px;flex:1" onclick="toast('Calling support\u2026')">\u{1F4DE} Call Us</button>
    </div>
    <div style="font-family:var(--font-h);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">FAQs</div>
    ${faqs.map(([q, a]) => `
    <div class="faq-item" onclick="this.classList.toggle('open')">
      <div class="faq-q">${q} <span>+</span></div>
      <div class="faq-a">${a}</div>
    </div>`).join("")}
  `);
  }
  function switchAdminTab(tab, el) {
    currentAdminTab = tab;
    document.querySelectorAll(".adm-tab").forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    renderAdminTab(tab);
  }
  function renderAdminTab(tab) {
    const el = $("adm-content");
    if (tab === "orders") {
      el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-v">18</div><div class="stat-l">Orders today</div></div>
        <div class="stat-card"><div class="stat-v">\u20B95,240</div><div class="stat-l">Revenue today</div></div>
        <div class="stat-card"><div class="stat-v">3</div><div class="stat-l">Active deliveries</div></div>
        <div class="stat-card"><div class="stat-v">28 min</div><div class="stat-l">Avg. delivery</div></div>
      </div>
      <div style="font-family:var(--font-h);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Live orders</div>
      ${ADMIN_ORDERS.map((o) => `
      <div class="adm-order">
        <div class="ao-top">
          <div class="ao-id">${o.id}</div>
          <span class="sp sp-${o.status}">${o.status.replace(/_/g, " ")}</span>
        </div>
        <div class="ao-addr">\u{1F4CD} ${o.address}</div>
        <div class="ao-foot">
          <div class="ao-drv">${o.driver ? `\u{1F6F5} ${o.driver}` : `<span style="color:var(--accent)">\u26A0 Unassigned</span>`}</div>
          <div class="ao-total">\u20B9${o.total}</div>
        </div>
        ${!o.driver ? `<button class="btn btn-primary" style="margin-top:10px;height:36px;font-size:12px" onclick="toast('Driver assigned \u2713')">Assign driver</button>` : ""}
      </div>`).join("")}
    `;
    } else if (tab === "menu") {
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span class="pill p-muted">${MENU_ITEMS.length} items</span>
        <button class="btn btn-primary" style="width:auto;padding:10px 18px;font-size:12px" onclick="openAdminAddItem()">+ Add item</button>
      </div>
      ${MENU_ITEMS.map((i) => `
      <div class="adm-menu-item">
        <div class="ami-img">${emo(i.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="ami-name">${i.name}</div>
          <div class="ami-cat">${i.category}</div>
          <div class="ami-price">\u20B9${i.price}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <button class="toggle ${i.available ? "on" : "off"}" onclick="this.className='toggle '+(this.className.includes(' on')?'off':'on');toast('Availability updated')"></button>
          <span style="font-size:10px;color:var(--muted);cursor:pointer;font-family:var(--font-h)" onclick="toast('Edit (demo)')">Edit</span>
        </div>
      </div>`).join("")}
    `;
    } else if (tab === "staff") {
      const staff = [
        { name: "Ramesh K.", orders: 6, status: "On delivery", online: true },
        { name: "Sunil P.", orders: 4, status: "On delivery", online: true },
        { name: "Arun M.", orders: 8, status: "Available", online: true },
        { name: "Deepak V.", orders: 3, status: "Off shift", online: false }
      ];
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span class="pill p-green">${staff.filter((s) => s.online).length} online</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:10px 16px" onclick="toast('Add staff (demo)')">+ Add staff</button>
      </div>
      ${staff.map((s) => `
      <div class="staff-card">
        <div class="staff-av">${s.online ? "\u{1F7E2}" : "\u26AB"}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-h);font-size:14px;font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.status}</div>
        </div>
        <div style="font-family:var(--font-h);font-size:12px;color:var(--accent)">${s.orders} orders</div>
      </div>`).join("")}
    `;
    } else if (tab === "settings") {
      el.innerHTML = `
      <div class="field"><label>Restaurant name</label><input type="text" value="Delivr Kitchen"/></div>
      <div class="field"><label>Contact phone</label><input type="tel" value="+91 98110 00000"/></div>
      <div class="field"><label>Opening hours</label><input type="text" value="11:00 AM \u2013 10:00 PM"/></div>
      <div class="field"><label>Delivery radius (km)</label><input type="number" value="5"/></div>
      <div class="field"><label>Min. order (\u20B9)</label><input type="number" value="100"/></div>
      <div class="field"><label>Delivery fee (\u20B9)</label><input type="number" value="30"/></div>
      <div class="divider"></div>
      <div style="margin-bottom:14px;font-family:var(--font-h);font-size:13px;font-weight:700">Promo Banners</div>
      ${PROMOTIONS.map((p, i) => `
      <div style="background:var(--bg3);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:center">
        <div style="width:10px;height:10px;border-radius:2px;background:${p.color};flex-shrink:0"></div>
        <div style="flex:1;font-family:var(--font-h);font-size:12px;font-weight:700">${p.title}</div>
        <span style="font-size:10px;color:var(--accent);cursor:pointer;font-family:var(--font-h)" onclick="toast('Edit promo (demo)')">Edit</span>
      </div>`).join("")}
      <div class="divider"></div>
      <button class="btn btn-primary" onclick="toast('Settings saved \u2713')">Save settings</button>
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
    <div class="field"><label>Price (\u20B9)</label><input type="number" placeholder="200"/></div>
    <div class="field"><label>Short description</label><input type="text" placeholder="Brief tagline"/></div>
    <div class="field"><label>Full description</label><textarea rows="3" placeholder="Detailed description for customers\u2026"></textarea></div>
    <div class="field"><label>Prep time</label><input type="text" placeholder="20\u201325 min"/></div>
    <div class="field"><label>Calories</label><input type="text" placeholder="380 kcal"/></div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;text-transform:none;letter-spacing:0">
        <input type="radio" name="veg" value="veg"/> Veg
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;text-transform:none;letter-spacing:0">
        <input type="radio" name="veg" value="nonveg" checked/> Non-veg
      </label>
    </div>
    <button class="btn btn-primary" onclick="toast('Item added \u2713');closeSheet()">Add to menu</button>
  `);
  }
  var g = window;
  g.setRole = setRole;
  g.setAuthMode = setAuthMode;
  g.doLogin = doLogin;
  g.doLogout = doLogout;
  g.nav = nav;
  g.addToCart = addToCart;
  g.removeFromCart = removeFromCart;
  g.openItemSheet_id = (id) => openItemSheet(MENU_ITEMS.find((i) => i.id === id));
  g.setHomeCat = (c) => {
    selectedCat = c;
    renderHome();
  };
  g.setMenuCat = (c) => {
    selectedCat = c;
    renderMenu();
  };
  g.setMenuSearch = (v) => {
    menuSearch = v;
    renderMenu();
  };
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
  renderLoginFields();
})();
