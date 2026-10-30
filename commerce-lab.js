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
  const ui = { cat: "All", sort: "featured", q: "", tint: {}, open: null, pick: null, view: "still", drawer: null, order: null, promoMsg: "", added: "", ret: null, swapTile: "" };

  /* ---------- Art direction: every product is a small still-life "photograph" ----------
     One shared set of light, texture and shadow definitions; each product has its own set
     (wall, surface, props) and the chosen colour variant recolours the object itself. */
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)); return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join(""); };
  // [wall, surface, dark set]
  const SETS = {
    vase: ["#D2C4B0", "#B9A68B"], bowl: ["#D9C2A6", "#ECE1CF"], mug: ["#A3B3A6", "#E2DBCE"],
    lamp: ["#272A33", "#3A322B", 1], pendant: ["#DCD1C1", "#6B4A32"], candle: ["#33251E", "#241A15", 1],
    throw: ["#D6C6AE", "#C2AF93"], cushion: ["#52606B", "#434E57"], carafe: ["#E4BF94", "#D6AF83"],
    plates: ["#A3573A", "#87442D"], board: ["#D2D7CB", "#BABFB2"],
  };
  const FOCUS = { vase: [100, 104], bowl: [100, 128], mug: [100, 116], lamp: [100, 92], pendant: [100, 112], candle: [100, 112], throw: [100, 122], cushion: [100, 120], carafe: [100, 106], plates: [100, 136], board: [100, 100] };
  const DEFS = `<svg class="cl-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="cl-wl" gradientUnits="userSpaceOnUse" cx="40" cy="0" r="240"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>
    <radialGradient id="cl-dk" gradientUnits="userSpaceOnUse" cx="100" cy="92" r="210"><stop offset="0" stop-color="#FFB45C" stop-opacity=".26"/><stop offset=".45" stop-color="#FFB45C" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient>
    <linearGradient id="cl-fl" gradientUnits="userSpaceOnUse" x1="0" y1="155" x2="0" y2="215"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
    <linearGradient id="cl-v" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".58" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".36"/></linearGradient>
    <linearGradient id="cl-tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
    <linearGradient id="cl-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity=".02"/></linearGradient>
    <radialGradient id="cl-sph" cx=".32" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".36" stop-color="#fff" stop-opacity="0"/><stop offset=".74" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>
    <radialGradient id="cl-lit" cx=".5" cy=".95" r=".9"><stop offset="0" stop-color="#FFF6DE" stop-opacity=".95"/><stop offset=".6" stop-color="#FFE3A8" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></radialGradient>
    <radialGradient id="cl-glow"><stop offset="0" stop-color="#FFC775" stop-opacity=".62"/><stop offset=".4" stop-color="#FFB45C" stop-opacity=".18"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>
    <linearGradient id="cl-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE6B0" stop-opacity=".5"/><stop offset="1" stop-color="#FFE6B0" stop-opacity="0"/></linearGradient>
    <pattern id="cl-hb" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 6l4-4 4 4" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1.1"/><path d="M0 8l4-4 4 4" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".8"/></pattern>
    <filter id="cl-b3" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="cl-b6" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="cl-grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 .78"/></filter>
    <filter id="cl-stone" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .62 0 0 0 -.22" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>
    <filter id="cl-weave" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.1 2.2" numOctaves="1" seed="5" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .6 0 0 0 -.18" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>
    <filter id="cl-wood" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".32 .016" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.25 0 0 0 -.42" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>
  </defs></svg>`;

  // Contact shadow plus a soft cast shadow falling away from the window (light comes from the upper left).
  const sh = (w, cx = 100, y = 172, o = 1) => `<path d="M${cx - w} ${y}L${cx + w} ${y}L${cx + w + 44} ${y + 17}L${cx - w + 30} ${y + 21}Z" fill="#000" opacity="${0.17 * o}" filter="url(#cl-b6)"/><ellipse cx="${cx}" cy="${y}" rx="${w}" ry="${Math.max(3, w * 0.08)}" fill="#000" opacity="${0.4 * o}" filter="url(#cl-b3)"/>`;
  function backdrop(shape) {
    const [w, f, dark] = SETS[shape];
    return `<rect x="-400" y="-400" width="1000" height="556" fill="${w}"/><rect x="-400" y="155" width="1000" height="500" fill="${f}"/>
      <rect x="-400" y="155" width="1000" height="500" fill="url(#cl-fl)"/><rect x="-400" y="-400" width="1000" height="1055" fill="url(#cl-${dark ? "dk" : "wl"})"/>
      <rect x="-400" y="151" width="1000" height="8" fill="#000" opacity=".12" filter="url(#cl-b6)"/>
      ${dark ? "" : `<path d="M-70 -60L46 -60L178 156L64 156Z" fill="#fff" opacity=".12" filter="url(#cl-b6)"/><path d="M64 156L178 156L236 240L96 240Z" fill="#fff" opacity=".07" filter="url(#cl-b6)"/>`}`;
  }
  const grain = `<rect x="-160" y="-30" width="520" height="260" filter="url(#cl-grain)" opacity=".22" pointer-events="none"/>`;
  const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-100 -172)">${inner}</g>`;

  function object(shape, color, big) {
    const c = C[color][1], d = shade(c, -0.24), l = shade(c, 0.32);
    switch (shape) {
      case "vase": {
        const b = "M84 52h32v10c0 9 34 22 34 62 0 32-22 48-50 48s-50-16-50-48c0-40 34-53 34-62z";
        return at(100, 172, big ? 1.1 : 0.92, `${sh(50)}
          <g stroke="#5B4632" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M97 56C93 32 82 16 66 4"/><path d="M103 56c3-22 13-38 28-50"/><path d="M100 56c0-20 2-34 7-50"/></g>
          <g fill="#8E6B47"><ellipse cx="66" cy="4" rx="3.2" ry="7" transform="rotate(-38 66 4)"/><ellipse cx="131" cy="6" rx="3.2" ry="7" transform="rotate(42 131 6)"/><ellipse cx="107" cy="6" rx="2.8" ry="6" transform="rotate(10 107 6)"/></g>
          <path d="${b}" fill="${c}" filter="url(#cl-stone)"/><path d="${b}" fill="url(#cl-sph)"/>
          <ellipse cx="100" cy="53" rx="16" ry="3.6" fill="${d}"/><ellipse cx="100" cy="53.8" rx="12.5" ry="2.4" fill="#000" opacity=".45"/>
          <path d="M67 98c-6 10-8 20-8 32" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".3" filter="url(#cl-b3)"/>`);
      }
      case "bowl": {
        const b = "M30 120c0 34 30 52 70 52s70-18 70-52c-6 8-34 14-70 14s-64-6-70-14z";
        return `${sh(68)}<ellipse cx="100" cy="120" rx="70" ry="14" fill="${d}"/><ellipse cx="100" cy="121.5" rx="64" ry="11" fill="${c}"/><ellipse cx="100" cy="121.5" rx="64" ry="11" fill="url(#cl-in)"/>
          <circle cx="86" cy="122" r="15" fill="#D6A23F"/><circle cx="86" cy="122" r="15" fill="url(#cl-sph)"/><circle cx="114" cy="119" r="14" fill="#C7842D"/><circle cx="114" cy="119" r="14" fill="url(#cl-sph)"/>
          <path d="M114 105c1-4 3-6 6-7" stroke="#4C3A22" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="123" cy="100" rx="5" ry="2.4" fill="#6F7F4E" transform="rotate(-20 123 100)"/>
          <path d="${b}" fill="${c}" filter="url(#cl-stone)"/><path d="${b}" fill="url(#cl-v)"/>
          <path d="M30 120c6 8 34 14 70 14s64-6 70-14" stroke="${l}" stroke-width="2.2" fill="none"/>`;
      }
      case "mug": {
        const b = "M58 86h74v78c0 5-4 8-9 8H67c-5 0-9-3-9-8z";
        return `${sh(42, 97)}<path d="M130 104c26-2 28 42 0 44" stroke="${d}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M130 104c26-2 28 42 0 44" stroke="${c}" stroke-width="7.5" fill="none" stroke-linecap="round"/>
          <path d="${b}" fill="${c}" filter="url(#cl-stone)"/><path d="${b}" fill="url(#cl-v)"/>
          <ellipse cx="95" cy="86" rx="37" ry="6.5" fill="${l}"/><ellipse cx="95" cy="87" rx="33" ry="5" fill="#3A2619"/><ellipse cx="90" cy="86.4" rx="17" ry="2" fill="#C69A6D" opacity=".55"/>
          <g stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".5" filter="url(#cl-b3)"><path d="M88 76c-8-10 6-16-2-30"/><path d="M103 74c-6-8 6-14 0-26"/></g>`;
      }
      case "lamp": {
        const shadeC = color === "chalk" ? "#ECE7DD" : "#F2E6CC";
        const shd = "M66 42h68l22 66H44z", foot = "M68 172c0-11 14-16 32-16s32 5 32 16z";
        return at(100, 172, big ? 1.1 : 1, `<circle cx="100" cy="88" r="125" fill="url(#cl-glow)"/><ellipse cx="100" cy="173" rx="98" ry="14" fill="#FFD79B" opacity=".24" filter="url(#cl-b6)"/>
          <rect x="16" y="160" width="52" height="12" rx="1.5" fill="#6C4B3A"/><rect x="20" y="149" width="45" height="11" rx="1.5" fill="#9A8A6E"/><rect x="16" y="160" width="52" height="12" rx="1.5" fill="url(#cl-tb)"/>
          <ellipse cx="100" cy="172" rx="34" ry="3.5" fill="#000" opacity=".55" filter="url(#cl-b3)"/>
          <rect x="97" y="106" width="6" height="52" fill="${c}"/><rect x="97" y="106" width="6" height="52" fill="url(#cl-v)"/>
          <path d="${foot}" fill="${c}"/><path d="${foot}" fill="url(#cl-v)"/><path d="M76 166c4-4 12-6 20-6" stroke="#fff" stroke-width="1.6" opacity=".45" fill="none" stroke-linecap="round"/>
          <path d="${shd}" fill="${shadeC}" filter="url(#cl-weave)"/><path d="${shd}" fill="url(#cl-lit)"/>
          <ellipse cx="100" cy="42" rx="34" ry="3" fill="#000" opacity=".16"/><ellipse cx="100" cy="108" rx="56" ry="6" fill="#FFEBC0"/>`);
      }
      case "pendant": {
        const dome = "M38 128c0-36 28-58 62-58s62 22 62 58z";
        return `<path d="M44 132L0 240L200 240L156 132Z" fill="url(#cl-cone)"/><ellipse cx="100" cy="176" rx="82" ry="10" fill="#FFD99A" opacity=".38" filter="url(#cl-b6)"/>
          <rect x="99.2" y="-300" width="1.6" height="372" fill="#2A2420"/><rect x="94" y="64" width="12" height="9" rx="2" fill="${d}"/>
          <path d="${dome}" fill="${c}" filter="url(#cl-stone)"/><path d="${dome}" fill="url(#cl-v)"/><path d="M62 96c8-12 20-18 32-20" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".35" filter="url(#cl-b3)"/>
          <rect x="38" y="124" width="124" height="7" rx="3.5" fill="${d}"/><ellipse cx="100" cy="131" rx="57" ry="5.5" fill="#FFF0CB"/><ellipse cx="100" cy="131" rx="28" ry="3" fill="#fff"/>`;
      }
      case "candle": {
        const g = "M62 92h76v74c0 4-3 6-7 6H69c-4 0-7-2-7-6z";
        return `<circle cx="100" cy="76" r="115" fill="url(#cl-glow)"/><ellipse cx="100" cy="172" rx="44" ry="4" fill="#000" opacity=".6" filter="url(#cl-b3)"/>
          <path d="${g}" fill="${c}" opacity=".93"/><path d="${g}" fill="url(#cl-v)"/><ellipse cx="100" cy="99" rx="35" ry="4.5" fill="#F2E2C4"/><ellipse cx="100" cy="99" rx="35" ry="4.5" fill="url(#cl-in)"/>
          <ellipse cx="100" cy="92" rx="38" ry="4.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/><rect x="68" y="98" width="4" height="66" rx="2" fill="#fff" opacity=".35"/>
          <rect x="74" y="122" width="52" height="28" rx="1.5" fill="#F5EDE0"/><text x="100" y="131" text-anchor="middle" font-size="4" letter-spacing=".9" fill="#5C4A3D" font-family="ui-monospace, Menlo, monospace">LUMEN &amp; CLAY</text><text x="100" y="143" text-anchor="middle" font-size="9" font-style="italic" fill="#2B211B" font-family="Georgia, serif">Ember</text>
          <rect x="99" y="85" width="2" height="13" fill="#2B2320"/><circle cx="100" cy="72" r="15" fill="#FFD27A" opacity=".45" filter="url(#cl-b6)"/>
          <path d="M100 56c8 10 10 20 0 30-10-10-8-20 0-30z" fill="#FFB547"/><path d="M100 66c4 6 5 11 0 18-5-7-4-12 0-18z" fill="#FFF4CF"/>`;
      }
      case "throw": {
        const top = "M44 102v-18q0-6 6-6h100q6 0 6 6v18z", bot = "M36 124v-20q0-6 6-6h116q6 0 6 6v20z", drape = "M116 124h44v36l-5 5h-34l-5-5z";
        const fringe = Array.from({ length: 11 }, (_, i) => `<path d="M${122 + i * 3.4} 164v8"/>`).join("");
        return at(100, 172, big ? 1.1 : 0.96, `${sh(84)}<rect x="24" y="134" width="8" height="38" fill="#4A3324"/><rect x="168" y="134" width="8" height="38" fill="#4A3324"/>
          <rect x="12" y="124" width="176" height="12" rx="2" fill="#6A4A33" filter="url(#cl-wood)"/><rect x="12" y="132" width="176" height="4" fill="#000" opacity=".25"/>
          <path d="${bot}" fill="${d}" filter="url(#cl-weave)"/><path d="${bot}" fill="url(#cl-hb)"/><path d="${bot}" fill="url(#cl-tb)"/>
          <path d="${top}" fill="${c}" filter="url(#cl-weave)"/><path d="${top}" fill="url(#cl-hb)"/><path d="${top}" fill="url(#cl-tb)"/><path d="M44 79h112" stroke="${l}" stroke-width="2" opacity=".8"/>
          <path d="${drape}" fill="${c}" filter="url(#cl-weave)"/><path d="${drape}" fill="url(#cl-hb)"/><path d="${drape}" fill="url(#cl-v)"/>
          <g stroke="${d}" stroke-width="1.4" stroke-linecap="round">${fringe}</g>`);
      }
      case "cushion": {
        const b = "M46 72c20 8 88 8 108 0 9 32 9 68 0 100-20-8-88-8-108 0-9-32-9-68 0-100z";
        const pleats = [0, 1, 2, 3, 4].map((i) => { const x = 68 + i * 16; return `<path d="M${x} 82c-3 30-3 56 0 82" stroke="${d}" stroke-width="1.8" opacity=".6"/><path d="M${x + 3} 82c-2 30-2 56 0 82" stroke="#fff" stroke-width="1.2" opacity=".2"/>`; }).join("");
        return `${sh(56)}<path d="${b}" fill="${c}" filter="url(#cl-weave)"/><g fill="none">${pleats}</g><path d="${b}" fill="url(#cl-sph)"/><path d="${b}" fill="none" stroke="${d}" stroke-width="2.4" opacity=".55"/>`;
      }
      case "carafe": {
        const b = "M86 40h28v26c0 10 32 24 32 62 0 30-20 44-46 44s-46-14-46-44c0-38 32-52 32-62z";
        return `<ellipse cx="148" cy="182" rx="36" ry="6" fill="${l}" opacity=".75" filter="url(#cl-b3)"/>${sh(44, 100, 172, 0.55)}
          <path d="${b}" fill="${c}" opacity=".4"/><path d="M56 116C55 120 54 124 54 128c0 30 20 44 46 44s46-14 46-44c0-4-1-8-2-12z" fill="${d}" opacity=".42"/><ellipse cx="100" cy="116" rx="44" ry="3.5" fill="#fff" opacity=".35"/>
          <path d="${b}" fill="none" stroke="${d}" stroke-opacity=".55" stroke-width="1.3"/>
          <path d="M84 20h32l-3 24H87z" fill="${c}" opacity=".55" stroke="${d}" stroke-opacity=".5"/><path d="M90 44v22" stroke="#fff" stroke-width="2" opacity=".6"/>
          <path d="M64 108c-6 10-8 22-8 34" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/><path d="M138 120c2 8 2 16 0 24" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".55"/>`;
      }
      case "plates": {
        const plates = [0, 1, 2, 3].map((i) => { const y = 151 - i * 9; return `<ellipse cx="100" cy="${y + 3}" rx="74" ry="18" fill="${d}"/><ellipse cx="100" cy="${y}" rx="74" ry="18" fill="${c}"/><ellipse cx="100" cy="${y}" rx="74" ry="18" fill="url(#cl-v)"/><ellipse cx="100" cy="${y}" rx="68" ry="15.5" fill="none" stroke="${d}" stroke-dasharray="1 2.2" stroke-width="1.4" opacity=".55"/>`; }).join("");
        return `${sh(74, 100, 170)}<g filter="url(#cl-stone)">${plates}</g><ellipse cx="100" cy="125" rx="50" ry="11" fill="url(#cl-in)"/>
          <path d="M84 126c10-6 26-8 40-4" stroke="#56633F" stroke-width="1.4" fill="none" stroke-linecap="round"/><g fill="#7C8B62"><ellipse cx="92" cy="121" rx="5" ry="2.2" transform="rotate(-30 92 121)"/><ellipse cx="104" cy="118" rx="5" ry="2.2" transform="rotate(-10 104 118)"/><ellipse cx="116" cy="119" rx="5" ry="2.2" transform="rotate(20 116 119)"/><ellipse cx="100" cy="126" rx="4.5" ry="2" transform="rotate(15 100 126)"/></g>`;
      }
      case "board": {
        const b = "M70 172V72q0-10 10-10h12v-16a8 8 0 0 1 16 0v16h12q10 0 10 10v100z";
        return `${sh(34)}<g transform="rotate(-5 100 172)"><path d="${b}" transform="translate(4 0)" fill="${d}"/><path d="${b}" fill="${c}" filter="url(#cl-wood)"/><path d="${b}" fill="url(#cl-v)"/><circle cx="100" cy="46" r="3.4" fill="${SETS.board[0]}"/></g>
          <ellipse cx="54" cy="171" rx="26" ry="3" fill="#000" opacity=".35" filter="url(#cl-b3)"/><ellipse cx="54" cy="162" rx="26" ry="11" fill="#C88C4F"/><ellipse cx="54" cy="162" rx="26" ry="11" fill="url(#cl-sph)"/>
          <g stroke="#EBC793" stroke-width="1.6" stroke-linecap="round" opacity=".85"><path d="M40 158l6-5"/><path d="M50 158l6-5"/><path d="M60 158l6-5"/></g>`;
      }
    }
    return "";
  }
  // view: "still" (whole set) or "close" (a macro crop that shows the material)
  function art(p, color, size, view) {
    const big = !!(size && p.sizes && size === p.sizes[1][0]);
    const [fx, fy] = FOCUS[p.shape];
    const vb = view === "close" ? `${fx - 48} ${fy - 48} 96 96` : "0 0 200 200";
    return `<svg viewBox="${vb}" class="cl-art" role="img" aria-label="${esc(p.name)} in ${C[color][0]}${view === "close" ? ", close-up" : ""}">${backdrop(p.shape)}${object(p.shape, color, big)}${grain}</svg>`;
  }
  // The autumn edit: one composed still life (the Loom Throw on a bench, a floor vase and a candle), with shoppable pins.
  const LOOK = [["dune", 15, 66], ["loom", 54, 46], ["ember", 78, 56]];
  function lookArt() {
    const t = (id) => tintOf(byId[id]);
    return `<svg viewBox="0 0 320 220" class="cl-art" role="img" aria-label="Still life: Loom Throw in ${C[t("loom")][0]} folded on a walnut bench, with a Dune Vase and an Ember Candle">
      <g transform="translate(60 0)">${backdrop("throw")}</g>
      <g><rect x="222" y="14" width="64" height="80" fill="#3A2A20"/><rect x="226" y="18" width="56" height="72" fill="#EFE6D6"/><circle cx="254" cy="60" r="16" fill="${C.clay[1]}"/><rect x="226" y="60" width="56" height="30" fill="#D8C6A6"/><path d="M226 72c14-6 30-6 56 2v16h-56z" fill="#7C8B62" opacity=".8"/><rect x="226" y="18" width="56" height="72" fill="url(#cl-v)" opacity=".5"/><path d="M286 18l10 6v74l-10-4z" fill="#000" opacity=".12" filter="url(#cl-b3)"/></g>
      ${at(172, 204, 1.15, object("throw", t("loom")))}${at(250, 149, 0.42, object("candle", t("ember")))}${at(50, 208, 0.8, object("vase", t("dune")))}
      <g transform="translate(60 0)">${grain}</g></svg>`;
  }

  const firstColor = (p) => Object.keys(p.colors).find((c) => canAdd(S, p.id, c) > 0) || Object.keys(p.colors)[0];
  const tintOf = (p) => ui.tint[p.id] || firstColor(p);
  const bg = (p) => SETS[p.shape][0];
  const no = (p) => "No. " + String(P.indexOf(p) + 1).padStart(2, "0");
  const heart = (on) => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-9.2C1.6 7.3 4 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4 20 4 22.4 7.3 21 10.8 19 15.6 12 20 12 20z" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const bagIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const tick = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Featured order is an editorial running order; other sorts are plain price order.
  const RUN = ["dune", "tide", "mug", "pleat", "loom", "ember", "orbit", "carafe", "ridge", "halo", "board"];
  const LAYOUT = { dune: "cl-big", halo: "cl-big", board: "cl-wide" };
  function visible() {
    const q = ui.q.trim().toLowerCase();
    let list = P.filter((p) => (ui.cat === "All" || p.cat === ui.cat) && (!q || `${p.name} ${p.cat} ${p.mat}`.toLowerCase().includes(q)));
    if (ui.sort === "featured") list = [...list].sort((a, b) => RUN.indexOf(a.id) - RUN.indexOf(b.id));
    if (ui.sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (ui.sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }
  function badge(p) {
    const cols = Object.keys(p.colors), left = cols.reduce((a, c) => a + Math.max(0, canAdd(S, p.id, c)), 0);
    if (cols.every((c) => stockOf(S, p.id, c) <= 0)) return '<em class="cl-badge out">Sold out</em>';
    if (left > 0 && left <= 4) return '<em class="cl-badge low">Few left</em>';
    if (p.feat) return "<em class=\"cl-badge\">Editor's pick</em>";
    return "";
  }
  function tile(p, span, wish) {
    const col = tintOf(p);
    return `<li class="cl-tile${span ? " " + span : ""}${ui.swapTile === p.id ? " swap" : ""}">
      <div class="cl-media" style="--tint:${bg(p)}">
        <button type="button" class="cl-tile-art" data-cl-open="${p.id}" aria-label="Quick view: ${esc(p.name)}">${art(p, col)}<span class="cl-qv" aria-hidden="true">Quick view</span></button>
        <span class="cl-tag" aria-hidden="true">${no(p)}</span>${badge(p)}
        <button type="button" class="cl-heart${wish.has(p.id) ? " on" : ""}" data-cl-wish="${p.id}" aria-pressed="${wish.has(p.id)}" aria-label="${wish.has(p.id) ? "Remove" : "Save"} ${esc(p.name)}">${heart(wish.has(p.id))}</button>
      </div>
      <div class="cl-tile-info"><button type="button" class="cl-name" data-cl-open="${p.id}">${esc(p.name)}</button><span class="cl-price">${p.sizes ? "<small>from</small> " : ""}${money(p.price)}</span>
        <span class="cl-meta">${esc(p.mat)}</span>
        <span class="cl-dots" role="group" aria-label="Preview colour">${Object.keys(p.colors).map((c) => `<button type="button" data-cl-tint="${p.id}" data-v="${c}" style="--c:${C[c][1]}" aria-pressed="${col === c}" aria-label="${C[c][0]}"></button>`).join("")}</span></div></li>`;
  }
  const story = () => `<li class="cl-story"><div class="cl-story-copy"><span class="cl-k">The lighting story</span><h4>Light the long <em>evenings.</em></h4><p>Lamps, pendants and candles: 20% off with code <b class="cl-code">HOME20</b></p></div>
      <button type="button" class="cl-btn light" data-cl-cat="Lighting">Shop lighting</button><span class="cl-story-num" aria-hidden="true">20<i>%</i></span></li>`;

  function shop() {
    const list = visible(), wish = new Set(S.wish);
    const editorial = ui.cat === "All" && !ui.q.trim() && ui.sort === "featured";
    const lc = tintOf(byId.loom);
    let tiles;
    if (editorial) tiles = list.map((p) => tile(p, LAYOUT[p.id], wish) + (p.id === "loom" ? story() : "")).join("");
    else tiles = list.map((p, i) => tile(p, (list.length % 4 === 3 && i === 0) || (list.length % 4 === 2 && i < 2) ? "cl-wide" : "", wish)).join("");
    return `
      <section class="cl-edit" aria-labelledby="cl-edit-t">
        <div class="cl-edit-copy"><span class="cl-k">The autumn edit · Issue 04</span><h3 id="cl-edit-t">Objects for slower <em>evenings.</em></h3><p>Wool, warm light and pieces made to be used every day.</p>
          <div class="cl-edit-act"><button type="button" class="cl-btn light" data-cl-open="loom">Shop the Loom Throw</button><span>Loom Throw in ${C[lc][0]} · from ${money(byId.loom.price)}</span></div>
          <ul class="cl-offers" aria-label="Offers"><li class="cl-ticket"><b>WELCOME10</b><span>10% off orders over $100</span></li><li class="cl-ticket alt"><b>HOME20</b><span>20% off all lighting</span></li><li class="cl-ship">Free delivery over $${FREE_OVER}</li></ul></div>
        <figure class="cl-look"><div class="cl-look-frame">${lookArt()}
          ${LOOK.map(([id, x, y]) => `<button type="button" class="cl-pin" data-cl-open="${id}" style="left:${x}%;top:${y}%" aria-label="Shop the look: ${esc(byId[id].name)}, ${money(byId[id].price)}"><i aria-hidden="true">+</i><span aria-hidden="true">${esc(byId[id].name)} <b>${money(byId[id].price)}</b></span></button>`).join("")}</div>
          <figcaption>Shop the look: tap a <b>+</b> to open each piece</figcaption></figure>
      </section>
      <div class="cl-tools">
        <div class="cl-cats" role="group" aria-label="Category">${["All", ...CATS].map((c) => `<button type="button" data-cl-cat="${c}" aria-pressed="${ui.cat === c}">${c}<small>${c === "All" ? P.length : P.filter((p) => p.cat === c).length}</small></button>`).join("")}</div>
        <label class="cl-sort"><span>Sort</span><select data-cl-sort>${[["featured", "Featured"], ["low", "Price, low to high"], ["high", "Price, high to low"]].map(([v, l]) => `<option value="${v}"${ui.sort === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      </div>
      <p class="cl-count" aria-live="polite">${list.length} ${list.length === 1 ? "object" : "objects"}${ui.q ? ` for “${esc(ui.q)}”` : ""}</p>
      ${list.length ? `<ul class="cl-grid${editorial ? " ed" : ""}">${tiles}</ul>` : `<div class="cl-empty"><b>Nothing matches yet</b><p>Try another word, or clear the search.</p><button type="button" class="cl-btn ghost" data-cl-clear>Clear search</button></div>`}`;
  }

  function detail(enter, swap) {
    const p = byId[ui.open]; if (!p) return "";
    const pk = ui.pick, room = canAdd(S, p.id, pk.color), wish = S.wish.includes(p.id);
    const unit = unitPrice({ id: p.id, size: pk.size }), recs = recommend(S, p.id), t = totals(S);
    const stockMsg = room <= 0 ? (stockOf(S, p.id, pk.color) <= 0 ? "Sold out in this colour" : "All available stock is in your basket") : room <= 3 ? `Only ${room} left in ${C[pk.color][0]}` : `In stock in ${C[pk.color][0]}`;
    return `<div class="cl-scrim${enter ? " in" : ""}" data-cl-close></div><div class="cl-dialog${enter ? " in" : ""}" role="dialog" aria-modal="true" aria-labelledby="cl-d-t">
      <button type="button" class="cl-x" data-cl-close aria-label="Close">×</button>
      <div class="cl-d-art${swap ? " swap" : ""}" style="--tint:${bg(p)}">${art(p, pk.color, pk.size, ui.view)}<span class="cl-k">${no(p)} · ${esc(p.cat)}</span>
        <div class="cl-views" role="group" aria-label="Image">${[["still", "Still life"], ["close", "Close-up"]].map(([v, l]) => `<button type="button" data-cl-view="${v}" aria-pressed="${ui.view === v}" aria-label="${l}">${art(p, pk.color, pk.size, v)}</button>`).join("")}</div></div>
      <div class="cl-d-info">
        <span class="cl-k">${p.feat ? "Editor's pick · " : ""}${esc(p.mat)}</span>
        <h4 id="cl-d-t">${esc(p.name)}</h4><p class="cl-d-price">${money(unit)}</p><p class="cl-d-desc">${esc(p.desc)}</p>
        <fieldset class="cl-opt"><legend>Colour · <b>${C[pk.color][0]}</b></legend><div class="cl-swatches">${Object.keys(p.colors).map((c) => { const none = stockOf(S, p.id, c) <= 0; return `<label class="cl-sw${none ? " none" : ""}" style="--c:${C[c][1]}"><input type="radio" name="cl-color" value="${c}" data-cl-color ${pk.color === c ? "checked" : ""} ${none ? "disabled" : ""}><span class="sr-only">${C[c][0]}${none ? ", sold out" : ""}</span></label>`; }).join("")}</div></fieldset>
        ${p.sizes ? `<fieldset class="cl-opt"><legend>Size</legend><div class="cl-sizes">${p.sizes.map(([s, d]) => `<label><input type="radio" name="cl-size" value="${esc(s)}" data-cl-size ${pk.size === s ? "checked" : ""}><span>${esc(s)}${d ? ` <small>+${money(d)}</small>` : ""}</span></label>`).join("")}</div></fieldset>` : ""}
        <p class="cl-stock${room <= 0 ? " none" : room <= 3 ? " low" : ""}" aria-live="polite"><i aria-hidden="true"></i>${stockMsg}</p>
        <div class="cl-buy"><div class="cl-qty" role="group" aria-label="Quantity"><button type="button" data-cl-pickqty="-1" aria-label="Decrease quantity" ${pk.qty <= 1 ? "disabled" : ""}>−</button><output>${pk.qty}</output><button type="button" data-cl-pickqty="1" aria-label="Increase quantity" ${pk.qty >= room ? "disabled" : ""}>+</button></div>
          <button type="button" class="cl-btn add" data-cl-add="${p.id}" ${room <= 0 ? "disabled" : ""}>${room <= 0 ? "Unavailable" : `Add to basket · ${money(unit * Math.min(pk.qty, Math.max(room, 1)))}`}</button>
          <button type="button" class="cl-heart big${wish ? " on" : ""}" data-cl-wish="${p.id}" aria-pressed="${wish}" aria-label="${wish ? "Remove from" : "Save to"} wishlist">${heart(wish)}</button></div>
        ${ui.added ? `<div class="cl-added" role="status"><span class="cl-ok" aria-hidden="true">${tick}</span><span class="cl-added-t"><b>In your basket</b><small>${esc(ui.added)} Basket total ${money(t.total)}.</small></span><button type="button" class="cl-link" data-cl-drawer="basket">View basket</button></div>` : ""}
        ${recs.length ? `<div class="cl-recs"><span class="cl-k">Pairs well with</span><ul>${recs.map((r) => `<li><button type="button" data-cl-open="${r.id}" style="--tint:${bg(r)}">${art(r, firstColor(r))}<span><b>${esc(r.name)}</b>${money(r.price)}</span></button></li>`).join("")}</ul></div>` : ""}
      </div></div>`;
  }

  function drawer(enter) {
    if (!ui.drawer) return "";
    const t = totals(S), wish = S.wish.map((id) => byId[id]);
    let body = "", foot = "";
    if (ui.drawer === "order" && ui.order) {
      const o = ui.order;
      body = `<div class="cl-done"><span class="cl-tick" aria-hidden="true">${tick}</span><span class="cl-k">Demo order confirmed</span><h4 id="cl-dr-t">Order placed</h4><p>Order <b>${o.no}</b> · ${o.lines.reduce((a, l) => a + l.qty, 0)} items · ${money(o.total)}</p>
        <div class="cl-receipt"><div class="cl-receipt-h"><span>Lumen &amp; Clay</span><b>${o.no}</b></div><ul class="cl-order">${o.lines.map((l) => `<li><span>${l.qty} × ${esc(byId[l.id].name)} <small>${C[l.color][0]}${l.size ? " · " + esc(l.size) : ""}</small></span><b>${money(l.total)}</b></li>`).join("")}
          <li class="t"><span>Subtotal</span><b>${money(o.sub)}</b></li>${o.discount ? `<li class="t"><span>Discount (${o.promo})</span><b>−${money(o.discount)}</b></li>` : ""}<li class="t"><span>Delivery</span><b>${o.delivery ? money(o.delivery) : "Free"}</b></li><li class="t total"><span>Total</span><b>${money(o.total)}</b></li></ul></div>
        <p class="cl-fine">A demo order: no payment was taken and nothing will ship. Stock in the store has been reduced to match.</p>
        <button type="button" class="cl-btn" data-cl-drawer-close>Continue shopping</button></div>`;
    } else if (ui.drawer === "saved") {
      body = `<h4 id="cl-dr-t">Saved <small>${wish.length}</small></h4>${wish.length ? `<ul class="cl-lines">${wish.map((p) => { const c = firstColor(p), room = canAdd(S, p.id, c); return `<li><span class="cl-thumb" style="--tint:${bg(p)}">${art(p, c)}</span><span class="cl-l-info"><button type="button" class="cl-name" data-cl-open="${p.id}">${esc(p.name)}</button><small>${money(p.price)} · ${C[c][0]}</small></span><span class="cl-l-act"><button type="button" class="cl-btn sm" data-cl-quick="${p.id}" data-v="${c}" ${room <= 0 ? "disabled" : ""}>${room <= 0 ? "Sold out" : "Add"}</button><button type="button" class="cl-link" data-cl-wish="${p.id}">Remove</button></span></li>`; }).join("")}</ul>` : `<div class="cl-empty"><b>Nothing saved yet</b><p>Tap the heart on any object to keep it here.</p></div>`}`;
    } else {
      const recs = recommend(S), pct = Math.min(100, (t.afterDiscount / FREE_OVER) * 100);
      body = `<h4 id="cl-dr-t">Your basket <small>${t.items} ${t.items === 1 ? "item" : "items"}</small></h4>
        ${t.items ? `<ul class="cl-lines">${t.lines.map((l) => { const p = byId[l.id], k = key(l), max = stockOf(S, l.id, l.color) - (inBasket(S, l.id, l.color) - l.qty); return `<li><span class="cl-thumb" style="--tint:${bg(p)}">${art(p, l.color, l.size)}</span>
            <span class="cl-l-info"><b>${esc(p.name)}</b><small>${C[l.color][0]}${l.size ? " · " + esc(l.size) : ""} · ${money(l.unit)}</small>
              <span class="cl-qty sm" role="group" aria-label="Quantity of ${esc(p.name)}"><button type="button" data-cl-qty="${k}" data-d="-1" aria-label="Decrease">−</button><output>${l.qty}</output><button type="button" data-cl-qty="${k}" data-d="1" aria-label="Increase" ${l.qty >= max ? "disabled" : ""}>+</button></span></span>
            <span class="cl-l-act"><b>${money(l.total)}</b><button type="button" class="cl-link" data-cl-remove="${k}">Remove</button></span></li>`; }).join("")}</ul>
          <div class="cl-free${t.toFree ? "" : " done"}"><span>${t.toFree ? `Spend <b>${money(t.toFree)}</b> more for free delivery` : "Free delivery unlocked"}</span><i style="--p:${pct}%"></i></div>
          <form class="cl-promo" data-cl-promo-form><label for="cl-code">Promo code</label><div><input id="cl-code" autocomplete="off" placeholder="Enter a code" value="${esc(S.promo)}"><button type="submit" class="cl-btn sm" data-cl-promo-apply>Apply</button></div>
            <div class="cl-chips"><span>Try</span>${Object.keys(PROMOS).map((c) => `<button type="button" data-cl-code="${c}" aria-pressed="${S.promo === c}">${c}</button>`).join("")}</div>
            ${ui.promoMsg ? `<p class="cl-promo-msg" role="status">${esc(ui.promoMsg)}</p>` : ""}${S.promo ? `<p class="cl-promo-on"><b>${S.promo}</b> · ${PROMOS[S.promo].label}${t.promoNote ? ` · <em>${esc(t.promoNote)}</em>` : ""} <button type="button" class="cl-link" data-cl-promo-clear>Remove</button></p>` : ""}</form>
          <div class="cl-summary"><span class="cl-k">Order summary</span><dl class="cl-totals"><div><dt>Subtotal</dt><dd>${money(t.sub)}</dd></div><div${t.discount ? ' class="save"' : ""}><dt>Discount${S.promo && t.discount ? ` (${S.promo})` : ""}</dt><dd>${t.discount ? "−" + money(t.discount) : money(0)}</dd></div><div><dt>Delivery</dt><dd>${t.delivery ? money(t.delivery) : "Free"}</dd></div><div class="total"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl></div>
          ${recs.length ? `<div class="cl-recs in"><span class="cl-k">Complete the set</span><ul>${recs.map((r) => { const c = firstColor(r); return `<li><button type="button" data-cl-quick="${r.id}" data-v="${c}" style="--tint:${bg(r)}" aria-label="Add ${esc(r.name)} in ${C[c][0]}">${art(r, c)}<span><b>${esc(r.name)}</b>${money(r.price)} · Add</span></button></li>`; }).join("")}</ul></div>` : ""}`
        : `<div class="cl-empty"><b>Your basket is empty</b><p>Open any object to choose a colour and add it.</p><button type="button" class="cl-btn ghost" data-cl-drawer-close>Browse the edit</button></div>`}`;
      if (t.items) foot = `<div class="cl-dr-foot"><div class="cl-dr-total"><span>Total${t.discount ? ` <small>you save ${money(t.discount)}</small>` : ""}</span><b>${money(t.total)}</b></div><button type="button" class="cl-btn pay" data-cl-checkout>Place demo order · ${money(t.total)}</button><p class="cl-fine">No payment details needed. Nothing is charged.</p></div>`;
    }
    return `<div class="cl-scrim${enter ? " in" : ""}" data-cl-drawer-close></div><aside class="cl-drawer${enter ? " in" : ""}" role="dialog" aria-modal="true" aria-labelledby="cl-dr-t">
      <div class="cl-dr-tabs">${ui.drawer !== "order" ? `<button type="button" data-cl-drawer="basket" aria-pressed="${ui.drawer === "basket"}">Basket${t.items ? ` <small>${t.items}</small>` : ""}</button><button type="button" data-cl-drawer="saved" aria-pressed="${ui.drawer === "saved"}">Saved${S.wish.length ? ` <small>${S.wish.length}</small>` : ""}</button>` : '<span class="cl-dr-brand">Lumen <i>&amp;</i> Clay</span>'}<button type="button" class="cl-x" data-cl-drawer-close aria-label="Close">×</button></div>
      <div class="cl-dr-body">${body}</div>${foot}</aside>`;
  }

  root.innerHTML = `${DEFS}<div class="cl-store">
      <header class="cl-bar"><span class="cl-brand">Lumen <i>&amp;</i> Clay</span><span class="cl-bar-note">Homeware · Autumn 2026</span>
        <label class="cl-search"><span class="sr-only">Search the store</span><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" placeholder="Search vases, lamps, linen…" data-cl-q autocomplete="off"></label>
        <button type="button" class="cl-bar-btn" data-cl-drawer="saved" aria-label="Saved items">${heart(false)}<em data-cl-wcount></em></button>
        <button type="button" class="cl-bar-btn bag" data-cl-drawer="basket" aria-label="Basket">${bagIcon}<span class="cl-bag-t" data-cl-btotal aria-hidden="true"></span><em data-cl-bcount></em></button>
      </header>
      <div class="cl-shop" data-cl-shop></div>
      <footer class="cl-foot"><span data-cl-orders></span><button type="button" class="cl-reset" data-cl-reset>Reset demo store</button></footer>
    </div><div data-cl-layer></div><p class="sr-only" aria-live="polite" data-cl-live></p>`;
  const layer = $("[data-cl-layer]");
  const say = (t) => { $("[data-cl-live]").textContent = t; };
  let lastKind = "", lastPick = "", lastItems = null;

  function render(focusSel) {
    const t = totals(S);
    $("[data-cl-shop]").innerHTML = shop();
    ui.swapTile = "";
    const bc = $("[data-cl-bcount]");
    bc.textContent = t.items || "";
    if (lastItems !== null && t.items > lastItems) { bc.classList.remove("bump"); void bc.offsetWidth; bc.classList.add("bump"); }
    lastItems = t.items;
    $("[data-cl-btotal]").textContent = t.items ? money(t.total) : "";
    $("[data-cl-wcount]").textContent = S.wish.length || "";
    $(".cl-bar-btn.bag").setAttribute("aria-label", `Basket, ${t.items} ${t.items === 1 ? "item" : "items"}, ${money(t.total)}`);
    $("[data-cl-orders]").textContent = S.orders.length ? `${S.orders.length} demo ${S.orders.length === 1 ? "order" : "orders"} placed · last ${S.orders[0].no}` : "Demo store · nothing is charged";
    // Entrance motion only when a layer first appears; colour or view changes cross-fade the image.
    const kind = ui.open ? "d:" + ui.open : ui.drawer ? "drawer" : "";
    const pick = ui.open ? `${ui.pick.color}:${ui.pick.size}:${ui.view}` : "";
    const enter = !!kind && kind !== lastKind, swap = !enter && !!pick && pick !== lastPick;
    layer.innerHTML = ui.open ? detail(enter, swap) : drawer(enter);
    lastKind = kind; lastPick = pick;
    document.documentElement.classList.toggle("cl-lock", !!(ui.open || ui.drawer));
    if (focusSel) (root.querySelector(focusSel) || layer.querySelector(".cl-x"))?.focus({ preventScroll: true });
  }
  function openProduct(id) {
    const p = byId[id]; ui.ret = ui.ret || document.activeElement;
    ui.drawer = null; ui.open = id; ui.added = ""; ui.view = "still";
    const col = canAdd(S, id, ui.tint[id]) > 0 ? ui.tint[id] : firstColor(p);
    ui.pick = { color: col || firstColor(p), size: p.sizes ? p.sizes[0][0] : "", qty: 1 };
    render(".cl-dialog .cl-x");
  }
  function closeLayer() { ui.open = null; ui.drawer = null; ui.added = ""; ui.promoMsg = ""; render(); ui.ret?.focus?.({ preventScroll: true }); ui.ret = null; }
  function applyCode(raw) {
    const code = raw.trim().toUpperCase();
    if (!code) ui.promoMsg = "Enter a code first.";
    else if (!PROMOS[code]) ui.promoMsg = `“${code}” isn't a valid code. Try WELCOME10 or HOME20.`;
    else { S.promo = code; save(); const t = totals(S); ui.promoMsg = t.discount ? `${code} applied: −${money(t.discount)}.` : `${code} saved. ${t.promoNote}.`; }
  }

  root.addEventListener("click", (e) => {
    const el = (s) => e.target.closest(s); let b;
    if ((b = el("[data-cl-open]"))) return openProduct(b.dataset.clOpen);
    if ((b = el("[data-cl-cat]"))) { ui.cat = b.dataset.clCat; return render(`[data-cl-cat="${ui.cat}"]`); }
    if ((b = el("[data-cl-tint]"))) { ui.tint[b.dataset.clTint] = b.dataset.v; ui.swapTile = b.dataset.clTint; return render(`[data-cl-tint="${b.dataset.clTint}"][data-v="${b.dataset.v}"]`); }
    if ((b = el("[data-cl-view]"))) { ui.view = b.dataset.clView; return render(`[data-cl-view="${ui.view}"]`); }
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
    if ((b = el("[data-cl-code]"))) { const code = b.dataset.clCode; applyCode(code); return render(`[data-cl-code="${code}"]`); }
    if (el("[data-cl-promo-clear]")) { S.promo = ""; ui.promoMsg = "Code removed."; save(); return render("#cl-code"); }
    if (el("[data-cl-checkout]")) { const o = checkout(S); if (o) { save(); ui.order = o; ui.drawer = "order"; say(`Demo order ${o.no} placed. Total ${money(o.total)}.`); } return render(".cl-drawer .cl-btn"); }
    if (el("[data-cl-reset]")) { S = fresh(); save(); Object.assign(ui, { cat: "All", sort: "featured", q: "", tint: {}, open: null, view: "still", drawer: null, order: null, promoMsg: "", added: "" }); $("[data-cl-q]").value = ""; say("Demo store reset."); return render("[data-cl-reset]"); }
  });
  root.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-cl-promo-form]")) return;
    e.preventDefault();
    applyCode($("#cl-code").value);
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
