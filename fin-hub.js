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
    Groceries: { c: "#C98A12", i: "basket" }, Dining: { c: "#E0603A", i: "cup" }, Travel: { c: "#3E64E0", i: "plane" },
    Shopping: { c: "#AE5BC9", i: "bag" }, Transport: { c: "#1497A8", i: "train" }, Bills: { c: "#7A8296", i: "bolt" },
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
  // frozen/flip are session-only card controls (not persisted); Reset clears them.
  const ui = { view: "overview", cat: "All", offer: null, toast: null, goalEdit: false, frozen: {}, flip: false };

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
    if (ui.frozen[k]) { ui.toast = { bad: true, t: `Declined in the demo: your ${c.card.name.toLowerCase()} is frozen. Unfreeze it in Card & benefits.` }; return; }
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
    goals: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    offers: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2V3.4h10z"/><circle cx="8" cy="8" r="1.4"/>',
    basket: '<path d="M4 9h16l-1.6 10H5.6zM8 9l4-5 4 5"/>', cup: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
    plane: '<path d="M3 13.5 21 6l-4.5 13-4-5.5-6 3 1.5-4.5z"/>', bag: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="14" r=".8" fill="currentColor"/><circle cx="15" cy="14" r=".8" fill="currentColor"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', in: '<path d="M12 4v16M5 13l7 7 7-7"/>', tr: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>', check: '<path d="M4 12.5 9 17l11-11"/>', reset: '<path d="M4 4v6h6"/><path d="M5 15a8 8 0 1 0 2-8.5L4 10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5M4 10.5l3.7.6-1.3 3.4M20 13.5l-3.7-.6 1.3-3.4M4 13.5l3.7-.6-1.3-3.4M20 10.5l-3.7.6 1.3 3.4"/>',
    flip: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  };
  const ico = (k, s = 18) => `<svg class="fh-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.spending}</svg>`;
  const catIco = (t) => t.cat === "Income" ? ico("in", 16) : t.cat === "Transfer" ? ico("tr", 16) : ico(CATS[t.cat].i, 16);
  const catColor = (cat) => CATS[cat]?.c || (cat === "Income" ? "#1E8A5C" : "#8A90A0");
  // Large figure with quieter cents. textContent stays identical to eur(n), e.g. "€3,068.11".
  const big = (n) => { const s = eur(n), i = s.lastIndexOf("."); return `${s.slice(0, i)}<span class="fh-cents">${s.slice(i)}</span>`; };
  const kfmt = (v) => v >= 1000 ? `€${+(v / 1000).toFixed(1)}k` : `€${Math.round(v)}`;
  const niceTop = (v) => { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))); return Math.ceil(v / p) * p; };
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], weekday = (d) => WD[(((5 + d - TODAY) % 7) + 7) % 7];
  const CARDNO = { sara: "4417", tural: "2280", lea: "9063" };
  const LOGO = '<svg class="fh-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#C9F26B"/><path d="M21.6 10.4a8 8 0 1 0 0 11.2" fill="none" stroke="#0F131C" stroke-width="3" stroke-linecap="round"/><circle cx="23.6" cy="16" r="2.4" fill="#0F131C"/></svg>';

  function donut(f, sel) {
    const R = 54, C = 2 * Math.PI * R; let off = 0;
    const segs = SPEND.filter((x) => f.cats[x] > 0).map((x) => { const len = (f.cats[x] / f.spent) * C; const a = Math.max(0, len - 2.4).toFixed(2), o = off.toFixed(2);
      const s = `<circle r="${R}" cx="70" cy="70" class="fh-seg ${sel === x ? "sel" : ""} ${sel === "All" || sel === x ? "" : "dim"}" stroke="${CATS[x].c}" data-fh-m="seg-${x}" data-fh-from="stroke-dasharray:0px 400px" style="stroke-dasharray:${a}px 400px;stroke-dashoffset:-${o}px"/>`; off += len; return s; }).join("");
    const mid = sel === "All" ? [eur0(f.spent), `Spent · ${MONTH.slice(0, 3)}`] : [eur0(f.cats[sel]), `${Math.round((f.cats[sel] / f.spent) * 100)}% of spend`];
    return `<svg class="fh-donut" viewBox="0 0 140 140" role="img" aria-label="Spending by category: ${SPEND.map((x) => `${x} ${eur0(f.cats[x])}`).join(", ")}"><circle r="${R}" cx="70" cy="70" class="fh-track"/><g transform="rotate(-90 70 70)">${segs}</g><circle r="40" cx="70" cy="70" class="fh-hub"/><text x="70" y="70" text-anchor="middle" class="fh-dv">${mid[0]}</text><text x="70" y="86" text-anchor="middle" class="fh-dl">${mid[1]}</text></svg>`;
  }
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const delta = (a, b) => { if (!b) return a ? "new this month" : "no change"; const p = pct(a, b); return p === 0 ? "same as last month" : `${p > 0 ? "+" : "−"}${Math.abs(p)}% vs ${PREV}`; };

  // Running balance through the month: a stepped line from the opening balance to today.
  function cashflow(f) {
    const pts = [[0, f.c.opening]]; let bal = f.c.opening;
    for (let d = 1; d <= TODAY; d++) { for (const t of f.tx) if (t.d === d) bal += t.a; pts.push([d, r2(bal)]); }
    const top = niceTop(Math.max(...pts.map((p) => p[1])) * 1.22), X = (d) => (d / TODAY) * 100, Y = (v) => 100 - (Math.max(0, v) / top) * 100;
    let line = `M0 ${Y(pts[0][1]).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) line += ` H${X(pts[i][0]).toFixed(2)} V${Y(pts[i][1]).toFixed(2)}`;
    const incomes = f.tx.filter((t) => t.cat === "Income").map((t) => { const x = X(t.d); return `<span class="fh-fl-in ${x < 18 ? "l" : ""}" style="left:${x}%;top:${Y(pts[t.d][1])}%">${ico("up", 11)}${esc(t.m.split(" · ")[0])} ${eur0(t.a)}</span>`; }).join("");
    const lo = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
    return `<div class="fh-flow" role="img" aria-label="Current account balance through ${MONTH}: opened at ${eur0(f.c.opening)}, lowest ${eur0(lo[1])} on ${lo[0] || 1} ${MONTH.slice(0, 3)}, ${eur0(f.balance)} today.">
      <div class="fh-fl-plot" aria-hidden="true">
        <span class="fh-fl-grid" style="top:0"><em>${kfmt(top)}</em></span><span class="fh-fl-grid" style="top:50%"><em>${kfmt(top / 2)}</em></span><span class="fh-fl-grid base" style="top:100%"></span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="fh-flg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9F26B" stop-opacity=".34"/><stop offset="1" stop-color="#C9F26B" stop-opacity="0"/></linearGradient></defs>
          <path d="${line} V100 H0 Z" fill="url(#fh-flg)"/><path d="${line}" class="fh-fl-line"/></svg>
        ${incomes}<i class="fh-fl-dot" style="left:100%;top:${Y(f.balance)}%"></i>
      </div>
      <div class="fh-fl-x" aria-hidden="true"><span>1 Oct</span><span>8</span><span>15</span><span>22</span><span>Today</span></div></div>`;
  }

  // Card payments by day, stacked by category: the month's rhythm at a glance.
  function dayChart(f, sel) {
    const days = Array.from({ length: TODAY }, (_, i) => { const d = i + 1, tx = f.tx.filter((t) => t.d === d && t.how === "card" && SPEND.includes(t.cat)); return { d, tx, sum: r2(tx.reduce((s, t) => s - t.a, 0)) }; });
    const max = Math.max(...days.map((x) => x.sum), 1), peak = days.reduce((m, x) => (x.sum > m.sum ? x : m), days[0]);
    return `<div class="fh-days" role="img" aria-label="Card payments by day in ${MONTH}. Highest day ${eur0(peak.sum)} on ${peak.d} ${MONTH.slice(0, 3)}.">
      <div class="fh-days-cols" aria-hidden="true">${days.map((x) => `<span class="fh-day ${x.d === TODAY ? "today" : ""}">${SPEND.map((c) => { const v = x.tx.filter((t) => t.cat === c).reduce((s, t) => s - t.a, 0); return v ? `<i class="${sel !== "All" && sel !== c ? "dim" : ""}" data-fh-m="day${x.d}-${c}" data-fh-from="--fhv:0" style="--fhv:${((v / max) * 100).toFixed(2)};background:${CATS[c].c}"></i>` : ""; }).join("")}</span>`).join("")}</div>
      <div class="fh-fl-x" aria-hidden="true"><span>1</span><span>8</span><span>15</span><span>22</span><span>${TODAY}</span></div></div>`;
  }

  /* ---------- Views ---------- */
  function txList(list, max) {
    const rows = list.slice().sort((a, b) => b.d - a.d || (b.sim ? 1 : 0) - (a.sim ? 1 : 0)).slice(0, max || 99);
    if (!rows.length) return `<p class="fh-empty">No ${ui.cat.toLowerCase()} payments this month.</p>`;
    let day = null, out = "";
    for (const t of rows) {
      if (t.d !== day) { day = t.d; out += `<li class="fh-tx-day">${t.d === TODAY ? "Today" : weekday(t.d)} · ${t.d} Oct</li>`; }
      const back = t.rate ? r2(-t.a * t.rate) : 0;
      out += `<li class="${t.sim ? "new" : ""}"><span class="fh-tx-i" style="--cc:${catColor(t.cat)}">${catIco(t)}</span><span class="fh-tx-m"><b>${esc(t.m)}</b><small><i style="background:${catColor(t.cat)}"></i>${t.cat}${t.how === "card" ? " · card" : t.how === "dd" ? " · direct debit" : t.how === "tr" ? " · transfer" : ""}</small></span><span class="fh-tx-a ${t.a > 0 ? "in" : ""}"><b>${eur(t.a, true)}</b>${back ? `<small>${Math.round(t.rate * 100)}% · ${eur(back)} back</small>` : ""}</span></li>`;
    }
    return `<ul class="fh-tx">${out}</ul>`;
  }
  function simPanel(f) {
    const frozen = ui.frozen[S.cust];
    return `<section class="fh-card fh-sim ${frozen ? "is-frozen" : ""}"><header><h4>Simulate a card payment</h4><span class="fh-sub">${frozen ? `<span class="fh-pill ice">${ico("snow", 12)}Card frozen</span>` : "Eligible for cashback · demo only"}</span></header>
      ${frozen ? `<p class="fh-frozen-note">Payments will be declined while the card is frozen. <button type="button" class="fh-link" data-fh-freeze>Unfreeze card</button></p>` : ""}
      <div class="fh-sims">${f.c.sims.map(([m, what, cat, amt], i) => `<button type="button" data-fh-pay="${i}" ${amt > f.balance ? "disabled" : ""}><span class="fh-tx-i" style="--cc:${CATS[cat].c}">${ico(CATS[cat].i, 16)}</span><span><b>${esc(m)}</b><small>${esc(what)} · ${cat}</small></span><em>${eur(amt)}</em><span class="fh-sims-go" aria-hidden="true">Pay</span></button>`).join("")}</div></section>`;
  }
  function progFor(o, f) { const [t, a, b] = o.rule; return t === "cat" ? f.cats[a] / b : t === "savings" ? f.savings / a : t === "income" ? f.incomeCount / a : 1; }
  const meter = (o, f, key) => `<span class="fh-meter" role="img" aria-label="${Math.min(100, Math.round(progFor(o, f) * 100))}% of the way to unlocking"><i data-fh-m="${key}" data-fh-from="--fhv:0" style="--fhv:${Math.min(100, progFor(o, f) * 100).toFixed(1)}"></i></span>`;
  function miniCard(f) {
    const frozen = ui.frozen[S.cust];
    return `<button type="button" class="fh-mini k-${S.cust} ${frozen ? "frozen" : ""}" data-fh-view="card"><span class="fh-mini-pl" aria-hidden="true"><i></i></span><span><small>${esc(f.c.card.name)}</small><b>•••• ${CARDNO[S.cust]}</b></span><span class="fh-pill ${frozen ? "ice" : "ok"}">${frozen ? "Frozen" : "Active"}</span></button>`;
  }
  function overview(f) {
    const best = f.c.offers.map((o) => ({ o, s: offerState(o, f) })).find((x) => x.s.ok && !f.d.active[x.o.id]) || f.c.offers.map((o) => ({ o, s: offerState(o, f) })).find((x) => !f.d.active[x.o.id]);
    const sh = SPEND.filter((x) => f.cats[x]);
    return `<div class="fh-hello"><div><small>Good evening</small><h3 class="fh-h" tabindex="-1">${esc(f.c.full.split(" ")[0])}</h3></div><p>Friday ${TODAY} ${MONTH}</p></div>
    <div class="fh-hero">
      <section class="fh-acc main" aria-label="Current account">
        <div class="fh-hero-top"><div><small>Current account</small><b>${big(f.balance)}</b></div>
          <div class="fh-safe"><span>Safe to spend until payday: <strong>${eur(f.safe)}</strong></span><i>after ${f.c.upcoming.map((u) => `${u[0]} ${eur0(u[1])} on ${u[2]}`).join(", ")}</i></div></div>
        ${cashflow(f)}
        <div class="fh-hero-foot"><span><em>Money in</em> ${eur(f.credits, true)}</span><span><em>Money out</em> ${eur(-f.debits)}</span><span><em>Opened</em> ${eur(f.c.opening)}</span></div>
      </section>
      <div class="fh-stack">
        <section class="fh-acc"><small>Savings · ${esc(f.goal.name)}</small><b>${big(f.savings)}</b><span class="fh-bar"><i data-fh-m="ov-sav" data-fh-from="--fhv:0" style="--fhv:${f.goal.pct.toFixed(2)}"></i></span><i>${Math.round(f.goal.pct)}% of ${eur0(f.goal.target)}</i></section>
        <section class="fh-acc"><small>Cashback this month</small><b>${big(f.cashback)}</b><span class="fh-bar cb"><i data-fh-m="ov-cb" data-fh-from="--fhv:0" style="--fhv:${((f.cashback / CAP) * 100).toFixed(2)}"></i></span><i>Paid on 1 Nov · cap ${eur0(CAP)}</i></section>
        ${miniCard(f)}
      </div>
    </div>
    <div class="fh-grid two">
      <section class="fh-card"><header><h4>Spending in ${MONTH}</h4><button type="button" class="fh-link" data-fh-view="spending">See details</button></header>
        <div class="fh-ov-spend">${donut(f, "All")}<ul class="fh-legend">${sh.map((x) => `<li><i style="background:${CATS[x].c}"></i><span>${x}</span><em>${Math.round((f.cats[x] / f.spent) * 100)}%</em><b>${eur0(f.cats[x])}</b></li>`).join("")}</ul></div>
        <h5 class="fh-k fh-k-gap">Card payments by day</h5>${dayChart(f, "All")}
        <p class="fh-insight"><span class="fh-pill ${f.spent <= f.lastTotal ? "ok" : "warn"}">${f.spent <= f.lastTotal ? "Down" : "Up"} ${Math.abs(pct(f.spent, f.lastTotal))}% on ${PREV}</span> ${topCat(f)}</p></section>
      <section class="fh-card"><header><h4>Recent activity</h4><button type="button" class="fh-link" data-fh-view="spending">All transactions</button></header>${txList(f.tx, 4)}</section>
    </div>
    <div class="fh-grid two">
      ${simPanel(f)}
      ${best ? `<section class="fh-card fh-offer-hi ${best.s.ok ? "" : "locked"}"><header><h4>For you</h4><span class="fh-sub">Based on your own ${MONTH} activity</span></header><span class="fh-of-badge" aria-hidden="true">${ico(best.s.ok ? "offers" : "lock", 18)}</span><b>${esc(best.o.title)}</b><p>${esc(best.o.why(f))}</p>${best.s.ok ? "" : meter(best.o, f, "hi-" + best.o.id)}<button type="button" class="fh-btn ${best.s.ok ? "" : "ghost"}" data-fh-offer="${best.o.id}">${best.s.ok ? "Explore offer" : needLabel(best.o, best.s)}</button></section>` : ""}
    </div>`;
  }
  const topCat = (f) => { const top = SPEND.filter((x) => x !== "Bills").sort((a, b) => f.cats[b] - f.cats[a])[0]; return `${top} is your biggest everyday category at ${eur0(f.cats[top])}.`; };
  function spending(f) {
    const sel = ui.cat, list = sel === "All" ? f.tx : f.tx.filter((t) => t.cat === sel), maxBar = Math.max(...SPEND.map((x) => Math.max(f.cats[x], f.c.last[x])), 1);
    const ins = sel === "All"
      ? [`${eur(f.spent)} spent in ${MONTH}, ${delta(f.spent, f.lastTotal)}.`, topCat(f), `Bills take ${Math.round((f.cats.Bills / f.spent) * 100)}% of your spending.`]
      : [`${eur(f.cats[sel])} on ${sel.toLowerCase()} in ${MONTH}, ${delta(f.cats[sel], f.c.last[sel])}.`, f.count[sel] ? `${f.count[sel]} payment${f.count[sel] > 1 ? "s" : ""}, ${eur(f.cats[sel] / f.count[sel])} on average.` : "No payments yet this month.", `Cashback earned on ${sel.toLowerCase()}: ${eur(f.byCat[sel])} at ${Math.round(rateFor(S.cust, sel) * 100)}%.`];
    return `<h3 class="fh-h" tabindex="-1">Spending</h3>
    <div class="fh-chips" role="group" aria-label="Category">${["All", ...SPEND].map((x) => `<button type="button" data-fh-cat="${x}" aria-pressed="${sel === x}" style="--cc:${CATS[x]?.c || "#0F131C"}">${x === "All" ? "All" : ico(CATS[x].i, 14) + x}${x === "All" ? "" : `<span class="fh-chip-v">${eur0(f.cats[x])}</span>`}</button>`).join("")}</div>
    <div class="fh-grid spend">
      <section class="fh-card fh-viz"><div class="fh-viz-top">${donut(f, sel)}<ul class="fh-insights" aria-live="polite">${ins.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        <h5 class="fh-k">Card payments by day</h5>${dayChart(f, sel)}
        <h5 class="fh-k fh-k-gap">${MONTH} vs ${PREV}</h5>
        <ul class="fh-mom">${SPEND.map((x) => `<li class="${sel !== "All" && sel !== x ? "dim" : ""}"><span>${x}</span><span class="fh-mom-b"><i data-fh-m="mom-${x}" data-fh-from="--fhv:0" style="--fhv:${((f.cats[x] / maxBar) * 100).toFixed(2)};background:${CATS[x].c}"></i><i class="last" style="--fhv:${((f.c.last[x] / maxBar) * 100).toFixed(2)}"></i></span><b>${eur0(f.cats[x])}</b></li>`).join("")}</ul>
        <p class="fh-key"><i></i>${MONTH} <i class="last"></i>${PREV}</p></section>
      <section class="fh-card"><header><h4>${sel === "All" ? "All transactions" : sel}</h4><span class="fh-sub">${list.length} this month</span></header>${txList(list)}
        <p class="fh-recon">Balance check: ${eur(f.c.opening)} opening + ${eur(f.credits)} in − ${eur(f.debits)} out = <b>${eur(f.balance)}</b></p></section>
    </div>
    ${simPanel(f)}`;
  }
  // Guilloche rosette + wave lines, drawn once as inline SVG: the engraved security-print feel of a card.
  const GUILLOCHE = (() => {
    let s = '<svg class="fh-pl-art" viewBox="0 0 340 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".6">';
    for (let i = 0; i < 24; i++) s += `<ellipse cx="0" cy="0" rx="118" ry="42" transform="translate(284 40) rotate(${i * 7.5})"/>`;
    for (let j = 0; j < 9; j++) { let p = `M-10 ${150 + j * 7}`; for (let x = 0; x <= 360; x += 10) p += ` L${x} ${(150 + j * 7 + Math.sin((x + j * 14) / 22) * 8).toFixed(1)}`; s += `<path d="${p}"/>`; }
    return s + "</g></svg>";
  })();
  const CHIP = '<svg class="fh-pl-chip" viewBox="0 0 46 34" aria-hidden="true"><defs><linearGradient id="fh-chipg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3E3B5"/><stop offset=".5" stop-color="#C9A962"/><stop offset="1" stop-color="#E8D49C"/></linearGradient></defs><rect x=".5" y=".5" width="45" height="33" rx="6.5" fill="url(#fh-chipg)" stroke="rgba(0,0,0,.25)"/><path d="M0 12h14M0 22h14M32 12h14M32 22h14M14 0v34M32 0v34M14 17h18" stroke="rgba(80,60,20,.45)" stroke-width="1" fill="none"/></svg>';
  const WAVES = '<svg class="fh-pl-nfc" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7.5a6.5 6.5 0 0 1 0 9M11.5 5a10 10 0 0 1 0 14M15 2.5a13.5 13.5 0 0 1 0 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function cardView(f) {
    const act = f.c.offers.filter((o) => o.cat && f.d.active[o.id]), frozen = !!ui.frozen[S.cust], no = CARDNO[S.cust];
    const cardTx = f.tx.filter((t) => t.how === "card"), cardSpend = r2(cardTx.reduce((s, t) => s - t.a, 0));
    return `<h3 class="fh-h" tabindex="-1">Card & benefits</h3>
    <div class="fh-grid card">
      <div class="fh-cardside">
        <div class="fh-cardstage" data-fh-tilt>
          <div class="fh-plastic k-${S.cust} ${frozen ? "frozen" : ""}" role="img" aria-label="${esc(f.c.card.name)} ending ${no}, fictional card, ${frozen ? "frozen" : "active"}${ui.flip ? ", showing the back" : ""}">
            <div class="fh-pl-in" data-fh-m="plastic" style="--flip:${ui.flip ? 180 : 0}deg;--fhz:${frozen ? 1 : 0}">
              <div class="fh-pl-face front">${GUILLOCHE}
                <div class="fh-pl-row"><span class="fh-pl-brand">${LOGO}Calder</span>${WAVES}</div>
                ${CHIP}
                <span class="fh-pl-num">•••• •••• •••• ${no}</span>
                <div class="fh-pl-row end"><span class="fh-pl-name"><small>${esc(f.c.card.name)}</small>${esc(f.c.full)}</span><span class="fh-pl-tier">Debit<small>Valid thru 10/30</small></span></div>
              </div>
              <div class="fh-pl-face back"><span class="fh-pl-stripe"></span>
                <div class="fh-pl-sig"><span></span><b>CVC •••</b></div>
                <p>Fictional card for a design demo. Not a payment instrument. Calder is not a real bank.</p>
                <span class="fh-pl-brand sm">${LOGO}Calder</span>
              </div>
              <div class="fh-frost" aria-hidden="true">${ico("snow", 28)}<b>Frozen</b></div>
            </div>
          </div>
        </div>
        <div class="fh-card-ctl" role="group" aria-label="Card controls">
          <button type="button" class="fh-ctl ${frozen ? "on" : ""}" data-fh-freeze aria-pressed="${frozen}">${ico("snow", 16)}<span><b>Freeze card</b><small>${frozen ? "On · payments declined" : "Off · card works as normal"}</small></span><i class="fh-sw" aria-hidden="true"></i></button>
          <button type="button" class="fh-ctl" data-fh-flip aria-pressed="${ui.flip}">${ico("flip", 16)}<span><b>${ui.flip ? "Show front" : "Show back"}</b><small>Card details stay masked</small></span></button>
        </div>
      </div>
      <section class="fh-card"><header><h4>Your cashback rates</h4><span class="fh-sub">${cardTx.length} card payments · ${eur(cardSpend)}</span></header>
        <ul class="fh-rates">${SPEND.map((x) => { const r = rateFor(S.cust, x); return `<li><span class="fh-tx-i" style="--cc:${CATS[x].c}">${ico(CATS[x].i, 16)}</span><span>${x}${x === f.c.card.boost ? " <em>card boost</em>" : ""}${act.find((o) => o.cat === x) ? " <em class=\"on\">offer active</em>" : ""}</span><span class="fh-rate-pips" aria-hidden="true">${[1, 2, 3, 4, 5].map((p) => `<i class="${p <= Math.round(r * 100) ? "on" : ""}" style="--cc:${CATS[x].c}"></i>`).join("")}</span><b>${Math.round(r * 100)}%</b></li>`; }).join("")}</ul>
        <p class="fh-fine">Rates apply to card payments. Direct debits and transfers don't earn cashback. Monthly cap ${eur0(CAP)}.</p></section>
    </div>
    <section class="fh-card"><header><h4>Cashback earned in ${MONTH}</h4><span class="fh-sub">${eur(f.earned)} earned${f.earned > CAP ? `, capped at ${eur(CAP)}` : ""}</span></header>
      <div class="fh-cap"><span class="fh-cap-bar" role="img" aria-label="${eur(f.cashback)} of the ${eur0(CAP)} monthly cap">${SPEND.filter((x) => f.byCat[x]).map((x) => `<i data-fh-m="cap-${x}" data-fh-from="--fhv:0" style="--fhv:${((Math.min(f.byCat[x], CAP) / CAP) * 100).toFixed(2)};background:${CATS[x].c}" title="${x}"></i>`).join("")}</span><span class="fh-cap-l"><b>${eur(f.cashback)}</b> of ${eur0(CAP)} cap</span></div>
      <ul class="fh-cb">${SPEND.filter((x) => f.byCat[x]).map((x) => `<li><span><i style="background:${CATS[x].c}"></i>${x}</span><span class="fh-cb-b"><i data-fh-m="cb-${x}" data-fh-from="--fhv:0" style="--fhv:${((f.byCat[x] / Math.max(...SPEND.map((y) => f.byCat[y]), 0.01)) * 100).toFixed(2)};background:${CATS[x].c}"></i></span><b>${eur(f.byCat[x])}</b></li>`).join("")}</ul>
      <p class="fh-recon">${SPEND.filter((x) => f.byCat[x]).map((x) => eur(f.byCat[x])).join(" + ")} = <b>${eur(f.earned)}</b>${f.earned > CAP ? ` → ${eur(CAP)} after cap` : ""}</p></section>`;
  }
  // Month-by-month path to the goal: what's saved, what the plan adds, where it lands.
  function plan(f) {
    const g = f.goal, n = g.months, cols = [];
    for (let i = 0; i <= n; i++) cols.push(Math.min(g.target, f.savings + g.monthly * i));
    const lab = (i) => { if (i === 0) return "Now"; if (i === n) return g.by.replace(" 20", " ’"); const m = new Date(2026, 9 + i, 1); return i % 3 === 0 ? m.toLocaleString("en-GB", { month: "short" }) : ""; };
    return `<div class="fh-plan"><div class="fh-plan-head"><small class="fh-k">Your path</small><span>${g.left ? `${eur0(g.monthly)} × ${n} months` : "Reached"}</span></div>
      <div class="fh-plan-cols" role="img" aria-label="${eur0(f.savings)} saved now; ${g.left ? `${eur0(g.monthly)} a month reaches ${eur0(g.target)} by ${g.by}` : "goal reached"}.">
        <span class="fh-plan-goal" aria-hidden="true"><em>${eur0(g.target)}</em></span>
        ${cols.map((v, i) => `<span class="fh-pc ${i === 0 ? "now" : ""}" aria-hidden="true"><i data-fh-m="plan${i}" data-fh-from="--fhv:0;--fhs:0" style="--fhv:${((v / g.target) * 100).toFixed(2)};--fhs:${v ? ((Math.min(f.savings, v) / v) * 100).toFixed(2) : 0}"></i><small>${lab(i)}</small></span>`).join("")}
      </div>
      <p class="fh-key"><i class="sv"></i>Saved <i class="pl"></i>Planned</p></div>`;
  }
  function goals(f) {
    const g = f.goal, onTrack = f.toSavings >= g.monthly;
    return `<h3 class="fh-h" tabindex="-1">Goals</h3>
    <div class="fh-grid goal">
      <section class="fh-card fh-goal"><div class="fh-ring" data-fh-m="ring" data-fh-from="--fhp:0" style="--fhp:${g.pct.toFixed(2)}" role="img" aria-label="${Math.round(g.pct)}% saved"><b>${Math.round(g.pct)}%</b><small>saved</small></div>
        <div><small class="fh-k">${esc(g.name)} · by ${g.by}</small><b class="fh-goal-v">${big(f.savings)} <span>of ${eur0(g.target)}</span></b>
        <p>${g.left ? `Save <strong>${eur0(g.monthly)} a month</strong> for ${g.months} months to get there. ${onTrack ? `You moved ${eur0(f.toSavings)} this month, so you're on track.` : `You've moved ${eur0(f.toSavings)} this month, ${eur0(g.monthly - f.toSavings)} short of this month's step.`}` : "Goal reached. Choose a new target to keep going."}</p>
        <div class="fh-move" role="group" aria-label="Move money to this goal">${[50, 100, 250].map((a) => `<button type="button" class="fh-btn ghost sm" data-fh-move="${a}" ${a > f.balance ? "disabled" : ""}>Move ${eur0(a)}</button>`).join("")}</div></div>
        ${plan(f)}</section>
      <section class="fh-card"><header><h4>Set your goal</h4></header>
        <form class="fh-form" data-fh-goal>
          <label class="fh-field"><span>What are you saving for?</span><select name="name">${["Trip to Japan", "Family holiday", "Emergency buffer", "New laptop", "Home deposit"].map((n) => `<option${n === g.name ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="fh-field"><span>Target <output data-fh-tval>${eur0(g.target)}</output></span><input type="range" name="target" min="500" max="10000" step="100" value="${g.target}"></label>
          <label class="fh-field"><span>By</span><select name="by">${MONTHS.map((m) => `<option${m === g.by ? " selected" : ""}>${m}</option>`).join("")}</select></label>
          <span class="fh-preview" aria-hidden="true"><i data-fh-prev></i></span>
          <p class="fh-calc" data-fh-calc aria-live="polite"></p>
          <button type="submit" class="fh-btn">Save goal</button>
        </form></section>
    </div>`;
  }
  function offers(f) {
    return `<h3 class="fh-h" tabindex="-1">Offers for you</h3><p class="fh-lede">Chosen from your own ${MONTH} activity. Each one shows why, and what would unlock it.</p>
    <ul class="fh-offers">${f.c.offers.map((o) => { const s = offerState(o, f), on = f.d.active[o.id]; return `<li class="${on ? "on" : s.ok ? "ok" : "locked"}"><button type="button" data-fh-offer="${o.id}"><span class="fh-of-top"><span class="fh-of-i">${ico(on ? "check" : s.ok ? "offers" : "lock", 18)}</span><span class="fh-pill ${on ? "ok" : s.ok ? "lime" : ""}">${on ? "Active" : s.ok ? "Unlocked" : "Locked"}</span></span><span class="fh-of-t"><b>${esc(o.title)}</b><small>${on ? "Active" : s.ok ? "Available to you" : needLabel(o, s)}</small></span><span class="fh-of-why">${esc(o.why(f))}</span>${!on && !s.ok ? meter(o, f, "of-" + o.id) : ""}<span class="fh-of-go" aria-hidden="true">${on ? "View" : s.ok ? "Explore" : "See what unlocks it"}${ico("arrow", 14)}</span></button></li>`; }).join("")}</ul>`;
  }
  function offerSheet(f) {
    const o = f.c.offers.find((x) => x.id === ui.offer); if (!o) return "";
    const s = offerState(o, f), on = f.d.active[o.id];
    return `<div class="fh-sheet-bg" data-fh-close></div><div class="fh-sheet" role="dialog" aria-modal="true" aria-labelledby="fh-of-t"><button type="button" class="fh-x" data-fh-close aria-label="Close">${ico("x", 18)}</button>
      <small class="fh-k">Personalised offer · illustrative</small><h4 id="fh-of-t">${esc(o.title)}</h4>
      <div class="fh-why"><small class="fh-k">Why you're seeing this</small><p>${esc(o.why(f))}</p></div>
      ${!on && !s.ok ? meter(o, f, "sh-" + o.id) : ""}
      <dl class="fh-dl"><div><dt>Unlocks with</dt><dd>${o.rule[0] === "always" ? "Available to everyone" : esc(s.label)}</dd></div><div><dt>Status</dt><dd>${on ? "Active" : s.ok ? "Available now" : needLabel(o, s)}</dd></div>
      <div><dt>What changes</dt><dd>${o.cat ? `New ${o.cat.toLowerCase()} card payments earn ${Math.round(o.rate * 100)}% instead of ${Math.round((o.cat === f.c.card.boost ? f.c.card.rate : 0.01) * 100)}%.` : esc(o.effect)}</dd></div></dl>
      <button type="button" class="fh-btn" data-fh-activate="${o.id}" ${!s.ok || on ? "disabled" : ""}>${on ? "Active" : s.ok ? "Activate offer" : "Not unlocked yet"}</button>
      <p class="fh-fine">A demo offer for a fictional bank. Nothing is applied to a real account.</p></div>`;
  }

  /* ---------- Shell ---------- */
  const NAV = [["overview", "Overview"], ["spending", "Spending"], ["card", "Card & benefits"], ["goals", "Goals"], ["offers", "Offers"]];
  root.innerHTML = `<div class="fh-demo-bar"><span class="fh-k">Demo customer</span><div class="fh-people" role="group" aria-label="Choose a customer">${Object.entries(CUSTOMERS).map(([k, c]) => `<button type="button" data-fh-cust="${k}" aria-pressed="false"><span class="fh-av k-${k}" aria-hidden="true">${c.initials}</span><span><b>${c.name}</b><small>${c.role}</small></span></button>`).join("")}</div><button type="button" class="fh-reset" data-fh-reset>${ico("reset", 15)}Reset demo</button></div>
    <div class="fh-app">
      <aside class="fh-side"><div class="fh-logo">${LOGO}<span>Calder</span><small>Fictional bank</small></div>
        <nav class="fh-nav" aria-label="Banking">${NAV.map(([k, l]) => `<button type="button" data-fh-view="${k}">${ico(k)}<span>${l}</span></button>`).join("")}</nav>
        <div class="fh-side-foot" data-fh-me></div></aside>
      <div class="fh-main" data-fh-main></div>
      <div data-fh-layer></div>
    </div>
    <p class="fh-toast" role="status" aria-live="polite" data-fh-toast></p>`;
  const $ = (s) => root.querySelector(s), main = $("[data-fh-main]");
  const mq = (q) => typeof matchMedia === "function" && matchMedia(q).matches;

  // Motion memory: every animated figure carries a key. After a re-render it starts from the value it
  // showed last time and transitions to the new one, so a payment visibly moves bars, rings and the donut.
  const mem = {};
  function settle() {
    const still = mq("(prefers-reduced-motion: reduce)");
    root.querySelectorAll("[data-fh-m]").forEach((el) => {
      const k = el.dataset.fhM, to = el.getAttribute("style") || "", from = k in mem ? mem[k] : el.dataset.fhFrom ? `${to};${el.dataset.fhFrom}` : null;
      mem[k] = to;
      if (still || from == null || from === to || typeof el.animate !== "function") return;
      // Explicit from → to keyframes (Web Animations) so freshly rendered SVG and HTML both animate.
      const A = decl(from), B = decl(to), f0 = Object.fromEntries(Object.keys(B).map((p) => [p, p in A ? A[p] : B[p]]));
      try { el.animate([f0, B], { duration: 900, easing: "cubic-bezier(.22,.8,.2,1)" }); } catch {}
    });
  }
  const decl = (s) => Object.fromEntries(s.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(":"), k = d.slice(0, i).trim(); return [k.startsWith("--") ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), d.slice(i + 1).trim()]; }));
  function tilt() {
    const st = $("[data-fh-tilt]");
    if (!st || !mq("(hover: hover) and (pointer: fine)") || mq("(prefers-reduced-motion: reduce)")) return;
    st.addEventListener("pointermove", (e) => {
      const r = st.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      st.classList.add("live");
      st.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`); st.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
      st.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`); st.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    });
    st.addEventListener("pointerleave", () => { st.classList.remove("live"); ["--rx", "--ry", "--mx", "--my"].forEach((p) => st.style.removeProperty(p)); });
  }

  function goalCalc() {
    const form = $("[data-fh-goal]"); if (!form) return;
    const t = +form.target.value, by = form.by.value, f = figures(), m = monthsTo(by), left = Math.max(0, t - f.savings);
    form.querySelector("[data-fh-tval]").textContent = eur0(t);
    form.querySelector("[data-fh-calc]").innerHTML = left ? `${eur0(left)} to go → <b>${eur0(Math.ceil(left / m))} a month</b> for ${m} months` : `You already have ${eur0(f.savings)}. This goal is reached.`;
    const pv = form.querySelector("[data-fh-prev]"); if (pv) pv.style.setProperty("--fhv", Math.min(100, (f.savings / t) * 100).toFixed(2));
  }
  function render(focus) {
    const f = figures();
    root.querySelectorAll("[data-fh-cust]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fhCust === S.cust)));
    root.querySelectorAll(".fh-nav [data-fh-view]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.fhView === ui.view));
    $("[data-fh-me]").innerHTML = `<span class="fh-av k-${S.cust}" aria-hidden="true">${f.c.initials}</span><span><b>${esc(f.c.full)}</b><small>${esc(f.c.card.name)} · ${CARDNO[S.cust]}</small></span>`;
    main.innerHTML = { overview, spending, card: cardView, goals, offers }[ui.view](f);
    $("[data-fh-layer]").innerHTML = ui.offer ? offerSheet(f) : "";
    goalCalc();
    settle();
    if (ui.view === "card") tilt();
    const t = $("[data-fh-toast]");
    if (ui.toast) { t.className = "fh-toast on" + (ui.toast.bad ? " bad" : ""); t.innerHTML = `${esc(ui.toast.t)}${ui.toast.offer ? ` <button type="button" class="fh-link" data-fh-offer="${ui.toast.offer.id}">Unlocked: ${esc(ui.toast.offer.title)}</button>` : ""}`; clearTimeout(render.tt); render.tt = setTimeout(() => t.classList.remove("on"), 6000); ui.toast = null; }
    if (ui.offer) $(".fh-sheet .fh-btn:not([disabled]), .fh-sheet .fh-x")?.focus({ preventScroll: true });
    else if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }

  root.addEventListener("click", (e) => {
    const el = (s) => e.target.closest(s); let b;
    if ((b = el("[data-fh-cust]"))) { S.cust = b.dataset.fhCust; ui.cat = "All"; ui.offer = null; ui.flip = false; save(); return render(".fh-h"); }
    if ((b = el("[data-fh-view]"))) { ui.view = b.dataset.fhView; ui.offer = null; return render(".fh-h"); }
    if ((b = el("[data-fh-cat]"))) { ui.cat = b.dataset.fhCat; return render(`[data-fh-cat="${ui.cat}"]`); }
    if ((b = el("[data-fh-pay]"))) { pay(+b.dataset.fhPay); return render(`[data-fh-pay="${b.dataset.fhPay}"]`); }
    if ((b = el("[data-fh-move]"))) { transfer(+b.dataset.fhMove); return render(`[data-fh-move="${b.dataset.fhMove}"]`); }
    if ((b = el("[data-fh-freeze]"))) { const k = S.cust, nm = CUSTOMERS[k].card.name; ui.frozen[k] = !ui.frozen[k]; ui.toast = { t: ui.frozen[k] ? `${nm} frozen. Card payments are declined until you unfreeze it.` : `${nm} unfrozen. Card payments work again.` }; return render(ui.view === "card" ? "[data-fh-freeze]" : ".fh-h"); }
    if (el("[data-fh-flip]")) { ui.flip = !ui.flip; return render("[data-fh-flip]"); }
    if ((b = el("[data-fh-offer]"))) { ui.offer = b.dataset.fhOffer; ui.back = `[data-fh-offer="${ui.offer}"]`; return render(); }
    if ((b = el("[data-fh-activate]"))) { const f = figures(), o = f.c.offers.find((x) => x.id === b.dataset.fhActivate); if (o && offerState(o, f).ok) { S.data[S.cust].active[o.id] = true; save(); ui.toast = { t: `${o.title} is active. ${o.cat ? `New ${o.cat.toLowerCase()} payments earn ${Math.round(o.rate * 100)}%.` : o.effect}` }; } return render(); }
    if (el("[data-fh-close]")) { const back = ui.back; ui.offer = null; return render(back); }
    if (el("[data-fh-reset]")) { const c = S.cust; S = fresh(); S.cust = c; ui.cat = "All"; ui.offer = null; ui.frozen = {}; ui.flip = false; save(); ui.toast = { t: "Demo reset. All three customers are back to their starting figures." }; return render(".fh-h"); }
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
