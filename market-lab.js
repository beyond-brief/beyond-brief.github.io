// Opportunity Studio: a fictional savings market seen through three lenses, three customer segments
// and a sizing model whose assumptions are the controls. Every competitor, segment and number is
// illustrative, not research. Runs in the browser only; calls nothing, stores nothing and sends nothing.
(() => {
  const root = document.querySelector("[data-studio]");
  if (!root) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Data ---------- */
  // Positions are 0–100 on each lens: [x, y].
  const RIVALS = [
    { id: "A", name: "Large incumbent bank", pos: { price: [75, 45], speed: [25, 85], reward: [35, 40] } },
    { id: "B", name: "Incumbent's own app", pos: { price: [70, 72], speed: [55, 78], reward: [50, 45] } },
    { id: "C", name: "Neobank", pos: { price: [45, 86], speed: [90, 45], reward: [75, 55] } },
    { id: "D", name: "Price challenger", pos: { price: [18, 30], speed: [62, 34], reward: [60, 82] } },
    { id: "E", name: "Savings app", pos: { price: [60, 80], speed: [84, 38], reward: [82, 70] } },
    { id: "F", name: "Co-operative bank", pos: { price: [34, 40], speed: [38, 72], reward: [44, 60] } },
  ];
  const LENSES = {
    price: {
      label: "Price × digital", x: ["Low fees", "High fees"], y: ["Basic app", "Excellent app"],
      gap: { x: [0, 40], y: [56, 100], name: "Low fees, excellent app" },
      notes: ["Strong digital costs more. The two best-rated apps, C and E, sit at the higher-fee end.", "Low price means basic. D wins on price with a dated experience.", "Nobody owns the top-left corner: a simple, low-fee product with an excellent app."],
    },
    speed: {
      label: "Speed × trust", x: ["Slow to open", "Opens in minutes"], y: ["Less trusted", "Highly trusted"],
      gap: { x: [62, 100], y: [62, 100], name: "Opens in minutes, highly trusted" },
      notes: ["Trust is held by the slow. A and F are trusted, but opening an account takes days.", "Speed is held by the new. C and E open in minutes but haven't earned the same trust.", "B comes closest to both, but it's still a branch-first process in disguise."],
    },
    reward: {
      label: "Simplicity × reward", x: ["Complex terms", "Simple terms"], y: ["Low rate", "High rate"],
      gap: null,
      notes: ["This view is crowded. D, E and C already compete on simple, high-rate offers.", "Rate wars are easy to start and expensive to win.", "No opening here. A new product would have to compete on price alone."],
    },
  };
  const SEGMENTS = {
    young: { label: "Young professionals", note: "25–34, saving for a first home", share: 22, demand: { price: [28, 78, 17, 14], speed: [80, 74, 15, 14], reward: [72, 74, 16, 14] } },
    family: { label: "Families on a budget", note: "Saving monthly, price-sensitive", share: 30, demand: { price: [26, 50, 18, 14], speed: [48, 84, 16, 12], reward: [76, 50, 16, 15] } },
    retired: { label: "Retirees moving savings", note: "Larger balances, trust first", share: 18, demand: { price: [62, 36, 16, 14], speed: [26, 88, 16, 10], reward: [32, 68, 16, 14] } },
  };
  const ADULTS = 6_000_000, BALANCE = 6000, MARGIN = 0.015, LAUNCH = 12000;
  const ASSUME = [
    { key: "savers", label: "Save regularly", of: "of adults", min: 20, max: 60, def: 38 },
    { key: "segment", label: "Fit the segment", of: "of savers", min: 5, max: 50, def: 22 },
    { key: "switch", label: "Open to switching within three years", of: "of the segment", min: 5, max: 30, def: 12, weak: true },
    { key: "win", label: "Choose us by year three", of: "of switchers", min: 5, max: 40, def: 15 },
  ];

  let lens = "price", seg = "young";
  const val = Object.fromEntries(ASSUME.map((a) => [a.key, a.def]));

  /* ---------- Analysis ---------- */
  // Share of a segment's demand ellipse that falls inside the lens's empty zone, plus rivals inside the ellipse.
  function fit(lensKey, segKey) {
    const L = LENSES[lensKey], [cx, cy, rx, ry] = SEGMENTS[segKey].demand[lensKey];
    let inside = 0, total = 0;
    for (let x = cx - rx; x <= cx + rx; x += 1) for (let y = cy - ry; y <= cy + ry; y += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      total++;
      if (L.gap && x >= L.gap.x[0] && x <= L.gap.x[1] && y >= L.gap.y[0] && y <= L.gap.y[1]) inside++;
    }
    const rivals = RIVALS.filter((r) => { const [x, y] = r.pos[lensKey]; return ((x - cx) / (rx + 6)) ** 2 + ((y - cy) / (ry + 6)) ** 2 <= 1; });
    const pct = Math.round((inside / total) * 100);
    const level = pct >= 60 && rivals.length === 0 ? "strong" : pct >= 25 ? "partial" : "weak";
    return { pct, rivals, level };
  }
  const best = (segKey) => Object.keys(LENSES).map((k) => ({ k, ...fit(k, segKey) })).sort((a, b) => b.pct - a.pct || a.rivals.length - b.rivals.length)[0];
  function size() {
    const savers = ADULTS * val.savers / 100, segment = savers * val.segment / 100, switchers = segment * val.switch / 100, customers = switchers * val.win / 100;
    return { savers, segment, switchers, customers, deposits: customers * BALANCE, revenue: customers * BALANCE * MARGIN };
  }
  function verdict() {
    const b = best(seg), s = size();
    if (b.level === "weak") return { tone: "no", title: "Don't enter yet", why: `None of the three views shows an opening that ${SEGMENTS[seg].label.toLowerCase()} would move into.`, next: "Look for a different segment, or a lens we haven't drawn yet, before spending on a product." };
    if (b.level === "strong" && s.customers >= LAUNCH) return { tone: "go", title: "Build a pilot", why: `A clear opening in the ${LENSES[b.k].label.toLowerCase()} view, and roughly ${fmt(s.customers)} customers by year three.`, next: "A twelve-week pilot with one product, one channel and a success measure agreed up front." };
    return { tone: "test", title: "Test demand first", why: s.customers < LAUNCH ? `The opening is real, but about ${fmt(s.customers)} customers by year three is below the 12,000 a launch would need.` : `The size works, but the fit is only partial: rivals sit close to what this segment wants.`, next: "Prove the weakest assumption before building: a landing-page demand test and twelve customer interviews." };
  }
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (Math.round(n / 100) / 10).toFixed(1) + "k" : String(Math.round(n));
  const money = (n) => "$" + fmt(n);

  /* ---------- Render ---------- */
  const map = root.querySelector("[data-map]");
  const segBtns = () => Object.entries(SEGMENTS).map(([k, s]) => `<button type="button" data-seg="${k}" aria-pressed="false"><b>${s.label}</b><small>${s.note}</small></button>`).join("");
  root.querySelector("[data-lenses]").innerHTML = Object.entries(LENSES).map(([k, l]) => `<button type="button" data-lens="${k}" aria-pressed="false">${l.label}</button>`).join("");
  root.querySelectorAll("[data-segs]").forEach((el) => (el.innerHTML = segBtns()));
  map.innerHTML = `<div class="om-plot">
      <span class="om-gap"><b></b></span><span class="om-demand"></span>
      ${RIVALS.map((r) => `<span class="om-dot" data-r="${r.id}"><i>${r.id}</i><em>${esc(r.name)}</em></span>`).join("")}
    </div>
    <span class="om-ax om-x0"></span><span class="om-ax om-x1"></span><span class="om-ax om-y0"></span><span class="om-ax om-y1"></span>`;
  root.querySelector("[data-key]").innerHTML = RIVALS.map((r) => `<li><i>${r.id}</i>${esc(r.name)}</li>`).join("");
  root.querySelector("[data-assume]").innerHTML = ASSUME.map((a) => `
    <div class="sz-row${a.weak ? " weak" : ""}">
      <label for="sz-${a.key}"><b>${a.label}</b><small>${a.of}${a.weak ? ' · <span class="sz-flag">least evidence</span>' : ""}</small></label>
      <div class="sz-ctl"><input type="range" id="sz-${a.key}" data-assume-key="${a.key}" min="${a.min}" max="${a.max}" step="1" value="${a.def}"><output for="sz-${a.key}" data-out="${a.key}"></output></div>
      <span class="sz-res" data-res="${a.key}"></span>
    </div>`).join("");

  const $ = (s) => root.querySelector(s);
  const place = (el, x, y) => { el.style.left = x + "%"; el.style.top = 100 - y + "%"; };

  function render() {
    const L = LENSES[lens], S = SEGMENTS[seg], f = fit(lens, seg);
    root.dataset.lens = lens;
    root.querySelectorAll("[data-lens]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lens === lens)));
    root.querySelectorAll("[data-seg]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seg === seg)));

    // Map
    RIVALS.forEach((r) => { const [x, y] = r.pos[lens]; const d = map.querySelector(`[data-r="${r.id}"]`); place(d, x, y); d.classList.toggle("near", f.rivals.includes(r)); d.classList.toggle("flip", x > 70); });
    const g = $(".om-gap");
    if (L.gap) { g.hidden = false; g.style.left = L.gap.x[0] + "%"; g.style.width = L.gap.x[1] - L.gap.x[0] + "%"; g.style.top = 100 - L.gap.y[1] + "%"; g.style.height = L.gap.y[1] - L.gap.y[0] + "%"; g.querySelector("b").textContent = "Opening"; }
    else g.hidden = true;
    const [cx, cy, rx, ry] = S.demand[lens], d = $(".om-demand");
    d.style.left = cx - rx + "%"; d.style.top = 100 - cy - ry + "%"; d.style.width = rx * 2 + "%"; d.style.height = ry * 2 + "%";
    d.dataset.level = f.level;
    $(".om-x0").textContent = L.x[0]; $(".om-x1").textContent = L.x[1] + " →"; $(".om-y0").textContent = L.y[0]; $(".om-y1").textContent = "↑ " + L.y[1];
    $("[data-map-desc]").textContent = `${L.label} view. ${RIVALS.map((r) => `${r.id}, ${r.name}: ${L.x[0].toLowerCase()} to ${L.x[1].toLowerCase()} ${r.pos[lens][0]}, ${L.y[0].toLowerCase()} to ${L.y[1].toLowerCase()} ${r.pos[lens][1]}`).join("; ")}. ${L.gap ? `Empty zone: ${L.gap.name}.` : "No empty zone in this view."} ${S.label} demand: ${f.pct}% inside the empty zone.`;

    // Reading panel
    $("[data-notes]").innerHTML = L.notes.map((n) => `<li>${esc(n)}</li>`).join("");
    const lvl = { strong: "Strong fit", partial: "Partial fit", weak: "No fit" }[f.level];
    $("[data-fit]").innerHTML = `<span class="om-k">${esc(S.label)} in this view</span>
      <p class="om-fit ${f.level}"><b>${lvl}</b><span>${L.gap ? `${f.pct}% of their demand sits in the opening` : "There's no opening in this view"}${f.rivals.length ? `; ${f.rivals.length === 1 ? "rival" : "rivals"} ${f.rivals.map((r) => r.id).join(", ")} already ${f.rivals.length === 1 ? "sits" : "sit"} close by` : L.gap ? "; no rival close by" : ""}.</span></p>
      <div class="om-meter" aria-hidden="true"><i style="width:${f.pct}%"></i></div>`;

    // Sizing
    const s = size(), res = { savers: s.savers, segment: s.segment, switch: s.switchers, win: s.customers };
    ASSUME.forEach((a) => { $(`[data-out="${a.key}"]`).textContent = val[a.key] + "%"; $(`[data-res="${a.key}"]`).textContent = fmt(res[a.key]); $(`#sz-${a.key}`).style.setProperty("--p", ((val[a.key] - a.min) / (a.max - a.min)) * 100 + "%"); });
    $("[data-total]").innerHTML = `<div><span class="om-k">Customers by year three</span><b>${fmt(s.customers)}</b></div><div><span class="om-k">Deposits</span><b>${money(s.deposits)}</b></div><div><span class="om-k">Revenue a year</span><b>${money(s.revenue)}</b></div>`;
    const v = verdict(), b = best(seg);
    $("[data-verdict]").dataset.tone = v.tone;
    const SCALE = 30000, at = (n) => Math.min(100, (n / SCALE) * 100);
    $("[data-verdict]").innerHTML = `<span class="om-k">Recommendation · ${esc(S.label)}</span><h3>${v.title}<span class="dot">.</span></h3><p>${esc(v.why)}</p>
      <div class="sz-gauge" aria-hidden="true"><div class="sz-track"><i style="width:${at(s.customers)}%"></i><span class="sz-line" style="left:${at(LAUNCH)}%"></span></div>
        <div class="sz-scale"><span>0</span><span style="left:${at(LAUNCH)}%">Launch line ${fmt(LAUNCH)}</span><span>${fmt(SCALE)}+</span></div></div>
      <dl><div><dt>Best view</dt><dd>${esc(LENSES[b.k].label)} · ${{ strong: "strong", partial: "partial", weak: "no" }[b.level]} fit</dd></div><div><dt>Weakest assumption</dt><dd>${val.switch}% open to switching</dd></div><div><dt>Next step</dt><dd>${esc(v.next)}</dd></div></dl>`;
  }

  root.addEventListener("click", (e) => {
    const l = e.target.closest("[data-lens]"), sg = e.target.closest("[data-seg]");
    if (l) { lens = l.dataset.lens; render(); }
    if (sg) { seg = sg.dataset.seg; val.segment = SEGMENTS[seg].share; $("#sz-segment").value = val.segment; render(); }
  });
  root.addEventListener("input", (e) => {
    const k = e.target.dataset.assumeKey;
    if (k) { val[k] = +e.target.value; render(); }
  });
  root.querySelector("[data-sz-reset]").addEventListener("click", () => {
    ASSUME.forEach((a) => { val[a.key] = a.key === "segment" ? SEGMENTS[seg].share : a.def; $(`#sz-${a.key}`).value = val[a.key]; });
    render();
  });
  render();
})();
