// Hospitality Experience Studio: a guest's journey through three fictional restaurants.
// Discover a venue, pick a date, party size, time and a real table on the floor plan, add an occasion and
// preferences, confirm, then modify, cancel or "simulate the evening" from My table.
// One state model: every booking holds a specific table, so availability, the floor plan, confirmations,
// history and The Table Club loyalty always agree. Synthetic data only; nothing is sent or reserved.
(() => {
  /* CORE START */
  const TODAY = new Date(2026, 9, 30);
  const DAYS = 7;
  const TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateAt = (i) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + i);
  const DATES = Array.from({ length: DAYS }, (_, i) => keyOf(dateAt(i)));
  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

  const VENUES = [
    { id: "saffron", name: "Saffron & Ash", kind: "Open-fire kitchen", area: "Old Town", price: "$$$", tone: "ember",
      blurb: "Caspian produce cooked over vine embers, served at long wooden tables under low brass light.",
      hours: "Tue–Sun · 18:00–23:00",
      zones: [{ id: "fire", label: "Fire room", x: 2, y: 4, w: 58, h: 92 }, { id: "window", label: "Window", x: 62, y: 4, w: 36, h: 44 }, { id: "court", label: "Heated courtyard", x: 62, y: 52, w: 36, h: 44 }],
      tables: [["F1", "fire", 2, 12, 22, "r"], ["F2", "fire", 2, 30, 22, "r"], ["F3", "fire", 4, 12, 52, "sq"], ["F4", "fire", 4, 32, 52, "sq"], ["F5", "fire", 6, 22, 80, "long"], ["F6", "fire", 2, 48, 22, "r"],
        ["W1", "window", 2, 70, 20, "r"], ["W2", "window", 2, 86, 20, "r"], ["W3", "window", 4, 78, 38, "sq"],
        ["C1", "court", 4, 70, 66, "sq"], ["C2", "court", 6, 84, 74, "long"], ["C3", "court", 8, 76, 90, "long"]] },
    { id: "mareya", name: "Mareya", kind: "Seafood by the boulevard", area: "Seafront", price: "$$", tone: "sea",
      blurb: "The morning's catch, simply grilled, with a wall of windows onto the water.",
      hours: "Daily · 18:00–23:30",
      zones: [{ id: "sea", label: "Sea window", x: 2, y: 4, w: 96, h: 30 }, { id: "main", label: "Main room", x: 2, y: 38, w: 64, h: 58 }, { id: "nook", label: "Private nook", x: 70, y: 38, w: 28, h: 58 }],
      tables: [["S1", "sea", 2, 12, 20, "r"], ["S2", "sea", 2, 30, 20, "r"], ["S3", "sea", 2, 48, 20, "r"], ["S4", "sea", 4, 68, 20, "sq"], ["S5", "sea", 2, 86, 20, "r"],
        ["M1", "main", 4, 14, 54, "sq"], ["M2", "main", 4, 34, 54, "sq"], ["M3", "main", 6, 24, 80, "long"], ["M4", "main", 2, 52, 56, "r"], ["M5", "main", 4, 52, 82, "sq"],
        ["N1", "nook", 8, 84, 66, "long"]] },
    { id: "oda", name: "Oda", kind: "Counter tasting kitchen", area: "Arts quarter", price: "$$$$", tone: "olive",
      blurb: "Twelve seats around an open kitchen and a short, seasonal tasting menu. Small parties only.",
      hours: "Wed–Sat · two sittings, 18:00 and 20:30",
      zones: [{ id: "counter", label: "Chef's counter", x: 2, y: 4, w: 96, h: 50 }, { id: "booth", label: "Booths", x: 2, y: 58, w: 96, h: 38 }],
      tables: [["K1", "counter", 2, 12, 30, "stool"], ["K2", "counter", 2, 27, 30, "stool"], ["K3", "counter", 2, 42, 30, "stool"], ["K4", "counter", 2, 58, 30, "stool"], ["K5", "counter", 2, 73, 30, "stool"], ["K6", "counter", 2, 88, 30, "stool"],
        ["B1", "booth", 4, 25, 77, "sq"], ["B2", "booth", 4, 50, 77, "sq"], ["B3", "booth", 4, 75, 77, "sq"]],
      sittings: ["18:00", "20:30"] },
  ];
  const VENUE = Object.fromEntries(VENUES.map((v) => [v.id, v]));
  const tableList = (v) => VENUE[v].tables.map(([id, zone, seats, x, y, shape]) => ({ id, zone, seats, x, y, shape }));
  const maxParty = (v) => Math.max(...VENUE[v].tables.map((t) => t[2]));
  const suits = (seats, party) => seats >= party && seats <= party + 2;
  const openAt = (v, time) => !VENUE[v].sittings || VENUE[v].sittings.includes(time);

  // Deterministic "already booked by other guests" pattern, so the same table is taken on every visit.
  const POP = [0.22, 0.32, 0.48, 0.62, 0.68, 0.56, 0.42, 0.28];
  const DAYF = [0.95, 0.6, 0.7, 0.8, 0.95, 1.25, 1.35]; // Sun..Sat
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
  function takenByOthers(v, date, time, table) {
    const p = Math.min(0.9, POP[TIMES.indexOf(time)] * DAYF[parseKey(date).getDay()]);
    return hash(`${v}|${date}|${time}|${table}`) < p;
  }
  const holds = (b) => b.status === "upcoming" || b.status === "visited";

  // Status of every table for a venue/date/time. Our own bookings hold their exact table.
  function plan(state, v, date, time, party, exceptId) {
    return tableList(v).map((t) => {
      const mine = state.bookings.find((b) => holds(b) && b.venue === v && b.date === date && b.time === time && b.table === t.id && b.id !== exceptId);
      const other = takenByOthers(v, date, time, t.id);
      const status = !openAt(v, time) ? "closed" : mine ? "yours" : other ? "taken" : !suits(t.seats, party) ? "size" : "free";
      return { ...t, status, booking: mine ? mine.id : null };
    });
  }
  const freeCount = (state, v, date, time, party, exceptId) => plan(state, v, date, time, party, exceptId).filter((t) => t.status === "free").length;
  const bestTable = (state, v, date, time, party, exceptId) => plan(state, v, date, time, party, exceptId).filter((t) => t.status === "free").sort((a, b) => a.seats - b.seats)[0] || null;

  const CLUB = [{ k: "Guest", min: 0, perk: "Birthday dessert on us" }, { k: "Regular", min: 3, perk: "A welcome glass on arrival" }, { k: "Insider", min: 6, perk: "Chef's counter access and early booking" }];
  const visits = (state) => state.past.length + state.bookings.filter((b) => b.status === "visited").length;
  const tierOf = (n) => [...CLUB].reverse().find((t) => n >= t.min);
  const perksOf = (n) => CLUB.filter((t) => n >= t.min).map((t) => t.perk);

  function seed() {
    return {
      v: 1, seq: 4120,
      past: [{ id: "HS-3981", venue: "saffron", date: "2026-09-12", time: "19:30", party: 2, table: "W1", occasion: "", status: "visited" }, { id: "HS-4057", venue: "mareya", date: "2026-10-04", time: "20:00", party: 4, table: "M1", occasion: "Birthday", status: "visited" }],
      bookings: [],
    };
  }
  // Every change goes through these: they validate against the plan, so capacity can never go below zero.
  function reserve(state, d) {
    if (!d.venue || !d.date || !d.time || !d.table || d.party < 1) return { ok: false, why: "Choose a time and a table." };
    const t = plan(state, d.venue, d.date, d.time, d.party, d.editing).find((x) => x.id === d.table);
    if (!t || t.status !== "free") return { ok: false, why: "That table is no longer free. Pick another." };
    if (d.editing) {
      const b = state.bookings.find((x) => x.id === d.editing && x.status === "upcoming");
      if (!b) return { ok: false, why: "Booking not found." };
      Object.assign(b, { venue: d.venue, date: d.date, time: d.time, party: d.party, table: d.table, occasion: d.occasion, prefs: [...d.prefs], note: d.note, changed: true });
      return { ok: true, booking: b, changed: true };
    }
    const b = { id: "HS-" + ++state.seq, venue: d.venue, date: d.date, time: d.time, party: d.party, table: d.table, occasion: d.occasion, prefs: [...d.prefs], note: d.note, status: "upcoming" };
    state.bookings.push(b);
    return { ok: true, booking: b };
  }
  function cancel(state, id) { const b = state.bookings.find((x) => x.id === id && x.status === "upcoming"); if (b) b.status = "cancelled"; return !!b; }
  function visit(state, id) { const b = state.bookings.find((x) => x.id === id && x.status === "upcoming"); if (b) b.status = "visited"; return !!b; }
  /* CORE END */

  if (typeof document === "undefined") return;
  const root = document.querySelector("[data-hospitality-studio]");
  if (!root) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "bb-hospitality-studio-v1";
  const fmtDay = (k, o = { weekday: "short", day: "numeric", month: "short" }) => parseKey(k).toLocaleDateString("en-GB", o);

  const MENUS = {
    saffron: { start: [["Ember aubergine", "Smoked yoghurt, walnut, pomegranate", 9, ["V"], ["#7B3B5A", "#E9DCC6", "#C0392B"]], ["Lamb kofta skewer", "Sumac onions, flatbread", 11, [], ["#8C4A2F", "#D9A066", "#5B8C3A"]], ["Fire-roasted peppers", "Feta, oregano, olive oil", 8, ["V", "GF"], ["#D2502A", "#F2E8D5", "#4E7A3A"]]],
      main: [["Whole sea bream", "Charred lemon, herb salsa", 26, ["GF"], ["#C9C2B0", "#E7B44C", "#3F7D3A"]], ["Saffron chicken", "Vine-ember thighs, rice pilaf", 21, ["GF"], ["#E2A32D", "#F3E3B3", "#7A4A2A"]], ["Pumpkin & chestnut", "Brown butter, sage, labneh", 18, ["V"], ["#E07B2C", "#F2E3C9", "#5E7D3A"]]],
      sweet: [["Quince & cream", "Slow-baked quince, clotted cream", 9, ["V", "GF"], ["#E4A23A", "#FAF1DC", "#9C3D2E"]], ["Burnt honey cake", "Walnut, sour cherry", 8, ["V", "N"], ["#9C5A2B", "#E8C38A", "#7A1F2B"]]],
      drinks: [["Sea-buckthorn spritz", "Low alcohol", 9, ["VG"], ["#E58A1F", "#FBE3B8", "#E58A1F"]], ["Saperavi", "Georgian red, by the glass", 11, ["VG"], ["#6B1E2E", "#B54A5E", "#6B1E2E"]]] },
    mareya: { start: [["Raw sea bass", "Citrus, fennel, chilli", 13, ["GF"], ["#F1E7DA", "#E8956B", "#5E8F3A"]], ["Crisp anchovies", "Lemon aioli", 9, [], ["#C9A35A", "#F1E4C2", "#E2C24A"]], ["Tomato & caper salad", "Red onion, basil", 8, ["VG", "GF"], ["#D23A2A", "#F2D6C2", "#3C7A3A"]]],
      main: [["Grilled octopus", "Potato, smoked paprika", 24, ["GF"], ["#8E3C4A", "#E7C27E", "#B33A2A"]], ["Catch of the day", "Whole, simply grilled", 28, ["GF"], ["#D6CFC0", "#E7B44C", "#3F7D3A"]], ["Seafood rice", "Saffron, mussels, prawns", 25, ["GF"], ["#E5A93A", "#F2DDAB", "#C0452E"]]],
      sweet: [["Lemon posset", "Shortbread crumb", 8, ["V"], ["#F2D35C", "#FBF3D4", "#C9A25A"]], ["Fig & almond tart", "Crème fraîche", 9, ["V", "N"], ["#6E3B57", "#E8C79A", "#F5EFE2"]]],
      drinks: [["Coastal white", "Crisp, by the glass", 10, ["VG"], ["#E9D98A", "#F7F0C6", "#E9D98A"]], ["Seaside highball", "Gin, tonic, samphire", 11, ["VG"], ["#BFE3E8", "#EAF6F7", "#5E9C6A"]]] },
    oda: { start: [["Cured trout", "Beetroot, horseradish snow", 0, ["GF"], ["#E57A63", "#F3E6DD", "#8C2F4A"]], ["Mushroom broth", "Kombu, chives", 0, ["VG", "GF"], ["#7A5A3A", "#D9C3A1", "#4E7A3A"]]],
      main: [["Duck, plum, celeriac", "Aged duck breast", 0, ["GF"], ["#7A2E3A", "#D99A6A", "#4A2A3A"]], ["Celeriac steak", "Black garlic, hazelnut", 0, ["V", "N"], ["#E2D3B4", "#5A3A2A", "#7A8C3A"]]],
      sweet: [["Sea-buckthorn curd", "Meringue, thyme", 0, ["V", "GF"], ["#F09A2A", "#FBEFD8", "#7A8C3A"]]],
      drinks: [["Pairing flight", "Five glasses through the menu", 48, ["VG"], ["#8B2E3A", "#E7B44C", "#8B2E3A"]], ["Tea pairing", "Four teas, no alcohol", 22, ["VG"], ["#9C6B2A", "#E9D3A8", "#4E7A3A"]]] },
  };
  const COURSES = [["start", "To start"], ["main", "Mains"], ["sweet", "Sweet"], ["drinks", "Drinks"]];
  const OCCASIONS = ["None", "Birthday", "Anniversary", "Business", "Celebration"];
  const PREFS = ["Vegetarian", "Nut allergy", "High chair", "Quiet table", "Step-free access"];

  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1 || !Array.isArray(S.bookings)) S = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const freshDraft = (venue = "saffron") => ({ venue, date: DATES[1], party: 2, time: null, table: null, occasion: "None", prefs: [], note: "", editing: null });
  const ui = { view: "discover", venue: "saffron", course: "start", vegOnly: false, draft: freshDraft(), confirm: null, cancelAsk: null, msg: "" };

  /* ---------- Art ---------- */
  const TONE = { ember: ["#2A1611", "#B5532B", "#E8A55A", "#F6E7D2"], sea: ["#0F2A3A", "#23607E", "#7FB6C9", "#EAF2F2"], olive: ["#1C1F16", "#4B5A3C", "#B89650", "#EFE9DA"] };
  function cover(v, cls = "") {
    const [dark, main, light, paper] = TONE[VENUE[v].tone];
    const scene = {
      saffron: `<rect width="400" height="260" fill="${dark}"/><circle cx="300" cy="70" r="90" fill="${main}" opacity=".35"/><path d="M0 200h400v60H0z" fill="#3A2016"/>
        <path d="M118 0v58" stroke="${light}" stroke-width="1.5"/><path d="M98 58h40l-8 16h-24z" fill="${light}"/><ellipse cx="118" cy="82" rx="46" ry="10" fill="${light}" opacity=".25"/>
        <ellipse cx="200" cy="196" rx="150" ry="22" fill="#5A3322"/><ellipse cx="150" cy="186" rx="34" ry="9" fill="${paper}"/><ellipse cx="150" cy="184" rx="18" ry="4.5" fill="${main}"/><ellipse cx="250" cy="186" rx="34" ry="9" fill="${paper}"/><ellipse cx="250" cy="184" rx="16" ry="4" fill="#6B8F3A"/>
        <path d="M320 150c6-16 16-20 14-36 10 12 12 22 8 36z" fill="${light}"/><path d="M326 150c3-8 8-10 7-18 5 6 6 11 4 18z" fill="#FFE2A8"/>`,
      mareya: `<rect width="400" height="260" fill="${paper}"/><rect x="0" y="0" width="400" height="150" fill="${light}" opacity=".55"/><path d="M0 120c60-8 120 8 200 0s140-10 200 0v30H0z" fill="${main}" opacity=".7"/><circle cx="310" cy="58" r="24" fill="#F6D58A"/>
        <path d="M0 150h400" stroke="${dark}" stroke-width="3"/><path d="M100 0v150M300 0v150" stroke="${dark}" stroke-width="3"/>
        <ellipse cx="200" cy="214" rx="160" ry="26" fill="#E5DACA"/><ellipse cx="200" cy="206" rx="52" ry="13" fill="#fff"/><path d="M168 205c14-10 44-10 60 0-14 8-44 8-60 0z" fill="#C9C2B0"/><path d="M228 205l12-7v14z" fill="#C9C2B0"/><circle cx="182" cy="203" r="2" fill="${dark}"/>`,
      oda: `<rect width="400" height="260" fill="${dark}"/><rect x="0" y="150" width="400" height="16" fill="${light}" opacity=".85"/><rect x="0" y="166" width="400" height="94" fill="#2B3022"/>
        ${[70, 160, 250, 340].map((x) => `<path d="M${x} 0v52" stroke="${light}" stroke-width="1.2"/><path d="M${x - 16} 52h32l-6 12h-20z" fill="${light}"/><ellipse cx="${x}" cy="74" rx="34" ry="8" fill="${light}" opacity=".18"/>`).join("")}
        ${[90, 200, 310].map((x) => `<ellipse cx="${x}" cy="148" rx="26" ry="6" fill="${paper}"/><circle cx="${x}" cy="145" r="6" fill="${main}"/><circle cx="${x + 9}" cy="146" r="3" fill="#C0452E"/>`).join("")}
        ${[60, 130, 200, 270, 340].map((x) => `<rect x="${x - 10}" y="190" width="20" height="5" rx="2" fill="${light}"/><path d="M${x} 195v40" stroke="${light}" stroke-width="2"/>`).join("")}`,
    }[v];
    return `<svg class="hs-cover-art ${cls}" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scene}</svg>`;
  }
  function plate([sauce, main, garnish], i = 0) {
    const r = (n) => (n * 37 + i * 11) % 23;
    return `<svg class="hs-plate" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff"/><circle cx="50" cy="50" r="46" fill="none" stroke="#E7E0D3" stroke-width="2"/><circle cx="50" cy="50" r="34" fill="#FBF8F2"/>
      <path d="M${24 + r(1) / 3} ${58 - r(2) / 4}c10-14 34-20 52-8" stroke="${sauce}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>
      <ellipse cx="${48 + r(3) / 5}" cy="${48 - r(4) / 6}" rx="${14 + r(5) / 4}" ry="${10 + r(6) / 5}" fill="${main}"/>
      ${[0, 1, 2, 3].map((k) => `<circle cx="${34 + ((k * 13 + r(k)) % 34)}" cy="${36 + ((k * 17 + r(k + 2)) % 30)}" r="${2 + (k % 2)}" fill="${garnish}"/>`).join("")}</svg>`;
  }
  const ICON = { back: '<path d="M15 5 8 12l7 7"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>', minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>', star: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>' };
  const ico = (k, s = 18) => `<svg class="hs-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  /* ---------- Views ---------- */
  const upcoming = () => S.bookings.filter((b) => b.status === "upcoming").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  function tonight(v) { const t = TIMES.reduce((a, time) => a + freeCount(S, v, DATES[0], time, 2), 0); return t; }

  function vDiscover() {
    const v = VENUE[ui.venue];
    return `<div class="hs-discover">
      <div class="hs-covers" role="group" aria-label="Choose a restaurant">${VENUES.map((x) => `<button type="button" class="hs-cov t-${x.tone}" data-hs-venue="${x.id}" aria-pressed="${x.id === ui.venue}">
        ${cover(x.id)}<span class="hs-cov-t"><small>${esc(x.kind)} · ${esc(x.area)}</small><b>${esc(x.name)}</b><em>${tonight(x.id)} tables free tonight for two</em></span></button>`).join("")}</div>
      <article class="hs-venue t-${v.tone}">
        <div class="hs-venue-art">${cover(v.id, "big")}</div>
        <div class="hs-venue-copy">
          <p class="hs-k">${esc(v.kind)} · ${esc(v.area)} · ${v.price}</p>
          <h3>${esc(v.name)}</h3>
          <p class="hs-blurb">${esc(v.blurb)}</p>
          <dl class="hs-facts"><div><dt>Hours</dt><dd>${esc(v.hours)}</dd></div><div><dt>Seating</dt><dd>${v.zones.map((z) => esc(z.label)).join(" · ")}</dd></div><div><dt>Parties</dt><dd>Up to ${maxParty(v.id)} guests</dd></div></dl>
          <div class="hs-sig">${MENUS[v.id].main.slice(0, 3).map((d, i) => `<figure>${plate(d[4], i)}<figcaption>${esc(d[0])}</figcaption></figure>`).join("")}</div>
          <div class="hs-act"><button type="button" class="hs-btn" data-hs-go="reserve">Reserve a table</button><button type="button" class="hs-btn ghost" data-hs-go="menu">See the menu</button></div>
        </div>
      </article></div>`;
  }

  function vReserve() {
    const d = ui.draft, v = VENUE[d.venue];
    const maxP = maxParty(d.venue);
    const slots = TIMES.map((t) => ({ t, n: freeCount(S, d.venue, d.date, t, d.party, d.editing), open: openAt(d.venue, t) }));
    const map = d.time ? plan(S, d.venue, d.date, d.time, d.party, d.editing) : null;
    const table = map && d.table ? map.find((t) => t.id === d.table) : null;
    const dayTotal = (k) => TIMES.reduce((a, t) => a + freeCount(S, d.venue, k, t, d.party, d.editing), 0);
    const ed = d.editing && S.bookings.find((b) => b.id === d.editing);
    return `${ed ? `<div class="hs-edit-bar" role="status"><span>Changing booking <b>${ed.id}</b> · ${esc(VENUE[ed.venue].name)}, ${fmtDay(ed.date)} at ${ed.time}</span><button type="button" class="hs-link" data-hs-stopedit>Keep the original</button></div>` : ""}
    <div class="hs-reserve t-${v.tone}">
      <div class="hs-steps">
        <section class="hs-step"><h4><span>1</span>Restaurant</h4>
          <div class="hs-seg" role="group" aria-label="Restaurant">${VENUES.map((x) => `<button type="button" data-hs-dvenue="${x.id}" aria-pressed="${x.id === d.venue}">${esc(x.name)}</button>`).join("")}</div></section>
        <section class="hs-step"><h4><span>2</span>Date</h4>
          <div class="hs-dates" role="group" aria-label="Date">${DATES.map((k, i) => { const n = dayTotal(k); return `<button type="button" data-hs-date="${k}" aria-pressed="${k === d.date}" ${n ? "" : "disabled"}><small>${i === 0 ? "Tonight" : fmtDay(k, { weekday: "short" })}</small><b>${parseKey(k).getDate()}</b><i class="lv${n > 20 ? 3 : n > 8 ? 2 : n ? 1 : 0}" aria-hidden="true"></i><span class="sr-only">${n} tables across the evening</span></button>`; }).join("")}</div></section>
        <section class="hs-step"><h4><span>3</span>Guests</h4>
          <div class="hs-party"><button type="button" data-hs-party="-1" aria-label="Fewer guests" ${d.party <= 1 ? "disabled" : ""}>${ico("minus")}</button><output aria-live="polite"><b>${d.party}</b> ${d.party === 1 ? "guest" : "guests"}</output><button type="button" data-hs-party="1" aria-label="More guests" ${d.party >= 8 ? "disabled" : ""}>${ico("plus")}</button></div>
          ${d.party > maxP ? `<p class="hs-warn">${esc(v.name)} seats parties of up to ${maxP}. ${d.venue === "oda" ? "Mareya's private nook takes eight." : ""}</p>` : ""}</section>
        <section class="hs-step"><h4><span>4</span>Time</h4>
          <div class="hs-times" role="group" aria-label="Time">${slots.map(({ t, n, open }) => `<button type="button" data-hs-time="${t}" aria-pressed="${t === d.time}" ${n ? "" : "disabled"}><b>${t}</b><small>${!open ? "No sitting" : n === 0 ? "Full" : n === 1 ? "Last table" : `${n} tables`}</small></button>`).join("")}</div></section>
        <section class="hs-step"><h4><span>6</span>Occasion & preferences</h4>
          <div class="hs-chips" role="group" aria-label="Occasion">${OCCASIONS.map((o) => `<button type="button" data-hs-occ="${o}" aria-pressed="${o === d.occasion}">${o}</button>`).join("")}</div>
          <div class="hs-prefs">${PREFS.map((p) => `<label><input type="checkbox" data-hs-pref="${p}" ${d.prefs.includes(p) ? "checked" : ""}><span>${p}</span></label>`).join("")}</div>
          <label class="hs-note"><span>Note for the team <small>(optional, stays in this demo)</small></span><textarea data-hs-note rows="2" maxlength="140" placeholder="e.g. We'd love a table by the fire">${esc(d.note)}</textarea></label></section>
      </div>
      <aside class="hs-side">
        <section class="hs-step hs-plan-step"><h4><span>5</span>Table</h4>
          ${map ? `<div class="hs-plan" role="group" aria-label="Floor plan at ${d.time}">
            ${v.zones.map((z) => `<div class="hs-zone" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span>${esc(z.label)}</span></div>`).join("")}
            ${map.map((t) => `<button type="button" class="hs-tb s-${t.status} sh-${t.shape}${t.id === d.table ? " sel" : ""}" style="left:${t.x}%;top:${t.y}%" data-hs-table="${t.id}" ${t.status === "free" ? "" : "disabled"} aria-pressed="${t.id === d.table}" aria-label="Table ${t.id}, ${t.seats} seats, ${v.zones.find((z) => z.id === t.zone).label}, ${t.status === "free" ? "free" : t.status === "yours" ? "your booking" : t.status === "size" ? "wrong size for your party" : "taken"}"><span>${t.seats}</span></button>`).join("")}
          </div>
          <ul class="hs-legend"><li class="l-free">Free for ${d.party}</li><li class="l-taken">Taken</li><li class="l-size">Other sizes</li><li class="l-yours">Your bookings</li></ul>
          <button type="button" class="hs-link" data-hs-best ${bestTable(S, d.venue, d.date, d.time, d.party, d.editing) ? "" : "disabled"}>Choose the best table for me</button>`
          : `<p class="hs-empty">Pick a time to see which tables are free.</p>`}
        </section>
        <section class="hs-summary" aria-live="polite">
          <p class="hs-k">Your table</p>
          <h4>${esc(v.name)}</h4>
          <dl><div><dt>When</dt><dd>${fmtDay(d.date, { weekday: "long", day: "numeric", month: "long" })}${d.time ? ` · ${d.time}` : ""}</dd></div><div><dt>Guests</dt><dd>${d.party}</dd></div><div><dt>Table</dt><dd>${table ? `${table.id} · ${v.zones.find((z) => z.id === table.zone).label}` : "Not chosen yet"}</dd></div>${d.occasion !== "None" ? `<div><dt>Occasion</dt><dd>${esc(d.occasion)}</dd></div>` : ""}${d.prefs.length ? `<div><dt>Notes</dt><dd>${d.prefs.map(esc).join(", ")}</dd></div>` : ""}</dl>
          <button type="button" class="hs-btn" data-hs-confirm ${d.time && table ? "" : "disabled"}>${d.editing ? "Save changes" : "Confirm reservation"}</button>
          ${ui.msg ? `<p class="hs-warn">${esc(ui.msg)}</p>` : `<p class="hs-fine">Demo only. No restaurant receives this booking.</p>`}
        </section>
      </aside>
    </div>`;
  }

  function vMenu() {
    const v = VENUE[ui.venue], m = MENUS[v.id];
    const veg = upcoming().some((b) => b.venue === v.id && b.prefs?.includes("Vegetarian"));
    const items = m[ui.course].filter((d) => !ui.vegOnly || d[3].some((t) => t === "V" || t === "VG"));
    return `<div class="hs-menu t-${v.tone}">
      <header class="hs-menu-head"><div><p class="hs-k">${esc(v.name)} · Menu</p><h3>${v.id === "oda" ? "Tasting menu · 9 courses · $95" : "À la carte"}</h3></div>
        <div class="hs-seg sm" role="group" aria-label="Restaurant">${VENUES.map((x) => `<button type="button" data-hs-venue="${x.id}" aria-pressed="${x.id === v.id}">${esc(x.name)}</button>`).join("")}</div></header>
      ${veg ? `<p class="hs-tip">${ico("check", 16)}Your booking notes say vegetarian. The kitchen has it.</p>` : ""}
      <div class="hs-menu-bar"><div class="hs-tabs" role="tablist" aria-label="Courses">${COURSES.map(([k, l]) => `<button type="button" role="tab" id="hs-c-${k}" aria-selected="${k === ui.course}" tabindex="${k === ui.course ? 0 : -1}" data-hs-course="${k}">${l}</button>`).join("")}</div>
        <label class="hs-toggle"><input type="checkbox" data-hs-veg ${ui.vegOnly ? "checked" : ""}><span>Vegetarian only</span></label></div>
      <ul class="hs-dishes" role="tabpanel" aria-labelledby="hs-c-${ui.course}">${items.length ? items.map((d, i) => `<li>${plate(d[4], i)}<div><b>${esc(d[0])}</b><span>${esc(d[1])}</span><em>${d[3].map((t) => `<i class="tg">${t}</i>`).join("")}</em></div><strong>${d[2] ? "$" + d[2] : "Included"}</strong></li>`).join("") : `<li class="hs-none">No vegetarian dishes in this course. Try another course.</li>`}</ul>
      <p class="hs-fine">V vegetarian · VG vegan · GF gluten-free · N contains nuts. Fictional menu and prices.</p>
    </div>`;
  }

  function ticket(b, mode) {
    const v = VENUE[b.venue], z = v.zones.find((x) => x.id === tableList(b.venue).find((t) => t.id === b.table)?.zone);
    return `<article class="hs-ticket t-${v.tone}${mode === "past" ? " past" : ""}">
      <div class="hs-ticket-art">${cover(b.venue)}</div>
      <div class="hs-ticket-body">
        <p class="hs-k">${b.id}${b.status === "cancelled" ? " · Cancelled" : b.status === "visited" ? " · Visited" : b.changed ? " · Changed" : ""}</p>
        <h4>${esc(v.name)}</h4>
        <p>${fmtDay(b.date, { weekday: "long", day: "numeric", month: "long" })} · ${b.time} · ${b.party} ${b.party === 1 ? "guest" : "guests"}</p>
        <p class="hs-sub">Table ${b.table}${z ? ` · ${esc(z.label)}` : ""}${b.occasion && b.occasion !== "None" ? ` · ${esc(b.occasion)}` : ""}${b.prefs?.length ? ` · ${b.prefs.map(esc).join(", ")}` : ""}</p>
        ${mode === "up" ? (ui.cancelAsk === b.id
          ? `<div class="hs-ask" role="group" aria-label="Confirm cancellation"><span>Cancel this booking? The table is released.</span><button type="button" class="hs-btn sm danger" data-hs-cancelyes="${b.id}">Yes, cancel</button><button type="button" class="hs-btn sm ghost" data-hs-cancelno>Keep it</button></div>`
          : `<div class="hs-act"><button type="button" class="hs-btn sm" data-hs-modify="${b.id}">Modify</button><button type="button" class="hs-btn sm ghost" data-hs-cancel="${b.id}">Cancel</button><button type="button" class="hs-link" data-hs-visit="${b.id}">Simulate the evening</button></div>`) : ""}
      </div></article>`;
  }
  function vMine() {
    const n = visits(S), tier = tierOf(n), next = CLUB.find((t) => t.min > n);
    const hist = [...S.past, ...S.bookings.filter((b) => b.status !== "upcoming")].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const up = upcoming();
    return `<div class="hs-mine">
      <section class="hs-club">
        <p class="hs-k">The Table Club · across all three restaurants</p>
        <h3>${tier.k}</h3>
        <div class="hs-stamps" role="img" aria-label="${n} visits">${Array.from({ length: 6 }, (_, i) => `<i class="${i < n ? "on" : ""}${i === 2 || i === 5 ? " mark" : ""}">${i < n ? ico("check", 14) : ""}</i>`).join("")}</div>
        <p>${n} ${n === 1 ? "visit" : "visits"}${next ? ` · ${next.min - n} more to ${next.k}` : " · top level"}</p>
        <ul class="hs-perks">${CLUB.map((t) => `<li class="${n >= t.min ? "on" : ""}">${ico(n >= t.min ? "check" : "star", 16)}<span><b>${t.k}</b>${esc(t.perk)}</span></li>`).join("")}</ul>
      </section>
      <section class="hs-list"><h3>Upcoming <span>${up.length}</span></h3>
        ${up.length ? up.map((b) => ticket(b, "up")).join("") : `<div class="hs-empty big"><b>No tables booked yet</b><span>Pick a restaurant and an evening.</span><button type="button" class="hs-btn sm" data-hs-go="reserve">Reserve a table</button></div>`}
        <h3 class="mt">History <span>${hist.length}</span></h3>
        ${hist.map((b) => ticket(b, "past")).join("")}
      </section></div>`;
  }

  function vConfirm() {
    const c = ui.confirm; if (!c) return "";
    const b = S.bookings.find((x) => x.id === c.id); if (!b) return "";
    const v = VENUE[b.venue], n = visits(S), perks = perksOf(n);
    const z = v.zones.find((x) => x.id === tableList(b.venue).find((t) => t.id === b.table)?.zone);
    const notes = [b.occasion === "Birthday" && perks.includes(CLUB[0].perk) ? "Birthday dessert is on us (Table Club)" : "", perks.includes(CLUB[1].perk) ? "A welcome glass on arrival (Table Club Regular)" : "", ...b.prefs].filter(Boolean);
    return `<div class="hs-confirm-bg" data-hs-closeconfirm></div><div class="hs-confirm t-${v.tone}" role="dialog" aria-modal="true" aria-labelledby="hs-conf-t">
      <div class="hs-confirm-art">${cover(b.venue)}</div>
      <div class="hs-confirm-body">
        <p class="hs-k">${c.changed ? "Booking updated" : "Reservation confirmed"} · ${b.id}</p>
        <h3 id="hs-conf-t">See you at ${esc(v.name)}</h3>
        <dl><div><dt>When</dt><dd>${fmtDay(b.date, { weekday: "long", day: "numeric", month: "long" })} at ${b.time}</dd></div><div><dt>Guests</dt><dd>${b.party}</dd></div><div><dt>Table</dt><dd>${b.table}${z ? ` · ${esc(z.label)}` : ""}</dd></div></dl>
        ${notes.length ? `<ul class="hs-notes">${notes.map((x) => `<li>${ico("check", 14)}${esc(x)}</li>`).join("")}</ul>` : ""}
        <p class="hs-fine">A demo confirmation. Nothing has been sent to a restaurant.</p>
        <div class="hs-act"><button type="button" class="hs-btn" data-hs-go="mine" data-hs-closeconfirm>View my table</button><button type="button" class="hs-btn ghost" data-hs-modify="${b.id}">Modify</button></div>
      </div></div>`;
  }

  /* ---------- Shell & render ---------- */
  root.innerHTML = `<div class="hs" data-tone="ember">
    <header class="hs-bar">
      <span class="hs-brand"><b>The Table</b><small>Three kitchens, one booking</small></span>
      <nav class="hs-nav" aria-label="Hospitality Experience Studio">${[["discover", "Discover"], ["reserve", "Reserve"], ["menu", "Menu"], ["mine", "My table"]].map(([k, l]) => `<button type="button" data-hs-tab="${k}">${l}${k === "mine" ? '<em data-hs-count></em>' : ""}</button>`).join("")}</nav>
      <button type="button" class="hs-reset" data-hs-reset>${ico("reset", 15)}Reset demo</button>
    </header>
    <div class="hs-view" data-hs-view tabindex="-1"></div>
    <div data-hs-layer></div>
    <p class="sr-only" aria-live="polite" data-hs-live></p>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const say = (t) => { $("[data-hs-live]").textContent = t; };

  function render(focus) {
    const tone = VENUE[ui.view === "reserve" ? ui.draft.venue : ui.venue].tone;
    $(".hs").dataset.tone = tone;
    root.querySelectorAll("[data-hs-tab]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.hsTab === ui.view));
    const n = upcoming().length; $("[data-hs-count]").textContent = n ? n : "";
    $("[data-hs-view]").innerHTML = { discover: vDiscover, reserve: vReserve, menu: vMenu, mine: vMine }[ui.view]();
    $("[data-hs-layer]").innerHTML = vConfirm();
    if (ui.confirm) $(".hs-confirm .hs-btn")?.focus({ preventScroll: true });
    else if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }
  const go = (view) => { ui.view = view; ui.cancelAsk = null; ui.msg = ""; render("[data-hs-view]"); const top = $(".hs").getBoundingClientRect().top; if (top < 0) scrollBy({ top: top - 80 }); };
  const fixDraft = () => {
    // Keep the draft valid when date, guests or restaurant change: drop a table that no longer fits.
    const d = ui.draft;
    if (d.time && !openAt(d.venue, d.time)) d.time = null;
    if (d.time && d.table) { const t = plan(S, d.venue, d.date, d.time, d.party, d.editing).find((x) => x.id === d.table); if (!t || t.status !== "free") d.table = null; }
    if (d.time && freeCount(S, d.venue, d.date, d.time, d.party, d.editing) === 0) { d.time = null; d.table = null; }
    ui.msg = "";
  };

  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    let b;
    if ((b = t("[data-hs-tab]"))) { if (b.dataset.hsTab === "reserve" && !ui.draft.editing && ui.draft.venue !== ui.venue) { ui.draft.venue = ui.venue; ui.draft.table = null; fixDraft(); } return go(b.dataset.hsTab); }
    if ((b = t("[data-hs-go]"))) { if (b.dataset.hsGo === "reserve" && !ui.draft.editing) { ui.draft.venue = ui.venue; fixDraft(); } ui.confirm = null; return go(b.dataset.hsGo); }
    if ((b = t("[data-hs-venue]"))) { ui.venue = b.dataset.hsVenue; return render(`[data-hs-venue="${ui.venue}"]`); }
    if ((b = t("[data-hs-dvenue]"))) { ui.draft.venue = ui.venue = b.dataset.hsDvenue; ui.draft.table = null; fixDraft(); return render(`[data-hs-dvenue="${ui.draft.venue}"]`); }
    if ((b = t("[data-hs-date]"))) { ui.draft.date = b.dataset.hsDate; fixDraft(); return render(`[data-hs-date="${ui.draft.date}"]`); }
    if ((b = t("[data-hs-party]"))) { ui.draft.party = Math.max(1, Math.min(8, ui.draft.party + +b.dataset.hsParty)); fixDraft(); return render(`[data-hs-party="${b.dataset.hsParty}"]`); }
    if ((b = t("[data-hs-time]"))) { ui.draft.time = b.dataset.hsTime; fixDraft(); return render(`[data-hs-time="${ui.draft.time}"]`); }
    if ((b = t("[data-hs-table]"))) { ui.draft.table = b.dataset.hsTable; ui.msg = ""; return render(`[data-hs-table="${ui.draft.table}"]`); }
    if (t("[data-hs-best]")) { const x = bestTable(S, ui.draft.venue, ui.draft.date, ui.draft.time, ui.draft.party, ui.draft.editing); if (x) ui.draft.table = x.id; return render(x ? `[data-hs-table="${x.id}"]` : null); }
    if ((b = t("[data-hs-occ]"))) { ui.draft.occasion = b.dataset.hsOcc; return render(`[data-hs-occ="${ui.draft.occasion}"]`); }
    if (t("[data-hs-confirm]")) {
      const r = reserve(S, ui.draft);
      if (!r.ok) { ui.msg = r.why; ui.draft.table = null; return render(); }
      save(); ui.confirm = { id: r.booking.id, changed: !!r.changed }; ui.venue = r.booking.venue; ui.draft = freshDraft(r.booking.venue);
      say(`${r.changed ? "Booking updated" : "Reservation confirmed"}: ${VENUE[r.booking.venue].name}, ${fmtDay(r.booking.date)} at ${r.booking.time}, table ${r.booking.table}.`);
      return render();
    }
    if ((b = t("[data-hs-modify]"))) {
      const bk = S.bookings.find((x) => x.id === b.dataset.hsModify && x.status === "upcoming"); if (!bk) return;
      ui.confirm = null; ui.venue = bk.venue;
      ui.draft = { venue: bk.venue, date: bk.date, party: bk.party, time: bk.time, table: bk.table, occasion: bk.occasion || "None", prefs: [...(bk.prefs || [])], note: bk.note || "", editing: bk.id };
      return go("reserve");
    }
    if (t("[data-hs-stopedit]")) { ui.draft = freshDraft(ui.draft.venue); return go("mine"); }
    if ((b = t("[data-hs-cancel]"))) { ui.cancelAsk = b.dataset.hsCancel; return render("[data-hs-cancelyes]"); }
    if (t("[data-hs-cancelno]")) { const id = ui.cancelAsk; ui.cancelAsk = null; return render(`[data-hs-cancel="${id}"]`); }
    if ((b = t("[data-hs-cancelyes]"))) { cancel(S, b.dataset.hsCancelyes); ui.cancelAsk = null; save(); say(`Booking ${b.dataset.hsCancelyes} cancelled. The table is free again.`); return render("[data-hs-view]"); }
    if ((b = t("[data-hs-visit]"))) { const before = tierOf(visits(S)).k; visit(S, b.dataset.hsVisit); save(); const after = tierOf(visits(S)).k; say(after !== before ? `Visit recorded. Welcome to ${after} in The Table Club.` : "Visit recorded in The Table Club."); return render("[data-hs-view]"); }
    if ((b = t("[data-hs-course]"))) { ui.course = b.dataset.hsCourse; return render(`#hs-c-${ui.course}`); }
    if (t("[data-hs-closeconfirm]")) { ui.confirm = null; return render(t("[data-hs-go]") ? "[data-hs-view]" : null); }
    if (t("[data-hs-reset]")) { S = seed(); save(); Object.assign(ui, { view: "discover", venue: "saffron", course: "start", vegOnly: false, draft: freshDraft(), confirm: null, cancelAsk: null, msg: "" }); say("Demo reset."); return render("[data-hs-view]"); }
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.hsPref) { const p = el.dataset.hsPref, a = ui.draft.prefs; el.checked ? a.includes(p) || a.push(p) : a.splice(a.indexOf(p), 1); return render(`[data-hs-pref="${p}"]`); }
    if (el.matches("[data-hs-veg]")) { ui.vegOnly = el.checked; return render("[data-hs-veg]"); }
  });
  root.addEventListener("input", (e) => { if (e.target.matches("[data-hs-note]")) ui.draft.note = e.target.value.slice(0, 140); });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ui.confirm) { ui.confirm = null; return render("[data-hs-view]"); }
    const tab = e.target.closest("[data-hs-course]");
    if (tab) {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const ks = COURSES.map((c) => c[0]); ui.course = ks[(ks.indexOf(ui.course) + d + ks.length) % ks.length]; render(`#hs-c-${ui.course}`);
    }
  });
  render();
})();
