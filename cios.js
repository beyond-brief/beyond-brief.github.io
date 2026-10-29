// Customer Intelligence OS: campaign walkthrough for three synthetic customers.
// Every decision comes from the Customer 360 rules engine (c360-engine.js), so both demonstrations always agree.
// Runs in the browser only. Calls nothing, stores nothing and sends nothing.
(() => {
  const root = document.querySelector("[data-cios]");
  if (!root || !window.C360) return;
  const E = window.C360;
  const L = E.CHANNEL_LABEL;
  const ds = E.PROFILES.map((p) => E.decide(p));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (n) => Math.round(n * 100);
  const ARR = '<svg class="arr" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const STEPS = [
    { t: "Customer 360", q: "Who is in this audience? One unified profile per customer." },
    { t: "Segments & signals", q: "What are they doing, and which segments do they match?" },
    { t: "Opportunity", q: "Where is there a relevant reason to get in touch?" },
    { t: "Offer", q: "Which offer fits each customer, and why?" },
    { t: "Channel", q: "How can each customer be reached, with permission?" },
    { t: "Prepare & approve", q: "Is the campaign ready, and has a person signed it off?" },
  ];
  const OPP = {
    travel_rewards: ["Customers planning travel", "Travel spend and travel page views are rising, and the card already in their wallet could reward it."],
    everyday_shopping: ["Regular everyday shoppers", "Frequent spend at partner categories that isn't earning extra points yet."],
    membership_activation: ["Registered, never activated", "Customers who joined the rewards programme but haven't started using it."],
    service_reengagement: ["Customers who have gone quiet", "No app or card activity for 45 days or more."],
  };
  const SIG = { travel: "Travel", shopping: "Shopping", savings: "Savings" };
  const CONSENT = { opted_in: ["yes", "Opted in"], opted_out: ["no", "Opted out"], unknown: ["unk", "No record"] };
  let cur = 0, approved = false;
  const seen = new Set([0]);

  const who = (d) => {
    const p = d.profile, ph = E.PORTRAITS[p.id];
    return `<div class="hx-who"><img src="${ph.src}" alt="" width="40" height="40" loading="lazy"><div><b>${esc(p.name)}</b><span>${esc(p.profileId)}</span></div></div>`;
  };
  const outcome = (d) => d.outcome === "suppressed" ? '<span class="hx-st no">Excluded</span>'
    : d.outcome === "no_offer" ? '<span class="hx-st unk">No offer</span>'
    : `<span class="hx-st ok">${L[d.channel]}</span>`;

  const panels = [
    // 1. Customer 360
    () => `<div class="hx-grid">${ds.map((d) => {
      const p = d.profile;
      const consent = E.CHANNELS.map((c) => { const [k, t] = CONSENT[p.consent[c]]; return `<li class="${k}"><span>${L[c]}</span>${t}</li>`; }).join("");
      return `<article class="hx-card">${who(d)}
        <dl class="hx-dl"><div><dt>Lifecycle</dt><dd>${esc(p.lifecycle)} · customer since ${esc(p.since)}</dd></div>
        <div><dt>Products</dt><dd>${p.products.map((x) => esc(x.name)).join(", ")}</dd></div>
        <div><dt>Rewards</dt><dd>${p.membership.status === "registered" ? "Registered, not activated" : "Active member"}</dd></div>
        <div><dt>Last 30 days</dt><dd>${p.activity.cardTxns30d} card payments · ${p.activity.appSessions30d} app sessions</dd></div>
        <div><dt>Prefers</dt><dd>${L[p.preferredChannel]}</dd></div></dl>
        <p class="hx-k">Marketing consent</p><ul class="hx-consent">${consent}</ul></article>`;
    }).join("")}</div>
    <p class="hx-note">Transactions, app activity, CRM fields and consent records joined into one profile per customer (all synthetic). <a href="/work/customer-360">Open a full profile in Customer 360 ${ARR}</a></p>`,

    // 2. Segments & signals
    () => `<div class="hx-grid">${ds.map((d) => `<article class="hx-card">${who(d)}
        <p class="hx-k">Behavioural signals</p>
        <ul class="hx-bars">${d.signals.map((s) => `<li class="${s.strong ? "strong" : ""}"><span>${SIG[s.key] || esc(s.key)}</span><i><b style="width:${pct(s.score)}%"></b></i><em>${pct(s.score)}</em></li>`).join("")}</ul>
        <p class="hx-k">Segments matched</p>
        <ul class="hx-chips">${d.segments.filter((s) => s.match).map((s) => `<li title="${esc(s.rule)}">${esc(s.name)}</li>`).join("")}</ul></article>`).join("")}</div>
    <p class="hx-note">A signal counts as strong from 60/100. Segments are transparent rules over the profile. Hover or focus a segment to see its rule.</p>`,

    // 3. Opportunity
    () => {
      const groups = {};
      ds.forEach((d) => { if (d.offer) (groups[d.offer.id] ||= []).push(d); });
      return `<div class="hx-opps">${Object.entries(groups).map(([id, list], i) => {
        const reach = list.filter((d) => d.channel).length;
        return `<article class="hx-opp${i === 0 ? " is-top" : ""}"><span class="hx-k">Opportunity 0${i + 1}</span><h4>${OPP[id][0]}</h4><p>${OPP[id][1]}</p>
          <div class="hx-opp-meta"><span><b>${list.length}</b> of ${ds.length} customers</span><span><b>${reach}</b> reachable with consent</span><span>Best fit: <b>${esc(list[0].offer.name)}</b></span></div>
          <ul class="hx-people">${list.map((d) => `<li>${who(d)}<span>${esc(d.why.offer[0])}</span></li>`).join("")}</ul></article>`;
      }).join("")}</div>
      <p class="hx-note">In a real audience this would cover thousands of profiles. Three keep every decision visible. Opportunities come from rules over behaviour, not from a predictive model.</p>`;
    },

    // 4. Offer
    () => `<div class="hx-grid">${ds.map((d) => {
      const others = d.ranked.slice(1).map((o) => `${esc(o.name)} (${o.score})`).join(", ");
      const out = d.offers.filter((o) => !o.eligible).map((o) => esc(o.name)).join(", ");
      const sp = d.offer && d.offer.scoreParts;
      return `<article class="hx-card">${who(d)}
        ${d.offer ? `<div class="hx-offer"><span class="hx-k">Recommended offer</span><b>${esc(d.offer.name)}</b><span class="hx-score">Score ${d.offer.score} = priority ${sp.base} + signal ${sp.signal} + recency ${sp.recency}</span></div>` : '<div class="hx-offer"><b>No eligible offer</b></div>'}
        <dl class="hx-dl"><div><dt>Also eligible</dt><dd>${others || "None"}</dd></div><div><dt>Not eligible</dt><dd>${out || "None"}</dd></div></dl></article>`;
    }).join("")}</div>
    <p class="hx-note">Eligibility first, then a transparent score: offer priority, plus signal strength, plus recent activity. The highest-scoring eligible offer is selected.</p>`,

    // 5. Channel
    () => `<div class="hx-grid">${ds.map((d) => `<article class="hx-card${d.outcome === "suppressed" ? " excluded" : ""}">${who(d)}
        <ul class="hx-checks">${(d.channelChecks || []).map((c) => `<li class="${c.allowed ? "yes" : "no"}"><b>${L[c.channel]}${c.preferred ? " · preferred" : ""}</b><span>${c.allowed ? "Permitted" : esc(c.reasons[0])}</span></li>`).join("")}</ul>
        <div class="hx-result"><span class="hx-k">Decision</span>${outcome(d)}<p>${esc(d.why.channel[d.outcome === "suppressed" ? d.why.channel.length - 1 : 0])}</p></div></article>`).join("")}</div>
    <p class="hx-note"><b>Consent comes before preference.</b> If no channel is permitted, the customer is excluded from the send, however strong their interest.</p>`,

    // 6. Prepare & approve
    () => {
      const ready = ds.filter((d) => d.preview);
      const excluded = ds.filter((d) => d.outcome === "suppressed");
      const counts = {};
      ready.forEach((d) => { counts[L[d.channel]] = (counts[L[d.channel]] || 0) + 1; });
      const previews = ready.map((d) => d.preview.channel === "email"
        ? `<figure class="hx-mail"><figcaption>${who(d)}<span class="hx-st ok">Email</span></figcaption><div class="hx-mail-body"><p class="sub"><span>Subject</span>${esc(d.preview.subject)}</p><p>${esc(d.preview.greeting)}</p><h5>${esc(d.preview.headline)}</h5><p>${esc(d.preview.body)}</p><span class="hx-cta">${esc(d.preview.cta)}</span><p class="terms">${esc(d.preview.terms)}</p></div></figure>`
        : `<figure class="hx-sms"><figcaption>${who(d)}<span class="hx-st ok">${L[d.preview.channel]}</span></figcaption><div class="hx-bubble">${esc(d.preview.text)}</div></figure>`).join("");
      const checks = [
        ["Eligibility rules passed for every selected offer", true],
        [`Consent checked on every channel · ${excluded.length} customer excluded`, true],
        ["Frequency caps respected", true],
        ["SMS and push held outside 09:00–21:00 customer time", true],
        ["Brand and compliance review", approved],
      ];
      return `<div class="hx-kpis"><div><small>Audience</small><b>${ds.length}</b></div><div><small>Will receive</small><b>${ready.length}</b></div><div><small>Excluded</small><b>${excluded.length}</b></div><div><small>Channels</small><b>${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")}</b></div></div>
      <div class="hx-approve"><div class="hx-previews">${previews}</div>
      <div class="hx-sign"><p class="hx-k">Approval checklist</p><ul class="hx-list">${checks.map(([t, ok]) => `<li class="${ok ? "yes" : "wait"}">${t}</li>`).join("")}</ul>
        <div class="hx-sign-act" aria-live="polite">${approved
          ? `<p class="hx-done"><b>Approved · ready to schedule.</b> This is a demonstration: nothing is scheduled or sent.</p><button class="mini-btn" type="button" data-hx-reset>Start again</button>`
          : `<button class="mini-btn" type="button" data-hx-approve>Approve campaign</button><p class="hx-small">A person approves before anything goes out.</p>`}</div></div></div>`;
    },
  ];

  root.innerHTML = `<div class="cp-rail" role="tablist" aria-label="Campaign workflow steps"><span class="lbl">Campaign workflow</span>${STEPS.map((s, i) => `<button class="cp-tab" role="tab" id="hx-t${i}" aria-controls="hx-panel" data-hx-i="${i}"><span class="k">0${i + 1}</span><span>${s.t}</span><span class="st" aria-hidden="true"></span></button>`).join("")}</div>
    <div class="cp-main"><div class="cp-top"><div><h3 data-hx-title></h3><p data-hx-q></p></div><div class="cp-ctx"><span class="pill">Spring rewards · sample audience</span></div></div>
    <div class="cp-panel hx-panel" role="tabpanel" id="hx-panel" tabindex="0" data-hx-body></div>
    <div class="cp-foot"><button class="mini-btn ghost" type="button" data-hx-nav="-1">Back</button><span class="progress" aria-hidden="true">${STEPS.map(() => "<i></i>").join("")}</span><button class="mini-btn" type="button" data-hx-nav="1"></button></div></div>`;

  const tabs = [...root.querySelectorAll('[role="tab"]')];
  function render(focusTab) {
    seen.add(cur);
    tabs.forEach((t, i) => { const on = i === cur; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; t.classList.toggle("done", seen.has(i) && !on); });
    root.querySelector("#hx-panel").setAttribute("aria-labelledby", "hx-t" + cur);
    root.querySelector("[data-hx-title]").textContent = STEPS[cur].t;
    root.querySelector("[data-hx-q]").textContent = STEPS[cur].q;
    const body = root.querySelector("[data-hx-body]");
    body.innerHTML = panels[cur]();
    body.style.animation = "none"; void body.offsetWidth; body.style.animation = "";
    root.querySelectorAll(".progress i").forEach((p, i) => { p.className = i === cur ? "cur" : i < cur ? "on" : ""; });
    const back = root.querySelector('[data-hx-nav="-1"]'), next = root.querySelector('[data-hx-nav="1"]');
    back.disabled = cur === 0;
    next.disabled = cur === STEPS.length - 1;
    next.textContent = cur === STEPS.length - 1 ? "End of workflow" : `Next: ${STEPS[cur + 1].t}`;
    if (focusTab) tabs[cur].focus();
  }
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-hx-i]"), n = e.target.closest("[data-hx-nav]");
    if (t) { cur = +t.dataset.hxI; render(); }
    else if (n && !n.disabled) { cur = Math.max(0, Math.min(STEPS.length - 1, cur + +n.dataset.hxNav)); render(); root.querySelector("[data-hx-title]").scrollIntoView({ block: "nearest" }); }
    else if (e.target.closest("[data-hx-approve]")) { approved = true; render(); root.querySelector("[data-hx-reset]").focus(); }
    else if (e.target.closest("[data-hx-reset]")) { approved = false; cur = 0; seen.clear(); render(true); }
  });
  root.querySelector('[role="tablist"]').addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d == null && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    cur = e.key === "Home" ? 0 : e.key === "End" ? STEPS.length - 1 : (cur + d + STEPS.length) % STEPS.length;
    render(true);
  });
  render();
})();
