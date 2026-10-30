// Connected Experience: a telecom self-service console for three fictional customers.
// One state model drives usage, plans, roaming, the bill and support. The bill is always the sum
// of its visible lines. Everything is synthetic: no carrier, account or payment is involved.
// State is kept in this browser only.
(() => {
  const root = typeof document !== "undefined" ? document.querySelector("[data-connected]") : null;

  /* ---------- Catalogue ---------- */
  const INF = Infinity;
  const PLANS = [
    { k: "lite", name: "Lite 5", data: 5, min: 300, sms: 100, price: 900, line: "For light data and everyday calls" },
    { k: "flex", name: "Flex 15", data: 15, min: 600, sms: INF, price: 1500, line: "Room for streaming on the go" },
    { k: "plus", name: "Plus 40", data: 40, min: INF, sms: INF, price: 2400, line: "Heavy data, unlimited calls" },
    { k: "max", name: "Max", data: INF, fair: 150, min: INF, sms: INF, price: 3500, line: "Unlimited data (150 GB fair use)" },
  ];
  const PLAN = Object.fromEntries(PLANS.map((p) => [p.k, p]));
  const ADDONS = [
    { k: "music", name: "Music pass", d: "Music streaming doesn't use your data", price: 400 },
    { k: "cloud", name: "Cloud 200 GB", d: "Backup for photos and files", price: 300 },
    { k: "cover", name: "Device cover", d: "Repair or replacement if it breaks", price: 600 },
    { k: "booster", name: "Data booster", d: "+5 GB for this billing month only", price: 600, gb: 5 },
  ];
  const ADD = Object.fromEntries(ADDONS.map((a) => [a.k, a]));
  const RATE = { gb: 300, min: 5, sms: 4 }; // out-of-bundle, in cents
  const DESTS = [
    { k: "tr", name: "Türkiye", zone: 1 }, { k: "ge", name: "Georgia", zone: 1 },
    { k: "pt", name: "Portugal", zone: 2 }, { k: "fr", name: "France", zone: 2 },
    { k: "ae", name: "UAE", zone: 3 }, { k: "us", name: "USA", zone: 3 },
  ];
  const DEST = Object.fromEntries(DESTS.map((d) => [d.k, d]));
  const ZONES = {
    1: { label: "Zone 1 · nearby", payg: 600, pkgs: [{ k: "day", name: "Day pass", d: "Your home allowance, abroad", perDay: 300 }, { k: "w5", name: "7 days · 5 GB", d: "Data and 100 minutes", price: 1200, gb: 5 }] },
    2: { label: "Zone 2 · Europe", payg: 900, pkgs: [{ k: "w3", name: "7 days · 3 GB", d: "Data and 100 minutes", price: 1500, gb: 3 }, { k: "m10", name: "30 days · 10 GB", d: "Data and 300 minutes", price: 3500, gb: 10 }] },
    3: { label: "Zone 3 · worldwide", payg: 1500, pkgs: [{ k: "w2", name: "7 days · 2 GB", d: "Data and 60 minutes", price: 2200, gb: 2 }, { k: "m8", name: "30 days · 8 GB", d: "Data and 200 minutes", price: 5500, gb: 8 }] },
  };
  const ACTS = [
    { k: "video", label: "Stream video, 1 hour", gb: 1.5, icon: "play" },
    { k: "vcall", label: "Video call, 30 minutes", gb: 0.4, icon: "cam" },
    { k: "music", label: "Stream music, 2 hours", gb: 0.15, icon: "note" },
    { k: "browse", label: "A day of browsing", gb: 0.3, icon: "globe" },
    { k: "voice", label: "Phone calls, 30 minutes", min: 30, icon: "phone" },
    { k: "text", label: "Send 20 texts", sms: 20, icon: "msg" },
  ];
  const DAY_CAP = 6; // GB per simulated day
  const CYCLE = 30;

  const wave = (n, avg, seed) => Array.from({ length: n }, (_, i) => Math.max(0.02, +(avg * (1 + 0.38 * Math.sin(i * 1.7 + seed) + ((i + seed) % 7 > 4 ? 0.3 : 0))).toFixed(2)));
  const PROFILES = {
    elnur: { name: "Elnur G.", initials: "EG", note: "Streams on the commute", plan: "flex", day: 18, addons: ["music"], daily: wave(18, 0.6, 1), min: 210, sms: 40, trip: null },
    sabina: { name: "Sabina T.", initials: "ST", note: "Travels for work each month", plan: "plus", day: 9, addons: ["cloud"], daily: wave(9, 1.05, 3), min: 340, sms: 15, trip: { dest: "pt", label: "Lisbon, 12–19 Nov" } },
    nail: { name: "Nail H.", initials: "NH", note: "Mostly calls, little data", plan: "flex", day: 24, addons: [], daily: wave(24, 0.11, 5), min: 220, sms: 60, trip: null },
  };

  /* ---------- Pure logic (also used by the test harness) ---------- */
  const r2 = (n) => Math.round(n * 100) / 100;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const used = (p) => ({ data: r2(sum(p.daily)), min: p.min, sms: p.sms });
  const allowance = (cfg) => { const pl = PLAN[cfg.plan]; return { data: pl.data + (cfg.addons.includes("booster") ? ADD.booster.gb : 0), min: pl.min, sms: pl.sms }; };
  const project = (p) => { const u = used(p), f = CYCLE / p.day; return { data: r2(u.data * f), min: Math.round(u.min * f), sms: Math.round(u.sms * f) }; };
  function roamingLine(ro) {
    if (!ro) return null;
    const z = ZONES[DEST[ro.dest].zone], pk = z.pkgs.find((x) => x.k === ro.pkg);
    return { k: "roaming", label: `Roaming · ${DEST[ro.dest].name} · ${pk.perDay ? `Day pass × ${ro.days}` : pk.name}`, amt: pk.perDay ? pk.perDay * ro.days : pk.price, cat: "roaming" };
  }
  function bill(cfg, u) {
    const pl = PLAN[cfg.plan], al = allowance(cfg), lines = [{ k: "plan", label: `${pl.name} plan`, amt: pl.price, cat: "plan" }];
    cfg.addons.forEach((a) => lines.push({ k: "addon-" + a, label: ADD[a].name, amt: ADD[a].price, cat: "addons" }));
    const ro = roamingLine(cfg.roaming); if (ro) lines.push(ro);
    if (al.data !== INF) { const packs = Math.ceil(Math.max(0, u.data - al.data) - 1e-9); if (packs > 0) lines.push({ k: "x-data", label: `Extra data · ${packs} × 1 GB`, amt: packs * RATE.gb, cat: "extra" }); }
    if (al.min !== INF && u.min > al.min) lines.push({ k: "x-min", label: `Extra minutes · ${u.min - al.min} min`, amt: (u.min - al.min) * RATE.min, cat: "extra" });
    if (al.sms !== INF && u.sms > al.sms) lines.push({ k: "x-sms", label: `Extra texts · ${u.sms - al.sms}`, amt: (u.sms - al.sms) * RATE.sms, cat: "extra" });
    return { lines, total: sum(lines.map((l) => l.amt)) };
  }
  const cfgOf = (p) => ({ plan: p.plan, addons: [...p.addons], roaming: p.roaming || null });
  function recommend(p) {
    const pr = project(p), cur = bill(cfgOf(p), pr).total;
    const opts = PLANS.map((pl) => ({ k: pl.k, total: bill({ ...cfgOf(p), plan: pl.k }, pr).total })).sort((a, b) => a.total - b.total);
    const best = opts[0];
    return best.k !== p.plan && cur - best.total >= 100 ? { k: best.k, save: cur - best.total, cur, best: best.total } : null;
  }
  function consume(p, act, hasMusic) {
    if (p.day > CYCLE) return { ok: false, why: "cycle" };
    if (act.gb) {
      const gb = act.k === "music" && hasMusic ? 0 : act.gb, today = p.daily[p.day - 1] || 0;
      if (today + gb > DAY_CAP) return { ok: false, why: "cap" };
      p.daily[p.day - 1] = r2(today + gb);
      return { ok: true, gb };
    }
    if (act.min) p.min += act.min;
    if (act.sms) p.sms += act.sms;
    return { ok: true };
  }
  function nextDay(p) { if (p.day >= CYCLE) return false; p.day++; p.daily.push(0); return true; }
  const diff = (a, b) => {
    const keys = [...new Set([...a.lines, ...b.lines].map((l) => l.k))];
    return keys.map((k) => { const x = a.lines.find((l) => l.k === k), y = b.lines.find((l) => l.k === k); return { k, label: (y || x).label, from: x ? x.amt : 0, to: y ? y.amt : 0 }; }).filter((d) => d.from !== d.to);
  };
  const CORE = { PLANS, PLAN, ADDONS, ADD, RATE, DESTS, ZONES, ACTS, PROFILES, DAY_CAP, CYCLE, used, allowance, project, bill, recommend, consume, nextDay, diff, cfgOf, roamingLine };
  if (typeof module !== "undefined") module.exports = CORE;
  if (!root) return;

  /* ---------- State ---------- */
  const KEY = "bb-connected-v1";
  const freshProfile = (k) => { const b = PROFILES[k]; return { plan: b.plan, addons: [...b.addons], roaming: null, daily: [...b.daily], min: b.min, sms: b.sms, day: b.day, orders: [], log: [] }; };
  const fresh = () => ({ v: 1, active: "elnur", p: Object.fromEntries(Object.keys(PROFILES).map((k) => [k, freshProfile(k)])), draft: null });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !S.p?.elnur) S = fresh();
  const ui = { tab: "overview", dest: null, days: 3, topic: null, handover: false, msg: "" };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const P = () => S.p[S.active], B = () => PROFILES[S.active];
  const working = () => S.draft || cfgOf(P());
  const edit = (fn) => { S.draft = S.draft || cfgOf(P()); fn(S.draft); if (JSON.stringify(S.draft) === JSON.stringify(cfgOf(P()))) S.draft = null; save(); };

  /* ---------- Format ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $$ = (c) => "$" + (c / 100).toFixed(2);
  const sd = (c) => (c > 0 ? "+" : c < 0 ? "−" : "") + $$(Math.abs(c));
  const gbf = (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, "") + " GB";
  const lim = (n, u) => (n === INF ? "Unlimited" : n + (u ? " " + u : ""));
  const ICON = {
    gauge: '<path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', plan: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
    plane: '<path d="M3 13.5 21 6l-4.5 13-4-5.5-6 3 1.5-4.5z"/>', bill: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
    play: '<path d="M7 4v16l13-8z"/>', cam: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>', note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/>', msg: '<path d="M4 4h16v12H8l-4 4z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>', reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>', check: '<path d="m4 12.5 5 4.5L20 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    link: '<circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/>',
  };
  const ico = (k, s = 18) => `<svg class="tc-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const mq = typeof matchMedia === "function" ? matchMedia("(max-width: 640px)") : null;
  const narrow = () => !!(mq && mq.matches);
  const pc = (v) => Math.max(0, Math.min(100, v)).toFixed(2) + "%";
  const niceStep = (span, n) => [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => span / s <= n) || 1000;

  /* ---------- Derived views ---------- */
  function notifications() {
    const p = P(), b = B(), cfg = cfgOf(p), u = used(p), al = allowance(cfg), out = [];
    if (al.data !== INF) {
      const pct = u.data / al.data;
      if (pct >= 1) out.push(["warn", "Data allowance used", `${Math.ceil(u.data - al.data - 1e-9)} extra GB added at ${$$(RATE.gb)} each. A booster or a bigger plan may cost less.`]);
      else if (pct >= 0.8) out.push(["warn", `${Math.round(pct * 100)}% of your data used`, `${gbf(r2(al.data - u.data))} left with ${CYCLE - p.day} days to go.`]);
    }
    const rec = recommend(p);
    if (rec) out.push(["tip", `${PLAN[rec.k].name} fits your usage better`, `Your projected bill would be ${$$(rec.save)} lower this month.`]);
    if (b.trip && !p.roaming) out.push(["info", `Travelling to ${b.trip.label.split(",")[0]}?`, "You have no roaming package yet. Pay-as-you-go data abroad is " + $$(ZONES[DEST[b.trip.dest].zone].payg) + " per GB."]);
    p.log.slice(-2).reverse().forEach((l) => out.push(["ok", l.t, l.d]));
    return out;
  }

  // A flowing allowance band: used, projected run to day 30, the allowance notch and any overspill.
  function meter(k, label, val, max, proj, unit, fair) {
    const unl = max === INF, cap = unl ? fair || 0 : max;
    const fmt = (v) => (unit === "GB" ? gbf(r2(Math.max(0, v))) : Math.round(Math.max(0, v)) + " " + unit);
    const shown = unit === "GB" ? gbf(val).replace(" GB", "") : Math.round(val);
    const over = !unl && val > max;
    const head = `<div class="tc-meter-head"><span class="tc-k">${label}</span><b>${shown}<small> ${unit}</small></b>
      <span class="tc-of">${unl ? (fair ? `of ${fair} GB fair use` : "Unlimited") : `of ${max} ${unit}`}</span>
      <span class="tc-left${over ? " over" : ""}">${unl ? (fair ? `${fmt(fair - val)} to fair use` : "Nothing to watch") : over ? `${fmt(val - max)} over` : `${fmt(max - val)} left`}</span></div>`;
    if (!cap) return `<div class="tc-meter m-${k} unl" role="img" aria-label="${label}: ${shown} ${unit} used, unlimited">${head}<div class="tc-band"><i class="tc-band-flow"></i></div></div>`;
    const scale = Math.max(cap, proj, val) * 1.04, X = (v) => (v / scale) * 100, end = Math.max(val, proj);
    return `<div class="tc-meter m-${k}" role="img" aria-label="${label}: ${shown} ${unit} used of ${cap} ${unit}${unl ? " fair use" : ""}. At this pace about ${fmt(proj)} by day ${CYCLE}${!unl && proj > max ? `, ${fmt(proj - max)} over the allowance` : ""}.">${head}
      <div class="tc-band" style="--step:${X(niceStep(scale, 24)).toFixed(3)}%">
        ${end > cap ? `<i class="tc-band-risk" data-tw="${k}-risk" style="left:${pc(X(cap))};width:${pc(X(end - cap))}"></i>` : ""}
        <i class="tc-band-proj" data-tw="${k}-proj" style="left:${pc(X(val))};width:${pc(X(Math.max(0, proj - val)))}"></i>
        <i class="tc-band-used" data-tw="${k}-used" style="width:${pc(X(Math.min(val, cap)))}"></i>
        ${val > cap ? `<i class="tc-band-over" data-tw="${k}-over" style="left:${pc(X(cap))};width:${pc(X(val - cap))}"></i>` : ""}
        <i class="tc-band-cap${X(cap) < 34 ? " lo" : ""}" style="left:${pc(X(cap))}"><em>${unl ? "Fair use " : "Allowance "}${cap} ${unit === "GB" ? "GB" : unit}</em></i>
        <i class="tc-band-pin${X(proj) > 60 ? " flip" : ""}" data-tw="${k}-pin" style="left:${pc(X(proj))}"><em>Day ${CYCLE} ≈ ${fmt(proj)}</em></i>
      </div></div>`;
  }
  const dayTicks = (d) => `<span class="tc-days" aria-hidden="true">${Array.from({ length: CYCLE }, (_, i) => `<i class="${i < d - 1 ? "past" : i === d - 1 ? "now" : ""}"></i>`).join("")}</span>`;

  // Usage over the month: cumulative area against the allowance, daily columns underneath.
  function chart() {
    const p = P(), cfg = cfgOf(p), al = allowance(cfg), u = used(p), pr = project(p), nw = narrow();
    const cum = []; p.daily.reduce((a, v, i) => (cum[i] = r2(a + v)), 0);
    const W = nw ? 340 : 680, top = 34, base = nw ? 176 : 196, bb = base + 74, H = bb + 24;
    const ymax = Math.max(al.data === INF ? 0 : al.data * 1.15, pr.data * 1.08, 2);
    const x = (d) => 14 + ((d - 0.5) / CYCLE) * (W - 28), y = (v) => base - (v / ymax) * (base - top);
    const f = (n) => n.toFixed(1);
    const pts = cum.map((v, i) => `${f(x(i + 1))},${f(y(v))}`);
    const area = `M${f(x(1))},${base} L${pts.join(" L")} L${f(x(p.day))},${base} Z`;
    const st = niceStep(ymax, nw ? 3 : 4), grid = []; for (let v = st; v < ymax; v += st) grid.push(v);
    const aly = al.data !== INF ? y(al.data) : null, dx = x(p.day), dy = y(u.data), px = x(CYCLE), py = y(pr.data);
    const dmax = Math.max(...p.daily, 0.5), bw = Math.max(3, ((W - 28) / CYCLE) * 0.58);
    const bars = Array.from({ length: CYCLE }, (_, i) => {
      const v = p.daily[i];
      if (v == null || i >= p.day) return `<circle cx="${f(x(i + 1))}" cy="${bb - 2}" r="1.6" class="tc-fut"/>`;
      const h = Math.max(2, (v / dmax) * 52);
      return `<rect x="${f(x(i + 1) - bw / 2)}" y="${f(bb - h)}" width="${f(bw)}" height="${f(h)}" rx="${Math.min(3, bw / 2)}" class="${i === p.day - 1 ? "today" : ""}"/>`;
    }).join("");
    const left = p.day > CYCLE * 0.62;
    return `<svg class="tc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Data used so far ${gbf(u.data)} by day ${p.day}; projected ${gbf(pr.data)} by day ${CYCLE}${aly != null ? `; allowance ${al.data} GB` : ""}.">
      <defs><linearGradient id="tcArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C5F04A" stop-opacity=".42"/><stop offset="1" stop-color="#C5F04A" stop-opacity="0"/></linearGradient></defs>
      ${grid.map((v) => `<line x1="14" x2="${W - 14}" y1="${f(y(v))}" y2="${f(y(v))}" class="tc-grid"/>${Math.abs(y(v) - 5 - (py - 10)) < 16 || (aly != null && Math.abs(y(v) - aly) < 14) || (Math.abs(y(v) - 5 - (dy + 18)) < 14 && dx > W - 200) ? "" : `<text x="${W - 14}" y="${f(y(v) - 5)}" class="tc-ax" text-anchor="end">${gbf(r2(v))}</text>`}`).join("")}
      <line x1="14" x2="${W - 14}" y1="${base}" y2="${base}" class="tc-baseline"/>
      ${aly != null ? `<rect x="14" y="${top - 18}" width="${W - 28}" height="${f(Math.max(0, aly - top + 18))}" class="tc-overzone"/><line x1="14" x2="${W - 14}" y1="${f(aly)}" y2="${f(aly)}" class="tc-allow"/><text x="18" y="${f(aly - 7)}" class="tc-ax allow">Allowance ${al.data} GB</text>` : ""}
      <path d="${area}" fill="url(#tcArea)"/>
      <line x1="${f(dx)}" x2="${f(px)}" y1="${f(dy)}" y2="${f(py)}" class="tc-proj"/>
      <circle cx="${f(px)}" cy="${f(py)}" r="4.5" class="tc-proj-end"/>
      <text x="${f(px - 8)}" y="${f(py - 10)}" class="tc-ax strong" text-anchor="end">≈ ${gbf(pr.data)} by day ${CYCLE}</text>
      <polyline points="${pts.join(" ")}" class="tc-line"/>
      <line x1="${f(dx)}" x2="${f(dx)}" y1="${f(dy + 8)}" y2="${bb}" class="tc-today"/>
      <circle cx="${f(dx)}" cy="${f(dy)}" r="6" class="tc-dot"/>
      <text x="${f(left ? dx - 12 : dx + 12)}" y="${f(left ? Math.max(top - 4, dy - 12) : dy + 18)}" class="tc-ax strong" text-anchor="${left ? "end" : "start"}">${gbf(u.data)} · day ${p.day}</text>
      <g class="tc-bars">${bars}</g>
      <text x="14" y="${H - 4}" class="tc-ax">Day 1</text><text x="${W - 14}" y="${H - 4}" class="tc-ax" text-anchor="end">Day ${CYCLE}</text>
      ${dx > 60 && dx < W - 60 ? `<text x="${f(dx)}" y="${H - 4}" class="tc-ax strong" text-anchor="middle">Today</text>` : ""}
    </svg>`;
  }

  /* ---------- Tabs ---------- */
  function overview() {
    const p = P(), b = B(), cfg = cfgOf(p), al = allowance(cfg), u = used(p), pr = project(p), pl = PLAN[p.plan], n = notifications();
    return `<div class="tc-head"><div><span class="tc-k">${pl.name} · day ${p.day} of ${CYCLE}</span><h3>Your usage this month</h3></div><button type="button" class="tc-ghost" data-tc-tab="usage">Simulate usage ${ico("arrow", 16)}</button></div>
      <section class="tc-pulse" aria-label="Allowances this month">
        <div class="tc-pulse-top"><span class="tc-k">Billing month</span>${dayTicks(p.day)}<b>${CYCLE - p.day} days to go</b></div>
        ${meter("data", "Data", u.data, al.data, pr.data, "GB", pl.fair)}${meter("min", "Minutes", u.min, al.min, pr.min, "min")}${meter("sms", "Texts", u.sms, al.sms, pr.sms, "texts")}
        <p class="tc-key"><i class="k-used"></i>Used so far <i class="k-proj"></i>Projected by day ${CYCLE} <i class="k-risk"></i>Over the allowance</p>
      </section>
      <section class="tc-card"><header><h4>${ico("bell", 16)}Notifications</h4><span class="tc-count">${n.length}</span></header>
        ${n.length ? `<ul class="tc-notes">${n.map(([t, h, d]) => `<li class="n-${t}"><b>${esc(h)}</b><span>${esc(d)}</span></li>`).join("")}</ul>` : `<p class="tc-empty">Nothing needs your attention.</p>`}
        ${recommend(p) ? `<button type="button" class="tc-btn sm" data-tc-tab="plans">Compare plans</button>` : ""}${b.trip && !p.roaming ? `<button type="button" class="tc-btn sm ghost" data-tc-tab="roaming">Add roaming</button>` : ""}</section>`;
  }
  function usage() {
    const p = P(), cfg = cfgOf(p), al = allowance(cfg), u = used(p), pr = project(p), music = p.addons.includes("music"), today = p.daily[p.day - 1] || 0;
    const over = al.data !== INF && pr.data > al.data;
    return `<div class="tc-head"><div><span class="tc-k">Data used so far vs your allowance</span><h3>Usage</h3></div>
        <div class="tc-daybox"><span>Day <b>${p.day}</b> of ${CYCLE}</span><button type="button" class="tc-ghost" data-tc-day ${p.day >= CYCLE ? "disabled" : ""}>Next day ${ico("arrow", 15)}</button></div></div>
      <section class="tc-chart-card" aria-label="Data over the month">
        <dl class="tc-stats"><div><dt>Used</dt><dd>${gbf(u.data)}</dd></div><div><dt>Projected</dt><dd class="${over ? "warn" : ""}">${gbf(pr.data)}</dd></div><div><dt>Allowance</dt><dd>${al.data === INF ? "Unlimited" : al.data + " GB"}</dd></div></dl>
        ${chart()}
        <p class="tc-key"><i class="k-line"></i>Used <i class="k-dash"></i>Projected <i class="k-bar"></i>Daily use <i class="k-risk"></i>Over allowance</p></section>
      <section class="tc-card"><header><h4>Simulate today</h4><span class="tc-sub">${gbf(today)} of ${DAY_CAP} GB today · demo daily limit</span></header>
        <div class="tc-todaybar" aria-hidden="true"><i data-tw="today" style="width:${pc((today / DAY_CAP) * 100)}"></i></div>
        <div class="tc-acts">${ACTS.map((a) => { const g = a.gb ? (a.k === "music" && music ? 0 : a.gb) : 0; const blocked = a.gb && today + g > DAY_CAP;
          const w = a.gb ? (g / 1.5) * 100 : a.min ? 40 : 22;
          return `<button type="button" class="${a.gb ? "a-data" : a.min ? "a-min" : "a-sms"}" data-tc-use="${a.k}" ${blocked ? "disabled" : ""}>${ico(a.icon, 18)}<span><b>${a.label}</b><small>${a.gb ? (g ? "+" + gbf(g) : "No data with your Music pass") : a.min ? "+" + a.min + " minutes" : "+" + a.sms + " texts"}</small><i class="tc-cost" style="width:${pc(Math.max(w, 4))}"></i></span></button>`; }).join("")}</div>
        <p class="tc-msg" aria-live="polite">${esc(ui.msg)}</p></section>`;
  }
  function plans() {
    const p = P(), w = working(), pr = project(p), rec = recommend(p), cur = bill(cfgOf(p), pr).total, now = PLAN[p.plan];
    const scale = Math.max(44, pr.data * 1.18), youX = Math.min(100, (pr.data / scale) * 100);
    const chg = (a, b, u) => (a === b ? "" : `<em class="tc-chg ${a > b ? "good" : "bad"}">${a === INF ? "Upgrade" : b === INF ? "Capped" : (a > b ? "+" : "−") + Math.abs(a - b) + " " + u}</em>`);
    const cards = PLANS.map((pl) => {
      const t = bill({ ...w, plan: pl.k }, pr).total, d = t - cur, sel = w.plan === pl.k, isNow = p.plan === pl.k, al = allowance({ ...w, plan: pl.k });
      const fits = al.data === INF || pr.data <= al.data;
      const fill = al.data === INF ? 100 : Math.min(100, (al.data / scale) * 100);
      return `<button type="button" role="radio" aria-checked="${sel}" class="tc-plan${sel ? " sel" : ""}${isNow ? " cur" : ""}" data-tc-plan="${pl.k}">
        <span class="tc-plan-top"><b>${pl.name}</b>${isNow ? "<em>Current</em>" : rec?.k === pl.k ? '<em class="rec">Best fit</em>' : ""}</span>
        <span class="tc-price">${$$(pl.price)}<small>/month</small></span>
        <span class="tc-fit${al.data === INF ? " inf" : ""}${fits ? "" : " short"}" aria-hidden="true"><i class="tc-fit-fill" style="width:${pc(fill)}"></i><i class="tc-fit-you" style="left:${pc(youX)}"></i></span>
        <span class="tc-verdict ${fits ? "ok" : "short"}">${al.data === INF ? `Unlimited · ${pl.fair} GB fair use` : fits ? `Fits · ${gbf(r2(al.data - pr.data))} spare` : `${gbf(r2(pr.data - al.data))} short · extra charges`}</span>
        <ul><li><span>Data</span><b>${lim(pl.data, "GB")}</b>${isNow ? "" : chg(pl.data, now.data, "GB")}</li><li><span>Minutes</span><b>${lim(pl.min)}</b>${isNow ? "" : chg(pl.min, now.min, "min")}</li><li><span>Texts</span><b>${lim(pl.sms)}</b>${isNow ? "" : chg(pl.sms, now.sms, "texts")}</li></ul>
        <span class="tc-proj-bill"><small>Projected bill</small><b>${$$(t)}</b><i class="${d < 0 ? "down" : d > 0 ? "up" : ""}">${d ? sd(d) : "No change"}</i></span></button>`;
    }).join("");
    let cmp;
    if (w.plan !== p.plan) {
      const np = PLAN[w.plan], a = bill(cfgOf(p), pr).total, b2 = bill({ ...w }, pr).total;
      const row = (l, x, y, chip) => `<tr class="${x === y ? "" : "diff"}"><th scope="row">${l}</th><td>${x}</td><td>${y}${x === y ? "" : " " + chip}</td></tr>`;
      const money = (n) => `<em class="tc-chg ${n < 0 ? "good" : "bad"}">${sd(n)}</em>`;
      cmp = `<section class="tc-card tc-cmp"><header><h4>What changes</h4><span class="tc-sub">${now.name} → ${np.name}</span></header>
        <div class="tc-tablewrap"><table><thead><tr><th scope="col"><span class="tc-sr">Item</span></th><th scope="col">Now · ${now.name}</th><th scope="col">With ${np.name}</th></tr></thead><tbody>
        ${row("Data", lim(now.data, "GB"), lim(np.data, "GB"), chg(np.data, now.data, "GB"))}${row("Minutes", lim(now.min), lim(np.min), chg(np.min, now.min, "min"))}${row("Texts", lim(now.sms), lim(np.sms), chg(np.sms, now.sms, "texts"))}
        ${row("Monthly price", $$(now.price), $$(np.price), money(np.price - now.price))}${row("Projected bill", $$(a), $$(b2), money(b2 - a))}</tbody></table></div></section>`;
    } else cmp = `<p class="tc-hint">${ico("arrow", 15)}Pick another plan to see what changes, side by side, before anything is confirmed.</p>`;
    return `<div class="tc-head"><div><span class="tc-k">Projected for this month at your current pace</span><h3>Plans and add-ons</h3></div>
        <p class="tc-you"><i></i>Your projected data: <b>${gbf(pr.data)}</b></p></div>
      <div class="tc-plans" role="radiogroup" aria-label="Plans">${cards}</div>
      ${cmp}
      <section class="tc-card"><header><h4>Add-ons</h4><span class="tc-sub">Monthly unless stated</span></header>
        <ul class="tc-addons">${ADDONS.map((a) => `<li><label><input type="checkbox" data-tc-addon="${a.k}" ${w.addons.includes(a.k) ? "checked" : ""}><span><b>${a.name}</b><small>${a.d}</small></span><em>${$$(a.price)}</em></label></li>`).join("")}</ul></section>`;
  }

  // Roaming as zone rings around home: the further the ring, the higher the pay-as-you-go rate.
  const ZR = { 1: 18, 2: 31, 3: 44 };
  const PIN = { tr: [33.1, 56.2], ge: [66.3, 42.4], pt: [24.6, 32.2], fr: [65.5, 23.2], ae: [83.7, 78.3], us: [16.3, 78.3] };
  function roaming() {
    const p = P(), b = B(), w = working(), dk = ui.dest || w.roaming?.dest || b.trip?.dest || "tr", zn = DEST[dk].zone, z = ZONES[zn];
    const [tx, ty] = PIN[dk], mx = (50 + tx) / 2 + (ty - 50) * 0.35, my = (50 + ty) / 2 - (tx - 50) * 0.35;
    const maxPayg = Math.max(...Object.values(ZONES).map((x) => x.payg));
    const map = `<div class="tc-map"><div class="tc-map-sq">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          ${[3, 2, 1].map((k) => `<circle cx="50" cy="50" r="${ZR[k]}" class="tc-zr z${k}${k === zn ? " on" : ""}"/>`).join("")}
          <path d="M50,50 Q${mx.toFixed(1)},${my.toFixed(1)} ${tx},${ty}" class="tc-arc" pathLength="1"/>
          <circle cx="50" cy="50" r="1.9" class="tc-home-dot"/><circle cx="50" cy="50" r="4.2" class="tc-home-halo"/>
        </svg>
        <span class="tc-home">Home</span>
        ${[1, 2, 3].map((k) => `<span class="tc-zl z${k}" style="top:${50 + ZR[k]}%">Zone ${k}</span>`).join("")}
        ${DESTS.map((d) => `<button type="button" class="tc-pin z${d.zone}" style="left:${PIN[d.k][0]}%;top:${PIN[d.k][1]}%" data-tc-dest="${d.k}" aria-pressed="${d.k === dk}" aria-label="${d.name}, zone ${d.zone}${b.trip?.dest === d.k ? ", upcoming trip" : ""}"><i></i>${d.name}${b.trip?.dest === d.k ? "<small>Trip</small>" : ""}</button>`).join("")}
      </div></div>`;
    const rates = `<ul class="tc-rates">${[1, 2, 3].map((k) => `<li class="z${k}${k === zn ? " on" : ""}"><span>${ZONES[k].label}</span><i style="width:${pc((ZONES[k].payg / maxPayg) * 100)}"></i><b>${$$(ZONES[k].payg)}<small>/GB</small></b></li>`).join("")}</ul>`;
    return `<div class="tc-head"><div><span class="tc-k">${b.trip ? `Upcoming trip · ${esc(b.trip.label)}` : "No trip planned"}</span><h3>Roaming</h3></div></div>
      <section class="tc-roam" aria-label="Destination">
        <div role="group" aria-label="Destination">${map}</div>
        <div class="tc-roam-side"><span class="tc-k">Destination</span><b class="tc-dest-name">${DEST[dk].name}</b><span class="tc-zone-tag z${zn}">${z.label}</span>
          <p class="tc-sub">Pay-as-you-go data without a package, per GB:</p>${rates}</div>
      </section>
      <section class="tc-card"><header><h4>Packages for ${DEST[dk].name}</h4><span class="tc-sub">Without a package: ${$$(z.payg)} per GB</span></header>
        <div class="tc-pkgs">${z.pkgs.map((pk) => { const sel = w.roaming?.dest === dk && w.roaming.pkg === pk.k; const price = pk.perDay ? pk.perDay * ui.days : pk.price;
          const payg = pk.gb ? pk.gb * z.payg : 0;
          return `<div class="tc-pkg${sel ? " sel" : ""}"><div class="tc-pkg-top"><b>${pk.name}</b><span class="tc-price sm">${$$(price)}</span></div><small>${pk.d}</small>
            ${pk.perDay ? `<div class="tc-step" role="group" aria-label="Days"><button type="button" data-tc-days="-1" aria-label="Fewer days">−</button><span>${ui.days} day${ui.days > 1 ? "s" : ""} × ${$$(pk.perDay)}</span><button type="button" data-tc-days="1" aria-label="More days">+</button></div><p class="tc-vs-note">Uses your home allowance. No per-GB charge.</p>`
              : `<div class="tc-vs" aria-label="${pk.gb} GB costs ${$$(pk.price)} with this package or ${$$(payg)} pay as you go"><span><i class="pk" style="width:${pc((pk.price / payg) * 100)}"></i></span><span><i class="pg" style="width:100%"></i></span></div>
                 <p class="tc-vs-note"><b>${$$(payg - pk.price)} less</b> than ${pk.gb} GB pay as you go (${$$(payg)})</p>`}
            <button type="button" class="tc-btn sm${sel ? " ghost" : ""}" data-tc-roam="${dk}:${pk.k}">${sel ? ico("check", 15) + "Selected" : "Choose"}</button></div>`; }).join("")}</div>
        ${w.roaming ? `<button type="button" class="tc-link" data-tc-roam="none">Remove roaming package</button>` : ""}</section>`;
  }

  // Every bill line carries a one-line reason, written from the customer's own numbers.
  function why(l, cfg, u, al) {
    if (l.cat === "plan") { const pl = PLAN[cfg.plan]; const u2 = (n, w) => (n === INF ? "unlimited " + w : n + " " + w); return `${pl.data === INF ? `Unlimited data (${pl.fair} GB fair use)` : pl.data + " GB"}, ${u2(pl.min, "minutes")} and ${u2(pl.sms, "texts")} every month`; }
    if (l.cat === "addons") return ADD[l.k.slice(6)].d;
    if (l.cat === "roaming") { const ro = cfg.roaming, pk = ZONES[DEST[ro.dest].zone].pkgs.find((x) => x.k === ro.pkg); return pk.perDay ? `${ro.days} day${ro.days > 1 ? "s" : ""} × ${$$(pk.perDay)} in ${DEST[ro.dest].name}, using your home allowance` : `${pk.d} in ${DEST[ro.dest].name}, paid once`; }
    if (l.k === "x-data") return `You've used ${gbf(u.data)} of ${al.data} GB. Each started GB over is ${$$(RATE.gb)}.`;
    if (l.k === "x-min") return `${u.min} of ${al.min} minutes used, ${$$(RATE.min)} per extra minute`;
    if (l.k === "x-sms") return `${u.sms} of ${al.sms} texts sent, ${$$(RATE.sms)} per extra text`;
    return "";
  }
  const CATS = [["plan", "Plan"], ["addons", "Add-ons"], ["roaming", "Roaming"], ["extra", "Out of bundle"]];
  const parts = (bl) => CATS.map(([c, l]) => [c, l, sum(bl.lines.filter((x) => x.cat === c).map((x) => x.amt))]);
  function billTab() {
    const p = P(), cfg = cfgOf(p), u = used(p), al = allowance(cfg), bl = bill(cfg, u), pt = parts(bl);
    return `<div class="tc-head"><div><span class="tc-k">Estimate so far · bill on 1 Dec</span><h3>Bill</h3></div><b class="tc-big">${$$(bl.total)}</b></div>
      <div class="tc-split"><div class="tc-stack" aria-hidden="true">${pt.map(([c, , v]) => (v ? `<i class="c-${c}" data-tw="bill-${c}" style="flex:${v}"></i>` : "")).join("")}</div>
        <ul class="tc-split-key">${pt.filter(([, , v]) => v).map(([c, l, v]) => `<li class="c-${c}"><span>${l}</span><b>${$$(v)}</b><small>${Math.round((v / bl.total) * 100)}%</small></li>`).join("")}</ul></div>
      <section class="tc-receipt" aria-label="Bill lines"><ol class="tc-lines">${bl.lines.map((l) => `<li class="c-${l.cat}"><div><span>${esc(l.label)}</span><small>${esc(why(l, cfg, u, al))}</small></div><b>${$$(l.amt)}</b><i class="tc-share" style="width:${pc((l.amt / bl.total) * 100)}"></i></li>`).join("")}</ol>
        <div class="tc-tot"><span>Total so far</span><b>${$$(bl.total)}</b></div>
        <p class="tc-fine">Out-of-bundle charges use what you've used so far: ${$$(RATE.gb)} per extra GB, ${$$(RATE.min)} per minute, ${$$(RATE.sms)} per text.</p></section>
      <section class="tc-card"><header><h4>Service summary</h4></header>${p.orders.length ? `<ol class="tc-orders">${p.orders.slice().reverse().map((o) => `<li><b>${o.ref}</b><span>${o.items.map(esc).join(" · ")}</span><small>Day ${o.day} · new estimate ${$$(o.total)}</small></li>`).join("")}</ol>` : `<p class="tc-empty">No changes yet. Confirmed changes appear here with a reference.</p>`}</section>`;
  }
  function support() {
    const p = P(), b = B(), cfg = cfgOf(p), u = used(p), al = allowance(cfg), pr = project(p), bl = bill(cfg, u);
    const T = {
      data: ["My data is running out", "chart", () => `<p>${al.data === INF ? `You're on unlimited data: ${gbf(u.data)} of ${PLAN[p.plan].fair} GB fair use so far.` : `You've used <b>${gbf(u.data)}</b> of ${al.data} GB with ${CYCLE - p.day} days left. At this pace you'll reach <b>${gbf(pr.data)}</b>.`}</p>
        <div class="tc-row">${al.data !== INF && !cfg.addons.includes("booster") ? `<button type="button" class="tc-btn sm" data-tc-addon-add="booster">Add a 5 GB booster (${$$(ADD.booster.price)})</button>` : ""}<button type="button" class="tc-btn sm ghost" data-tc-tab="plans">Compare plans</button></div>`],
      bill: ["My bill looks higher than usual", "bill", () => { const extra = bl.lines.filter((l) => l.k !== "plan").sort((a, c) => c.amt - a.amt);
        return `<p>Your plan is ${$$(PLAN[p.plan].price)}. ${extra.length ? `On top of that:` : "Nothing has been added on top of it this month."}</p>${extra.length ? `<ul class="tc-lines mini">${extra.map((l) => `<li class="c-${l.cat}"><div><span>${esc(l.label)}</span></div><b>${$$(l.amt)}</b></li>`).join("")}</ul>` : ""}<div class="tc-row"><button type="button" class="tc-btn sm ghost" data-tc-tab="bill">See the full bill</button></div>`; }],
      roam: ["Will my phone work abroad?", "plane", () => { const d = b.trip ? DEST[b.trip.dest] : null;
        return `<p>${p.roaming ? `Yes. Your ${esc(roamingLine(p.roaming).label.replace("Roaming · ", ""))} package is active.` : d ? `It will, but without a package data in ${d.name} costs ${$$(ZONES[d.zone].payg)} per GB.` : "It will. Choose your destination to see the packages and pay-as-you-go rates."}</p><div class="tc-row"><button type="button" class="tc-btn sm ghost" data-tc-tab="roaming">Roaming options</button></div>`; }],
    };
    const t = ui.topic && T[ui.topic];
    return `<div class="tc-head"><div><span class="tc-k">Answers from your own account first</span><h3>Support</h3></div></div>
      <div class="tc-topics" role="group" aria-label="What do you need help with?">${Object.entries(T).map(([k, [l, i]]) => `<button type="button" data-tc-support="${k}" aria-pressed="${ui.topic === k}">${ico(i, 18)}<span>${l}</span></button>`).join("")}</div>
      ${t ? `<section class="tc-card tc-answer"><header><h4>${t[0]}</h4></header>${t[2]()}
        <div class="tc-hand">${ui.handover ? `<div class="tc-relay" aria-hidden="true"><span class="tc-av">${B().initials}</span><i></i><span class="tc-av agent">${ico("help", 16)}</span></div><p class="tc-k">Shared with the agent</p><ul><li>${ico("check", 14)}${esc(B().name)} · ${PLAN[p.plan].name}</li><li>${ico("check", 14)}Topic: ${esc(t[0])}</li><li>${ico("check", 14)}Data ${gbf(u.data)} of ${lim(al.data, "GB")} · day ${p.day}</li><li>${ico("check", 14)}Bill estimate ${$$(bl.total)}</li></ul><p class="tc-fine">Demo only: no agent is contacted. The customer never has to repeat themselves.</p>`
          : `<button type="button" class="tc-link" data-tc-handover>Still stuck? Talk to an agent</button>`}</div></section>` : `<p class="tc-empty">Choose a topic. The answer uses this customer's live usage and bill.</p>`}`;
  }

  /* ---------- Summary column ---------- */
  function summary() {
    const p = P(), cur = bill(cfgOf(p), used(p));
    let pend = "";
    if (S.draft) {
      const nb = bill(S.draft, used(p)), d = diff(cur, nb);
      pend = `<div class="tc-pend"><span class="tc-k">Pending changes</span><ul>${d.map((x) => `<li><span>${esc(x.label)}</span><b>${x.from ? `<s>${$$(x.from)}</s>` : "<s>—</s>"} → ${x.to ? $$(x.to) : "—"}</b></li>`).join("")}</ul>
        <div class="tc-newtot"><span>New estimate</span><b>${$$(nb.total)}</b><i class="${nb.total < cur.total ? "down" : "up"}">${sd(nb.total - cur.total)}</i></div>
        <div class="tc-row"><button type="button" class="tc-btn go" data-tc-confirm>Confirm changes</button><button type="button" class="tc-btn ghost" data-tc-cancel>Discard</button></div><p class="tc-fine">Demo: nothing changes on a real account.</p></div>`;
    }
    const last = p.orders[p.orders.length - 1], pt = parts(cur);
    return `<span class="tc-k">This month · estimate</span><b class="tc-total">${$$(cur.total)}</b>
      <span class="tc-sum-who">${esc(B().name)} · ${PLAN[p.plan].name} · day ${p.day}</span>
      <div class="tc-stack" aria-hidden="true">${pt.map(([c, , v]) => (v ? `<i class="c-${c}" data-tw="sum-${c}" style="flex:${v}"></i>` : "")).join("")}</div>
      <ul class="tc-parts">${pt.map(([c, l, v]) => `<li class="c-${c}${v ? "" : " zero"}"><span>${l}</span><b>${$$(v)}</b></li>`).join("")}</ul>
      ${pend}${!S.draft && last ? `<div class="tc-done">${ico("check", 16)}<span><b>Changes confirmed</b><em>${last.ref}</em>${last.items.map(esc).join(" · ")}</span></div>` : ""}`;
  }

  /* ---------- Render ---------- */
  const TABS = [["overview", "Overview", "gauge"], ["usage", "Usage", "chart"], ["plans", "Plans", "plan"], ["roaming", "Roaming", "plane"], ["bill", "Bill", "bill"], ["support", "Support", "help"]];
  root.innerHTML = `<div class="tc">
    <header class="tc-top">
      <span class="tc-brand">${ico("link", 22)}<b>Connected</b></span>
      <div class="tc-people" role="group" aria-label="Customer">${Object.entries(PROFILES).map(([k, b]) => `<button type="button" data-tc-profile="${k}" aria-pressed="false"><span class="tc-av">${b.initials}</span><span><b>${b.name}</b><small>${esc(b.note)}</small></span></button>`).join("")}</div>
      <button type="button" class="tc-reset" data-tc-reset>${ico("reset", 16)}Reset</button>
    </header>
    <div class="tc-body">
      <nav class="tc-nav" aria-label="Console">${TABS.map(([k, l, i]) => `<button type="button" data-tc-tab="${k}">${ico(i)}<span>${l}</span></button>`).join("")}</nav>
      <div class="tc-main" data-tc-main tabindex="-1"></div>
      <aside class="tc-sum" data-tc-sum aria-label="Bill estimate"></aside>
    </div>
    <p class="tc-sr" aria-live="polite" data-tc-live></p>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const say = (m) => { const el = $("[data-tc-live]"); if (el) el.textContent = m; };
  function render(focus) {
    // Bands and splits glide from their previous value to the new one, so every change is visible.
    const prev = {};
    root.querySelectorAll("[data-tw]").forEach((el) => (prev[el.dataset.tw] = el.getAttribute("style")));
    root.querySelectorAll("[data-tc-profile]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tcProfile === S.active)));
    root.querySelectorAll(".tc-nav [data-tc-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.tcTab === ui.tab));
    const main = $("[data-tc-main]"), key = S.active + ":" + ui.tab;
    main.classList.toggle("enter", main.dataset.view !== key); main.dataset.view = key;
    main.innerHTML = { overview, usage, plans, roaming, bill: billTab, support }[ui.tab]();
    $("[data-tc-sum]").innerHTML = summary();
    const moved = [...root.querySelectorAll("[data-tw]")].filter((el) => prev[el.dataset.tw] != null && prev[el.dataset.tw] !== el.getAttribute("style"));
    moved.forEach((el) => { el._to = el.getAttribute("style"); el.setAttribute("style", prev[el.dataset.tw]); });
    if (moved.length) { void root.offsetWidth; moved.forEach((el) => el.setAttribute("style", el._to)); }
    if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }

  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s); let b;
    if ((b = t("[data-tc-profile]"))) { if (S.active !== b.dataset.tcProfile) { S.active = b.dataset.tcProfile; S.draft = null; ui.dest = null; ui.topic = null; ui.handover = false; ui.msg = ""; save(); say(`Showing ${B().name}.`); } return render(`[data-tc-profile="${S.active}"]`); }
    if ((b = t("[data-tc-tab]"))) { ui.tab = b.dataset.tcTab; ui.msg = ""; return render(b.closest(".tc-nav") ? `.tc-nav [data-tc-tab="${ui.tab}"]` : "[data-tc-main]"); }
    if ((b = t("[data-tc-use]"))) {
      const a = ACTS.find((x) => x.k === b.dataset.tcUse), r = consume(P(), a, P().addons.includes("music"));
      ui.msg = r.ok ? `${a.label}${r.gb === 0 ? ": no data used thanks to your Music pass" : ""}. Meters, chart and bill updated.` : r.why === "cap" ? `That would pass the ${DAY_CAP} GB daily limit in this demo. Move to the next day.` : "This billing month has ended.";
      save(); return render(`[data-tc-use="${a.k}"]`);
    }
    if (t("[data-tc-day]")) { nextDay(P()); ui.msg = `Day ${P().day}. Projection updated.`; save(); return render("[data-tc-day]"); }
    const pendSay = () => say(S.draft ? `Pending change. New estimate ${$$(bill(S.draft, used(P())).total)}.` : "No pending changes.");
    if ((b = t("[data-tc-plan]"))) { edit((d) => (d.plan = b.dataset.tcPlan)); pendSay(); return render(`[data-tc-plan="${b.dataset.tcPlan}"]`); }
    if ((b = t("[data-tc-dest]"))) { ui.dest = b.dataset.tcDest; say(`${DEST[ui.dest].name}, ${ZONES[DEST[ui.dest].zone].label}.`); return render(`[data-tc-dest="${ui.dest}"]`); }
    if ((b = t("[data-tc-days]"))) {
      ui.days = Math.max(1, Math.min(14, ui.days + +b.dataset.tcDays));
      const w = working(); if (w.roaming && ZONES[DEST[w.roaming.dest].zone].pkgs.find((x) => x.k === w.roaming.pkg).perDay) edit((d) => (d.roaming = { ...d.roaming, days: ui.days }));
      say(`${ui.days} day${ui.days > 1 ? "s" : ""}.`);
      return render(`[data-tc-days="${b.dataset.tcDays}"]`);
    }
    if ((b = t("[data-tc-roam]"))) {
      const v = b.dataset.tcRoam;
      if (v === "none") edit((d) => (d.roaming = null)); else { const [dest, pkg] = v.split(":"); edit((d) => (d.roaming = { dest, pkg, days: ui.days })); }
      pendSay(); return render(v === "none" ? "[data-tc-main]" : `[data-tc-roam="${v}"]`);
    }
    if ((b = t("[data-tc-addon-add]"))) { edit((d) => { if (!d.addons.includes(b.dataset.tcAddonAdd)) d.addons.push(b.dataset.tcAddonAdd); }); pendSay(); return render("[data-tc-confirm]"); }
    if (t("[data-tc-confirm]")) {
      const p = P(), before = cfgOf(p), after = S.draft, items = [];
      if (after.plan !== before.plan) items.push(`Plan ${PLAN[before.plan].name} → ${PLAN[after.plan].name}`);
      after.addons.filter((a) => !before.addons.includes(a)).forEach((a) => items.push(`Added ${ADD[a].name}`));
      before.addons.filter((a) => !after.addons.includes(a)).forEach((a) => items.push(`Removed ${ADD[a].name}`));
      if (JSON.stringify(after.roaming) !== JSON.stringify(before.roaming)) items.push(after.roaming ? roamingLine(after.roaming).label : "Roaming removed");
      Object.assign(p, { plan: after.plan, addons: [...after.addons], roaming: after.roaming });
      const ref = "CX-" + (4100 + Object.values(S.p).reduce((n, x) => n + x.orders.length, 0) + 1);
      p.orders.push({ ref, items, day: p.day, total: bill(cfgOf(p), used(p)).total });
      p.log.push({ t: `Changes confirmed · ${ref}`, d: items.join(" · ") });
      S.draft = null; save(); say(`Changes confirmed. Reference ${ref}.`); return render("[data-tc-main]");
    }
    if (t("[data-tc-cancel]")) { S.draft = null; save(); say("Changes discarded."); return render("[data-tc-main]"); }
    if ((b = t("[data-tc-support]"))) { ui.topic = b.dataset.tcSupport; ui.handover = false; return render(`[data-tc-support="${ui.topic}"]`); }
    if (t("[data-tc-handover]")) { ui.handover = true; say("Context shared with the agent."); return render(".tc-hand"); }
    if (t("[data-tc-reset]")) { S = fresh(); Object.assign(ui, { tab: "overview", dest: null, days: 3, topic: null, handover: false, msg: "" }); save(); say("Demo reset."); return render("[data-tc-reset]"); }
  });
  root.addEventListener("change", (e) => {
    const a = e.target.dataset.tcAddon; if (!a) return;
    edit((d) => { d.addons = e.target.checked ? [...new Set([...d.addons, a])] : d.addons.filter((x) => x !== a); });
    say(S.draft ? `Pending change. New estimate ${$$(bill(S.draft, used(P())).total)}.` : "No pending changes.");
    render(`[data-tc-addon="${a}"]`);
  });
  if (mq) (mq.addEventListener ? mq.addEventListener("change", () => render()) : mq.addListener(() => render()));
  render();
})();
