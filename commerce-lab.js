// Commerce Experience Lab: a fictional homeware store, Lumen & Clay.
// One state model drives the catalogue, product detail, wishlist, basket, promotions and checkout.
// Everything is illustrative: no payments, no real orders. State is kept in this browser only.
(() => {
  /* ---------- Core: catalogue, rules and pricing (no DOM) ---------- */
  const C = {
    sand: ["Sand", "#D8B98F"], clay: ["Clay", "#B5653F"], ink: ["Ink", "#2F3340"], mist: ["Mist", "#C3D2DC"], moss: ["Moss", "#7C8B62"],
    bone: ["Bone", "#E9E1D2"], brass: ["Brass", "#C9A257"], chalk: ["Chalk", "#E6E2D9"], amber: ["Amber", "#D9963E"], smoke: ["Smoke", "#8A8580"],
    oat: ["Oat", "#D6C6A8"], rust: ["Rust", "#A9532F"], sea: ["Sea", "#4F6E7A"], clear: ["Clear", "#C9DEE3"], oak: ["Oak", "#B8895A"], walnut: ["Walnut", "#6B4A32"],
  };
  const CATS = ["Ceramics", "Lighting", "Textiles", "Table"];
  const P = [
    { id: "dune", name: "Dune Vase", cat: "Ceramics", price: 68, shape: "vase", mat: "Stoneware, matt glaze", desc: "A wide-shouldered vase thrown by hand, glazed to feel like warm sand.", colors: { sand: 6, clay: 2, ink: 0 }, sizes: [["Small", 0], ["Large", 24]], pairs: ["tide", "ember", "board"], feat: true },
    { id: "tide", name: "Tide Bowl", cat: "Ceramics", price: 42, shape: "bowl", mat: "Porcelain, satin glaze", desc: "A shallow serving bowl with a softly rolled rim.", colors: { mist: 8, moss: 4, bone: 5 }, pairs: ["ridge", "carafe", "dune"] },
    { id: "mug", name: "Morning Mug", cat: "Ceramics", price: 24, shape: "mug", mat: "Stoneware, gloss inside", desc: "Holds a proper coffee. Comfortable two-finger handle.", colors: { sand: 12, ink: 9, clay: 0 }, pairs: ["carafe", "board", "tide"] },
    { id: "halo", name: "Halo Table Lamp", cat: "Lighting", price: 149, shape: "lamp", mat: "Linen shade, metal base", desc: "A warm, diffused light for reading corners and bedside tables.", colors: { brass: 3, chalk: 5 }, pairs: ["ember", "loom", "pleat"], feat: true },
    { id: "orbit", name: "Orbit Pendant", cat: "Lighting", price: 189, shape: "pendant", mat: "Spun aluminium", desc: "A low dome pendant for dining tables. Soft glow, no glare.", colors: { ink: 2, clay: 1, bone: 0 }, pairs: ["ridge", "halo", "board"] },
    { id: "ember", name: "Ember Candle", cat: "Lighting", price: 28, shape: "candle", mat: "Soy wax in recycled glass", desc: "Cedar and smoked vanilla. Around 45 hours.", colors: { amber: 15, smoke: 10 }, pairs: ["dune", "halo", "loom"] },
    { id: "loom", name: "Loom Throw", cat: "Textiles", price: 119, shape: "throw", mat: "Wool and cotton", desc: "A heavy herringbone throw, woven for long winters.", colors: { oat: 6, rust: 3, sea: 0 }, sizes: [["130 × 170 cm", 0], ["150 × 200 cm", 30]], pairs: ["pleat", "halo", "ember"], feat: true },
    { id: "pleat", name: "Pleat Cushion", cat: "Textiles", price: 54, shape: "cushion", mat: "Washed linen, feather pad", desc: "Tailored pleats and a relaxed fill.", colors: { oat: 8, rust: 5, moss: 4 }, pairs: ["loom", "halo"] },
    { id: "carafe", name: "Still Carafe", cat: "Table", price: 46, shape: "carafe", mat: "Mouth-blown glass", desc: "A one-litre carafe with a tumbler that doubles as a lid.", colors: { clear: 7, smoke: 3 }, pairs: ["tide", "mug", "ridge"] },
    { id: "ridge", name: "Ridge Plate Set", cat: "Table", price: 78, shape: "plates", mat: "Stoneware, set of four", desc: "Dinner plates with a fine ridged edge.", colors: { bone: 4, ink: 6 }, pairs: ["tide", "carafe", "orbit"] },
    { id: "board", name: "Grain Board", cat: "Table", price: 64, shape: "board", mat: "Solid oak or walnut", desc: "A serving board cut from a single plank, oiled by hand.", colors: { oak: 5, walnut: 2 }, pairs: ["ridge", "mug", "dune"] },
  ];
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  const DELIVERY = 9, FREE_OVER = 150;
  const PROMOS = {
    WELCOME10: { label: "10% off orders over $100", min: 100, rate: 0.10, scope: "all" },
    HOME20: { label: "20% off lighting", rate: 0.20, scope: "Lighting" },
  };
  const round2 = (n) => Math.round(n * 100) / 100;
  const key = (l) => `${l.id}:${l.color}:${l.size || ""}`;
  const stockKey = (id, color) => `${id}:${color}`;
  const unitPrice = (l) => { const p = byId[l.id]; const s = p.sizes?.find((x) => x[0] === l.size); return p.price + (s ? s[1] : 0); };
  const stockOf = (st, id, color) => st.stock[stockKey(id, color)] ?? byId[id].colors[color];
  const inBasket = (st, id, color) => st.basket.filter((l) => l.id === id && l.color === color).reduce((a, l) => a + l.qty, 0);
  const canAdd = (st, id, color) => stockOf(st, id, color) - inBasket(st, id, color);
  function addLine(st, id, color, size, qty = 1) {
    const room = canAdd(st, id, color);
    if (room <= 0 || qty <= 0) return 0;
    const n = Math.min(qty, room);
    const l = st.basket.find((x) => x.id === id && x.color === color && (x.size || "") === (size || ""));
    if (l) l.qty += n; else st.basket.push({ id, color, size: size || "", qty: n });
    return n;
  }
  function setQty(st, k, qty) {
    const l = st.basket.find((x) => key(x) === k); if (!l) return;
    const others = inBasket(st, l.id, l.color) - l.qty;
    const max = stockOf(st, l.id, l.color) - others;
    const q = Math.max(0, Math.min(Math.floor(qty), max));
    if (q === 0) st.basket = st.basket.filter((x) => x !== l); else l.qty = q;
  }
  function totals(st) {
    const lines = st.basket.map((l) => ({ ...l, unit: unitPrice(l), total: round2(unitPrice(l) * l.qty), cat: byId[l.id].cat }));
    const sub = round2(lines.reduce((a, l) => a + l.total, 0));
    const items = lines.reduce((a, l) => a + l.qty, 0);
    const pr = st.promo && PROMOS[st.promo];
    let discount = 0, promoNote = "";
    if (pr) {
      const base = pr.scope === "all" ? sub : round2(lines.filter((l) => l.cat === pr.scope).reduce((a, l) => a + l.total, 0));
      if (pr.min && sub < pr.min) promoNote = `Add $${(pr.min - sub).toFixed(2)} more to use ${st.promo}`;
      else if (!base) promoNote = `${st.promo} applies to ${pr.scope.toLowerCase()} only`;
      else discount = round2(base * pr.rate);
    }
    const afterDiscount = round2(sub - discount);
    const delivery = !items ? 0 : afterDiscount >= FREE_OVER ? 0 : DELIVERY;
    return { lines, items, sub, discount, promoNote, afterDiscount, delivery, total: round2(afterDiscount + delivery), toFree: items && afterDiscount < FREE_OVER ? round2(FREE_OVER - afterDiscount) : 0 };
  }
  function checkout(st) {
    const t = totals(st); if (!t.items) return null;
    t.lines.forEach((l) => { st.stock[stockKey(l.id, l.color)] = stockOf(st, l.id, l.color) - l.qty; });
    const order = { no: "LC-" + String(24817 + st.orders.length * 37), lines: t.lines.map((l) => ({ id: l.id, color: l.color, size: l.size, qty: l.qty, total: l.total })), sub: t.sub, discount: t.discount, delivery: t.delivery, total: t.total, promo: t.discount ? st.promo : "" };
    st.orders.unshift(order); st.basket = []; st.promo = "";
    return order;
  }
  function recommend(st, fromId) {
    const inB = new Set(st.basket.map((l) => l.id));
    const seeds = fromId ? [fromId] : [...inB];
    const score = {};
    seeds.forEach((s) => byId[s].pairs.forEach((p, i) => { if (!inB.has(p) && p !== fromId) score[p] = (score[p] || 0) + 3 - i; }));
    return Object.entries(score).sort((a, b) => b[1] - a[1]).map(([id]) => byId[id]).filter((p) => Object.keys(p.colors).some((c) => canAdd(st, p.id, c) > 0)).slice(0, 3);
  }
  const fresh = () => ({ v: 1, basket: [], wish: [], promo: "", stock: {}, orders: [] });
  const CORE = { P, byId, PROMOS, CATS, DELIVERY, FREE_OVER, addLine, setQty, totals, checkout, recommend, canAdd, stockOf, fresh, key, unitPrice };
  if (typeof module !== "undefined") { module.exports = CORE; return; }

  /* ---------- View ---------- */
  const root = document.querySelector("[data-commerce-lab]");
  if (!root) return;
  const KEY = "bb-commerce-lab-v1";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, el = root) => el.querySelector(s);
  const money = (n) => "$" + n.toFixed(2).replace(/\.00$/, "");
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !Array.isArray(S.basket)) S = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const ui = { cat: "All", sort: "featured", q: "", tint: {}, open: null, pick: null, drawer: null, order: null, promoMsg: "", added: "", ret: null };

  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)); return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join(""); };
  function art(p, color, size) {
    const c = C[color][1], d = shade(c, -0.22), l = shade(c, 0.35), big = size && p.sizes && size === p.sizes[1][0];
    const g = `<ellipse cx="100" cy="176" rx="${big ? 62 : 54}" ry="8" fill="#000" opacity=".08"/>`;
    const S = {
      vase: `<g transform="translate(100 176) scale(${big ? 1.12 : 0.94}) translate(-100 -176)"><path d="M84 46h32v12c0 9 30 22 30 62 0 36-20 56-46 56s-46-20-46-56c0-40 30-53 30-62z" fill="${c}"/><path d="M84 46h32v6H84z" fill="${d}"/><path d="M122 70c16 12 22 30 22 50 0 30-14 48-34 54 14-12 20-30 20-54 0-22-4-38-8-50z" fill="${d}" opacity=".45"/><path d="M70 92c-6 10-8 20-8 30" stroke="${l}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></g>`,
      bowl: `<path d="M28 104h144c0 42-32 66-72 66s-72-24-72-66z" fill="${c}"/><ellipse cx="100" cy="104" rx="72" ry="16" fill="${l}"/><ellipse cx="100" cy="106" rx="62" ry="11" fill="${d}" opacity=".35"/><path d="M146 116c-6 24-24 40-46 44 18-8 32-24 36-44z" fill="${d}" opacity=".4"/>`,
      mug: `<rect x="56" y="78" width="78" height="96" rx="12" fill="${c}"/><path d="M134 100c22 0 26 34 0 38" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/><ellipse cx="95" cy="80" rx="39" ry="8" fill="${d}"/><rect x="112" y="84" width="14" height="84" rx="7" fill="${d}" opacity=".35"/>`,
      lamp: `<path d="M64 40h72l20 62H44z" fill="${C.chalk[1]}"/><path d="M118 40h18l20 62h-22z" fill="#000" opacity=".06"/><rect x="96" y="102" width="8" height="54" fill="${d}"/><path d="M64 172c0-12 16-18 36-18s36 6 36 18z" fill="${c}"/><ellipse cx="100" cy="102" rx="56" ry="7" fill="#FFE8B5" opacity=".7"/>`,
      pendant: `<rect x="98" y="0" width="4" height="70" fill="${d}"/><path d="M36 128c0-36 28-58 64-58s64 22 64 58z" fill="${c}"/><rect x="36" y="124" width="128" height="8" rx="4" fill="${d}"/><ellipse cx="100" cy="134" rx="40" ry="10" fill="#FFE2A3" opacity=".9"/><path d="M60 140 40 176h120l-20-36z" fill="#FFE2A3" opacity=".25"/>`,
      candle: `<rect x="62" y="84" width="76" height="90" rx="10" fill="${c}" opacity=".9"/><rect x="62" y="84" width="76" height="20" rx="6" fill="${l}" opacity=".7"/><rect x="98" y="66" width="4" height="20" fill="#3A3330"/><path d="M100 40c8 10 10 18 0 28-10-10-8-18 0-28z" fill="#F5B53D"/><rect x="118" y="96" width="10" height="70" rx="5" fill="#fff" opacity=".25"/>`,
      throw: `<g transform="translate(100 176) scale(${big ? 1.1 : 0.96}) translate(-100 -176)"><rect x="34" y="124" width="132" height="44" rx="8" fill="${d}"/><rect x="30" y="92" width="140" height="40" rx="8" fill="${c}"/><rect x="38" y="62" width="124" height="36" rx="8" fill="${l}"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${50 + i * 17} 96l6 -6 6 6" stroke="${d}" stroke-width="2" fill="none" opacity=".5"/>`).join("")}${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${40 + i * 14}" y="168" width="3" height="8" fill="${d}"/>`).join("")}</g>`,
      cushion: `<path d="M44 66c20 8 92 8 112 0 8 30 8 72 0 102-20-8-92-8-112 0-8-30-8-72 0-102z" fill="${c}"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${70 + i * 15} 76v84" stroke="${d}" stroke-width="2" opacity=".45"/>`).join("")}<path d="M44 66c20 8 92 8 112 0" stroke="${l}" stroke-width="3" fill="none"/>`,
      carafe: `<path d="M86 36h28v28c0 10 30 24 30 62 0 34-20 50-44 50s-44-16-44-50c0-38 30-52 30-62z" fill="${c}" opacity=".75"/><rect x="84" y="26" width="32" height="16" rx="4" fill="${d}" opacity=".8"/><path d="M64 120c0 26 14 40 36 40s36-14 36-40z" fill="${d}" opacity=".35"/><path d="M76 90c-6 10-8 22-8 32" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>`,
      plates: [0, 1, 2, 3].map((i) => `<ellipse cx="100" cy="${150 - i * 12}" rx="76" ry="20" fill="${i % 2 ? c : d}"/><ellipse cx="100" cy="${147 - i * 12}" rx="56" ry="13" fill="${l}" opacity=".7"/>`).join(""),
      board: `<rect x="36" y="64" width="128" height="108" rx="16" fill="${c}"/><circle cx="148" cy="80" r="7" fill="#F4EFE7"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M48 ${90 + i * 16}c30-6 60 6 100-2" stroke="${d}" stroke-width="2" fill="none" opacity=".45"/>`).join("")}<rect x="36" y="160" width="128" height="12" rx="6" fill="${d}" opacity=".5"/>`,
    };
    return `<svg viewBox="0 0 200 190" class="cl-art" role="img" aria-label="${esc(p.name)} in ${C[color][0]}">${g}${S[p.shape]}</svg>`;
  }
  const firstColor = (p) => Object.keys(p.colors).find((c) => canAdd(S, p.id, c) > 0) || Object.keys(p.colors)[0];
  const tintOf = (p) => ui.tint[p.id] || firstColor(p);
  const bg = (p, color) => shade(C[color][1], 0.78);
  const heart = (on) => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-9.2C1.6 7.3 4 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4 20 4 22.4 7.3 21 10.8 19 15.6 12 20 12 20z" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const bagIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  function visible() {
    const q = ui.q.trim().toLowerCase();
    let list = P.filter((p) => (ui.cat === "All" || p.cat === ui.cat) && (!q || `${p.name} ${p.cat} ${p.mat}`.toLowerCase().includes(q)));
    if (ui.sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (ui.sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }
  function shop() {
    const list = visible(), wish = new Set(S.wish);
    const feat = byId.loom, fc = tintOf(feat);
    return `
      <section class="cl-edit" style="--tint:${bg(feat, fc)}">
        <div class="cl-edit-copy"><span class="cl-k">The autumn edit</span><h3>Objects for slower evenings.</h3><p>Wool, warm light and pieces made to be used every day.</p>
          <button type="button" class="cl-btn" data-cl-open="loom">Shop the Loom Throw</button></div>
        <button type="button" class="cl-edit-art" data-cl-open="loom" aria-label="Open Loom Throw">${art(feat, fc)}</button>
        <ul class="cl-offers"><li><b>WELCOME10</b> 10% off orders over $100</li><li><b>HOME20</b> 20% off lighting</li><li><b>Free delivery</b> over $${FREE_OVER}</li></ul>
      </section>
      <div class="cl-tools">
        <div class="cl-cats" role="group" aria-label="Category">${["All", ...CATS].map((c) => `<button type="button" data-cl-cat="${c}" aria-pressed="${ui.cat === c}">${c}<small>${c === "All" ? P.length : P.filter((p) => p.cat === c).length}</small></button>`).join("")}</div>
        <label class="cl-sort"><span>Sort</span><select data-cl-sort>${[["featured", "Featured"], ["low", "Price, low to high"], ["high", "Price, high to low"]].map(([v, l]) => `<option value="${v}"${ui.sort === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      </div>
      <p class="cl-count" aria-live="polite">${list.length} ${list.length === 1 ? "object" : "objects"}${ui.q ? ` for “${esc(ui.q)}”` : ""}</p>
      ${list.length ? `<ul class="cl-grid">${list.map((p, i) => {
        const col = tintOf(p), out = Object.keys(p.colors).every((c) => stockOf(S, p.id, c) <= 0);
        return `<li class="cl-tile${i === 0 && ui.cat === "All" && !ui.q && ui.sort === "featured" ? " wide" : ""}" style="--tint:${bg(p, col)}">
          <button type="button" class="cl-tile-art" data-cl-open="${p.id}" aria-label="Open ${esc(p.name)}">${art(p, col)}</button>
          <button type="button" class="cl-heart${wish.has(p.id) ? " on" : ""}" data-cl-wish="${p.id}" aria-pressed="${wish.has(p.id)}" aria-label="${wish.has(p.id) ? "Remove" : "Save"} ${esc(p.name)}">${heart(wish.has(p.id))}</button>
          <div class="cl-tile-info"><button type="button" class="cl-name" data-cl-open="${p.id}">${esc(p.name)}</button><span class="cl-price">${money(p.price)}${p.sizes ? "+" : ""}</span>
            <span class="cl-dots" role="group" aria-label="Preview colour">${Object.keys(p.colors).map((c) => `<button type="button" data-cl-tint="${p.id}" data-v="${c}" style="--c:${C[c][1]}" aria-pressed="${col === c}" aria-label="${C[c][0]}"></button>`).join("")}</span>
            ${out ? '<em class="cl-out">Sold out</em>' : ""}</div></li>`;
      }).join("")}</ul>` : `<div class="cl-empty"><b>Nothing matches yet</b><p>Try another word, or clear the search.</p><button type="button" class="cl-btn ghost" data-cl-clear>Clear search</button></div>`}`;
  }

  function detail() {
    const p = byId[ui.open]; if (!p) return "";
    const pk = ui.pick, room = canAdd(S, p.id, pk.color), wish = S.wish.includes(p.id);
    const unit = unitPrice({ id: p.id, size: pk.size }), recs = recommend(S, p.id);
    const stockMsg = room <= 0 ? (stockOf(S, p.id, pk.color) <= 0 ? "Sold out in this colour" : "All available stock is in your basket") : room <= 3 ? `Only ${room} left` : "In stock";
    return `<div class="cl-scrim" data-cl-close></div><div class="cl-dialog" role="dialog" aria-modal="true" aria-labelledby="cl-d-t">
      <button type="button" class="cl-x" data-cl-close aria-label="Close">×</button>
      <div class="cl-d-art" style="--tint:${bg(p, pk.color)}">${art(p, pk.color, pk.size)}<span class="cl-k">${esc(p.cat)}</span></div>
      <div class="cl-d-info">
        <h4 id="cl-d-t">${esc(p.name)}</h4><p class="cl-d-price">${money(unit)}</p><p class="cl-d-desc">${esc(p.desc)}</p><p class="cl-mat">${esc(p.mat)}</p>
        <fieldset class="cl-opt"><legend>Colour · <b>${C[pk.color][0]}</b></legend><div class="cl-swatches">${Object.keys(p.colors).map((c) => { const none = stockOf(S, p.id, c) <= 0; return `<label class="cl-sw${none ? " none" : ""}" style="--c:${C[c][1]}"><input type="radio" name="cl-color" value="${c}" data-cl-color ${pk.color === c ? "checked" : ""} ${none ? "disabled" : ""}><span class="sr-only">${C[c][0]}${none ? ", sold out" : ""}</span></label>`; }).join("")}</div></fieldset>
        ${p.sizes ? `<fieldset class="cl-opt"><legend>Size</legend><div class="cl-sizes">${p.sizes.map(([s, d]) => `<label><input type="radio" name="cl-size" value="${esc(s)}" data-cl-size ${pk.size === s ? "checked" : ""}><span>${esc(s)}${d ? ` <small>+${money(d)}</small>` : ""}</span></label>`).join("")}</div></fieldset>` : ""}
        <p class="cl-stock${room <= 0 ? " none" : room <= 3 ? " low" : ""}" aria-live="polite">${stockMsg}</p>
        <div class="cl-buy"><div class="cl-qty" role="group" aria-label="Quantity"><button type="button" data-cl-pickqty="-1" aria-label="Decrease quantity" ${pk.qty <= 1 ? "disabled" : ""}>−</button><output>${pk.qty}</output><button type="button" data-cl-pickqty="1" aria-label="Increase quantity" ${pk.qty >= room ? "disabled" : ""}>+</button></div>
          <button type="button" class="cl-btn add" data-cl-add="${p.id}" ${room <= 0 ? "disabled" : ""}>${room <= 0 ? "Unavailable" : `Add to basket · ${money(unit * Math.min(pk.qty, Math.max(room, 1)))}`}</button>
          <button type="button" class="cl-heart big${wish ? " on" : ""}" data-cl-wish="${p.id}" aria-pressed="${wish}" aria-label="${wish ? "Remove from" : "Save to"} wishlist">${heart(wish)}</button></div>
        ${ui.added ? `<p class="cl-added" role="status">${esc(ui.added)} <button type="button" class="cl-link" data-cl-drawer="basket">View basket</button></p>` : ""}
        ${recs.length ? `<div class="cl-recs"><span class="cl-k">Pairs well with</span><ul>${recs.map((r) => `<li><button type="button" data-cl-open="${r.id}" style="--tint:${bg(r, firstColor(r))}">${art(r, firstColor(r))}<span><b>${esc(r.name)}</b>${money(r.price)}</span></button></li>`).join("")}</ul></div>` : ""}
      </div></div>`;
  }

  function drawer() {
    if (!ui.drawer) return "";
    const t = totals(S), wish = S.wish.map((id) => byId[id]);
    let body = "";
    if (ui.drawer === "order" && ui.order) {
      const o = ui.order;
      body = `<div class="cl-done"><span class="cl-tick" aria-hidden="true">✓</span><h4 id="cl-dr-t">Order placed</h4><p>Order <b>${o.no}</b> · ${o.lines.reduce((a, l) => a + l.qty, 0)} items · ${money(o.total)}</p>
        <ul class="cl-order">${o.lines.map((l) => `<li><span>${l.qty} × ${esc(byId[l.id].name)} <small>${C[l.color][0]}${l.size ? " · " + esc(l.size) : ""}</small></span><b>${money(l.total)}</b></li>`).join("")}
          <li class="t"><span>Subtotal</span><b>${money(o.sub)}</b></li>${o.discount ? `<li class="t"><span>Discount (${o.promo})</span><b>−${money(o.discount)}</b></li>` : ""}<li class="t"><span>Delivery</span><b>${o.delivery ? money(o.delivery) : "Free"}</b></li><li class="t total"><span>Total</span><b>${money(o.total)}</b></li></ul>
        <p class="cl-fine">A demo order: no payment was taken and nothing will ship. Stock in the store has been reduced to match.</p>
        <button type="button" class="cl-btn" data-cl-drawer-close>Continue shopping</button></div>`;
    } else if (ui.drawer === "saved") {
      body = `<h4 id="cl-dr-t">Saved <small>${wish.length}</small></h4>${wish.length ? `<ul class="cl-lines">${wish.map((p) => { const c = firstColor(p), room = canAdd(S, p.id, c); return `<li><span class="cl-thumb" style="--tint:${bg(p, c)}">${art(p, c)}</span><span class="cl-l-info"><button type="button" class="cl-name" data-cl-open="${p.id}">${esc(p.name)}</button><small>${money(p.price)} · ${C[c][0]}</small></span><span class="cl-l-act"><button type="button" class="cl-btn sm" data-cl-quick="${p.id}" data-v="${c}" ${room <= 0 ? "disabled" : ""}>${room <= 0 ? "Sold out" : "Add"}</button><button type="button" class="cl-link" data-cl-wish="${p.id}">Remove</button></span></li>`; }).join("")}</ul>` : `<div class="cl-empty"><b>Nothing saved yet</b><p>Tap the heart on any object to keep it here.</p></div>`}`;
    } else {
      const recs = recommend(S);
      body = `<h4 id="cl-dr-t">Basket <small>${t.items} ${t.items === 1 ? "item" : "items"}</small></h4>
        ${t.items ? `<ul class="cl-lines">${t.lines.map((l) => { const p = byId[l.id], k = key(l), max = stockOf(S, l.id, l.color) - (inBasket(S, l.id, l.color) - l.qty); return `<li><span class="cl-thumb" style="--tint:${bg(p, l.color)}">${art(p, l.color, l.size)}</span>
            <span class="cl-l-info"><b>${esc(p.name)}</b><small>${C[l.color][0]}${l.size ? " · " + esc(l.size) : ""} · ${money(l.unit)}</small>
              <span class="cl-qty sm" role="group" aria-label="Quantity of ${esc(p.name)}"><button type="button" data-cl-qty="${k}" data-d="-1" aria-label="Decrease">−</button><output>${l.qty}</output><button type="button" data-cl-qty="${k}" data-d="1" aria-label="Increase" ${l.qty >= max ? "disabled" : ""}>+</button></span></span>
            <span class="cl-l-act"><b>${money(l.total)}</b><button type="button" class="cl-link" data-cl-remove="${k}">Remove</button></span></li>`; }).join("")}</ul>
          <div class="cl-free"><span>${t.toFree ? `Spend ${money(t.toFree)} more for free delivery` : "Free delivery unlocked"}</span><i style="--p:${Math.min(100, (t.afterDiscount / FREE_OVER) * 100)}%"></i></div>
          <form class="cl-promo" data-cl-promo-form><label for="cl-code">Promo code</label><div><input id="cl-code" autocomplete="off" placeholder="WELCOME10 or HOME20" value="${esc(S.promo)}"><button type="submit" class="cl-btn sm" data-cl-promo-apply>Apply</button></div>
            ${ui.promoMsg ? `<p class="cl-promo-msg" role="status">${esc(ui.promoMsg)}</p>` : ""}${S.promo ? `<p class="cl-promo-on"><b>${S.promo}</b> · ${PROMOS[S.promo].label}${t.promoNote ? ` · <em>${esc(t.promoNote)}</em>` : ""} <button type="button" class="cl-link" data-cl-promo-clear>Remove</button></p>` : ""}</form>
          <dl class="cl-totals"><div><dt>Subtotal</dt><dd>${money(t.sub)}</dd></div><div><dt>Discount${S.promo && t.discount ? ` (${S.promo})` : ""}</dt><dd>${t.discount ? "−" + money(t.discount) : money(0)}</dd></div><div><dt>Delivery</dt><dd>${t.delivery ? money(t.delivery) : "Free"}</dd></div><div class="total"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl>
          ${recs.length ? `<div class="cl-recs in"><span class="cl-k">Complete the set</span><ul>${recs.map((r) => { const c = firstColor(r); return `<li><button type="button" data-cl-quick="${r.id}" data-v="${c}" style="--tint:${bg(r, c)}" aria-label="Add ${esc(r.name)} in ${C[c][0]}">${art(r, c)}<span><b>${esc(r.name)}</b>${money(r.price)} · Add</span></button></li>`; }).join("")}</ul></div>` : ""}
          <button type="button" class="cl-btn pay" data-cl-checkout>Place demo order · ${money(t.total)}</button><p class="cl-fine">No payment details needed. Nothing is charged.</p>`
        : `<div class="cl-empty"><b>Your basket is empty</b><p>Open any object to choose a colour and add it.</p><button type="button" class="cl-btn ghost" data-cl-drawer-close>Browse the edit</button></div>`}`;
    }
    return `<div class="cl-scrim" data-cl-drawer-close></div><aside class="cl-drawer" role="dialog" aria-modal="true" aria-labelledby="cl-dr-t">
      <div class="cl-dr-tabs">${ui.drawer !== "order" ? `<button type="button" data-cl-drawer="basket" aria-pressed="${ui.drawer === "basket"}">Basket</button><button type="button" data-cl-drawer="saved" aria-pressed="${ui.drawer === "saved"}">Saved</button>` : "<span></span>"}<button type="button" class="cl-x" data-cl-drawer-close aria-label="Close">×</button></div>
      <div class="cl-dr-body">${body}</div></aside>`;
  }

  root.innerHTML = `<div class="cl-store">
      <header class="cl-bar"><span class="cl-brand">Lumen <i>&amp;</i> Clay</span>
        <label class="cl-search"><span class="sr-only">Search the store</span><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" placeholder="Search vases, lamps, linen…" data-cl-q autocomplete="off"></label>
        <button type="button" class="cl-bar-btn" data-cl-drawer="saved" aria-label="Saved items">${heart(false)}<em data-cl-wcount></em></button>
        <button type="button" class="cl-bar-btn bag" data-cl-drawer="basket" aria-label="Basket">${bagIcon}<em data-cl-bcount></em></button>
      </header>
      <div class="cl-shop" data-cl-shop></div>
      <footer class="cl-foot"><span data-cl-orders></span><button type="button" class="cl-reset" data-cl-reset>Reset demo store</button></footer>
    </div><div data-cl-layer></div><p class="sr-only" aria-live="polite" data-cl-live></p>`;
  const layer = $("[data-cl-layer]");
  const say = (t) => { $("[data-cl-live]").textContent = t; };

  function render(focusSel) {
    const t = totals(S);
    $("[data-cl-shop]").innerHTML = shop();
    $("[data-cl-bcount]").textContent = t.items || "";
    $("[data-cl-wcount]").textContent = S.wish.length || "";
    $(".cl-bar-btn.bag").setAttribute("aria-label", `Basket, ${t.items} ${t.items === 1 ? "item" : "items"}, ${money(t.total)}`);
    $("[data-cl-orders]").textContent = S.orders.length ? `${S.orders.length} demo ${S.orders.length === 1 ? "order" : "orders"} placed · last ${S.orders[0].no}` : "Demo store · nothing is charged";
    layer.innerHTML = ui.open ? detail() : drawer();
    document.documentElement.classList.toggle("cl-lock", !!(ui.open || ui.drawer));
    if (focusSel) (root.querySelector(focusSel) || layer.querySelector(".cl-x"))?.focus({ preventScroll: true });
  }
  function openProduct(id) {
    const p = byId[id]; ui.ret = ui.ret || document.activeElement;
    ui.drawer = null; ui.open = id; ui.added = "";
    const col = canAdd(S, id, ui.tint[id]) > 0 ? ui.tint[id] : firstColor(p);
    ui.pick = { color: col || firstColor(p), size: p.sizes ? p.sizes[0][0] : "", qty: 1 };
    render(".cl-dialog .cl-x");
  }
  function closeLayer() { ui.open = null; ui.drawer = null; ui.added = ""; ui.promoMsg = ""; render(); ui.ret?.focus?.({ preventScroll: true }); ui.ret = null; }

  root.addEventListener("click", (e) => {
    const el = (s) => e.target.closest(s); let b;
    if ((b = el("[data-cl-open]"))) return openProduct(b.dataset.clOpen);
    if ((b = el("[data-cl-cat]"))) { ui.cat = b.dataset.clCat; return render(`[data-cl-cat="${ui.cat}"]`); }
    if ((b = el("[data-cl-tint]"))) { ui.tint[b.dataset.clTint] = b.dataset.v; return render(`[data-cl-tint="${b.dataset.clTint}"][data-v="${b.dataset.v}"]`); }
    if ((b = el("[data-cl-wish]"))) {
      const id = b.dataset.clWish, on = S.wish.includes(id);
      S.wish = on ? S.wish.filter((x) => x !== id) : [...S.wish, id]; save();
      say(`${byId[id].name} ${on ? "removed from" : "saved to"} your wishlist.`);
      const inDialog = !!b.closest(".cl-dialog"), inDrawer = !!b.closest(".cl-drawer");
      return render(inDialog ? `.cl-dialog [data-cl-wish]` : inDrawer ? ".cl-drawer .cl-x" : `.cl-grid [data-cl-wish="${id}"]`);
    }
    if (el("[data-cl-clear]")) { ui.q = ""; $("[data-cl-q]").value = ""; return render("[data-cl-q]"); }
    if ((b = el("[data-cl-pickqty]"))) { const room = canAdd(S, ui.open, ui.pick.color); ui.pick.qty = Math.max(1, Math.min(room, ui.pick.qty + +b.dataset.clPickqty)); return render(`[data-cl-pickqty="${b.dataset.clPickqty}"]`); }
    if ((b = el("[data-cl-add]"))) {
      const p = byId[b.dataset.clAdd], n = addLine(S, p.id, ui.pick.color, ui.pick.size, ui.pick.qty);
      if (n) { save(); ui.added = `Added ${n} × ${p.name} (${C[ui.pick.color][0]}).`; ui.pick.qty = 1; say(ui.added + ` Basket total ${money(totals(S).total)}.`); }
      return render(".cl-dialog .cl-added .cl-link");
    }
    if ((b = el("[data-cl-quick]"))) { const p = byId[b.dataset.clQuick], n = addLine(S, p.id, b.dataset.v, p.sizes ? p.sizes[0][0] : "", 1); if (n) { save(); say(`Added ${p.name}. Basket total ${money(totals(S).total)}.`); } ui.drawer = "basket"; return render(".cl-drawer .cl-x"); }
    if ((b = el("[data-cl-drawer]"))) { ui.ret = ui.ret || (b.closest(".cl-bar") ? b : null); ui.open = null; ui.drawer = b.dataset.clDrawer; ui.promoMsg = ""; return render(`.cl-drawer [data-cl-drawer="${ui.drawer}"]`); }
    if (el("[data-cl-drawer-close]") || el("[data-cl-close]")) return closeLayer();
    if ((b = el("[data-cl-qty]"))) { const l = S.basket.find((x) => key(x) === b.dataset.clQty); if (l) { setQty(S, b.dataset.clQty, l.qty + +b.dataset.d); save(); } const still = S.basket.some((x) => key(x) === b.dataset.clQty); return render(still ? `[data-cl-qty="${b.dataset.clQty}"][data-d="${b.dataset.d}"]` : ".cl-drawer .cl-x"); }
    if ((b = el("[data-cl-remove]"))) { setQty(S, b.dataset.clRemove, 0); save(); return render(".cl-drawer .cl-x"); }
    if (el("[data-cl-promo-clear]")) { S.promo = ""; ui.promoMsg = "Code removed."; save(); return render("#cl-code"); }
    if (el("[data-cl-checkout]")) { const o = checkout(S); if (o) { save(); ui.order = o; ui.drawer = "order"; say(`Demo order ${o.no} placed. Total ${money(o.total)}.`); } return render(".cl-drawer .cl-btn"); }
    if (el("[data-cl-reset]")) { S = fresh(); save(); Object.assign(ui, { cat: "All", sort: "featured", q: "", tint: {}, open: null, drawer: null, order: null, promoMsg: "", added: "" }); $("[data-cl-q]").value = ""; say("Demo store reset."); return render("[data-cl-reset]"); }
  });
  root.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-cl-promo-form]")) return;
    e.preventDefault();
    const code = $("#cl-code").value.trim().toUpperCase();
    if (!code) ui.promoMsg = "Enter a code first.";
    else if (!PROMOS[code]) ui.promoMsg = `“${code}” isn't a valid code. Try WELCOME10 or HOME20.`;
    else { S.promo = code; save(); const t = totals(S); ui.promoMsg = t.discount ? `${code} applied: −${money(t.discount)}.` : `${code} saved. ${t.promoNote}.`; }
    render("#cl-code");
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-cl-sort]")) { ui.sort = el.value; return render("[data-cl-sort]"); }
    if (el.matches("[data-cl-color]")) { ui.pick.color = el.value; ui.tint[ui.open] = el.value; ui.pick.qty = 1; ui.added = ""; return render(`[data-cl-color][value="${el.value}"]`); }
    if (el.matches("[data-cl-size]")) { ui.pick.size = el.value; return render(`[data-cl-size][value="${CSS.escape(el.value)}"]`); }
  });
  root.addEventListener("input", (e) => { if (e.target.matches("[data-cl-q]")) { ui.q = e.target.value; $("[data-cl-shop]").innerHTML = shop(); } });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && (ui.open || ui.drawer)) { e.preventDefault(); closeLayer(); } });
  render();
})();
