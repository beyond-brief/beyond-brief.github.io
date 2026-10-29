// Loyalty Experience Lab: a tier-based loyalty programme for a fictional member.
// One state model drives the app, the programme-logic panel and the mechanics loop.
// Qualifying points (lifetime) decide the tier and never go down; available points are spent on rewards.
// Everything is illustrative: no payments, vouchers or real accounts. State is kept in this browser only.
(() => {
  const root = document.querySelector("[data-loyalty]");
  if (!root) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "bb-loyalty-lab-v1";
  const nf = (n) => Math.round(n).toLocaleString("en-GB");

  /* ---------- Programme rules ---------- */
  const TIERS = [
    { k: "explore", name: "Explore", min: 0, line: "Find your way in.",
      benefits: [["Welcome rewards", "A starter set of everyday rewards from your first day."], ["Starter challenges", "Two challenges to get you going."], ["Birthday treat", "A small surprise in your birthday month."]] },
    { k: "plus", name: "Plus", min: 300, line: "Earn more, everywhere you go.",
      benefits: [["Partner rewards", "Dining and lifestyle rewards from partner brands."], ["Bonus challenges", "Weekly and streak challenges worth up to 300 points."], ["Plus rewards", "Streaming and dining rewards that need Plus."]] },
    { k: "prime", name: "Prime", min: 750, line: "Rewards chosen for you.",
      benefits: [["Personal picks", "A discovery challenge built from what you've tried."], ["Exclusive experiences", "Fast-track travel and behind-the-scenes events."], ["Priority support", "Your questions answered first."]] },
    { k: "elite", name: "Elite", min: 1400, line: "Curated, recognised, remembered.",
      benefits: [["Curated weekends", "A concierge-planned experience, reserved for you."], ["Lounge access", "Airport lounge visits and private experiences."], ["Elite recognition", "Your name and member year on your card."]] },
  ];
  const tierOf = (lifetime) => [...TIERS].reverse().find((t) => lifetime >= t.min);
  const tierIndex = (k) => TIERS.findIndex((t) => t.k === k);
  const nextTier = (t) => TIERS[tierIndex(t.k) + 1] || null;

  const MISSIONS = [
    { id: "m1", n: "01", tier: "explore", title: "Three for the week", pts: 150, icon: "card", cond: "Make three eligible payments.", goal: 3 },
    { id: "m2", n: "02", tier: "explore", title: "Try something new", pts: 100, icon: "compass", cond: "Make a first purchase in a category you haven't used.", goal: 1 },
    { id: "m3", n: "03", tier: "plus", title: "Weekly check-in", pts: 250, icon: "check", cond: "Complete this week's three quick actions.", goal: 3 },
    { id: "m4", n: "04", tier: "plus", title: "Keep the streak", pts: 300, icon: "flame", cond: "Stay active for four weeks in a row.", goal: 4 },
    { id: "m5", n: "05", tier: "prime", title: "Your discovery pick", pts: 200, icon: "spark", cond: "Try one of three picks chosen from your activity.", goal: 1 },
    { id: "m6", n: "06", tier: "prime", title: "Travel season", pts: 300, icon: "plane", cond: "Book a partner trip for the season.", goal: 1 },
    { id: "m7", n: "07", tier: "elite", title: "A curated weekend", pts: 0, icon: "star", cond: "Choose the experience your concierge plans for you.", goal: 1, perk: "Reserved experience" },
  ];
  const MERCHANTS = [["Riverside Café", "Coffee", 4.2], ["Northline Books", "Books", 18.5], ["Green Basket", "Groceries", 32.8]];
  const CATEGORIES = [["wellness", "Wellness", "Yoga studio day pass"], ["travel", "Travel", "Weekend train ticket"], ["dining", "Dining", "Neighbourhood bistro"], ["arts", "Arts", "Gallery entry"]];
  const PICKS = {
    wellness: [["Spa morning", "Partner spa · 2 hours"], ["Climbing intro", "Indoor wall · beginners"], ["Sound bath", "Evening session"]],
    travel: [["Coastal weekend", "Two nights by the sea"], ["City food walk", "Guided · 3 hours"], ["Night train", "Sleeper cabin"]],
    dining: [["Chef's counter", "Six-course tasting"], ["Natural wine night", "Small plates"], ["Market breakfast", "Saturday table"]],
    arts: [["Opening night", "Gallery preview"], ["Print workshop", "Two-hour class"], ["Jazz cellar", "Late show"]],
  };
  const TRIPS = [["Lisbon", "3 nights"], ["Tbilisi", "4 nights"], ["Copenhagen", "3 nights"]];
  const CURATED = [["Mountain lodge weekend", "Two nights, guided walks and a private dinner"], ["Coastal sailing day", "Skippered boat for four, lunch on board"], ["Behind the opera", "Dress rehearsal, backstage tour and supper"]];
  const FOCUS = ["Save a little more", "Spend smarter", "Explore something new"];

  const REWARDS = [
    { id: "r1", cat: "Dining", name: "Coffee for two", cost: 80, tier: "explore", desc: "Two hot drinks at a partner café.", art: "dining" },
    { id: "r2", cat: "Shopping", name: "10% off at Northline Books", cost: 120, tier: "explore", desc: "One purchase, any book in store.", art: "shopping" },
    { id: "r3", cat: "Lifestyle", name: "A month of a streaming add-on", cost: 200, tier: "plus", desc: "One month of a partner music add-on.", art: "lifestyle" },
    { id: "r4", cat: "Dining", name: "Chef's tasting, 20% off", cost: 300, tier: "plus", desc: "A tasting menu for two at a partner restaurant.", art: "dining" },
    { id: "r5", cat: "Travel", name: "Airport fast-track", cost: 350, tier: "prime", desc: "Skip the security queue on one departure.", art: "travel" },
    { id: "r6", cat: "Experiences", name: "Behind-the-scenes gallery tour", cost: 400, tier: "prime", desc: "An after-hours tour with a curator.", art: "experiences" },
    { id: "r7", cat: "Travel", name: "Airport lounge visit", cost: 500, tier: "elite", desc: "One visit for you and a guest.", art: "travel" },
    { id: "r8", cat: "Experiences", name: "Private cooking class for two", cost: 650, tier: "elite", desc: "Three hours with a partner chef.", art: "experiences" },
  ];
  const CATS = ["All", "Travel", "Lifestyle", "Dining", "Shopping", "Experiences"];

  /* ---------- State ---------- */
  const fresh = () => ({
    v: 1, lifetime: 120, balance: 120, week: 1,
    m: { m1: { pays: [] }, m2: {}, m3: { tasks: {} }, m4: { weeks: 0 }, m5: {}, m6: {}, m7: {} },
    done: {}, redeemed: {},
    log: [{ id: 2, kind: "earn", label: "Everyday card payments", pts: 20, bal: 120, life: 120, when: "Week 1" }, { id: 1, kind: "earn", label: "Welcome bonus", pts: 100, bal: 100, life: 100, when: "Week 1" }],
    seen: ["explore"],
  });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || typeof S.lifetime !== "number") S = fresh();
  const ui = { tab: "home", tierView: tierOf(S.lifetime).k, cat: "All", open: null, sheet: null, celebrate: null, flash: null, last: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const tier = () => tierOf(S.lifetime);
  const unlocked = (k) => tierIndex(tier().k) >= tierIndex(k);
  const ready = (m) => {
    const st = S.m[m.id];
    return m.id === "m1" ? st.pays.length >= 3 : m.id === "m2" ? !!st.done : m.id === "m3" ? Object.keys(st.tasks).length >= 3 : m.id === "m4" ? st.weeks >= 4 : !!st.done;
  };
  const progress = (m) => { const st = S.m[m.id]; return m.id === "m1" ? st.pays.length : m.id === "m3" ? Object.keys(st.tasks).length : m.id === "m4" ? st.weeks : ready(m) ? 1 : 0; };
  const nextMission = () => MISSIONS.find((m) => unlocked(m.tier) && !S.done[m.id]);
  const logId = () => (S.log[0]?.id || 0) + 1;

  function earn(m) {
    if (S.done[m.id] || !ready(m) || !unlocked(m.tier)) return; // each challenge pays once
    const before = tier();
    S.done[m.id] = true;
    S.lifetime += m.pts; S.balance += m.pts;
    S.log.unshift({ id: logId(), kind: m.pts ? "earn" : "perk", label: m.title, pts: m.pts, bal: S.balance, life: S.lifetime, when: `Week ${S.week}`, note: m.perk || "" });
    const after = tier();
    ui.last = { step: "reward", text: m.pts ? `+${m.pts} points for ${m.title}` : `${m.perk} unlocked` };
    if (after.k !== before.k) {
      S.log.unshift({ id: logId(), kind: "tier", label: `Welcome to ${after.name}`, pts: 0, bal: S.balance, life: S.lifetime, when: `Week ${S.week}` });
      ui.celebrate = { from: before.k, to: after.k };
      ui.tierView = after.k;
    }
    ui.flash = "points";
    save();
  }
  function redeem(r) {
    if (S.redeemed[r.id] || !unlocked(r.tier) || S.balance < r.cost) return; // never negative, once per reward
    S.balance -= r.cost;
    const code = "DEMO-" + r.id.toUpperCase() + "-" + String(S.lifetime).slice(-3);
    S.redeemed[r.id] = { code, week: S.week };
    S.log.unshift({ id: logId(), kind: "redeem", label: r.name, pts: -r.cost, bal: S.balance, life: S.lifetime, when: `Week ${S.week}` });
    ui.last = { step: "reward", text: `${r.name} redeemed for ${r.cost} points` };
    ui.flash = "points";
    save();
  }

  /* ---------- Visual pieces ---------- */
  const ICON = {
    card: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    check: '<path d="M4 12.5 9 17l11-11"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.4-3.9 2.5-5 .3 1.6 1 2.5 2 3 0-3 .5-5.5.5-8z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    plane: '<path d="M3 13.5 21 6l-4.5 13-4-5.5-6 3 1.5-4.5z"/>',
    star: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    tiers: '<path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-2-4-6-4-6-1.5S9 9 12 9c3 0 6-.5 6-3S14 5 12 9z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const ico = (k, s = 20) => `<svg class="ly-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const EMBLEM = {
    explore: '<circle cx="40" cy="40" r="26" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="40" cy="40" r="16" fill="none" stroke="currentColor" stroke-opacity=".35"/><path d="M48 32 43.5 43.5 32 48l4.5-11.5z" fill="currentColor"/>',
    plus: '<circle cx="40" cy="40" r="27" fill="none" stroke="currentColor" stroke-opacity=".35"/><circle cx="40" cy="40" r="19" fill="none" stroke="currentColor" stroke-opacity=".6"/><path d="M40 28v24M28 40h24" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    prime: '<path d="M40 12 62 32 40 68 18 32z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 32h44M30 32l10 36 10-36M30 32l10-20 10 20" fill="none" stroke="currentColor" stroke-opacity=".55"/>',
    elite: '<circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="40" cy="40" r="23" fill="none" stroke="currentColor" stroke-opacity=".45"/><path d="m40 22 4.6 10.2 11.1 1.2-8.3 7.5 2.3 11L40 46.3 30.3 52l2.3-11-8.3-7.5 11.1-1.2z" fill="currentColor"/>',
  };
  const card = (t, opts = {}) => `<div class="ly-card t-${t.k}${opts.cls ? " " + opts.cls : ""}" ${opts.attrs || ""}>
      <span class="ly-card-tex" aria-hidden="true"></span>
      <div class="ly-card-top"><span class="ly-card-brand">Beyond Rewards</span><svg class="ly-card-em" viewBox="0 0 80 80" aria-hidden="true">${EMBLEM[t.k]}</svg></div>
      <b class="ly-card-tier">${t.name}</b>
      <div class="ly-card-foot"><span>${t.k === "elite" ? "Alex Morgan · Elite since 2026" : "Alex Morgan"}</span><span>${t.min ? nf(t.min) + "+ pts" : "Member"}</span></div>
    </div>`;
  const ART = {
    travel: '<path d="M10 60 90 26 74 74 58 54 32 66 38 48z" fill="currentColor" opacity=".9"/><circle cx="78" cy="18" r="8" fill="#fff" opacity=".6"/>',
    dining: '<circle cx="50" cy="48" r="26" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="48" r="16" fill="currentColor" opacity=".35"/><path d="M14 22v40M86 22v40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    shopping: '<path d="M24 34h52l-5 40H29z" fill="currentColor" opacity=".85"/><path d="M38 34v-6a12 12 0 0 1 24 0v6" fill="none" stroke="currentColor" stroke-width="4"/>',
    lifestyle: '<circle cx="34" cy="62" r="12" fill="currentColor"/><path d="M46 62V22l30-8v40" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="64" cy="54" r="12" fill="currentColor" opacity=".7"/>',
    experiences: '<path d="M50 12 60 38l28 2-22 17 8 27-24-16-24 16 8-27-22-17 28-2z" fill="currentColor" opacity=".85"/>',
  };

  /* ---------- App screens ---------- */
  function home() {
    const t = tier(), nx = nextTier(t), nm = nextMission();
    const pct = nx ? ((S.lifetime - t.min) / (nx.min - t.min)) * 100 : 100;
    const red = Object.keys(S.redeemed).length;
    return `<header class="ly-hello"><span>Good evening,</span><b>Alex</b><span class="ly-av" aria-hidden="true">AM</span></header>
      ${card(t, { cls: "hero" })}
      <div class="ly-balances"><div><small>Available points</small><b data-count="balance">${nf(S.balance)}</b><span>To spend on rewards</span></div><div><small>Qualifying points</small><b data-count="lifetime">${nf(S.lifetime)}</b><span>Decide your tier</span></div></div>
      <section class="ly-mile">
        ${nx ? `<div class="ly-mile-top"><b>${nf(nx.min - S.lifetime)} points to ${nx.name}</b><span>${nf(S.lifetime)} / ${nf(nx.min)}</span></div>
        <div class="ly-bar t-${nx.k}" role="progressbar" aria-label="Progress to ${nx.name}" aria-valuemin="${t.min}" aria-valuemax="${nx.min}" aria-valuenow="${S.lifetime}"><i style="width:${pct}%"></i></div>
        <p>Unlocks: ${nx.benefits.slice(0, 2).map((b) => b[0]).join(" · ")}</p>`
        : `<div class="ly-mile-top"><b>Top tier reached</b><span>${nf(S.lifetime)} pts</span></div><div class="ly-bar t-elite"><i style="width:100%"></i></div><p>Every Elite benefit is unlocked.</p>`}
      </section>
      ${nm ? `<button type="button" class="ly-next" data-ly-go="missions" data-ly-open="${nm.id}"><span class="ly-next-i">${ico(nm.icon)}</span><span><small>Next step</small><b>${nm.title}</b><em>${nm.cond}</em></span><span class="ly-pts">${nm.pts ? "+" + nm.pts : "Perk"}</span></button>`
        : `<div class="ly-next done"><span class="ly-next-i">${ico("check")}</span><span><small>All challenges complete</small><b>Spend your points</b><em>${nf(S.balance)} points available for rewards.</em></span></div>`}
      <div class="ly-quick"><button type="button" data-ly-go="tiers"><b>${tier().benefits.length * (tierIndex(t.k) + 1)}</b><span>benefits active</span></button><button type="button" data-ly-go="rewards"><b>${REWARDS.filter((r) => unlocked(r.tier) && !S.redeemed[r.id] && S.balance >= r.cost).length}</b><span>rewards you can redeem</span></button><button type="button" data-ly-go="activity"><b>${red}</b><span>redeemed</span></button></div>`;
  }

  function tiers() {
    const cur = tier(), v = TIERS.find((t) => t.k === ui.tierView) || cur, vi = tierIndex(v.k), ci = tierIndex(cur.k);
    const status = vi < ci ? "Earned" : vi === ci ? "Your tier" : `${nf(v.min - S.lifetime)} points to go`;
    return `<h3 class="ly-title">Membership tiers</h3>
      <div class="ly-tier-tabs" role="tablist" aria-label="Tiers">${TIERS.map((t, i) => `<button type="button" role="tab" aria-selected="${t.k === v.k}" tabindex="${t.k === v.k ? 0 : -1}" id="ly-tt-${t.k}" data-ly-tier="${t.k}" class="t-${t.k}${i <= ci ? " got" : ""}"><span>${t.name}</span><small>${nf(t.min)}+</small></button>`).join("")}</div>
      <div role="tabpanel" aria-labelledby="ly-tt-${v.k}" class="ly-tier-view">
        ${card(v, { cls: vi > ci ? "locked" : "" })}
        <p class="ly-tier-line">${v.line} <span class="ly-tag ${vi < ci ? "ok" : vi === ci ? "cur" : "lock"}">${status}</span></p>
        <p class="ly-k">Benefits</p>
        <ul class="ly-benefits">${v.benefits.map(([b, d]) => `<li class="${vi > ci ? "lock" : ""}"><span class="ly-b-i">${ico(vi > ci ? "lock" : "check", 16)}</span><span><b>${b}</b><small>${d}</small></span></li>`).join("")}</ul>
        <p class="ly-k">Challenges at ${v.name}</p>
        <ul class="ly-mini">${MISSIONS.filter((m) => m.tier === v.k).map((m) => `<li>${ico(m.icon, 16)}<span>${m.title}</span><b>${S.done[m.id] ? "Done" : m.pts ? "+" + m.pts : "Perk"}</b></li>`).join("")}</ul>
        <p class="ly-k">Rewards at ${v.name}</p>
        <ul class="ly-mini">${REWARDS.filter((r) => r.tier === v.k).map((r) => `<li>${ico("gift", 16)}<span>${r.name}</span><b>${nf(r.cost)}</b></li>`).join("")}</ul>
      </div>`;
  }

  function missionBody(m) {
    const st = S.m[m.id], done = S.done[m.id];
    if (done) return `<p class="ly-done">${ico("check", 16)}${m.pts ? `Completed · ${m.pts} points added` : `${m.perk} · ${esc(CURATED.find((c) => c[0] === st.pick)?.[0] || "")}`}</p>`;
    if (!unlocked(m.tier)) return `<p class="ly-lockline">${ico("lock", 16)}Unlocks at ${TIERS.find((t) => t.k === m.tier).name}</p>`;
    let ctl = "";
    if (m.id === "m1") ctl = `<ul class="ly-pays">${st.pays.map((p) => `<li>${ico("card", 16)}<span>${esc(p[0])}</span><b>$${p[2].toFixed(2)}</b></li>`).join("")}</ul>${st.pays.length < 3 ? `<button type="button" class="ly-btn ghost" data-ly-do="pay">Make a demo payment at ${esc(MERCHANTS[st.pays.length][0])}</button>` : ""}`;
    if (m.id === "m2") ctl = st.done ? `<p class="ly-note">First purchase made in ${esc(CATEGORIES.find((c) => c[0] === st.cat)[1])}.</p>` : `<p class="ly-note">You've used Groceries, Coffee and Transport. Pick something new:</p><div class="ly-chips">${CATEGORIES.map(([k, l, d]) => `<button type="button" data-ly-do="cat" data-v="${k}" aria-pressed="${st.cat === k}"><b>${l}</b><small>${d}</small></button>`).join("")}</div>${st.cat ? `<button type="button" class="ly-btn ghost" data-ly-do="trycat">Make a first ${esc(CATEGORIES.find((c) => c[0] === st.cat)[1].toLowerCase())} purchase</button>` : ""}`;
    if (m.id === "m3") {
      const tk = st.tasks;
      ctl = `<ol class="ly-tasks">
        <li class="${tk.summary ? "ok" : ""}"><span>${tk.summary ? ico("check", 14) : "1"}</span><div><b>Review your weekly summary</b>${tk.summary ? `<small>${S.log.filter((l) => l.kind === "earn").length} earning moments · ${nf(S.balance)} points available</small>` : `<button type="button" class="ly-link" data-ly-do="task" data-v="summary">Open summary</button>`}</div></li>
        <li class="${tk.focus ? "ok" : ""}"><span>${tk.focus ? ico("check", 14) : "2"}</span><div><b>Choose this week's focus</b>${tk.focus ? `<small>${esc(tk.focus)}</small>` : `<div class="ly-chips sm">${FOCUS.map((f) => `<button type="button" data-ly-do="task" data-v="focus" data-x="${esc(f)}">${esc(f)}</button>`).join("")}</div>`}</div></li>
        <li class="${tk.rate ? "ok" : ""}"><span>${tk.rate ? ico("check", 14) : "3"}</span><div><b>Rate your week</b>${tk.rate ? `<small>${"★".repeat(tk.rate)}${"☆".repeat(5 - tk.rate)}</small>` : `<div class="ly-stars" role="group" aria-label="Rate your week">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-ly-do="task" data-v="rate" data-x="${n}" aria-label="${n} of 5">★</button>`).join("")}</div>`}</div></li></ol>`;
    }
    if (m.id === "m4") ctl = `<div class="ly-weeks">${[1, 2, 3, 4].map((w) => `<span class="${w <= st.weeks ? "on" : ""}"><i>${w <= st.weeks ? ico("check", 14) : w}</i>Week ${w}</span>`).join("")}</div>${st.weeks < 4 ? `<button type="button" class="ly-btn ghost" data-ly-do="week">Stay active in week ${st.weeks + 1}</button><p class="ly-fine">Simulated: each step moves the demo one week forward.</p>` : ""}`;
    if (m.id === "m5") { const c = S.m.m2.cat || "dining", base = CATEGORIES.find((x) => x[0] === c)[1]; ctl = `<p class="ly-note">Because you tried ${esc(base)}:</p><div class="ly-picks">${PICKS[c].map(([t, d]) => `<button type="button" data-ly-do="pick" data-v="${esc(t)}" aria-pressed="${st.pick === t}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join("")}</div>${st.pick && !st.done ? `<button type="button" class="ly-btn ghost" data-ly-do="trypick">Try ${esc(st.pick)}</button>` : ""}`; }
    if (m.id === "m6") ctl = `<div class="ly-picks">${TRIPS.map(([c, n]) => `<button type="button" data-ly-do="trip" data-v="${c}" aria-pressed="${st.trip === c}"><b>${c}</b><small>${n} · partner hotel</small></button>`).join("")}</div>${st.trip && !st.done ? `<button type="button" class="ly-btn ghost" data-ly-do="book">Book ${esc(st.trip)} (demo)</button>` : ""}`;
    if (m.id === "m7") ctl = `<div class="ly-picks">${CURATED.map(([t, d]) => `<button type="button" data-ly-do="curate" data-v="${esc(t)}" aria-pressed="${st.pick === t}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join("")}</div>${st.pick && !st.done ? `<button type="button" class="ly-btn ghost" data-ly-do="reserve">Reserve with your concierge (demo)</button>` : ""}`;
    const can = ready(m);
    return `${ctl}<button type="button" class="ly-btn claim" data-ly-claim="${m.id}" ${can ? "" : "disabled"}>${can ? (m.pts ? `Collect ${m.pts} points` : `Confirm ${m.perk.toLowerCase()}`) : m.pts ? `Collect ${m.pts} points` : "Choose an experience"}</button>`;
  }
  function missions() {
    const avail = MISSIONS.filter((m) => unlocked(m.tier) && !S.done[m.id]).length, done = MISSIONS.filter((m) => S.done[m.id]).length, locked = MISSIONS.filter((m) => !unlocked(m.tier)).length;
    return `<h3 class="ly-title">Challenges <span>${avail} open · ${done} done · ${locked} locked</span></h3>
      <ul class="ly-missions">${MISSIONS.map((m) => {
        const lock = !unlocked(m.tier), done2 = S.done[m.id], open = ui.open === m.id, p = progress(m);
        return `<li class="ly-m${lock ? " lock" : ""}${done2 ? " done" : ""}${open ? " open" : ""}" id="ly-m-${m.id}">
          <button type="button" class="ly-m-head" data-ly-toggle="${m.id}" aria-expanded="${open}" aria-controls="ly-mb-${m.id}">
            <span class="ly-m-i">${ico(lock ? "lock" : done2 ? "check" : m.icon)}</span>
            <span class="ly-m-t"><small>Mission ${m.n}${lock ? ` · ${TIERS.find((t) => t.k === m.tier).name}` : ""}</small><b>${m.title}</b><em>${m.cond}</em></span>
            <span class="ly-pts">${m.pts ? "+" + m.pts : "Perk"}</span>
          </button>
          ${!lock && !done2 && m.goal > 1 ? `<div class="ly-m-bar" aria-hidden="true"><i style="width:${(p / m.goal) * 100}%"></i></div>` : ""}
          <div class="ly-m-body" id="ly-mb-${m.id}" ${open ? "" : "hidden"}>${open ? missionBody(m) : ""}</div></li>`;
      }).join("")}</ul>`;
  }

  function rewards() {
    const list = REWARDS.filter((r) => ui.cat === "All" || r.cat === ui.cat);
    const state = (r) => S.redeemed[r.id] ? ["red", "Redeemed"] : !unlocked(r.tier) ? ["lock", `${TIERS.find((t) => t.k === r.tier).name} reward`] : S.balance < r.cost ? ["short", `${nf(r.cost - S.balance)} more points`] : ["ok", "Redeemable"];
    return `<h3 class="ly-title">Rewards <span>${nf(S.balance)} points available</span></h3>
      <div class="ly-cats" role="group" aria-label="Reward category">${CATS.map((c) => `<button type="button" data-ly-cat="${c}" aria-pressed="${ui.cat === c}">${c}</button>`).join("")}</div>
      <ul class="ly-rewards">${list.map((r) => { const [k, l] = state(r); return `<li><button type="button" class="ly-r s-${k}" data-ly-reward="${r.id}"><span class="ly-r-art a-${r.art}"><svg viewBox="0 0 100 90" aria-hidden="true">${ART[r.art]}</svg>${k === "lock" ? `<span class="ly-r-lock">${ico("lock", 14)}</span>` : ""}</span><span class="ly-r-t"><small>${r.cat}</small><b>${r.name}</b><em>${l}</em></span><span class="ly-r-c">${nf(r.cost)}<small>pts</small></span></button></li>`; }).join("")}</ul>`;
  }
  function sheet() {
    const r = REWARDS.find((x) => x.id === ui.sheet); if (!r) return "";
    const red = S.redeemed[r.id], lock = !unlocked(r.tier), short = S.balance < r.cost;
    return `<div class="ly-sheet-bg" data-ly-close></div><div class="ly-sheet" role="dialog" aria-modal="true" aria-labelledby="ly-sheet-t">
      <button type="button" class="ly-x" data-ly-close aria-label="Close">${ico("x", 18)}</button>
      <span class="ly-r-art big a-${r.art}"><svg viewBox="0 0 100 90" aria-hidden="true">${ART[r.art]}</svg></span>
      <small class="ly-k">${r.cat} · ${TIERS.find((t) => t.k === r.tier).name} and above</small>
      <h4 id="ly-sheet-t">${r.name}</h4><p>${r.desc}</p>
      ${red ? `<div class="ly-confirm" role="status"><b>Redeemed</b><span>Demo confirmation ${esc(red.code)}. Not a real voucher.</span></div>`
        : `<dl class="ly-calc"><div><dt>Cost</dt><dd>${nf(r.cost)} pts</dd></div><div><dt>Available now</dt><dd>${nf(S.balance)} pts</dd></div><div><dt>After redeeming</dt><dd>${lock || short ? "—" : nf(S.balance - r.cost) + " pts"}</dd></div></dl>
        <p class="ly-fine">Redeeming spends available points only. Your tier stays at ${tier().name}.</p>
        <button type="button" class="ly-btn claim" data-ly-redeem="${r.id}" ${lock || short ? "disabled" : ""}>${lock ? `Unlocks at ${TIERS.find((t) => t.k === r.tier).name}` : short ? `${nf(r.cost - S.balance)} more points needed` : `Redeem for ${nf(r.cost)} points`}</button>`}
    </div>`;
  }
  function activity() {
    const earned = S.log.filter((l) => l.kind === "earn").reduce((a, l) => a + l.pts, 0), spent = -S.log.filter((l) => l.kind === "redeem").reduce((a, l) => a + l.pts, 0);
    return `<h3 class="ly-title">Activity</h3>
      <div class="ly-sum"><div><small>Earned</small><b>${nf(earned)}</b></div><div><small>Redeemed</small><b>${nf(spent)}</b></div><div><small>Challenges</small><b>${Object.keys(S.done).length}/${MISSIONS.length}</b></div></div>
      <ol class="ly-log">${S.log.map((l) => `<li class="k-${l.kind}"><span class="ly-log-i">${ico(l.kind === "redeem" ? "gift" : l.kind === "tier" ? "tiers" : l.kind === "perk" ? "star" : "spark", 16)}</span><span><b>${esc(l.label)}</b><small>${l.when} · ${nf(l.bal)} available · ${nf(l.life)} qualifying</small></span><em>${l.kind === "tier" ? "Tier" : l.kind === "perk" ? "Perk" : (l.pts > 0 ? "+" : "−") + nf(Math.abs(l.pts))}</em></li>`).join("")}</ol>`;
  }

  /* ---------- Celebration ---------- */
  function celebration() {
    const c = ui.celebrate; if (!c) return "";
    const from = TIERS.find((t) => t.k === c.from), to = TIERS.find((t) => t.k === c.to);
    const newM = MISSIONS.filter((m) => m.tier === to.k);
    return `<div class="ly-celebrate" role="dialog" aria-modal="true" aria-labelledby="ly-cel-t">
      <div class="ly-flip"><div class="ly-flip-in">${card(from, { cls: "face front" })}${card(to, { cls: "face back" })}</div></div>
      <small class="ly-k">${nf(S.lifetime)} qualifying points</small>
      <h4 id="ly-cel-t">Welcome to ${to.name}</h4>
      <p>${to.line}</p>
      <ul>${to.benefits.map((b) => `<li>${ico("check", 14)}${b[0]}</li>`).join("")}</ul>
      <div class="ly-cel-act">${newM.length ? `<button type="button" class="ly-btn claim" data-ly-celgo="${newM[0].id}">See ${esc(newM[0].title)}</button>` : ""}<button type="button" class="ly-btn ghost" data-ly-celclose>Continue</button></div>
    </div>`;
  }

  /* ---------- Programme panel & mechanics loop ---------- */
  function panel() {
    const t = tier(), top = 1700, pos = (v) => Math.min(100, (v / top) * 100);
    return `<div class="ly-pn-nums"><div><small>Qualifying points</small><b data-count="lifetime">${nf(S.lifetime)}</b><span>Never go down. Decide the tier.</span></div><div><small>Available points</small><b data-count="balance">${nf(S.balance)}</b><span>Spent on rewards.</span></div></div>
      <div class="ly-ladder" aria-label="Tier ladder">
        <div class="ly-rail" aria-hidden="true"><i style="height:${pos(S.lifetime)}%"></i><b style="bottom:${pos(S.lifetime)}%">${nf(S.lifetime)}</b></div>
        <ol>${[...TIERS].reverse().map((x) => { const i = tierIndex(x.k), ci = tierIndex(t.k); return `<li class="t-${x.k}${i < ci ? " got" : i === ci ? " cur" : ""}" style="bottom:${pos(x.min)}%"><span class="ly-sw" aria-hidden="true"></span><b>${x.name}</b><small>${nf(x.min)}+ · ${i < ci ? "earned" : i === ci ? "current" : nf(x.min - S.lifetime) + " to go"}</small></li>`; }).join("")}</ol>
      </div>
      <ul class="ly-rules"><li>Each challenge pays once.</li><li>Redeeming never lowers your tier.</li><li>Balances can't go below zero.</li></ul>`;
  }
  function loop() {
    const t = tier(), nx = nextTier(t), nm = nextMission();
    const lastEarn = S.log.find((l) => l.kind === "earn" || l.kind === "perk"), lastTier = S.log.find((l) => l.kind === "tier"), lastRed = S.log.find((l) => l.kind === "redeem");
    const steps = [
      ["behaviour", "Behaviour", lastEarn ? `${lastEarn.label}` : "Everyday payments"],
      ["progress", "Progress", nx ? `${nf(S.lifetime)} of ${nf(nx.min)} to ${nx.name}` : `${nf(S.lifetime)} qualifying · top tier`],
      ["recognition", "Recognition", lastTier ? lastTier.label.replace("Welcome to ", "") + " tier unlocked" : `${t.name} member`],
      ["reward", "Reward", lastRed ? `${lastRed.label} redeemed` : `${REWARDS.filter((r) => unlocked(r.tier) && !S.redeemed[r.id] && S.balance >= r.cost).length} rewards within reach`],
      ["return", "Return", nm ? `Next: ${nm.title}` : "Spend points, keep the streak"],
    ];
    return steps.map(([k, l, v], i) => `<li class="ly-loop-s${ui.last?.step === k ? " hot" : ""}"><span class="n">0${i + 1}</span><b>${l}</b><span class="v">${esc(v)}</span></li>`).join("");
  }

  /* ---------- Render ---------- */
  root.innerHTML = `<div class="ly-wrap">
    <div class="ly-device"><div class="ly-app" data-tier="${tier().k}">
      <div class="ly-status" aria-hidden="true"><span>9:41</span><span class="ly-demo-chip">Demo</span></div>
      <div class="ly-screen" data-ly-screen tabindex="-1"></div>
      <nav class="ly-tabs" aria-label="Loyalty app">${[["home", "Home", "home"], ["tiers", "Tiers", "tiers"], ["missions", "Challenges", "spark"], ["rewards", "Rewards", "gift"], ["activity", "Activity", "list"]].map(([k, l, i]) => `<button type="button" data-ly-tab="${k}">${ico(i)}<span>${l}</span></button>`).join("")}</nav>
      <div data-ly-layer></div>
    </div></div>
    <aside class="ly-panel"><header><span class="ly-k">Programme logic, live</span><button type="button" class="ly-reset" data-ly-reset>${ico("reset", 16)}Reset demo</button></header><div data-ly-panel></div></aside>
  </div>
  <p class="sr-only" aria-live="polite" data-ly-live></p>`;
  const $ = (s) => root.querySelector(s);
  const app = $(".ly-app"), screen = $("[data-ly-screen]"), loopEl = document.querySelector("[data-ly-loop]");
  const prev = { balance: S.balance, lifetime: S.lifetime };

  function countUp() {
    root.querySelectorAll("[data-count]").forEach((el) => {
      const k = el.dataset.count, to = S[k], from = prev[k];
      if (reduce || from === to) { el.textContent = nf(to); return; }
      el.classList.add(to > from ? "up" : "down");
      const t0 = performance.now(), d = 700;
      const step = (now) => { const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = nf(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); else el.classList.remove("up", "down"); };
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = nf(to); el.classList.remove("up", "down"); }, d + 80); // land exactly even if frames are throttled
    });
    prev.balance = S.balance; prev.lifetime = S.lifetime;
  }
  function render(focusSel) {
    const t = tier();
    app.dataset.tier = t.k;
    root.querySelectorAll("[data-ly-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.lyTab === ui.tab));
    screen.innerHTML = { home, tiers, missions, rewards, activity }[ui.tab]();
    $("[data-ly-layer]").innerHTML = (ui.sheet ? sheet() : "") + celebration();
    $("[data-ly-panel]").innerHTML = panel();
    if (loopEl) loopEl.innerHTML = loop();
    countUp();
    if (ui.celebrate) $(".ly-celebrate .ly-btn")?.focus({ preventScroll: true });
    else if (ui.sheet) $(".ly-sheet .ly-btn, .ly-sheet .ly-x")?.focus({ preventScroll: true });
    else if (focusSel) root.querySelector(focusSel)?.focus({ preventScroll: true });
    ui.flash = null;
  }
  const say = (t) => { $("[data-ly-live]").textContent = t; };

  /* ---------- Events ---------- */
  root.addEventListener("click", (e) => {
    const el = (s) => e.target.closest(s);
    let b;
    if ((b = el("[data-ly-tab]"))) { ui.tab = b.dataset.lyTab; ui.sheet = null; screen.scrollTop = 0; return render("[data-ly-screen]"); }
    if ((b = el("[data-ly-go]"))) { ui.tab = b.dataset.lyGo; if (b.dataset.lyOpen) ui.open = b.dataset.lyOpen; screen.scrollTop = 0; render(b.dataset.lyOpen ? `[data-ly-toggle="${b.dataset.lyOpen}"]` : "[data-ly-screen]"); if (b.dataset.lyOpen) $(`#ly-m-${b.dataset.lyOpen}`)?.scrollIntoView({ block: "nearest" }); return; }
    if ((b = el("[data-ly-tier]"))) { ui.tierView = b.dataset.lyTier; return render(`#ly-tt-${ui.tierView}`); }
    if ((b = el("[data-ly-toggle]"))) { const id = b.dataset.lyToggle; ui.open = ui.open === id ? null : id; return render(`[data-ly-toggle="${id}"]`); }
    if ((b = el("[data-ly-do]"))) {
      const m = MISSIONS.find((x) => x.id === ui.open); if (!m || S.done[m.id] || !unlocked(m.tier)) return;
      const st = S.m[m.id], v = b.dataset.v, a = b.dataset.lyDo;
      if (a === "pay" && st.pays.length < 3) { st.pays.push(MERCHANTS[st.pays.length]); ui.last = { step: "behaviour", text: "Payment made" }; }
      if (a === "cat") st.cat = v;
      if (a === "trycat" && st.cat) { st.done = true; ui.last = { step: "behaviour", text: "New category tried" }; }
      if (a === "task") st.tasks[v] = v === "summary" ? true : v === "rate" ? +b.dataset.x : b.dataset.x;
      if (a === "week" && st.weeks < 4) { st.weeks++; S.week++; ui.last = { step: "behaviour", text: `Active in week ${st.weeks}` }; }
      if (a === "pick" || a === "trip" || a === "curate") st[a === "trip" ? "trip" : "pick"] = v;
      if ((a === "trypick" && st.pick) || (a === "book" && st.trip) || (a === "reserve" && st.pick)) st.done = true;
      save(); render(`[data-ly-claim="${m.id}"]`); return;
    }
    if ((b = el("[data-ly-claim]"))) {
      const m = MISSIONS.find((x) => x.id === b.dataset.lyClaim); const before = tier().k;
      earn(m); render(ui.celebrate ? null : `[data-ly-toggle="${m.id}"]`);
      say(`${m.title} complete. ${nf(S.balance)} points available, ${nf(S.lifetime)} qualifying.${tier().k !== before ? ` ${tier().name} tier unlocked.` : ""}`);
      return;
    }
    if ((b = el("[data-ly-cat]"))) { ui.cat = b.dataset.lyCat; return render(`[data-ly-cat="${ui.cat}"]`); }
    if ((b = el("[data-ly-reward]"))) { ui.sheet = b.dataset.lyReward; ui.returnTo = `[data-ly-reward="${ui.sheet}"]`; return render(); }
    if ((b = el("[data-ly-redeem]"))) { const r = REWARDS.find((x) => x.id === b.dataset.lyRedeem); redeem(r); render(); say(`${r.name} redeemed. ${nf(S.balance)} points available. Tier stays ${tier().name}.`); return; }
    if (el("[data-ly-close]")) { const back = ui.returnTo; ui.sheet = null; return render(back); }
    if ((b = el("[data-ly-celgo]"))) { ui.celebrate = null; ui.tab = "missions"; ui.open = b.dataset.lyCelgo; return render(`[data-ly-toggle="${ui.open}"]`); }
    if (el("[data-ly-celclose]")) { ui.celebrate = null; return render("[data-ly-screen]"); }
    if (el("[data-ly-reset]")) { S = fresh(); Object.assign(ui, { tab: "home", tierView: "explore", cat: "All", open: null, sheet: null, celebrate: null, last: null }); prev.balance = S.balance; prev.lifetime = S.lifetime; save(); render(); say("Demo reset to Explore with 120 points."); return; }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (ui.sheet || ui.celebrate)) { const back = ui.returnTo; ui.sheet = null; ui.celebrate = null; render(back || "[data-ly-screen]"); return; }
    const tab = e.target.closest("[data-ly-tier]");
    if (tab) {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const i = tierIndex(ui.tierView); ui.tierView = TIERS[(i + d + 4) % 4].k; render(`#ly-tt-${ui.tierView}`);
    }
  });
  render();
})();
