// Beauty Experience Studio: an editorial booking and membership app for a fictional three-studio beauty house.
// One state model: a booked slot is taken for everyone, rescheduling frees the old slot, cancelling
// frees it again, and checking in moves a visit to history and advances the membership.
// All studios, specialists, prices, imagery and visits are illustrative. Nothing is booked or sent.
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

  /* ---------- Editorial content ---------- */
  const TX = {
    cut: { no: "01", scene: "cut", line: "A clean line that grows out well.", inc: ["Consultation", "Wash and scalp massage", "Cut and hand-finished blow-dry"] },
    gloss: { no: "02", scene: "gloss", line: "Shine, softness and a truer tone.", inc: ["Colour consultation", "Acid gloss", "Toning and finish"] },
    facial: { no: "03", scene: "facial", line: "Calm, clear skin, unhurried.", inc: ["Double cleanse", "Gentle enzyme peel", "Lymphatic massage", "Calming mask"] },
    glow: { no: "04", scene: "glow", line: "Thirty minutes to a brighter finish.", inc: ["Cleanse", "Vitamin C serum", "Cooling stone massage"] },
    deep: { no: "05", scene: "deep", line: "Slow, firm work where you hold tension.", inc: ["Posture check", "Back, neck and shoulders", "Warm towel finish"] },
    stone: { no: "06", scene: "stone", line: "Warm basalt and a full-body reset.", inc: ["Full-body massage", "Warmed basalt stones", "Herbal tea after"] },
    mani: { no: "07", scene: "mani", line: "Shape, care and a colour that lasts.", inc: ["Shape and cuticle care", "Hand massage", "Long-wear polish"] },
  };
  const BIO = {
    selin: "Precise cuts built around how you actually wear your hair.",
    mara: "Calm, evidence-led skin care. Gentle first, always.",
    emil: "Sports-massage training, a patient and steady pace.",
    aiko: "Soft, believable colour that suits your skin tone.",
    jonah: "Deep work for desk-bound backs, and very good facials.",
    nadia: "Clean shapes, careful cuticles, colour that lasts.",
    ines: "Cuts and skin in one visit, planned as a routine.",
    tomas: "Twelve years of hot-stone and deep-tissue rituals.",
    rana: "Minimal nail art and the neatest finish in the house.",
  };
  const STUDIO = { old: "Our first house: a vaulted former bookbinder's.", river: "Light-filled rooms above the water.", north: "Quiet treatment rooms around a courtyard." };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + n;
  const ref = (a) => "MO-" + (2400 + Number(String(a.id).slice(1)));
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !Array.isArray(S.appts)) S = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const ui = { view: "book", loc: "old", cat: "All", treat: "facial", spec: null, day: null, slot: null, mode: null, apptId: null, done: null, askCancel: null, anim: false };
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Still-life art (inline SVG, 400 × 500) ---------- */
  let uid = 0;
  const room = (u, [w1, w2], [s1, s2], y, beam = 0.5) => `<defs>
      <linearGradient id="w${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w1}"/><stop offset="1" stop-color="${w2}"/></linearGradient>
      <linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
      <linearGradient id="l${u}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="h${u}"><stop offset="0" stop-color="#1b1013" stop-opacity=".42"/><stop offset="1" stop-color="#1b1013" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="400" height="500" fill="url(#w${u})"/>
    <rect y="${y}" width="400" height="${500 - y}" fill="url(#s${u})"/><rect y="${y}" width="400" height="1.5" fill="#fff" opacity=".35"/>
    <path d="M250 0h150v120L150 500H30z" fill="url(#l${u})" opacity="${beam}"/>`;
  const shadow = (u, cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#h${u})"/>`;
  const grain = (u) => `<filter id="g${u}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .06  0 0 0 .5 -.18"/></filter><rect width="400" height="500" filter="url(#g${u})" opacity=".55"/>`;
  const SCENES = {
    cut: (u) => `${room(u, ["#ECE2D7", "#D8C7B6"], ["#F4EDE5", "#DCCDBF"], 372)}
      <defs><linearGradient id="m${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9CCCB"/><stop offset=".55" stop-color="#A9969A"/><stop offset="1" stop-color="#7D6870"/></linearGradient><clipPath id="c${u}"><path d="M112 372V176a88 88 0 0 1 176 0v196z"/></clipPath></defs>
      <path d="M104 372V176a96 96 0 0 1 192 0v196z" fill="#B08A5A"/><path d="M112 372V176a88 88 0 0 1 176 0v196z" fill="url(#m${u})"/>
      <g clip-path="url(#c${u})"><path d="M150 60l140 0-120 330h-80z" fill="#fff" opacity=".22"/><path d="M228 60h30l-130 330h-14z" fill="#fff" opacity=".18"/><rect x="112" y="300" width="176" height="72" fill="#5E4A52" opacity=".35"/></g>
      ${shadow(u, 196, 424, 110, 12)}
      <g transform="rotate(-8 196 410)"><circle cx="142" cy="410" r="15" fill="none" stroke="#2A2326" stroke-width="5"/><circle cx="170" cy="424" r="15" fill="none" stroke="#2A2326" stroke-width="5"/><path d="M155 408l118-14 2 5-114 22zM182 420l92-18 2 4-88 26z" fill="#C9C2BE"/><circle cx="182" cy="414" r="3" fill="#B08A5A"/></g>
      ${shadow(u, 300, 458, 64, 7)}<rect x="240" y="444" width="120" height="11" rx="3" fill="#3E1F3A"/><path d="M246 455v10M252 455v10M258 455v10M264 455v10M270 455v10M276 455v10M282 455v10M288 455v10M294 455v10M300 455v10M306 455v10M312 455v10M318 455v10M324 455v10M330 455v10M336 455v10" stroke="#3E1F3A" stroke-width="2.4"/>
      ${shadow(u, 330, 376, 30, 5)}<path d="M316 372c-6-24 2-42 14-42s20 18 14 42z" fill="#E8DCCD" stroke="#CDBBA8"/><path d="M330 332c-2-30-14-46-26-58M330 332c4-26 14-40 28-50" stroke="#7E8A6E" stroke-width="2" fill="none"/><ellipse cx="303" cy="272" rx="9" ry="4" fill="#8C9A7C" transform="rotate(-40 303 272)"/><ellipse cx="358" cy="282" rx="9" ry="4" fill="#8C9A7C" transform="rotate(30 358 282)"/><ellipse cx="318" cy="292" rx="7" ry="3" fill="#7E8A6E" transform="rotate(-30 318 292)"/>`,
    gloss: (u) => `${room(u, ["#EDD3C9", "#D7ADA0"], ["#E2BDB0", "#C99A8C"], 420, 0.35)}
      <defs><linearGradient id="r${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A261D"/><stop offset=".45" stop-color="#9A5B38"/><stop offset=".7" stop-color="#D49A62"/><stop offset="1" stop-color="#7A4128"/></linearGradient></defs>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${-40 + i * 22} ${-20 + i * 8}C${120 + i * 10} ${120 + i * 6} ${40 + i * 14} ${260 + i * 4} ${200 + i * 12} ${330 + i * 6}S${360 + i * 4} ${470 - i * 6} ${440} ${520 - i * 10}" stroke="url(#r${u})" stroke-width="${30 - i * 3}" fill="none" stroke-linecap="round" opacity="${0.95 - i * 0.07}"/>`).join("")}
      ${[0, 1, 2].map((i) => `<path d="M${-10 + i * 30} ${10 + i * 10}C${140 + i * 10} ${140} ${70 + i * 14} ${270} ${220 + i * 10} ${340}" stroke="#FFE9CF" stroke-width="2" fill="none" opacity=".45"/>`).join("")}
      ${shadow(u, 318, 470, 44, 7)}<rect x="290" y="368" width="56" height="100" rx="12" fill="#8E4A2A" opacity=".88"/><rect x="296" y="380" width="10" height="70" rx="5" fill="#fff" opacity=".22"/><rect x="302" y="346" width="32" height="26" rx="4" fill="#2A2326"/><rect x="296" y="408" width="44" height="30" rx="2" fill="#F4E8DC"/><path d="M304 418h28M304 426h18" stroke="#8E4A2A" stroke-width="2"/>`,
    facial: (u) => `${room(u, ["#E7E3D9", "#D3CBBC"], ["#EFE8DE", "#D9CDBE"], 350)}
      <defs><radialGradient id="b${u}" cx=".4" cy=".3"><stop offset="0" stop-color="#FFFDF9"/><stop offset="1" stop-color="#E2D8CC"/></radialGradient><linearGradient id="q${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D5E0DC"/><stop offset="1" stop-color="#A9BDB8"/></linearGradient></defs>
      ${shadow(u, 120, 452, 100, 14)}<rect x="30" y="406" width="186" height="34" rx="10" fill="#F4EFE8"/><rect x="40" y="378" width="166" height="32" rx="10" fill="#E9DFD3"/><rect x="52" y="352" width="142" height="30" rx="10" fill="#F7F3EE"/><path d="M40 394h166M30 423h186" stroke="#D2C4B3"/>
      ${shadow(u, 270, 400, 92, 12)}<path d="M186 336c0 46 38 66 84 66s84-20 84-66z" fill="url(#b${u})"/><ellipse cx="270" cy="336" rx="84" ry="18" fill="#F6F1EA"/><ellipse cx="270" cy="338" rx="70" ry="12" fill="url(#q${u})"/><ellipse cx="248" cy="336" rx="20" ry="3" fill="#fff" opacity=".7"/>
      <path d="M262 316c-10-60-30-110-74-150" stroke="#7F8E78" stroke-width="2.4" fill="none"/>${[[230, 250, -50], [214, 222, 30], [246, 282, -60], [200, 196, 20], [236, 230, 40], [254, 300, 70]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="9" fill="#9AAA90" transform="rotate(${r} ${x} ${y})"/>`).join("")}
      <path d="M332 216c8 12 12 19 12 25a12 12 0 0 1-24 0c0-6 4-13 12-25z" fill="#B9CCC6" opacity=".9"/>`,
    glow: (u) => `${room(u, ["#F2DCC9", "#E2B596"], ["#E8C2A6", "#D3A07F"], 390, 0.4)}
      <defs><linearGradient id="v${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C77E46" stop-opacity=".9"/><stop offset=".5" stop-color="#E7A86A" stop-opacity=".75"/><stop offset="1" stop-color="#B36A36" stop-opacity=".95"/></linearGradient><radialGradient id="p${u}" cx=".35" cy=".3"><stop offset="0" stop-color="#FFF8F0"/><stop offset=".6" stop-color="#EBD2BF"/><stop offset="1" stop-color="#C9A28A"/></radialGradient></defs>
      <circle cx="268" cy="150" r="118" fill="#F8E7D3" opacity=".75"/><circle cx="268" cy="150" r="78" fill="#FBEEDF" opacity=".7"/>
      ${shadow(u, 176, 452, 70, 10)}<rect x="132" y="256" width="88" height="196" rx="20" fill="url(#v${u})"/><rect x="142" y="270" width="12" height="160" rx="6" fill="#fff" opacity=".35"/><rect x="142" y="330" width="68" height="64" rx="3" fill="#FBF3EA"/><path d="M152 346h46M152 358h30M152 374h40" stroke="#B36A36" stroke-width="2"/><rect x="160" y="224" width="32" height="36" rx="5" fill="#2A2326"/><rect x="168" y="150" width="16" height="82" rx="8" fill="#3B2A2C"/><path d="M176 260v120" stroke="#fff" stroke-width="2" opacity=".5"/>
      ${shadow(u, 296, 444, 40, 8)}<circle cx="296" cy="412" r="34" fill="url(#p${u})"/>`,
    deep: (u) => `${room(u, ["#4E3045", "#2C1B28"], ["#E9DED3", "#CDBEAF"], 330, 0.18)}
      <defs><radialGradient id="f${u}"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient></defs>
      <path d="M90 330V150a110 110 0 0 1 220 0v180z" fill="#5F3C55"/><path d="M110 330V156a90 90 0 0 1 180 0v174z" fill="#6B4660" opacity=".7"/>
      <circle cx="320" cy="290" r="90" fill="url(#f${u})" opacity=".55"/>
      <path d="M0 360c80-10 160 10 240 0s120-6 160 4" stroke="#C7B6A5" fill="none"/><path d="M0 400c90-8 180 14 260 2s100-4 140 6" stroke="#C7B6A5" fill="none"/>
      ${shadow(u, 150, 420, 110, 14)}<rect x="56" y="370" width="190" height="52" rx="26" fill="#F3ECE3"/><ellipse cx="246" cy="396" rx="20" ry="26" fill="#E6DACC"/><path d="M246 380a10 14 0 1 1-1 28a6 9 0 1 1 1-18" stroke="#CDBDAA" stroke-width="2" fill="none"/>
      ${shadow(u, 312, 432, 34, 6)}<rect x="290" y="340" width="44" height="90" rx="8" fill="#2A1A1F"/><rect x="296" y="350" width="7" height="68" rx="3.5" fill="#fff" opacity=".18"/><rect x="290" y="378" width="44" height="26" fill="#B08A5A"/><rect x="302" y="320" width="20" height="22" rx="3" fill="#1A1013"/>
      <rect x="350" y="390" width="26" height="40" rx="4" fill="#EFE5D9"/><path d="M363 388c-4-6-3-12 0-16 3 4 4 10 0 16z" fill="#FFCF7A"/><circle cx="363" cy="378" r="22" fill="url(#f${u})"/>`,
    stone: (u) => `${room(u, ["#3B3337", "#221C1E"], ["#4A4245", "#2C2628"], 380, 0.14)}
      <defs><radialGradient id="k${u}" cx=".35" cy=".3"><stop offset="0" stop-color="#6E6668"/><stop offset=".6" stop-color="#363032"/><stop offset="1" stop-color="#1A1617"/></radialGradient><radialGradient id="e${u}"><stop offset="0" stop-color="#E0814A" stop-opacity=".55"/><stop offset="1" stop-color="#E0814A" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="200" cy="430" rx="190" ry="70" fill="url(#e${u})"/>
      ${shadow(u, 200, 440, 120, 14)}
      <ellipse cx="200" cy="410" rx="112" ry="34" fill="url(#k${u})"/><ellipse cx="204" cy="352" rx="88" ry="28" fill="url(#k${u})"/><ellipse cx="196" cy="302" rx="66" ry="22" fill="url(#k${u})"/><ellipse cx="202" cy="262" rx="44" ry="16" fill="url(#k${u})"/><ellipse cx="200" cy="232" rx="26" ry="10" fill="url(#k${u})"/>
      <path d="M150 398c30-8 70-8 110-2M164 342c24-6 54-6 82-1M160 293c18-4 40-4 62-1" stroke="#fff" stroke-width="2" opacity=".18" fill="none"/>
      ${[[180, 0], [212, 1], [236, 2]].map(([x, i]) => `<path d="M${x} 214c-14-20 14-34 0-56s12-34 0-54" stroke="#F4E9E2" stroke-width="${3 - i * 0.6}" fill="none" stroke-linecap="round" opacity="${0.28 - i * 0.06}"/>`).join("")}
      <path d="M60 470c40-6 80 4 120-2" stroke="#7E8A6E" stroke-width="2" fill="none" opacity=".6"/><ellipse cx="88" cy="466" rx="12" ry="5" fill="#7E8A6E" opacity=".7" transform="rotate(-12 88 466)"/>`,
    mani: (u) => `${room(u, ["#F3EFEA", "#E3DDD6"], ["#F6F2ED", "#E4DDD5"], 360, 0.45)}
      <path d="M0 140c60 20 90 70 160 60s110 40 240 20M30 0c10 60 60 80 50 140M260 360c40 30 70 40 140 30M0 420c80-10 130 30 220 20" stroke="#B9B1AA" stroke-width="1.2" fill="none" opacity=".55"/><path d="M120 360c30 40 90 50 120 90" stroke="#B9B1AA" fill="none" opacity=".5"/>
      <defs><linearGradient id="n${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E1F3A"/><stop offset=".4" stop-color="#6B3A5E"/><stop offset="1" stop-color="#3E1F3A"/></linearGradient><linearGradient id="o${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98E86"/><stop offset=".4" stop-color="#E9BCB3"/><stop offset="1" stop-color="#C08178"/></linearGradient></defs>
      ${shadow(u, 150, 446, 64, 10)}<rect x="104" y="330" width="92" height="112" rx="16" fill="url(#n${u})"/><rect x="114" y="342" width="10" height="86" rx="5" fill="#fff" opacity=".25"/><rect x="128" y="226" width="44" height="108" rx="8" fill="#1F1A1C"/><rect x="134" y="234" width="6" height="90" rx="3" fill="#fff" opacity=".12"/>
      ${shadow(u, 262, 448, 48, 8)}<rect x="226" y="372" width="72" height="72" rx="13" fill="url(#o${u})"/><rect x="234" y="382" width="8" height="54" rx="4" fill="#fff" opacity=".35"/><rect x="246" y="300" width="32" height="76" rx="6" fill="#B08A5A"/><rect x="250" y="306" width="5" height="62" rx="2.5" fill="#fff" opacity=".3"/>
      ${shadow(u, 336, 450, 36, 5)}<ellipse cx="336" cy="440" rx="34" ry="10" fill="#C9A06A"/><ellipse cx="336" cy="437" rx="26" ry="6" fill="#E3C38F"/>${[0, 1, 2].map((i) => `<path d="M${322 + i * 10} 432c0-7 3-11 6-11s6 4 6 11" fill="${["#6B3A5E", "#E9BCB3", "#B08A5A"][i]}"/>`).join("")}`,
  };
  const scene = (key, fine = true, label = "") => { const u = "bs" + ++uid; return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${SCENES[key](u)}${fine ? grain(u) : ""}</svg>`; };
  const ALT = { cut: "Still life: an arched brass mirror, shears and a comb on a stone ledge", gloss: "Still life: ribbons of glossy caramel hair beside an amber bottle", facial: "Still life: a ceramic bowl of water, folded towels and eucalyptus", glow: "Still life: a serum bottle with a dropper in warm light", deep: "Still life: a rolled towel, massage oil and a candle in a dim alcove", stone: "Still life: stacked warm basalt stones with rising steam", mani: "Still life: two nail polish bottles and a brass dish on marble" };

  const TONES = [["#E8C9BF", "#3E1F3A"], ["#D6CCBA", "#3A2E22"], ["#C9B3C3", "#2E1D2B"], ["#DDBF98", "#3A2A16"]];
  const initials = (s) => s.name.split(" ").map((w) => w[0]).join("");
  const mono = (s, w = 56) => { const [bg, ink] = TONES[s.hue]; const h = Math.round(w * 1.25); return `<svg class="bs-mono" width="${w}" height="${h}" viewBox="0 0 64 80" aria-hidden="true"><path d="M0 80V32a32 32 0 0 1 64 0v48z" fill="${bg}"/><path d="M6 80V33a26 26 0 0 1 52 0v47" fill="none" stroke="${ink}" stroke-opacity=".22"/><text x="32" y="56" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif" font-size="22" fill="${ink}">${initials(s)}</text></svg>`; };
  const STUDIO_ART = {
    old: '<rect width="80" height="56" fill="#E9DED3"/><path d="M20 56V30a20 20 0 0 1 40 0v26z" fill="#6B3A5E"/><path d="M28 56V32a12 12 0 0 1 24 0v24z" fill="#F5EEE6"/>',
    river: '<rect width="80" height="56" fill="#DDE2D8"/><rect x="14" y="20" width="52" height="36" fill="#7E8A6E"/><path d="M10 20h60l-5-8H15z" fill="#2F3527"/><rect x="22" y="30" width="14" height="26" fill="#F5EEE6"/><rect x="44" y="30" width="14" height="12" fill="#F5EEE6"/>',
    north: '<rect width="80" height="56" fill="#E6DDE6"/><circle cx="40" cy="44" r="24" fill="#8F6F86"/><circle cx="40" cy="44" r="14" fill="#F5EEE6"/><path d="M20 56h40" stroke="#3E1F3A" stroke-width="3"/>',
  };
  const ICON = { check: '<path d="M4 10.5 8 14l8-8"/>', clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/>', pin: '<path d="M10 18s6-5.3 6-10a6 6 0 0 0-12 0c0 4.7 6 10 6 10z"/><circle cx="10" cy="8" r="2"/>', reset: '<path d="M3 3v5h5M17 17v-5h-5"/><path d="M4.5 12.5a6.5 6.5 0 0 0 11.4 1.6M15.5 7.5A6.5 6.5 0 0 0 4.1 5.9"/>', gift: '<rect x="3" y="8" width="14" height="9" rx="1.5"/><path d="M10 8v9M3 11h14M10 8c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 0 5-1s-3.5-2-5 1z"/>', arrow: '<path d="M4 10h12M11 5l5 5-5 5"/>', lock: '<rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>' };
  const ico = (k, s = 16) => `<svg class="bs-i" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true">${ICON[k]}</svg>`;

  /* ---------- Selection rules ---------- */
  // Keep the selection valid: treatment offered at the studio, a specialist who does it, a day with free times.
  function settle() {
    const except = ui.mode === "resched" ? ui.apptId : null;
    if (ui.mode !== "resched") {
      if (!treatsAt(ui.loc).some((t) => t.id === ui.treat)) ui.treat = treatsAt(ui.loc)[0].id;
      const specs = specsFor(ui.loc, ui.treat);
      if (!specs.some((s) => s.id === ui.spec)) ui.spec = (specs.find((s) => freeWeek(S, s.id) > 0) || specs[0]).id;
    }
    if (!ui.day || !freeSlots(S, ui.spec, ui.day, except).length) ui.day = DAYS.find((d) => freeSlots(S, ui.spec, d.id, except).length)?.id || DAYS[0].id;
    if (ui.slot && taken(S, ui.spec, ui.day, ui.slot, except)) ui.slot = null;
  }
  const endsAt = (slot, min) => { const [h, m] = slot.split(":").map(Number), t = h * 60 + m + min; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  const prefLine = () => `${S.prefs.pressure} pressure · ${S.prefs.scent} · ${S.prefs.talk}`;

  /* ---------- Treatments view ---------- */
  function heroBlock() {
    const t = T(ui.treat), x = TX[t.id], q = quote(t.id, 1), specs = specsFor(ui.loc, t.id);
    const list = treatsAt(ui.loc).filter((tr) => ui.cat === "All" || tr.cat === ui.cat);
    return `<div class="bs-hero">
      <figure class="bs-visual${ui.anim ? " in" : ""}">${scene(x.scene, true, ALT[x.scene])}
        <figcaption><span class="bs-tag">${t.cat} · Ritual ${x.no}</span><span class="bs-cap">${esc(x.line)}</span></figcaption></figure>
      <div class="bs-menu">
        <div class="bs-studios" role="group" aria-label="Studio">${LOCS.map((l) => `<button type="button" data-bs-loc="${l.id}" aria-pressed="${ui.loc === l.id}"><svg viewBox="0 0 80 56" aria-hidden="true">${STUDIO_ART[l.id]}</svg><span><b>${l.name}</b><small>${l.addr}</small></span></button>`).join("")}</div>
        <p class="bs-studio-note">${STUDIO[ui.loc]} ${LOC(ui.loc).hours}.</p>
        <div class="bs-feature${ui.anim ? " in" : ""}" aria-live="polite">
          <p class="bs-eyebrow">The autumn menu · ${LOC(ui.loc).name}</p>
          <h3 class="bs-display">${t.name}</h3>
          <p class="bs-lede">${t.note}</p>
          <ul class="bs-inc" aria-label="Included">${x.inc.map((i) => `<li>${i}</li>`).join("")}</ul>
          <dl class="bs-facts"><div><dt>Duration</dt><dd>${t.min} min</dd></div><div><dt>Member price</dt><dd>${money(q.total)} <s>${money(q.list)}</s></dd></div><div><dt>Specialists here</dt><dd>${specs.length}</dd></div></dl>
        </div>
        <div class="bs-cats" role="group" aria-label="Filter treatments">${["All", ...CATS].map((c) => `<button type="button" data-bs-cat="${c}" aria-pressed="${ui.cat === c}">${c}</button>`).join("")}</div>
        <ol class="bs-index" aria-label="Treatments">${list.map((tr) => `<li><button type="button" data-bs-treat="${tr.id}" aria-pressed="${ui.treat === tr.id}"><span class="no">${TX[tr.id].no}</span><span class="nm">${tr.name}<small>${tr.cat}</small></span><span class="mn">${tr.min} min</span><span class="pr">${money(quote(tr.id, 1).total)}</span></button></li>`).join("")}</ol>
      </div></div>`;
  }
  function specBlock() {
    const list = specsFor(ui.loc, ui.treat), s = SP(ui.spec), first = firstFree(S, s.id);
    return `<section class="bs-sec" aria-labelledby="bs-h-spec"><header><span class="no">02</span><h4 id="bs-h-spec">Your specialist</h4><p>${list.length} at ${LOC(ui.loc).name} for ${T(ui.treat).cat.toLowerCase()}</p></header>
      <div class="bs-specs" role="group" aria-label="Specialists">${list.map((p) => { const free = freeWeek(S, p.id); return `<button type="button" data-bs-spec="${p.id}" aria-pressed="${ui.spec === p.id}" ${ui.mode === "resched" && p.id !== ui.spec ? "disabled" : ""}>${mono(p, 40)}<span><b>${p.name}</b><small>${p.title}</small></span><em>${free ? free + " free" : "Fully booked"}</em></button>`; }).join("")}</div>
      <article class="bs-profile">${mono(s, 72)}<div><p class="bs-eyebrow">${s.title} · ${s.yrs} years</p><h5>${s.name}</h5><p class="bs-quote">“${BIO[s.id]}”</p><p class="bs-meta">${s.cats.join(" · ")} · ${first ? `Next free: ${first}` : "No free times this week"}</p></div></article></section>`;
  }
  function timeBlock() {
    const s = SP(ui.spec), t = T(ui.treat), except = ui.mode === "resched" ? ui.apptId : null, orig = except && S.appts.find((a) => a.id === except);
    const mineAt = (day, slot) => S.appts.find((a) => a.spec === s.id && a.day === day && a.slot === slot && a.id !== except);
    return `<section class="bs-sec" id="bs-time" aria-labelledby="bs-h-time"><header><span class="no">03</span><h4 id="bs-h-time">${ui.mode === "resched" ? "Choose a new time" : "Choose a time"}</h4><p>With ${s.name.split(" ")[0]} · ${t.min} min</p></header>
      <div class="bs-days" role="group" aria-label="Day">${DAYS.map((d) => { const n = freeSlots(S, s.id, d.id, except).length; return `<button type="button" data-bs-day="${d.id}" aria-pressed="${ui.day === d.id}" ${n ? "" : "disabled"} aria-label="${d.long}, ${n ? n + " times free" : "fully booked"}"><span>${d.w}</span><b>${d.d}</b><small>${n ? n + " free" : "Full"}</small></button>`; }).join("")}</div>
      <div class="bs-slots" role="group" aria-label="Times on ${DAY(ui.day).long}">${SLOTS.map((sl) => { const cur = orig && orig.day === ui.day && orig.slot === sl, mine = mineAt(ui.day, sl), tk = taken(S, s.id, ui.day, sl, except), sel = ui.slot === sl; const state = cur ? "Current" : mine ? "Your visit" : tk ? "Booked" : `until ${endsAt(sl, t.min)}`; return `<button type="button" class="${tk ? "taken" : ""}${mine ? " mine" : ""}${cur ? " cur" : ""}" data-bs-slot="${sl}" aria-pressed="${sel}" ${tk ? "disabled" : ""} aria-label="${DAY(ui.day).long}, ${sl}, ${cur ? "your current time" : mine ? "your booked visit" : tk ? "booked" : "available"}"><b>${sl}</b><small>${state}</small></button>`; }).join("")}</div>
      <p class="bs-legend"><span class="free">Available</span><span class="tk">Booked by another guest</span><span class="mine">Your visit</span></p></section>`;
  }
  function ticket() {
    const t = T(ui.treat), s = SP(ui.spec), l = LOC(ui.loc), d = DAY(ui.day);
    const orig = ui.mode === "resched" && S.appts.find((a) => a.id === ui.apptId);
    const nth = orig ? nthOf(S, orig.id) : ui.slot ? nextNth(S, ui.day, ui.slot) : nextNth(S, "d5", "17:30");
    const q = quote(t.id, nth), ready = !!ui.slot;
    return `<aside class="bs-ticket" aria-labelledby="bs-h-tk"><p class="bs-eyebrow"><span class="no">04</span> ${orig ? "Move your visit" : "Your visit"}</p><h4 id="bs-h-tk">${t.name}</h4>
      <dl><div><dt>When</dt><dd>${orig ? `<s>${DAY(orig.day).label}, ${orig.slot}</s><br>` : ""}${ready ? `${d.long}<br>${ui.slot}–${endsAt(ui.slot, t.min)}` : '<span class="bs-pending">Choose a time</span>'}</dd></div><div><dt>With</dt><dd>${s.name}</dd></div><div><dt>Where</dt><dd>${l.name}, ${l.addr}</dd></div><div><dt>Notes</dt><dd>${prefLine()} <button type="button" class="bs-link" data-bs-goprefs>Edit</button></dd></div></dl>
      <div class="bs-bill"><div><span>${t.name}</span><span>${money(q.list)}</span></div><div><span>Maison Circle, 10%</span><span>−${money(q.off)}</span></div>${q.gift ? `<div class="gift"><span>${ico("gift", 14)} Fifth-visit ritual</span><span>Included</span></div>` : ""}<div class="tot"><span>At the studio</span><b>${money(q.total)}</b></div></div>
      <button type="button" class="bs-btn" data-bs-confirm ${ready ? "" : "disabled"}>${orig ? "Move appointment" : ready ? "Confirm booking" : "Choose a time to book"}</button>
      ${orig ? '<button type="button" class="bs-btn ghost" data-bs-endresched>Keep the original time</button>' : ""}
      <p class="bs-fine">A demonstration. No appointment is made and nothing is charged.</p></aside>`;
  }
  function doneBlock() {
    const a = S.appts.find((x) => x.id === ui.done.id); if (!a) { ui.done = null; return null; }
    const t = T(a.treat), s = SP(a.spec), l = LOC(a.loc), d = DAY(a.day), q = quote(a.treat, nthOf(S, a.id));
    return `<div class="bs-done" role="status"><figure>${scene(TX[t.id].scene, false)}</figure><div class="bs-done-t" tabindex="-1">
      <p class="bs-eyebrow">${ico("check", 14)} ${ui.done.moved ? "Appointment moved" : "Booking confirmed"} · ${ref(a)}</p>
      <h3>See you ${d.long.replace(/ \d+ November/, "")},<br>${d.d} November at ${a.slot}</h3>
      <p>${t.name} with ${s.name} at ${l.name}, ${l.addr}. ${q.gift ? "Your fifth-visit ritual is included." : `${money(q.total)} at the studio, member price.`}</p>
      <p class="bs-done-n">Your notes are with ${s.name.split(" ")[0]}: ${prefLine().toLowerCase()}.</p>
      <div class="bs-act"><button type="button" class="bs-btn light" data-bs-view="appts">See your appointments</button><button type="button" class="bs-btn ghost light" data-bs-again>Book another treatment</button></div></div></div>`;
  }
  function viewBook() {
    if (ui.done) { const d = doneBlock(); if (d) return d; }
    settle();
    const orig = ui.mode === "resched" && S.appts.find((a) => a.id === ui.apptId);
    const banner = orig ? `<div class="bs-banner">${ico("clock", 16)}<span>Moving <b>${T(orig.treat).name}</b> with ${SP(orig.spec).name.split(" ")[0]}, now ${DAY(orig.day).label} at ${orig.slot}. Pick a new time below.</span></div>` : "";
    return `${banner}${orig ? "" : heroBlock()}<div class="bs-flow"><div class="bs-flow-main">${orig ? "" : specBlock()}${timeBlock()}</div>${ticket()}</div>`;
  }

  /* ---------- Membership view ---------- */
  function memberCard() {
    const v = visits(S);
    return `<div class="bs-mcard"><svg class="bs-guil" viewBox="0 0 320 200" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<circle cx="300" cy="-10" r="${40 + i * 22}" fill="none" stroke="#E8C9BF" stroke-opacity="${0.22 - i * 0.02}"/>`).join("")}</svg>
      <span class="k">Maison Circle</span><b class="nm">Alex Morgan</b>
      <span class="bs-dots" role="img" aria-label="${v} of ${PRIORITY_AT} visits towards priority booking">${Array.from({ length: PRIORITY_AT }, (_, i) => `<i class="${i < v ? "on" : ""}${(i + 1) % GIFT_EVERY === 0 ? " gift" : ""}"></i>`).join("")}</span>
      <span class="f"><span>${v} visits</span><span>Member since 2025</span></span></div>`;
  }
  function careRecs() {
    // Suggested next visits from the history, skipping anything already booked.
    const booked = new Set(S.appts.map((a) => a.treat));
    const rules = [["facial", "Your skin routine", "Every 4–6 weeks. Your last facial was 3 October."], ["cut", "Keep the shape", "Every 8 weeks keeps the line clean. Last cut 12 September."], ["deep", "Back and shoulders", "Every 10–12 weeks. Last session 20 August."]];
    return rules.filter(([t]) => !booked.has(t) && S.history.some((h) => h.treat === t)).slice(0, 2).map(([t, title, why]) => ({ treat: t, spec: S.history.find((h) => h.treat === t).spec, title, why }));
  }
  function viewMember() {
    const recs = careRecs();
    return `<div class="bs-member"><div class="bs-col">${memberCard()}
        <ul class="bs-bens">${benefits(S).map((b) => `<li class="${b.on ? "on" : "lock"}"><span class="st">${b.on ? ico("check", 14) : ico("lock", 14)}</span><div><b>${b.name}</b><small>${b.text}</small></div><em>${b.note}</em></li>`).join("")}</ul></div>
      <div class="bs-col"><section class="bs-panel"><header><h4>Suggested for you</h4><span>From your visit history</span></header>${recs.length ? `<ul class="bs-recs">${recs.map((r) => `<li><figure>${scene(TX[r.treat].scene, false)}</figure><div><b>${r.title}</b><small>${r.why}</small><button type="button" class="bs-link" data-bs-rec="${r.treat}|${r.spec}">${T(r.treat).name} with ${SP(r.spec).name.split(" ")[0]} ${ico("arrow", 14)}</button></div></li>`).join("")}</ul>` : `<p class="bs-empty">You're up to date with your routine.</p>`}</section>
        <section class="bs-panel" id="bs-prefs"><header><h4>Preferences</h4><span>Shared with your specialist before each visit</span></header>
        ${Object.entries(PREFS).map(([k, opts]) => `<div class="bs-pref"><span id="bs-pl-${k}">${{ pressure: "Massage pressure", scent: "Products", talk: "During treatment", remind: "Reminders" }[k]}</span><div role="group" aria-labelledby="bs-pl-${k}">${opts.map((o) => `<button type="button" data-bs-pref="${k}" data-v="${esc(o)}" aria-pressed="${S.prefs[k] === o}">${o}</button>`).join("")}</div></div>`).join("")}</section></div></div>`;
  }

  /* ---------- Appointments view ---------- */
  function viewAppts() {
    const up = upcoming(S), v = visits(S);
    return `<div class="bs-appts-v"><section><header class="bs-vh"><h4>Upcoming</h4><span>${up.length ? up.length + " booked" : "Nothing booked"}</span></header>
      ${up.length ? `<ul class="bs-appts">${up.map((a) => { const t = T(a.treat), s = SP(a.spec), q = quote(a.treat, nthOf(S, a.id)), d = DAY(a.day); return `<li class="bs-appt" id="bs-a-${a.id}"><span class="bs-date"><small>${d.w}</small><b>${d.d}</b><small>Nov</small></span><figure>${scene(TX[t.id].scene, false)}</figure>
        <div class="bs-appt-t"><b>${t.name}</b><small>${a.slot}–${endsAt(a.slot, t.min)} · ${s.name} · ${LOC(a.loc).name}</small>${q.gift ? `<em>${ico("gift", 14)} Fifth-visit ritual included</em>` : `<em class="plain">${money(q.total)} member price · ${ref(a)}</em>`}
        ${ui.askCancel === a.id ? `<div class="bs-ask" role="group" aria-label="Cancel this appointment?"><span>Cancel this appointment?</span><button type="button" class="bs-mini danger" data-bs-cancel="${a.id}">Yes, cancel</button><button type="button" class="bs-mini" data-bs-nocancel>Keep it</button></div>`
          : `<div class="bs-appt-act"><button type="button" class="bs-mini" data-bs-resched="${a.id}">Reschedule</button><button type="button" class="bs-mini" data-bs-askcancel="${a.id}">Cancel</button><button type="button" class="bs-mini" data-bs-checkin="${a.id}" title="Demo: moves time forward to the visit">Check in</button></div>`}</div></li>`; }).join("")}</ul>`
        : `<div class="bs-empty-c"><p>Nothing booked yet. ${(v + 1) % GIFT_EVERY === 0 ? "Your next visit is your fifth and comes with a complimentary ritual." : "Book a treatment and it appears here."}</p><button type="button" class="bs-btn" data-bs-view="book">Browse treatments</button></div>`}</section>
      <section><header class="bs-vh"><h4>Visit history</h4><span>${v} visits</span></header><ol class="bs-hist">${S.history.map((h) => `<li><span>${h.date}</span><b>${T(h.treat).name}</b><small>${SP(h.spec).name.split(" ")[0]} · ${LOC(h.loc).name}</small></li>`).join("")}</ol></section></div>`;
  }

  /* ---------- Render ---------- */
  root.innerHTML = `<div class="bs">
    <header class="bs-top"><span class="bs-brand"><b>Maison Ondine</b><small>Beauty &amp; wellness · three houses</small></span>
      <nav class="bs-nav" aria-label="Maison Ondine"><button type="button" data-bs-view="book">Treatments</button><button type="button" data-bs-view="member">Membership</button><button type="button" data-bs-view="appts">Appointments <em data-bs-count></em></button></nav>
      <button type="button" class="bs-reset" data-bs-reset>${ico("reset", 15)}<span>Reset demo</span></button></header>
    <div class="bs-main" data-bs-main tabindex="-1"></div>
    <p class="sr-only" aria-live="polite" data-bs-live></p></div>`;
  const $ = (s) => root.querySelector(s);
  const say = (t) => { $("[data-bs-live]").textContent = t; };

  function render(focus) {
    root.querySelectorAll(".bs-nav [data-bs-view]").forEach((b) => { const on = b.dataset.bsView === ui.view; b.setAttribute("aria-pressed", String(on)); });
    $("[data-bs-count]").textContent = S.appts.length || "";
    $("[data-bs-main]").innerHTML = { book: viewBook, member: viewMember, appts: viewAppts }[ui.view]();
    $("[data-bs-main]").dataset.view = ui.view;
    ui.anim = false;
    if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }
  const scrollTo = (sel) => { const el = $(sel); if (!el) return; const top = el.getBoundingClientRect().top; if (top < 70 || top > innerHeight * 0.7) window.scrollBy({ top: top - 96, behavior: reduce() ? "auto" : "smooth" }); };
  const clearMode = () => { ui.mode = null; ui.apptId = null; };

  root.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    let el;
    if ((el = b("[data-bs-view]"))) {
      ui.view = el.dataset.bsView; ui.askCancel = null;
      if (ui.view !== "book") ui.done = null;
      render(`.bs-nav [data-bs-view="${ui.view}"]`); if (el.closest(".bs-main")) scrollTo(".bs-top"); return;
    }
    if ((el = b("[data-bs-loc]"))) { ui.loc = el.dataset.bsLoc; ui.spec = null; ui.slot = null; ui.anim = true; return render(`[data-bs-loc="${ui.loc}"]`); }
    if ((el = b("[data-bs-cat]"))) {
      ui.cat = el.dataset.bsCat;
      const first = treatsAt(ui.loc).find((t) => ui.cat === "All" || t.cat === ui.cat);
      if (first && T(ui.treat).cat !== ui.cat && ui.cat !== "All") { ui.treat = first.id; ui.spec = null; ui.slot = null; ui.anim = true; }
      return render(`[data-bs-cat="${ui.cat}"]`);
    }
    if ((el = b("[data-bs-treat]"))) { if (ui.treat !== el.dataset.bsTreat) { ui.treat = el.dataset.bsTreat; ui.spec = null; ui.slot = null; ui.anim = true; } render(`[data-bs-treat="${ui.treat}"]`); say(`${T(ui.treat).name}: ${T(ui.treat).min} minutes, ${money(quote(ui.treat, 1).total)} member price. ${specsFor(ui.loc, ui.treat).length} specialists at ${LOC(ui.loc).name}.`); return; }
    if ((el = b("[data-bs-spec]"))) { ui.spec = el.dataset.bsSpec; ui.slot = null; ui.day = null; render(`[data-bs-spec="${ui.spec}"]`); say(`${SP(ui.spec).name}. ${freeWeek(S, ui.spec)} times free this week.`); return; }
    if ((el = b("[data-bs-day]"))) { ui.day = el.dataset.bsDay; ui.slot = null; return render(`[data-bs-day="${ui.day}"]`); }
    if ((el = b("[data-bs-slot]"))) { ui.slot = el.dataset.bsSlot; return render(`[data-bs-slot="${ui.slot}"]`); }
    if (b("[data-bs-confirm]")) {
      if (!ui.slot) return;
      if (ui.mode === "resched") {
        const from = reschedule(S, ui.apptId, ui.day, ui.slot); if (!from) return render();
        ui.done = { id: ui.apptId, moved: true }; clearMode(); ui.slot = null; save(); render(".bs-done-t"); scrollTo(".bs-top");
        say(`Appointment moved to ${DAY(S.appts.find((a) => a.id === ui.done.id).day).long}. ${DAY(from.day).label}, ${from.slot} is free again.`); return;
      }
      const a = book(S, { loc: ui.loc, treat: ui.treat, spec: ui.spec, day: ui.day, slot: ui.slot }); if (!a) return render();
      ui.done = { id: a.id }; ui.slot = null; save(); render(".bs-done-t"); scrollTo(".bs-top");
      say(`Booked ${T(a.treat).name} on ${DAY(a.day).long} at ${a.slot}. Reference ${ref(a)}.`); return;
    }
    if (b("[data-bs-again]")) { ui.done = null; render(".bs-index [aria-pressed=true]"); return; }
    if (b("[data-bs-endresched]")) { clearMode(); ui.slot = null; ui.view = "appts"; render(".bs-nav [data-bs-view=appts]"); return; }
    if ((el = b("[data-bs-resched]"))) {
      const a = S.appts.find((x) => x.id === el.dataset.bsResched); if (!a) return;
      Object.assign(ui, { mode: "resched", apptId: a.id, done: null, view: "book", loc: a.loc, treat: a.treat, spec: a.spec, day: a.day, slot: null, askCancel: null });
      render(`[data-bs-day="${ui.day}"]`); scrollTo(".bs-top"); return;
    }
    if ((el = b("[data-bs-askcancel]"))) { ui.askCancel = el.dataset.bsAskcancel; return render(`[data-bs-cancel="${ui.askCancel}"]`); }
    if (b("[data-bs-nocancel]")) { const id = ui.askCancel; ui.askCancel = null; return render(`[data-bs-askcancel="${id}"]`); }
    if ((el = b("[data-bs-cancel]"))) {
      const a = cancel(S, el.dataset.bsCancel); ui.askCancel = null;
      if (ui.apptId === a?.id) clearMode();
      if (ui.done?.id === a?.id) ui.done = null;
      save(); render(".bs-nav [data-bs-view=appts]"); say(a ? `Cancelled. ${DAY(a.day).label}, ${a.slot} with ${SP(a.spec).name.split(" ")[0]} is free again.` : ""); return;
    }
    if ((el = b("[data-bs-checkin]"))) {
      const a = checkIn(S, el.dataset.bsCheckin); if (!a) return;
      if (ui.done?.id === a.id) ui.done = null;
      if (ui.apptId === a.id) clearMode();
      save(); render(".bs-nav [data-bs-view=appts]"); say(`Checked in. ${visits(S)} visits in your Maison Circle.`); return;
    }
    if ((el = b("[data-bs-rec]"))) {
      const [treat, spec] = el.dataset.bsRec.split("|");
      clearMode(); Object.assign(ui, { done: null, view: "book", loc: SP(spec).loc, treat, spec, cat: "All", day: null, slot: null, anim: true });
      render(`[data-bs-spec="${spec}"]`); scrollTo("#bs-time"); return;
    }
    if (b("[data-bs-goprefs]")) { ui.view = "member"; render(); const p = $("#bs-prefs"); p?.scrollIntoView({ block: "start", behavior: reduce() ? "auto" : "smooth" }); p?.querySelector("[aria-pressed=true]")?.focus({ preventScroll: true }); return; }
    if ((el = b("[data-bs-pref]"))) { S.prefs[el.dataset.bsPref] = el.dataset.v; save(); return render(`[data-bs-pref="${el.dataset.bsPref}"][data-v="${CSS.escape(el.dataset.v)}"]`); }
    if (b("[data-bs-reset]")) { S = fresh(); Object.assign(ui, { view: "book", loc: "old", cat: "All", treat: "facial", spec: null, day: null, slot: null, mode: null, apptId: null, done: null, askCancel: null, anim: true }); save(); render("[data-bs-reset]"); say("Demo reset: no appointments, four visits in history."); }
  });
  render();
})();
