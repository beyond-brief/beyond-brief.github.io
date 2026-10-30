// Homepage showreel: an art-directed sequence of real product screens.
// One frame is in front, its neighbours sit behind it. It advances on its own only while
// on screen, never under the pointer or keyboard focus, and never with reduced motion.
(() => {
  const reel = document.querySelector("[data-reel]");
  if (!reel) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const frames = [...reel.querySelectorAll("[data-reel-frame]")];
  const tabs = [...reel.querySelectorAll("[data-reel-go]")];
  const live = reel.querySelector("[data-reel-live]");
  const n = frames.length, DWELL = 5200;
  let cur = 0, timer = 0, visible = false, held = false;

  function show(i, announce) {
    cur = (i + n) % n;
    frames.forEach((f, k) => {
      const d = (k - cur + n) % n;
      f.dataset.pos = d === 0 ? "front" : d === 1 ? "next" : d === n - 1 ? "prev" : "back";
      const front = d === 0;
      f.setAttribute("aria-hidden", String(!front));
      f.tabIndex = front ? 0 : -1;
    });
    tabs.forEach((t, k) => t.setAttribute("aria-pressed", String(k === cur)));
    if (announce && live) live.textContent = `Showing ${tabs[cur].querySelector("b").textContent}`;
    restart();
  }
  function restart() {
    clearTimeout(timer);
    const auto = visible && !held && !reduce.matches;
    reel.classList.toggle("is-auto", auto);
    // Restart the progress line on the active tab.
    tabs[cur].classList.remove("run"); void tabs[cur].offsetWidth; tabs[cur].classList.add("run");
    if (auto) timer = setTimeout(() => show(cur + 1), DWELL);
  }
  tabs.forEach((t, k) => t.addEventListener("click", () => show(k, true)));
  frames.forEach((f, k) => f.addEventListener("click", (e) => { if (k !== cur) { e.preventDefault(); show(k, true); } }));
  reel.addEventListener("pointerenter", () => { held = true; restart(); });
  reel.addEventListener("pointerleave", () => { held = false; restart(); });
  reel.addEventListener("focusin", () => { held = true; restart(); });
  reel.addEventListener("focusout", (e) => { if (!reel.contains(e.relatedTarget)) { held = false; restart(); } });
  reel.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d && e.target.closest("[data-reel-go]")) { e.preventDefault(); show(cur + d, true); tabs[cur].focus(); }
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; restart(); }, { threshold: 0.35 }).observe(reel);
  reduce.addEventListener?.("change", restart);
  show(0);
})();
