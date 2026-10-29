// Customer 360 & Next Best Offer: interface. Every value shown comes from C360.decide(); nothing is sent anywhere.
(() => {
  const E = window.C360;
  if (!E) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const L = E.CHANNEL_LABEL;
  const SCEN = { leyla: "Email preference", murad: "SMS preference", aylin: "Suppressed communication" };
  const OUTCOME = {
    ready: ["Preview ready", "ok"], scheduled: ["Scheduled · quiet hours", "info"], held: ["Held · frequency cap", "warn"],
    suppressed: ["Suppressed", "stop"], no_offer: ["No offer", "muted"],
  };
  const tagFor = { interaction: "Interaction", transaction: "Transaction", campaign: "Campaign", service: "Service", lifecycle: "Lifecycle", decision: "Decision" };

  const portrait = (p, cls = "") => {
    const ph = E.PORTRAITS[p.id];
    return `<img class="c3-ph ${cls}" src="${ph.src}" alt="Illustrative stock portrait used for ${esc(p.name)}" width="400" height="400" loading="lazy" decoding="async">`;
  };
  const chip = (txt, kind = "") => `<span class="c3-chip ${kind}">${esc(txt)}</span>`;
  const bar = (v) => `<span class="c3-bar" aria-hidden="true"><i style="--v:${v}"></i></span>`;

  /* ================================================================ Full app */
  function app(root) {
    const initial = () => ({ id: "leyla", tab: "overview", controls: {}, night: false });
    let st = initial();
    let anim = 0;

    root.innerHTML = `
      <div class="c3-head">
        <div><span class="c3-k">Customer intelligence · journey orchestration</span><h3>Customer 360 &amp; Next Best Offer</h3></div>
        <div class="c3-badges"><span class="c3-badge">Rules-Based Next Best Offer Demonstration</span><span class="c3-badge">Synthetic profiles</span><span class="c3-badge is-pv">Preview mode — no message sent</span></div>
      </div>
      <div class="c3-pick" role="radiogroup" aria-label="Demonstration profile">${E.PROFILES.map((p) => `
        <button type="button" role="radio" class="c3-pbtn" data-pick="${p.id}">${portrait(p, "sm")}<span><b>${esc(p.name)}</b><small>${SCEN[p.id]}</small></span><span class="c3-pout" data-pout="${p.id}"></span></button>`).join("")}
        <button type="button" class="c3-reset" data-reset>Reset demo</button>
      </div>
      <p class="sr" aria-live="polite" data-live></p>
      <div class="c3-grid">
        <section class="c3-profile" aria-label="Customer 360 profile" data-profile></section>
        <div class="c3-right">
          <section class="c3-card c3-journey" aria-label="Decision journey"><header><h4>Decision journey</h4><span class="c3-sub">Active path recalculated on every change</span></header><div data-journey></div></section>
          <section class="c3-card" aria-label="Test the rules"><header><h4>Test the rules</h4><span class="c3-sub">Change inputs; the engine re-checks consent every time</span></header><div class="c3-ctrls" data-ctrls></div></section>
          <div class="c3-two">
            <section class="c3-card" aria-label="Offer eligibility and ranking"><header><h4>Offer eligibility</h4><span class="c3-sub">Ranked by transparent rules</span></header><div data-offers></div></section>
            <section class="c3-card" aria-label="Message preview"><header><h4>Message preview</h4><span class="c3-sub">Generated from profile + offer data</span></header><div data-preview></div></section>
          </div>
          <div class="c3-two">
            <section class="c3-card c3-why" aria-label="Why this offer"><header><h4>Why this offer?</h4></header><div data-why-offer></div></section>
            <section class="c3-card c3-why" aria-label="Why this channel"><header><h4>Why this channel?</h4></header><div data-why-channel></div></section>
          </div>
        </div>
      </div>
      <section class="c3-handoff" aria-label="Hand-off to campaign planning" data-handoff></section>`;

    const $ = (s) => root.querySelector(s);
    const profileOf = (id) => E.PROFILES.find((p) => p.id === id);

    function run() { return E.decide(profileOf(st.id), st.controls, { hour: st.night ? 22 : 11 }); }

    function render(changed = true) {
      const d = run();
      const p = d.profile;
      // Profile selector outcomes come from the engine with each profile's default inputs.
      root.querySelectorAll("[data-pick]").forEach((b) => {
        const on = b.dataset.pick === st.id;
        b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1;
        const dd = E.decide(profileOf(b.dataset.pick), b.dataset.pick === st.id ? st.controls : {}, { hour: st.night ? 22 : 11 });
        const [lbl, k] = OUTCOME[dd.outcome];
        b.querySelector("[data-pout]").innerHTML = `<span class="c3-st ${k}">${dd.channel ? L[dd.channel] + " · " : ""}${lbl}</span>`;
      });
      renderProfile(d);
      renderJourney(d, changed);
      renderCtrls(d);
      renderOffers(d);
      renderPreview(d);
      $("[data-why-offer]").innerHTML = `<ul>${d.why.offer.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
      $("[data-why-channel]").innerHTML = `<ul>${d.why.channel.map((l, i) => `<li${d.outcome === "suppressed" && i === 0 ? ' class="stop"' : ""}>${esc(l)}</li>`).join("")}</ul>`;
      renderHandoff(d);
      $("[data-live]").textContent = `${p.name}: ${d.offer ? d.offer.name : "no eligible offer"}, ${OUTCOME[d.outcome][0]}${d.channel ? " via " + L[d.channel] : ""}.`;
    }

    /* ---------- Customer 360 profile ---------- */
    const TABS = [["overview", "Overview"], ["behaviour", "Behaviour & interests"], ["products", "Products"], ["timeline", "Timeline"], ["consent", "Preferences & consent"], ["insights", "Insights"]];
    function renderProfile(d) {
      const p = d.profile;
      const ph = E.PORTRAITS[p.id];
      const matched = d.segments.filter((s) => s.match);
      const tabBody = {
        overview: () => `<dl class="c3-dl">
            <div><dt>Segment</dt><dd>${esc(p.segmentLabel)}</dd></div><div><dt>Lifecycle stage</dt><dd>${esc(p.lifecycle)}</dd></div>
            <div><dt>Products</dt><dd>${p.products.map((x) => esc(x.name)).join(", ")}</dd></div><div><dt>Preferred channel</dt><dd>${L[p.preferredChannel]}</dd></div>
            <div><dt>Recent engagement</dt><dd>${p.activity.appSessions30d} app sessions · ${p.activity.cardTxns30d} card payments (30 days)</dd></div><div><dt>Last active</dt><dd>${p.activity.daysSinceActive === 1 ? "Yesterday" : p.activity.daysSinceActive + " days ago"}</dd></div>
            <div class="wide"><dt>Relevant interests</dt><dd>${p.interests.map((i) => chip(i)).join("")}</dd></div></dl>`,
        behaviour: () => `<div class="c3-sig">${d.signals.map((s) => `<div class="${s.strong ? "on" : ""}"><span class="nm">${esc(s.key[0].toUpperCase() + s.key.slice(1))} interest</span>${bar(Math.round(s.score * 100))}<b>${Math.round(s.score * 100)}</b><small>${esc(s.evidence)}</small></div>`).join("")}</div>
            <p class="c3-note">Signal ≥ 60 counts as a strong interest. Scores are rule-derived from synthetic activity, not predicted by a model.</p>
            <h5>Recent browsing</h5><ul class="c3-list">${p.browsing.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`,
        products: () => `<table class="c3-tbl"><thead><tr><th>Product</th><th>Status</th><th>Usage</th></tr></thead><tbody>
            ${p.products.map((x) => `<tr><td>${esc(x.name)}</td><td>${chip(x.status === "active" ? "Active" : x.status, "ok")}</td><td>${esc(x.usage)}</td></tr>`).join("")}
            <tr><td>${esc(p.membership.name)}</td><td>${chip(p.membership.status === "active" ? "Active" : "Registered, not activated", p.membership.status === "active" ? "ok" : "warn")}</td><td>${p.membership.status === "active" ? "Collecting points" : "Never activated"}</td></tr></tbody></table>
            <h5>Relationship gaps</h5><ul class="c3-list">${gaps(p).map((g) => `<li>${esc(g)}</li>`).join("") || "<li>No obvious gaps in this synthetic profile.</li>"}</ul>`,
        timeline: () => {
          const now = [["Now", "decision", d.outcome === "suppressed" ? `Decision: ${d.offer.name} suppressed (no permitted channel)` : d.outcome === "no_offer" ? "Decision: no eligible offer" : d.outcome === "held" ? `Decision: ${d.offer.name} held (frequency cap)` : `Decision: ${d.offer.name} ${L[d.channel]} preview ${d.outcome === "scheduled" ? "scheduled for 09:00" : "generated"} (not sent)`]];
          return `<ol class="c3-tl">${now.concat(p.timeline).map(([t, k, x], i) => `<li class="${k}${i === 0 ? " now" : ""}"><span class="t">${esc(t)}</span><span class="c3-chip">${tagFor[k]}</span><span>${esc(x)}</span></li>`).join("")}</ol>`;
        },
        consent: () => `<table class="c3-tbl"><thead><tr><th>Channel</th><th>Marketing consent</th><th>Contact point</th></tr></thead><tbody>
            ${E.CHANNELS.map((c) => `<tr><td>${L[c]}${c === p.preferredChannel ? ' <span class="c3-chip acc">Preferred</span>' : ""}</td><td>${chip(E.CONSENT_LABEL[p.consent[c]], p.consent[c] === "opted_in" ? "ok" : p.consent[c] === "opted_out" ? "stop" : "muted")}</td><td>${p.contactable[c] ? "On file (hidden)" : c === "push" ? "App notifications off" : "Not verified"}</td></tr>`).join("")}</tbody></table>
            <dl class="c3-dl"><div><dt>Topics</dt><dd>${p.topics.length ? p.topics.map((t) => chip(t)).join("") : "None selected"}</dd></div>
            <div><dt>Frequency rule</dt><dd>Max ${p.frequency.cap7d} marketing messages per 7 days · ${p.frequency.sent7d} sent</dd></div>
            <div><dt>Quiet hours</dt><dd>21:00–09:00 for SMS and push</dd></div>
            <div><dt>Suppression</dt><dd>${p.flags.globalUnsubscribe ? chip("Unsubscribed from all marketing", "stop") : "None"}</dd></div></dl>
            <p class="c3-note">Contact details are never displayed. Service messages (e.g. security alerts) follow separate rules and are outside this demo.</p>`,
        insights: () => `<h5>Matched segments</h5><div class="c3-chips">${d.segments.map((s) => `<span class="c3-chip ${s.match ? "ok" : "muted"}" title="${esc(s.rule)}">${s.match ? "✓" : "–"} ${esc(s.name)}</span>`).join("")}</div>
            <h5>Opportunity triggers</h5><ul class="c3-list">${d.ranked.map((o) => `<li>${esc(o.name)} · score ${o.score}</li>`).join("") || "<li>None</li>"}</ul>
            <h5>Exclusion reasons</h5><ul class="c3-list">${d.offers.filter((o) => !o.eligible).map((o) => `<li>${esc(o.name)}: ${esc(o.requires.filter((r) => !r.pass).map((r) => r.text).concat(o.excludes.filter((e) => e.hit).map((e) => e.text)).join("; "))}</li>`).join("") || "<li>None</li>"}</ul>
            <h5>Next recommended action</h5><p class="c3-nba">${esc(nba(d))}</p>`,
      };
      $("[data-profile]").innerHTML = `
        <div class="c3-id">
          <figure>${portrait(p)}<figcaption>Illustrative photo · not the customer<br><a href="${ph.page}" target="_blank" rel="noopener">Photo: ${esc(ph.credit)} </a></figcaption></figure>
          <div class="c3-idt"><span class="c3-syn">Synthetic profile</span><h4>${esc(p.name)}</h4><span class="c3-mono">${p.profileId}</span>
            <div class="c3-chips">${chip(p.lifecycle + " customer", "acc")}${chip(p.segmentLabel)}${chip("Age " + p.ageBracket)}</div>
            <dl class="c3-mini"><div><dt>Customer since</dt><dd>${p.since}</dd></div><div><dt>Membership</dt><dd>${p.membership.status === "active" ? "Rewards · active" : "Rewards · not activated"}</dd></div>
              <div><dt>Prefers</dt><dd>${L[p.preferredChannel]}</dd></div><div><dt>Profile completeness</dt><dd>${p.completeness}% ${bar(p.completeness)}</dd></div></dl></div>
        </div>
        <div class="c3-tabs" role="tablist" aria-label="Profile sections">${TABS.map(([k, t]) => `<button role="tab" id="c3t-${k}" aria-controls="c3p" aria-selected="${st.tab === k}" tabindex="${st.tab === k ? 0 : -1}" data-tab="${k}">${t}</button>`).join("")}</div>
        <div class="c3-tabp" role="tabpanel" id="c3p" aria-labelledby="c3t-${st.tab}" tabindex="0">${tabBody[st.tab]()}</div>`;
    }
    const gaps = (p) => {
      const g = [];
      if (p.membership.status === "registered") g.push("Rewards membership registered but never activated");
      if (!p.products.some((x) => x.id === "savings")) g.push("No savings product");
      if (p.signals.travel.score >= 0.6 && !p.products.some((x) => x.id === "travel_rewards")) g.push("Strong travel interest, no travel benefit");
      return g;
    };
    const nba = (d) => ({
      ready: () => `Send ${d.offer.name} by ${L[d.channel]} (preview only in this demo).`,
      scheduled: () => `Queue ${d.offer.name} by ${L[d.channel]} for ${d.sendAt}.`,
      held: () => `Hold ${d.offer.name}; re-evaluate when the 7-day frequency window resets.`,
      suppressed: () => `Do not send marketing. Surface ${d.offer.name} in-app or with an adviser only if the customer engages first.`,
      no_offer: () => "No outbound action. Keep monitoring signals.",
    })[d.outcome]();

    /* ---------- Journey ---------- */
    function renderJourney(d, changed) {
      const off = d.offer;
      const n = (id, title, sub, state, i) => `<div class="c3-node ${state}" style="--i:${i}" data-node="${id}"><span class="dot" aria-hidden="true"></span><b>${esc(title)}</b><small>${esc(sub)}</small><span class="c3-state">${stateLbl[state]}</span></div>`;
      const stateLbl = { done: "Evaluated", sel: "Selected", stop: "Suppressed", off: "Not on path", wait: "Awaiting evaluation", warn: "Held", none: "None eligible" };
      const matched = d.segments.filter((s) => s.match).length;
      const eligibleN = d.ranked.length;
      const chain = [
        n("profile", "Customer profile", `${d.profile.name} · ${d.profile.profileId}`, "done", 0),
        n("segments", "Behaviour & segments", `${matched} of ${d.segments.length} segments matched`, "done", 1),
        n("eligibility", "Offer eligibility", `${eligibleN} of ${d.offers.length} offers eligible`, eligibleN ? "done" : "none", 2),
        n("offer", "Next best offer", off ? `${off.name} · score ${off.score}` : "No eligible offer", off ? "sel" : "off", 3),
        n("channel", "Consent & channel", d.outcome === "no_offer" ? "Not evaluated" : d.channel ? `${L[d.channel]}${d.fallback ? " (fallback)" : " (preferred)"}` : "No permitted channel", d.outcome === "no_offer" ? "off" : d.channel ? "done" : "stop", 4),
      ];
      const branches = [["email", "Email"], ["sms", "SMS"], ["push", "Push"], ["suppressed", "Suppressed"], ["no_offer", "No offer"]];
      const active = d.branch;
      const outState = d.outcome === "ready" ? "sel" : d.outcome === "scheduled" ? "done" : d.outcome === "held" ? "warn" : d.outcome === "suppressed" ? "stop" : "off";
      const outSub = { ready: "Preview generated · not sent", scheduled: `Preview scheduled for ${d.sendAt} · not sent`, held: "Frequency cap reached · held", suppressed: "No message created", no_offer: "No message created" }[d.outcome];
      const el = $("[data-journey]");
      el.innerHTML = `<div class="c3-flow${changed && !reduce() ? " run" : ""}" data-run="${++anim}">
        ${chain.join('<span class="c3-con" aria-hidden="true"></span>')}
        <span class="c3-con" aria-hidden="true"></span>
        <div class="c3-branch" role="list" aria-label="Communication branches">${branches.map(([k, t]) => {
          const on = k === active;
          const cls = on ? (k === "suppressed" ? "stop" : k === "no_offer" ? "none" : d.outcome === "held" ? "warn" : "sel") : "off";
          const why = k === "suppressed" || k === "no_offer" ? "" : d.channelChecks ? (d.channelChecks.find((c) => c.channel === k)?.allowed ? "Permitted" : "Not permitted") : "Not evaluated";
          return `<div role="listitem" class="c3-bn ${cls}" style="--i:5"><b>${t}</b><small>${on ? "Active path" : why || "—"}</small></div>`;
        }).join("")}</div>
        <span class="c3-con" aria-hidden="true"></span>
        ${n("outcome", "Preview & simulated outcome", outSub, outState, 6)}
      </div>`;
    }

    /* ---------- Controls ---------- */
    function renderCtrls(d) {
      const p = d.profile;
      const sel = (name, val, opts, label) => `<label><span>${label}</span><select data-ctl="${name}">${opts.map(([v, t]) => `<option value="${v}"${v === val ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
      const consentOpts = [["opted_in", "Opted in"], ["opted_out", "Opted out"], ["unknown", "No record"]];
      $("[data-ctrls]").innerHTML = `
        ${E.CHANNELS.map((c) => sel("consent." + c, p.consent[c], consentOpts, `${L[c]} consent`)).join("")}
        ${sel("preferredChannel", p.preferredChannel, E.CHANNELS.map((c) => [c, L[c]]), "Preferred channel")}
        <label><span>Sent in last 7 days</span><span class="c3-step"><button type="button" data-step="-1" aria-label="Fewer messages sent">−</button><output>${p.frequency.sent7d} / ${p.frequency.cap7d}</output><button type="button" data-step="1" aria-label="More messages sent">+</button></span></label>
        ${sel("time", st.night ? "night" : "day", [["day", "11:00 (daytime)"], ["night", "22:00 (quiet hours)"]], "Customer local time")}
        <label class="chk"><input type="checkbox" data-ctl="globalUnsubscribe"${p.flags.globalUnsubscribe ? " checked" : ""}><span>Unsubscribed from all marketing</span></label>
        <label class="chk"><input type="checkbox" data-ctl="removeSignals"${st.controls.removeSignals ? " checked" : ""}><span>Remove interest signals</span></label>`;
    }

    /* ---------- Offers ---------- */
    function renderOffers(d) {
      const rows = [...d.ranked, ...d.offers.filter((o) => !o.eligible)];
      $("[data-offers]").innerHTML = `<ol class="c3-offers">${rows.map((o) => {
        const selected = d.offer && o.id === d.offer.id;
        const status = selected ? (d.outcome === "suppressed" ? ["Selected · not sendable", "stop"] : ["Selected", "sel"]) : o.eligible ? ["Eligible", "ok"] : ["Ineligible", "muted"];
        return `<li class="${selected ? "is-sel" : ""}${o.eligible ? "" : " is-off"}"><div class="top"><b>${o.rank ? `<span class="rk">${o.rank}</span>` : ""}${esc(o.name)}</b><span class="c3-st ${status[1]}">${status[0]}</span></div>
          <small>${esc(o.summary)}</small>
          ${o.eligible ? `<span class="sc">Score ${o.score} <em>= ${o.scoreParts.base} priority + ${o.scoreParts.signal} signal + ${o.scoreParts.recency} recency</em></span>` : ""}
          <ul class="rules">${o.requires.map((r) => `<li class="${r.pass ? "p" : "f"}">${r.pass ? "✓" : "✕"} ${esc(r.text)}</li>`).join("")}${o.excludes.map((e) => `<li class="${e.hit ? "f" : "p"}">${e.hit ? "✕" : "✓"} Not: ${esc(e.text.toLowerCase())}</li>`).join("")}</ul></li>`;
      }).join("")}</ol>`;
    }

    /* ---------- Preview ---------- */
    function renderPreview(d) {
      const v = d.preview;
      const el = $("[data-preview]");
      const tag = `<span class="c3-pm">Preview mode — no message sent</span>`;
      if (!v) {
        const msg = {
          suppressed: ["No eligible outbound channel — communication suppressed.", `The customer is interested in ${d.offer?.name}, but no channel has marketing permission. No message was created.`],
          no_offer: ["No offer selected.", "No offer met its eligibility rules, so there is nothing to communicate."],
          held: ["Message held.", `Frequency cap reached (${d.profile.frequency.sent7d} of ${d.profile.frequency.cap7d} in 7 days). Nothing is created or scheduled until the window resets.`],
        }[d.outcome];
        el.innerHTML = `<div class="c3-empty ${d.outcome}"><span class="ic" aria-hidden="true">${d.outcome === "suppressed" ? "⦸" : d.outcome === "held" ? "Ⅱ" : "–"}</span><b>${msg[0]}</b><p>${esc(msg[1])}</p></div>${tag}`;
        return;
      }
      const sched = d.outcome === "scheduled" ? `<div class="c3-sched">Scheduled · ${esc(d.sendAt)} (quiet hours)</div>` : "";
      if (v.channel === "email") {
        el.innerHTML = `${sched}<div class="c3-mail"><div class="mh"><div><span>From</span>${esc(v.from)}</div><div><span>To</span>${esc(d.profile.first)} · address hidden</div><div><span>Subject</span><b>${esc(v.subject)}</b></div></div>
          <div class="mb"><div class="c3-mbrand">BRAND<i>.</i></div><p>${esc(v.greeting)}</p><h5>${esc(v.headline)}</h5><p>${esc(v.body)}</p><span class="cta">${esc(v.cta)}</span><p class="terms">${esc(v.terms)}</p><p class="terms">You're receiving this because you opted in to marketing email. Unsubscribe anytime.</p></div></div>${tag}`;
      } else if (v.channel === "sms") {
        el.innerHTML = `${sched}<div class="c3-phone"><div class="ph-top"><b>${esc(v.sender)}</b><small>Text message · number hidden</small></div><div class="ph-body"><span class="day">Today ${d.outcome === "scheduled" ? "09:00" : "11:02"}</span><div class="bubble">${esc(v.text)}</div></div></div>${tag}`;
      } else {
        el.innerHTML = `${sched}<div class="c3-push"><b>BRAND</b><strong>${esc(v.title)}</strong><p>${esc(v.text)}</p></div>${tag}`;
      }
    }

    /* ---------- Customer Intelligence OS hand-off ---------- */
    function renderHandoff(d) {
      const steps = ["Customer 360", "Segments & signals", "Opportunity", "Offer", "Channel", "Prepare & approve"];
      const seg = d.segments.filter((s) => s.match).map((s) => s.name)[0] || "—";
      $("[data-handoff]").innerHTML = `<div><span class="c3-k">From one customer to a campaign</span><h4>Customer 360 decides for one customer. Customer Intelligence OS runs it as a campaign.</h4>
        <p>${d.offer ? `This decision would feed a brief for the <b>${esc(seg)}</b> audience, proposing <b>${esc(d.offer.name)}</b>${d.channel ? ` with <b>${L[d.channel]}</b> as the lead channel` : ", with consented customers only"}.` : "With no eligible offer, nothing would be handed to campaign planning."} Across a whole audience, the campaign workflow takes the same decisions through:</p>
        <ol class="c3-ci">${steps.map((s, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${s}</li>`).join("")}</ol>
        <p class="c3-note">Both demonstrations run the same rules on the same synthetic customers, so their decisions always match. Nothing is sent.</p>
        <a class="tlink" href="/work/customer-intelligence-os">Open Customer Intelligence OS <svg class="arr" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>`;
    }

    /* ---------- Events ---------- */
    root.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (pick) { st = { ...initial(), id: pick.dataset.pick, tab: st.tab }; return render(); }
      const tab = e.target.closest("[data-tab]");
      if (tab) { st.tab = tab.dataset.tab; render(false); return root.querySelector(`[data-tab="${st.tab}"]`).focus(); }
      if (e.target.closest("[data-reset]")) { st = initial(); return render(); }
      const step = e.target.closest("[data-step]");
      if (step) {
        const cur = run().profile.frequency;
        st.controls.sent7d = Math.max(0, Math.min(cur.cap7d + 2, cur.sent7d + Number(step.dataset.step)));
        render(); root.querySelector(`[data-step="${step.dataset.step}"]`).focus();
      }
    });
    root.addEventListener("change", (e) => {
      const c = e.target.dataset.ctl;
      if (!c) return;
      if (c === "time") st.night = e.target.value === "night";
      else if (c.startsWith("consent.")) st.controls.consent = { ...(st.controls.consent || {}), [c.slice(8)]: e.target.value };
      else if (e.target.type === "checkbox") st.controls[c] = e.target.checked;
      else st.controls[c] = e.target.value;
      render();
      root.querySelector(`[data-ctl="${c}"]`)?.focus();
    });
    root.addEventListener("keydown", (e) => {
      const group = e.target.closest('[role="tablist"], [role="radiogroup"]');
      if (!group || !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const items = [...group.querySelectorAll('[role="tab"], [role="radio"]')];
      let i = items.indexOf(e.target);
      if (i < 0) return;
      e.preventDefault();
      i = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1) + items.length) % items.length;
      items[i].click();
      const k = items[i].dataset.tab ? `[data-tab="${items[i].dataset.tab}"]` : `[data-pick="${items[i].dataset.pick}"]`;
      root.querySelector(k).focus();
    });

    const q = new URLSearchParams(location.search).get("profile");
    if (q && E.PROFILES.some((p) => p.id === q)) st.id = q;
    render();
  }

  /* ================================================================ Compact teaser (case page) */
  function mini(root) {
    let id = "leyla";
    const draw = () => {
      const d = E.decide(E.PROFILES.find((p) => p.id === id));
      const [lbl, k] = OUTCOME[d.outcome];
      root.innerHTML = `<div class="c3m-pick" role="radiogroup" aria-label="Profile">${E.PROFILES.map((p) => `<button type="button" role="radio" aria-checked="${p.id === id}" tabindex="${p.id === id ? 0 : -1}" data-m="${p.id}">${portrait(p, "sm")}<span>${esc(p.name)}</span></button>`).join("")}</div>
        <ol class="c3m-flow">
          <li><span>Profile</span><b>${esc(d.profile.segmentLabel)}</b></li>
          <li><span>Next best offer</span><b>${d.offer ? esc(d.offer.name) : "None eligible"}</b></li>
          <li><span>Channel</span><b>${d.channel ? L[d.channel] : "No permitted channel"}</b></li>
          <li class="${k}"><span>Outcome</span><b>${lbl}</b></li>
        </ol>
        <p class="c3m-why">${esc(d.why.channel[0])}</p>`;
    };
    root.addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (b) { id = b.dataset.m; draw(); root.querySelector(`[data-m="${id}"]`).focus(); } });
    root.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft"].includes(e.key) || !e.target.dataset.m) return;
      const ids = E.PROFILES.map((p) => p.id);
      id = ids[(ids.indexOf(id) + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length];
      draw(); root.querySelector(`[data-m="${id}"]`).focus();
    });
    draw();
  }

  document.querySelectorAll("[data-c360]").forEach(app);
  document.querySelectorAll("[data-c360-mini]").forEach(mini);
})();
