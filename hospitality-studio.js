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

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ZONES = {
    fire: "Closest to the hearth. Warm, lively, and you can watch the kitchen work.",
    window: "Two-tops along the street windows. Quieter, softly lit.",
    court: "A heated courtyard under string lights and potted olive trees.",
    sea: "A row of tables along the glass, facing the water at sunset.",
    main: "The heart of the room, under linen pendants.",
    nook: "A curtained alcove with one long table for up to eight.",
    counter: "Six seats facing the chefs. Every course is handed across.",
    booth: "Low velvet booths for four, a little more private.",
  };
  const zoneOf = (v, tableId) => VENUE[v].zones.find((z) => z.id === tableList(v).find((t) => t.id === tableId)?.zone);

  /* ---------- Art: hand-built 2D dining rooms (inline SVG) ---------- */
  let uid = 0;
  const stops = (s) => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
  const lin = (id, s, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
  const rad = (id, s) => `<radialGradient id="${id}">${stops(s)}</radialGradient>`;
  const base = (u) => rad(`gl${u}`, [[0, "#FFC983", 0.8], [1, "#FFC983", 0]]) + rad(`sh${u}`, [[0, "#000", 0.55], [1, "#000", 0]]) + lin(`cn${u}`, [[0, "#FFDDA6", 0.5], [1, "#FFDDA6", 0]]);
  const grain = (u, w, h) => `<filter id="g${u}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .06  0 0 0 0 .03  0 0 0 .55 -.2"/></filter><rect width="${w}" height="${h}" filter="url(#g${u})" opacity=".6"/>`;
  const glow = (u, x, y, r, o = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gl${u})" opacity="${o}"/>`;
  const shadow = (u, x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#sh${u})"/>`;
  const lamp = (u, x, y, w, c = "#C08A4A", cone = 0.55) => `<path d="M${x} -10V${y}" stroke="${c}" stroke-opacity=".7" stroke-width="1.5"/><path d="M${x - w * 1.5} ${y + w * 3.6}L${x - w / 2} ${y + w * 0.42}h${w}L${x + w * 1.5} ${y + w * 3.6}z" fill="url(#cn${u})" opacity="${cone}"/><path d="M${x - w / 2} ${y + w * 0.42}L${x - w * 0.18} ${y}h${w * 0.36}L${x + w / 2} ${y + w * 0.42}z" fill="${c}"/><ellipse cx="${x}" cy="${y + w * 0.43}" rx="${w * 0.48}" ry="${w * 0.07}" fill="#FFE6B8"/>`;
  const globe = (u, x, y, r) => `<path d="M${x} -10V${y - r}" stroke="#BFA77A" stroke-opacity=".6"/>${glow(u, x, y, r * 4, 0.7)}<circle cx="${x}" cy="${y}" r="${r}" fill="#F7DFA8"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#FFF6DD"/>`;
  const candle = (u, x, y, s = 1) => `${glow(u, x, y - 12 * s, 34 * s, 0.9)}<rect x="${x - 3 * s}" y="${y - 10 * s}" width="${6 * s}" height="${12 * s}" rx="${1.5 * s}" fill="#F3E9D6"/><path d="M${x} ${y - 20 * s}c-3 4-3 7 0 9 3-2 3-5 0-9z" fill="#FFD27A"/>`;
  const plate = (x, y, r, food) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.27}" fill="#F2E9DA"/><ellipse cx="${x}" cy="${y - 1}" rx="${r * 0.62}" ry="${r * 0.16}" fill="#E4D8C4"/><ellipse cx="${x - r * 0.08}" cy="${y - 2}" rx="${r * 0.32}" ry="${r * 0.1}" fill="${food}"/>`;
  const glass = (x, y, s = 1, wine = "#6B1E2E") => `<path d="M${x - 7 * s} ${y - 30 * s}h${14 * s}c0 12-3 17-7 17s-7-5-7-17z" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".35"/><path d="M${x - 6 * s} ${y - 22 * s}h${12 * s}c-1 6-3 8-6 8s-5-2-6-8z" fill="${wine}"/><path d="M${x} ${y - 13 * s}v${12 * s}M${x - 6 * s} ${y - 1}h${12 * s}" stroke="#fff" stroke-opacity=".4"/>`;
  const roundTable = (u, x, y, rx, cloth = "#EDE5D7", foods = ["#B5532B", "#6E7A55"]) => `${shadow(u, x, y + rx * 0.5, rx * 1.15, rx * 0.16)}<path d="M${x - rx} ${y}v${rx * 0.42}c${rx * 0.4} ${rx * 0.12} ${rx * 1.6} ${rx * 0.12} ${rx * 2} 0V${y}z" fill="${cloth}" opacity=".82"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.24}" fill="${cloth}"/>${plate(x - rx * 0.45, y + 2, rx * 0.26, foods[0])}${plate(x + rx * 0.45, y + 2, rx * 0.26, foods[1])}${glass(x - rx * 0.1, y - 2, rx / 90)}${glass(x + rx * 0.12, y - 4, rx / 90, "#E9D98A")}`;
  const chairBack = (x, y, w, h, c = "#100C0A") => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${w * 0.3}" fill="${c}"/>`;
  const olive = (x, y, s = 1, c = "#6E7A55") => `<path d="M${x} ${y}c${10 * s} ${-30 * s} ${30 * s} ${-50 * s} ${60 * s} ${-64 * s}" stroke="#4A4A32" stroke-width="${2 * s}" fill="none"/>${[[12, -18, -40], [22, -32, 30], [34, -42, -30], [46, -52, 40], [18, -30, 50], [40, -46, -10]].map(([dx, dy, r]) => `<ellipse cx="${x + dx * s}" cy="${y + dy * s}" rx="${9 * s}" ry="${3.6 * s}" fill="${c}" transform="rotate(${r} ${x + dx * s} ${y + dy * s})"/>`).join("")}`;
  const flames = (x, y, s = 1) => `<path d="M${x - 40 * s} ${y}c-4-30 14-40 10-70 14 18 22 34 18 52 6-14 4-30 14-46 16 26 22 46 12 64z" fill="#E8742F"/><path d="M${x - 22 * s} ${y}c-2-20 8-26 6-46 10 12 14 24 10 34 4-8 4-18 10-28 10 18 12 30 6 40z" fill="#FFB347"/><path d="M${x - 10 * s} ${y}c0-12 4-16 4-28 6 8 8 16 6 28z" fill="#FFE29A"/>`;
  const svg = (w, h, body, label, fit = "xMidYMid") => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="${fit} slice" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${body}</svg>`;

  const VENUE_ART = {
    saffron: (u) => `<defs>${base(u)}${lin(`w${u}`, [[0, "#2E1C14"], [1, "#160E0B"]])}${lin(`f${u}`, [[0, "#3A2418"], [1, "#1B110C"]])}${lin(`t${u}`, [[0, "#74452C"], [1, "#3B2217"]])}${rad(`h${u}`, [[0, "#FF9248", 0.95], [0.5, "#C2462A", 0.6], [1, "#2A120A", 0]])}<pattern id="b${u}" width="44" height="18" patternUnits="userSpaceOnUse"><path d="M0 .5h44M0 9.5h44M22 0v9M.5 9v9" stroke="#000" stroke-opacity=".28"/></pattern></defs>
      <rect width="800" height="500" fill="url(#w${u})"/>
      ${[150, 400, 650].map((x) => `<path d="M${x - 105} 372V170a105 105 0 0 1 210 0v202z" fill="#3B2419"/><path d="M${x - 105} 372V170a105 105 0 0 1 210 0v202z" fill="url(#b${u})"/><path d="M${x - 82} 372V176a82 82 0 0 1 164 0v196z" fill="${x === 400 ? "#120A07" : "#1A100C"}"/>`).join("")}
      <circle cx="400" cy="330" r="120" fill="url(#h${u})"/>${flames(410, 352, 1.2)}<rect x="350" y="350" width="104" height="12" rx="6" fill="#2A160E"/><rect x="362" y="342" width="84" height="10" rx="5" fill="#3A2016" transform="rotate(-6 404 347)"/>
      ${[80, 120, 160].map((y) => `<path d="M${150 - 70} ${y + 140}h140M${650 - 70} ${y + 140}h140" stroke="#4A3022" stroke-width="4"/>`).join("")}
      ${[[100, 206, "#C2643F"], [126, 210, "#E3A35B"], [176, 204, "#6E7A55"], [196, 250, "#EFE2CF"], [120, 248, "#9C3D2E"], [610, 204, "#E3A35B"], [660, 208, "#C2643F"], [700, 246, "#EFE2CF"], [630, 250, "#6E7A55"]].map(([x, y, c]) => `<rect x="${x - 8}" y="${y + 70 - 24}" width="16" height="24" rx="5" fill="${c}" opacity=".8"/>`).join("")}
      <rect y="372" width="800" height="128" fill="url(#f${u})"/>
      ${lamp(u, 250, 70, 50)}${lamp(u, 550, 70, 50)}
      ${chairBack(210, 408, 34, 44)}${chairBack(330, 408, 34, 44)}${chairBack(470, 408, 34, 44)}${chairBack(590, 408, 34, 44)}
      <path d="M150 412h500l70 88H80z" fill="url(#t${u})"/><path d="M150 412h500" stroke="#B07A50" stroke-width="2" opacity=".6"/><path d="M180 440h440M140 470h520" stroke="#2A170F" opacity=".4"/>
      ${plate(230, 434, 36, "#C2643F")}${plate(350, 438, 38, "#6E7A55")}${plate(470, 438, 38, "#E3A35B")}${plate(590, 434, 36, "#9C3D2E")}
      ${glass(290, 430, 1.1)}${glass(530, 430, 1.1)}${candle(u, 410, 424, 1.1)}
      <rect width="800" height="500" fill="#C2643F" opacity=".06"/>${grain(u, 800, 500)}`,
    mareya: (u) => `<defs>${base(u)}${lin(`w${u}`, [[0, "#1E2A31"], [1, "#11191E"]])}${lin(`k${u}`, [[0, "#22344A"], [0.42, "#5A5C72"], [0.72, "#C2795A"], [0.86, "#EBB385"], [1, "#F4CC9C"]])}${lin(`s${u}`, [[0, "#3B5763"], [1, "#1E323B"]])}${lin(`f${u}`, [[0, "#2E2722"], [1, "#171310"]])}</defs>
      <rect width="800" height="500" fill="url(#w${u})"/>
      <rect x="60" y="34" width="680" height="268" fill="url(#k${u})"/><rect x="60" y="250" width="680" height="52" fill="url(#s${u})"/>
      <circle cx="520" cy="248" r="20" fill="#F7C892"/><rect x="510" y="252" width="20" height="50" fill="#F2B27A" opacity=".45"/>${[262, 272, 282, 292].map((y, i) => `<path d="M${470 + i * 6} ${y}h${100 - i * 12}" stroke="#F7C892" stroke-opacity="${0.5 - i * 0.1}"/>`).join("")}
      ${[[150, 266], [330, 280], [640, 262]].map(([x, y]) => `<path d="M${x} ${y}h60" stroke="#9CB4BD" stroke-opacity=".3"/>`).join("")}
      <path d="M60 34h680v268H60z" fill="none" stroke="#0B1114" stroke-width="10"/><path d="M286 34v268M513 34v268M60 104h680" stroke="#0B1114" stroke-width="7"/>
      <rect y="302" width="800" height="198" fill="url(#f${u})"/><path d="M0 302h800" stroke="#000" stroke-opacity=".4"/>
      ${chairBack(140, 382, 30, 50, "#0B1012")}${chairBack(250, 382, 30, 50, "#0B1012")}${chairBack(560, 376, 30, 50, "#0B1012")}${chairBack(700, 376, 30, 50, "#0B1012")}
      ${roundTable(u, 195, 392, 92, "#EEE7DB", ["#C2795A", "#9CB4BD"])}${roundTable(u, 630, 386, 86, "#EEE7DB", ["#E7B44C", "#C0452E"])}${roundTable(u, 420, 448, 118, "#F1EAE0", ["#D27C55", "#6E7A55"])}
      ${candle(u, 195, 388, 0.9)}${candle(u, 630, 382, 0.9)}${candle(u, 420, 444, 1.1)}
      <rect width="800" height="500" fill="#F2B27A" opacity=".05"/>${grain(u, 800, 500)}`,
    oda: (u) => `<defs>${base(u)}${lin(`w${u}`, [[0, "#1A1D14"], [1, "#0D0F0A"]])}${lin(`p${u}`, [[0, "#F0C97E", 0.85], [1, "#F0C97E", 0.05]])}${lin(`c${u}`, [[0, "#D2AB72"], [1, "#9C7546"]])}${lin(`n${u}`, [[0, "#2B2C20"], [1, "#16170F"]])}</defs>
      <rect width="800" height="500" fill="url(#w${u})"/>
      ${[96, 166].map((y) => `<rect x="70" y="${y}" width="660" height="7" fill="#3E3826"/>`).join("")}
      ${[[100, 96, 16, 22, "#B8A98A"], [140, 96, 24, 14, "#6E7A55"], [190, 96, 14, 26, "#8A3B3B"], [240, 96, 26, 16, "#D9CFB8"], [300, 96, 14, 20, "#B89650"], [560, 96, 22, 14, "#D9CFB8"], [610, 96, 14, 24, "#6E7A55"], [660, 96, 24, 18, "#8A3B3B"], [120, 166, 22, 16, "#D9CFB8"], [170, 166, 14, 24, "#B89650"], [580, 166, 26, 14, "#B8A98A"], [640, 166, 16, 22, "#D9CFB8"], [690, 166, 20, 14, "#6E7A55"]].map(([x, y, w, h, c]) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2.4}" fill="${c}" opacity=".85"/>`).join("")}
      <rect x="250" y="190" width="300" height="118" fill="#1D1A12"/><rect x="250" y="190" width="300" height="118" fill="url(#p${u})"/>${[300, 360, 430, 500].map((x, i) => `<path d="M${x} ${300 - i * 4}c-8-14 8-24 0-38s8-22 0-34" stroke="#FFF2D6" stroke-opacity=".25" stroke-width="2" fill="none"/>`).join("")}
      ${globe(u, 160, 150, 15)}${globe(u, 320, 120, 15)}${globe(u, 480, 120, 15)}${globe(u, 640, 150, 15)}
      ${olive(70, 70, 1.4)}
      <rect x="0" y="322" width="800" height="24" fill="url(#c${u})"/><path d="M0 322h800" stroke="#F3D9A8" stroke-opacity=".6"/><rect x="0" y="346" width="800" height="154" fill="url(#n${u})"/>${Array.from({ length: 27 }, (_, i) => `<path d="M${i * 30 + 15} 352v148" stroke="#000" stroke-opacity=".28"/>`).join("")}
      ${plate(200, 322, 30, "#7A2E3A")}${plate(400, 322, 30, "#E57A63")}${plate(600, 322, 30, "#7A8C3A")}${glass(260, 320, 0.9, "#8B2E3A")}${glass(660, 320, 0.9, "#E9D98A")}
      ${[130, 265, 400, 535, 670].map((x) => `${shadow(u, x, 492, 40, 6)}<path d="M${x - 16} 418l-10 82M${x + 16} 418l10 82" stroke="#1B140C" stroke-width="4"/><ellipse cx="${x}" cy="414" rx="36" ry="9" fill="#8E6B43"/><ellipse cx="${x}" cy="411" rx="30" ry="6" fill="#A98257"/>`).join("")}
      ${grain(u, 800, 500)}`,
  };
  const ZONE_ART = {
    fire: (u) => `<defs>${base(u)}${rad(`h${u}`, [[0, "#FF9248", 0.95], [0.6, "#C2462A", 0.4], [1, "#2A120A", 0]])}</defs><rect width="400" height="260" fill="#1C120D"/><path d="M110 200V110a90 90 0 0 1 180 0v90z" fill="#3B2419"/><path d="M130 200V114a70 70 0 0 1 140 0v86z" fill="#100906"/><circle cx="200" cy="180" r="80" fill="url(#h${u})"/>${flames(210, 196, 0.9)}<rect y="200" width="400" height="60" fill="#2A1A12"/>${chairBack(110, 236, 28, 40)}${roundTable(u, 160, 240, 70, "#5A3524", ["#C2643F", "#E3A35B"])}${candle(u, 160, 236, 0.7)}${grain(u, 400, 260)}`,
    window: (u) => `<defs>${base(u)}${lin(`k${u}`, [[0, "#141C2A"], [1, "#2C3346"]])}</defs><rect width="400" height="260" fill="#21150F"/><rect x="60" y="24" width="280" height="150" fill="url(#k${u})"/>${[[110, 120], [200, 96], [290, 120]].map(([x, y]) => `${glow(u, x, y, 40, 0.5)}<circle cx="${x}" cy="${y}" r="5" fill="#FFD9A0"/><path d="M${x} ${y + 5}V174" stroke="#0B0F16" stroke-width="3"/>`).join("")}<path d="M60 24h280v150H60zM200 24v150" fill="none" stroke="#120B08" stroke-width="8"/><rect y="174" width="400" height="86" fill="#2E1D14"/>${chairBack(150, 216, 26, 40)}${chairBack(250, 216, 26, 40)}${roundTable(u, 200, 226, 64, "#EDE5D7", ["#C2643F", "#6E7A55"])}${candle(u, 200, 222, 0.7)}${grain(u, 400, 260)}`,
    court: (u) => `<defs>${base(u)}${lin(`k${u}`, [[0, "#14141E"], [1, "#3A2A22"]])}</defs><rect width="400" height="260" fill="url(#k${u})"/>${[40, 120, 200, 280, 360].map((x, i, a) => i < a.length - 1 ? `<path d="M${x} 40Q${x + 40} 70 ${a[i + 1]} 40" stroke="#2A2018" fill="none"/>` : "").join("")}${Array.from({ length: 16 }, (_, i) => { const x = 50 + i * 20, y = 40 + Math.sin(((i % 4) / 4) * Math.PI) * 14; return `${glow(u, x, y, 12, 0.7)}<circle cx="${x}" cy="${y}" r="2.6" fill="#FFE2A8"/>`; }).join("")}
      <path d="M60 200v-60" stroke="#3A2C1E" stroke-width="5"/><ellipse cx="60" cy="130" rx="40" ry="28" fill="#4B5A3C"/><ellipse cx="44" cy="120" rx="20" ry="14" fill="#5E7048"/><path d="M340 200v-60" stroke="#3A2C1E" stroke-width="5"/><ellipse cx="340" cy="128" rx="42" ry="30" fill="#4B5A3C"/>
      <path d="M268 200v-96" stroke="#7A6A55" stroke-width="3"/><path d="M252 104h32l-6-10h-20z" fill="#7A6A55"/>${glow(u, 268, 110, 46, 0.6)}<rect y="200" width="400" height="60" fill="#3A2A1F"/><path d="M0 200h400" stroke="#C2643F" stroke-opacity=".3"/>${roundTable(u, 170, 222, 64, "#EDE5D7", ["#E3A35B", "#6E7A55"])}${candle(u, 170, 218, 0.7)}${grain(u, 400, 260)}`,
    sea: (u) => `<defs>${base(u)}${lin(`k${u}`, [[0, "#2A3B4E"], [0.55, "#B9785D"], [1, "#F0C392"]])}</defs><rect width="400" height="260" fill="#162026"/><rect x="20" y="20" width="360" height="150" fill="url(#k${u})"/><rect x="20" y="138" width="360" height="32" fill="#2C4651"/><circle cx="270" cy="136" r="14" fill="#F7C892"/><rect x="262" y="140" width="16" height="30" fill="#F2B27A" opacity=".4"/><path d="M20 20h360v150H20zM140 20v150M260 20v150" fill="none" stroke="#0B1114" stroke-width="7"/><rect y="170" width="400" height="90" fill="#231D19"/>${roundTable(u, 200, 214, 84, "#EEE7DB", ["#C2795A", "#9CB4BD"])}${candle(u, 200, 210, 0.8)}${grain(u, 400, 260)}`,
    main: (u) => `<defs>${base(u)}</defs><rect width="400" height="260" fill="#1C252B"/><rect y="168" width="400" height="92" fill="#262019"/>${[100, 300].map((x) => `<path d="M${x} -4V40" stroke="#CFC5B5" stroke-opacity=".5"/><rect x="${x - 34}" y="40" width="68" height="34" rx="4" fill="#EAE2D3"/>${glow(u, x, 92, 70, 0.45)}`).join("")}${chairBack(70, 200, 26, 40, "#0B1012")}${chairBack(330, 200, 26, 40, "#0B1012")}${roundTable(u, 110, 214, 66, "#EEE7DB", ["#E7B44C", "#C0452E"])}${roundTable(u, 290, 220, 72, "#EEE7DB", ["#D27C55", "#6E7A55"])}${grain(u, 400, 260)}`,
    nook: (u) => `<defs>${base(u)}${lin(`c${u}`, [[0, "#7A2636"], [0.5, "#5A1A28"], [1, "#7A2636"]], 1, 0)}</defs><rect width="400" height="260" fill="#14100E"/><rect x="0" y="0" width="90" height="260" fill="url(#c${u})"/><rect x="310" y="0" width="90" height="260" fill="url(#c${u})"/>${[16, 40, 64, 326, 350, 374].map((x) => `<path d="M${x} 0v260" stroke="#000" stroke-opacity=".25"/>`).join("")}<path d="M90 200V70a110 110 0 0 1 220 0v130z" fill="#2A1D18"/>${lamp(u, 200, 30, 36)}<rect y="200" width="400" height="60" fill="#1E1612"/><path d="M60 200h280l30 60H30z" fill="#5A3524"/>${plate(130, 214, 22, "#C0452E")}${plate(200, 216, 22, "#E7B44C")}${plate(270, 214, 22, "#6E7A55")}${candle(u, 165, 212, 0.6)}${candle(u, 235, 212, 0.6)}${grain(u, 400, 260)}`,
    counter: (u) => `<defs>${base(u)}${lin(`p${u}`, [[0, "#F0C97E", 0.75], [1, "#F0C97E", 0.05]])}</defs><rect width="400" height="260" fill="#12140E"/><rect x="40" y="40" width="320" height="100" fill="#1D1A12"/><rect x="40" y="40" width="320" height="100" fill="url(#p${u})"/>${globe(u, 120, 60, 10)}${globe(u, 280, 60, 10)}<rect y="150" width="400" height="16" fill="#C29A63"/><rect y="166" width="400" height="94" fill="#1E1F16"/>${plate(130, 150, 22, "#7A2E3A")}${plate(270, 150, 22, "#E57A63")}${[90, 200, 310].map((x) => `<path d="M${x - 12} 214l-8 46M${x + 12} 214l8 46" stroke="#1B140C" stroke-width="3"/><ellipse cx="${x}" cy="212" rx="28" ry="7" fill="#A98257"/>`).join("")}${grain(u, 400, 260)}`,
    booth: (u) => `<defs>${base(u)}${lin(`v${u}`, [[0, "#5E7048"], [1, "#3A4630"]])}</defs><rect width="400" height="260" fill="#14160F"/>${globe(u, 200, 70, 13)}<path d="M50 260V150a40 40 0 0 1 40-40h220a40 40 0 0 1 40 40v110z" fill="url(#v${u})"/>${[110, 160, 210, 260, 290].map((x) => `<path d="M${x} 116v80" stroke="#000" stroke-opacity=".2"/>`).join("")}<rect x="50" y="196" width="300" height="20" rx="8" fill="#4B5A3C"/>${roundTable(u, 200, 214, 70, "#2B2A1E", ["#8B2E3A", "#E7B44C"])}${candle(u, 200, 210, 0.7)}${grain(u, 400, 260)}`,
  };
  const ALT = { saffron: "Illustration: a vaulted brick dining room around an open fire, with a long timber table under brass lamps", mareya: "Illustration: a seafood dining room with tall windows onto the sea at sunset and linen-dressed round tables", oda: "Illustration: a tasting counter facing an open kitchen, with globe lights, ceramics on shelves and oak stools" };
  const venueArt = (v, label = false) => { const u = "hs" + ++uid; return svg(800, 500, VENUE_ART[v](u), label ? ALT[v] : ""); };
  const zoneArt = (z) => { const u = "hz" + ++uid; return svg(400, 260, ZONE_ART[z](u), "", "xMidYMax"); };
  function dish([sauce, main, garnish], i = 0) {
    const r = (n) => (n * 37 + i * 11) % 23;
    return `<svg class="hs-plate" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="47" fill="#000" opacity=".12"/><circle cx="50" cy="50" r="46" fill="#FBF7EF"/><circle cx="50" cy="50" r="46" fill="none" stroke="#E2D8C6" stroke-width="1.5"/><circle cx="50" cy="50" r="33" fill="#F4EEE2"/>
      <path d="M${24 + r(1) / 3} ${58 - r(2) / 4}c10-14 34-20 52-8" stroke="${sauce}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".8"/>
      <ellipse cx="${48 + r(3) / 5}" cy="${48 - r(4) / 6}" rx="${13 + r(5) / 4}" ry="${9 + r(6) / 5}" fill="${main}"/><ellipse cx="${44 + r(3) / 5}" cy="${44 - r(4) / 6}" rx="${5 + r(5) / 8}" ry="${3}" fill="#fff" opacity=".25"/>
      ${[0, 1, 2, 3].map((k) => `<circle cx="${34 + ((k * 13 + r(k)) % 34)}" cy="${36 + ((k * 17 + r(k + 2)) % 30)}" r="${1.6 + (k % 2)}" fill="${garnish}"/>`).join("")}</svg>`;
  }
  const ICON = { check: '<path d="m5 12.5 4.5 4.5L19 7"/>', reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>', minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>', star: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', seat: '<path d="M7 4v9h10M7 13l-1 7M17 13l1 7M7 9h10"/>' };
  const ico = (k, s = 18) => `<svg class="hs-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  /* ---------- Views ---------- */
  const upcoming = () => S.bookings.filter((b) => b.status === "upcoming").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tonight = (v) => TIMES.reduce((a, time) => a + freeCount(S, v, DATES[0], time, 2), 0);
  const longDay = (k) => fmtDay(k, { weekday: "long", day: "numeric", month: "long" });

  function vDiscover() {
    const v = VENUE[ui.venue], qd = DATES[1];
    return `<div class="hs-discover">
      <div class="hs-rail" role="group" aria-label="Choose a restaurant">
        <p class="hs-k">Three kitchens · one booking</p>
        ${VENUES.map((x, i) => `<button type="button" class="hs-pick t-${x.tone}" data-hs-venue="${x.id}" aria-pressed="${x.id === ui.venue}"><span class="th">${venueArt(x.id)}</span><span class="tx"><i>0${i + 1}</i><b>${esc(x.name)}</b><small>${esc(x.kind)} · ${esc(x.area)}</small><em>${tonight(x.id)} tables free tonight</em></span></button>`).join("")}
      </div>
      <article class="hs-feature${ui.anim ? " in" : ""}" aria-live="polite">
        <figure class="hs-hero">${venueArt(v.id, true)}<figcaption><p class="hs-k">${esc(v.kind)} · ${esc(v.area)} · ${v.price}</p><h3>${esc(v.name)}</h3><p>${esc(v.blurb)}</p></figcaption></figure>
        <div class="hs-feature-grid">
          <section><h4 class="hs-h">${fmtDay(qd, { weekday: "long" })}, for two</h4>
            <div class="hs-quick" role="group" aria-label="Free times ${longDay(qd)}">${TIMES.filter((t) => openAt(v.id, t)).map((t) => { const n = freeCount(S, v.id, qd, t, 2); return `<button type="button" data-hs-quick="${t}" ${n ? "" : "disabled"} aria-label="${t}, ${n ? n + " tables free" : "full"}"><b>${t}</b><small>${n ? n + " free" : "Full"}</small></button>`; }).join("")}</div>
            <dl class="hs-facts"><div><dt>Hours</dt><dd>${esc(v.hours)}</dd></div><div><dt>Parties</dt><dd>Up to ${maxParty(v.id)} guests</dd></div></dl></section>
          <section><h4 class="hs-h">From the kitchen</h4><div class="hs-sig">${MENUS[v.id].main.slice(0, 3).map((d, i) => `<figure>${dish(d[4], i)}<figcaption>${esc(d[0])}<small>${esc(d[1])}</small></figcaption></figure>`).join("")}</div>
            <button type="button" class="hs-link" data-hs-go="menu">Read the full menu ${ico("arrow", 16)}</button></section>
        </div>
        <section class="hs-zones"><h4 class="hs-h">Where you could sit</h4><div class="hs-zone-row">${v.zones.map((z) => `<button type="button" data-hs-zonepick="${z.id}"><figure>${zoneArt(z.id)}</figure><span><b>${esc(z.label)}</b><small>${ZONES[z.id]}</small></span></button>`).join("")}</div></section>
        <div class="hs-act"><button type="button" class="hs-btn" data-hs-go="reserve">Reserve at ${esc(v.name)}</button></div>
      </article></div>`;
  }

  function vReserve() {
    const d = ui.draft, v = VENUE[d.venue], maxP = maxParty(d.venue);
    const slots = TIMES.map((t) => ({ t, n: freeCount(S, d.venue, d.date, t, d.party, d.editing), open: openAt(d.venue, t) }));
    const map = d.time ? plan(S, d.venue, d.date, d.time, d.party, d.editing) : null;
    const table = map && d.table ? map.find((t) => t.id === d.table) : null;
    const zone = table ? v.zones.find((z) => z.id === table.zone) : v.zones.find((z) => z.id === d.zone) || v.zones[0];
    const dayTotal = (k) => TIMES.reduce((a, t) => a + freeCount(S, d.venue, k, t, d.party, d.editing), 0);
    const ed = d.editing && S.bookings.find((b) => b.id === d.editing);
    return `${ed ? `<div class="hs-edit-bar" role="status"><span>Changing <b>${ed.id}</b> · ${esc(VENUE[ed.venue].name)}, ${fmtDay(ed.date)} at ${ed.time}, table ${ed.table}</span><button type="button" class="hs-link" data-hs-stopedit>Keep the original</button></div>` : ""}
    <div class="hs-reserve">
      <div class="hs-steps">
        <section class="hs-step"><h4><span>01</span>Restaurant</h4>
          <div class="hs-seg" role="group" aria-label="Restaurant">${VENUES.map((x) => `<button type="button" class="t-${x.tone}" data-hs-dvenue="${x.id}" aria-pressed="${x.id === d.venue}"><span class="sw" aria-hidden="true"></span>${esc(x.name)}</button>`).join("")}</div></section>
        <section class="hs-step"><h4><span>02</span>Evening</h4>
          <div class="hs-dates" role="group" aria-label="Date">${DATES.map((k, i) => { const n = dayTotal(k); return `<button type="button" data-hs-date="${k}" aria-pressed="${k === d.date}" ${n ? "" : "disabled"}><small>${i === 0 ? "Tonight" : fmtDay(k, { weekday: "short" })}</small><b>${parseKey(k).getDate()}</b><i class="lv${n > 20 ? 3 : n > 8 ? 2 : n ? 1 : 0}" aria-hidden="true"><span></span><span></span><span></span></i><span class="sr-only">${n} tables across the evening</span></button>`; }).join("")}</div></section>
        <section class="hs-step"><h4><span>03</span>Guests</h4>
          <div class="hs-party"><button type="button" data-hs-party="-1" aria-label="Fewer guests" ${d.party <= 1 ? "disabled" : ""}>${ico("minus")}</button><output aria-live="polite"><b>${d.party}</b> ${d.party === 1 ? "guest" : "guests"}</output><button type="button" data-hs-party="1" aria-label="More guests" ${d.party >= 8 ? "disabled" : ""}>${ico("plus")}</button></div>
          ${d.party > maxP ? `<p class="hs-warn">${esc(v.name)} seats parties of up to ${maxP}. ${d.venue === "oda" ? "Mareya's private nook takes eight." : ""}</p>` : ""}</section>
        <section class="hs-step"><h4><span>04</span>Time</h4>
          <div class="hs-times" role="group" aria-label="Time">${slots.map(({ t, n, open }) => `<button type="button" data-hs-time="${t}" aria-pressed="${t === d.time}" ${n ? "" : "disabled"}><b>${t}</b><small>${!open ? "No sitting" : n === 0 ? "Full" : n === 1 ? "Last table" : `${n} tables`}</small></button>`).join("")}</div></section>
        <section class="hs-step"><h4><span>06</span>Occasion & preferences</h4>
          <div class="hs-chips" role="group" aria-label="Occasion">${OCCASIONS.map((o) => `<button type="button" data-hs-occ="${o}" aria-pressed="${o === d.occasion}">${o}</button>`).join("")}</div>
          <div class="hs-prefs">${PREFS.map((p) => `<label><input type="checkbox" data-hs-pref="${p}" ${d.prefs.includes(p) ? "checked" : ""}><span>${p}</span></label>`).join("")}</div>
          <label class="hs-note"><span>Note for the team <small>(optional, stays in this demo)</small></span><textarea data-hs-note rows="2" maxlength="140" placeholder="e.g. We'd love a table by the fire">${esc(d.note)}</textarea></label></section>
      </div>
      <aside class="hs-side">
        <section class="hs-step hs-plan-step"><h4><span>05</span>Table</h4>
          <figure class="hs-setting${ui.anim ? " in" : ""}">${zoneArt(zone.id)}<figcaption><b>${esc(zone.label)}</b><small>${ZONES[zone.id]}</small></figcaption></figure>
          ${map ? `<div class="hs-plan" role="group" aria-label="Floor plan at ${d.time}">
            ${v.zones.map((z) => `<div class="hs-zone${z.id === zone.id ? " on" : ""}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><span>${esc(z.label)}</span></div>`).join("")}
            ${map.map((t) => `<button type="button" class="hs-tb s-${t.status} sh-${t.shape}${t.id === d.table ? " sel" : ""}" style="left:${t.x}%;top:${t.y}%" data-hs-table="${t.id}" ${t.status === "free" ? "" : "disabled"} aria-pressed="${t.id === d.table}" aria-label="Table ${t.id}, ${t.seats} seats, ${v.zones.find((z) => z.id === t.zone).label}, ${t.status === "free" ? "free" : t.status === "yours" ? "your booking" : t.status === "size" ? "wrong size for your party" : t.status === "closed" ? "no sitting" : "taken"}"><span>${t.seats}</span></button>`).join("")}
          </div>
          <ul class="hs-legend"><li class="l-free">Free for ${d.party}</li><li class="l-taken">Taken</li><li class="l-size">Other sizes</li><li class="l-yours">Your bookings</li></ul>
          <button type="button" class="hs-link" data-hs-best ${bestTable(S, d.venue, d.date, d.time, d.party, d.editing) ? "" : "disabled"}>Choose the best table for me</button>`
          : `<p class="hs-empty">Pick a time and the floor plan opens with every free table.</p>`}
        </section>
        <section class="hs-summary" aria-live="polite">
          <p class="hs-k">Your reservation</p>
          <h4>${esc(v.name)}</h4>
          <dl><div><dt>When</dt><dd>${longDay(d.date)}${d.time ? ` · ${d.time}` : ""}</dd></div><div><dt>Guests</dt><dd>${d.party}</dd></div><div><dt>Table</dt><dd>${table ? `${table.id} · ${esc(zone.label)}, ${table.seats} seats` : '<span class="hs-pending">Not chosen yet</span>'}</dd></div>${d.occasion !== "None" ? `<div><dt>Occasion</dt><dd>${esc(d.occasion)}</dd></div>` : ""}${d.prefs.length ? `<div><dt>Notes</dt><dd>${d.prefs.map(esc).join(", ")}</dd></div>` : ""}</dl>
          <button type="button" class="hs-btn" data-hs-confirm ${d.time && table ? "" : "disabled"}>${d.editing ? "Save changes" : d.time && table ? "Confirm reservation" : !d.time ? "Choose a time" : "Choose a table"}</button>
          ${ui.msg ? `<p class="hs-warn">${esc(ui.msg)}</p>` : `<p class="hs-fine">Demo only. No restaurant receives this booking.</p>`}
        </section>
      </aside>
    </div>`;
  }

  function vMenu() {
    const v = VENUE[ui.venue], m = MENUS[v.id];
    const veg = upcoming().some((b) => b.venue === v.id && b.prefs?.includes("Vegetarian"));
    const items = m[ui.course].filter((d) => !ui.vegOnly || d[3].some((t) => t === "V" || t === "VG"));
    return `<div class="hs-menu">
      <div class="hs-seg sm" role="group" aria-label="Restaurant">${VENUES.map((x) => `<button type="button" class="t-${x.tone}" data-hs-venue="${x.id}" aria-pressed="${x.id === v.id}"><span class="sw" aria-hidden="true"></span>${esc(x.name)}</button>`).join("")}</div>
      <div class="hs-card${ui.anim ? " in" : ""}">
        <header class="hs-card-head"><p class="hs-k">${esc(v.area)} · ${esc(v.hours)}</p><h3>${esc(v.name)}</h3><p class="hs-card-sub">${v.id === "oda" ? "Tasting menu · nine courses · $95" : "À la carte · autumn"}</p></header>
        ${veg ? `<p class="hs-tip">${ico("check", 16)}Your booking says vegetarian. The kitchen has it.</p>` : ""}
        <div class="hs-menu-bar"><div class="hs-tabs" role="tablist" aria-label="Courses">${COURSES.map(([k, l]) => `<button type="button" role="tab" id="hs-c-${k}" aria-selected="${k === ui.course}" tabindex="${k === ui.course ? 0 : -1}" data-hs-course="${k}">${l}</button>`).join("")}</div>
          <label class="hs-toggle"><input type="checkbox" data-hs-veg ${ui.vegOnly ? "checked" : ""}><span>Vegetarian only</span></label></div>
        <ul class="hs-dishes" role="tabpanel" aria-labelledby="hs-c-${ui.course}">${items.length ? items.map((d, i) => `<li>${dish(d[4], i)}<div><p class="ln"><b>${esc(d[0])}</b><i aria-hidden="true"></i><strong>${d[2] ? "$" + d[2] : "Included"}</strong></p><span>${esc(d[1])}</span><em>${d[3].map((t) => `<i class="tg">${t}</i>`).join("")}</em></div></li>`).join("") : `<li class="hs-none">No vegetarian dishes in this course. Try another course.</li>`}</ul>
        <p class="hs-fine">V vegetarian · VG vegan · GF gluten-free · N contains nuts. A fictional menu with illustrative prices.</p>
        <button type="button" class="hs-btn" data-hs-go="reserve">Reserve at ${esc(v.name)}</button>
      </div>
    </div>`;
  }

  function ticket(b, mode) {
    const v = VENUE[b.venue], z = zoneOf(b.venue, b.table);
    return `<article class="hs-ticket t-${v.tone}${mode === "past" ? " past" : ""}">
      <figure class="hs-ticket-art">${z ? zoneArt(z.id) : venueArt(b.venue)}</figure>
      <div class="hs-ticket-body">
        <p class="hs-k">${b.id}${b.status === "cancelled" ? " · Cancelled" : b.status === "visited" ? " · Visited" : b.changed ? " · Changed" : ""}</p>
        <h4>${esc(v.name)}</h4>
        <p>${longDay(b.date)} · ${b.time} · ${b.party} ${b.party === 1 ? "guest" : "guests"}</p>
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
        <svg class="hs-club-art" viewBox="0 0 300 190" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<path d="M${-20 + i * 26} 190a${150 - i * 6} ${150 - i * 6} 0 0 1 ${300 - i * 30} 0" fill="none" stroke="#E3A35B" stroke-opacity="${0.18 - i * 0.015}"/>`).join("")}</svg>
        <p class="hs-k">The Table Club · all three restaurants</p>
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
    const v = VENUE[b.venue], n = visits(S), perks = perksOf(n), z = zoneOf(b.venue, b.table);
    const notes = [b.occasion === "Birthday" && perks.includes(CLUB[0].perk) ? "Birthday dessert is on us (Table Club)" : "", perks.includes(CLUB[1].perk) ? "A welcome glass on arrival (Table Club Regular)" : "", ...b.prefs].filter(Boolean);
    return `<div class="hs-confirm-bg" data-hs-closeconfirm></div><div class="hs-confirm" role="dialog" aria-modal="true" aria-labelledby="hs-conf-t" data-tone="${v.tone}">
      <figure class="hs-confirm-art">${z ? zoneArt(z.id) : venueArt(b.venue)}<figcaption>${z ? esc(z.label) : ""}</figcaption></figure>
      <div class="hs-confirm-body">
        <p class="hs-k">${ico("check", 14)} ${c.changed ? "Booking updated" : "Reservation confirmed"} · ${b.id}</p>
        <h3 id="hs-conf-t">See you at ${esc(v.name)}</h3>
        <dl><div><dt>When</dt><dd>${longDay(b.date)}, ${b.time}</dd></div><div><dt>Guests</dt><dd>${b.party}</dd></div><div><dt>Table</dt><dd>${b.table}${z ? ` · ${esc(z.label)}` : ""}</dd></div></dl>
        ${notes.length ? `<ul class="hs-notes">${notes.map((x) => `<li>${ico("check", 14)}${esc(x)}</li>`).join("")}</ul>` : ""}
        <p class="hs-fine">A demo confirmation. Nothing has been sent to a restaurant.</p>
        <div class="hs-act"><button type="button" class="hs-btn" data-hs-go="mine" data-hs-closeconfirm>View my table</button><button type="button" class="hs-btn ghost" data-hs-modify="${b.id}">Modify</button></div>
      </div></div>`;
  }

  /* ---------- Shell & render ---------- */
  root.innerHTML = `<div class="hs" data-tone="ember">
    <header class="hs-bar">
      <span class="hs-brand"><b>The Table</b><small>Three kitchens · one booking</small></span>
      <nav class="hs-nav" aria-label="The Table">${[["discover", "Discover"], ["reserve", "Reserve"], ["menu", "Menu"], ["mine", "My table"]].map(([k, l]) => `<button type="button" data-hs-tab="${k}">${l}${k === "mine" ? '<em data-hs-count></em>' : ""}</button>`).join("")}</nav>
      <button type="button" class="hs-reset" data-hs-reset>${ico("reset", 15)}<span>Reset demo</span></button>
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
    root.querySelectorAll("[data-hs-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hsTab === ui.view)));
    const n = upcoming().length; $("[data-hs-count]").textContent = n ? n : "";
    $("[data-hs-view]").innerHTML = { discover: vDiscover, reserve: vReserve, menu: vMenu, mine: vMine }[ui.view]();
    $("[data-hs-view]").dataset.view = ui.view;
    $("[data-hs-layer]").innerHTML = vConfirm();
    ui.anim = false;
    if (ui.confirm) $(".hs-confirm .hs-btn")?.focus({ preventScroll: true });
    else if (focus) root.querySelector(focus)?.focus({ preventScroll: true });
  }
  const go = (view, focus = "[data-hs-view]") => { ui.view = view; ui.cancelAsk = null; ui.msg = ""; ui.anim = true; render(focus); const top = $(".hs").getBoundingClientRect().top; if (top < 0) scrollBy({ top: top - 80, behavior: reduce() ? "auto" : "smooth" }); };
  const fixDraft = () => {
    // Keep the draft valid when date, guests or restaurant change: drop a table that no longer fits.
    const d = ui.draft;
    if (d.time && !openAt(d.venue, d.time)) d.time = null;
    if (d.time && d.table) { const t = plan(S, d.venue, d.date, d.time, d.party, d.editing).find((x) => x.id === d.table); if (!t || t.status !== "free") d.table = null; }
    if (d.time && freeCount(S, d.venue, d.date, d.time, d.party, d.editing) === 0) { d.time = null; d.table = null; }
    ui.msg = "";
  };
  // Best free table, preferring the seating area the guest asked for.
  const bestIn = (d) => { const free = plan(S, d.venue, d.date, d.time, d.party, d.editing).filter((t) => t.status === "free").sort((a, b) => a.seats - b.seats); return free.find((t) => t.zone === d.zone) || free[0] || null; };

  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    let b;
    if ((b = t("[data-hs-tab]"))) { if (b.dataset.hsTab === "reserve" && !ui.draft.editing && ui.draft.venue !== ui.venue) { ui.draft.venue = ui.venue; ui.draft.table = null; ui.draft.zone = null; fixDraft(); } return go(b.dataset.hsTab, `[data-hs-tab="${b.dataset.hsTab}"]`); }
    if ((b = t("[data-hs-go]"))) { if (b.dataset.hsGo === "reserve" && !ui.draft.editing && ui.draft.venue !== ui.venue) { ui.draft.venue = ui.venue; ui.draft.table = null; ui.draft.zone = null; fixDraft(); } ui.confirm = null; return go(b.dataset.hsGo); }
    if ((b = t("[data-hs-venue]"))) { if (ui.venue !== b.dataset.hsVenue) ui.anim = true; ui.venue = b.dataset.hsVenue; render(`[data-hs-venue="${ui.venue}"]`); say(`${VENUE[ui.venue].name}: ${VENUE[ui.venue].kind}, ${VENUE[ui.venue].area}.`); return; }
    if ((b = t("[data-hs-quick]"))) { if (!ui.draft.editing) ui.draft = { ...freshDraft(ui.venue), time: b.dataset.hsQuick }; fixDraft(); return go("reserve"); }
    if ((b = t("[data-hs-zonepick]"))) { if (!ui.draft.editing) { ui.draft = { ...freshDraft(ui.venue), zone: b.dataset.hsZonepick }; } return go("reserve"); }
    if ((b = t("[data-hs-dvenue]"))) { ui.draft.venue = ui.venue = b.dataset.hsDvenue; ui.draft.table = null; ui.draft.zone = null; ui.anim = true; fixDraft(); return render(`[data-hs-dvenue="${ui.draft.venue}"]`); }
    if ((b = t("[data-hs-date]"))) { ui.draft.date = b.dataset.hsDate; fixDraft(); return render(`[data-hs-date="${ui.draft.date}"]`); }
    if ((b = t("[data-hs-party]"))) { ui.draft.party = Math.max(1, Math.min(8, ui.draft.party + +b.dataset.hsParty)); fixDraft(); return render(`[data-hs-party="${b.dataset.hsParty}"]`); }
    if ((b = t("[data-hs-time]"))) { ui.draft.time = b.dataset.hsTime; fixDraft(); return render(`[data-hs-time="${ui.draft.time}"]`); }
    if ((b = t("[data-hs-table]"))) { const z = zoneOf(ui.draft.venue, b.dataset.hsTable); if (z && z.id !== ui.draft.zone) ui.anim = true; ui.draft.table = b.dataset.hsTable; ui.draft.zone = z?.id; ui.msg = ""; render(`[data-hs-table="${ui.draft.table}"]`); say(`Table ${ui.draft.table}, ${z?.label}.`); return; }
    if (t("[data-hs-best]")) { const x = bestIn(ui.draft); if (x) { ui.anim = x.zone !== ui.draft.zone; ui.draft.table = x.id; ui.draft.zone = x.zone; say(`Table ${x.id} chosen, ${zoneOf(ui.draft.venue, x.id)?.label}.`); } return render(x ? `[data-hs-table="${x.id}"]` : null); }
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
      ui.draft = { venue: bk.venue, date: bk.date, party: bk.party, time: bk.time, table: bk.table, zone: zoneOf(bk.venue, bk.table)?.id, occasion: bk.occasion || "None", prefs: [...(bk.prefs || [])], note: bk.note || "", editing: bk.id };
      return go("reserve");
    }
    if (t("[data-hs-stopedit]")) { ui.draft = freshDraft(ui.draft.venue); return go("mine"); }
    if ((b = t("[data-hs-cancel]"))) { ui.cancelAsk = b.dataset.hsCancel; return render("[data-hs-cancelyes]"); }
    if (t("[data-hs-cancelno]")) { const id = ui.cancelAsk; ui.cancelAsk = null; return render(`[data-hs-cancel="${id}"]`); }
    if ((b = t("[data-hs-cancelyes]"))) { cancel(S, b.dataset.hsCancelyes); ui.cancelAsk = null; save(); say(`Booking ${b.dataset.hsCancelyes} cancelled. The table is free again.`); return render("[data-hs-view]"); }
    if ((b = t("[data-hs-visit]"))) { const before = tierOf(visits(S)).k; visit(S, b.dataset.hsVisit); save(); const after = tierOf(visits(S)).k; say(after !== before ? `Visit recorded. Welcome to ${after} in The Table Club.` : "Visit recorded in The Table Club."); return render("[data-hs-view]"); }
    if ((b = t("[data-hs-course]"))) { ui.course = b.dataset.hsCourse; return render(`#hs-c-${ui.course}`); }
    if (t("[data-hs-closeconfirm]")) { ui.confirm = null; return render(t("[data-hs-go]") ? "[data-hs-view]" : null); }
    if (t("[data-hs-reset]")) { S = seed(); save(); Object.assign(ui, { view: "discover", venue: "saffron", course: "start", vegOnly: false, draft: freshDraft(), confirm: null, cancelAsk: null, msg: "", anim: true }); say("Demo reset."); return render("[data-hs-reset]"); }
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
