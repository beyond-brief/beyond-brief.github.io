// Beauty Experience Studio: booking and membership for a fictional three-studio salon brand.
// One state model: a booked slot is taken for everyone, rescheduling frees the old slot, cancelling
// frees it again, and checking in moves a visit to history and advances the membership.
// All studios, specialists, prices and visits are illustrative. Nothing is booked or sent.
(() => {
  const root = document.querySelector("[data-beauty-studio]");
  if (!root) return;

  /* CORE START */
  const KEY = "bb-beauty-studio-v1";
  const LOCS = [
    { id: "old", name: "Old Town", addr: "12 Lantern Lane", hours: "Tue–Sat · 10:00–19:00", art: "arch" },
    { id: "river", name: "Riverside", addr: "4 Quay Walk", hours: "Mon–Sat · 10:00–19:00", art: "awning" },
    { id: "north", name: "Northgate", addr: "88 Arbour Street", hours: "Mon–Sat · 10:00–19:00", art: "round" },
  ];
  const CATS = ["Hair", "Skin", "Body", "Nails"];
  const TREATS = [
    { id: "cut", cat: "Hair", name: "Precision cut & finish", min: 60, price: 65, note: "Consultation, cut and a hand-finished blow-dry." },
    { id: "gloss", cat: "Hair", name: "Gloss & tone", min: 75, price: 85, note: "Adds shine and softens brassiness between colours." },
    { id: "facial", cat: "Skin", name: "Restorative facial", min: 60, price: 95, note: "Cleanse, gentle peel, massage and a calming mask." },
    { id: "glow", cat: "Skin", name: "Express glow", min: 30, price: 45, note: "A short facial for a brighter finish before an event." },
    { id: "deep", cat: "Body", name: "Deep-tissue massage", min: 60, price: 90, note: "Slow, firm work on back, neck and shoulders." },
    { id: "stone", cat: "Body", name: "Hot-stone ritual", min: 90, price: 130, note: "Full-body massage with warmed basalt stones." },
    { id: "mani", cat: "Nails", name: "Signature manicure", min: 45, price: 40, note: "Shape, cuticle care and a long-wear polish." },
  ];
  const SPECS = [
    { id: "selin", name: "Selin Kaya", loc: "old", title: "Senior stylist", cats: ["Hair", "Nails"], yrs: 11, hue: 0 },
    { id: "mara", name: "Mara Dunn", loc: "old", title: "Skin therapist", cats: ["Skin"], yrs: 8, hue: 1 },
    { id: "emil", name: "Emil Ross", loc: "old", title: "Massage therapist", cats: ["Body"], yrs: 6, hue: 2 },
    { id: "aiko", name: "Aiko Tan", loc: "river", title: "Colour specialist", cats: ["Hair"], yrs: 9, hue: 3 },
    { id: "jonah", name: "Jonah Pike", loc: "river", title: "Body & skin therapist", cats: ["Body", "Skin"], yrs: 7, hue: 2 },
    { id: "nadia", name: "Nadia Ferro", loc: "river", title: "Nail & skin artist", cats: ["Nails", "Skin"], yrs: 5, hue: 1 },
    { id: "ines", name: "Inès Vidal", loc: "north", title: "Stylist & skin therapist", cats: ["Hair", "Skin"], yrs: 10, hue: 3 },
    { id: "tomas", name: "Tomás Bell", loc: "north", title: "Massage therapist", cats: ["Body"], yrs: 12, hue: 0 },
    { id: "rana", name: "Rana Saleh", loc: "north", title: "Nail artist", cats: ["Nails"], yrs: 4, hue: 1 },
  ];
  // Six bookable days after the demo's "today" (Friday 30 October 2026), Sundays closed.
  const DAYS = [[2, "Mon"], [3, "Tue"], [4, "Wed"], [5, "Thu"], [6, "Fri"], [7, "Sat"]].map(([d, w], i) => ({ id: "d" + i, d, w, label: `${w} ${d} Nov`, long: `${({ Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" })[w]} ${d} November` }));
  const SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"];
  const MEMBER_OFF = 0.1, GIFT_EVERY = 5, PRIORITY_AT = 8;
  const PREFS = {
    pressure: ["Light", "Medium", "Firm"],
    scent: ["Unscented", "Citrus", "Woody"],
    talk: ["Quiet, please", "Happy to chat"],
    remind: ["Email", "Text", "No reminders"],
  };
  const T = (id) => TREATS.find((t) => t.id === id);
  const SP = (id) => SPECS.find((s) => s.id === id);
  const LOC = (id) => LOCS.find((l) => l.id === id);
  const DAY = (id) => DAYS.find((d) => d.id === id);

  // Other customers' bookings: fixed per specialist, day and time, so the diary looks lived-in.
  const seedTaken = (spec, day, slot) => { let h = 7; for (const c of spec + day + slot) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100 < 38; };
  const fresh = () => ({
    v: 1, seq: 1,
    appts: [],
    history: [
      { id: "h4", treat: "facial", spec: "mara", loc: "old", date: "3 Oct" },
      { id: "h3", treat: "cut", spec: "selin", loc: "old", date: "12 Sep" },
      { id: "h2", treat: "deep", spec: "emil", loc: "old", date: "20 Aug" },
      { id: "h1", treat: "mani", spec: "nadia", loc: "river", date: "30 Jul" },
    ],
    prefs: { pressure: "Medium", scent: "Unscented", talk: "Quiet, please", remind: "Email" },
  });
  const taken = (S, spec, day, slot, except) => seedTaken(spec, day, slot) || S.appts.some((a) => a.id !== except && a.spec === spec && a.day === day && a.slot === slot);
  const freeSlots = (S, spec, day, except) => SLOTS.filter((s) => !taken(S, spec, day, s, except));
  const freeWeek = (S, spec, except) => DAYS.reduce((n, d) => n + freeSlots(S, spec, d.id, except).length, 0);
  const firstFree = (S, spec) => { for (const d of DAYS) { const s = freeSlots(S, spec, d.id)[0]; if (s) return `${d.label}, ${s}`; } return null; };
  const order = (a) => DAYS.findIndex((d) => d.id === a.day) * 10 + SLOTS.indexOf(a.slot);
  const upcoming = (S) => [...S.appts].sort((a, b) => order(a) - order(b));
  const visits = (S) => S.history.length;
  // A visit's number in the member's lifetime: completed visits, then upcoming ones in date order.
  const nthOf = (S, id) => visits(S) + upcoming(S).findIndex((a) => a.id === id) + 1;
  const nextNth = (S, day, slot) => visits(S) + upcoming(S).filter((a) => order(a) < order({ day, slot })).length + 1;
  const quote = (treat, nth) => {
    const t = T(treat), off = Math.round(t.price * MEMBER_OFF), gift = nth % GIFT_EVERY === 0;
    return { list: t.price, off, total: t.price - off, gift };
  };
  const specsFor = (loc, treat) => SPECS.filter((s) => s.loc === loc && (!treat || s.cats.includes(T(treat).cat)));
  const treatsAt = (loc) => TREATS.filter((t) => specsFor(loc).some((s) => s.cats.includes(t.cat)));
  function book(S, d) {
    if (!d.loc || !d.treat || !d.spec || !d.day || !d.slot || taken(S, d.spec, d.day, d.slot)) return null;
    const a = { id: "a" + S.seq++, loc: d.loc, treat: d.treat, spec: d.spec, day: d.day, slot: d.slot };
    S.appts.push(a);
    return a;
  }
  function reschedule(S, id, day, slot) {
    const a = S.appts.find((x) => x.id === id);
    if (!a || taken(S, a.spec, day, slot, id)) return null;
    const from = { day: a.day, slot: a.slot };
    a.day = day; a.slot = slot;
    return from;
  }
  function cancel(S, id) { const i = S.appts.findIndex((x) => x.id === id); if (i < 0) return null; return S.appts.splice(i, 1)[0]; }
  function checkIn(S, id) {
    const a = cancel(S, id); if (!a) return null;
    S.history.unshift({ id: "h" + S.seq++, treat: a.treat, spec: a.spec, loc: a.loc, date: DAY(a.day).label.replace(/^\w+ /, "") });
    return a;
  }
  const benefits = (S) => {
    const v = visits(S), toGift = GIFT_EVERY - (v % GIFT_EVERY);
    return [
      { k: "price", name: "Member pricing", text: "10% off every treatment, at all three studios.", on: true, note: "Active" },
      { k: "gift", name: "A complimentary add-on every fifth visit", text: "A 15-minute scalp, hand or foot ritual, added to the visit.", on: true, note: toGift === GIFT_EVERY ? "Earned on your last visit" : `${toGift} visit${toGift > 1 ? "s" : ""} to go` },
      { k: "priority", name: "Priority booking", text: "See new diaries 48 hours before everyone else.", on: v >= PRIORITY_AT, note: v >= PRIORITY_AT ? "Active" : `Unlocks at ${PRIORITY_AT} visits · ${PRIORITY_AT - v} to go` },
    ];
  };
  /* CORE END */

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + n;
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !Array.isArray(S.appts)) S = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const ui = { step: "loc", d: {}, cat: "All", mode: null, apptId: null, done: null, pane: "book", askCancel: null };

  /* ---------- Art ---------- */
  const HUES = [["#E9D6C8", "#B9785B", "#3A2A22"], ["#DCE3D3", "#7E8C6E", "#2F3527"], ["#E4DCEB", "#8A7AA6", "#2E2738"], ["#F0E2C8", "#C49A4A", "#3A2E1A"]];
  const portrait = (s, size = 56) => { const [bg, mid, dk] = HUES[s.hue]; const hair = ["M18 30c0-11 7-18 14-18s14 7 14 18c-3-6-8-9-14-9s-11 3-14 9z", "M16 34c0-14 7-22 16-22s16 8 16 22v12c-2-9-4-14-4-20-3 3-8 4-12 4s-9-1-12-4c0 6-2 11-4 20z", "M20 26c0-9 5-15 12-15s12 6 12 15c0 2-1 3-2 4-2-5-6-8-10-8s-8 3-10 8c-1-1-2-2-2-4z", "M18 28c0-10 6-17 14-17s14 7 14 17c-4-3-6-7-6-10-3 4-9 6-15 6-3 0-5 2-7 4z"][s.hue];
    return `<svg class="bs-portrait" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${bg}"/><path d="M12 64c2-12 10-18 20-18s18 6 20 18z" fill="${mid}"/><rect x="28" y="38" width="8" height="10" rx="3" fill="#D9AE90"/><ellipse cx="32" cy="30" rx="10" ry="12" fill="#E3B898"/><path d="${hair}" fill="${dk}"/></svg>`; };
  const LOC_ART = {
    arch: '<rect width="120" height="80" fill="#EFE4D8"/><path d="M30 80V40a30 30 0 0 1 60 0v40z" fill="#B9785B"/><path d="M42 80V44a18 18 0 0 1 36 0v36z" fill="#F7EFE6"/><path d="M60 26v54" stroke="#B9785B" stroke-width="1.5"/><circle cx="96" cy="18" r="7" fill="#E7C38C"/>',
    awning: '<rect width="120" height="80" fill="#E3E8DC"/><rect x="22" y="34" width="76" height="46" fill="#7E8C6E"/><path d="M18 34h84l-6-12H24z" fill="#2F3527"/><path d="M18 34h84" stroke="#F7EFE6" stroke-width="2" stroke-dasharray="6 6"/><rect x="34" y="46" width="22" height="34" fill="#F7EFE6"/><rect x="64" y="46" width="22" height="18" fill="#F7EFE6"/>',
    round: '<rect width="120" height="80" fill="#ECE4F0"/><circle cx="60" cy="54" r="34" fill="#8A7AA6"/><circle cx="60" cy="54" r="22" fill="#F7EFE6"/><path d="M38 80h44" stroke="#2E2738" stroke-width="3"/><circle cx="22" cy="20" r="5" fill="#E7C38C"/>',
  };
  const CAT_ART = {
    Hair: '<path d="M14 40c8-18 20-24 32-22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M18 46c8-14 18-20 30-18M22 52c7-11 16-16 26-14" stroke="currentColor" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>',
    Skin: '<path d="M32 12c10 12 15 20 15 27a15 15 0 0 1-30 0c0-7 5-15 15-27z" fill="currentColor" opacity=".9"/><path d="M26 40a7 7 0 0 0 7 7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
    Body: '<ellipse cx="32" cy="44" rx="18" ry="7" fill="currentColor" opacity=".35"/><ellipse cx="32" cy="34" rx="14" ry="6" fill="currentColor" opacity=".6"/><ellipse cx="32" cy="25" rx="10" ry="5" fill="currentColor"/>',
    Nails: '<rect x="25" y="14" width="14" height="22" rx="7" fill="currentColor"/><path d="M22 36h20v6a10 10 0 0 1-20 0z" fill="currentColor" opacity=".45"/>',
  };
  const catTile = (cat, cls = "") => `<span class="bs-tile c-${cat.toLowerCase()} ${cls}" aria-hidden="true"><svg viewBox="0 0 64 64">${CAT_ART[cat]}</svg></span>`;
  const ICON = { back: '<path d="M10 4 4 10l6 6"/>', check: '<path d="M4 10.5 8 14l8-8"/>', clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/>', pin: '<path d="M10 18s6-5.3 6-10a6 6 0 0 0-12 0c0 4.7 6 10 6 10z"/><circle cx="10" cy="8" r="2"/>', reset: '<path d="M3 3v5h5M17 17v-5h-5"/><path d="M4.5 12.5a6.5 6.5 0 0 0 11.4 1.6M15.5 7.5A6.5 6.5 0 0 0 4.1 5.9"/>', gift: '<rect x="3" y="8" width="14" height="9" rx="1.5"/><path d="M10 8v9M3 11h14M10 8c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 0 5-1s-3.5-2-5 1z"/>' };
  const ico = (k, s = 18) => `<svg class="bs-i" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true">${ICON[k]}</svg>`;

  /* ---------- Booking flow ---------- */
  const STEPS = [["loc", "Studio"], ["treat", "Treatment"], ["spec", "Specialist"], ["time", "Time"], ["confirm", "Confirm"]];
  const stepVal = (k) => { const d = ui.d; return k === "loc" ? d.loc && LOC(d.loc).name : k === "treat" ? d.treat && T(d.treat).name : k === "spec" ? d.spec && SP(d.spec).name.split(" ")[0] : k === "time" ? d.day && d.slot && `${DAY(d.day).label}, ${d.slot}` : ""; };
  function stepper() {
    const cur = STEPS.findIndex(([k]) => k === ui.step);
    return `<ol class="bs-steps" aria-label="Booking steps">${STEPS.map(([k, l], i) => {
      const done = i < cur && (ui.mode !== "resched" || k === "time"), v = stepVal(k);
      const lock = ui.mode === "resched" && k !== "time" && k !== "confirm";
      const inner = `<span class="n">0${i + 1}</span><span class="l">${l}</span>${v ? `<span class="v">${esc(v)}</span>` : ""}`;
      return `<li class="${i === cur ? "on" : done ? "done" : ""}${lock ? " lock" : ""}">${done && !lock ? `<button type="button" data-bs-step="${k}">${inner}</button>` : `<span ${i === cur ? 'aria-current="step"' : ""}>${inner}</span>`}</li>`;
    }).join("")}</ol>`;
  }
  function stepLoc() {
    return `<h3 class="bs-q">Where would you like to visit?</h3><div class="bs-locs">${LOCS.map((l) => `<button type="button" class="bs-loc" data-bs-loc="${l.id}" aria-pressed="${ui.d.loc === l.id}"><svg class="bs-loc-art" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${LOC_ART[l.art]}</svg><span class="bs-loc-t"><b>${l.name}</b><small>${ico("pin", 14)}${l.addr}</small><small>${ico("clock", 14)}${l.hours}</small><em>${specsFor(l.id).length} specialists · ${treatsAt(l.id).length} treatments</em></span></button>`).join("")}</div>`;
  }
  function stepTreat() {
    const list = treatsAt(ui.d.loc).filter((t) => ui.cat === "All" || t.cat === ui.cat);
    const nth = nextNth(S, "d5", "17:30");
    return `<h3 class="bs-q">What would you like at ${LOC(ui.d.loc).name}?</h3>
      <div class="bs-cats" role="group" aria-label="Treatment type">${["All", ...CATS].map((c) => `<button type="button" data-bs-cat="${c}" aria-pressed="${ui.cat === c}">${c}</button>`).join("")}</div>
      <ul class="bs-treats">${list.map((t) => { const q = quote(t.id, 1); return `<li><button type="button" class="bs-treat" data-bs-treat="${t.id}" aria-pressed="${ui.d.treat === t.id}">${catTile(t.cat)}<span class="bs-treat-t"><b>${t.name}</b><small>${t.note}</small><em>${ico("clock", 14)}${t.min} min · ${t.cat}</em></span><span class="bs-price"><s>${money(q.list)}</s><b>${money(q.total)}</b><small>member</small></span></button></li>`; }).join("")}</ul>
      ${nth % GIFT_EVERY === 0 ? `<p class="bs-hint">${ico("gift", 16)}Your next visit is your ${nth}th. A complimentary add-on comes with it.</p>` : ""}`;
  }
  function stepSpec() {
    const list = specsFor(ui.d.loc, ui.d.treat);
    return `<h3 class="bs-q">Who would you like to see?</h3><ul class="bs-specs">${list.map((s) => { const free = freeWeek(S, s.id), first = firstFree(S, s.id); return `<li><button type="button" class="bs-spec" data-bs-spec="${s.id}" aria-pressed="${ui.d.spec === s.id}">${portrait(s, 64)}<span class="bs-spec-t"><b>${s.name}</b><small>${s.title} · ${s.yrs} years</small><em>${s.cats.join(" · ")}</em></span><span class="bs-spec-free"><b>${free}</b><small>times free<br>this week</small>${first ? `<i>Next: ${first}</i>` : ""}</span></button></li>`; }).join("")}</ul>`;
  }
  function stepTime() {
    const s = SP(ui.d.spec), except = ui.mode === "resched" ? ui.apptId : null, day = ui.d.day || DAYS.find((d) => freeSlots(S, s.id, d.id, except).length)?.id || "d0";
    ui.d.day = day;
    const orig = except && S.appts.find((a) => a.id === except);
    return `<h3 class="bs-q">${ui.mode === "resched" ? "Pick a new time" : "When suits you?"} <span>with ${s.name.split(" ")[0]}</span></h3>
      <div class="bs-days" role="group" aria-label="Day">${DAYS.map((d) => { const n = freeSlots(S, s.id, d.id, except).length; return `<button type="button" data-bs-day="${d.id}" aria-pressed="${day === d.id}" ${n ? "" : "disabled"}><span>${d.w}</span><b>${d.d}</b><small>${n ? n + " free" : "Full"}</small></button>`; }).join("")}</div>
      <div class="bs-slots" role="group" aria-label="Times on ${DAY(day).long}">${SLOTS.map((t) => { const mine = orig && orig.day === day && orig.slot === t, tk = taken(S, s.id, day, t, except), sel = ui.d.slot === t && ui.d.day === day; return `<button type="button" class="bs-slot${tk ? " taken" : ""}${mine ? " mine" : ""}" data-bs-slot="${t}" aria-pressed="${sel}" ${tk ? "disabled" : ""} aria-label="${DAY(day).long}, ${t}, ${mine ? "your current time" : tk ? "booked" : "available"}"><b>${t}</b><small>${mine ? "Current" : tk ? "Booked" : `${T(ui.d.treat).min} min`}</small></button>`; }).join("")}</div>
      <p class="bs-legend"><span class="free">Available</span><span class="tk">Booked by another guest</span>${orig ? '<span class="mine">Your current time</span>' : ""}</p>
      <div class="bs-act"><button type="button" class="bs-btn" data-bs-step="confirm" ${ui.d.slot && ui.d.day ? "" : "disabled"}>Continue</button></div>`;
  }
  const prefLine = () => `${S.prefs.pressure} pressure · ${S.prefs.scent} · ${S.prefs.talk}`;
  function stepConfirm() {
    const d = ui.d, t = T(d.treat), s = SP(d.spec), l = LOC(d.loc);
    const nth = ui.mode === "resched" ? null : nextNth(S, d.day, d.slot);
    const q = quote(d.treat, ui.mode === "resched" ? nthOf(S, ui.apptId) : nth);
    const orig = ui.mode === "resched" && S.appts.find((a) => a.id === ui.apptId);
    return `<h3 class="bs-q">${orig ? "Move this appointment?" : "Ready to book?"}</h3>
      <article class="bs-sum">${catTile(t.cat, "lg")}<div class="bs-sum-t"><small>${t.cat} · ${t.min} min</small><h4>${t.name}</h4>
        <dl><div><dt>When</dt><dd>${orig ? `<s>${DAY(orig.day).label}, ${orig.slot}</s> ` : ""}${DAY(d.day).long}, ${d.slot}</dd></div><div><dt>Where</dt><dd>${l.name} · ${l.addr}</dd></div><div><dt>With</dt><dd>${s.name}, ${s.title.toLowerCase()}</dd></div><div><dt>Your notes</dt><dd>${prefLine()} <button type="button" class="bs-link" data-bs-pane="me" data-bs-focus="prefs">Change</button></dd></div></dl></div></article>
      <div class="bs-bill"><div><span>${t.name}</span><span>${money(q.list)}</span></div><div><span>Member pricing (10%)</span><span>−${money(q.off)}</span></div>${q.gift ? `<div class="gift"><span>${ico("gift", 16)}Fifth-visit add-on: 15-minute ritual</span><span>Included</span></div>` : ""}<div class="tot"><span>To pay at the studio</span><b>${money(q.total)}</b></div></div>
      <p class="bs-fine">A demonstration: no appointment is made and nothing is charged. Reminders by ${S.prefs.remind.toLowerCase() === "no reminders" ? "none" : S.prefs.remind.toLowerCase()}.</p>
      <div class="bs-act"><button type="button" class="bs-btn" data-bs-confirm>${orig ? "Move appointment" : "Confirm booking"}</button>${orig ? '<button type="button" class="bs-btn ghost" data-bs-endresched>Keep the original time</button>' : ""}</div>`;
  }
  function stepDone() {
    const a = S.appts.find((x) => x.id === ui.done.id); if (!a) { ui.done = null; return stepLoc(); }
    const q = quote(a.treat, nthOf(S, a.id));
    return `<div class="bs-done" role="status"><span class="bs-done-i">${ico("check", 28)}</span><small>${ui.done.moved ? "Appointment moved" : "Booked"}</small><h3>See you ${DAY(a.day).long}, ${a.slot}</h3><p>${T(a.treat).name} with ${SP(a.spec).name} at ${LOC(a.loc).name}. ${q.gift ? "Your fifth-visit add-on is included." : `${money(q.total)} at the studio.`}</p>
      <div class="bs-act"><button type="button" class="bs-btn" data-bs-again>Book another treatment</button><button type="button" class="bs-btn ghost" data-bs-pane="me">See your appointments</button></div></div>`;
  }

  /* ---------- Your Maison rail ---------- */
  function rail() {
    const up = upcoming(S), v = visits(S), bens = benefits(S);
    const recs = careRecs();
    return `<section class="bs-card"><header><h4>Upcoming</h4><span>${up.length || "None"}</span></header>
        ${up.length ? `<ul class="bs-appts">${up.map((a) => { const t = T(a.treat), s = SP(a.spec), q = quote(a.treat, nthOf(S, a.id)), dd = DAY(a.day); return `<li class="bs-appt" id="bs-a-${a.id}"><span class="bs-date"><small>${dd.w}</small><b>${dd.d}</b><small>Nov</small></span><div class="bs-appt-t"><b>${t.name}</b><small>${a.slot} · ${s.name.split(" ")[0]} · ${LOC(a.loc).name}</small>${q.gift ? `<em>${ico("gift", 14)}Fifth-visit add-on included</em>` : `<em class="plain">${money(q.total)} member price</em>`}
          ${ui.askCancel === a.id ? `<div class="bs-ask" role="group" aria-label="Cancel this appointment?"><span>Cancel this appointment?</span><button type="button" class="bs-mini danger" data-bs-cancel="${a.id}">Yes, cancel</button><button type="button" class="bs-mini" data-bs-nocancel>Keep it</button></div>`
          : `<div class="bs-appt-act"><button type="button" class="bs-mini" data-bs-resched="${a.id}">Reschedule</button><button type="button" class="bs-mini" data-bs-askcancel="${a.id}">Cancel</button><button type="button" class="bs-mini" data-bs-checkin="${a.id}" title="Demo: moves time forward to the visit">Check in</button></div>`}</div></li>`; }).join("")}</ul>`
          : `<p class="bs-empty">Nothing booked yet. ${(v + 1) % GIFT_EVERY === 0 ? "Your next visit is your fifth, and comes with a complimentary add-on." : "Book a treatment and it appears here."}</p>`}</section>
      <section class="bs-card bs-member"><div class="bs-mcard"><span class="bs-mcard-k">Maison Circle</span><b>Alex Morgan</b><span class="bs-dots" aria-label="${v} visits">${Array.from({ length: PRIORITY_AT }, (_, i) => `<i class="${i < v ? "on" : ""}${(i + 1) % GIFT_EVERY === 0 ? " gift" : ""}"></i>`).join("")}</span><span class="bs-mcard-f">${v} visits · member since 2025</span></div>
        <ul class="bs-bens">${bens.map((b) => `<li class="${b.on ? "" : "lock"}"><b>${b.name}</b><small>${b.text}</small><em>${b.note}</em></li>`).join("")}</ul></section>
      <section class="bs-card"><header><h4>For you</h4><span>From your visits</span></header>${recs.length ? `<ul class="bs-recs">${recs.map((r) => `<li>${catTile(T(r.treat).cat)}<div><b>${r.title}</b><small>${r.why}</small><button type="button" class="bs-link" data-bs-rec="${r.treat}|${r.spec}">Book with ${SP(r.spec).name.split(" ")[0]}</button></div></li>`).join("")}</ul>` : `<p class="bs-empty">You're up to date with your routine.</p>`}</section>
      <section class="bs-card" id="bs-prefs"><header><h4>Preferences</h4><span>Shared with your specialist</span></header>
        ${Object.entries(PREFS).map(([k, opts]) => `<div class="bs-pref"><span id="bs-pl-${k}">${{ pressure: "Massage pressure", scent: "Products", talk: "During treatment", remind: "Reminders" }[k]}</span><div role="group" aria-labelledby="bs-pl-${k}">${opts.map((o) => `<button type="button" data-bs-pref="${k}" data-v="${esc(o)}" aria-pressed="${S.prefs[k] === o}">${o}</button>`).join("")}</div></div>`).join("")}</section>
      <section class="bs-card"><header><h4>Visit history</h4><span>${v} visits</span></header><ol class="bs-hist">${S.history.map((h) => `<li><span>${h.date}</span><b>${T(h.treat).name}</b><small>${SP(h.spec).name.split(" ")[0]} · ${LOC(h.loc).name}</small></li>`).join("")}</ol></section>`;
  }
  function careRecs() {
    // Suggested next visits from the history, skipping anything already booked.
    const booked = new Set(S.appts.map((a) => a.treat));
    const rules = [["facial", "Your skin routine", "Restorative facial every 4–6 weeks. Your last was 3 October."], ["cut", "Keep the shape", "A cut every 8 weeks keeps the line clean. Your last was 12 September."], ["deep", "Back and shoulders", "Deep tissue every 10–12 weeks. Your last was 20 August."]];
    return rules.filter(([t]) => !booked.has(t) && S.history.some((h) => h.treat === t)).slice(0, 2).map(([t, title, why]) => ({ treat: t, spec: S.history.find((h) => h.treat === t).spec, title, why }));
  }

  /* ---------- Render ---------- */
  root.innerHTML = `<div class="bs">
    <header class="bs-top"><span class="bs-brand"><b>Maison Ondine</b><small>Three studios · one membership</small></span>
      <div class="bs-panes" role="group" aria-label="View"><button type="button" data-bs-pane="book">Book</button><button type="button" data-bs-pane="me">Your Maison <em data-bs-count></em></button></div>
      <button type="button" class="bs-reset" data-bs-reset>${ico("reset", 16)}Reset demo</button></header>
    <div class="bs-body"><section class="bs-book" aria-label="Book a treatment"><div data-bs-steps></div><div class="bs-stage" data-bs-stage tabindex="-1"></div></section><aside class="bs-rail" aria-label="Your Maison" data-bs-rail></aside></div>
    <p class="sr-only" aria-live="polite" data-bs-live></p></div>`;
  const $ = (s) => root.querySelector(s);
  const app = $(".bs");
  const say = (t) => { $("[data-bs-live]").textContent = t; };

  function render(focus) {
    app.dataset.pane = ui.pane;
    root.querySelectorAll(".bs-panes [data-bs-pane]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bsPane === ui.pane)));
    $("[data-bs-count]").textContent = S.appts.length ? S.appts.length : "";
    $("[data-bs-steps]").innerHTML = ui.done ? "" : stepper();
    $("[data-bs-stage]").innerHTML = ui.done ? stepDone() : { loc: stepLoc, treat: stepTreat, spec: stepSpec, time: stepTime, confirm: stepConfirm }[ui.step]();
    $("[data-bs-rail]").innerHTML = rail();
    if (focus) (typeof focus === "string" ? root.querySelector(focus) : $("[data-bs-stage]"))?.focus({ preventScroll: true });
  }
  const go = (step, focus = true) => { ui.step = step; render(focus ? "[data-bs-stage]" : null); };
  const scrollToBook = () => { const top = $(".bs-book").getBoundingClientRect().top; if (top < 70 || top > innerHeight * 0.6) window.scrollBy({ top: top - 90, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };

  root.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    let el;
    if ((el = b("[data-bs-pane]"))) {
      ui.pane = el.dataset.bsPane; render(); if (el.dataset.bsFocus) { const p = $("#bs-prefs"); p?.scrollIntoView({ block: "start" }); p?.querySelector("button")?.focus({ preventScroll: true }); } return;
    }
    if ((el = b("[data-bs-step]"))) { if (el.disabled) return; return go(el.dataset.bsStep); }
    if ((el = b("[data-bs-loc]"))) { ui.d = { loc: el.dataset.bsLoc }; ui.cat = "All"; return go("treat"); }
    if ((el = b("[data-bs-cat]"))) { ui.cat = el.dataset.bsCat; return render(`[data-bs-cat="${ui.cat}"]`); }
    if ((el = b("[data-bs-treat]"))) { ui.d = { loc: ui.d.loc, treat: el.dataset.bsTreat }; return go("spec"); }
    if ((el = b("[data-bs-spec]"))) { ui.d = { loc: ui.d.loc, treat: ui.d.treat, spec: el.dataset.bsSpec }; return go("time"); }
    if ((el = b("[data-bs-day]"))) { ui.d.day = el.dataset.bsDay; ui.d.slot = null; return render(`[data-bs-day="${ui.d.day}"]`); }
    if ((el = b("[data-bs-slot]"))) { ui.d.slot = el.dataset.bsSlot; return render(`[data-bs-slot="${ui.d.slot}"]`); }
    if (b("[data-bs-confirm]")) {
      if (ui.mode === "resched") {
        const from = reschedule(S, ui.apptId, ui.d.day, ui.d.slot); if (!from) return render();
        ui.done = { id: ui.apptId, moved: true }; ui.mode = null; save(); render("[data-bs-stage]");
        say(`Appointment moved to ${DAY(ui.d.day).long}, ${ui.d.slot}. ${DAY(from.day).label}, ${from.slot} is free again.`); return;
      }
      const a = book(S, ui.d); if (!a) return render();
      ui.done = { id: a.id }; save(); render("[data-bs-stage]");
      say(`Booked ${T(a.treat).name} on ${DAY(a.day).long} at ${a.slot}. It's now in your upcoming appointments.`); return;
    }
    if (b("[data-bs-again]")) { ui.done = null; ui.d = {}; return go("loc"); }
    if (b("[data-bs-endresched]")) { ui.mode = null; ui.apptId = null; ui.d = {}; ui.pane = "me"; return go("loc", false); }
    if ((el = b("[data-bs-resched]"))) {
      const a = S.appts.find((x) => x.id === el.dataset.bsResched); if (!a) return;
      ui.mode = "resched"; ui.apptId = a.id; ui.done = null; ui.pane = "book"; ui.d = { loc: a.loc, treat: a.treat, spec: a.spec, day: a.day, slot: null };
      go("time"); scrollToBook(); return;
    }
    if ((el = b("[data-bs-askcancel]"))) { ui.askCancel = el.dataset.bsAskcancel; return render(`[data-bs-cancel="${ui.askCancel}"]`); }
    if (b("[data-bs-nocancel]")) { const id = ui.askCancel; ui.askCancel = null; return render(`[data-bs-askcancel="${id}"]`); }
    if ((el = b("[data-bs-cancel]"))) {
      const a = cancel(S, el.dataset.bsCancel); ui.askCancel = null;
      if (ui.mode === "resched" && ui.apptId === a?.id) { ui.mode = null; ui.apptId = null; ui.d = {}; ui.step = "loc"; }
      if (ui.done?.id === a?.id) ui.done = null;
      save(); render(); say(a ? `Cancelled. ${DAY(a.day).label}, ${a.slot} with ${SP(a.spec).name.split(" ")[0]} is free again.` : ""); return;
    }
    if ((el = b("[data-bs-checkin]"))) {
      const a = checkIn(S, el.dataset.bsCheckin); if (!a) return;
      if (ui.done?.id === a.id) ui.done = null;
      if (ui.mode === "resched" && ui.apptId === a.id) { ui.mode = null; ui.apptId = null; ui.d = {}; ui.step = "loc"; }
      save(); render(); say(`Checked in. ${visits(S)} visits in your Maison Circle.`); return;
    }
    if ((el = b("[data-bs-rec]"))) {
      const [treat, spec] = el.dataset.bsRec.split("|");
      ui.mode = null; ui.apptId = null; ui.done = null; ui.pane = "book"; ui.d = { loc: SP(spec).loc, treat, spec };
      go("time"); scrollToBook(); return;
    }
    if ((el = b("[data-bs-pref]"))) { S.prefs[el.dataset.bsPref] = el.dataset.v; save(); return render(`[data-bs-pref="${el.dataset.bsPref}"][data-v="${CSS.escape(el.dataset.v)}"]`); }
    if (b("[data-bs-reset]")) { S = fresh(); Object.assign(ui, { step: "loc", d: {}, cat: "All", mode: null, apptId: null, done: null, askCancel: null }); save(); render("[data-bs-stage]"); say("Demo reset: no appointments, four visits in history."); }
  });
  render();
})();
