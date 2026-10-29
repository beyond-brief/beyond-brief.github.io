// BEYOND BRIEF — navigation and the three art-directed motion moments.
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

// Navigation: accessible dropdowns + full-screen mobile menu
(() => {
  const triggers = document.querySelectorAll("[data-dropdown]");
  const closeAll = (except) => triggers.forEach((t) => {
    if (t === except) return;
    t.setAttribute("aria-expanded", "false");
    document.getElementById(t.getAttribute("aria-controls")).classList.remove("open");
  });
  triggers.forEach((t) => {
    const menu = document.getElementById(t.getAttribute("aria-controls"));
    t.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = t.getAttribute("aria-expanded") === "true";
      closeAll(t);
      t.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("open", !open);
    });
    menu.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeAll(); t.focus(); } });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".dropdown")) closeAll(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  const btn = document.querySelector(".menu-btn");
  const list = document.getElementById("primary-nav");
  btn?.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    btn.querySelector(".lbl").textContent = open ? "Menu" : "Close";
    list.classList.toggle("open", !open);
    document.body.style.overflow = open ? "" : "hidden";
  });
})();

// Decorative timeline line and live previews (previews only run while on screen)
(() => {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.target.matches("[data-inview]") && e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    if (e.target.matches(".live")) e.target.classList.toggle("is-live", e.isIntersecting && !reduce.matches);
  }), { threshold: 0.2 });
  document.querySelectorAll("[data-inview], .live").forEach((el) => io.observe(el));
})();

// Moment 1 — hero signature: the accent run past "the brief" leans towards the cursor (desktop only)
(() => {
  const scope = document.querySelector(".scope");
  if (!scope || reduce.matches || !finePointer.matches) return;
  const hero = scope.closest("[data-hero]");
  const word = scope.parentElement;
  hero.addEventListener("pointermove", (e) => {
    const r = word.getBoundingClientRect();
    scope.style.setProperty("--pull", Math.max(0, Math.min(1, (e.clientX - r.right) / Math.max(1, innerWidth - r.right))).toFixed(3));
  });
  hero.addEventListener("pointerleave", () => scope.style.setProperty("--pull", "0"));
})();

// Moment 2 — service navigation: a preview card trails the cursor across the service index
(() => {
  const peek = document.querySelector(".svc-peek");
  if (!peek || reduce.matches || !finePointer.matches) return;
  const cards = [...peek.querySelectorAll("[data-peek-card]")];
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, last = 0;
  const loop = () => {
    x += (tx - x) * 0.18; y += (ty - y) * 0.18;
    const tilt = Math.max(-6, Math.min(6, (tx - x) * 0.06));
    peek.style.setProperty("--x", `${x.toFixed(1)}px`);
    peek.style.setProperty("--y", `${y.toFixed(1)}px`);
    peek.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 || peek.classList.contains("on") ? requestAnimationFrame(loop) : 0;
  };
  let row = null;
  const place = (e) => {
    // Follow the cursor horizontally, but sit above the hovered row so its own text stays visible
    const w = 300, h = peek.querySelector(".is-active")?.offsetHeight || 220;
    const r = row.getBoundingClientRect();
    tx = Math.min(innerWidth - w - 16, Math.max(16, e.clientX - w / 2));
    ty = r.top - h - 12 < 80 ? r.bottom + 12 : r.top - h - 12;
  };
  document.querySelectorAll("[data-peek-index] a").forEach((a) => {
    a.addEventListener("pointerenter", (e) => {
      const i = a.dataset.peek;
      cards.forEach((c) => c.classList.toggle("is-active", c.dataset.peekCard === i));
      row = a;
      place(e);
      if (performance.now() - last > 400) { x = tx; y = ty; }
      peek.classList.add("on");
      if (!raf) raf = requestAnimationFrame(loop);
    });
    a.addEventListener("pointermove", place);
    a.addEventListener("pointerleave", () => { peek.classList.remove("on"); last = performance.now(); });
  });
  addEventListener("scroll", () => peek.classList.remove("on"), { passive: true });
})();

// Concept applications: accessible tabs (click + arrow keys)
document.querySelectorAll("[data-cx]").forEach((app) => {
  const tabs = [...app.querySelectorAll('[role="tab"]')];
  const select = (t) => tabs.forEach((x) => {
    const on = x === t;
    x.setAttribute("aria-selected", String(on));
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });
  // BranchOne booking: pick location, service and time; the summary updates
  const groups = [...app.querySelectorAll("[data-pick]")];
  const summary = app.querySelector("[data-summary]");
  groups.forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (summary) {
      const v = (k) => app.querySelector(`[data-pick="${k}"] [aria-pressed="true"]`)?.textContent;
      summary.textContent = `${v("svc")} · ${v("loc")} · Thu ${v("time")}`;
    }
  }));
});

// Contact form: prefill from the page that sent the visitor, validate locally, never pretend to send
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const q = new URLSearchParams(location.search);
  const pre = { industry: q.get("industry"), project: q.get("service") || q.get("project") };
  for (const [k, v] of Object.entries(pre)) if (v && form[k]?.querySelector(`option[value="${CSS.escape(v)}"]`)) form[k].value = v;
  // Which concept the visitor came from (shown so they can see the context was carried over)
  const titles = JSON.parse(document.getElementById("concept-titles")?.textContent || "{}");
  const concept = q.get("concept");
  if (concept && titles[concept]) {
    form.concept.value = concept;
    const ref = document.getElementById("concept-ref");
    ref.hidden = false;
    ref.innerHTML = `<b>About:</b> ${titles[concept].replace(/[<>&]/g, "")} · you can change the details below.`;
  }
  const note = document.getElementById("form-note");
  const rules = {
    name: (v) => v.trim() ? "" : "Please tell us your name.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address.",
    message: (v) => v.trim().length >= 20 ? "" : "A sentence or two (at least 20 characters) helps us reply usefully.",
  };
  const check = (name) => {
    const field = form[name], msg = rules[name](field.value);
    field.setAttribute("aria-invalid", String(!!msg));
    document.getElementById(`err-${name}`).textContent = msg;
    return !msg;
  };
  Object.keys(rules).forEach((n) => form[n].addEventListener("blur", () => form[n].value && check(n)));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = Object.keys(rules).filter((n) => !check(n));
    note.classList.toggle("ok", !bad.length);
    if (bad.length) { note.textContent = `Please check ${bad.length === 1 ? "one field" : `${bad.length} fields`} above.`; form[bad[0]].focus(); return; }
    if (form.website.value) return; // honeypot filled: silently ignore bots
    const endpoint = form.dataset.endpoint;
    if (!endpoint) { note.textContent = "Everything looks complete. This local preview has no server connected, so your message has not been sent."; return; }
    // Future delivery path (inactive until an endpoint is configured): see docs/CONTACT-DELIVERY-PLAN.md
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; note.textContent = "Sending…";
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) })
      .then((r) => { if (!r.ok) throw new Error(r.status); note.textContent = "Thanks. Your message has been received and we'll reply within two working days."; form.reset(); })
      .catch(() => { note.textContent = "Sorry, your message couldn't be sent. Please try again in a moment."; })
      .finally(() => { btn.disabled = false; });
  });
})();

// Journey map: stage tabs (click + arrow keys) highlight the matching point on the emotion curve
document.querySelectorAll("[data-journey]").forEach((map) => {
  const tabs = [...map.querySelectorAll('[role="tab"]')];
  const pts = [...map.querySelectorAll(".jm-pt")];
  const select = (t) => tabs.forEach((x, i) => {
    const on = x === t;
    x.setAttribute("aria-selected", String(on));
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    pts[i]?.classList.toggle("on", on);
  });
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });
  select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
});

// Gamification challenge card: simulate progress towards the goal (nothing is stored or sent)
document.querySelectorAll("[data-challenge]").forEach((card) => {
  const steps = [...card.querySelectorAll(".mp-steps i")];
  const status = card.querySelector("[data-status]");
  const add = card.querySelector("[data-add]");
  const reset = card.querySelector("[data-reset-challenge]");
  let n = 0;
  const draw = () => {
    steps.forEach((s, i) => s.classList.toggle("on", i < n));
    const done = n >= steps.length;
    status.textContent = done ? "Challenge complete: next tier unlocked, bonus points added" : `${n} of ${steps.length} payments`;
    status.classList.toggle("done", done);
    add.disabled = done;
    reset.hidden = !done;
  };
  add.addEventListener("click", () => { n = Math.min(steps.length, n + 1); draw(); if (n >= steps.length) reset.focus(); });
  reset.addEventListener("click", () => { n = 0; draw(); add.focus(); });
  draw();
});
