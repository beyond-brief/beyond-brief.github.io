// Consent-gated analytics: Google Analytics 4 loads only after the visitor accepts.
// Events carry page, link and control names only: never form contents, field values or demo profile data.
(() => {
  const cfg = window.BB_ANALYTICS || {};
  if (!cfg.ga4) return;
  const KEY = "bb-consent";
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const debug = local || /[?&]bb_debug\b/.test(location.search);
  let on = false;

  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch {} },
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };

  function load(src) { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }

  function start() {
    if (on) return;
    on = true;
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("js", new Date());
    gtag("config", cfg.ga4, { allow_google_signals: false, allow_ad_personalization_signals: false, debug_mode: debug || undefined });
    if (!local) load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4));
  }

  function track(name, params = {}) {
    if (debug) console.info("[analytics]", name, params);
    if (!on) return;
    gtag("event", name, params);
  }

  // ---------- Consent banner ----------
  const css = `.bb-consent{position:fixed;z-index:1000;left:16px;right:16px;bottom:16px;max-width:560px;margin-left:auto;background:#17181c;color:#f4f5f7;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.45);font:15px/1.5 Satoshi,system-ui,sans-serif}
.bb-consent p{margin:0 0 14px}.bb-consent a{color:inherit}.bb-consent .row{display:flex;gap:10px;flex-wrap:wrap}
.bb-consent button{font:inherit;font-weight:700;border-radius:999px;padding:10px 18px;cursor:pointer;border:1px solid rgba(255,255,255,.3);background:transparent;color:inherit}
.bb-consent button.yes{background:#087CFF;border-color:#087CFF;color:#0b0c0f}.bb-consent button:focus-visible{outline:2px solid #087CFF;outline-offset:3px}
.bb-consent-link{font:inherit;background:none;border:0;padding:0;color:inherit;cursor:pointer}`;

  function banner() {
    if (document.querySelector(".bb-consent")) return;
    const el = document.createElement("div");
    el.className = "bb-consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Analytics cookies");
    el.innerHTML = `<p>We'd like to use Google Analytics cookies to understand how visitors use this site. They don't collect anything you type into forms. <a href="/privacy">Privacy policy</a></p>
      <div class="row"><button type="button" class="yes">Accept analytics</button><button type="button" class="no">Decline</button></div>`;
    el.addEventListener("click", (e) => {
      const yes = e.target.closest(".yes"), no = e.target.closest(".no");
      if (!yes && !no) return;
      store.set(yes ? "granted" : "denied");
      el.remove();
      if (yes) start();
      else {
        // Withdraw: delete Google Analytics cookies, then reload so the loaded script stops.
        for (const c of document.cookie.split("; ")) {
          const name = c.split("=")[0];
          if (/^_ga/.test(name)) for (const d of ["", location.hostname, "." + location.hostname]) document.cookie = `${name}=; Max-Age=0; path=/${d ? "; domain=" + d : ""}`;
        }
        if (on) location.reload();
      }
    });
    document.body.appendChild(el);
  }

  function settingsLink() {
    const base = document.querySelector(".foot-legal");
    if (!base || base.querySelector(".bb-consent-link")) return;
    base.append(" · ");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bb-consent-link";
    b.textContent = "Cookie settings";
    b.addEventListener("click", banner);
    base.appendChild(b);
  }

  // ---------- Events ----------
  const path = (href) => { try { return new URL(href, location.href).pathname.replace(/\/$/, "") || "/"; } catch { return ""; } };
  const area = (a) => a.closest(".dropdown") ? "nav_dropdown" : a.closest(".site-header") ? "nav" : a.closest(".site-footer") ? "footer" : "page";
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim().slice(0, 80);

  let c360Engaged = false;
  function c360(action, params = {}) {
    if (!c360Engaged) { c360Engaged = true; track("c360_engaged"); }
    track("c360_" + action, params);
  }

  // Capture phase: the demo re-renders on click, so read the element before it's replaced.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (a) {
      const p = path(a.href), where = area(a), text = clean((a.querySelector("strong") || a).textContent);
      if (where !== "page") track("nav_click", { nav_area: where, link_text: text, link_path: p });
      if (p === "/contact") track("contact_cta_click", { cta_location: where, cta_text: text, from_path: path(location.href) });
      const m = p.match(/^\/(services|industries)\/([^/]+)$/);
      if (m) track(m[1] === "services" ? "service_interest" : "industry_interest", { item: m[2], source: where });
      if (a.hostname && a.hostname !== location.hostname) track("outbound_click", { link_domain: a.hostname });
      return;
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.matches("[data-dropdown]")) track("nav_menu_open", { menu: clean(b.textContent) });
    else if (b.matches(".menu-btn")) track("nav_mobile_menu", { state: b.getAttribute("aria-expanded") === "true" ? "close" : "open" });
    const scenario = { leyla: "A", murad: "B", aylin: "C" };
    if (b.dataset.pick || b.dataset.m) c360("scenario_select", { scenario: scenario[b.dataset.pick || b.dataset.m] || "other" });
    else if (b.dataset.tab) c360("tab_view", { tab: b.dataset.tab });
    else if (b.dataset.step) c360("control_change", { control: "frequency" });
    else if (b.matches("[data-reset]")) c360("reset");
    else if (b.dataset.hxI) track("cios_step_view", { step: clean(b.textContent.replace(/^\d+/, "")) });
    else if (b.matches("[data-hx-approve]")) track("cios_approve");
    else if (b.dataset.jlPersona) track("cx_lab_persona", { persona: b.dataset.jlPersona });
    else if (b.dataset.jlMode) track("cx_lab_mode", { mode: b.dataset.jlMode === "imp" ? "improved" : "current" });
    else if (b.dataset.jlStage) track("cx_lab_stage", { stage: clean(b.querySelector(".nm")?.textContent) });
    else if (b.dataset.fid) track("cx_screen_version", { version: b.dataset.fid });
    else if (b.dataset.lens) track("strat_lens", { lens: b.dataset.lens });
    else if (b.dataset.seg) track("strat_segment", { segment: b.dataset.seg });
    else if (b.matches("[data-ee-enter]")) track("ee_enter");
    else if (b.dataset.eeNav) track("ee_view", { view: b.dataset.eeNav });
    else if (b.dataset.eeStage) track("ee_stage_change", { to: b.dataset.eeStage === "bulk" ? document.getElementById("ee-bulk-to")?.value : b.dataset.eeStage, bulk: b.dataset.eeStage === "bulk" ? "yes" : "no" });
    else if (b.dataset.eeSave) track("ee_notice", { action: b.dataset.eeSave });
    else if (b.dataset.lyTab) track("ly_tab", { tab: b.dataset.lyTab });
    else if (b.dataset.lyClaim) track("ly_mission_complete", { mission: b.dataset.lyClaim });
    else if (b.dataset.lyRedeem) track("ly_redeem", { reward: b.dataset.lyRedeem });
    else if (b.matches("[data-ly-reset]")) track("ly_reset");
  }, true);

  document.addEventListener("change", (e) => {
    const ctl = e.target.closest("[data-ctl]");
    if (ctl) c360("control_change", { control: ctl.dataset.ctl });
    if (e.target.dataset.assumeKey) track("strat_assumption", { assumption: e.target.dataset.assumeKey });
    if (e.target.matches("[data-ee-stagesel]")) track("ee_stage_change", { to: e.target.value, bulk: "no" });
  }, true);

  // Contact form: report only that a complete form was submitted, never what's in it.
  const form = document.getElementById("contact-form");
  if (form) form.addEventListener("submit", () => {
    setTimeout(() => {
      if (document.getElementById("form-note")?.classList.contains("ok")) track("contact_form_complete", { form_connected: form.dataset.endpoint ? "yes" : "no" });
    }, 0);
  });

  // ---------- Start ----------
  const init = () => {
    settingsLink();
    const choice = store.get();
    if (choice === "granted") start();
    else if (choice !== "denied") banner();
    if (document.querySelector("[data-c360]")) track("c360_view");
    if (document.querySelector("[data-cios]")) track("cios_view");
  };
  const ready = () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); init(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ready) : ready();
})();
