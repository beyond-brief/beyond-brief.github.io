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

// Contact form: prefill from the page that sent the visitor, validate locally, post straight to Netlify Forms
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
  // A brief the visitor chose to bring over from the AI Concierge. Filled in for review, never sent automatically.
  const LABELS = { objective: "Goal", challenge: "Challenge", audience: "Customers", timeline: "Timing", success: "Success looks like" };
  const fromConcierge = () => {
    let b = null;
    try { b = JSON.parse(sessionStorage.getItem("bb-concierge-brief")); sessionStorage.removeItem("bb-concierge-brief"); } catch {}
    if (!b || typeof b !== "object") return;
    const text = Object.entries(LABELS).filter(([k]) => typeof b[k] === "string" && b[k].trim()).map(([k, l]) => `${l}: ${b[k].trim()}`).join("\n");
    if (!text) return;
    form.message.value = text.slice(0, 5000);
    for (const k of ["industry", "project"]) { const v = k === "project" ? b.service : b.industry; if (v && form[k]?.querySelector(`option[value="${CSS.escape(v)}"]`)) form[k].value = v; }
    form.dataset.source = "concierge";
    const ref = document.getElementById("concept-ref");
    ref.hidden = false;
    ref.innerHTML = "<b>From the AI Concierge:</b> your brief is filled in below. Check it, add your details and send it when you're ready.";
    form.message.dispatchEvent(new Event("input"));
  };
  if (q.get("from") === "concierge") fromConcierge();
  window.addEventListener("bb-concierge-brief", fromConcierge);
  const rules = {
    name: (v) => v.trim() ? "" : "Please tell us your name.",
    email: (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address.",
    message: (v) => v.trim().length >= 10 ? "" : "Please add a few words about what you need.",
  };
  // A likely typo gets one gentle question. It never blocks: pressing send again goes ahead.
  const MAIL_HOSTS = ["gmail.com", "ymail.com", "mail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "mail.ru", "yandex.ru", "yandex.com", "proton.me"];
  const oneEditAway = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    const tail = (x, n) => x.slice(i + n);
    return tail(a, 1) === tail(b, 1) || tail(a, 1) === tail(b, 0) || tail(a, 0) === tail(b, 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && tail(a, 2) === tail(b, 2));
  };
  const emailTypo = (v) => {
    const domain = v.trim().toLowerCase().split("@")[1] || "";
    return MAIL_HOSTS.includes(domain) ? "" : MAIL_HOSTS.find((h) => oneEditAway(domain, h)) || "";
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
    note.classList.toggle("ok", !bad.length); // analytics reads this right after submit: a complete form, not delivery
    if (bad.length) { note.textContent = `Please check ${bad.length === 1 ? "one field" : `${bad.length} fields`} above.`; form[bad[0]].focus(); return; }
    const typo = emailTypo(form.email.value);
    if (typo && form.dataset.asked !== form.email.value) {
      form.dataset.asked = form.email.value;
      note.classList.remove("ok");
      note.textContent = "";
      document.getElementById("err-email").textContent = `Did you mean ${typo}? If your address is correct, press send again.`;
      form.email.focus();
      return;
    }
    document.getElementById("err-email").textContent = "";
    if (form.bb_check.value) return; // honeypot filled: silently ignore bots
    const endpoint = form.dataset.endpoint;
    if (!endpoint) { note.textContent = "Everything looks complete, but online sending isn't switched on yet, so your message has not been sent."; return; }
    // Netlify Forms answers before its spam filter decides, so success can only mean the message was submitted.
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; note.textContent = "Sending…";
    const failed = () => { note.classList.remove("ok"); note.textContent = "Sorry, your message couldn't be sent. Your text is still here, so please try again in a moment."; };
    const body = new URLSearchParams({ ...Object.fromEntries(new FormData(form)), "form-name": "contact", source: form.dataset.source || "form" });
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) return failed();
        note.textContent = "Thanks. Your message has been submitted.";
        form.reset(); delete form.dataset.source; delete form.dataset.asked; document.getElementById("concept-ref").hidden = true;
      })
      .catch(failed)
      .finally(() => { btn.disabled = false; });
  });
})();
