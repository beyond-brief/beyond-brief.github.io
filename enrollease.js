// EnrollEase: a school admissions and student-experience demo for a fictional school.
// Every student, guardian, officer and number is synthetic. State lives in memory only:
// nothing is stored, sent or fetched, and a page reload starts the demo again.
(() => {
  const root = document.querySelector("[data-enrollease]");
  if (!root) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SCHOOL = "Alder Bay International School";
  const TODAY = new Date(2026, 9, 30, 9, 0);
  const DAY = 864e5;
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const fmt = (d, o = { day: "numeric", month: "short" }) => d.toLocaleDateString("en-GB", o);
  const fmtLong = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  /* ---------- Reference data ---------- */
  const STAGES = [
    { k: "sub", label: "Submitted", tone: "slate" },
    { k: "rev", label: "Under review", tone: "sky" },
    { k: "int", label: "Interview scheduled", tone: "violet" },
    { k: "pen", label: "Decision pending", tone: "amber" },
    { k: "adm", label: "Admitted", tone: "green" },
    { k: "wait", label: "Waitlisted", tone: "orange" },
    { k: "dec", label: "Declined", tone: "red" },
  ];
  const ST = Object.fromEntries(STAGES.map((s) => [s.k, s]));
  const OPEN = ["sub", "rev", "int", "pen"], DECIDED = ["adm", "wait", "dec"];
  const GRADES = ["ELC", "P1", "P2", "P3", "P4", "P5", "M1", "M2", "M3", "M4", "M5", "DP1", "DP2"];
  const SECTION = (g) => g === "ELC" ? "Early Years" : g[0] === "P" ? "Primary Years" : g[0] === "M" ? "Middle Years" : "Diploma";
  const SECTIONS = ["Early Years", "Primary Years", "Middle Years", "Diploma"];
  const OFFICERS = { ml: { name: "Mina Lindqvist", role: "Admissions lead" }, rh: { name: "Rena Huseynova", role: "Admissions officer" }, to: { name: "Tomás Ortega", role: "Admissions officer" } };
  const DOCS = ["Application form", "Passport or ID", "School reports, last two years", "Teacher reference", "Medical form"];
  const LANG = { "Türkiye": "Turkish, English", Azerbaijan: "Azerbaijani, English, Russian", Sweden: "Swedish, English", France: "French, English", Jordan: "Arabic, English", "South Korea": "Korean, English", Canada: "English, French", Egypt: "Arabic, English", Czechia: "Czech, English", Germany: "German, English", Kazakhstan: "Kazakh, Russian, English", Japan: "Japanese, English", "United Kingdom": "English", Bulgaria: "Bulgarian, English", Switzerland: "German, French, English", Portugal: "Portuguese, English", Poland: "Polish, English", Ireland: "English" };

  const RAW = `Jale Basaran|DP1|int|Türkiye
Kenan Mammadli|M3|rev|Azerbaijan
Sofia Lindgren|P2|adm|Sweden
Arda Yilmaz|M5|sub|Türkiye
Nilay Huseynli|ELC|rev|Azerbaijan
Omar Haddad|DP1|pen|Jordan
Elif Demir|P4|adm|Türkiye
Lucas Moreau|M1|sub|France
Zehra Guliyeva|P1|int|Azerbaijan
Daniel Park|DP2|dec|South Korea
Nuray Safarova|M2|rev|Azerbaijan
Ilkin Abbasov|P5|sub|Azerbaijan
Maya Chen|M4|int|Canada
Tural Hasanov|DP1|rev|Azerbaijan
Amira Nasser|P3|adm|Egypt
Emil Novak|ELC|wait|Czechia
Gunay Rzayeva|M1|pen|Azerbaijan
Theo Brandt|P2|sub|Germany
Selin Aksoy|M3|int|Türkiye
Rustam Karimov|DP1|sub|Kazakhstan
Hana Sato|P1|adm|Japan
Farid Ismayilov|M5|rev|Azerbaijan
Ella Wright|P4|pen|United Kingdom
Kamran Jafarov|M2|dec|Azerbaijan
Lina Petrova|DP2|int|Bulgaria
Yusuf Ozturk|P3|rev|Türkiye
Aytan Bagirova|ELC|adm|Azerbaijan
Noah Fischer|M4|sub|Switzerland
Defne Kaya|P5|wait|Türkiye
Orkhan Mirzayev|M1|rev|Azerbaijan
Isabel Duarte|P2|int|Portugal
Samir Quliyev|DP1|dec|Azerbaijan
Mira Kowalski|M3|pen|Poland
Elvin Novruzov|P1|rev|Azerbaijan
Chloe Martin|M2|adm|Ireland
Ayan Hajiyeva|P3|sub|Azerbaijan`;

  const PORTFOLIOS = {
    "Jale Basaran": {
      summary: "Science, debate and visual arts, with a strong MYP Personal Project.",
      achievements: [["Regional science fair", "Second place, environmental category · 2026"], ["MYP Personal Project", "Rated excellent by her current school · 2026"], ["Debate club", "Captain · 2025–26"]],
      projects: [
        { t: "Rainwater on rooftops", k: "Personal Project", d: "A scale model and report on collecting rainwater from school roofs.", f: "Report · 18 pages", tone: "sky" },
        { t: "City in layers", k: "Visual Arts", d: "Twelve linocut prints of an old town, built up colour by colour.", f: "12 images", tone: "violet" },
        { t: "Should homework be optional?", k: "Debate", d: "Opening speech from a regional schools final.", f: "Video · 6 min", tone: "amber" },
      ],
      activities: ["Debate club · captain", "Volleyball · school team", "Piano · grade 5", "Peer tutoring · Year 7 maths"],
    },
    "Maya Chen": {
      summary: "Music and robotics.",
      achievements: [["Junior robotics league", "Team finalist · 2026"]],
      projects: [{ t: "Line-following robot", k: "Design", d: "A small robot built and programmed with two classmates.", f: "Video · 2 min", tone: "sky" }, { t: "Spring recital", k: "Music", d: "Violin performance, two short pieces.", f: "Audio · 7 min", tone: "violet" }],
      activities: ["Violin · school orchestra", "Robotics club"],
    },
    "Lina Petrova": {
      summary: "Visual arts and languages.",
      achievements: [["Young artists' exhibition", "Selected entry · 2025"]],
      projects: [{ t: "Portraits of the market", k: "Visual Arts", d: "A series of ink portraits drawn on location.", f: "9 images", tone: "amber" }],
      activities: ["Art club", "Model United Nations"],
    },
  };

  /* ---------- Synthetic records (seeded, so every visit sees the same school) ---------- */
  let seed = 2027;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const MOTHERS = ["Lala", "Sabina", "Elena", "Ingrid", "Fatima", "Ayse", "Hye-jin", "Claire", "Marta", "Zeynep", "Gulnar", "Anna"];
  const FATHERS = ["Rashad", "Mehmet", "Karim", "Lars", "Jonas", "Daniel", "Emre", "Paolo", "Hiroshi", "Tarlan", "Marc", "Piotr"];
  const SUBMIT = { adm: [35, 59], wait: [35, 59], dec: [35, 59], pen: [29, 50], int: [20, 40], rev: [10, 29], sub: [1, 14] };
  const SLOTS = [[9, 0], [10, 30], [13, 0], [14, 30]];
  const weekday = (d) => { while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1); return d; };
  const at = (d, [h, m]) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };

  function build() {
    seed = 2027;
    return RAW.split("\n").map((line, i) => {
      const [name, grade, stage, country] = line.split("|");
      const [first, last] = name.split(" ");
      const submitted = addDays(TODAY, -between(...SUBMIT[stage]));
      let interview = null;
      if (stage === "int") interview = at(weekday(addDays(TODAY, between(1, 12))), pick(SLOTS));
      else if (stage === "pen" || DECIDED.includes(stage)) interview = at(weekday(addDays(submitted, between(10, 18))), pick(SLOTS));
      if (interview && stage !== "int" && interview > addDays(TODAY, -2)) interview = at(weekday(addDays(TODAY, -6)), [10, 30]);
      const docs = stage === "sub" ? between(2, 4) : stage === "rev" ? between(3, 5) : stage === "int" ? between(4, 5) : 5;
      const two = rnd() < 0.7;
      const guardians = two
        ? [{ name: `${pick(MOTHERS)} ${last}`, rel: "Mother", primary: true }, { name: `${pick(FATHERS)} ${last}`, rel: "Father" }]
        : [{ name: `${rnd() < 0.5 ? pick(MOTHERS) : pick(FATHERS)} ${last}`, rel: "Guardian", primary: true }];
      const g = GRADES.indexOf(grade);
      return {
        id: "EA-27-" + String(101 + i), name, first, last, grade, stage, country, submitted, interview, docs, guardians,
        officer: ["rh", "to", "ml"][i % 3], age: g === 0 ? 4 : 5 + g, current: g === 0 ? "Not yet at school" : `${GRADES[g - 1]} at their current school`,
        languages: LANG[country] || "English", portfolio: PORTFOLIOS[name] || null, notes: [], log: [],
        bio: `${first} is applying to join ${grade} in the ${SECTION(grade)} for August 2027 entry.`,
      };
    });
  }

  function jale(r) {
    Object.assign(r, {
      officer: "ml", docs: 4, submitted: new Date(2026, 9, 2), interview: new Date(2026, 10, 3, 10, 30), age: 16,
      current: "M5 (Grade 10) at her current school", languages: "Turkish, English, some Azerbaijani",
      bio: "Jale is applying to join the Diploma Programme in August 2027, hoping to take Biology, English and Visual Arts at higher level. Her application stands out for a strong MYP Personal Project and leadership in her school's debate club.",
      guardians: [{ name: "Derya Basaran", rel: "Mother", primary: true }, { name: "Emre Basaran", rel: "Father" }, { name: "Ada Basaran", rel: "Sister", note: "Current student, M2" }],
      missing: "Teacher reference",
      focus: "Motivation for the Diploma Programme, subject choices (Biology, English and Visual Arts at higher level) and how she manages a heavy workload.",
      panel: ["Mina Lindqvist, Admissions lead", "Diploma Programme coordinator"],
      notes: [
        { by: "ml", d: new Date(2026, 9, 16), t: "Strong Personal Project. In the interview, ask about subject choices and how she plans her week." },
        { by: "to", d: new Date(2026, 9, 24), t: "Teacher reference requested from her current English teacher. Follow up on Monday if it hasn't arrived." },
      ],
      enquiry: new Date(2026, 8, 19),
    });
  }

  let DATA, state;
  function reset() {
    DATA = build();
    jale(DATA[0]);
    state = { view: state?.view === "welcome" || !state ? "welcome" : "overview", id: null, tab: "overview", q: "", f: { stage: "", section: "", officer: "", flag: "" }, sort: ["submitted", -1], page: 0, sel: new Set(), comms: null, menu: false, toast: "" };
    state.comms = initComms();
  }

  /* ---------- Derived values ---------- */
  const byId = (id) => DATA.find((r) => r.id === id);
  const missingDocs = (r) => r.docs < DOCS.length;
  const upcoming = () => DATA.filter((r) => r.stage === "int" && r.interview && r.interview >= TODAY).sort((a, b) => a.interview - b.interview);
  function flag(r) {
    if (DECIDED.includes(r.stage)) return { k: "done", label: "Decision recorded" };
    if (missingDocs(r)) return { k: "docs", label: `Missing ${DOCS.length - r.docs} doc${DOCS.length - r.docs > 1 ? "s" : ""}` };
    if (r.stage === "pen") return { k: "ready", label: "Ready for decision" };
    if (r.stage === "int") return { k: "booked", label: "Interview booked" };
    return { k: "ok", label: "On track" };
  }
  function metrics() {
    const count = Object.fromEntries(STAGES.map((s) => [s.k, DATA.filter((r) => r.stage === s.k).length]));
    const decided = DECIDED.reduce((a, k) => a + count[k], 0);
    return { total: DATA.length, count, awaiting: count.sub + count.rev, admitted: count.adm, interviews: upcoming().length, decided, open: DATA.length - decided, docs: DATA.filter((r) => !missingDocs(r)).length };
  }
  function weeks() {
    // Applications received per week, Monday to Sunday, for the eight weeks up to today.
    const monday = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const end = monday(TODAY), out = [];
    for (let i = 7; i >= 0; i--) { const s = addDays(end, -7 * i); out.push({ s, n: DATA.filter((r) => r.submitted >= s && r.submitted < addDays(s, 7)).length }); }
    return out;
  }
  function stageOf(r) { return STAGES.findIndex((s) => s.k === r.stage); }
  function timeline(r) {
    const ev = [];
    if (r.enquiry) ev.push({ d: r.enquiry, t: "Attended an open morning" });
    ev.push({ d: r.submitted, t: "Application submitted" });
    ev.push({ d: addDays(r.submitted, 2), t: `Documents received: ${r.docs} of ${DOCS.length}` });
    const i = stageOf(r);
    if (i >= 1) ev.push({ d: addDays(r.submitted, 5), t: "Moved to Under review" });
    if (i >= 2 && r.interview) ev.push({ d: addDays(r.submitted, 9) < r.interview ? addDays(r.submitted, 9) : addDays(r.interview, -3), t: `Interview booked for ${fmtLong(r.interview)}, ${fmtTime(r.interview)}` });
    if (i >= 3 && r.interview && r.interview < TODAY) ev.push({ d: r.interview, t: "Interview completed" });
    if (i >= 4) ev.push({ d: r.interview ? addDays(r.interview, 4) : addDays(r.submitted, 20), t: `Decision recorded: ${ST[r.stage].label}` });
    return ev.filter((e) => e.d <= TODAY).concat(r.log).sort((a, b) => a.d - b.d);
  }

  /* ---------- Actions ---------- */
  function freeSlot() {
    const taken = new Set(DATA.filter((r) => r.stage === "int" && r.interview).map((r) => r.interview.getTime()));
    for (let d = 1; d < 30; d++) { const day = addDays(TODAY, d); if (day.getDay() === 0 || day.getDay() === 6) continue; for (const s of SLOTS) { const t = at(day, s); if (!taken.has(t.getTime())) return t; } }
    return at(weekday(addDays(TODAY, 3)), [10, 30]);
  }
  function setStage(r, k) {
    if (!r || r.stage === k) return;
    r.stage = k;
    r.log.push({ d: TODAY, t: `Moved to ${ST[k].label}`, you: true });
    if (k === "int" && (!r.interview || r.interview < TODAY)) { r.interview = freeSlot(); r.log.push({ d: TODAY, t: `Interview booked for ${fmtLong(r.interview)}, ${fmtTime(r.interview)}`, you: true }); }
  }
  const NEXT = { sub: "rev", rev: "int", int: "pen" };

  /* ---------- Small view helpers ---------- */
  const ICON = {
    overview: '<path d="M3 3h6v8H3zM11 3h6v5h-6zM11 10h6v7h-6zM3 13h6v4H3z"/>',
    applications: '<path d="M5 2h7l4 4v12H5z"/><path d="M12 2v4h4M8 10h5M8 13h5"/>',
    analytics: '<path d="M3 17V9M8 17V4M13 17v-6M18 17V7"/>',
    comms: '<path d="M3 8v4h3l6 4V4L6 8zM15 7c1.5 1.2 1.5 4.8 0 6"/>',
    portfolios: '<path d="M2 6h6l2 2h8v9H2z"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/>',
    expand: '<path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/>',
    shrink: '<path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5"/>',
    back: '<path d="M12 4 6 10l6 6"/>',
    check: '<path d="m4 10 4 4 8-8"/>',
    clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>',
    doc: '<path d="M5 2h7l4 4v12H5z"/><path d="M12 2v4h4"/>',
    star: '<path d="m10 2 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"/>',
    users: '<circle cx="7" cy="7" r="3"/><path d="M2 17c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5M13 4a3 3 0 0 1 0 6M15 12.6c1.6.6 2.6 2 3 4.4"/>',
    menu: '<path d="M3 6h14M3 10h14M3 14h14"/>',
  };
  const ico = (k, s = 18) => `<svg class="ee-i" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true">${ICON[k]}</svg>`;
  const pill = (k) => `<span class="ee-pill t-${ST[k].tone}">${ST[k].label}</span>`;
  const HUES = ["#DCEBFF", "#E7E4FF", "#DDF5EC", "#FFEBD6", "#FFE1E6", "#E2F4FB"];
  const avatar = (r, size = 36) => r.name === "Jale Basaran" ? jaleArt(size) : `<span class="ee-av" style="--s:${size}px;background:${HUES[(r.name.length + r.last.length) % HUES.length]}" aria-hidden="true">${r.first[0]}${r.last[0]}</span>`;
  const initials = (n, size = 34, i = 0) => `<span class="ee-av" style="--s:${size}px;background:${HUES[i % HUES.length]}" aria-hidden="true">${n.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>`;
  let artN = 0;
  function jaleArt(size) {
    // Illustrated portrait (drawn for this demo, no photograph).
    const id = "ee-jc" + ++artN;
    return `<svg class="ee-av art" style="--s:${size}px" width="${size}" height="${size}" viewBox="0 0 80 80" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="40" cy="40" r="40"/></clipPath></defs><g clip-path="url(#${id})">
      <rect width="80" height="80" fill="#CDEBFA"/><circle cx="64" cy="16" r="10" fill="#FFD27A" opacity=".8"/>
      <path d="M14 82c2-17 13-25 26-25s24 8 26 25z" fill="#2B3A67"/><path d="M33 57l7 9 7-9" fill="#fff"/><path d="M38 60h4l-1 9h-2z" fill="#C83E4D"/>
      <rect x="35" y="47" width="10" height="11" rx="4" fill="#C98E6B"/>
      <path d="M21 39c0-15 8-24 19-24s19 9 19 24c0 9-2 18-6 22H27c-4-4-6-13-6-22z" fill="#3A2420"/>
      <ellipse cx="40" cy="38" rx="13" ry="15" fill="#E0A982"/>
      <path d="M26 33c3-9 9-13 16-13 6 0 11 4 13 10-7-1-13-4-16-8-3 6-8 9-13 11z" fill="#3A2420"/>
      <circle cx="35" cy="39" r="1.6" fill="#2A1A16"/><circle cx="45" cy="39" r="1.6" fill="#2A1A16"/><path d="M36 46c2.6 2 5.4 2 8 0" stroke="#9A4F3C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="44" r="2.4" fill="#F0897B" opacity=".35"/><circle cx="48" cy="44" r="2.4" fill="#F0897B" opacity=".35"/></g></svg>`;
  }
  const docBar = (r) => `<span class="ee-docs" title="${r.docs} of ${DOCS.length} documents"><span class="ee-docs-t"><i style="width:${(r.docs / DOCS.length) * 100}%"></i></span><b>${r.docs}/${DOCS.length}</b></span>`;
  const empty = (title, text) => `<div class="ee-empty"><span>${ico("doc", 22)}</span><b>${esc(title)}</b><p>${esc(text)}</p></div>`;
  const short = (n) => { const [a, b] = n.split(" "); return `${a} ${b[0]}.`; };
  const headTitle = { overview: "Overview", applications: "Applications", profile: "Student profile", comms: "Notice board", portfolios: "Portfolios", analytics: "Analytics" };

  /* ---------- Shell ---------- */
  const NAV = [["Admissions", [["overview", "Overview", "violet"], ["applications", "Applications", "teal"], ["analytics", "Analytics", "red"]]], ["Families", [["comms", "Notice board", "orange"]]], ["Docs", [["portfolios", "Portfolios", "indigo"]]]];
  root.innerHTML = `<div class="ee" data-ee>
    <div class="ee-band" aria-hidden="true"></div>
    <aside class="ee-side">
      <div class="ee-brand"><span class="ee-logo" aria-hidden="true">E</span><b>EnrollEase</b><button type="button" class="ee-menu" aria-expanded="false" aria-controls="ee-nav">${ico("menu")}<span>Menu</span></button></div>
      <nav class="ee-nav" id="ee-nav" aria-label="EnrollEase">${NAV.map(([g, items]) => `<p class="ee-group">${g}</p>${items.map(([k, l, c]) => `<button type="button" class="ee-link c-${c}" data-ee-nav="${k}">${ico(k)}<span>${l}</span><em data-ee-badge="${k}"></em></button>`).join("")}`).join("")}</nav>
      <div class="ee-side-foot"><span class="ee-folder" aria-hidden="true"><i></i><i></i></span><b>Demo school</b><p>${SCHOOL} is fictional. Changes stay in this browser tab.</p><button type="button" class="ee-btn ghost sm" data-ee-reset>Reset demo data</button></div>
    </aside>
    <div class="ee-main">
      <header class="ee-top">
        <div class="ee-crumb"><span>Admissions · 2027–28 entry</span><b data-ee-title>Overview</b></div>
        <label class="ee-search">${ico("search", 16)}<span class="sr-only">Search applicants</span><input type="search" placeholder="Search applicants" data-ee-q autocomplete="off"></label>
        <span class="ee-user" title="Signed in to the demo">${initials("Mina Lindqvist", 30, 1)}<span><b>Mina L.</b><small>Admissions lead</small></span></span>
        <button type="button" class="ee-icon-btn" data-ee-full aria-pressed="false" aria-label="Full screen">${ico("expand")}</button>
      </header>
      <div class="ee-view" data-ee-body tabindex="-1"></div>
    </div>
    <div class="ee-welcome" data-ee-welcome></div>
    <p class="ee-toast" role="status" aria-live="polite" data-ee-toast></p>
  </div>`;
  const app = root.querySelector("[data-ee]");
  const $ = (s) => app.querySelector(s);
  const body = $("[data-ee-body]");

  /* ---------- Welcome (from the original sign-in screen) ---------- */
  function welcome() {
    $("[data-ee-welcome]").innerHTML = `<div class="ee-w-copy">
        <span class="ee-brand-w"><span class="ee-logo" aria-hidden="true">E</span>EnrollEase</span>
        <h3>Welcome back<span>.</span></h3>
        <p>Step into the admissions office of ${SCHOOL}, a fictional school. Review applications, move students through the process and draft a notice for families.</p>
        <button type="button" class="ee-btn dark lg" data-ee-enter>Enter as the admissions team</button>
        <ul class="ee-w-facts"><li>${ico("users", 16)}36 fictional applicants</li><li>${ico("check", 16)}No sign-in, nothing is saved</li><li>${ico("comms", 16)}No message is ever sent</li></ul>
      </div>
      <div class="ee-w-art" aria-hidden="true">
        <svg viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice"><rect width="400" height="360" fill="#2CB8EE"/>
          <circle cx="320" cy="70" r="46" fill="#FFD27A"/><path d="M0 250 Q120 200 220 240 T400 220V360H0z" fill="#22A3D6"/>
          <rect x="120" y="120" width="170" height="130" rx="6" fill="#fff"/><path d="M110 125 205 70l95 55z" fill="#5B5BD6"/>
          <rect x="190" y="190" width="30" height="60" rx="3" fill="#2B3A67"/>
          <g fill="#CDEBFA"><rect x="140" y="140" width="30" height="26" rx="3"/><rect x="240" y="140" width="30" height="26" rx="3"/><rect x="140" y="192" width="30" height="26" rx="3"/><rect x="240" y="192" width="30" height="26" rx="3"/></g>
          <circle cx="205" cy="104" r="11" fill="#fff"/><path d="M205 97v7l5 3" stroke="#5B5BD6" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <path d="M40 300 Q200 270 360 300" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="2 10" stroke-linecap="round"/>
        </svg>
        <div class="ee-w-quote"><b>Begin your enrolment journey.</b><span>One place for applications, families and decisions.</span></div>
      </div>`;
  }

  /* ---------- Views ---------- */
  function vOverview() {
    const m = metrics(), w = weeks(), max = Math.max(...w.map((x) => x.n), 1);
    const recent = [...DATA].sort((a, b) => b.submitted - a.submitted).slice(0, 5);
    const up = upcoming().slice(0, 4);
    const chase = DATA.filter((r) => OPEN.includes(r.stage) && missingDocs(r)).length;
    const cards = [
      ["Total applications", m.total, `${m.open} still open`, "violet", "users", {}],
      ["Awaiting review", m.awaiting, `${m.count.sub} new · ${m.count.rev} in review`, "sky", "doc", { stage: "awaiting" }],
      ["Admitted", m.admitted, `${m.decided} decisions so far`, "green", "check", { stage: "adm" }],
      ["Upcoming interviews", m.interviews, up[0] ? `Next: ${fmtLong(up[0].interview)}` : "None booked", "orange", "clock", { stage: "int" }],
    ];
    return `<h3 class="ee-h sr-only" tabindex="-1">Overview</h3>
    <div class="ee-stats">${cards.map(([t, n, s, c, icon, f]) => `<button type="button" class="ee-stat c-${c}" data-ee-go="applications" data-ee-filter='${JSON.stringify(f)}'><span class="ee-stat-t">${t}</span><b>${n}</b><small>${esc(s)}</small><span class="ee-stat-i" aria-hidden="true">${ico(icon, 18)}</span></button>`).join("")}</div>
    <div class="ee-grid two">
      <section class="ee-card"><header><h4>Application activity</h4><span class="ee-sub">Applications received per week</span></header>
        <div class="ee-bars" role="img" aria-label="${w.map((x) => `Week of ${fmt(x.s)}: ${x.n}`).join(", ")}">${w.map((x, i) => `<div class="ee-bar${i === w.length - 1 ? " now" : ""}"><b>${x.n}</b><i style="height:${(x.n / max) * 100}%"></i><span>${fmt(x.s)}</span></div>`).join("")}</div></section>
      <section class="ee-card"><header><h4>Admissions pipeline</h4><span class="ee-sub">Select a stage to see who is in it</span></header>
        <div class="ee-pipe">${STAGES.map((s) => `<button type="button" class="ee-pipe-row" data-ee-go="applications" data-ee-filter='${JSON.stringify({ stage: s.k })}'><span>${s.label}</span><span class="ee-pipe-t"><i class="t-${s.tone}" style="width:${(m.count[s.k] / m.total) * 100}%"></i></span><b>${m.count[s.k]}</b></button>`).join("")}</div></section>
    </div>
    <div class="ee-grid three">
      <section class="ee-card span2"><header><h4>Recent applications</h4><button type="button" class="ee-link-btn" data-ee-go="applications" data-ee-filter='{}'>View all</button></header>
        <ul class="ee-list">${recent.map((r) => `<li><button type="button" class="ee-row-btn" data-ee-open="${r.id}">${avatar(r)}<span class="ee-who"><b>${esc(r.name)}</b><small>${r.grade} · ${SECTION(r.grade)}</small></span>${pill(r.stage)}<span class="ee-date">${fmt(r.submitted)}</span></button></li>`).join("")}</ul></section>
      <section class="ee-card"><header><h4>Upcoming interviews</h4></header>
        ${up.length ? `<ul class="ee-agenda">${up.map((r) => `<li><button type="button" class="ee-row-btn" data-ee-open="${r.id}"><span class="ee-day"><b>${r.interview.getDate()}</b>${fmt(r.interview, { month: "short" })}</span><span class="ee-who"><b>${esc(r.name)}</b><small>${fmtTime(r.interview)} · ${r.grade} · ${OFFICERS[r.officer].name.split(" ")[0]}</small></span></button></li>`).join("")}</ul>` : empty("No interviews booked", "Move an application to Interview scheduled to book one.")}
      </section>
    </div>
    <section class="ee-card"><header><h4>Today's priorities</h4><span class="ee-sub">Worked out from the applications above</span></header>
      <div class="ee-tasks">
        <button type="button" data-ee-go="applications" data-ee-filter='${JSON.stringify({ stage: "awaiting" })}'><b>${m.awaiting}</b><span>applications to review</span></button>
        <button type="button" data-ee-go="applications" data-ee-filter='${JSON.stringify({ flag: "docs" })}'><b>${chase}</b><span>families to chase for documents</span></button>
        <button type="button" data-ee-go="applications" data-ee-filter='${JSON.stringify({ stage: "pen" })}'><b>${m.count.pen}</b><span>decisions to make</span></button>
      </div></section>`;
  }

  function filtered() {
    const q = state.q.trim().toLowerCase(), f = state.f;
    let rows = DATA.filter((r) => (!q || `${r.name} ${r.id} ${r.grade}`.toLowerCase().includes(q))
      && (!f.stage || (f.stage === "awaiting" ? ["sub", "rev"].includes(r.stage) : r.stage === f.stage))
      && (!f.section || SECTION(r.grade) === f.section) && (!f.officer || r.officer === f.officer) && (!f.flag || flag(r).k === f.flag));
    const [k, dir] = state.sort;
    const val = (r) => k === "name" ? r.last + r.first : k === "grade" ? GRADES.indexOf(r.grade) : k === "stage" ? stageOf(r) : k === "officer" ? OFFICERS[r.officer].name : k === "docs" ? r.docs : r.submitted.getTime();
    return rows.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }
  const PER = 10;
  function vApplications() {
    const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / PER));
    state.page = Math.min(state.page, pages - 1);
    const show = rows.slice(state.page * PER, state.page * PER + PER), f = state.f;
    const th = (k, l) => { const on = state.sort[0] === k; return `<th scope="col" aria-sort="${on ? (state.sort[1] > 0 ? "ascending" : "descending") : "none"}"><button type="button" data-ee-sort="${k}">${l}<span aria-hidden="true">${on ? (state.sort[1] > 0 ? "↑" : "↓") : "↕"}</span></button></th>`; };
    const opt = (v, l, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${l}</option>`;
    const any = state.q || Object.values(f).some(Boolean);
    const sel = state.sel.size;
    return `<h3 class="ee-h" tabindex="-1">Applications <span>${rows.length} of ${DATA.length}</span></h3>
    <div class="ee-card ee-table-card">
      <div class="ee-tools">
        <label class="ee-field"><span>Stage</span><select id="ee-f-stage" data-ee-f="stage">${opt("", "All stages", f.stage)}${opt("awaiting", "Awaiting review", f.stage)}${STAGES.map((s) => opt(s.k, s.label, f.stage)).join("")}</select></label>
        <label class="ee-field"><span>Section</span><select id="ee-f-section" data-ee-f="section">${opt("", "All sections", f.section)}${SECTIONS.map((s) => opt(s, s, f.section)).join("")}</select></label>
        <label class="ee-field"><span>Officer</span><select id="ee-f-officer" data-ee-f="officer">${opt("", "Everyone", f.officer)}${Object.entries(OFFICERS).map(([k, o]) => opt(k, o.name, f.officer)).join("")}</select></label>
        <label class="ee-field"><span>Status</span><select id="ee-f-flag" data-ee-f="flag">${opt("", "Any status", f.flag)}${[["docs", "Missing documents"], ["ready", "Ready for decision"], ["booked", "Interview booked"], ["ok", "On track"], ["done", "Decision recorded"]].map(([k, l]) => opt(k, l, f.flag)).join("")}</select></label>
        ${any ? `<button type="button" class="ee-link-btn" data-ee-clear>Clear filters</button>` : ""}
      </div>
      <div class="ee-bulk${sel ? " on" : ""}" aria-live="polite">${sel ? `<b>${sel} selected</b><label class="ee-field inline"><span>Move to</span><select id="ee-bulk-to">${STAGES.map((s) => `<option value="${s.k}">${s.label}</option>`).join("")}</select></label><button type="button" class="ee-btn sm" data-ee-bulk data-ee-stage="bulk">Apply</button><button type="button" class="ee-link-btn" data-ee-unsel>Clear selection</button>` : `<span>Select applications to move several at once.</span>`}</div>
      ${show.length ? `<div class="ee-table-wrap"><table class="ee-table"><thead><tr><th scope="col" class="cb"><input type="checkbox" id="ee-selall" data-ee-selall ${show.every((r) => state.sel.has(r.id)) ? "checked" : ""} aria-label="Select all on this page"></th>${th("name", "Student")}${th("grade", "Grade")}${th("stage", "Stage")}${th("submitted", "Submitted")}${th("officer", "Officer")}${th("docs", "Documents")}<th scope="col">Status</th></tr></thead>
      <tbody>${show.map((r) => { const fl = flag(r); return `<tr class="${state.sel.has(r.id) ? "sel" : ""}"><td class="cb"><input type="checkbox" id="ee-cb-${r.id}" data-ee-sel="${r.id}" ${state.sel.has(r.id) ? "checked" : ""} aria-label="Select ${esc(r.name)}"></td>
        <td class="nm" data-l="Student"><button type="button" class="ee-name" data-ee-open="${r.id}">${avatar(r, 32)}<span><b>${esc(r.name)}</b><small>${r.id}</small></span></button></td>
        <td data-l="Grade" title="${SECTION(r.grade)}">${r.grade}</td><td data-l="Stage">${pill(r.stage)}</td><td data-l="Submitted">${fmt(r.submitted)}</td>
        <td data-l="Officer">${short(OFFICERS[r.officer].name)}</td><td data-l="Documents">${docBar(r)}</td><td data-l="Status"><span class="ee-flag f-${fl.k}">${fl.label}</span></td></tr>`; }).join("")}</tbody></table></div>
      <div class="ee-pager"><span>Showing ${state.page * PER + 1}–${state.page * PER + show.length} of ${rows.length}</span><div>${pages > 1 ? `<button type="button" data-ee-page="${state.page - 1}" ${state.page === 0 ? "disabled" : ""} aria-label="Previous page">‹</button>${Array.from({ length: pages }, (_, i) => `<button type="button" data-ee-page="${i}" ${i === state.page ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}<button type="button" data-ee-page="${state.page + 1}" ${state.page >= pages - 1 ? "disabled" : ""} aria-label="Next page">›</button>` : ""}</div></div>`
      : empty("No applications match", "Try a different search or clear the filters.")}
    </div>`;
  }

  function vProfile() {
    const r = byId(state.id);
    if (!r) return empty("Student not found", "Go back to Applications.");
    const i = stageOf(r), decided = DECIDED.includes(r.stage), fl = flag(r);
    const steps = ["Submitted", "Under review", "Interview", "Decision pending", "Decision"];
    const stepAt = Math.min(i, 4);
    const next = NEXT[r.stage];
    const actions = r.stage === "pen"
      ? `<button type="button" class="ee-btn green" data-ee-set="adm" data-ee-stage="adm">Admit</button><button type="button" class="ee-btn amber" data-ee-set="wait" data-ee-stage="wait">Waitlist</button><button type="button" class="ee-btn red ghost" data-ee-set="dec" data-ee-stage="dec">Decline</button>`
      : next ? `<button type="button" class="ee-btn" data-ee-set="${next}" data-ee-stage="${next}">Move to ${ST[next].label}</button>` : `<span class="ee-done">${ico("check", 16)}Decision recorded</span>`;
    const tabs = [["overview", "Overview"], ["portfolio", "Portfolio"], ["timeline", "Timeline & notes"]];
    return `<div class="ee-prof-head">
      <button type="button" class="ee-back" data-ee-go="applications">${ico("back", 16)}Applications</button>
      <div class="ee-prof-id">${avatar(r, 96)}<div><h3 class="ee-h" tabindex="-1">${esc(r.name)}</h3><p>${r.id} · Applying for ${r.grade}, ${SECTION(r.grade)} · August 2027</p></div></div>
      <div class="ee-prof-act">${pill(r.stage)}<label class="ee-field inline"><span>Change stage</span><select id="ee-stage-sel" data-ee-stagesel>${STAGES.map((s) => `<option value="${s.k}"${s.k === r.stage ? " selected" : ""}>${s.label}</option>`).join("")}</select></label></div>
    </div>
    <div class="ee-card ee-progress">
      <ol class="ee-steps">${steps.map((s, n) => `<li class="${n < stepAt ? "done" : n === stepAt ? "now" : ""}${n === 4 && decided ? " t-" + ST[r.stage].tone : ""}"><i>${n < stepAt || (n === 4 && decided) ? ico("check", 12) : n + 1}</i><span>${n === 4 && decided ? ST[r.stage].label : s}</span></li>`).join("")}</ol>
      <div class="ee-next"><span class="ee-flag f-${fl.k}">${fl.label}</span><div class="ee-next-act">${actions}</div></div>
    </div>
    <div class="ee-tabs" role="tablist" aria-label="Profile sections">${tabs.map(([k, l]) => `<button type="button" role="tab" id="ee-tab-${k}" aria-controls="ee-tabpanel" aria-selected="${state.tab === k}" tabindex="${state.tab === k ? 0 : -1}" data-ee-tab="${k}">${l}${k === "portfolio" && !r.portfolio ? '<small>empty</small>' : ""}</button>`).join("")}</div>
    <div class="ee-tabpanel" role="tabpanel" id="ee-tabpanel" aria-labelledby="ee-tab-${state.tab}">${state.tab === "portfolio" ? tPortfolio(r) : state.tab === "timeline" ? tTimeline(r) : tOverview(r)}</div>`;
  }
  function tOverview(r) {
    const docStates = DOCS.map((d, n) => {
      const ok = r.name === "Jale Basaran" ? d !== r.missing : n < r.docs;
      return `<li class="${ok ? "ok" : "miss"}"><span class="ee-doc-i">${ico(ok ? "check" : "clock", 14)}</span><span><b>${d}</b><small>${ok ? `Received ${fmt(addDays(r.submitted, 2))}` : "Requested · waiting"}</small></span></li>`;
    }).join("");
    return `<div class="ee-grid prof">
      <section class="ee-card"><header><h4>Student overview</h4></header><p class="ee-bio">${esc(r.bio)}</p>
        <dl class="ee-dl"><div><dt>Applying for</dt><dd>${r.grade} · ${SECTION(r.grade)}</dd></div><div><dt>Academic year</dt><dd>2027–28 entry</dd></div><div><dt>Currently</dt><dd>${esc(r.current)}</dd></div><div><dt>Age at entry</dt><dd>${r.age}</dd></div><div><dt>Nationality</dt><dd>${esc(r.country)}</dd></div><div><dt>Languages</dt><dd>${esc(r.languages)}</dd></div><div><dt>Officer</dt><dd>${OFFICERS[r.officer].name}</dd></div><div><dt>Submitted</dt><dd>${fmt(r.submitted, { day: "numeric", month: "long", year: "numeric" })}</dd></div></dl></section>
      <section class="ee-card"><header><h4>Guardians</h4><span class="ee-sub">Contact details are held on file, not shown here</span></header>
        <ul class="ee-guard">${r.guardians.map((g, n) => `<li>${initials(g.name, 38, n + 2)}<span><b>${esc(g.name)}</b><small>${g.rel}${g.note ? " · " + esc(g.note) : ""}</small></span>${g.primary ? '<em>Primary contact</em>' : ""}</li>`).join("")}</ul></section>
      <section class="ee-card"><header><h4>Required documents</h4><span class="ee-sub">${r.docs} of ${DOCS.length} received</span></header><ul class="ee-doclist">${docStates}</ul></section>
      <section class="ee-card"><header><h4>Interview</h4></header>${r.interview ? `<div class="ee-int"><span class="ee-day lg"><b>${r.interview.getDate()}</b>${fmt(r.interview, { month: "short" })}</span><div><b>${fmtLong(r.interview)} · ${fmtTime(r.interview)}</b><small>${r.interview >= TODAY ? (r.stage === "int" ? "Booked" : "Booked, but the application has moved on") : "Completed"} · Admissions office</small></div></div>
        <dl class="ee-dl one"><div><dt>Panel</dt><dd>${esc((r.panel || [OFFICERS[r.officer].name + ", " + OFFICERS[r.officer].role]).join(" · "))}</dd></div>${r.focus ? `<div><dt>Focus</dt><dd>${esc(r.focus)}</dd></div>` : ""}</dl>` : empty("No interview yet", "Moving the application to Interview scheduled books the next free slot.")}</section>
    </div>`;
  }
  function tPortfolio(r) {
    const p = r.portfolio;
    if (!p) return empty("No portfolio uploaded yet", `${r.first}'s family hasn't added portfolio work. Portfolios are optional for ${r.grade} applicants.`);
    return `<div class="ee-folio">
      <section class="ee-card ee-folio-lead"><header><h4>Portfolio</h4><span class="ee-sub">${esc(p.summary)}</span></header>
        <ol class="ee-ach">${p.achievements.map(([t, d]) => `<li>${ico("star", 16)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span></li>`).join("")}</ol>
        <p class="ee-k">Activities</p><ul class="ee-chips">${p.activities.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></section>
      <div class="ee-works">${p.projects.map((w) => `<article class="ee-work"><div class="ee-thumb t-${w.tone}" aria-hidden="true"><span>${esc(w.k)}</span></div><div><small>${esc(w.k)}</small><h5>${esc(w.t)}</h5><p>${esc(w.d)}</p><span class="ee-file">${ico("doc", 14)}${esc(w.f)}</span></div></article>`).join("")}</div>
    </div>`;
  }
  function tTimeline(r) {
    const ev = timeline(r).slice().reverse();
    return `<div class="ee-grid prof">
      <section class="ee-card"><header><h4>Admissions timeline</h4></header><ol class="ee-tl">${ev.map((e) => `<li class="${e.you ? "you" : ""}"><span class="ee-tl-d">${fmt(e.d)}</span><span>${esc(e.t)}${e.you ? '<small>You · in this demo</small>' : ""}</span></li>`).join("")}</ol></section>
      <section class="ee-card"><header><h4>Internal notes</h4><span class="ee-sub">Visible to the admissions team only</span></header>
        ${r.notes.length ? `<ul class="ee-notes">${r.notes.slice().reverse().map((n) => `<li>${n.by === "you" ? initials("You", 30, 0) : initials(OFFICERS[n.by].name, 30, 1)}<div><b>${n.by === "you" ? "You" : OFFICERS[n.by].name}</b><small>${fmt(n.d)}</small><p>${esc(n.t)}</p></div></li>`).join("")}</ul>` : empty("No notes yet", "Notes help the next person pick up the application.")}
        <form class="ee-note-form" data-ee-note><label class="sr-only" for="ee-note">Add a note</label><textarea id="ee-note" rows="2" placeholder="Add a note for the team" maxlength="280"></textarea><button type="submit" class="ee-btn sm">Add note</button></form></section>
    </div>`;
  }

  function vPortfolios() {
    const withF = DATA.filter((r) => r.portfolio);
    return `<h3 class="ee-h" tabindex="-1">Portfolios <span>${withF.length} of ${DATA.length} applicants</span></h3>
    <div class="ee-folio-list">${withF.map((r) => `<button type="button" class="ee-card ee-folio-row" data-ee-open="${r.id}" data-ee-opentab="portfolio">${avatar(r, 56)}<span class="ee-who"><b>${esc(r.name)}</b><small>${r.grade} · ${esc(r.portfolio.summary)}</small></span><span class="ee-strip">${r.portfolio.projects.map((w) => `<i class="ee-thumb t-${w.tone}"><span>${esc(w.k)}</span></i>`).join("")}</span>${pill(r.stage)}</button>`).join("")}</div>
    <p class="ee-hint">Portfolios are optional. The other ${DATA.length - withF.length} applicants haven't added one.</p>`;
  }

  function vAnalytics() {
    const m = metrics(), up = upcoming();
    const bySec = SECTIONS.map((s) => ({ s, rows: DATA.filter((r) => SECTION(r.grade) === s) }));
    const maxG = Math.max(...GRADES.map((g) => DATA.filter((r) => r.grade === g).length));
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    return `<h3 class="ee-h" tabindex="-1">Analytics <span>2027–28 entry, all from the applications in this demo</span></h3>
    <div class="ee-kpis">
      <div><span>Decisions made</span><b>${pct(m.decided, m.total)}%</b><small>${m.decided} of ${m.total} applications</small><i style="--p:${pct(m.decided, m.total)}%"></i></div>
      <div><span>Offer rate</span><b>${pct(m.count.adm, m.decided)}%</b><small>${m.count.adm} admitted of ${m.decided} decided</small><i style="--p:${pct(m.count.adm, m.decided)}%"></i></div>
      <div><span>Files complete</span><b>${pct(m.docs, m.total)}%</b><small>${m.docs} with all ${DOCS.length} documents</small><i style="--p:${pct(m.docs, m.total)}%"></i></div>
    </div>
    <div class="ee-grid two">
      <section class="ee-card"><header><h4>Applications by status</h4></header><div class="ee-pipe static">${STAGES.map((s) => `<div class="ee-pipe-row"><span>${s.label}</span><span class="ee-pipe-t"><i class="t-${s.tone}" style="width:${(m.count[s.k] / m.total) * 100}%"></i></span><b>${m.count[s.k]}</b></div>`).join("")}</div></section>
      <section class="ee-card"><header><h4>Applications by grade</h4><span class="ee-sub">Coloured by section</span></header>
        <div class="ee-cols" role="img" aria-label="${GRADES.map((g) => `${g}: ${DATA.filter((r) => r.grade === g).length}`).join(", ")}">${GRADES.map((g) => { const n = DATA.filter((r) => r.grade === g).length; return `<div class="s-${SECTIONS.indexOf(SECTION(g))}"><b>${n}</b><i style="height:${(n / maxG) * 100}%"></i><span>${g}</span></div>`; }).join("")}</div>
        <ul class="ee-legend">${SECTIONS.map((s, n) => `<li class="s-${n}">${s}</li>`).join("")}</ul></section>
    </div>
    <div class="ee-grid two">
      <section class="ee-card"><header><h4>Progress by section</h4></header><div class="ee-stack-list">${bySec.map(({ s, rows }) => `<div><span>${s}<small>${rows.length}</small></span><span class="ee-stack" aria-label="${STAGES.map((st) => `${st.label} ${rows.filter((r) => r.stage === st.k).length}`).join(", ")}">${STAGES.map((st) => { const n = rows.filter((r) => r.stage === st.k).length; return n ? `<i class="t-${st.tone}" style="flex:${n}" title="${st.label}: ${n}"></i>` : ""; }).join("")}</span></div>`).join("")}</div>
        <ul class="ee-legend">${STAGES.map((s) => `<li class="t-${s.tone}">${s.label}</li>`).join("")}</ul></section>
      <section class="ee-card"><header><h4>Upcoming interviews</h4><span class="ee-sub">${up.length} booked</span></header>${up.length ? `<ul class="ee-agenda compact">${up.map((r) => `<li><button type="button" class="ee-row-btn" data-ee-open="${r.id}"><span class="ee-day"><b>${r.interview.getDate()}</b>${fmt(r.interview, { month: "short" })}</span><span class="ee-who"><b>${esc(r.name)}</b><small>${fmtTime(r.interview)} · ${r.grade}</small></span><span class="ee-off">${OFFICERS[r.officer].name}</span></button></li>`).join("")}</ul>` : empty("No interviews booked", "")}</section>
    </div>`;
  }

  /* ---------- Notice board ---------- */
  const AUD = [
    ["all", "All applicant families", () => DATA, "Dear families"],
    ["int", "Families with an interview booked", () => DATA.filter((r) => r.stage === "int"), "Dear families"],
    ["adm", "Admitted families", () => DATA.filter((r) => r.stage === "adm"), "Dear families of our new students"],
    ["dp", "Diploma applicants' families", () => DATA.filter((r) => SECTION(r.grade) === "Diploma"), "Dear Diploma Programme families"],
    ["docs", "Families with missing documents", () => DATA.filter((r) => OPEN.includes(r.stage) && missingDocs(r)), "Dear families"],
  ];
  const reach = (k) => { const rows = AUD.find((a) => a[0] === k)[2](); return { students: rows.length, people: rows.reduce((a, r) => a + r.guardians.filter((g) => g.rel !== "Sister").length, 0) }; };
  const TIMES = [["", "Not scheduled"], ["2026-11-02T08:00", "Mon 2 Nov, 08:00"], ["2026-11-04T16:00", "Wed 4 Nov, 16:00"], ["2026-11-09T08:00", "Mon 9 Nov, 08:00"]];
  function initComms() {
    return {
      sel: "c3",
      list: [
        { id: "c1", title: "Open morning: Saturday 14 November", aud: "all", status: "Sent", when: "20 Oct", body: "", blocks: [] },
        { id: "c2", title: "Your interview day: what to expect", aud: "int", status: "Scheduled", when: "2026-11-02T08:00", body: "", blocks: [] },
        { id: "c3", title: "Diploma Programme: next steps for applicants", aud: "dp", status: "Draft", when: "",
          body: "Thank you for applying to the Diploma Programme at Alder Bay.\n\nOver the next few weeks we will meet every applicant, talk through subject choices and answer your questions about the two years ahead.\n\nIf a document is still missing from your application, please upload it before your interview so we can give it our full attention.",
          blocks: [{ t: "dates", items: ["Mon 2 Nov: interviews begin", "Fri 20 Nov: subject choice evening", "Fri 4 Dec: decisions shared with families"] }, { t: "button", label: "View my application" }] },
      ],
      device: "desktop",
    };
  }
  const draft = () => state.comms.list.find((c) => c.id === state.comms.sel);
  function previewHTML(c) {
    const a = AUD.find((x) => x[0] === c.aud);
    const paras = (c.body || "").split(/\n{2,}/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    const blocks = c.blocks.map((b) => b.t === "dates" ? `<div class="ee-pv-dates"><b>Key dates</b><ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : b.t === "button" ? `<span class="ee-pv-btn">${esc(b.label)}</span>` : `<hr>`).join("");
    return `<div class="ee-pv-banner" aria-hidden="true"><svg viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice"><rect width="600" height="120" fill="#2CB8EE"/><circle cx="520" cy="30" r="40" fill="#FFD27A" opacity=".9"/><path d="M0 90 Q150 50 300 85 T600 70V120H0z" fill="#5B5BD6" opacity=".85"/><path d="M0 105 Q200 80 380 100 T600 95V120H0z" fill="#22A3D6"/></svg></div>
      <p class="ee-pv-school">${SCHOOL} · Notice board</p><h5>${esc(c.title || "Untitled notice")}</h5>
      <p class="ee-pv-hi">${a[3]},</p>${paras || '<p class="ee-pv-empty">Start writing in the editor.</p>'}${blocks}
      <p class="ee-pv-sign">The Admissions team<br>${SCHOOL}</p>`;
  }
  function vComms() {
    const c = draft(), editable = c.status !== "Sent", r = reach(c.aud);
    const statusPill = (s) => `<span class="ee-pill t-${s === "Sent" ? "green" : s === "Scheduled" ? "violet" : "slate"}">${s}</span>`;
    const whenLabel = (x) => x.status === "Sent" ? `Sent ${x.when}` : x.when ? (TIMES.find((t) => t[0] === x.when) || [0, x.when])[1] : "Not scheduled";
    return `<h3 class="ee-h" tabindex="-1">Notice board <span>Demo: messages are never sent</span></h3>
    <div class="ee-comms">
      <section class="ee-card ee-ann"><header><h4>Notices</h4></header><ul>${state.comms.list.map((x) => `<li><button type="button" class="${x.id === c.id ? "on" : ""}" data-ee-notice="${x.id}" aria-pressed="${x.id === c.id}"><b>${esc(x.title || "Untitled notice")}</b><small>${AUD.find((a) => a[0] === x.aud)[1]} · ${whenLabel(x)}</small>${statusPill(x.status)}</button></li>`).join("")}</ul>
        <button type="button" class="ee-btn ghost sm" data-ee-newnotice>New notice</button></section>
      <section class="ee-card ee-editor">
        ${editable ? `<header><h4>Edit notice</h4>${statusPill(c.status)}</header>
        <label class="ee-field block"><span>Title</span><input id="ee-c-title" data-ee-c="title" value="${esc(c.title)}" maxlength="90"></label>
        <fieldset class="ee-aud"><legend>Audience</legend>${AUD.map(([k, l]) => `<label><input type="radio" name="ee-aud" value="${k}" data-ee-c="aud" ${k === c.aud ? "checked" : ""}><span>${l}<small>${reach(k).students} students</small></span></label>`).join("")}</fieldset>
        <label class="ee-field block"><span>Message</span><textarea id="ee-c-body" data-ee-c="body" rows="7">${esc(c.body)}</textarea></label>
        <div class="ee-blocks"><span class="ee-k">Blocks</span>${c.blocks.map((b, n) => `<span class="ee-block">${b.t === "dates" ? "Key dates" : b.t === "button" ? `Button: ${esc(b.label)}` : "Divider"}<button type="button" data-ee-rmblock="${n}" aria-label="Remove block">×</button></span>`).join("")}
          <span class="ee-add">Add:${c.blocks.some((b) => b.t === "dates") ? "" : '<button type="button" data-ee-addblock="dates">Key dates</button>'}${c.blocks.some((b) => b.t === "button") ? "" : '<button type="button" data-ee-addblock="button">Button</button>'}<button type="button" data-ee-addblock="divider">Divider</button></span></div>
        <label class="ee-field block"><span>Delivery</span><select id="ee-c-when" data-ee-c="when">${TIMES.map(([v, l]) => `<option value="${v}"${v === c.when ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <div class="ee-editor-foot"><span data-ee-reach>Would reach ${r.people} guardians of ${r.students} students</span><div><button type="button" class="ee-btn ghost" data-ee-save="draft">Save draft</button><button type="button" class="ee-btn" data-ee-save="schedule" ${c.when ? "" : "disabled"}>Schedule in demo</button></div></div>`
        : `<header><h4>${esc(c.title)}</h4>${statusPill(c.status)}</header><p class="ee-hint">This notice was sent before the demo started, so it can't be edited. Choose the draft to try the editor.</p>`}
      </section>
      <section class="ee-card ee-preview"><header><h4>Family preview</h4><div class="ee-seg" role="group" aria-label="Preview size"><button type="button" data-ee-device="desktop" aria-pressed="${state.comms.device === "desktop"}">Desktop</button><button type="button" data-ee-device="phone" aria-pressed="${state.comms.device === "phone"}">Phone</button></div></header>
        <div class="ee-pv-frame ${state.comms.device}"><div class="ee-pv" data-ee-preview>${previewHTML(c)}</div></div></section>
    </div>`;
  }

  /* ---------- Render ---------- */
  function badges() {
    const m = metrics();
    app.querySelector('[data-ee-badge="applications"]').textContent = m.awaiting;
    app.querySelector('[data-ee-badge="analytics"]').textContent = "";
    app.querySelector('[data-ee-badge="comms"]').textContent = state.comms.list.filter((c) => c.status === "Draft").length || "";
  }
  function render(focusHeading) {
    const active = document.activeElement && app.contains(document.activeElement) ? document.activeElement.id : "";
    app.dataset.view = state.view;
    $("[data-ee-welcome]").hidden = state.view !== "welcome";
    if (state.view === "welcome") { welcome(); return; }
    const navKey = state.view === "profile" ? "applications" : state.view;
    app.querySelectorAll("[data-ee-nav]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.eeNav === navKey));
    $("[data-ee-title]").textContent = headTitle[state.view];
    body.innerHTML = { overview: vOverview, applications: vApplications, profile: vProfile, comms: vComms, portfolios: vPortfolios, analytics: vAnalytics }[state.view]();
    badges();
    if (focusHeading) body.querySelector(".ee-h")?.focus({ preventScroll: true });
    else if (active) document.getElementById(active)?.focus({ preventScroll: true });
  }
  function go(view, extra = {}) {
    Object.assign(state, { view, ...extra });
    setMenu(false);
    render(true);
    const top = app.getBoundingClientRect().top;
    if (top < 0 && !app.classList.contains("is-full")) window.scrollBy({ top: top - 12 });
    if (app.classList.contains("is-full")) app.scrollTop = 0;
  }
  function toast(t) { const el = $("[data-ee-toast]"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600); }
  function setMenu(on) { state.menu = on; app.classList.toggle("menu-open", on); $(".ee-menu").setAttribute("aria-expanded", String(on)); }

  /* ---------- Events ---------- */
  app.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    let el;
    if (t("[data-ee-enter]")) return go("overview");
    if ((el = t("[data-ee-nav]"))) return go(el.dataset.eeNav, el.dataset.eeNav === "profile" ? {} : { tab: "overview" });
    if ((el = t("[data-ee-go]"))) {
      const f = el.dataset.eeFilter ? JSON.parse(el.dataset.eeFilter) : null;
      if (f) { state.f = { stage: "", section: "", officer: "", flag: "", ...f }; state.page = 0; state.q = ""; $("[data-ee-q]").value = ""; }
      return go(el.dataset.eeGo);
    }
    if ((el = t("[data-ee-open]"))) return go("profile", { id: el.dataset.eeOpen, tab: el.dataset.eeOpentab || "overview" });
    if ((el = t("[data-ee-sort]"))) { const k = el.dataset.eeSort; state.sort = [k, state.sort[0] === k ? -state.sort[1] : k === "submitted" ? -1 : 1]; state.page = 0; return render(); }
    if ((el = t("[data-ee-page]"))) { state.page = +el.dataset.eePage; render(true); return; }
    if (t("[data-ee-clear]")) { state.f = { stage: "", section: "", officer: "", flag: "" }; state.q = ""; $("[data-ee-q]").value = ""; state.page = 0; return render(true); }
    if (t("[data-ee-unsel]")) { state.sel.clear(); return render(); }
    if (t("[data-ee-bulk]")) {
      const k = $("#ee-bulk-to").value, n = state.sel.size;
      state.sel.forEach((id) => setStage(byId(id), k)); state.sel.clear();
      render(); toast(`${n} application${n > 1 ? "s" : ""} moved to ${ST[k].label}. Dashboard updated.`); return;
    }
    if ((el = t("[data-ee-set]"))) { setStage(byId(state.id), el.dataset.eeSet); render(); toast(`Moved to ${ST[el.dataset.eeSet].label}. Overview and analytics updated.`); return; }
    if ((el = t("[data-ee-tab]"))) { state.tab = el.dataset.eeTab; render(); app.querySelector(`#ee-tab-${state.tab}`)?.focus(); return; }
    if ((el = t("[data-ee-notice]"))) { state.comms.sel = el.dataset.eeNotice; return render(); }
    if (t("[data-ee-newnotice]")) { const id = "c" + (state.comms.list.length + 1) + Date.now() % 1000; state.comms.list.push({ id, title: "", aud: "all", status: "Draft", when: "", body: "", blocks: [] }); state.comms.sel = id; render(); $("#ee-c-title")?.focus(); return; }
    if ((el = t("[data-ee-addblock]"))) { const k = el.dataset.eeAddblock; draft().blocks.push(k === "dates" ? { t: "dates", items: ["Mon 2 Nov: interviews begin", "Fri 4 Dec: decisions shared"] } : k === "button" ? { t: "button", label: "View my application" } : { t: "divider" }); return render(); }
    if ((el = t("[data-ee-rmblock]"))) { draft().blocks.splice(+el.dataset.eeRmblock, 1); return render(); }
    if ((el = t("[data-ee-device]"))) { state.comms.device = el.dataset.eeDevice; return render(); }
    if ((el = t("[data-ee-save]"))) {
      const c = draft();
      if (el.dataset.eeSave === "schedule" && c.when) { c.status = "Scheduled"; toast("Scheduled in this demo only. Nothing will be sent."); }
      else { c.status = "Draft"; toast("Draft saved in this browser tab."); }
      return render();
    }
    if (t("[data-ee-reset]")) { const v = state.view; reset(); state.view = v === "welcome" ? "welcome" : "overview"; $("[data-ee-q]").value = ""; render(true); toast("Demo data reset."); return; }
    if (t(".ee-menu")) return setMenu(!state.menu);
    if (t("[data-ee-full]")) return full(!app.classList.contains("is-full"));
  });
  app.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.eeF) { state.f[el.dataset.eeF] = el.value; state.page = 0; state.sel.clear(); return render(); }
    if (el.matches("[data-ee-selall]")) { const ids = filtered().slice(state.page * PER, state.page * PER + PER).map((r) => r.id); ids.forEach((id) => (el.checked ? state.sel.add(id) : state.sel.delete(id))); return render(); }
    if (el.dataset.eeSel) { el.checked ? state.sel.add(el.dataset.eeSel) : state.sel.delete(el.dataset.eeSel); return render(); }
    if (el.matches("[data-ee-stagesel]")) { const k = el.value; setStage(byId(state.id), k); render(); toast(`Moved to ${ST[k].label}. Overview and analytics updated.`); return; }
    if (el.dataset.eeC === "aud" || el.dataset.eeC === "when") { draft()[el.dataset.eeC] = el.value; return render(); }
  });
  app.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("[data-ee-q]")) { state.q = el.value; state.page = 0; if (state.view !== "applications") { state.view = "applications"; render(); el.focus(); } else render(); return; }
    if (el.dataset.eeC === "title" || el.dataset.eeC === "body") { draft()[el.dataset.eeC] = el.value; $("[data-ee-preview]").innerHTML = previewHTML(draft()); const li = app.querySelector(`[data-ee-notice="${draft().id}"] b`); if (li) li.textContent = draft().title || "Untitled notice"; }
  });
  app.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-ee-note]")) return;
    e.preventDefault();
    const ta = e.target.querySelector("textarea"), v = ta.value.trim();
    if (!v) { ta.focus(); return; }
    byId(state.id).notes.push({ by: "you", d: TODAY, t: v });
    render(); app.querySelector("#ee-note")?.focus(); toast("Note added in this demo.");
  });
  app.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && app.classList.contains("is-full")) { full(false); return; }
    if (e.key === "Escape" && state.menu) { setMenu(false); $(".ee-menu").focus(); return; }
    const tab = e.target.closest('[role="tab"][data-ee-tab]');
    if (tab) {
      const keys = ["overview", "portfolio", "timeline"], d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d == null && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      const i = keys.indexOf(state.tab);
      state.tab = e.key === "Home" ? keys[0] : e.key === "End" ? keys[2] : keys[(i + d + 3) % 3];
      render(); app.querySelector(`#ee-tab-${state.tab}`).focus();
    }
  });
  function full(on) {
    app.classList.toggle("is-full", on);
    document.documentElement.classList.toggle("ee-lock", on);
    const b = $("[data-ee-full]");
    b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Exit full screen" : "Full screen"); b.innerHTML = ico(on ? "shrink" : "expand");
    b.focus();
  }
  document.querySelectorAll("[data-ee-launch]").forEach((a) => a.addEventListener("click", () => setTimeout(() => (state.view === "welcome" ? app.querySelector("[data-ee-enter]") : body.querySelector(".ee-h"))?.focus({ preventScroll: true }), 450)));

  reset();
  render();
})();
