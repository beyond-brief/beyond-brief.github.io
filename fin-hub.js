// Financial Experience Hub: a customer-facing banking experience for three fictional customers of a fictional bank.
// One state model per customer: accounts, transactions, card cashback, a savings goal and personalised offers.
// Balances always reconcile (opening + money in − money out). Nothing connects to a bank; state stays in this browser.
(() => {
  const root = document.querySelector("[data-fin-hub]");
  if (!root) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = (n, sign) => (sign && n > 0 ? "+" : n < 0 ? "−" : "") + "€" + Math.abs(n).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur0 = (n) => "€" + Math.round(n).toLocaleString("en-IE");
  const r2 = (n) => Math.round(n * 100) / 100;
  const KEY = "bb-fin-hub-v1", TODAY = 30, MONTH = "October", PREV = "September", CAP = 40;
  const MONTHS = ["Dec 2026", "Mar 2027", "Jun 2027", "Sep 2027", "Dec 2027"];
  const monthsTo = (m) => ({ "Dec 2026": 2, "Mar 2027": 5, "Jun 2027": 8, "Sep 2027": 11, "Dec 2027": 14 }[m]);

  /* ---------- Reference data ---------- */
  const CATS = {
    Groceries: { c: "#1E9E6A", i: "basket" }, Dining: { c: "#E8743B", i: "cup" }, Travel: { c: "#087CFF", i: "plane" },
    Shopping: { c: "#8B5CF6", i: "bag" }, Transport: { c: "#0EA5B7", i: "train" }, Bills: { c: "#64748B", i: "bolt" },
  };
  const SPEND = Object.keys(CATS);
  const CUSTOMERS = {
    sara: {
      name: "Sara K.", full: "Sara Kovac", role: "Product designer, 32", initials: "SK", opening: 2140, savingsOpening: 3200,
      card: { name: "Travel card", boost: "Travel", rate: 0.03 },
      goal: { name: "Trip to Japan", target: 4500, by: "Jun 2027" },
      upcoming: [["Phone bill", 29, "31 Oct"]],
      last: { Groceries: 172, Dining: 64, Travel: 120, Shopping: 140, Transport: 48, Bills: 1229.99 },
      tx: [[1, "Salary · Studio Arc", "Income", 3200, "in"], [1, "Rent · Harbour Lets", "Bills", -1150, "dd"], [3, "Green Basket", "Groceries", -54.3, "card"], [4, "City Metro", "Transport", -24, "card"],
        [6, "Riverside Café", "Dining", -8.6, "card"], [8, "SkyLink Air", "Travel", -186, "card"], [10, "Northline Books", "Shopping", -22.5, "card"], [12, "Bistro Nova", "Dining", -46.8, "card"],
        [14, "Power & Light", "Bills", -68, "dd"], [15, "Green Basket", "Groceries", -61.2, "card"], [18, "Harbour Hotels", "Travel", -240, "card"], [20, "Streamly", "Bills", -11.99, "card"],
        [22, "Atelier 9", "Shopping", -89, "card"], [24, "Bistro Nova", "Dining", -38.4, "card"], [26, "To savings · Trip to Japan", "Transfer", -200, "tr"], [27, "Green Basket", "Groceries", -47.1, "card"], [28, "City Metro", "Transport", -24, "card"]],
      sims: [["Bistro Nova", "Dinner for two", "Dining", 42], ["Green Basket", "Weekly shop", "Groceries", 58.9], ["Rail Europa", "Train to the coast", "Travel", 74]],
      offers: [
        { id: "travel5", title: "5% back on travel", cat: "Travel", rate: 0.05, rule: ["cat", "Travel", 400], why: (s) => `You've spent ${eur0(s.cats.Travel)} on travel this month.` },
        { id: "dining3", title: "3% back on dining for three months", cat: "Dining", rate: 0.03, rule: ["cat", "Dining", 120], why: (s) => `Dining is ${eur0(s.cats.Dining)} this month, up from ${eur0(64)} in ${PREV}.` },
        { id: "fx", title: "No fee on payments abroad", rule: ["cat", "Travel", 150], why: (s) => `${s.count.Travel} travel payments this month suggest you're planning a trip.`, effect: "Card payments abroad have no foreign transaction fee." },
        { id: "saver", title: "Bonus rate on your savings", rule: ["savings", 3000], why: (s) => `Your savings are ${eur0(s.savings)}. A bonus rate (illustrative 3.1% AER) would add about ${eur0(s.savings * 0.031 / 12)} a month.`, effect: "Savings move to an illustrative bonus rate of 3.1% AER." },
      ],
    },
    tural: {
      name: "Tural M.", full: "Tural Mammadli", role: "Teacher, family of four, 41", initials: "TM", opening: 1420, savingsOpening: 1050,
      card: { name: "Family card", boost: "Groceries", rate: 0.03 },
      goal: { name: "Family holiday", target: 2400, by: "Jun 2027" },
      upcoming: [["Nursery fee", 220, "31 Oct"]],
      last: { Groceries: 360, Dining: 55, Travel: 0, Shopping: 120, Transport: 110, Bills: 1080 },
      tx: [[1, "Salary · City Schools", "Income", 2650, "in"], [1, "Mortgage · Calder Homes", "Bills", -980, "dd"], [2, "Green Basket", "Groceries", -96.4, "card"], [5, "FuelPoint", "Transport", -64, "card"],
        [9, "Green Basket", "Groceries", -84.1, "card"], [11, "Toy Harbour", "Shopping", -74.9, "card"], [13, "Power & Light", "Bills", -112, "dd"], [16, "Green Basket", "Groceries", -102.7, "card"],
        [19, "FuelPoint", "Transport", -58, "card"], [21, "Pizza Corner", "Dining", -32.5, "card"], [23, "Green Basket", "Groceries", -91.3, "card"], [25, "To savings · Family holiday", "Transfer", -150, "tr"]],
      sims: [["Green Basket", "Family shop", "Groceries", 87.3], ["FuelPoint", "Fuel", "Transport", 45], ["Toy Harbour", "Birthday present", "Shopping", 34.99]],
      offers: [
        { id: "groc5", title: "5% back at partner supermarkets", cat: "Groceries", rate: 0.05, rule: ["cat", "Groceries", 350], why: (s) => `Groceries are ${eur0(s.cats.Groceries)} this month, your biggest everyday category.` },
        { id: "fuel3", title: "3% back on fuel", cat: "Transport", rate: 0.03, rule: ["cat", "Transport", 150], why: (s) => `Transport is ${eur0(s.cats.Transport)} this month, mostly fuel.` },
        { id: "roundup", title: "Round-ups to your holiday goal", rule: ["always"], why: (s) => `Rounding up this month's card payments would have added ${eur(s.roundups)} to your goal.`, effect: "Each new card payment rounds up to the next euro and moves the difference to savings." },
      ],
    },
    lea: {
      name: "Lea D.", full: "Lea Dumont", role: "Freelance photographer, 28", initials: "LD", opening: 860, savingsOpening: 620,
      card: { name: "Everyday card", boost: "Dining", rate: 0.03 },
      goal: { name: "Emergency buffer", target: 3000, by: "Mar 2027" },
      upcoming: [["Software renewal", 59, "31 Oct"]],
      last: { Groceries: 90, Dining: 98, Travel: 0, Shopping: 60, Transport: 30, Bills: 774 },
      tx: [[1, "Rent · Old Town Rooms", "Bills", -720, "dd"], [3, "Daily Grind", "Dining", -14.2, "card"], [5, "Invoice · Bloom Florists", "Income", 1450, "in"], [6, "Green Basket", "Groceries", -38.6, "card"],
        [7, "Scoot", "Transport", -18, "card"], [9, "Lens & Light", "Shopping", -249, "card"], [11, "Daily Grind", "Dining", -22.8, "card"], [13, "Frame Software", "Bills", -24.99, "card"],
        [15, "Noodle Bar", "Dining", -31.5, "card"], [17, "Mobile · Signal", "Bills", -29, "card"], [19, "Invoice · Harbour Hotels", "Income", 980, "in"], [20, "To savings · Emergency buffer", "Transfer", -100, "tr"],
        [22, "Green Basket", "Groceries", -44.1, "card"], [24, "Daily Grind", "Dining", -18.4, "card"], [26, "Scoot", "Transport", -18, "card"], [28, "Atelier Café", "Dining", -27.9, "card"]],
      sims: [["Daily Grind", "Flat white", "Dining", 6.4], ["Lens & Light", "Camera bag", "Shopping", 129], ["Green Basket", "Groceries", "Groceries", 41.2]],
      offers: [
        { id: "cafe5", title: "5% back at partner cafés", cat: "Dining", rate: 0.05, rule: ["cat", "Dining", 100], why: (s) => `You've made ${s.count.Dining} café and restaurant payments this month.` },
        { id: "groc2", title: "2% back on groceries", cat: "Groceries", rate: 0.02, rule: ["cat", "Groceries", 120], why: (s) => `Groceries are ${eur0(s.cats.Groceries)} this month.` },
        { id: "autosave", title: "Save 10% of every invoice", rule: ["income", 2], why: (s) => `${s.incomeCount} invoices paid this month. 10% would have moved ${eur(s.income * 0.1)} to your buffer.`, effect: "10% of each incoming invoice moves to savings automatically." },
      ],
    },
  };

  /* ---------- State ---------- */
  function seed(k) {
    const c = CUSTOMERS[k];
    const tx = c.tx.map(([d, m, cat, a, how], i) => ({ id: k + i, d, m, cat, a, how, rate: how === "card" && SPEND.includes(cat) ? (cat === c.card.boost ? c.card.rate : 0.01) : 0 }));
    const savings = c.savingsOpening + tx.filter((t) => t.how === "tr").reduce((s, t) => s - t.a, 0);
    return { tx, savings, goal: { ...c.goal }, active: {}, sims: 0 };
  }
  const fresh = () => ({ v: 1, cust: "sara", data: { sara: seed("sara"), tural: seed("tural"), lea: seed("lea") } });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !S.data?.sara) S = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const ui = { view: "overview", cat: "All", offer: null, toast: null, goalEdit: false };

  /* ---------- Derived figures (pure) ---------- */
  function figures(k = S.cust) {
    const c = CUSTOMERS[k], d = S.data[k], tx = d.tx;
    const credits = tx.filter((t) => t.a > 0).reduce((s, t) => s + t.a, 0);
    const debits = tx.filter((t) => t.a < 0).reduce((s, t) => s - t.a, 0);
    const balance = r2(c.opening + credits - debits);
    const cats = Object.fromEntries(SPEND.map((x) => [x, r2(tx.filter((t) => t.cat === x).reduce((s, t) => s - t.a, 0))]));
    const count = Object.fromEntries(SPEND.map((x) => [x, tx.filter((t) => t.cat === x).length]));
    const spent = r2(SPEND.reduce((s, x) => s + cats[x], 0));
    const lastTotal = r2(SPEND.reduce((s, x) => s + c.last[x], 0));
    const byCat = Object.fromEntries(SPEND.map((x) => [x, r2(tx.filter((t) => t.cat === x && t.rate).reduce((s, t) => s + -t.a * t.rate, 0))]));
    const earned = r2(SPEND.reduce((s, x) => s + byCat[x], 0)); // sum of the per-category figures shown, so the breakdown always adds up
    const cashback = Math.min(CAP, earned);
    const upcoming = c.upcoming.reduce((s, u) => s + u[1], 0);
    const income = tx.filter((t) => t.cat === "Income").reduce((s, t) => s + t.a, 0);
    const roundups = r2(tx.filter((t) => t.how === "card").reduce((s, t) => s + (Math.ceil(-t.a) - -t.a), 0));
    const toSavings = tx.filter((t) => t.how === "tr").reduce((s, t) => s - t.a, 0);
    const g = d.goal, months = monthsTo(g.by), left = Math.max(0, g.target - d.savings);
    return { c, d, tx, credits: r2(credits), debits: r2(debits), balance, cats, count, spent, lastTotal, earned, cashback, byCat, upcoming, safe: r2(balance - upcoming),
      income, incomeCount: tx.filter((t) => t.cat === "Income").length, roundups, savings: d.savings, toSavings,
      goal: { ...g, months, left, monthly: Math.ceil(left / months), pct: Math.min(100, (d.savings / g.target) * 100) } };
  }
  function offerState(o, f) {
    const [t, a, b] = o.rule;
    if (t === "always") return { ok: true, need: 0 };
    if (t === "cat") return { ok: f.cats[a] >= b, need: r2(b - f.cats[a]), label: `${a} spend of ${eur0(b)}` };
    if (t === "savings") return { ok: f.savings >= a, need: r2(a - f.savings), label: `savings of ${eur0(a)}` };
    if (t === "income") return { ok: f.incomeCount >= a, need: a - f.incomeCount, label: `${a} incoming payments` };
    return { ok: false, need: 0 };
  }
  const needLabel = (o, s) => o.rule[0] === "income" ? `${s.need} more incoming payment${s.need > 1 ? "s" : ""} to unlock` : `${eur(s.need)} more ${o.rule[0] === "cat" ? o.rule[1].toLowerCase() + " spend" : "in savings"} to unlock`;
  const rateFor = (k, cat) => {
    const c = CUSTOMERS[k], act = S.data[k].active;
    const boost = c.offers.find((o) => o.cat === cat && act[o.id]);
    return boost ? boost.rate : cat === c.card.boost ? c.card.rate : 0.01;
  };

  /* ---------- Actions ---------- */
  function pay(i) {
    const k = S.cust, c = CUSTOMERS[k], d = S.data[k], [m, what, cat, amt] = c.sims[i], f0 = figures();
    if (amt > f0.balance) { ui.toast = { bad: true, t: `Declined in the demo: ${eur(amt)} is more than the ${eur(f0.balance)} available.` }; return; }
    const before = c.offers.filter((o) => offerState(o, f0).ok).map((o) => o.id);
    const rate = rateFor(k, cat);
    d.tx.push({ id: k + "s" + d.sims, d: TODAY, m: `${m} · ${what}`, cat, a: -amt, how: "card", rate, sim: true });
    let extra = "";
    if (d.active.roundup) { const up = r2(Math.ceil(amt) - amt); if (up > 0) { d.tx.push({ id: k + "r" + d.sims, d: TODAY, m: "Round-up to savings", cat: "Transfer", a: -up, how: "tr", rate: 0, sim: true }); d.savings = r2(d.savings + up); extra = ` · ${eur(up)} rounded up to savings`; } }
    d.sims++;
    const f1 = figures();
    const unlocked = c.offers.filter((o) => offerState(o, f1).ok && !before.includes(o.id));
    ui.toast = { t: `${eur(-amt)} at ${m} · ${cat} now ${eur0(f1.cats[cat])} · cashback ${eur(f1.cashback - f0.cashback, true)}${extra}`, offer: unlocked[0] };
    save();
  }
  function transfer(amt) {
    const k = S.cust, d = S.data[k], f = figures();
    if (amt > f.balance) return;
    d.tx.push({ id: k + "t" + d.tx.length, d: TODAY, m: `To savings · ${d.goal.name}`, cat: "Transfer", a: -amt, how: "tr", rate: 0, sim: true });
    d.savings = r2(d.savings + amt);
    ui.toast = { t: `${eur(amt)} moved to ${d.goal.name}. Current account ${eur(figures().balance)}.` };
    save();
  }

  /* ---------- Visual helpers ---------- */
  const ICON = {
    overview: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    spending: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 6"/>',
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    goal: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    offers: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2V3.4h10z"/><circle cx="8" cy="8" r="1.4"/>',
    basket: '<path d="M4 9h16l-1.6 10H5.6zM8 9l4-5 4 5"/>', cup: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
    plane: '<path d="M3 13.5 21 6l-4.5 13-4-5.5-6 3 1.5-4.5z"/>', bag: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="14" r=".8" fill="currentColor"/><circle cx="15" cy="14" r=".8" fill="currentColor"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', in: '<path d="M12 4v16M5 13l7 7 7-7"/>', tr: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>', check: '<path d="M4 12.5 9 17l11-11"/>', reset: '<path d="M4 4v6h6"/><path d="M5 15a8 8 0 1 0 2-8.5L4 10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  const ico = (k, s = 18) => `<svg class="fh-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.spending}</svg>`;
  const catIco = (t) => t.cat === "Income" ? ico("in", 16) : t.cat === "Transfer" ? ico("tr", 16) : ico(CATS[t.cat].i, 16);
  const catColor = (cat) => CATS[cat]?.c || (cat === "Income" ? "#1E9E6A" : "#94A3B8");
  function donut(f, sel) {
    const R = 52, C = 2 * Math.PI * R; let off = 0;
    const segs = SPEND.filter((x) => f.cats[x] > 0).map((x) => { const len = (f.cats[x] / f.spent) * C; const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${CATS[x].c}" stroke-width="${sel === x ? 20 : 15}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" opacity="${sel === "All" || sel === x ? 1 : .22}" transform="rotate(-90 70 70)"/>`; off += len; return s; }).join("");
    const mid = sel === "All" ? [eur0(f.spent), `Spent · ${MONTH.slice(0, 3)}`] : [eur0(f.cats[sel]), `${Math.round((f.cats[sel] / f.spent) * 100)}% of spend`];
    return `<svg class="fh-donut" viewBox="0 0 140 140" role="img" aria-label="Spending by category: ${SPEND.map((x) => `${x} ${eur0(f.cats[x])}`).join(", ")}">${segs}<text x="70" y="68" text-anchor="middle" class="fh-dv">${mid[0]}</text><text x="70" y="86" text-anchor="middle" class="fh-dl">${mid[1]}</text></svg>`;
  }
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const delta = (a, b) => { if (!b) return a ? "new this month" : "no change"; const p = pct(a, b); return p === 0 ? "same as last month" : `${p > 0 ? "+" : "−"}${Math.abs(p)}% vs ${PREV}`; };

  /* ---------- Views ---------- */
  function txList(list, max) {
    const rows = list.slice().sort((a, b) => b.d - a.d || (b.sim ? 1 : 0) - (a.sim ? 1 : 0)).slice(0, max || 99);
    if (!rows.length) return `<p class="fh-empty">No ${ui.cat.toLowerCase()} payments this month.</p>`;
    return `<ul class="fh-tx">${rows.map((t) => `<li class="${t.sim ? "new" : ""}"><span class="fh-tx-i" style="--cc:${catColor(t.cat)}">${catIco(t)}</span><span class="fh-tx-m"><b>${esc(t.m)}</b><small>${t.d} Oct · ${t.cat}${t.how === "card" ? ` · card${t.rate ? ` · ${Math.round(t.rate * 100)}% back` : ""}` : t.how === "dd" ? " · direct debit" : ""}</small></span><span class="fh-tx-a ${t.a > 0 ? "in" : ""}">${eur(t.a, true)}</span></li>`).join("")}</ul>`;
  }
  function simPanel(f) {
    return `<section class="fh-card fh-sim"><header><h4>Simulate a card payment</h4><span class="fh-sub">Eligible for cashback · demo only</span></header>
      <div class="fh-sims">${f.c.sims.map(([m, what, cat, amt], i) => `<button type="button" data-fh-pay="${i}" ${amt > f.balance ? "disabled" : ""}><span class="fh-tx-i" style="--cc:${CATS[cat].c}">${ico(CATS[cat].i, 16)}</span><span><b>${esc(m)}</b><small>${esc(what)} · ${cat}</small></span><em>${eur(amt)}</em></button>`).join("")}</div></section>`;
  }
  function overview(f) {
    const best = f.c.offers.map((o) => ({ o, s: offerState(o, f) })).find((x) => x.s.ok && !f.d.active[x.o.id]) || f.c.offers.map((o) => ({ o, s: offerState(o, f) })).find((x) => !f.d.active[x.o.id]);
    return `<div class="fh-hello"><div><small>Good evening</small><h3 class="fh-h" tabindex="-1">${esc(f.c.full.split(" ")[0])}</h3></div><p>Friday ${TODAY} ${MONTH}</p></div>
    <div class="fh-accounts">
      <section class="fh-acc main"><small>Current account</small><b>${eur(f.balance)}</b><span>Safe to spend until payday: <strong>${eur(f.safe)}</strong></span><i>after ${f.c.upcoming.map((u) => `${u[0]} ${eur0(u[1])} on ${u[2]}`).join(", ")}</i></section>
      <section class="fh-acc"><small>Savings · ${esc(f.goal.name)}</small><b>${eur(f.savings)}</b><span class="fh-bar"><i style="width:${f.goal.pct}%"></i></span><i>${Math.round(f.goal.pct)}% of ${eur0(f.goal.target)}</i></section>
      <section class="fh-acc"><small>Cashback this month</small><b>${eur(f.cashback)}</b><span class="fh-bar cb"><i style="width:${(f.cashback / CAP) * 100}%"></i></span><i>Paid on 1 Nov · cap ${eur0(CAP)}</i></section>
    </div>
    <div class="fh-grid two">
      <section class="fh-card"><header><h4>Spending in ${MONTH}</h4><button type="button" class="fh-link" data-fh-view="spending">See details</button></header>
        <div class="fh-ov-spend">${donut(f, "All")}<ul class="fh-legend">${SPEND.filter((x) => f.cats[x]).map((x) => `<li><i style="background:${CATS[x].c}"></i>${x}<b>${eur0(f.cats[x])}</b></li>`).join("")}</ul></div>
        <p class="fh-insight">${f.spent <= f.lastTotal ? "Down" : "Up"} ${Math.abs(pct(f.spent, f.lastTotal))}% on ${PREV}. ${topCat(f)}</p></section>
      <section class="fh-card"><header><h4>Recent activity</h4><button type="button" class="fh-link" data-fh-view="spending">All transactions</button></header>${txList(f.tx, 5)}</section>
    </div>
    <div class="fh-grid two">
      ${simPanel(f)}
      ${best ? `<section class="fh-card fh-offer-hi ${best.s.ok ? "" : "locked"}"><header><h4>For you</h4><span class="fh-sub">Based on your own ${MONTH} activity</span></header><b>${esc(best.o.title)}</b><p>${esc(best.o.why(f))}</p><button type="button" class="fh-btn ${best.s.ok ? "" : "ghost"}" data-fh-offer="${best.o.id}">${best.s.ok ? "Explore offer" : needLabel(best.o, best.s)}</button></section>` : ""}
    </div>`;
  }
  const topCat = (f) => { const top = SPEND.filter((x) => x !== "Bills").sort((a, b) => f.cats[b] - f.cats[a])[0]; return `${top} is your biggest everyday category at ${eur0(f.cats[top])}.`; };
  function spending(f) {
    const sel = ui.cat, list = sel === "All" ? f.tx : f.tx.filter((t) => t.cat === sel), maxBar = Math.max(...SPEND.map((x) => Math.max(f.cats[x], f.c.last[x])), 1);
    const ins = sel === "All"
      ? [`${eur(f.spent)} spent in ${MONTH}, ${delta(f.spent, f.lastTotal)}.`, topCat(f), `Bills take ${Math.round((f.cats.Bills / f.spent) * 100)}% of your spending.`]
      : [`${eur(f.cats[sel])} on ${sel.toLowerCase()} in ${MONTH}, ${delta(f.cats[sel], f.c.last[sel])}.`, f.count[sel] ? `${f.count[sel]} payment${f.count[sel] > 1 ? "s" : ""}, ${eur(f.cats[sel] / f.count[sel])} on average.` : "No payments yet this month.", `Cashback earned on ${sel.toLowerCase()}: ${eur(f.byCat[sel])} at ${Math.round(rateFor(S.cust, sel) * 100)}%.`];
    return `<h3 class="fh-h" tabindex="-1">Spending</h3>
    <div class="fh-chips" role="group" aria-label="Category">${["All", ...SPEND].map((x) => `<button type="button" data-fh-cat="${x}" aria-pressed="${sel === x}" style="--cc:${CATS[x]?.c || "#101114"}">${x === "All" ? "All" : ico(CATS[x].i, 14) + x}</button>`).join("")}</div>
    <div class="fh-grid spend">
      <section class="fh-card fh-viz"><div class="fh-viz-top">${donut(f, sel)}<ul class="fh-insights" aria-live="polite">${ins.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        <h5 class="fh-k">${MONTH} vs ${PREV}</h5>
        <ul class="fh-mom">${SPEND.map((x) => `<li class="${sel !== "All" && sel !== x ? "dim" : ""}"><span>${x}</span><span class="fh-mom-b"><i style="width:${(f.cats[x] / maxBar) * 100}%;background:${CATS[x].c}"></i><i class="last" style="width:${(f.c.last[x] / maxBar) * 100}%"></i></span><b>${eur0(f.cats[x])}</b></li>`).join("")}</ul>
        <p class="fh-key"><i></i>${MONTH} <i class="last"></i>${PREV}</p></section>
      <section class="fh-card"><header><h4>${sel === "All" ? "All transactions" : sel}</h4><span class="fh-sub">${list.length} this month</span></header>${txList(list)}
        <p class="fh-recon">Balance check: ${eur(f.c.opening)} opening + ${eur(f.credits)} in − ${eur(f.debits)} out = <b>${eur(f.balance)}</b></p></section>
    </div>
    ${simPanel(f)}`;
  }
  function cardView(f) {
    const act = f.c.offers.filter((o) => o.cat && f.d.active[o.id]);
    return `<h3 class="fh-h" tabindex="-1">Card & benefits</h3>
    <div class="fh-grid card">
      <div class="fh-plastic k-${S.cust}" aria-label="${esc(f.c.card.name)}, fictional card"><span class="fh-pl-brand">Calder</span><span class="fh-pl-chip"></span><b>${esc(f.c.card.name)}</b><span class="fh-pl-name">${esc(f.c.full)}</span><span class="fh-pl-num">•••• ${{ sara: "4417", tural: "2280", lea: "9063" }[S.cust]}</span></div>
      <section class="fh-card"><header><h4>Your cashback rates</h4></header>
        <ul class="fh-rates">${SPEND.map((x) => { const r = rateFor(S.cust, x); return `<li><span class="fh-tx-i" style="--cc:${CATS[x].c}">${ico(CATS[x].i, 16)}</span><span>${x}${x === f.c.card.boost ? " <em>card boost</em>" : ""}${act.find((o) => o.cat === x) ? " <em class=\"on\">offer active</em>" : ""}</span><b>${Math.round(r * 100)}%</b></li>`; }).join("")}</ul>
        <p class="fh-fine">Rates apply to card payments. Direct debits and transfers don't earn cashback. Monthly cap ${eur0(CAP)}.</p></section>
    </div>
    <section class="fh-card"><header><h4>Cashback earned in ${MONTH}</h4><span class="fh-sub">${eur(f.earned)} earned${f.earned > CAP ? `, capped at ${eur(CAP)}` : ""}</span></header>
      <ul class="fh-cb">${SPEND.filter((x) => f.byCat[x]).map((x) => `<li><span>${x}</span><span class="fh-cb-b"><i style="width:${(f.byCat[x] / Math.max(...SPEND.map((y) => f.byCat[y]), 0.01)) * 100}%;background:${CATS[x].c}"></i></span><b>${eur(f.byCat[x])}</b></li>`).join("")}</ul>
      <p class="fh-recon">${SPEND.filter((x) => f.byCat[x]).map((x) => eur(f.byCat[x])).join(" + ")} = <b>${eur(f.earned)}</b>${f.earned > CAP ? ` → ${eur(CAP)} after cap` : ""}</p></section>`;
  }
  function goals(f) {
    const g = f.goal, onTrack = f.toSavings >= g.monthly;
    return `<h3 class="fh-h" tabindex="-1">Goals</h3>
    <div class="fh-grid goal">
      <section class="fh-card fh-goal"><div class="fh-ring" style="--p:${g.pct}" role="img" aria-label="${Math.round(g.pct)}% saved"><b>${Math.round(g.pct)}%</b><small>saved</small></div>
        <div><small class="fh-k">${esc(g.name)} · by ${g.by}</small><b class="fh-goal-v">${eur(f.savings)} <span>of ${eur0(g.target)}</span></b>
        <p>${g.left ? `Save <strong>${eur0(g.monthly)} a month</strong> for ${g.months} months to get there. ${onTrack ? `You moved ${eur0(f.toSavings)} this month, so you're on track.` : `You've moved ${eur0(f.toSavings)} this month, ${eur0(g.monthly - f.toSavings)} short of this month's step.`}` : "Goal reached. Choose a new target to keep going."}</p>
        <div class="fh-move" role="group" aria-label="Move money to this goal">${[50, 100, 250].map((a) => `<button type="button" class="fh-btn ghost sm" data-fh-move="${a}" ${a > f.balance ? "disabled" : ""}>Move ${eur0(a)}</button>`).join("")}</div></div></section>
      <section class="fh-card"><header><h4>Set your goal</h4></header>
        <form class="fh-form" data-fh-goal>
          <label class="fh-field"><span>What are you saving for?</span><select name="name">${["Trip to Japan", "Family holiday", "Emergency buffer", "New laptop", "Home deposit"].map((n) => `<option${n === g.name ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="fh-field"><span>Target <output data-fh-tval>${eur0(g.target)}</output></span><input type="range" name="target" min="500" max="10000" step="100" value="${g.target}"></label>
          <label class="fh-field"><span>By</span><select name="by">${MONTHS.map((m) => `<option${m === g.by ? " selected" : ""}>${m}</option>`).join("")}</select></label>
          <p class="fh-calc" data-fh-calc aria-live="polite"></p>
          <button type="submit" class="fh-btn">Save goal</button>
        </form></section>
    </div>`;
  }
  function offers(f) {
    return `<h3 class="fh-h" tabindex="-1">Offers for you</h3><p class="fh-lede">Chosen from your own ${MONTH} activity. Each one shows why, and what would unlock it.</p>
    <ul class="fh-offers">${f.c.offers.map((o) => { const s = offerState(o, f), on = f.d.active[o.id]; return `<li class="${on ? "on" : s.ok ? "ok" : "locked"}"><button type="button" data-fh-offer="${o.id}"><span class="fh-of-i">${ico(on ? "check" : s.ok ? "offers" : "lock", 18)}</span><span><b>${esc(o.title)}</b><small>${on ? "Active" : s.ok ? "Available to you" : needLabel(o, s)}</small></span></button></li>`; }).join("")}</ul>`;
  }
  function offerSheet(f) {
    const o = f.c.offers.find((x) => x.id === ui.offer); if (!o) return "";
    const s = offerState(o, f), on = f.d.active[o.id];
    return `<div class="fh-sheet-bg" data-fh-close></div><div class="fh-sheet" role="dialog" aria-modal="true" aria-labelledby="fh-of-t"><button type="button" class="fh-x" data-fh-close aria-label="Close">${ico("x", 18)}</button>
      <small class="fh-k">Personalised offer · illustrative</small><h4 id="fh-of-t">${esc(o.title)}</h4>
      <div class="fh-why"><small class="fh-k">Why you're seeing this</small><p>${esc(o.why(f))}</p></div>
      <dl class="fh-dl"><div><dt>Unlocks with</dt><dd>${o.rule[0] === "always" ? "Available to everyone" : esc(s.label)}</dd></div><div><dt>Status</dt><dd>${on ? "Active" : s.ok ? "Available now" : needLabel(o, s)}</dd></div>
      <div><dt>What changes</dt><dd>${o.cat ? `New ${o.cat.toLowerCase()} card payments earn ${Math.round(o.rate * 100)}% instead of ${Math.round((o.cat === f.c.card.boost ? f.c.card.rate : 0.01) * 100)}%.` : esc(o.effect)}</dd></div></dl>
      <button type="button" class="fh-btn" data-fh-activate="${o.id}" ${!s.ok || on ? "disabled" : ""}>${on ? "Active" : s.ok ? "Activate offer" : "Not unlocked yet"}</button>
      <p class="fh-fine">A demo offer for a fictional bank. Nothing is applied to a real account.</p></div>`;
  }

  /* ---------- Shell ---------- */
  const NAV = [["overview", "Overview"], ["spending", "Spending"], ["card", "Card & benefits"], ["goals", "Goals"], ["offers", "Offers"]];
  root.innerHTML = `<div class="fh-demo-bar"><span class="fh-k">Demo customer</span><div class="fh-people" role="group" aria-label="Choose a customer">${Object.entries(CUSTOMERS).map(([k, c]) => `<button type="button" data-fh-cust="${k}" aria-pressed="false"><span class="fh-av" aria-hidden="true">${c.initials}</span><span><b>${c.name}</b><small>${c.role}</small></span></button>`).join("")}</div><button type="button" class="fh-reset" data-fh-reset>${ico("reset", 15)}Reset demo</button></div>
    <div class="fh-app">
      <aside class="fh-side"><div class="fh-logo"><span aria-hidden="true"></span>Calder<small>Fictional bank</small></div>
        <nav class="fh-nav" aria-label="Banking">${NAV.map(([k, l]) => `<button type="button" data-fh-view="${k}">${ico(k)}<span>${l}</span></button>`).join("")}</nav>
        <div class="fh-side-foot" data-fh-me></div></aside>
      <div class="fh-main" data-fh-main></div>
      <div data-fh-layer></div>
    </div>
    <p class="fh-toast" role="status" aria-live="polite" data-fh-toast></p>`;
  const $ = (s) => root.querySelector(s), main = $("[data-fh-main]");

  function goalCalc() {
    const form = $("[data-fh-goal]"); if (!form) return;
    const t = +form.target.value, by = form.by.value, f = figures(), m = monthsTo(by), left = Math.max(0, t - f.savings);
    form.querySelector("[data-fh-tval]").textContent = eur0(t);
    form.querySelector("[data-fh-calc]").innerHTML = left ? `${eur0(left)} to go → <b>${eur0(Math.ceil(left / m))} a month</b> for ${m} months` : `You already have ${eur0(f.savings)}. This goal is reached.`;
  }
  function render(focus) {
    const f = figures();
    root.querySelectorAll("[data-fh-cust]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fhCust === S.cust)));
    root.querySelectorAll(".fh-nav [data-fh-view]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.fhView === ui.view));
    $("[data-fh-me]").innerHTML = `<span class="fh-av" aria-hidden="true">${f.c.initials}</span><span><b>${esc(f.c.full)}</b><small>${esc(f.c.card.name)}</small></span>`;
    main.innerHTML = { overview, spending, card: cardView, goals, offers }[ui.view](f);
    $("[data-fh-layer]").innerHTML = ui.offer ? offerSheet(f) : "";
    goalCalc();
    const t = $("[data-fh-toast]");
    if (ui.toast) { t.className = "fh-toast on" + (ui.toast.bad ? " bad" : ""); t.innerHTML = `${esc(ui.toast.t)}${ui.toast.offer ? ` <button type="button" class="fh-link" data-fh-offer="${ui.toast.offer.id}">Unlocked: ${esc(ui.toast.offer.title)}</button>` : ""}`; clearTimeout(render.tt); render.tt = setTimeout(() => t.classList.remove("on"), 6000); ui.toast = null; }
    if (ui.offer) $(".fh-sheet .fh-btn:not([disabled]), .fh-sheet .fh-x")?.focus({ preventScroll: true });
    else if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }

  root.addEventListener("click", (e) => {
    const el = (s) => e.target.closest(s); let b;
    if ((b = el("[data-fh-cust]"))) { S.cust = b.dataset.fhCust; ui.cat = "All"; ui.offer = null; save(); return render(".fh-h"); }
    if ((b = el("[data-fh-view]"))) { ui.view = b.dataset.fhView; ui.offer = null; return render(".fh-h"); }
    if ((b = el("[data-fh-cat]"))) { ui.cat = b.dataset.fhCat; return render(`[data-fh-cat="${ui.cat}"]`); }
    if ((b = el("[data-fh-pay]"))) { pay(+b.dataset.fhPay); return render(`[data-fh-pay="${b.dataset.fhPay}"]`); }
    if ((b = el("[data-fh-move]"))) { transfer(+b.dataset.fhMove); return render(`[data-fh-move="${b.dataset.fhMove}"]`); }
    if ((b = el("[data-fh-offer]"))) { ui.offer = b.dataset.fhOffer; ui.back = `[data-fh-offer="${ui.offer}"]`; return render(); }
    if ((b = el("[data-fh-activate]"))) { const f = figures(), o = f.c.offers.find((x) => x.id === b.dataset.fhActivate); if (o && offerState(o, f).ok) { S.data[S.cust].active[o.id] = true; save(); ui.toast = { t: `${o.title} is active. ${o.cat ? `New ${o.cat.toLowerCase()} payments earn ${Math.round(o.rate * 100)}%.` : o.effect}` }; } return render(); }
    if (el("[data-fh-close]")) { const back = ui.back; ui.offer = null; return render(back); }
    if (el("[data-fh-reset]")) { const c = S.cust; S = fresh(); S.cust = c; ui.cat = "All"; ui.offer = null; save(); ui.toast = { t: "Demo reset. All three customers are back to their starting figures." }; return render(".fh-h"); }
  });
  root.addEventListener("input", (e) => { if (e.target.closest("[data-fh-goal]")) goalCalc(); });
  root.addEventListener("change", (e) => { if (e.target.closest("[data-fh-goal]")) goalCalc(); });
  root.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-fh-goal]")) return; e.preventDefault();
    const fm = e.target, g = S.data[S.cust].goal;
    Object.assign(g, { name: fm.name.value, target: +fm.target.value, by: fm.by.value });
    save(); const f = figures(); ui.toast = { t: `Goal saved: ${g.name}, ${eur0(g.target)} by ${g.by}. ${f.goal.left ? `${eur0(f.goal.monthly)} a month gets you there.` : "Already reached."}` };
    render("[data-fh-goal] button");
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.offer) { const back = ui.back; ui.offer = null; render(back); } });
  render();

  // Exposed for automated checks only (no UI depends on it).
  root.__fh = { figures, offerState, pay, transfer, get S() { return S; }, CUSTOMERS, rateFor };
})();
