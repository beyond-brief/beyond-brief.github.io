// Beyond Brief AI Concierge: chat panel. Loaded only when an endpoint is configured (see build.mjs).
// Never opens on its own, including after moving between pages. The conversation lives in this tab only (sessionStorage) and is never
// sent anywhere except the Concierge endpoint. A brief reaches the contact form only when the
// visitor clicks "Add to contact form"; the form itself is still sent by the visitor.
(() => {
  const cfg = window.BB_CONCIERGE || {};
  if (!cfg.endpoint || document.querySelector(".bc")) return;
  const KEY = "bb-concierge-v1", BRIEF_KEY = "bb-concierge-brief", MAX = 600;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get() { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } }, set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch {} }, clear() { try { sessionStorage.removeItem(KEY); } catch {} } };
  const fresh = () => ({ msgs: [], cards: {}, open: false });
  let S = store.get() || fresh(), busy = false, err = null, editing = false;
  S.open = false; // always starts closed: it never opens by itself, on any page
  const STARTERS = ["What does Beyond Brief do?", "Which demo fits a bank?", "Help me write a project brief", "Do you have client case studies?"];
  const KIND = { service: "Service", industry: "Industry", demo: "Demo · our prototype, synthetic data", concept: "Concept · our prototype", page: "Page" };
  const LABEL = { "fintech-digital-banking": "Fintech & Digital Banking", "beauty-wellness-services": "Beauty & Wellness", "hospitality-leisure": "Hospitality & Restaurants", "telecom-subscriptions": "Telecom", "education-edtech": "Education & EdTech", "retail-ecommerce": "Retail & E-commerce", other: "Other", "market-research-strategy": "Strategy & Market Research", "customer-experience": "Customer Experience, UX & Digital", "customer-growth-intelligence": "Customer Growth, Loyalty & Gamification", "campaigns-data-creative": "Campaigns, Data & Creative", "not-sure": "Not sure yet" };
  const I = {
    close: '<path d="M5 5l10 10M15 5 5 15"/>', send: '<path d="M3.5 10h11M10.5 5l5 5-5 5"/>', arrow: '<path d="M4 10h11M11 6l4 4-4 4"/>', reset: '<path d="M4 4v5h5"/><path d="M4.6 12.5A6 6 0 1 0 5 7.2"/>', edit: '<path d="M4 14.5V16h1.5l8.6-8.6-1.5-1.5zM12.6 4.9l1.5-1.5 1.5 1.5-1.5 1.5"/>',
  };
  const ic = (k, s = 18) => `<svg class="bc-i" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true">${I[k]}</svg>`;

  // Text only: paragraphs and simple bullets, never HTML from the model.
  const fmt = (t) => esc(t).split(/\n{2,}/).map((p) => /^\s*[-•]\s/m.test(p) ? `<ul>${p.split(/\n/).filter(Boolean).map((l) => `<li>${l.replace(/^\s*[-•]\s*/, "")}</li>`).join("")}</ul>` : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const safeUrl = (u) => (typeof u === "string" && /^\/[a-z0-9\-/#]*$/i.test(u) ? u : null);

  const root = document.createElement("div");
  root.className = "bc";
  root.innerHTML = `
    <button type="button" class="bc-launch" aria-expanded="false" aria-controls="bc-panel"><span class="bc-dot" aria-hidden="true"></span><span>Ask Beyond Brief</span></button>
    <section class="bc-panel" id="bc-panel" role="dialog" aria-modal="false" aria-labelledby="bc-title" hidden>
      <header class="bc-head"><div><h2 id="bc-title">AI Concierge</h2><p>Answers from the Beyond Brief website</p></div>
        <button type="button" class="bc-icon" data-bc-new aria-label="Start a new conversation" title="New conversation">${ic("reset")}</button>
        <button type="button" class="bc-icon" data-bc-close aria-label="Close">${ic("close")}</button></header>
      <div class="bc-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" data-bc-log></div>
      <form class="bc-form" data-bc-form><label class="sr-only" for="bc-input">Message</label>
        <textarea id="bc-input" rows="1" maxlength="${MAX}" placeholder="Ask about our work, or describe your project" autocomplete="off"></textarea>
        <button type="submit" class="bc-send" aria-label="Send">${ic("send")}</button>
        <p class="bc-count" aria-live="polite" data-bc-count></p></form>
    </section>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const panel = $(".bc-panel"), launch = $(".bc-launch"), log = $("[data-bc-log]"), input = $("#bc-input"), sendBtn = $(".bc-send");

  function cardsHtml(i) {
    const c = S.cards[i]; if (!c) return "";
    const links = (c.links || []).map((l) => { const u = safeUrl(l.url); return u ? `<a class="bc-link" href="${u}" data-bc-link><small>${KIND[l.kind] || "Page"}</small><b>${esc(l.title)}</b>${ic("arrow", 16)}</a>` : ""; }).join("");
    return `${links ? `<div class="bc-links">${links}</div>` : ""}${c.brief ? briefHtml(c.brief, i) : ""}`;
  }
  function briefHtml(b, i) {
    const rows = [["objective", "Goal"], ["challenge", "Challenge"], ["audience", "Customers"], ["timeline", "Timing"], ["success", "Success looks like"]].filter(([k]) => b[k]);
    const meta = [b.industry && LABEL[b.industry], b.service && LABEL[b.service]].filter(Boolean);
    return `<article class="bc-brief" aria-label="Project brief"><header><small>Project brief</small><button type="button" class="bc-mini" data-bc-edit="${i}">${ic("edit", 14)}${editing === i ? "Done" : "Edit"}</button></header>
      ${editing === i ? rows.map(([k, l]) => `<label class="bc-field"><span>${l}</span><textarea data-bc-field="${k}" rows="2" maxlength="400">${esc(b[k])}</textarea></label>`).join("") : `<dl>${rows.map(([k, l]) => `<div><dt>${l}</dt><dd>${esc(b[k])}</dd></div>`).join("")}</dl>`}
      ${meta.length ? `<p class="bc-meta">${meta.map(esc).join(" · ")}</p>` : ""}
      <button type="button" class="bc-cta" data-bc-handoff="${i}">Add to contact form ${ic("arrow", 16)}</button>
      <p class="bc-fine">Copies this summary, not the conversation, into the form. You review it and send it yourself.</p></article>`;
  }
  function render(focusLog) {
    const intro = `<div class="bc-intro"><p><b>Hi, I'm Beyond Brief's AI assistant.</b> I can explain our services and work, point you to the right demo, and help you shape a project brief.</p>
      <p class="bc-disclose">I'm an AI and can make mistakes. Please don't share personal or sensitive information here. <a href="/privacy#concierge">How the Concierge works</a></p></div>`;
    const msgs = S.msgs.map((m, i) => m.role === "user" ? `<div class="bc-msg me" dir="auto">${fmt(m.content)}</div>` : `<div class="bc-msg ai" dir="auto">${fmt(m.content)}</div>${cardsHtml(i)}`).join("");
    const last = S.cards[S.msgs.length - 1], chips = !busy && !err ? (S.msgs.length ? (last?.suggestions || []) : STARTERS) : [];
    log.innerHTML = intro + msgs
      + (busy ? '<div class="bc-typing" role="status"><span></span><span></span><span></span><b class="sr-only">The assistant is writing</b></div>' : "")
      + (err ? `<div class="bc-err" role="alert"><p>${err.text}</p>${err.retry ? '<button type="button" class="bc-mini" data-bc-retry>Try again</button>' : ""}${err.contact ? '<a class="bc-mini" href="/contact">Use the contact form</a>' : ""}</div>` : "")
      + (chips.length ? `<div class="bc-chips" role="group" aria-label="Suggested questions">${chips.map((c) => `<button type="button" data-bc-chip>${esc(c)}</button>`).join("")}</div>` : "");
    input.disabled = busy; sendBtn.disabled = busy;
    log.scrollTop = log.scrollHeight;
    if (focusLog) log.focus({ preventScroll: true });
  }
  const ERR = {
    rate_limited: { text: "You're sending messages quickly. Please wait a minute and try again.", retry: true },
    conversation_limit: { text: "This conversation has reached its length limit. Start a new one, or send what you have through the contact form.", contact: true },
    too_long: { text: `Messages can be up to ${MAX} characters. Try a shorter one.` },
    budget: { text: "The assistant is resting for now. The contact form always works.", contact: true },
    not_configured: { text: "The assistant isn't switched on yet. The contact form always works.", contact: true },
    busy: { text: "The assistant is busy right now. Please try again in a moment.", retry: true },
  };
  async function ask(text) {
    text = String(text).trim().slice(0, MAX);
    if (!text || busy) return;
    // After a failed send the last turn is the visitor's: replace it rather than stacking two in a row.
    if (S.msgs[S.msgs.length - 1]?.role === "user") S.msgs[S.msgs.length - 1].content = text; else S.msgs.push({ role: "user", content: text });
    busy = true; err = null; store.set(S); render();
    try {
      const r = await fetch(cfg.endpoint.replace(/\/$/, "") + "/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: S.msgs }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { err = ERR[data.error] || { text: "Something went wrong on our side. Please try again.", retry: true }; return; }
      S.msgs.push({ role: "assistant", content: data.reply });
      S.cards[S.msgs.length - 1] = { links: data.links, suggestions: data.suggestions, brief: data.brief };
    } catch {
      // Also reached on a Netlify rate limit: its 429 has no CORS header, so a browser can't read it.
      err = { text: "I couldn't reach the assistant. Please wait a moment and try again.", retry: true };
    }
    finally { busy = false; store.set(S); render(); if (!err) input.focus({ preventScroll: true }); }
  }
  function open(v) {
    S.open = v; store.set(S);
    panel.hidden = !v; launch.setAttribute("aria-expanded", String(v)); root.classList.toggle("is-open", v);
    if (v) { render(); input.focus({ preventScroll: true }); } else launch.focus({ preventScroll: true });
  }
  function grow() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; const n = input.value.length; $("[data-bc-count]").textContent = n > MAX - 100 ? `${MAX - n} characters left` : ""; }

  launch.addEventListener("click", () => open(!S.open));
  $("[data-bc-close]").addEventListener("click", () => open(false));
  $("[data-bc-new]").addEventListener("click", () => { S = { ...fresh(), open: true }; err = null; editing = false; store.set(S); render(); input.focus(); });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.open) open(false); });
  $("[data-bc-form]").addEventListener("submit", (e) => { e.preventDefault(); const t = input.value; input.value = ""; grow(); ask(t); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("[data-bc-form]").requestSubmit(); } });
  input.addEventListener("input", grow);
  log.addEventListener("input", (e) => { const f = e.target.closest("[data-bc-field]"); if (f && editing !== false) { S.cards[editing].brief[f.dataset.bcField] = f.value.slice(0, 400); store.set(S); } });
  log.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-bc-chip]"), ed = e.target.closest("[data-bc-edit]"), ho = e.target.closest("[data-bc-handoff]");
    if (chip) return ask(chip.textContent);
    if (e.target.closest("[data-bc-retry]")) { err = null; return ask(S.msgs[S.msgs.length - 1]?.content || ""); }
    if (ed) { const i = +ed.dataset.bcEdit; editing = editing === i ? false : i; render(); return root.querySelector(editing === i ? `[data-bc-field]` : `[data-bc-edit="${i}"]`)?.focus(); }
    if (ho) {
      const b = S.cards[+ho.dataset.bcHandoff].brief;
      try { sessionStorage.setItem(BRIEF_KEY, JSON.stringify(b)); } catch {}
      if (location.pathname.replace(/\/$/, "") === "/contact") { window.dispatchEvent(new Event("bb-concierge-brief")); open(false); }
      else location.href = "/contact?from=concierge";
    }
  });
  // Stay clear of the consent banner while it's on screen.
  const lift = () => root.classList.toggle("bc-lift", !!document.querySelector(".bb-consent"));
  new MutationObserver(lift).observe(document.body, { childList: true }); lift();
})();
