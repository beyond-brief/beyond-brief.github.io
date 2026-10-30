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
    1: { label: "Zone 1 · nearby", payg: 600, pkgs: [{ k: "day", name: "Day pass", d: "Your home allowance, abroad", perDay: 300 }, { k: "w5", name: "7 days · 5 GB", d: "Data and 100 minutes", price: 1200 }] },
    2: { label: "Zone 2 · Europe", payg: 900, pkgs: [{ k: "w3", name: "7 days · 3 GB", d: "Data and 100 minutes", price: 1500 }, { k: "m10", name: "30 days · 10 GB", d: "Data and 300 minutes", price: 3500 }] },
    3: { label: "Zone 3 · worldwide", payg: 1500, pkgs: [{ k: "w2", name: "7 days · 2 GB", d: "Data and 60 minutes", price: 2200 }, { k: "m8", name: "30 days · 8 GB", d: "Data and 200 minutes", price: 5500 }] },
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
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>', reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>', check: '<path d="m4 12.5 5 4.5L20 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', sig: '<path d="M4 20v-3M9 20v-7M14 20V9M19 20V4"/>',
  };
  const ico = (k, s = 18) => `<svg class="tc-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

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
  function ring(label, val, max, proj, color, unit, fair) {
    const R = 46, C = 2 * Math.PI * R, unl = max === INF, cap = unl ? fair || 0 : max;
    const f = cap ? Math.min(val / cap, 1) : 0, over = !unl && val > max ? Math.min((val - max) / max, 1) : 0, pf = cap ? Math.min(proj / cap, 1.25) : 0;
    const ang = (pf * 360 - 90) * Math.PI / 180, tx = 60 + Math.cos(ang) * 46, ty = 60 + Math.sin(ang) * 46;
    const shown = unit === "GB" ? gbf(val).replace(" GB", "") : Math.round(val);
    const left = unl ? "Unlimited" : val > max ? `${unit === "GB" ? gbf(r2(val - max)) : Math.round(val - max) + " " + unit} over` : `${unit === "GB" ? gbf(r2(max - val)) : Math.round(max - val) + " " + unit} left`;
    return `<figure class="tc-ring" style="--c:${color}">
      <svg viewBox="0 0 120 120" role="img" aria-label="${label}: ${shown} ${unit} used${unl ? ", unlimited" : ` of ${max} ${unit}`}">
        <circle cx="60" cy="60" r="${R}" class="tc-ring-bg"/>
        <circle cx="60" cy="60" r="${R}" class="tc-ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - f)}"/>
        ${over ? `<circle cx="60" cy="60" r="${R - 9}" class="tc-ring-over" style="stroke-dasharray:${2 * Math.PI * (R - 9)};stroke-dashoffset:${2 * Math.PI * (R - 9) * (1 - over)}"/>` : ""}
        ${cap && pf > 0 ? `<circle cx="${tx}" cy="${ty}" r="4.5" class="tc-ring-proj"/>` : ""}
      </svg>
      <figcaption><span class="tc-k">${label}</span><b>${shown}<small>${unit === "GB" ? " GB" : " " + unit}</small></b><em>${unl ? (fair ? `of ${fair} GB fair use` : "Unlimited") : `of ${max} ${unit}`}</em><span class="tc-left${!unl && val > max ? " over" : ""}">${left}</span></figcaption>
    </figure>`;
  }
  function chart() {
    const p = P(), cfg = cfgOf(p), al = allowance(cfg), u = used(p), pr = project(p);
    const cum = []; p.daily.reduce((a, v, i) => (cum[i] = r2(a + v)), 0);
    const ymax = Math.max(al.data === INF ? 0 : al.data * 1.15, pr.data * 1.1, 2), W = 600, H = 200, x = (d) => 20 + ((d - 1) / (CYCLE - 1)) * (W - 40), y = (v) => H - 10 - (v / ymax) * (H - 30);
    const actual = cum.map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");
    const proj = `${x(p.day)},${y(u.data)} ${x(CYCLE)},${y(pr.data)}`;
    const dmax = Math.max(...p.daily, 0.5);
    const bars = p.daily.map((v, i) => `<rect x="${x(i + 1) - 6}" y="${264 - (v / dmax) * 46}" width="12" height="${Math.max(1.5, (v / dmax) * 46)}" rx="2" class="${i === p.day - 1 ? "today" : ""}"/>`).join("");
    const aly = al.data !== INF ? y(al.data) : null;
    return `<svg class="tc-chart" viewBox="0 0 ${W} 290" role="img" aria-label="Data used so far ${gbf(u.data)} by day ${p.day}; projected ${gbf(pr.data)} by day ${CYCLE}${aly != null ? `; allowance ${al.data} GB` : ""}.">
      ${[0.25, 0.5, 0.75, 1].map((t) => `<line x1="20" x2="${W - 20}" y1="${y(ymax * t)}" y2="${y(ymax * t)}" class="tc-grid"/><text x="${W - 18}" y="${y(ymax * t) - 4}" class="tc-ax" text-anchor="end">${gbf(r2(ymax * t))}</text>`).join("")}
      ${aly != null ? `<rect x="20" y="10" width="${W - 40}" height="${Math.max(0, aly - 10)}" class="tc-overzone"/><line x1="20" x2="${W - 20}" y1="${aly}" y2="${aly}" class="tc-allow"/><text x="24" y="${aly - 6}" class="tc-ax strong">Allowance ${al.data} GB</text>` : ""}
      <polyline points="${proj}" class="tc-proj"/><polyline points="${actual}" class="tc-line"/>
      <circle cx="${x(p.day)}" cy="${y(u.data)}" r="5.5" class="tc-dot"/>
      <text x="${Math.min(x(p.day) + 10, W - 140)}" y="${y(u.data) + 18}" class="tc-ax strong">${gbf(u.data)} · day ${p.day}</text>
      <text x="${W - 20}" y="${y(pr.data) - 8}" class="tc-ax" text-anchor="end">Projected ${gbf(pr.data)}</text>
      <g class="tc-bars">${bars}</g><text x="20" y="284" class="tc-ax">Day 1</text><text x="${W - 20}" y="284" class="tc-ax" text-anchor="end">Day ${CYCLE}</text>
    </svg>`;
  }

  /* ---------- Tabs ---------- */
  function overview() {
    const p = P(), b = B(), cfg = cfgOf(p), al = allowance(cfg), u = used(p), pr = project(p), pl = PLAN[p.plan], n = notifications();
    return `<div class="tc-head"><div><span class="tc-k">${pl.name} · day ${p.day} of ${CYCLE}</span><h3>Your usage this month</h3></div><button type="button" class="tc-ghost" data-tc-tab="usage">Simulate usage ${ico("arrow", 16)}</button></div>
      <div class="tc-rings">${ring("Data", u.data, al.data, pr.data, "var(--tc-data)", "GB", pl.fair)}${ring("Minutes", u.min, al.min, pr.min, "var(--tc-min)", "min")}${ring("Texts", u.sms, al.sms, pr.sms, "var(--tc-sms)", "texts")}</div>
      <p class="tc-legend"><i class="dot"></i>Projected by day ${CYCLE} at your current pace</p>
      <section class="tc-card"><header><h4>${ico("bell", 16)}Notifications</h4><span class="tc-count">${n.length}</span></header>
        ${n.length ? `<ul class="tc-notes">${n.map(([t, h, d]) => `<li class="n-${t}"><b>${esc(h)}</b><span>${esc(d)}</span></li>`).join("")}</ul>` : `<p class="tc-empty">Nothing needs your attention.</p>`}
        ${recommend(p) ? `<button type="button" class="tc-btn sm" data-tc-tab="plans">Compare plans</button>` : ""}${b.trip && !p.roaming ? `<button type="button" class="tc-btn sm ghost" data-tc-tab="roaming">Add roaming</button>` : ""}</section>`;
  }
  function usage() {
    const p = P(), music = p.addons.includes("music"), today = p.daily[p.day - 1] || 0;
    return `<div class="tc-head"><div><span class="tc-k">Data used so far vs your allowance</span><h3>Usage</h3></div>
        <div class="tc-daybox"><span>Day <b>${p.day}</b> of ${CYCLE}</span><button type="button" class="tc-ghost" data-tc-day ${p.day >= CYCLE ? "disabled" : ""}>Next day</button></div></div>
      <div class="tc-card tc-chart-card">${chart()}<p class="tc-legend"><i class="ln"></i>Used <i class="ln dash"></i>Projected <i class="sq"></i>Daily use <i class="ov"></i>Over allowance</p></div>
      <section class="tc-card"><header><h4>Simulate today</h4><span class="tc-sub">${gbf(today)} used today · limit ${DAY_CAP} GB a day in this demo</span></header>
        <div class="tc-acts">${ACTS.map((a) => { const g = a.gb ? (a.k === "music" && music ? 0 : a.gb) : 0; const blocked = a.gb && today + g > DAY_CAP; return `<button type="button" data-tc-use="${a.k}" ${blocked ? "disabled" : ""}>${ico(a.icon, 18)}<span><b>${a.label}</b><small>${a.gb ? (g ? "+" + gbf(g) : "No data with your Music pass") : a.min ? "+" + a.min + " minutes" : "+" + a.sms + " texts"}</small></span></button>`; }).join("")}</div>
        <p class="tc-msg" aria-live="polite">${esc(ui.msg)}</p></section>`;
  }
  function plans() {
    const p = P(), w = working(), pr = project(p), rec = recommend(p);
    const cur = bill(cfgOf(p), pr).total;
    return `<div class="tc-head"><div><span class="tc-k">Projected for this month at your current pace</span><h3>Plans and add-ons</h3></div></div>
      <div class="tc-plans" role="radiogroup" aria-label="Plans">${PLANS.map((pl) => { const t = bill({ ...w, plan: pl.k }, pr).total, d = t - cur, sel = w.plan === pl.k;
        return `<button type="button" role="radio" aria-checked="${sel}" class="tc-plan${sel ? " sel" : ""}${p.plan === pl.k ? " cur" : ""}" data-tc-plan="${pl.k}">
          <span class="tc-plan-top"><b>${pl.name}</b>${p.plan === pl.k ? '<em>Current</em>' : rec?.k === pl.k ? '<em class="rec">Best fit</em>' : ""}</span>
          <span class="tc-price">${$$(pl.price)}<small>/month</small></span>
          <ul><li>${lim(pl.data, "GB")}${pl.fair ? ` · ${pl.fair} GB fair use` : ""}</li><li>${lim(pl.min, "minutes")}</li><li>${lim(pl.sms, "texts")}</li></ul>
          <span class="tc-proj-bill"><small>Projected bill</small><b>${$$(t)}</b><i class="${d < 0 ? "down" : d > 0 ? "up" : ""}">${d ? sd(d) : "No change"}</i></span></button>`; }).join("")}</div>
      <section class="tc-card"><header><h4>Add-ons</h4><span class="tc-sub">Monthly unless stated</span></header>
        <ul class="tc-addons">${ADDONS.map((a) => `<li><label><input type="checkbox" data-tc-addon="${a.k}" ${w.addons.includes(a.k) ? "checked" : ""}><span><b>${a.name}</b><small>${a.d}</small></span><em>${$$(a.price)}</em></label></li>`).join("")}</ul></section>`;
  }
  function roaming() {
    const p = P(), b = B(), w = working(), dk = ui.dest || w.roaming?.dest || b.trip?.dest || "tr", z = ZONES[DEST[dk].zone];
    return `<div class="tc-head"><div><span class="tc-k">${b.trip ? `Upcoming trip · ${esc(b.trip.label)}` : "No trip planned"}</span><h3>Roaming</h3></div></div>
      <div class="tc-dests" role="group" aria-label="Destination">${DESTS.map((d) => `<button type="button" data-tc-dest="${d.k}" aria-pressed="${d.k === dk}">${d.name}<small>Zone ${d.zone}</small></button>`).join("")}</div>
      <section class="tc-card"><header><h4>${DEST[dk].name} · ${z.label}</h4><span class="tc-sub">Without a package: ${$$(z.payg)} per GB</span></header>
        <div class="tc-pkgs">${z.pkgs.map((pk) => { const sel = w.roaming?.dest === dk && w.roaming.pkg === pk.k; const price = pk.perDay ? pk.perDay * ui.days : pk.price;
          return `<div class="tc-pkg${sel ? " sel" : ""}"><b>${pk.name}</b><small>${pk.d}</small>
            ${pk.perDay ? `<div class="tc-step" role="group" aria-label="Days"><button type="button" data-tc-days="-1" aria-label="Fewer days">−</button><span>${ui.days} day${ui.days > 1 ? "s" : ""} × ${$$(pk.perDay)}</span><button type="button" data-tc-days="1" aria-label="More days">+</button></div>` : ""}
            <span class="tc-price sm">${$$(price)}</span>
            <button type="button" class="tc-btn sm${sel ? " ghost" : ""}" data-tc-roam="${dk}:${pk.k}">${sel ? "Selected" : "Choose"}</button></div>`; }).join("")}</div>
        ${w.roaming ? `<button type="button" class="tc-link" data-tc-roam="none">Remove roaming package</button>` : ""}</section>`;
  }
  function billTab() {
    const p = P(), bl = bill(cfgOf(p), used(p)), cats = { plan: "Plan", addons: "Add-ons", roaming: "Roaming", extra: "Out of bundle" };
    return `<div class="tc-head"><div><span class="tc-k">Estimate so far · bill on 1 Dec</span><h3>Bill</h3></div><b class="tc-big">${$$(bl.total)}</b></div>
      <div class="tc-stack" aria-hidden="true">${Object.keys(cats).map((c) => { const v = sum(bl.lines.filter((l) => l.cat === c).map((l) => l.amt)); return v ? `<i class="c-${c}" style="flex:${v}"></i>` : ""; }).join("")}</div>
      <section class="tc-card"><ul class="tc-lines">${bl.lines.map((l) => `<li class="c-${l.cat}"><span>${esc(l.label)}</span><b>${$$(l.amt)}</b></li>`).join("")}<li class="tot"><span>Total</span><b>${$$(bl.total)}</b></li></ul>
        <p class="tc-fine">Out-of-bundle charges use what you've used so far: ${$$(RATE.gb)} per extra GB, ${$$(RATE.min)} per minute, ${$$(RATE.sms)} per text.</p></section>
      <section class="tc-card"><header><h4>Service summary</h4></header>${p.orders.length ? `<ol class="tc-orders">${p.orders.slice().reverse().map((o) => `<li><b>${o.ref}</b><span>${o.items.map(esc).join(" · ")}</span><small>Day ${o.day} · new estimate ${$$(o.total)}</small></li>`).join("")}</ol>` : `<p class="tc-empty">No changes yet. Confirmed changes appear here with a reference.</p>`}</section>`;
  }
  function support() {
    const p = P(), b = B(), cfg = cfgOf(p), u = used(p), al = allowance(cfg), pr = project(p), bl = bill(cfg, u);
    const T = {
      data: ["My data is running out", () => `<p>${al.data === INF ? `You're on unlimited data: ${gbf(u.data)} of ${PLAN[p.plan].fair} GB fair use so far.` : `You've used <b>${gbf(u.data)}</b> of ${al.data} GB with ${CYCLE - p.day} days left. At this pace you'll reach <b>${gbf(pr.data)}</b>.`}</p>
        <div class="tc-row">${al.data !== INF && !cfg.addons.includes("booster") ? `<button type="button" class="tc-btn sm" data-tc-addon-add="booster">Add a 5 GB booster (${$$(ADD.booster.price)})</button>` : ""}<button type="button" class="tc-btn sm ghost" data-tc-tab="plans">Compare plans</button></div>`],
      bill: ["My bill looks higher than usual", () => { const extra = bl.lines.filter((l) => l.k !== "plan").sort((a, c) => c.amt - a.amt);
        return `<p>Your plan is ${$$(PLAN[p.plan].price)}. ${extra.length ? `On top of that:` : "Nothing has been added on top of it this month."}</p>${extra.length ? `<ul class="tc-lines mini">${extra.map((l) => `<li><span>${esc(l.label)}</span><b>${$$(l.amt)}</b></li>`).join("")}</ul>` : ""}<div class="tc-row"><button type="button" class="tc-btn sm ghost" data-tc-tab="bill">See the full bill</button></div>`; }],
      roam: ["Will my phone work abroad?", () => { const d = b.trip ? DEST[b.trip.dest] : null;
        return `<p>${p.roaming ? `Yes. Your ${esc(roamingLine(p.roaming).label.replace("Roaming · ", ""))} package is active.` : d ? `It will, but without a package data in ${d.name} costs ${$$(ZONES[d.zone].payg)} per GB.` : "It will. Choose your destination to see the packages and pay-as-you-go rates."}</p><div class="tc-row"><button type="button" class="tc-btn sm ghost" data-tc-tab="roaming">Roaming options</button></div>`; }],
    };
    const t = ui.topic && T[ui.topic];
    return `<div class="tc-head"><div><span class="tc-k">Answers from your own account first</span><h3>Support</h3></div></div>
      <div class="tc-topics" role="group" aria-label="What do you need help with?">${Object.entries(T).map(([k, [l]]) => `<button type="button" data-tc-support="${k}" aria-pressed="${ui.topic === k}">${l}</button>`).join("")}</div>
      ${t ? `<section class="tc-card tc-answer"><header><h4>${t[0]}</h4></header>${t[1]()}
        <div class="tc-hand">${ui.handover ? `<p class="tc-k">Shared with the agent</p><ul><li>${esc(B().name)} · ${PLAN[p.plan].name}</li><li>Topic: ${esc(t[0])}</li><li>Data ${gbf(u.data)} of ${lim(al.data, "GB")} · day ${p.day}</li><li>Bill estimate ${$$(bl.total)}</li></ul><p class="tc-fine">Demo only: no agent is contacted. The customer never has to repeat themselves.</p>`
          : `<button type="button" class="tc-link" data-tc-handover>Still stuck? Talk to an agent</button>`}</div></section>` : `<p class="tc-empty">Choose a topic. The answer uses this customer's live usage and bill.</p>`}`;
  }

  /* ---------- Summary column ---------- */
  function summary() {
    const p = P(), cur = bill(cfgOf(p), used(p)), cats = [["plan", "Plan"], ["addons", "Add-ons"], ["roaming", "Roaming"], ["extra", "Out of bundle"]];
    const part = (bl) => cats.map(([c, l]) => [c, l, sum(bl.lines.filter((x) => x.cat === c).map((x) => x.amt))]);
    let pend = "";
    if (S.draft) {
      const nb = bill(S.draft, used(p)), d = diff(cur, nb);
      pend = `<div class="tc-pend" aria-live="polite"><span class="tc-k">Pending changes</span><ul>${d.map((x) => `<li><span>${esc(x.label)}</span><b>${x.from ? $$(x.from) : "—"} → ${x.to ? $$(x.to) : "—"}</b></li>`).join("")}</ul>
        <div class="tc-newtot"><span>New estimate</span><b>${$$(nb.total)}</b><i class="${nb.total < cur.total ? "down" : "up"}">${sd(nb.total - cur.total)}</i></div>
        <div class="tc-row"><button type="button" class="tc-btn" data-tc-confirm>Confirm changes</button><button type="button" class="tc-btn ghost" data-tc-cancel>Discard</button></div><p class="tc-fine">Demo: nothing changes on a real account.</p></div>`;
    }
    const last = p.orders[p.orders.length - 1];
    return `<span class="tc-k">This month · estimate</span><b class="tc-total">${$$(cur.total)}</b>
      <div class="tc-stack" aria-hidden="true">${part(cur).map(([c, , v]) => (v ? `<i class="c-${c}" style="flex:${v}"></i>` : "")).join("")}</div>
      <ul class="tc-parts">${part(cur).map(([c, l, v]) => `<li class="c-${c}"><span>${l}</span><b>${$$(v)}</b></li>`).join("")}</ul>
      ${pend}${!S.draft && last ? `<div class="tc-done">${ico("check", 16)}<span><b>Changes confirmed</b>${last.ref} · ${last.items.map(esc).join(" · ")}</span></div>` : ""}`;
  }

  /* ---------- Render ---------- */
  const TABS = [["overview", "Overview", "gauge"], ["usage", "Usage", "chart"], ["plans", "Plans", "plan"], ["roaming", "Roaming", "plane"], ["bill", "Bill", "bill"], ["support", "Support", "help"]];
  root.innerHTML = `<div class="tc">
    <header class="tc-top">
      <span class="tc-brand">${ico("sig", 20)}<b>Connected</b></span>
      <div class="tc-people" role="group" aria-label="Customer">${Object.entries(PROFILES).map(([k, b]) => `<button type="button" data-tc-profile="${k}" aria-pressed="false"><span class="tc-av">${b.initials}</span><span><b>${b.name}</b><small>${esc(b.note)}</small></span></button>`).join("")}</div>
      <button type="button" class="tc-reset" data-tc-reset>${ico("reset", 16)}Reset</button>
    </header>
    <div class="tc-body">
      <nav class="tc-nav" aria-label="Console">${TABS.map(([k, l, i]) => `<button type="button" data-tc-tab="${k}">${ico(i)}<span>${l}</span></button>`).join("")}</nav>
      <div class="tc-main" data-tc-main tabindex="-1"></div>
      <aside class="tc-sum" data-tc-sum aria-label="Bill estimate"></aside>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  function render(focus) {
    root.querySelectorAll("[data-tc-profile]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tcProfile === S.active)));
    root.querySelectorAll(".tc-nav [data-tc-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.tcTab === ui.tab));
    $("[data-tc-main]").innerHTML = { overview, usage, plans, roaming, bill: billTab, support }[ui.tab]();
    $("[data-tc-sum]").innerHTML = summary();
    if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }

  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s); let b;
    if ((b = t("[data-tc-profile]"))) { if (S.active !== b.dataset.tcProfile) { S.active = b.dataset.tcProfile; S.draft = null; ui.dest = null; ui.topic = null; ui.handover = false; ui.msg = ""; save(); } return render(`[data-tc-profile="${S.active}"]`); }
    if ((b = t("[data-tc-tab]"))) { ui.tab = b.dataset.tcTab; ui.msg = ""; return render(b.closest(".tc-nav") ? `.tc-nav [data-tc-tab="${ui.tab}"]` : "[data-tc-main]"); }
    if ((b = t("[data-tc-use]"))) {
      const a = ACTS.find((x) => x.k === b.dataset.tcUse), r = consume(P(), a, P().addons.includes("music"));
      ui.msg = r.ok ? `${a.label}${r.gb === 0 ? ": no data used thanks to your Music pass" : ""}. Rings, chart and bill updated.` : r.why === "cap" ? `That would pass the ${DAY_CAP} GB daily limit in this demo. Move to the next day.` : "This billing month has ended.";
      save(); return render(`[data-tc-use="${a.k}"]`);
    }
    if (t("[data-tc-day]")) { nextDay(P()); ui.msg = `Day ${P().day}. Projection updated.`; save(); return render("[data-tc-day]"); }
    if ((b = t("[data-tc-plan]"))) { edit((d) => (d.plan = b.dataset.tcPlan)); return render(`[data-tc-plan="${b.dataset.tcPlan}"]`); }
    if ((b = t("[data-tc-dest]"))) { ui.dest = b.dataset.tcDest; return render(`[data-tc-dest="${ui.dest}"]`); }
    if ((b = t("[data-tc-days]"))) {
      ui.days = Math.max(1, Math.min(14, ui.days + +b.dataset.tcDays));
      const w = working(); if (w.roaming && ZONES[DEST[w.roaming.dest].zone].pkgs.find((x) => x.k === w.roaming.pkg).perDay) edit((d) => (d.roaming = { ...d.roaming, days: ui.days }));
      return render(`[data-tc-days="${b.dataset.tcDays}"]`);
    }
    if ((b = t("[data-tc-roam]"))) {
      const v = b.dataset.tcRoam;
      if (v === "none") edit((d) => (d.roaming = null)); else { const [dest, pkg] = v.split(":"); edit((d) => (d.roaming = { dest, pkg, days: ui.days })); }
      return render(v === "none" ? "[data-tc-main]" : `[data-tc-roam="${v}"]`);
    }
    if ((b = t("[data-tc-addon-add]"))) { edit((d) => { if (!d.addons.includes(b.dataset.tcAddonAdd)) d.addons.push(b.dataset.tcAddonAdd); }); return render("[data-tc-confirm]"); }
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
      S.draft = null; save(); return render("[data-tc-main]");
    }
    if (t("[data-tc-cancel]")) { S.draft = null; save(); return render("[data-tc-main]"); }
    if ((b = t("[data-tc-support]"))) { ui.topic = b.dataset.tcSupport; ui.handover = false; return render(`[data-tc-support="${ui.topic}"]`); }
    if (t("[data-tc-handover]")) { ui.handover = true; return render(".tc-hand"); }
    if (t("[data-tc-reset]")) { S = fresh(); Object.assign(ui, { tab: "overview", dest: null, days: 3, topic: null, handover: false, msg: "" }); save(); return render("[data-tc-reset]"); }
  });
  root.addEventListener("change", (e) => {
    const a = e.target.dataset.tcAddon; if (!a) return;
    edit((d) => { d.addons = e.target.checked ? [...new Set([...d.addons, a])] : d.addons.filter((x) => x !== a); });
    render(`[data-tc-addon="${a}"]`);
  });
  render();
})();
