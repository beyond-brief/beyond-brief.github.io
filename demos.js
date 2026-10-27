// Interactive concept demos. All data is synthetic and pre-written; nothing calls a live service.
(() => {
  const meter = (rows) => `<div class="meter">${rows.map(([k, v, a]) => `<div><span>${k}</span><span class="t"><i class="${a ? "a" : ""}" data-w="${v}"></i></span><b>${v}%</b></div>`).join("")}</div>`;
  const animateMeters = (root) => requestAnimationFrame(() => root.querySelectorAll("[data-w]").forEach((i) => { i.style.width = i.dataset.w + "%"; }));

  /* ------------------------------------------------------------------ */
  /* 1. Campaign Intelligence Platform — 12 stages, 3 scenarios          */
  /* ------------------------------------------------------------------ */
  const STAGES = ["Research", "Segments", "Opportunity", "Ideas", "Offer", "Journey", "Copy", "Creative", "Review", "Activation", "Reporting", "Optimise"];
  const INTROS = ["What do we know before we start?", "Who could this campaign be for?", "Where is the business opportunity?", "What's the big idea?", "What exactly are we offering?", "How will it reach people?", "What do we say?", "What does the creative need?", "Who signs it off?", "What gets handed to the channels?", "What happened?", "What should we try next?"];
  const UC = {
    fintech: {
      label: "Fintech", campaign: "New-account activation (sample)",
      research: [["Market signal", "+18%", "Search interest in “mobile-only banking” (illustrative)"], ["Competitor gap", "2 of 5", "rivals guide new customers through first use"], ["Last campaign", "Push beat email", "for time-sensitive prompts"]],
      voice: [["Didn't know where to start", 64, true], ["Worried about fees", 47], ["App felt complicated", 31]],
      segments: { fresh: ["Opened in last 30 days, card unused", 4200, "Needs a clear first step", "In-app, push"], salary: ["Salary deposits, no savings", 6800, "Has money moving, no reason to stay", "Email, in-app"], lapsed: ["Inactive 60+ days", 3100, "Needs a reason to come back", "Email, SMS"] },
      opps: [["Card activation in the first 14 days", "Early use predicts long-term activity", "fresh"], ["First savings goal", "Salary customers without a second product", "salary"], ["Return to the app", "Win back before the account goes dormant", "lapsed"]],
      ideas: [["Ready when you are", "Your card is ready when you are.", "Lower the effort: one tap, one minute."], ["First win", "Your first payment, sorted.", "Celebrate the first use, not the sign-up."], ["Money, clearly", "See every cost before you pay it.", "Lead with transparency on fees."]],
      offers: [["Guided activation", "In-app checklist: activate, set PIN, add to wallet. No incentive."], ["First-use reward", "Illustrative reward on the first three card payments. Terms need compliance review."], ["Human help", "Offer a short call to customers who stall."]],
      rules: "Account ≤ 30 days · card issued, not activated · marketing consent · not in collections",
      journeys: { fresh: [["Day 0", "In-app banner: activate in one tap"], ["Day 2", "Push: set your PIN"], ["Day 5", "Email: add to your wallet"], ["Day 10", "Offer a call if still inactive"]], salary: [["Payday", "In-app: start a savings goal"], ["+3 days", "Email: how round-ups work"], ["+14 days", "Progress nudge"], ["+30 days", "Goal check-in"]], lapsed: [["Day 0", "Email: what's new in the app"], ["Day 4", "SMS: one-tap login link"], ["Day 10", "Offer help from the service team"], ["Day 20", "Last reminder, then stop"]] },
      bodies: { fresh: "Activate your card in the app in under a minute.", salary: "Set a goal and let round-ups do the saving.", lapsed: "Log in to see your balance and what's changed." },
      results: { fresh: [3.4, 4.6, 2.1], salary: [2.8, 3.1, 3.6], lapsed: [1.9, 2.2, 2.6] },
      next: ["Test the reminder on day 1 instead of day 2", "Try the human-help offer only for customers who opened the card screen", "Measure 90-day activity, not just activation"],
      reviewers: ["Product owner", "Compliance", "Brand"],
    },
    retail: {
      label: "Retail", campaign: "Second-order programme (sample)",
      research: [["Market signal", "+9%", "Year-on-year growth in repeat-purchase loyalty schemes (illustrative)"], ["Competitor gap", "3 of 4", "rivals rely on blanket discounts"], ["Last campaign", "How-to content", "beat discount emails on repeat orders"]],
      voice: [["Want product help, not promos", 58, true], ["Forget about points", 44], ["Delivery costs put me off", 39]],
      segments: { first: ["One order, 30–60 days ago", 21400, "Needs a reason to come back", "Email, app"], regular: ["3+ orders a year", 8100, "Values recognition", "App, email"], lapsing: ["No order in 120 days", 5900, "Drifting to competitors", "Email, SMS"] },
      opps: [["Second order within 60 days", "The biggest drop in the customer lifecycle", "first"], ["Tier upgrade for regulars", "Regulars near the next loyalty tier", "regular"], ["Win back lapsing customers", "Before points expire", "lapsing"]],
      ideas: [["Get more from it", "Get more from what you bought.", "Help first: care tips and pairings."], ["Points that matter", "Your points are worth more than you think.", "Make the balance tangible."], ["Picked for you", "Three things that go with your last order.", "Relevant recommendations, no discount."]],
      offers: [["Care guide + pairings", "Content-led, no incentive."], ["Double points on order two", "Time-limited, within 30 days."], ["Free delivery on the next order", "For customers who abandoned at delivery cost."]],
      rules: "1 order · delivered · 30–60 days since · email consent · not returned",
      journeys: { first: [["Delivered", "How-to content for the product"], ["Day 7", "Pairings that go with it"], ["Day 21", "Points reminder"], ["Day 45", "Free-delivery nudge"]], regular: [["Day 0", "You're close to Gold"], ["Day 7", "Early access to new range"], ["Day 14", "Tier reached: thank-you"], ["Day 30", "Member event invite"]], lapsing: [["Day 0", "We kept your points"], ["Day 5", "What's new since your last visit"], ["Day 12", "Points expire soon"], ["Day 20", "Last reminder, then stop"]] },
      bodies: { first: "Tips to get more from your last order, plus three things that go with it.", regular: "You're 120 points from Gold and early access.", lapsing: "Your 640 points are still waiting." },
      results: { first: [4.1, 3.3, 2.7], regular: [3.0, 3.9, 2.4], lapsing: [2.2, 2.9, 2.0] },
      next: ["Test product-specific care content against generic tips", "Hold out 10% of first-time buyers as a control", "Try the free-delivery offer only for basket abandoners"],
      reviewers: ["CRM lead", "Merchandising", "Brand"],
    },
    education: {
      label: "Education", campaign: "Autumn enrolment (sample)",
      research: [["Market signal", "+12%", "Open-day enquiries vs last year (illustrative)"], ["Competitor gap", "4 of 6", "schools reply to enquiries after 3+ days"], ["Last campaign", "Personal invites", "beat newsletters for open-day sign-ups"]],
      voice: [["Want to talk to a teacher", 61, true], ["Unclear fees and dates", 49], ["Too many forms", 36]],
      segments: { enquired: ["Enquired, no application", 410, "Needs a reason to apply now", "Email, SMS"], applied: ["Applied, documents missing", 120, "Needs a nudge and help", "Email, phone"], offered: ["Offer made, not accepted", 64, "Needs reassurance", "Email, phone"] },
      opps: [["Enquiry to application", "Most families stop after the first contact", "enquired"], ["Complete documents", "Applications stall waiting for paperwork", "applied"], ["Accept the offer", "Offers expire without a decision", "offered"]],
      ideas: [["Meet the teachers", "Meet the people who'll teach your child.", "Make it personal: names and faces."], ["Clear next step", "Your application in three simple steps.", "Remove uncertainty about the process."], ["A day in the life", "See what a Tuesday looks like here.", "Show, don't list."]],
      offers: [["Open-day invite", "Personal invitation with a teacher's name."], ["Application help", "A 15-minute call with admissions."], ["Taster session", "A morning visit for offer holders."]],
      rules: "Enquiry ≤ 90 days · no application · guardian consent · correct year group",
      journeys: { enquired: [["Day 0", "Thank-you with open-day dates"], ["Day 3", "Teacher introduction"], ["Day 10", "Application guide"], ["Day 20", "Call offer from admissions"]], applied: [["Day 0", "What's still missing"], ["Day 3", "Upload help"], ["Day 7", "Phone call"], ["Day 14", "Final reminder"]], offered: [["Day 0", "Offer letter + next steps"], ["Day 5", "Taster session invite"], ["Day 10", "Q&A with head of year"], ["Day 14", "Deadline reminder"]] },
      bodies: { enquired: "Come and meet our teachers at the next open day.", applied: "You're two documents away from a complete application.", offered: "Spend a morning with us before you decide." },
      results: { enquired: [3.8, 3.2, 3.5], applied: [2.4, 4.4, 2.9], offered: [3.1, 2.8, 4.2] },
      next: ["Test a teacher-signed email against the school-branded version", "Send document reminders by SMS for families who prefer it", "Track enrolment, not just applications"],
      reviewers: ["Admissions lead", "Safeguarding", "Head of marketing"],
    },
  };
  function campaign(root) {
    const fresh = (uc) => ({ uc, stage: 0, seg: Object.keys(UC[uc].segments)[0], opp: 0, idea: 0, offer: 0, tone: "direct", approvals: Object.fromEntries(UC[uc].reviewers.map((r, i) => [r, i === 2])), seen: new Set([0]) });
    let st = fresh("fintech");
    const D = () => UC[st.uc];
    const seg = () => D().segments[st.seg];
    const ctx = () => `<div class="cp-ctx"><span class="pill">${seg()[0]}</span><span class="pill">Idea: ${D().ideas[st.idea][0]}</span><span class="pill pe">Synthetic data</span></div>`;
    const headline = () => st.tone === "warm" ? D().ideas[st.idea][1].replace(/\.$/, "") + ", with us." : D().ideas[st.idea][1];
    const grid = (n, items) => `<div class="grid-${n}">${items.join("")}</div>`;
    const panels = [
      () => `${grid(3, D().research.map(([h, b, p]) => `<div class="box"><h4>${h}</h4><p class="big">${b}</p><p class="small muted">${p}</p></div>`))}<div class="box"><h4>Customer voice · interview themes</h4>${meter(D().voice)}</div>`,
      () => `<p class="muted">Pick the audience to prioritise. Every later stage adapts.</p>${grid(3, Object.entries(D().segments).map(([k, [n, size, need, ch]]) => `<button class="choice" data-seg="${k}" aria-pressed="${st.seg === k}"><strong>${n}</strong><span class="muted">${need}</span><span class="small"><b>${size.toLocaleString("en")}</b> customers · ${ch}</span></button>`))}`,
      () => `<p class="muted">Lifecycle moments where a campaign could change behaviour.</p>${grid(3, D().opps.map(([h, p, k], i) => `<button class="choice" data-opp="${i}" data-oseg="${k}" aria-pressed="${st.opp === i}"><strong>${h}</strong><span class="muted">${p}</span></button>`))}`,
      () => `<p class="muted">Three directions, checked against the research and the opportunity.</p>${grid(3, D().ideas.map(([n, line, idea], i) => `<button class="choice" data-idea="${i}" aria-pressed="${st.idea === i}"><span class="small muted">Direction ${"ABC"[i]}</span><strong>${n}</strong><span>“${line}”</span><span class="muted">${idea}</span></button>`))}`,
      () => `${grid(3, D().offers.map(([n, p], i) => `<button class="choice" data-offer="${i}" aria-pressed="${st.offer === i}"><strong>${n}</strong><span class="muted">${p}</span></button>`))}<div class="box"><h4>Eligibility rules</h4><p>${D().rules}</p>${st.uc === "fintech" && st.offer === 1 ? `<span class="state wait">Incentive terms need compliance review before launch</span>` : `<span class="state ok">Rules complete</span>`}</div>`,
      () => `<div class="box"><h4>Journey · ${seg()[0]}</h4><div class="timeline">${D().journeys[st.seg].map(([b, t]) => `<div><b>${b}</b>${t}</div>`).join("")}</div></div>${grid(2, [`<div class="box"><h4>Exit rule</h4><p>Stop as soon as the customer converts or opts out.</p></div>`, `<div class="box"><h4>Frequency cap</h4><p>No more than two messages in any 7-day window.</p></div>`])}`,
      () => `<div class="grid-2"><div class="box" style="grid-row:span 2"><h4>Draft · ${seg()[3].split(",")[0]}</h4><p class="h3" style="margin-bottom:12px">${headline()}</p><p class="muted">${D().bodies[st.seg]}</p><div class="seg mt-m" role="group" aria-label="Tone"><button data-tone="direct" aria-pressed="${st.tone === "direct"}">Clear &amp; direct</button><button data-tone="warm" aria-pressed="${st.tone === "warm"}">Warm</button></div></div><div class="box"><h4>Brand checks</h4>${meter([["Tone of voice", st.tone === "warm" ? 91 : 95], ["Reading ease", 92], ["Approved claims", 100, true]])}</div><div class="box"><h4>Notes for reviewers</h4><p class="small">No pricing or performance claims. Offer: ${D().offers[st.offer][0]}.</p></div></div>`,
      () => `<p class="muted">The visual brief and the formats it produces, using the approved headline.</p><div class="formats"><div class="fmt sq"><span class="shape"></span><small>Feed · 1:1</small><span class="hl">${headline()}</span><span class="cta-chip">Find out more</span></div><div class="fmt st"><span class="shape"></span><small>Story · 9:16</small><span class="hl">${headline()}</span><span class="cta-chip">Tap to view</span></div><div class="fmt ls"><span class="shape"></span><small>Banner · 16:9</small><span class="hl" style="font-size:20px;max-width:70%">${headline()}</span><span class="cta-chip">Find out more</span></div></div><div class="box"><h4>Visual brief</h4><p class="small">Real people, everyday settings, product in use. Avoid stock-style handshakes. Accessible contrast on every format.</p></div>`,
      () => { const all = Object.values(st.approvals).every(Boolean); return `<div class="grid-2"><div class="reviewers">${Object.entries(st.approvals).map(([k, v]) => `<div class="reviewer"><span class="av">${k.split(" ").map((w) => w[0]).join("")}</span><div><b>${k}</b></div>${v ? `<span class="state ok">Approved</span>` : `<button class="mini-btn" data-approve="${k}">Approve</button>`}</div>`).join("")}</div><div class="box"><h4>Status</h4><p class="big">${all ? "Ready to activate" : "In review"}</p><p class="muted small mt-s">Version 3 · every comment is saved with the version.</p>${all ? `<span class="state ok">All approvals recorded</span>` : `<span class="state wait">Waiting on ${Object.entries(st.approvals).filter(([, v]) => !v).map(([k]) => k).join(" and ")}</span>`}</div></div>`; },
      () => `<div class="box"><h4>Activation specification</h4><table class="tbl"><tbody><tr><td>Audience</td><td>${seg()[0]} · ${seg()[1].toLocaleString("en")}</td></tr><tr><td>Channels</td><td>${seg()[3]}</td></tr><tr><td>Schedule</td><td>${D().journeys[st.seg].map(([b]) => b).join(" → ")}</td></tr><tr><td>Suppression</td><td>Opted out · complaints in last 30 days · already converted</td></tr><tr><td>Control group</td><td>10% held out</td></tr></tbody></table></div><p class="disclose" style="margin-top:0"><span><b>Not built in this prototype.</b> Exporting this specification to a CRM, email or ad platform. In a real project the spec feeds the client's own tools.</span></p>`,
      () => { const r = D().results[st.seg], best = r.indexOf(Math.max(...r)); return `${grid(3, D().ideas.map(([n], i) => `<div class="box"${i === best ? ' style="border-color:var(--accent)"' : ""}><h4>Direction ${"ABC"[i]}</h4><p class="big">${r[i]}%</p><p class="small muted">conversion · synthetic</p></div>`))}<div class="box"><h4>Test vs control · ${seg()[0]}</h4>${meter(r.map((v, i) => [D().ideas[i][0], Math.round(v * 18), i === best]))}</div>`; },
      () => `<div class="box dark"><h4>Recommended next experiments</h4><ol class="flow" style="margin-top:6px">${D().next.map((t, i) => `<li class="on"><span class="ic">${i + 1}</span><div>${t}</div><span class="dur">next</span></li>`).join("")}</ol></div><p class="small muted">Results feed the next brief: the winning direction and audience become the starting point, not a blank page.</p>`,
    ];
    const render = () => {
      st.seen.add(st.stage);
      root.innerHTML = `<div class="cp-rail" role="tablist" aria-label="Campaign stages"><span class="lbl">12 connected stages</span>${STAGES.map((s, i) => `<button class="cp-tab${st.seen.has(i) && i !== st.stage ? " done" : ""}" role="tab" id="cp-tab-${i}" aria-controls="cp-panel" aria-selected="${i === st.stage}" tabindex="${i === st.stage ? 0 : -1}" data-stage="${i}"><span class="k">${String(i + 1).padStart(2, "0")}</span>${s}<span class="st"></span></button>`).join("")}</div>
        <div class="cp-main"><div class="cp-scn"><span class="small muted">Scenario</span><div class="seg" role="group" aria-label="Scenario">${Object.entries(UC).map(([k, v]) => `<button data-uc="${k}" aria-pressed="${st.uc === k}">${v.label}</button>`).join("")}</div><span class="small muted">${D().campaign}</span></div>
        <div class="cp-top"><div><h3>${STAGES[st.stage]}</h3><p>${INTROS[st.stage]}</p></div>${ctx()}</div>
        <div class="cp-panel" id="cp-panel" role="tabpanel" aria-labelledby="cp-tab-${st.stage}">${panels[st.stage]()}</div>
        <div class="cp-foot"><div class="progress" aria-hidden="true">${STAGES.map((_, i) => `<i class="${i < st.stage ? "on" : i === st.stage ? "cur" : ""}"></i>`).join("")}</div>
        <div class="actions"><button class="mini-btn ghost" data-step="-1" ${st.stage === 0 ? "disabled" : ""}>Back</button><button class="mini-btn" data-step="1" ${st.stage === 11 ? "disabled" : ""}>Next: ${STAGES[st.stage + 1] || "Done"} →</button></div></div></div>`;
      animateMeters(root);
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.uc) { const stage = st.stage; st = fresh(d.uc); st.stage = stage; }
      else if (d.stage) st.stage = +d.stage;
      else if (d.step) st.stage = Math.min(11, Math.max(0, st.stage + +d.step));
      else if (d.seg) st.seg = d.seg;
      else if (d.opp) { st.opp = +d.opp; st.seg = d.oseg; }
      else if (d.idea) st.idea = +d.idea;
      else if (d.offer) st.offer = +d.offer;
      else if (d.tone) st.tone = d.tone;
      else if (d.approve) st.approvals[d.approve] = true;
      else return;
      render();
      if (d.stage !== undefined) root.querySelector(`#cp-tab-${st.stage}`).focus();
    });
    root.addEventListener("keydown", (e) => {
      if (!e.target.matches(".cp-tab") || !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      st.stage = (st.stage + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : 11)) % 12;
      render(); root.querySelector(`#cp-tab-${st.stage}`).focus();
    });
    render();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Business Automation Studio                                       */
  /* ------------------------------------------------------------------ */
  const AS = {
    requests: [
      { id: "invoice", from: "Dana K. · Billing", subj: "My invoice looks wrong this month", cat: "Billing", conf: 94, team: "Billing team", reply: "Thanks for flagging this, Dana. We're checking the invoice against your plan now and will confirm the correct amount by tomorrow." },
      { id: "access", from: "Marco P. · Portal", subj: "Can't log in since the update", cat: "Account access", conf: 89, team: "Support team", reply: "Sorry about the trouble, Marco. We've sent a secure reset link to your registered email. Reply here if it doesn't arrive in 10 minutes." },
      { id: "change", from: "Aisha R. · Contract", subj: "Need to change my delivery address", cat: "Account change", conf: 91, team: "Operations", reply: "Thanks, Aisha. We've prepared the address change for you; once you confirm the new address below it will take effect from your next delivery." },
    ],
    manual: [["Read and understand the request", 3], ["Search for the customer record", 4], ["Decide category and priority", 2], ["Write a reply from scratch", 6], ["Forward to the right team", 3]],
    auto: [["Read, classify and prioritise", 0.2, "Category and confidence shown"], ["Pull the customer record", 0.1, "From the CRM, read-only"], ["Draft a reply from approved sources", 0.3, "Help-centre articles and policies only"], ["Person reviews and approves", 2, "Edit, approve or reject", true], ["Route with full context", 0.1, "Ticket created, history attached"]],
  };
  function automation(root) {
    const st = { req: 0, mode: "manual", step: -1, timer: null };
    const total = (list) => list.reduce((a, [, m]) => a + m, 0);
    function render() {
      const r = AS.requests[st.req];
      const list = st.mode === "manual" ? AS.manual : AS.auto;
      root.innerHTML = `<div class="as-top"><div><b>Service inbox</b> <span class="muted small">· 3 waiting (sample)</span></div>
        <div class="seg" role="group" aria-label="Way of working"><button data-mode="manual" aria-pressed="${st.mode === "manual"}">By hand</button><button data-mode="auto" aria-pressed="${st.mode === "auto"}">Automated + approved</button></div></div>
        <div class="as-body"><div class="as-inbox"><h4>Incoming</h4>${AS.requests.map((q, i) => `<button class="msg" data-req="${i}" aria-pressed="${st.req === i}"><b>${q.subj}</b><small>${q.from}</small></button>`).join("")}</div>
        <div class="as-flow"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><h3 class="h4">${st.mode === "manual" ? "How it's handled today" : "How it could be handled"}</h3><p class="muted small" style="margin:4px 0 0">“${r.subj}”</p></div><button class="mini-btn" data-run>${st.step >= 0 ? "Run again" : "Run this request"} →</button></div>
        <ol class="flow">${list.map(([t, m, note, human], i) => `<li class="${i <= st.step ? "on" : ""} ${i === st.step ? "now" : ""} ${human ? "human" : ""}"><span class="ic">${human ? "You" : i + 1}</span><div>${t}${note ? `<em>${note}</em>` : ""}</div><span class="dur">${m < 1 ? "seconds" : m + " min"}</span></li>`).join("")}</ol>
        ${st.mode === "auto" && st.step >= 2 ? `<div class="box"><h4>Proposed · ${r.cat} · ${r.conf}% confidence</h4><p>${r.reply}</p><p class="small muted" style="margin:0">→ ${r.team}</p></div>` : ""}
        <div class="as-total"><div class="box"><h4>Time per request</h4><p class="big">~${Math.round(total(list))} min</p><p class="small muted">illustrative estimate</p></div>
        <div class="box"><h4>At 120 requests / week</h4><p class="big">~${Math.round(total(list) * 120 / 60)} h</p><p class="small muted">of team time, illustrative</p></div>
        <div class="box"><h4>Human in the loop</h4><p class="big">${st.mode === "manual" ? "Every step" : "Every reply"}</p><p class="small muted">${st.mode === "manual" ? "all work is manual" : "nothing sends without approval"}</p></div></div></div></div>`;
    }
    function run() {
      clearInterval(st.timer); st.step = 0; render();
      const max = (st.mode === "manual" ? AS.manual : AS.auto).length - 1;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { st.step = max; render(); return; }
      st.timer = setInterval(() => { st.step++; render(); if (st.step >= max) clearInterval(st.timer); }, st.mode === "manual" ? 900 : 450);
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.mode) { st.mode = b.dataset.mode; clearInterval(st.timer); st.step = -1; render(); }
      else if (b.dataset.req) { st.req = +b.dataset.req; clearInterval(st.timer); st.step = -1; render(); }
      else if (b.hasAttribute("data-run")) run();
    });
    render();
  }

  /* ------------------------------------------------------------------ */
  /* 3. Growth & Journey Intelligence                                    */
  /* ------------------------------------------------------------------ */
  const GJ = {
    journeys: {
      onboarding: { name: "Onboarding", steps: ["Signed up", "Profile done", "First use", "Second use", "Week 2 active", "Upgraded"] },
      renewal: { name: "Renewal", steps: ["Renewal due", "Reminder opened", "Plan reviewed", "Options compared", "Renewed", "Added product"] },
    },
    data: {
      onboarding: { all: [100, 82, 64, 51, 38, 19], young: [100, 88, 74, 49, 33, 14], family: [100, 79, 58, 52, 44, 24], smb: [100, 76, 60, 55, 41, 23] },
      renewal: { all: [100, 71, 55, 46, 40, 12], young: [100, 64, 41, 33, 29, 7], family: [100, 78, 64, 57, 51, 16], smb: [100, 70, 59, 48, 41, 14] },
    },
    segs: { all: "All customers", young: "Young professionals", family: "Families", smb: "Small businesses" },
    actions: {
      onboarding: { young: "Send a 30-second ‘second use’ tip on day 2, inside the app, not by email.", family: "Invite a second household member during setup; shared accounts stay longer.", smb: "Offer a 15-minute setup call to anyone who stalls before first use.", all: "Add a guided second session on day 2 for everyone who completes first use." },
      renewal: { young: "Move the renewal reminder into the app and show the plan in one screen.", family: "Lead with a household cost summary before the renewal date.", smb: "Assign an adviser to accounts that compare options but don't renew.", all: "Send a plain-language plan summary 14 days before renewal." },
    },
  };
  function growth(root) {
    const st = { j: "onboarding", seg: "all" };
    function render() {
      const vals = GJ.data[st.j][st.seg];
      const steps = GJ.journeys[st.j].steps;
      let worst = 1, worstDrop = 0;
      for (let i = 1; i < vals.length; i++) { const d = vals[i - 1] - vals[i]; if (d > worstDrop) { worstDrop = d; worst = i; } }
      const overall = GJ.data[st.j].all;
      root.innerHTML = `<div class="gj-top"><div class="seg" role="group" aria-label="Journey">${Object.entries(GJ.journeys).map(([k, v]) => `<button data-j="${k}" aria-pressed="${st.j === k}">${v.name}</button>`).join("")}</div>
        <div class="seg" role="group" aria-label="Segment">${Object.entries(GJ.segs).map(([k, v]) => `<button data-seg="${k}" aria-pressed="${st.seg === k}">${v}</button>`).join("")}</div></div>
        <div class="gj-body"><div class="journey" role="img" aria-label="${steps.map((s, i) => `${s} ${vals[i]}%`).join(", ")}">${steps.map((s, i) => `<div class="col${i === worst ? " drop" : ""}"><span class="val">${vals[i]}%</span><div class="barwrap"><div class="bar" style="height:${Math.max(vals[i], 4) * 1.7}px"></div></div><span class="nm">${s}</span></div>`).join("")}</div>
        <div class="gj-insights"><div class="box dark"><h4>The moment that matters</h4><p class="h4" style="margin-bottom:8px">${worstDrop} points are lost between “${steps[worst - 1]}” and “${steps[worst]}”.</p><p style="opacity:.8;margin:0">${st.seg === "all" ? "This is the biggest single drop across all customers." : `For ${GJ.segs[st.seg].toLowerCase()}, that compares with ${overall[worst - 1] - overall[worst]} points for all customers.`}</p></div>
        <div class="box"><h4>Suggested next action</h4><p>${GJ.actions[st.j][st.seg]}</p><span class="pill pe">Test against a 10% control group</span></div></div>
        <div class="grid-3"><div class="box"><h4>End-to-end</h4><p class="big">${vals[vals.length - 1]}%</p><p class="small muted">reach the final step</p></div><div class="box"><h4>Versus all customers</h4><p class="big">${vals[vals.length - 1] - overall[overall.length - 1] >= 0 ? "+" : ""}${vals[vals.length - 1] - overall[overall.length - 1]} pts</p><p class="small muted">at the final step</p></div><div class="box"><h4>Customers in view</h4><p class="big">${{ all: "10,000", young: "3,800", family: "3,400", smb: "2,800" }[st.seg]}</p><p class="small muted">synthetic cohort</p></div></div></div>`;
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.j) st.j = b.dataset.j; else if (b.dataset.seg) st.seg = b.dataset.seg; else return;
      render();
    });
    render();
  }

  /* ------------------------------------------------------------------ */
  /* 4. Smart Business Operations                                        */
  /* ------------------------------------------------------------------ */
  function ops(root) {
    const st = {
      view: "crm",
      tasks: { todo: [["Send proposal to Lumen Studio", "AM"], ["Confirm Thursday crew", "JS"], ["Chase overdue invoice #2041", "AM"]], doing: [["Prepare Elm Street site visit", "RK"], ["Update price list", "JS"]], done: [["Onboard Brightside Florist", "RK"]] },
      exceptions: [{ t: "Double booking on Thursday 14:00", d: "Two jobs assigned to Crew B.", fix: "Move Northgate to 16:00" }, { t: "Invoice #2041 is 12 days overdue", d: "Harbour Café, £1,240 (sample).", fix: "Send a friendly reminder" }],
      resolved: [],
    };
    const crm = [["Harbour Café", "Hospitality", "Quote sent", "s2", "£4.2k", "Today"], ["Northgate Dental", "Healthcare", "New lead", "s1", "£2.8k", "Tue"], ["Elm Street Gym", "Fitness", "Site visit", "s3", "£6.5k", "Wed"], ["Lumen Studio", "Creative", "Proposal", "s3", "£3.1k", "Thu"], ["Brightside Florist", "Retail", "Won", "s4", "£1.9k", "Fri"]];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const slots = { "09:00": ["Crew A · Brightside", "", "Crew A · Elm St", "Crew B · Lumen", ""], "11:00": ["", "Call · Northgate", "", "", "Crew A · Harbour"], "14:00": ["Crew B · Harbour", "", "Crew B · Elm St", "CONFLICT", ""], "16:00": ["", "Crew A · Lumen", "", "", "Team review"] };
    const views = {
      crm: () => `<table class="tbl"><thead><tr><th>Customer</th><th class="hide-s">Sector</th><th>Stage</th><th>Value</th><th class="hide-s">Next step</th></tr></thead><tbody>${crm.map(([n, s, stg, c, v, d]) => `<tr><td><b>${n}</b></td><td class="hide-s">${s}</td><td><span class="stg ${c}">${stg}</span></td><td>${v}</td><td class="hide-s">${d}</td></tr>`).join("")}</tbody></table>`,
      schedule: () => {
        const fixed = st.resolved.includes(0);
        return `<div class="week"><span></span>${days.map((d) => `<span class="h">${d}</span>`).join("")}${Object.entries(slots).map(([t, row]) => `<span class="t">${t}</span>${row.map((c, i) => {
          if (c === "CONFLICT") return fixed ? `<span class="c b2">Crew B · Elm St</span>` : `<span class="c b1 conf">Crew B · Elm St<br><b>+ Northgate</b></span>`;
          if (fixed && t === "16:00" && i === 3) return `<span class="c b3">Crew B · Northgate</span>`;
          return `<span class="c ${c ? ["b1", "b2", "b3"][(i + t.length) % 3] : ""}">${c}</span>`;
        }).join("")}`).join("")}</div>`;
      },
      tasks: () => `<div class="kanban">${[["todo", "To do"], ["doing", "In progress"], ["done", "Done"]].map(([k, l]) => `<div class="kcol"><h5>${l}<span>${st.tasks[k].length}</span></h5>${st.tasks[k].map(([t, who], i) => `<div class="kcard"><span>${t}</span><div class="row"><span class="who">${who}</span>${k !== "done" ? `<button data-move="${k}:${i}">${k === "todo" ? "Start" : "Done"} →</button>` : `<span class="state ok">Done</span>`}</div></div>`).join("")}</div>`).join("")}</div>`,
    };
    function render() {
      const open = st.exceptions.filter((_, i) => !st.resolved.includes(i));
      root.innerHTML = `<div class="op-top"><div class="seg" role="group" aria-label="View">${[["crm", "Customers"], ["schedule", "Schedule"], ["tasks", "Tasks"]].map(([k, l]) => `<button data-view="${k}" aria-pressed="${st.view === k}">${l}</button>`).join("")}</div><span class="small muted">Week 43 · sample business</span></div>
        <div class="op-kpis"><div class="box"><h4>Pipeline</h4><p class="big">£18.5k</p><span class="delta up">▲ 6% vs last week</span></div><div class="box"><h4>Jobs booked</h4><p class="big">14</p><span class="delta up">▲ 2</span></div><div class="box"><h4>Tasks open</h4><p class="big">${st.tasks.todo.length + st.tasks.doing.length}</p><span class="delta ${st.tasks.done.length > 2 ? "up" : "dn"}">${st.tasks.done.length} done</span></div><div class="box"><h4>Exceptions</h4><p class="big">${open.length}</p><span class="delta ${open.length ? "dn" : "up"}">${open.length ? "needs attention" : "all clear"}</span></div></div>
        <div class="op-body"><div class="op-view">${views[st.view]()}</div>
        <aside class="exc" aria-label="Exceptions"><h4 class="kicker">Needs attention</h4>${open.length ? st.exceptions.map((x, i) => st.resolved.includes(i) ? "" : `<div class="box"><b>${x.t}</b><p class="small muted mt-s" style="margin-bottom:10px">${x.d}</p><button class="mini-btn" data-fix="${i}">${x.fix}</button></div>`).join("") : `<div class="box calm"><b>Nothing urgent.</b><p class="small muted" style="margin:6px 0 0">Every exception this week has been handled.</p></div>`}
        ${st.resolved.length ? `<p class="small muted">${st.resolved.length} resolved this session · logged to the activity feed</p>` : ""}</aside></div>`;
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.view) st.view = b.dataset.view;
      else if (b.dataset.move) { const [k, i] = b.dataset.move.split(":"); const [card] = st.tasks[k].splice(+i, 1); st.tasks[k === "todo" ? "doing" : "done"].push(card); }
      else if (b.dataset.fix) { st.resolved.push(+b.dataset.fix); if (+b.dataset.fix === 0) st.view = "schedule"; }
      else return;
      render();
    });
    render();
  }

  /* ------------------------------------------------------------------ */
  /* 5. Digital Banking Growth Workspace (fintech industry page)         */
  /*    Configurable concept · synthetic data · no bank systems          */
  /* ------------------------------------------------------------------ */
  const BW = {
    steps: [["Segment", "Choose who to plan for"], ["Opportunity", "Find the lifecycle moment"], ["Proposition", "Decide what to offer"], ["Journey", "Map what the customer sees"], ["Communication", "Write the messages"], ["Review", "Collect approvals"], ["Metrics", "Read the results"]],
    segments: {
      fresh: { name: "New account, card not activated", size: 4200, signal: "Opened in the last 30 days", channels: ["In-app", "Push", "Email"],
        funnel: [["Opened the app after sign-up", 71], ["Viewed the card screen", 38], ["Activated the card", 9]],
        moment: ["Card activation in the first 14 days", "Customers who use their card in the first two weeks are far more likely to keep using the account. This group hasn't started yet."],
        journey: [
          { when: "Day 0", ch: "In-app", cond: "On next app open", kind: "banner", title: "Your card is ready", body: "Activate it in one tap.", action: "Activate card" },
          { when: "Day 2", ch: "Push", cond: "If not activated", kind: "push", title: "Sample Bank", body: "Set your card PIN in 30 seconds.", action: "Open app" },
          { when: "Day 5", ch: "Email", cond: "If not activated", kind: "email", title: "Add your card to your phone wallet", body: "Pay in shops without taking the card out.", action: "Show me how" },
          { when: "Day 10", ch: "In-app", cond: "If still not activated", kind: "call", title: "Need a hand?", body: "Book a 10-minute call with our team.", action: "Pick a time" },
        ],
        copy: { Push: ["Your card is ready when you are.", "Set your PIN in 30 seconds."], Email: ["Your new card, ready in a minute", "Activate it in the app, then add it to your phone wallet."], "In-app": ["Your card is ready", "Activate it in one tap."] },
        results: { test: 31, control: 19, optout: 0.4 },
      },
      salary: { name: "Salary deposits, no savings product", size: 6800, signal: "3+ monthly salary deposits", channels: ["In-app", "Email"],
        funnel: [["Receives salary into the account", 100], ["Opened savings screen", 22], ["Has a savings product", 0]],
        moment: ["First savings goal after payday", "Money is arriving every month but leaves just as quickly. Payday is the moment people are most open to setting money aside."],
        journey: [
          { when: "Payday", ch: "In-app", cond: "Salary received", kind: "banner", title: "Payday is a good day to start", body: "Set a savings goal in two steps.", action: "Create a goal" },
          { when: "+3 days", ch: "Email", cond: "No goal yet", kind: "email", title: "How round-ups work", body: "Spare change from card payments goes into your goal.", action: "Turn on round-ups" },
          { when: "+14 days", ch: "In-app", cond: "Goal created", kind: "banner", title: "You're on your way", body: "€42 saved towards your goal.", action: "See progress" },
          { when: "+30 days", ch: "Email", cond: "Goal created", kind: "email", title: "Your first month of saving", body: "A short summary of what you've put aside.", action: "View summary" },
        ],
        copy: { Email: ["Payday is a good day to start", "Set a goal in two steps and let round-ups do the rest."], "In-app": ["Start a savings goal", "Two steps. Change it any time."] },
        results: { test: 14, control: 6, optout: 0.3 },
      },
      lapsed: { name: "App users inactive 60+ days", size: 3100, signal: "No login since August", channels: ["Email", "Push"],
        funnel: [["Active in the first 3 months", 100], ["Active in the last 60 days", 0], ["Opened last email", 18]],
        moment: ["Return before the account goes dormant", "These customers once used the app regularly. A clear reason to log in, not a promotion, is most likely to bring them back."],
        journey: [
          { when: "Day 0", ch: "Email", cond: "Inactive 60 days", kind: "email", title: "Here's what's new in the app", body: "Instant spending alerts and a clearer statement view.", action: "Take a look" },
          { when: "Day 4", ch: "Push", cond: "Email not opened", kind: "push", title: "Sample Bank", body: "Your monthly statement is ready to view.", action: "Open app" },
          { when: "Day 10", ch: "Email", cond: "Still inactive", kind: "call", title: "We're here to help", body: "Questions about your account? Book a call.", action: "Book a call" },
          { when: "Day 20", ch: "—", cond: "No response", kind: "stop", title: "Journey ends", body: "No further messages. Customer returns to normal communication.", action: "" },
        ],
        copy: { Email: ["Here's what's new in the app", "Instant alerts and a clearer statement view."], Push: ["Your statement is ready", "Tap to view it in the app."] },
        results: { test: 12, control: 7, optout: 0.6 },
      },
    },
    offers: [["Guided activation", "In-app checklist: activate, set PIN, add to wallet. No incentive.", false], ["First-use reward", "An illustrative reward on the first three card payments.", true], ["Human help", "Offer a short call to customers who stall.", false]],
    reviewers: [["Product owner", "PO"], ["Compliance", "CO"], ["Brand", "BR"]],
  };
  function bank(root) {
    const st = { step: 0, seg: "fresh", offer: 0, ch: null, approvals: { "Product owner": true, Compliance: false, Brand: false }, done: new Set() };
    const S = () => BW.segments[st.seg];
    const phone = (t) => {
      if (t.kind === "push") return `<div class="ph ph-lock"><span class="ph-time">09:41</span><div class="ph-push"><b>${t.title}</b><span>${t.body}</span></div></div>`;
      if (t.kind === "email") return `<div class="ph ph-mail"><div class="ph-from">Sample Bank · Inbox</div><b>${t.title}</b><span>${t.body}</span><i class="ph-btn">${t.action}</i></div>`;
      if (t.kind === "stop") return `<div class="ph ph-stop"><b>${t.title}</b><span>${t.body}</span></div>`;
      return `<div class="ph ph-app"><div class="ph-bar"><i></i><i></i></div><div class="ph-card ${t.kind === "call" ? "alt" : ""}"><b>${t.title}</b><span>${t.body}</span><i class="ph-btn">${t.action}</i></div><div class="ph-rows"><i></i><i></i><i></i></div></div>`;
    };
    const panels = [
      () => `<div class="bw-cards">${Object.entries(BW.segments).map(([k, s]) => `<button class="choice" data-seg="${k}" aria-pressed="${st.seg === k}"><strong>${s.name}</strong><span class="muted">${s.signal}</span><span class="bw-size">${s.size.toLocaleString("en")} <small>customers</small></span><span class="bw-chs">${s.channels.map((c) => `<i>${c}</i>`).join("")}</span></button>`).join("")}</div>`,
      () => `<div class="grid-2"><div class="box"><h4>Lifecycle moment</h4><p class="h4">${S().moment[0]}</p><p class="muted" style="margin:6px 0 0">${S().moment[1]}</p></div><div class="box"><h4>What the data shows · ${S().name}</h4>${meter(S().funnel.map(([k, v], i) => [k, v, i === S().funnel.length - 1]))}</div></div>`,
      () => `<div class="bw-cards">${BW.offers.map(([n, p, flag], i) => `<button class="choice" data-offer="${i}" aria-pressed="${st.offer === i}"><strong>${n}</strong><span class="muted">${p}</span>${flag ? `<span class="state wait">Needs compliance review</span>` : `<span class="state ok">Standard terms</span>`}</button>`).join("")}</div>
        <div class="box bw-rules"><h4>Eligibility rules</h4><ul>${["Segment: " + S().name, "Marketing consent given", "Not in collections or arrears", "No complaint in the last 30 days"].map((r) => `<li>${r}</li>`).join("")}</ul></div>`,
      () => `<div class="bw-journey">${S().journey.map((t, i) => `<div class="bw-touch${t.kind === "stop" ? " end" : ""}"><div class="bw-when"><b>${t.when}</b><span>${t.ch}</span></div>${phone(t)}<p class="bw-cond"><i>${i === 0 ? "Trigger" : "Condition"}</i>${t.cond}</p></div>`).join("")}</div>
        <div class="bw-rulesrow"><span><b>Exit:</b> stop when the customer completes the goal or opts out</span><span><b>Frequency cap:</b> max 2 messages in 7 days</span><span><b>Quiet hours:</b> no push 21:00–08:00</span></div>`,
      () => { const chs = Object.keys(S().copy); const ch = st.ch && chs.includes(st.ch) ? st.ch : chs[0]; const [h, b] = S().copy[ch]; return `<div class="seg" role="group" aria-label="Channel">${chs.map((c) => `<button data-ch="${c}" aria-pressed="${c === ch}">${c}</button>`).join("")}</div>
        <div class="grid-2"><div class="box"><h4>${ch} · draft</h4><p class="h4">${h}</p><p class="muted" style="margin:6px 0 0">${b}</p><p class="small muted" style="margin:12px 0 0">${(h + " " + b).length} characters · ${ch === "Push" ? "limit 110" : ch === "Email" ? "subject ≤ 50" : "banner ≤ 60"}</p></div>
        <div class="box"><h4>Checks</h4>${meter([["Tone of voice", 94], ["Plain language", 91], ["Approved claims only", 100, true]])}</div></div>`; },
      () => { const all = Object.values(st.approvals).every(Boolean); return `<div class="grid-2"><div class="reviewers">${BW.reviewers.map(([w, a]) => `<div class="reviewer"><span class="av">${a}</span><div><b>${w}</b><div class="small muted">${{ "Product owner": "Proposition and eligibility", Compliance: "Offer terms and wording", Brand: "Tone and visuals" }[w]}</div></div>${st.approvals[w] ? `<span class="state ok">Approved</span>` : `<button class="mini-btn" data-approve="${w}">Approve</button>`}</div>`).join("")}</div>
        <div class="box"><h4>Status</h4><p class="big">${all ? "Ready to activate" : "In review"}</p><p class="small muted mt-s">${BW.offers[st.offer][2] && !st.approvals.Compliance ? "Compliance must approve the reward terms." : "Every comment is stored with the version."}</p></div></div>`; },
      () => { const r = S().results; return `<div class="cx-kpis">${[["Goal reached · test", r.test + "%"], ["Goal reached · control", r.control + "%"], ["Opt-outs", r.optout + "%"]].map(([k, v]) => `<div class="box"><h4>${k}</h4><p class="big">${v}</p><p class="small muted">synthetic</p></div>`).join("")}</div>
        <div class="box"><h4>Test vs control</h4>${meter([["Test group", Math.round(r.test * 2.5), true], ["Control group", Math.round(r.control * 2.5)]])}<p class="small muted" style="margin:10px 0 0">Illustrative numbers showing how a result would be read. Not real outcomes.</p></div>`; },
    ];
    const render = () => {
      const all = Object.values(st.approvals).every(Boolean);
      root.innerHTML = `<ol class="bw-steps" role="tablist" aria-label="Workflow steps" style="--p:${st.step / 6}">${BW.steps.map(([n, d], i) => `<li><button role="tab" aria-selected="${i === st.step}" data-step="${i}" class="${i < st.step || st.done.has(i) ? "done" : ""}" tabindex="${i === st.step ? 0 : -1}"><span class="bw-dot">${i < st.step ? "✓" : i + 1}</span><span class="bw-lbl"><b>${n}</b><small>${d}</small></span></button></li>`).join("")}</ol>
        <div class="bw-body"><div class="bw-main" role="tabpanel" aria-label="${BW.steps[st.step][0]}"><div class="bw-h"><span class="bw-k">Step ${st.step + 1} of 7</span><h3>${BW.steps[st.step][1]}</h3></div>${panels[st.step]()}
          <div class="cp-foot"><button class="mini-btn ghost" data-go="-1" ${st.step === 0 ? "disabled" : ""}>Back</button><button class="mini-btn" data-go="1" ${st.step === 6 ? "disabled" : ""}>${st.step === 6 ? "Done" : `Next: ${BW.steps[st.step + 1][0]} →`}</button></div></div>
        <aside class="bw-side" aria-label="Current configuration"><h4>Configuration</h4><dl><dt>Segment</dt><dd>${S().name}</dd><dt>Audience</dt><dd>${S().size.toLocaleString("en")} customers</dd><dt>Opportunity</dt><dd>${S().moment[0]}</dd><dt>Proposition</dt><dd>${BW.offers[st.offer][0]}</dd><dt>Channels</dt><dd>${S().channels.join(", ")}</dd><dt>Approvals</dt><dd>${Object.values(st.approvals).filter(Boolean).length} of 3${all ? " · ready" : ""}</dd></dl>
          <p class="bw-note">Workspace settings such as segments, rules, channels and approvers are configurable per organisation. This concept uses synthetic data and connects to no bank systems.</p></aside></div>`;
      animateMeters(root);
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.step) st.step = +d.step;
      else if (d.go) { st.done.add(st.step); st.step = Math.min(6, Math.max(0, st.step + +d.go)); }
      else if (d.seg) { st.seg = d.seg; st.ch = null; }
      else if (d.offer) st.offer = +d.offer;
      else if (d.ch) st.ch = d.ch;
      else if (d.approve) st.approvals[d.approve] = true;
      else return;
      render();
      if (d.step !== undefined) root.querySelector(`[data-step="${st.step}"]`).focus();
    });
    root.addEventListener("keydown", (e) => {
      if (!e.target.matches(".bw-steps button")) return;
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!dir) return;
      e.preventDefault(); st.step = (st.step + dir + 7) % 7; render(); root.querySelector(`[data-step="${st.step}"]`).focus();
    });
    render();
  }

  const map = { campaign, automation, growth, ops, bank };
  document.querySelectorAll("[data-demo]").forEach((el) => map[el.dataset.demo](el.querySelector("[data-root]")));
})();
