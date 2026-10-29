// CX Journey Lab: three synthetic personas, each with a current and an improved journey.
// Every persona, finding and redesign is illustrative, not research. Runs in the browser only;
// calls nothing, stores nothing and sends nothing.
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Data ---------- */
  const CH = {
    search: ["Search", "digital"], social: ["Social post", "digital"], web: ["Website", "digital"], app: ["App", "digital"], bot: ["Chatbot", "digital"],
    email: ["Email", "message"], sms: ["SMS", "message"], push: ["Notification", "message"],
    phone: ["Phone call", "people"], agent: ["Live chat", "people"], branch: ["Branch visit", "people"], video: ["Video call", "people"], engineer: ["Engineer visit", "people"],
    card: ["Card", "physical"],
  };
  const GLYPH = {
    digital: '<rect x="2" y="3" width="12" height="8.5" rx="1.5"/><path d="M5.5 14h5"/>',
    message: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5 8 9l5.5-4.5"/>',
    people: '<circle cx="8" cy="5.5" r="2.6"/><path d="M3 14c.6-2.8 2.6-4.2 5-4.2s4.4 1.4 5 4.2"/>',
    physical: '<rect x="1.5" y="4" width="13" height="8.5" rx="1.5"/><path d="M1.5 7h13"/>',
  };
  const FEEL = { "-2": "Frustrated", "-1": "Uneasy", 0: "Neutral", 1: "Positive", 2: "Confident" };

  const PERSONAS = [
    {
      id: "nigar", name: "Nigar A.", initials: "NA", age: 34, role: "Project manager",
      sector: "Fintech & Digital Banking", sectorHref: "/industries/fintech-digital-banking",
      label: "The between-meetings switcher", journey: "Opening a digital account for a trip abroad",
      goal: "Open an account and pay abroad within a week.",
      context: "Does everything on a phone, in five-minute gaps between meetings.",
      needs: ["Clear fees before committing", "Progress that survives interruptions", "Help without a branch visit"],
      quote: "If it can't be done on my phone, it isn't happening this week.",
      stages: [
        { name: "Compare",
          cur: { doing: "Compares three travel cards on a phone.", tp: ["social", "web"], e: 1, back: "Fees maintained on three separate pages.", pain: "Fees are spread across three pages, so the real cost is unclear.", sev: "med", opp: "Put every fee for the card in one place.", research: "Competitor fee review and a first-click test" },
          imp: { doing: "Sees the card's full cost in one summary.", tp: ["social", "web"], e: 2, back: "One fee table feeds the site and the app.", fix: "A single fee summary on the card page, in plain numbers.", by: ["Content design", "Information architecture"], test: "First-click test on the new card page", measure: "Time to find the full cost" } },
        { name: "Apply",
          cur: { doing: "Starts the application in the app.", tp: ["app"], e: 0, back: "Form fields copied from the paper branch form.", pain: "Asked for the address twice, and the form times out after ten minutes.", sev: "high", opp: "Reuse what's already known and save progress.", research: "Form analytics on where applicants stop" },
          imp: { doing: "Finishes the form in two short sittings.", tp: ["app", "push"], e: 1, back: "Details prefilled from the ID scan.", fix: "Prefill from the ID scan, save every step and remind the customer to finish.", by: ["Interface design"], test: "Moderated usability test on a prototype", measure: "Applications completed within a day" } },
        { name: "Verify identity",
          cur: { doing: "Takes a selfie to confirm identity.", tp: ["app", "email", "branch"], e: -2, back: "Failed checks wait in a manual queue.", pain: "A failed selfie check ends in an error code and a request to visit a branch.", sev: "high", opp: "Explain the failure and offer a remote fallback.", research: "Interviews with applicants who failed the check" },
          imp: { doing: "Retakes the selfie with guidance, or joins a video call.", tp: ["app", "video"], e: 1, back: "Failed checks routed to a video-verification team.", fix: "Plain-language guidance, a retry, and a video call instead of a branch visit.", by: ["Service design", "Interface design"], test: "Service blueprint walkthrough with the operations team", measure: "Customers verified on the same day" } },
        { name: "First payment",
          cur: { doing: "Pays abroad with the card for the first time.", tp: ["card", "sms"], e: -1, back: "Cards issued with foreign use switched off.", pain: "The card is declined abroad. Nothing said travel use had to be switched on.", sev: "high", opp: "Ask about travel plans at activation.", research: "Review of declined-payment reasons" },
          imp: { doing: "Pays abroad; travel use was set at activation.", tp: ["card", "push"], e: 2, back: "Travel preference captured during activation.", fix: "One activation question about travel plans, confirmed by a notification.", by: ["Interface design", "Service design"], test: "Prototype test of the activation flow", measure: "First payments that go through" } },
        { name: "Get help",
          cur: { doing: "Contacts support about the declined card.", tp: ["bot", "phone"], e: -1, back: "Chat and phone teams use separate systems.", pain: "The chatbot loops, then a phone queue where the story starts again.", sev: "med", opp: "Hand over to a person with the context attached.", research: "Listening to support calls and reading chat logs" },
          imp: { doing: "Chat reaches a person who already has the context.", tp: ["bot", "agent"], e: 1, back: "Chat history passed to the agent automatically.", fix: "Chat hands over to a person with the conversation attached.", by: ["Service design"], test: "Contact-reason analysis before and after", measure: "Issues resolved in the first conversation", residual: "Card disputes still need a phone call." } },
      ],
    },
    {
      id: "rauf", name: "Rauf K.", initials: "RK", age: 58, role: "Retired engineer",
      sector: "Telecom", sectorHref: "/industries/telecom-subscriptions",
      label: "The long-standing customer", journey: "Moving home internet to a new flat",
      goal: "Move the home internet to a new flat without a gap.",
      context: "Prefers to call. Uses the app only to pay bills.",
      needs: ["One person who owns the request", "A confirmed date", "No surprises on the bill"],
      quote: "Twelve years with them. Moving shouldn't feel like starting over.",
      stages: [
        { name: "Plan the move",
          cur: { doing: "Searches the website for how to move the service.", tp: ["search", "web"], e: 0, back: "Moves handled as a cancellation plus a new order.", pain: "Moving home isn't an option online, only 'new connection'.", sev: "med", opp: "Make moving home a journey of its own.", research: "Search-term analysis on the support site" },
          imp: { doing: "Finds 'Moving home' in the menu and the app.", tp: ["web", "app"], e: 1, back: "A moving-home order type in the CRM.", fix: "A dedicated moving-home path on the site and in the app.", by: ["Information architecture"], test: "Tree test of the support navigation", measure: "Moves started online" } },
        { name: "Request",
          cur: { doing: "Calls the contact centre to arrange the move.", tp: ["phone"], e: -1, back: "Sales, technical and billing each own a part.", pain: "Transferred three times, and every team asks for the account number.", sev: "high", opp: "One team owns the move from start to finish.", research: "Call shadowing in the contact centre" },
          imp: { doing: "Arranges the move in one call, or online.", tp: ["phone", "web"], e: 1, back: "One moving-home team, with account details passed on.", fix: "One owner for every move, with the customer's details passed on.", by: ["Service design"], test: "Blueprint review with the three teams", measure: "Transfers per moving-home call" } },
        { name: "Wait",
          cur: { doing: "Waits to hear an installation date.", tp: ["sms"], e: -2, back: "Engineer slots booked only after approval.", pain: "Nine days without a date, and no way to check progress.", sev: "high", opp: "Confirm the date during the request.", research: "Order-tracking data and customer interviews" },
          imp: { doing: "Gets a date in the call and follows progress by text.", tp: ["sms", "web"], e: 1, back: "Engineer calendar visible to the moving-home team.", fix: "Date confirmed during the request, and a progress page linked by SMS.", by: ["Service design", "Interface design"], test: "Prototype test of the progress page", measure: "'Where is my order?' calls" } },
        { name: "Install",
          cur: { doing: "Waits at home for the engineer.", tp: ["engineer", "sms"], e: 0, back: "Engineer routes planned in two daily halves.", pain: "The arrival window is 8:00 to 18:00.", sev: "med", opp: "Narrower windows and an on-the-way message.", research: "Ride-alongs with installation engineers" },
          imp: { doing: "Gets a two-hour window and an on-the-way text.", tp: ["engineer", "sms"], e: 1, back: "Routes planned in two-hour slots.", fix: "Two-hour windows and a message when the engineer sets off.", by: ["Service design"], test: "Pilot in one region", measure: "Missed appointments", residual: "Someone still needs to be home for the visit." } },
        { name: "First bill",
          cur: { doing: "Checks the first bill at the new address.", tp: ["email", "app"], e: -1, back: "Old service closed by a separate manual request.", pain: "Billed at both addresses for a month.", sev: "high", opp: "Close the old service automatically.", research: "Analysis of billing complaints after a move" },
          imp: { doing: "Gets one bill, for the new address.", tp: ["email", "app"], e: 2, back: "Old service closes on the installation date.", fix: "The old service closes on installation day, and the bill explains it.", by: ["Service design", "Content design"], test: "Bill comprehension test", measure: "Billing complaints after a move" } },
      ],
    },
    {
      id: "aysel", name: "Aysel R.", initials: "AR", age: 27, role: "Retail store supervisor",
      sector: "Education & EdTech", sectorHref: "/industries/education-edtech",
      label: "The working learner", journey: "First month on an online data skills course",
      goal: "Finish a data skills course alongside full-time work.",
      context: "Studies after work, mostly on a phone, in sessions of fifteen minutes or less.",
      needs: ["Short lessons", "Visible progress", "A plan that survives a busy week"],
      quote: "I don't need motivation. I need to know where I left off.",
      stages: [
        { name: "Discover",
          cur: { doing: "Finds the course through a colleague's post.", tp: ["social", "web"], e: 1, back: "Each faculty writes its own course pages.", pain: "The course page doesn't say how long lessons take.", sev: "med", opp: "Show the weekly time needed up front.", research: "Interviews with prospective learners" },
          imp: { doing: "Sees the weekly time and lesson length up front.", tp: ["social", "web"], e: 2, back: "One course-page template with time estimates.", fix: "Time per week and lesson length on every course page.", by: ["Content design"], test: "Five-second test on the course page", measure: "Visits that become enrolments" } },
        { name: "Enrol",
          cur: { doing: "Signs up on a phone during a lunch break.", tp: ["web", "email"], e: 0, back: "Profile data required up front for reporting.", pain: "Seven form fields before the first lesson.", sev: "high", opp: "Start learning first, finish the profile later.", research: "Sign-up funnel analysis" },
          imp: { doing: "Starts lesson one two minutes after signing up.", tp: ["web", "app"], e: 1, back: "Profile completed gradually over the first week.", fix: "Email-only sign-up, with profile questions spread across the first week.", by: ["Interface design"], test: "Usability test of the sign-up flow", measure: "Sign-ups who start a lesson the same day" } },
        { name: "First lesson",
          cur: { doing: "Completes lesson one on the bus home.", tp: ["app"], e: 1, back: "Progress saved only at the end of a lesson.", pain: "Progress resets if the app closes mid-lesson.", sev: "high", opp: "Save progress automatically.", research: "Diary study of mobile learners" },
          imp: { doing: "Picks up mid-lesson after closing the app.", tp: ["app"], e: 2, back: "Progress saved every minute, on every device.", fix: "Automatic saving, and 'continue where you left off' on every device.", by: ["Interface design", "Learning design"], test: "Diary study across the first week", measure: "Lessons finished after an interruption" } },
        { name: "Weeks 2–3",
          cur: { doing: "Misses two sessions after a busy week.", tp: ["email"], e: -2, back: "The same reminders go to everyone, on a fixed schedule.", pain: "Can't see how far behind they are, or how to catch up.", sev: "high", opp: "A weekly goal and a short catch-up path.", research: "Interviews with learners who paused" },
          imp: { doing: "Follows a short catch-up plan after a missed week.", tp: ["push", "app"], e: 1, back: "Reminders adapt to each learner's pace.", fix: "A weekly goal, a catch-up path and reminders that follow the learner's pace.", by: ["Learning design", "Service design"], test: "A/B test of reminder formats", measure: "Learners still active in week four", residual: "Learners who stop for a month still drift away." } },
        { name: "Complete or leave",
          cur: { doing: "Returns once, then decides whether to continue.", tp: ["app", "email"], e: -1, back: "Certificates issued only at the very end.", pain: "Nothing marks how much has already been achieved.", sev: "med", opp: "Milestones and a visible finish line.", research: "Exit survey of learners who left" },
          imp: { doing: "Sees two milestones reached and the finish line ahead.", tp: ["app", "email"], e: 2, back: "A milestone issued at the end of each module.", fix: "Module milestones and a progress line to the certificate.", by: ["Learning design", "Interface design"], test: "Concept test of the progress view", measure: "Course completion" } },
      ],
    },
  ];

  /* ---------- Journey Lab ---------- */
  const lab = document.querySelector("[data-journey-lab]");
  if (lab) {
    const N = 5;
    let p = PERSONAS[0], mode = "cur", si = 0;
    const worst = (per) => per.stages.reduce((b, s, i) => (s.cur.e < per.stages[b].cur.e ? i : b), 0);
    si = worst(p);

    const glyph = (k) => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">${GLYPH[CH[k][1]]}</svg>`;
    const chip = (k, cls = "") => `<li class="jl-tp ${cls}">${glyph(k)}<span>${CH[k][0]}</span>${cls === "add" ? '<em>New</em>' : ""}${cls === "gone" ? '<em class="jl-sr">removed</em>' : ""}</li>`;
    const tps = (s) => {
      if (mode === "cur") return s.cur.tp.map((k) => chip(k)).join("");
      const kept = s.imp.tp.map((k) => chip(k, s.cur.tp.includes(k) ? "" : "add"));
      const gone = s.cur.tp.filter((k) => !s.imp.tp.includes(k)).map((k) => chip(k, "gone"));
      return kept.concat(gone).join("");
    };
    const y = (e) => 22 + (2 - e) * 29; // feeling −2…+2 → 138…22 of a 160-unit lane
    const pts = (key) => p.stages.map((s, i) => [(i + 0.5) * 200, y(s[key].e)]);
    const path = (ps) => ps.map(([x, yy], i) => (i ? "L" : "M") + x + " " + yy).join(" ");
    const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1);
    const stat = (key) => {
      const ss = p.stages.map((s) => s[key]);
      return {
        pain: key === "cur" ? ss.filter((s) => s.pain).length : ss.filter((s) => s.residual).length,
        low: ss.filter((s) => s.e <= -1).length,
        avg: ss.reduce((a, s) => a + s.e, 0) / ss.length,
      };
    };

    lab.innerHTML = `
      <div class="jl-bar">
        <div class="jl-people" role="group" aria-label="Choose a persona">${PERSONAS.map((x) => `<button type="button" class="jl-who" data-jl-persona="${x.id}" aria-pressed="false"><span class="jl-mono" aria-hidden="true">${x.initials}</span><span class="jl-who-t"><b>${x.name}</b><small>${x.sector}</small></span></button>`).join("")}</div>
        <div class="jl-mode" role="group" aria-label="Journey version"><button type="button" data-jl-mode="cur" aria-pressed="true">Current experience</button><button type="button" data-jl-mode="imp" aria-pressed="false">Improved experience</button></div>
      </div>
      <div class="jl-main">
        <aside class="jl-persona" data-jl-profile aria-live="polite"></aside>
        <div class="jl-map">
          <div class="jl-map-head"><div><span class="jl-k">Journey</span><h3 data-jl-title></h3></div>
            <ul class="jl-legend" data-jl-legend></ul></div>
          <div class="jl-grid">
            <span class="jl-lane">Stage</span>
            <div class="jl-stages" role="tablist" aria-label="Journey stages">${Array.from({ length: N }, (_, i) => `<button type="button" role="tab" id="jl-t${i}" aria-controls="jl-panel" data-jl-stage="${i}"><span class="n">0${i + 1}</span><span class="nm"></span></button>`).join("")}</div>
            <span class="jl-lane">Doing</span><div class="jl-row" data-row="doing"></div>
            <span class="jl-lane">Touchpoints</span><div class="jl-row" data-row="tp"></div>
            <span class="jl-lane">Feeling<small>+2 … −2</small></span>
            <div class="jl-feel">
              <svg viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden="true">
                <line class="jl-zero" x1="0" y1="${y(0)}" x2="1000" y2="${y(0)}"/>
                <path class="jl-gain" d=""/><path class="jl-line cur" d=""/><path class="jl-line imp" d=""/>
              </svg>
              ${Array.from({ length: N }, (_, i) => `<span class="jl-dot" data-i="${i}" style="left:${(i + 0.5) * 20}%"><i></i><b></b></span>`).join("")}
            </div>
            <span class="jl-lane jl-vis">Backstage<small>Line of visibility</small></span><div class="jl-row jl-back" data-row="back"></div>
          </div>
          <div class="jl-detail" role="tabpanel" id="jl-panel" tabindex="0"></div>
        </div>
      </div>
      <div class="jl-foot"><dl class="jl-metrics" data-jl-metrics></dl><p class="jl-note">Synthetic personas and journeys, built to show the method. Counts come from this illustrative journey, not from research.</p></div>
      <p class="jl-sr" aria-live="polite" data-jl-live></p>`;

    const $ = (s) => lab.querySelector(s);
    const tabs = [...lab.querySelectorAll('[role="tab"]')];
    const dots = [...lab.querySelectorAll(".jl-dot")];

    function profile() {
      $("[data-jl-profile]").innerHTML = `
        <div class="jl-p-top"><span class="jl-mono lg" aria-hidden="true">${p.initials}</span><div><span class="jl-badge">Illustrative persona</span><h3>${esc(p.name)}</h3><p>${p.age} · ${esc(p.role)}</p></div></div>
        <p class="jl-p-label">${esc(p.label)}</p>
        <blockquote>“${esc(p.quote)}”</blockquote>
        <dl><div><dt>Goal</dt><dd>${esc(p.goal)}</dd></div><div><dt>Context</dt><dd>${esc(p.context)}</dd></div>
        <div class="jl-p-needs"><dt>Needs</dt><dd><ul>${p.needs.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></dd></div></dl>
        <a class="jl-sector" href="${p.sectorHref}">${esc(p.sector)}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
    }

    function detail() {
      const s = p.stages[si], c = s.cur, m = s.imp, k = s[mode];
      const head = `<div class="jl-d-head"><span class="jl-k">Stage 0${si + 1} of ${N}</span><h4>${esc(s.name)}</h4><span class="jl-feel-tag f${k.e}">Feeling: ${FEEL[k.e]}</span></div>`;
      const dup = `<div class="jl-dup"><dl><div><dt>Doing</dt><dd>${esc(k.doing)}</dd></div><div><dt>Touchpoints</dt><dd><ul class="jl-tps">${tps(s)}</ul></dd></div><div><dt>Backstage</dt><dd>${esc(k.back)}</dd></div></dl></div>`;
      const body = mode === "cur"
        ? `<div class="jl-block pain"><span class="jl-k">Pain point · ${c.sev === "high" ? "high" : "medium"} impact</span><p>${esc(c.pain)}</p></div>
           <div class="jl-block opp"><span class="jl-k">Opportunity</span><p>${esc(c.opp)}</p></div>
           <div class="jl-block plain"><span class="jl-k">How we'd confirm it</span><p>${esc(c.research)}</p></div>`
        : `<div class="jl-block fix"><span class="jl-k">Redesign</span><p>${esc(m.fix)}</p><ul class="jl-by">${m.by.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
           <div class="jl-block plain"><span class="jl-k">How we'd test it</span><p>${esc(m.test)}</p><span class="jl-k mt">What we'd track</span><p>${esc(m.measure)}</p></div>
           ${m.residual ? `<div class="jl-block open"><span class="jl-k">Still open</span><p>${esc(m.residual)}</p></div>` : `<div class="jl-block plain was"><span class="jl-k">Was</span><p>${esc(c.pain)}</p></div>`}`;
      $("#jl-panel").innerHTML = `${head}<div class="jl-d-body">${dup}${body}</div>`;
      $("#jl-panel").setAttribute("aria-labelledby", "jl-t" + si);
    }

    function render(focus) {
      lab.dataset.mode = mode;
      lab.querySelectorAll("[data-jl-persona]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.jlPersona === p.id)));
      lab.querySelectorAll("[data-jl-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.jlMode === mode)));
      $("[data-jl-title]").textContent = p.journey;
      $("[data-jl-legend]").innerHTML = mode === "cur"
        ? '<li class="lg-cur">Current feeling</li><li class="lg-pain">Pain point</li>'
        : '<li class="lg-ghost">Current</li><li class="lg-imp">Improved</li><li class="lg-gain">Difference</li>';
      tabs.forEach((t, i) => {
        const on = i === si;
        t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
        t.querySelector(".nm").textContent = p.stages[i].name;
      });
      const cell = (i, html) => `<div class="jl-cell${i === si ? " on" : ""}" data-i="${i}">${html}</div>`;
      $('[data-row="doing"]').innerHTML = p.stages.map((s, i) => cell(i, `<p>${esc(s[mode].doing)}</p>`)).join("");
      $('[data-row="tp"]').innerHTML = p.stages.map((s, i) => cell(i, `<ul class="jl-tps">${tps(s)}</ul>`)).join("");
      $('[data-row="back"]').innerHTML = p.stages.map((s, i) => cell(i, `<p>${esc(s[mode].back)}</p>`)).join("");

      const c = pts("cur"), m = pts("imp");
      $(".jl-line.cur").setAttribute("d", path(c));
      $(".jl-line.imp").setAttribute("d", path(m));
      $(".jl-gain").setAttribute("d", path(m) + " " + path(c.slice().reverse()).replace("M", "L") + " Z");
      dots.forEach((d, i) => {
        const s = p.stages[i], k = s[mode];
        d.style.top = (y(k.e) / 160) * 100 + "%";
        d.className = "jl-dot" + (i === si ? " on" : "") + (mode === "cur" ? (s.cur.sev === "high" ? " pain high" : " pain") : (k.residual ? " open" : " fixed"));
        d.querySelector("b").textContent = mode === "cur" ? (s.cur.sev === "high" ? "High pain" : "Pain") : (k.residual ? "Still open" : FEEL[k.e]);
      });

      const a = stat("cur"), b = stat("imp");
      const row = (t, x, z, fmt = (n) => n) => `<div><dt>${t}</dt><dd>${mode === "cur" ? `<b>${fmt(x)}</b>` : `<s>${fmt(x)}</s><span aria-hidden="true">→</span><b>${fmt(z)}</b>`}</dd></div>`;
      $("[data-jl-metrics]").innerHTML = row("Pain points", a.pain, b.pain) + row("Low moments", a.low, b.low) + row("Average feeling", a.avg, b.avg, signed);
      profile();
      detail();
      if (focus) tabs[si].focus();
    }

    const announce = () => {
      const a = stat("cur"), b = stat("imp");
      $("[data-jl-live]").textContent = `${p.name}, ${mode === "cur" ? "current experience" : "improved experience"}. Pain points ${mode === "cur" ? a.pain : `${a.pain} to ${b.pain}`}.`;
    };

    lab.addEventListener("click", (e) => {
      const per = e.target.closest("[data-jl-persona]"), md = e.target.closest("[data-jl-mode]");
      const st = e.target.closest("[data-jl-stage]") || e.target.closest(".jl-cell, .jl-dot");
      if (per) { if (per.dataset.jlPersona === p.id) return; p = PERSONAS.find((x) => x.id === per.dataset.jlPersona); si = worst(p); render(); announce(); }
      else if (md) { if (md.dataset.jlMode === mode) return; mode = md.dataset.jlMode; lab.classList.remove("drawn"); void lab.offsetWidth; lab.classList.add("drawn"); render(); announce(); }
      else if (st) { si = +(st.dataset.jlStage ?? st.dataset.i); render(); }
    });
    $('[role="tablist"]').addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d == null && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      si = e.key === "Home" ? 0 : e.key === "End" ? N - 1 : (si + d + N) % N;
      render(true);
    });
    render();
  }

  /* ---------- Insight to interface: before, wireframe, interface ---------- */
  const fid = document.querySelector("[data-fid-root]");
  if (fid) {
    const phone = fid.querySelector("[data-fidelity]");
    const set = (v) => {
      phone.dataset.fidelity = v;
      fid.querySelectorAll("[data-fid]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fid === v)));
      fid.dataset.state = v;
    };
    fid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-fid]"), n = e.target.closest("[data-note]");
      if (b) set(b.dataset.fid);
      if (n) {
        const on = n.getAttribute("aria-pressed") !== "true";
        fid.querySelectorAll("[data-note]").forEach((x) => x.setAttribute("aria-pressed", "false"));
        n.setAttribute("aria-pressed", String(on));
        phone.dataset.focus = on ? n.dataset.note : "";
      }
    });
    set(phone.dataset.fidelity);
  }
})();
